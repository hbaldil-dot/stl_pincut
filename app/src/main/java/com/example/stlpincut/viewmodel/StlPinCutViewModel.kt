package com.example.stlpincut.viewmodel

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.stlpincut.geometry.BoundaryExtractor
import com.example.stlpincut.geometry.ModelSplitter
import com.example.stlpincut.graphics.Camera3D
import com.example.stlpincut.graphics.RayPicker
import com.example.stlpincut.model.CutResult
import com.example.stlpincut.model.CutSpline
import com.example.stlpincut.model.Mesh3D
import com.example.stlpincut.model.PinConfiguration
import com.example.stlpincut.model.PinType
import com.example.stlpincut.stl.SampleModels
import com.example.stlpincut.stl.StlExporter
import com.example.stlpincut.stl.StlParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.InputStream

data class UiState(
    val mesh: Mesh3D? = null,
    val isPainting: Boolean = false,
    val paintedFaces: Set<Int> = emptySet(),
    val history: List<Set<Int>> = emptyList(),
    val cutSpline: CutSpline? = null,
    val cutResult: CutResult? = null,
    val pinConfig: PinConfiguration = PinConfiguration(),
    val camera: Camera3D = Camera3D(),
    val isLoading: Boolean = false,
    val statusMessage: String? = null,
    val exportShareIntent: Intent? = null
)

class StlPinCutViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    init {
        // Load default model (Low-Poly Figurine / Bust)
        loadSampleModel("Low-Poly Figurine / Heykel")
    }

    fun loadSampleModel(name: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, statusMessage = "Model yükleniyor...") }
            val model = withContext(Dispatchers.Default) {
                when {
                    name.contains("Braket", ignoreCase = true) || name.contains("Bracket", ignoreCase = true) ->
                        SampleModels.generateBracketModel()
                    name.contains("Cylinder", ignoreCase = true) || name.contains("Silindir", ignoreCase = true) ->
                        SampleModels.generateCylinderConnectorModel()
                    name.contains("Prism", ignoreCase = true) || name.contains("Prizma", ignoreCase = true) ->
                        SampleModels.generatePrismModel()
                    else ->
                        SampleModels.generateBustModel()
                }
            }
            _uiState.update {
                it.copy(
                    mesh = model,
                    isPainting = false,
                    paintedFaces = emptySet(),
                    history = emptyList(),
                    cutSpline = null,
                    cutResult = null,
                    isLoading = false,
                    statusMessage = "${model.name} yüklendi (${model.faceCount} üçgen yüzey)"
                )
            }
        }
    }

    fun loadStlFromStream(inputStream: InputStream, name: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, statusMessage = "STL dosyası ayrıştırılıyor...") }
            try {
                val parsedMesh = withContext(Dispatchers.IO) {
                    StlParser.parse(inputStream, name)
                }
                _uiState.update {
                    it.copy(
                        mesh = parsedMesh,
                        isPainting = false,
                        paintedFaces = emptySet(),
                        history = emptyList(),
                        cutSpline = null,
                        cutResult = null,
                        isLoading = false,
                        statusMessage = "STL Yüklendi: $name (${parsedMesh.faceCount} yüzey)"
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        statusMessage = "Hata: STL okunamadı (${e.localizedMessage})"
                    )
                }
            }
        }
    }

    fun setPainting(enabled: Boolean) {
        _uiState.update {
            it.copy(
                isPainting = enabled,
                statusMessage = if (enabled) {
                    "Boyama Modu Aktif: Kesim hattı için yüzeyleri boyayın"
                } else {
                    "3D İnceleme Modu: Döndürün ve Yakınlaştırın"
                }
            )
        }
    }

    fun toggleWireframe() {
        _uiState.update {
            val newWire = !it.pinConfig.isWireframe
            it.copy(pinConfig = it.pinConfig.copy(isWireframe = newWire))
        }
    }

    fun setPinType(type: PinType) {
        _uiState.update {
            it.copy(pinConfig = it.pinConfig.copy(pinType = type))
        }
        // If already split, recalculate with new pin type
        if (_uiState.value.cutResult != null && _uiState.value.cutSpline != null) {
            executeSplitAndAddPins()
        }
    }

    fun setPinSize(sizeMm: Float) {
        _uiState.update {
            it.copy(pinConfig = it.pinConfig.copy(pinSizeMm = sizeMm))
        }
        // If already split, recalculate with new pin size
        if (_uiState.value.cutResult != null && _uiState.value.cutSpline != null) {
            executeSplitAndAddPins()
        }
    }

    fun setBrushSize(sizeMm: Float) {
        _uiState.update {
            it.copy(pinConfig = it.pinConfig.copy(brushSizeMm = sizeMm))
        }
    }

    fun setExplodedDistance(dist: Float) {
        _uiState.update {
            it.copy(pinConfig = it.pinConfig.copy(explodedDistance = dist))
        }
    }

    fun setCamera(camera: Camera3D) {
        _uiState.update { it.copy(camera = camera) }
    }

    fun resetCamera() {
        _uiState.update {
            it.copy(
                camera = Camera3D(
                    yawDeg = 35f,
                    pitchDeg = 25f,
                    distance = 140f,
                    panX = 0f,
                    panY = 0f
                )
            )
        }
    }

    fun paintAt(screenX: Float, screenY: Float, width: Float, height: Float) {
        val state = _uiState.value
        val mesh = state.mesh ?: return
        if (!state.isPainting) return

        val newlyPainted = RayPicker.pickAndPaint(
            mesh = mesh,
            camera = state.camera,
            screenX = screenX,
            screenY = screenY,
            screenWidth = width,
            screenHeight = height,
            brushSizeMm = state.pinConfig.brushSizeMm,
            currentPainted = state.paintedFaces
        )

        if (newlyPainted.isNotEmpty()) {
            val updatedHistory = state.history + listOf(state.paintedFaces)
            val updatedPainted = state.paintedFaces + newlyPainted
            _uiState.update {
                it.copy(
                    paintedFaces = updatedPainted,
                    history = updatedHistory
                )
            }
        }
    }

    fun undo() {
        val state = _uiState.value
        if (state.history.isEmpty()) return

        val previous = state.history.last()
        val newHistory = state.history.dropLast(1)
        _uiState.update {
            it.copy(
                paintedFaces = previous,
                history = newHistory,
                cutSpline = null,
                cutResult = null,
                statusMessage = "Geri alındı (${previous.size} boyalı yüzey)"
            )
        }
    }

    fun clearPainting() {
        _uiState.update {
            it.copy(
                paintedFaces = emptySet(),
                history = emptyList(),
                cutSpline = null,
                cutResult = null,
                statusMessage = "Boyama temizlendi"
            )
        }
    }

    fun completePainting() {
        val state = _uiState.value
        val mesh = state.mesh ?: return
        if (state.paintedFaces.isEmpty()) {
            _uiState.update {
                it.copy(statusMessage = "Lütfen önce model üzerinde çevre hatlarını boyayın.")
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, statusMessage = "Radyal spline kement hattı hesaplanıyor...") }
            val spline = withContext(Dispatchers.Default) {
                BoundaryExtractor.extractCutSpline(mesh, state.paintedFaces)
            }

            if (spline != null) {
                _uiState.update {
                    it.copy(
                        isPainting = false,
                        cutSpline = spline,
                        isLoading = false,
                        statusMessage = "Spline Kement Çemberi Oluşturuldu! Kesim ve Pin eklemeye hazır."
                    )
                }
            } else {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        statusMessage = "Sınır noktaları bulunamadı. Lütfen kesintisiz bir halka boyayın."
                    )
                }
            }
        }
    }

    fun executeSplitAndAddPins() {
        val state = _uiState.value
        val mesh = state.mesh ?: return
        val spline = state.cutSpline ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, statusMessage = "Model kesiliyor ve pimler ekleniyor...") }
            val result = withContext(Dispatchers.Default) {
                ModelSplitter.splitAndGeneratePins(mesh, spline, state.pinConfig)
            }

            _uiState.update {
                it.copy(
                    cutResult = result,
                    isLoading = false,
                    pinConfig = it.pinConfig.copy(explodedDistance = 20f),
                    statusMessage = "Model başarıyla ayrıştırıldı! Part A (Erkek Pin) ve Part B (Dişi Yuva) hazır."
                )
            }
        }
    }

    fun exportAndShareStl(context: Context) {
        val state = _uiState.value
        val cutResult = state.cutResult
        val mesh = state.mesh ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, statusMessage = "STL dosyaları dışa aktarılıyor...") }
            try {
                val cacheDir = context.cacheDir
                val files = ArrayList<File>()

                withContext(Dispatchers.IO) {
                    if (cutResult != null) {
                        // Export Part A
                        val fileA = File(cacheDir, "Part_A_Male_Pin.stl")
                        StlExporter.exportToFile(cutResult.partA, fileA, "Part A Male Pin - STL PinCut 3D")
                        files.add(fileA)

                        // Export Part B
                        val fileB = File(cacheDir, "Part_B_Female_Socket.stl")
                        StlExporter.exportToFile(cutResult.partB, fileB, "Part B Female Socket - STL PinCut 3D")
                        files.add(fileB)
                    } else {
                        // Export current mesh
                        val fileMain = File(cacheDir, "${mesh.name.replace(" ", "_")}.stl")
                        StlExporter.exportToFile(mesh, fileMain, "STL PinCut 3D Export")
                        files.add(fileMain)
                    }
                }

                // Create Android Share Intent
                val uris = files.map { file ->
                    FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
                }

                val shareIntent = if (uris.size == 1) {
                    Intent(Intent.ACTION_SEND).apply {
                        type = "application/sla"
                        putExtra(Intent.EXTRA_STREAM, uris[0])
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                } else {
                    Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                        type = "application/sla"
                        putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(uris))
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                }

                val chooser = Intent.createChooser(shareIntent, "STL Parçalarını Paylaş / Kaydet")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        exportShareIntent = chooser,
                        statusMessage = "${files.size} STL dosyası hazırlandı ve paylaşıma açıldı."
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        statusMessage = "Dışa aktarma hatası: ${e.localizedMessage}"
                    )
                }
            }
        }
    }

    fun clearShareIntent() {
        _uiState.update { it.copy(exportShareIntent = null) }
    }

    fun dismissStatusMessage() {
        _uiState.update { it.copy(statusMessage = null) }
    }
}
