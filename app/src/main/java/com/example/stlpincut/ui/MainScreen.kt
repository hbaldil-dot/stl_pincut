package com.example.stlpincut.ui

import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Brush
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ContentCut
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.FileUpload
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.Undo
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.stlpincut.graphics.Viewport3D
import com.example.stlpincut.model.PinType
import com.example.stlpincut.stl.SampleModels
import com.example.stlpincut.ui.theme.Amber400
import com.example.stlpincut.ui.theme.Amber500
import com.example.stlpincut.ui.theme.Blue500
import com.example.stlpincut.ui.theme.Blue600
import com.example.stlpincut.ui.theme.Cyan400
import com.example.stlpincut.ui.theme.DarkGray700
import com.example.stlpincut.ui.theme.DarkGray800
import com.example.stlpincut.ui.theme.DarkGray850
import com.example.stlpincut.ui.theme.DarkGray900
import com.example.stlpincut.ui.theme.DarkGray950
import com.example.stlpincut.ui.theme.Emerald400
import com.example.stlpincut.ui.theme.Emerald500
import com.example.stlpincut.ui.theme.Emerald600
import com.example.stlpincut.ui.theme.Purple500
import com.example.stlpincut.ui.theme.Purple600
import com.example.stlpincut.ui.theme.Red500
import com.example.stlpincut.viewmodel.StlPinCutViewModel

@Composable
fun MainScreen(
    viewModel: StlPinCutViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }

    // File Picker for custom STL files
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            try {
                val inputStream = context.contentResolver.openInputStream(uri)
                if (inputStream != null) {
                    val fileName = uri.lastPathSegment?.substringAfterLast('/') ?: "CustomModel.stl"
                    viewModel.loadStlFromStream(inputStream, fileName)
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Dosya açılamadı: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // Launch export share intent if available
    LaunchedEffect(uiState.exportShareIntent) {
        uiState.exportShareIntent?.let { intent ->
            try {
                context.startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(context, "Paylaşım başlatılamadı: ${e.message}", Toast.LENGTH_SHORT).show()
            }
            viewModel.clearShareIntent()
        }
    }

    // Show status messages in snackbar
    LaunchedEffect(uiState.statusMessage) {
        uiState.statusMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            viewModel.dismissStatusMessage()
        }
    }

    BoxWithConstraints(
        modifier = modifier
            .fillMaxSize()
            .background(DarkGray950)
    ) {
        val isWideScreen = maxWidth > 650.dp

        if (isWideScreen) {
            // Landscape / Tablet Split Layout
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .navigationBarsPadding()
            ) {
                // Left Side Panel
                Card(
                    modifier = Modifier
                        .width(360.dp)
                        .fillMaxHeight()
                        .padding(12.dp)
                        .testTag("left_controls_panel"),
                    colors = CardDefaults.cardColors(containerColor = DarkGray900),
                    shape = RoundedCornerShape(16.dp),
                    border = CardDefaults.outlinedCardBorder().copy(brush = Brush.verticalGradient(listOf(DarkGray700, DarkGray800)))
                ) {
                    ControlsContent(
                        uiState = uiState,
                        onUploadClick = { filePickerLauncher.launch("*/*") },
                        onSampleSelect = { viewModel.loadSampleModel(it) },
                        onToggleWireframe = { viewModel.toggleWireframe() },
                        onPinTypeChange = { viewModel.setPinType(it) },
                        onPinSizeChange = { viewModel.setPinSize(it) },
                        onBrushSizeChange = { viewModel.setBrushSize(it) },
                        onTogglePainting = { viewModel.setPainting(!uiState.isPainting) },
                        onUndo = { viewModel.undo() },
                        onClearPainting = { viewModel.clearPainting() },
                        onCompletePainting = { viewModel.completePainting() },
                        onSplitModel = { viewModel.executeSplitAndAddPins() },
                        onExplodedChange = { viewModel.setExplodedDistance(it) },
                        onExportStl = { viewModel.exportAndShareStl(context) }
                    )
                }

                // Right 3D Viewport
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .padding(top = 12.dp, bottom = 12.dp, end = 12.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(
                            Brush.radialGradient(
                                colors = listOf(DarkGray900, DarkGray950)
                            )
                        )
                ) {
                    Viewport3D(
                        mesh = uiState.mesh,
                        paintedFaces = uiState.paintedFaces,
                        cutSpline = uiState.cutSpline,
                        cutResult = uiState.cutResult,
                        isPainting = uiState.isPainting,
                        brushSizeMm = uiState.pinConfig.brushSizeMm,
                        isWireframe = uiState.pinConfig.isWireframe,
                        explodedDistance = uiState.pinConfig.explodedDistance,
                        camera = uiState.camera,
                        onCameraChange = { viewModel.setCamera(it) },
                        onPaintTouch = { x, y, w, h -> viewModel.paintAt(x, y, w, h) },
                        modifier = Modifier.fillMaxSize()
                    )

                    // Viewport HUD Overlays
                    ViewportOverlays(
                        uiState = uiState,
                        onResetCamera = { viewModel.resetCamera() },
                        onToggleWireframe = { viewModel.toggleWireframe() }
                    )
                }
            }
        } else {
            // Portrait Mobile Layout
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .navigationBarsPadding()
            ) {
                // Top Header Bar
                TopHeaderBar(
                    meshName = uiState.mesh?.name ?: "STL PinCut 3D",
                    faceCount = uiState.mesh?.faceCount ?: 0,
                    onUploadClick = { filePickerLauncher.launch("*/*") },
                    onResetCamera = { viewModel.resetCamera() }
                )

                // Center 3D Viewport
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(horizontal = 8.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(
                            Brush.radialGradient(
                                colors = listOf(DarkGray900, DarkGray950)
                            )
                        )
                ) {
                    Viewport3D(
                        mesh = uiState.mesh,
                        paintedFaces = uiState.paintedFaces,
                        cutSpline = uiState.cutSpline,
                        cutResult = uiState.cutResult,
                        isPainting = uiState.isPainting,
                        brushSizeMm = uiState.pinConfig.brushSizeMm,
                        isWireframe = uiState.pinConfig.isWireframe,
                        explodedDistance = uiState.pinConfig.explodedDistance,
                        camera = uiState.camera,
                        onCameraChange = { viewModel.setCamera(it) },
                        onPaintTouch = { x, y, w, h -> viewModel.paintAt(x, y, w, h) },
                        modifier = Modifier.fillMaxSize()
                    )

                    // Viewport HUD Overlays
                    ViewportOverlays(
                        uiState = uiState,
                        onResetCamera = { viewModel.resetCamera() },
                        onToggleWireframe = { viewModel.toggleWireframe() }
                    )
                }

                // Bottom Collapsible Controls Card
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(290.dp)
                        .padding(8.dp)
                        .testTag("bottom_controls_panel"),
                    colors = CardDefaults.cardColors(containerColor = DarkGray900),
                    shape = RoundedCornerShape(16.dp),
                    border = CardDefaults.outlinedCardBorder().copy(brush = Brush.verticalGradient(listOf(DarkGray700, DarkGray800)))
                ) {
                    ControlsContent(
                        uiState = uiState,
                        onUploadClick = { filePickerLauncher.launch("*/*") },
                        onSampleSelect = { viewModel.loadSampleModel(it) },
                        onToggleWireframe = { viewModel.toggleWireframe() },
                        onPinTypeChange = { viewModel.setPinType(it) },
                        onPinSizeChange = { viewModel.setPinSize(it) },
                        onBrushSizeChange = { viewModel.setBrushSize(it) },
                        onTogglePainting = { viewModel.setPainting(!uiState.isPainting) },
                        onUndo = { viewModel.undo() },
                        onClearPainting = { viewModel.clearPainting() },
                        onCompletePainting = { viewModel.completePainting() },
                        onSplitModel = { viewModel.executeSplitAndAddPins() },
                        onExplodedChange = { viewModel.setExplodedDistance(it) },
                        onExportStl = { viewModel.exportAndShareStl(context) }
                    )
                }
            }
        }

        // Loading Overlay
        if (uiState.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.5f)),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = DarkGray900),
                    shape = RoundedCornerShape(12.dp),
                    border = CardDefaults.outlinedCardBorder()
                ) {
                    Row(
                        modifier = Modifier.padding(20.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        CircularProgressIndicator(
                            color = Emerald400,
                            modifier = Modifier.size(28.dp),
                            strokeWidth = 3.dp
                        )
                        Text(
                            text = uiState.statusMessage ?: "İşleniyor...",
                            color = Color.White,
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(16.dp)
        )
    }
}

@Composable
private fun TopHeaderBar(
    meshName: String,
    faceCount: Int,
    onUploadClick: () -> Unit,
    onResetCamera: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Surface(
                color = Emerald600.copy(alpha = 0.2f),
                shape = RoundedCornerShape(8.dp),
                border = CardDefaults.outlinedCardBorder().copy(brush = Brush.verticalGradient(listOf(Emerald500, Emerald700)))
            ) {
                Icon(
                    imageVector = Icons.Default.ContentCut,
                    contentDescription = "App Icon",
                    tint = Emerald400,
                    modifier = Modifier
                        .padding(6.dp)
                        .size(20.dp)
                )
            }

            Column {
                Text(
                    text = "STL PinCut 3D",
                    color = Emerald400,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                Text(
                    text = "$meshName • $faceCount yüzey",
                    color = Color.Gray,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            IconButton(
                onClick = onResetCamera,
                modifier = Modifier
                    .size(36.dp)
                    .testTag("camera_reset_button")
            ) {
                Icon(
                    imageVector = Icons.Default.RestartAlt,
                    contentDescription = "Kamera Sıfırla",
                    tint = Color.LightGray
                )
            }

            IconButton(
                onClick = onUploadClick,
                modifier = Modifier
                    .size(36.dp)
                    .testTag("top_upload_button")
            ) {
                Icon(
                    imageVector = Icons.Default.FileUpload,
                    contentDescription = "STL Yükle",
                    tint = Emerald400
                )
            }
        }
    }
}

@Composable
private fun ViewportOverlays(
    uiState: com.example.stlpincut.viewmodel.UiState,
    onResetCamera: () -> Unit,
    onToggleWireframe: () -> Unit
) {
    Box(modifier = Modifier.fillMaxSize()) {
        // Mode Badge
        Row(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val badgeColor = when {
                uiState.cutResult != null -> Blue500
                uiState.cutSpline != null -> Purple500
                uiState.isPainting -> Amber500
                else -> Emerald500
            }

            val badgeText = when {
                uiState.cutResult != null -> "Parçalar Ayrıştırıldı (Pinli)"
                uiState.cutSpline != null -> "Spline Kement Çemberi Hazır"
                uiState.isPainting -> "Boyama Modu Aktif"
                else -> "3D İnceleme"
            }

            Surface(
                color = badgeColor.copy(alpha = 0.2f),
                shape = RoundedCornerShape(20.dp),
                border = CardDefaults.outlinedCardBorder().copy(brush = Brush.verticalGradient(listOf(badgeColor, badgeColor.copy(alpha = 0.5f))))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(badgeColor, CircleShape)
                    )
                    Text(
                        text = badgeText,
                        color = badgeColor,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        // Action Quick HUD
        Row(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Surface(
                color = DarkGray900.copy(alpha = 0.8f),
                shape = CircleShape,
                border = CardDefaults.outlinedCardBorder()
            ) {
                IconButton(
                    onClick = onToggleWireframe,
                    modifier = Modifier
                        .size(36.dp)
                        .testTag("wireframe_toggle_button")
                ) {
                    Icon(
                        imageVector = if (uiState.pinConfig.isWireframe) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                        contentDescription = "Wireframe Toggle",
                        tint = if (uiState.pinConfig.isWireframe) Emerald400 else Color.Gray,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }

        // Radial Info Notice when Painting
        AnimatedVisibility(
            visible = uiState.isPainting,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 12.dp)
        ) {
            Surface(
                color = DarkGray950.copy(alpha = 0.9f),
                shape = RoundedCornerShape(24.dp),
                border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(Amber500, Amber400)))
            ) {
                Text(
                    text = "🎨 Model üzerinde kesit halkası boyayın (${uiState.paintedFaces.size} yüzey)",
                    color = Amber400,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                )
            }
        }
    }
}

@Composable
private fun ControlsContent(
    uiState: com.example.stlpincut.viewmodel.UiState,
    onUploadClick: () -> Unit,
    onSampleSelect: (String) -> Unit,
    onToggleWireframe: () -> Unit,
    onPinTypeChange: (PinType) -> Unit,
    onPinSizeChange: (Float) -> Unit,
    onBrushSizeChange: (Float) -> Unit,
    onTogglePainting: () -> Unit,
    onUndo: () -> Unit,
    onClearPainting: () -> Unit,
    onCompletePainting: () -> Unit,
    onSplitModel: () -> Unit,
    onExplodedChange: (Float) -> Unit,
    onExportStl: () -> Unit
) {
    var sampleMenuExpanded by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(14.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Header in side panel
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Model & Kesim Yapılandırması",
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )

            // Sample Models Selector
            Box {
                OutlinedButton(
                    onClick = { sampleMenuExpanded = true },
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                    modifier = Modifier
                        .height(32.dp)
                        .testTag("sample_models_dropdown_button")
                ) {
                    Text("Örnekler", fontSize = 12.sp, color = Emerald400)
                }

                DropdownMenu(
                    expanded = sampleMenuExpanded,
                    onDismissRequest = { sampleMenuExpanded = false },
                    modifier = Modifier.background(DarkGray850)
                ) {
                    SampleModels.getSampleList().forEach { (name, _) ->
                        DropdownMenuItem(
                            text = { Text(name, color = Color.White, fontSize = 13.sp) },
                            onClick = {
                                sampleMenuExpanded = false
                                onSampleSelect(name)
                            }
                        )
                    }
                }
            }
        }

        // Upload Button Card
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onUploadClick)
                .testTag("upload_stl_button"),
            color = DarkGray950,
            shape = RoundedCornerShape(10.dp),
            border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(DarkGray700, Emerald900)))
        ) {
            Row(
                modifier = Modifier.padding(10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.FileUpload,
                    contentDescription = "Upload",
                    tint = Emerald400,
                    modifier = Modifier.size(22.dp)
                )
                Column {
                    Text("STL Modeli Yükle", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    Text("Cihazdan .stl dosyası seçin veya örnek kullanın", color = Color.Gray, fontSize = 11.sp)
                }
            }
        }

        // Pin Type Selector
        Column {
            Text(
                text = "Pin Tipi (Bağlantı Pimi)",
                color = Color.LightGray,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val isPyramid = uiState.pinConfig.pinType == PinType.PYRAMID
                FilledTonalButton(
                    onClick = { onPinTypeChange(PinType.PYRAMID) },
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = if (isPyramid) Emerald600 else DarkGray800,
                        contentColor = if (isPyramid) Color.White else Color.Gray
                    ),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(38.dp)
                        .testTag("pin_type_pyramid_button")
                ) {
                    Text("Piramit Pin", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                }

                FilledTonalButton(
                    onClick = { onPinTypeChange(PinType.PRISM) },
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = if (!isPyramid) Emerald600 else DarkGray800,
                        contentColor = if (!isPyramid) Color.White else Color.Gray
                    ),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(38.dp)
                        .testTag("pin_type_prism_button")
                ) {
                    Text("Düz Prizma", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }

        // Pin Size Slider
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Pin Boyutu", color = Color.LightGray, fontSize = 12.sp)
                Text("${uiState.pinConfig.pinSizeMm.toInt()} mm", color = Emerald400, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
            Slider(
                value = uiState.pinConfig.pinSizeMm,
                onValueChange = onPinSizeChange,
                valueRange = 2f..15f,
                steps = 12,
                colors = SliderDefaults.colors(
                    thumbColor = Emerald400,
                    activeTrackColor = Emerald500,
                    inactiveTrackColor = DarkGray800
                ),
                modifier = Modifier.testTag("pin_size_slider")
            )
        }

        // Brush Size Slider
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Fırça Kalınlığı", color = Color.LightGray, fontSize = 12.sp)
                Text("${uiState.pinConfig.brushSizeMm.toInt()} mm", color = Amber400, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
            Slider(
                value = uiState.pinConfig.brushSizeMm,
                onValueChange = onBrushSizeChange,
                valueRange = 2f..15f,
                steps = 12,
                colors = SliderDefaults.colors(
                    thumbColor = Amber400,
                    activeTrackColor = Amber500,
                    inactiveTrackColor = DarkGray800
                ),
                modifier = Modifier.testTag("brush_size_slider")
            )
        }

        // Exploded View Slider (if split)
        if (uiState.cutResult != null) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Patlatılmış Görünüm (Ayrılma)", color = Color.LightGray, fontSize = 12.sp)
                    Text("${uiState.pinConfig.explodedDistance.toInt()} mm", color = Cyan400, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Slider(
                    value = uiState.pinConfig.explodedDistance,
                    onValueChange = onExplodedChange,
                    valueRange = 0f..45f,
                    colors = SliderDefaults.colors(
                        thumbColor = Cyan400,
                        activeTrackColor = Cyan400,
                        inactiveTrackColor = DarkGray800
                    ),
                    modifier = Modifier.testTag("exploded_distance_slider")
                )
            }
        }

        // Paint & Undo Action Buttons Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Button(
                onClick = onTogglePainting,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (uiState.isPainting) Amber600 else Emerald600
                ),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier
                    .weight(1f)
                    .height(44.dp)
                    .testTag("paint_toggle_button")
            ) {
                Icon(
                    imageVector = Icons.Default.Brush,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = if (uiState.isPainting) "Boyamayı Kapat" else "Boyamayı Başlat",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }

            IconButton(
                onClick = onUndo,
                enabled = uiState.history.isNotEmpty(),
                modifier = Modifier
                    .size(44.dp)
                    .background(if (uiState.history.isNotEmpty()) DarkGray800 else DarkGray950, RoundedCornerShape(8.dp))
                    .border(1.dp, DarkGray700, RoundedCornerShape(8.dp))
                    .testTag("undo_button")
            ) {
                Icon(
                    imageVector = Icons.Default.Undo,
                    contentDescription = "Geri Al",
                    tint = if (uiState.history.isNotEmpty()) Color.White else Color.DarkGray
                )
            }
        }

        // Complete Spline Lasso Button
        if (uiState.isPainting || uiState.paintedFaces.isNotEmpty()) {
            Button(
                onClick = onCompletePainting,
                colors = ButtonDefaults.buttonColors(containerColor = Purple600),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp)
                    .testTag("complete_spline_button")
            ) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text("Boyamayı Tamamla (Spline Kement)", fontSize = 13.sp, fontWeight = FontWeight.Bold)
            }
        }

        // Execute Split & Generate Pins Button
        if (uiState.cutSpline != null) {
            Button(
                onClick = onSplitModel,
                colors = ButtonDefaults.buttonColors(containerColor = Emerald600),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp)
                    .testTag("split_model_button")
            ) {
                Icon(
                    imageVector = Icons.Default.ContentCut,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text("Parçaları Ayrıştır & Pim Ekle", fontSize = 13.sp, fontWeight = FontWeight.Bold)
            }
        }

        // Export STL Button
        Button(
            onClick = onExportStl,
            colors = ButtonDefaults.buttonColors(containerColor = Blue600),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(44.dp)
                .testTag("export_stl_button")
        ) {
            Icon(
                imageVector = Icons.Default.FileDownload,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text("Parçaları STL Olarak İndir / Paylaş", fontSize = 13.sp, fontWeight = FontWeight.Bold)
        }
    }
}
