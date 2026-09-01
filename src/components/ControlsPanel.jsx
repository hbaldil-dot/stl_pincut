import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Download,
  Upload,
  Sliders,
  Eye,
  PenTool,
  RotateCcw,
  Box,
  Sparkles,
  Layers,
  CheckCircle2,
  Trash2,
  Undo2,
  Redo2,
  History,
  FolderArchive,
  ChevronDown,
  Info,
  ArrowUpDown,
  Maximize2,
  Palette,
  RotateCw,
  Grid,
  Ruler,
  FileCode,
  Compass,
  FileDown,
  ExternalLink,
  Copy,
  Check,
  Target,
  CircleDot,
  Settings2,
  Crosshair
} from 'lucide-react';
import { SAMPLE_PRESETS } from '../utils/sampleModels';
import { MATERIAL_THEMES } from '../utils/stlLoaderHelper';
import { calculateGeometryStats } from '../utils/stlExporter';

export function ControlsPanel({
  modelName,
  modelInfo,
  faceCount,
  activeMode, // 'plane' | 'lasso'
  onSelectMode,
  // Clipping Plane props
  clippingConfig,
  onClippingConfigChange,
  onExecutePlaneSlice,
  // Lasso Drawing props
  isDrawing,
  onToggleDrawing,
  drawnPointsCount,
  onCloseLoop,
  onClearDrawing,
  onUndoPoint,
  isLoopClosed,
  pinConfig,
  onPinConfigChange,
  // Slicing & Exploded props
  splitResult,
  onExecuteLassoSplit,
  onResetSplit,
  explodedDistance,
  onExplodedDistanceChange,
  onExportPartA,
  onExportPartB,
  onExportCombined,
  onExportZip,
  onExportFullModel,
  onExportDowelPin,
  onOpenExportModal,
  // Viewport & theme props
  onFileUpload,
  onSelectPreset,
  isWireframe,
  onToggleWireframe,
  onResetCamera,
  materialTheme,
  onSelectMaterialTheme,
  showGrid,
  onToggleGrid,
  showBoundingBox,
  onToggleBoundingBox,
  autoRotate,
  onToggleAutoRotate,
  onOpenInspector,
  // Measurement props
  isMeasureActive = false,
  onToggleMeasure,
  measurePointA = null,
  measurePointB = null,
  onClearMeasurement,
  // Model Rotation & Alignment props
  modelRotation = { x: 0, y: 0, z: 0 },
  onModelRotationChange,
  onStepRotate,
  onResetRotation,
  onAlignFlat,
  isRotateGizmoActive = false,
  onToggleRotateGizmo,
  snapAngle = null,
  onSetSnapAngle,
  // History / Undo / Redo props
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  historyCount = 1,
  currentHistoryIndex = 0,
  onOpenHistory,
  onOpenMeshList,
  meshCount = 1
}) {
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('slice'); // 'slice' | 'measure' | 'material' | 'display' | 'export'
  const [isCopied, setIsCopied] = useState(false);

  // Dynamic range for offset slider based on model bounding radius
  const maxRadius = Math.ceil(modelInfo?.boundingSphereRadius || 35);
  const minOffset = -maxRadius;
  const maxOffset = maxRadius;

  const statsA = splitResult ? calculateGeometryStats(splitResult.partA?.geometry) : null;
  const statsB = splitResult ? calculateGeometryStats(splitResult.partB?.geometry) : null;
  const dowelGeom = splitResult?.dowelPinGeometry || null;
  const dowelSpecs = splitResult?.dowelSpecs || null;

  const currentDiameter = pinConfig?.diameter || pinConfig?.size || 8;
  const currentDepth = pinConfig?.depth || pinConfig?.height || 10;
  const currentClearance = typeof pinConfig?.clearance === 'number' ? pinConfig.clearance : 0.2;
  const currentMode = pinConfig?.mode || 'pin_and_hole';

  // Calculated distance between Point A and Point B
  const measuredDistance = useMemo(() => {
    if (!measurePointA || !measurePointB) return null;
    return measurePointA.distanceTo(measurePointB);
  }, [measurePointA, measurePointB]);

  // Delta coordinates
  const deltaCoords = useMemo(() => {
    if (!measurePointA || !measurePointB) return null;
    return {
      dx: Math.abs(measurePointB.x - measurePointA.x),
      dy: Math.abs(measurePointB.y - measurePointA.y),
      dz: Math.abs(measurePointB.z - measurePointA.z)
    };
  }, [measurePointA, measurePointB]);

  const handleCopyMeasurement = () => {
    if (!measuredDistance) return;
    const text = `${measuredDistance.toFixed(2)} mm (ΔX: ${deltaCoords.dx.toFixed(2)}mm, ΔY: ${deltaCoords.dy.toFixed(2)}mm, ΔZ: ${deltaCoords.dz.toFixed(2)}mm)`;
    navigator.clipboard?.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="w-full md:w-96 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800 flex flex-col h-full shadow-2xl z-20 overflow-y-auto">
      {/* 1. Header Bar */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-emerald-400">STL PinCut 3D</h1>
            <p className="text-[11px] text-gray-400">Clipping Plane & Pim/Delik Kesici</p>
          </div>
        </div>

        {/* Top Quick Actions & Undo/Redo/History */}
        <div className="flex items-center gap-1">
          {/* Undo Button */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-lg border transition ${
              canUndo
                ? 'bg-gray-800 hover:bg-gray-700 text-blue-300 border-gray-700 hover:border-blue-500/50 shadow-sm'
                : 'bg-gray-900/40 text-gray-600 border-gray-850 cursor-not-allowed'
            }`}
            title="Geri Al (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          {/* Redo Button */}
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-lg border transition ${
              canRedo
                ? 'bg-gray-800 hover:bg-gray-700 text-emerald-300 border-gray-700 hover:border-emerald-500/50 shadow-sm'
                : 'bg-gray-900/40 text-gray-600 border-gray-850 cursor-not-allowed'
            }`}
            title="Yinele (Ctrl+Y / Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          {/* History Timeline Button */}
          <button
            onClick={onOpenHistory}
            className="p-1.5 bg-gray-800 hover:bg-gray-700 text-indigo-300 rounded-lg border border-gray-700 hover:border-indigo-500/50 transition relative"
            title={`İşlem Geçmişi (${historyCount} Adım)`}
          >
            <History className="w-4 h-4" />
            {historyCount > 1 && (
              <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[9px] font-mono px-1 rounded-full border border-gray-900 leading-tight">
                {historyCount}
              </span>
            )}
          </button>

          <div className="w-[1px] h-4 bg-gray-800 mx-0.5" />

          <button
            onClick={onToggleMeasure}
            className={`p-1.5 rounded-lg border transition ${
              isMeasureActive
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-900/50'
                : 'bg-gray-800 hover:bg-gray-700 text-cyan-300 border-gray-700'
            }`}
            title={isMeasureActive ? 'Ölçüm Modunu Kapat' : 'Ölçüm Aracını Başlat (2 Nokta Arası Mesafe)'}
          >
            <Ruler className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenInspector}
            className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition"
            title="Model İnceleyici ve Katı Analizi"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenMeshList}
            className="p-1.5 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 rounded-lg border border-indigo-700/60 transition relative"
            title="3D Nesneler ve Katman Listesi (Opaklık, Tel Kafes, Görünürlük)"
          >
            <Layers className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[9px] font-mono px-1 rounded-full border border-gray-900 leading-tight">
              {meshCount}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Top Navigation Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-950/30 px-2 pt-2 gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('slice')}
          className={`py-2 px-3 text-xs font-semibold rounded-t-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'slice'
              ? 'bg-gray-850 text-emerald-400 border-t border-l border-r border-gray-700 border-b-2 border-b-transparent'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Kesim & Delik</span>
        </button>

        <button
          onClick={() => setActiveTab('rotate')}
          className={`py-2 px-3 text-xs font-semibold rounded-t-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'rotate'
              ? 'bg-gray-850 text-amber-400 border-t border-l border-r border-gray-700 border-b-2 border-b-transparent'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Döndür & Hizala</span>
          {isRotateGizmoActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
        </button>

        <button
          onClick={() => setActiveTab('measure')}
          className={`py-2 px-3 text-xs font-semibold rounded-t-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'measure'
              ? 'bg-gray-850 text-cyan-400 border-t border-l border-r border-gray-700 border-b-2 border-b-transparent'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Ölçüm</span>
          {isMeasureActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
        </button>

        <button
          onClick={() => setActiveTab('material')}
          className={`py-2 px-3 text-xs font-semibold rounded-t-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'material'
              ? 'bg-gray-850 text-purple-400 border-t border-l border-r border-gray-700 border-b-2 border-b-transparent'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Görünüm</span>
        </button>

        {splitResult && (
          <button
            onClick={() => setActiveTab('export')}
            className={`py-2 px-3 text-xs font-semibold rounded-t-xl transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'export'
                ? 'bg-gray-850 text-blue-400 border-t border-l border-r border-gray-700 border-b-2 border-b-transparent'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>STL İndir</span>
          </button>
        )}
      </div>

      {/* Tab 1: Slice & Alignment Pin/Hole Engine */}
      {activeTab === 'slice' && (
        <div className="flex flex-col">
          {/* Model Selector & Upload Card */}
          <div className="p-4 border-b border-gray-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
              <span>Aktif 3D STL Modeli:</span>
              <span className="text-emerald-400 font-bold font-mono">
                {faceCount ? `${faceCount.toLocaleString()} üçgen` : 'Hazır'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <button
                  onClick={() => setIsPresetsOpen(!isPresetsOpen)}
                  className="w-full flex items-center justify-between bg-gray-950 border border-gray-700/80 rounded-xl px-3 py-2 text-xs font-medium text-gray-200 hover:border-emerald-500/60 transition shadow-inner"
                >
                  <span className="truncate">{modelName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {isPresetsOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-1 z-30 max-h-48 overflow-y-auto">
                    {SAMPLE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          onSelectPreset(preset.id, preset.name);
                          setIsPresetsOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs transition flex items-center justify-between ${
                          modelName === preset.name
                            ? 'bg-emerald-950/40 text-emerald-400 font-bold'
                            : 'text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <span>{preset.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {preset.category}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload custom STL */}
              <label className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl border border-gray-700 cursor-pointer transition flex items-center justify-center shrink-0">
                <Upload className="w-4 h-4 text-emerald-400" />
                <input
                  type="file"
                  accept=".stl"
                  onChange={onFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Quick Model Orientation Indicator & Rotate Jump */}
          <div className="px-4 py-2 bg-gray-950/70 border-b border-gray-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-gray-400">
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Yönelim:</span>
              <span className="font-mono text-[11px] text-gray-200">
                X:{Math.round(modelRotation?.x || 0)}° Y:{Math.round(modelRotation?.y || 0)}° Z:{Math.round(modelRotation?.z || 0)}°
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onStepRotate && onStepRotate('z', 90)}
                className="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-amber-300 rounded border border-gray-700 text-[10px] font-semibold transition"
                title="Z ekseninde +90° çevir"
              >
                +90° Z
              </button>
              <button
                onClick={() => setActiveTab('rotate')}
                className="px-1.5 py-0.5 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 rounded border border-amber-800/60 text-[10px] font-semibold transition"
                title="Model Döndürme & Hizalama sekmesine git"
              >
                Döndür
              </button>
            </div>
          </div>

          {/* Cutting Mode Switcher: Clipping Plane vs Lasso */}
          <div className="p-3 bg-gray-950/50 border-b border-gray-800">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-900 rounded-xl border border-gray-800">
              <button
                onClick={() => onSelectMode('plane')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeMode === 'plane'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Clipping Plane</span>
              </button>

              <button
                onClick={() => onSelectMode('lasso')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeMode === 'lasso'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Yüzey Kemendi</span>
              </button>
            </div>
          </div>

          {/* MODE A: CLIPPING PLANE CONTROLS */}
          {activeMode === 'plane' ? (
            <div className="p-4 border-b border-gray-800 flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-300 font-semibold uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5 text-blue-400" /> 1. Canlı Kesit Düzlemi (Clipping)
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-medium">Canlı Kesit</span>
                  <input
                    type="checkbox"
                    checked={clippingConfig.enabled}
                    onChange={(e) => onClippingConfigChange({ enabled: e.target.checked })}
                    className="accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>

              {/* Axis Selector Presets */}
              <div>
                <label className="text-[11px] text-gray-400 mb-1.5 block font-medium">
                  Kesim Ekseni & Doğrultusu
                </label>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() => onClippingConfigChange({ axis: 'x', rotX: 0, rotY: 0, rotZ: 0 })}
                    className={`py-1.5 px-1 rounded-lg text-xs font-semibold border transition text-center ${
                      clippingConfig.axis === 'x'
                        ? 'bg-red-600/30 border-red-500 text-red-300'
                        : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    X (Sağ/Sol)
                  </button>
                  <button
                    onClick={() => onClippingConfigChange({ axis: 'y', rotX: 0, rotY: 0, rotZ: 0 })}
                    className={`py-1.5 px-1 rounded-lg text-xs font-semibold border transition text-center ${
                      clippingConfig.axis === 'y'
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                        : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    Y (Dikey)
                  </button>
                  <button
                    onClick={() => onClippingConfigChange({ axis: 'z', rotX: 0, rotY: 0, rotZ: 0 })}
                    className={`py-1.5 px-1 rounded-lg text-xs font-semibold border transition text-center ${
                      clippingConfig.axis === 'z'
                        ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                        : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    Z (Ön/Arka)
                  </button>
                  <button
                    onClick={() => onClippingConfigChange({ axis: 'custom' })}
                    className={`py-1.5 px-1 rounded-lg text-xs font-semibold border transition text-center ${
                      clippingConfig.axis === 'custom'
                        ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                        : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    Serbest
                  </button>
                </div>
              </div>

              {/* Offset Slider */}
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1 font-medium">
                  <span>Düzlem Konumu (Offset)</span>
                  <span className="text-cyan-400 font-mono font-semibold">
                    {clippingConfig.offset.toFixed(1)} mm
                  </span>
                </div>
                <input
                  type="range"
                  min={minOffset}
                  max={maxOffset}
                  step="0.5"
                  value={clippingConfig.offset}
                  onChange={(e) => onClippingConfigChange({ offset: parseFloat(e.target.value) })}
                  className="w-full accent-blue-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                />
              </div>

              {/* Action Buttons: Negate & Slice */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onClippingConfigChange({ negate: !clippingConfig.negate })}
                  className="flex-1 py-1.5 px-2 bg-gray-800 hover:bg-gray-750 text-gray-300 rounded-lg text-xs font-medium border border-gray-700 transition flex items-center justify-center gap-1"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                  <span>Yönü Çevir</span>
                </button>

                <button
                  onClick={onExecutePlaneSlice}
                  className="flex-[2] py-2 px-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-900/30"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Düzlemden Kes</span>
                </button>
              </div>
            </div>
          ) : (
            /* MODE B: LASSO SPLIT CONTROLS */
            <div className="p-4 border-b border-gray-800 flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-300 font-semibold uppercase tracking-wider">
                  <PenTool className="w-3.5 h-3.5 text-emerald-400" /> 1. Yüzey Kement Çizimi
                </div>
                <span className="text-[10px] text-gray-400 font-mono bg-gray-800 px-2 py-0.5 rounded">
                  {drawnPointsCount} Nokta
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleDrawing}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg ${
                    isDrawing
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30 animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>{isDrawing ? 'Çizimi Duraklat' : 'Kement Çizmeye Başla'}</span>
                </button>

                {drawnPointsCount > 0 && (
                  <>
                    <button
                      onClick={onUndoPoint}
                      className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition"
                      title="Son Noktayı Geri Al (Ctrl+Z)"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={onClearDrawing}
                      className="p-2 bg-gray-800 hover:bg-gray-700 text-red-400 rounded-lg border border-gray-700 transition"
                      title="Çizimi Temizle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              {drawnPointsCount >= 3 && (
                <div className="flex items-center gap-2 pt-1">
                  {!isLoopClosed ? (
                    <button
                      onClick={onCloseLoop}
                      className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Halkayı Kapat & Pin Oluştur</span>
                    </button>
                  ) : (
                    <button
                      onClick={onExecuteLassoSplit}
                      className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/30"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      <span>Kementten Kes & Ayrıştır</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. ALIGNMENT PIN & CYLINDRICAL HOLE CONFIGURATION */}
          <div className="p-4 border-b border-gray-800 flex flex-col gap-3.5 bg-gray-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-gray-200 font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" /> 2. Hizalama Pimi & Silindirik Delik
              </div>
              <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/70 border border-cyan-800/50 px-2 py-0.5 rounded-full">
                Ø{currentDiameter} × {currentDepth}mm
              </span>
            </div>

            {/* Alignment System Mode Selector */}
            <div>
              <label className="text-[11px] text-gray-400 mb-1.5 block font-medium">
                Hizalama & Bağlantı Türü
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  {
                    id: 'pin_and_hole',
                    title: 'Pim + Delik (Erkek/Dişi)',
                    desc: 'Part 1 Pinli, Part 2 Soketli',
                    color: 'text-cyan-300 border-cyan-500 bg-cyan-950/40'
                  },
                  {
                    id: 'holes_both',
                    title: 'Çift Dübel Deliği',
                    desc: 'Her iki parçaya delik',
                    color: 'text-purple-300 border-purple-500 bg-purple-950/40'
                  },
                  {
                    id: 'hole_only',
                    title: 'Yalnızca Delik',
                    desc: 'Soket delikli kesim',
                    color: 'text-emerald-300 border-emerald-500 bg-emerald-950/40'
                  },
                  {
                    id: 'pin_only',
                    title: 'Yalnızca Erkek Pim',
                    desc: 'Dışa çıkıntılı pim',
                    color: 'text-orange-300 border-orange-500 bg-orange-950/40'
                  }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onPinConfigChange({ mode: item.id })}
                    className={`p-2 rounded-xl text-left border transition flex flex-col justify-between ${
                      currentMode === item.id
                        ? item.color
                        : 'bg-gray-850/60 border-gray-800 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    <div className="text-[11px] font-bold">{item.title}</div>
                    <div className="text-[9px] text-gray-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Diameter Slider & Direct Presets */}
            <div>
              <div className="flex justify-between items-center text-[11px] text-gray-300 mb-1 font-medium">
                <span>Pim / Delik Çapı (Ø Diameter)</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="2"
                    max="30"
                    step="0.5"
                    value={currentDiameter}
                    onChange={(e) => onPinConfigChange({ diameter: parseFloat(e.target.value) || 2, size: parseFloat(e.target.value) || 2 })}
                    className="w-14 bg-gray-950 border border-gray-700 text-right px-1.5 py-0.5 rounded text-orange-400 font-mono font-bold text-xs focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-gray-400 text-[10px]">mm</span>
                </div>
              </div>

              <input
                type="range"
                min="2"
                max="30"
                step="0.5"
                value={currentDiameter}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onPinConfigChange({ diameter: val, size: val });
                }}
                className="w-full accent-orange-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
              />

              {/* Quick Diameter Presets */}
              <div className="flex items-center gap-1 mt-1.5 overflow-x-auto no-scrollbar">
                {[3, 4, 5, 6, 8, 10, 12, 16].map((diam) => (
                  <button
                    key={diam}
                    onClick={() => onPinConfigChange({ diameter: diam, size: diam })}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition shrink-0 ${
                      currentDiameter === diam
                        ? 'bg-orange-600 text-white border-orange-400'
                        : 'bg-gray-800/80 text-gray-400 border-gray-750 hover:bg-gray-750 hover:text-gray-200'
                    }`}
                  >
                    Ø{diam}
                  </button>
                ))}
              </div>
            </div>

            {/* Depth Slider & Presets */}
            <div>
              <div className="flex justify-between items-center text-[11px] text-gray-300 mb-1 font-medium">
                <span>Delik / Pim Derinliği (Depth)</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="2"
                    max="35"
                    step="0.5"
                    value={currentDepth}
                    onChange={(e) => onPinConfigChange({ depth: parseFloat(e.target.value) || 2, height: parseFloat(e.target.value) || 2 })}
                    className="w-14 bg-gray-950 border border-gray-700 text-right px-1.5 py-0.5 rounded text-cyan-400 font-mono font-bold text-xs focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-gray-400 text-[10px]">mm</span>
                </div>
              </div>

              <input
                type="range"
                min="2"
                max="35"
                step="0.5"
                value={currentDepth}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onPinConfigChange({ depth: val, height: val });
                }}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
              />

              {/* Quick Depth Presets */}
              <div className="flex items-center gap-1 mt-1.5 overflow-x-auto no-scrollbar">
                {[5, 8, 10, 12, 15, 20, 25].map((d) => (
                  <button
                    key={d}
                    onClick={() => onPinConfigChange({ depth: d, height: d })}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition shrink-0 ${
                      currentDepth === d
                        ? 'bg-cyan-600 text-white border-cyan-400'
                        : 'bg-gray-800/80 text-gray-400 border-gray-750 hover:bg-gray-750 hover:text-gray-200'
                    }`}
                  >
                    {d}mm
                  </button>
                ))}
              </div>
            </div>

            {/* 3D Print Fit Tolerance Clearance */}
            <div>
              <div className="flex justify-between text-[11px] text-gray-300 mb-1.5 font-medium">
                <span>3D Yazıcı Geçme Toleransı (Clearance)</span>
                <span className="text-emerald-400 font-mono font-bold">+{currentClearance.toFixed(2)} mm</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { val: 0.10, label: '0.10mm (SLA/Sıkı)' },
                  { val: 0.20, label: '0.20mm (Önerilen)' },
                  { val: 0.30, label: '0.30mm (Rahat)' },
                  { val: 0.40, label: '0.40mm (Geniş)' }
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => onPinConfigChange({ clearance: item.val })}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-medium border transition text-center ${
                      currentClearance === item.val
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    {item.val} mm
                  </button>
                ))}
              </div>
            </div>

            {/* Pin Geometry (when male pin is active) */}
            {(currentMode === 'pin_and_hole' || currentMode === 'pin_only') && (
              <div className="pt-1 border-t border-gray-800/60 space-y-2">
                <label className="text-[11px] text-gray-400 block font-medium">
                  Erkek Pim Geometrisi & Eğim
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'cylinder', label: 'Silindir' },
                    { id: 'pyramid', label: 'Piramit' },
                    { id: 'hex', label: 'Altıgen' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onPinConfigChange({ type: item.id })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition ${
                        pinConfig.type === item.id
                          ? 'bg-orange-600/30 border-orange-500 text-orange-300'
                          : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Sliced & Exploded View Active Panel */}
          {splitResult && (
            <div className="p-4 border-b border-gray-800 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-300 font-semibold uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-emerald-400" /> 3. Kesim & Parça Ayrıştırma
              </div>

              <div className="flex flex-col gap-3 bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Parçalar Ayrıştırıldı!
                  </span>
                  <button
                    onClick={onResetSplit}
                    className="text-[11px] text-gray-400 hover:text-white underline"
                  >
                    Yeniden Birleştir
                  </button>
                </div>

                {splitResult.cutAreaCm2 && (
                  <div className="text-[11px] text-indigo-200/80 bg-indigo-900/30 p-2 rounded-lg border border-indigo-800/40 flex justify-between">
                    <span>Kesit Yüzey Alanı:</span>
                    <span className="font-bold text-cyan-300 font-mono">{splitResult.cutAreaCm2} cm²</span>
                  </div>
                )}

                {/* Exploded View Slider */}
                <div>
                  <div className="flex justify-between text-[11px] text-indigo-200 mb-1 font-medium">
                    <span>Patlatılmış Görünüm (Ayrılma Mesafesi)</span>
                    <span className="font-bold text-cyan-400 font-mono">{explodedDistance} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="1"
                    value={explodedDistance}
                    onChange={(e) => onExplodedDistanceChange(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                  />
                </div>

                {/* Standalone Dowel Pin Download Quick Trigger */}
                {dowelGeom && (
                  <button
                    onClick={onExportDowelPin}
                    className="w-full py-1.5 px-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                  >
                    <CircleDot className="w-3.5 h-3.5" />
                    <span>Uyumlu Dübel Pimi STL İndir (Ø{dowelSpecs?.diameter || 8}mm)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Model Rotation & Alignment */}
      {activeTab === 'rotate' && (
        <div className="p-4 flex flex-col gap-4">
          {/* Header Description & 3D Gizmo Switch */}
          <div className="bg-gradient-to-br from-amber-950/40 via-gray-900 to-gray-950 p-3.5 rounded-xl border border-amber-500/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>3D Model Yönelimi & Hizalama</span>
              </div>
              <button
                onClick={onResetRotation}
                className="text-[10px] text-gray-400 hover:text-amber-300 bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded transition flex items-center gap-1"
                title="Tüm dönüş açılarını sıfırla (0°, 0°, 0°)"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Sıfırla</span>
              </button>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Modeli kesimden veya 3D baskıdan önce X, Y ve Z eksenlerinde serbestçe döndürebilir, 3D ekrandaki halkalarla (Gizmo) hassas açılar verebilirsiniz.
            </p>

            {/* 3D Transform Gizmo Visibility Switch */}
            <div className="flex items-center justify-between bg-gray-950/60 p-2.5 rounded-lg border border-gray-800">
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-lg border ${
                    isRotateGizmoActive
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}
                >
                  <RotateCw className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-200">3D Döndürme Gizmosu</div>
                  <div className="text-[10px] text-gray-400">Model üzerinde interaktif halkalar</div>
                </div>
              </div>
              <button
                onClick={onToggleRotateGizmo}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  isRotateGizmoActive
                    ? 'bg-amber-500 text-gray-950 shadow-md'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                }`}
              >
                {isRotateGizmoActive ? 'Açık' : 'Kapalı'}
              </button>
            </div>

            {/* Angle Snapping Options */}
            <div className="flex items-center justify-between bg-gray-950/40 p-2 rounded-lg border border-gray-800 text-xs">
              <span className="text-gray-400 text-[11px]">Dönüş Açısı Kilidi (Snap):</span>
              <div className="flex items-center gap-1">
                {[
                  { label: 'Serbest', val: null },
                  { label: '15°', val: 15 },
                  { label: '45°', val: 45 },
                  { label: '90°', val: 90 }
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => onSetSnapAngle && onSetSnapAngle(s.val)}
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded transition ${
                      snapAngle === s.val
                        ? 'bg-amber-500 text-gray-950 font-bold'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed 3-Axis Controls: X, Y, Z */}
          <div className="flex flex-col gap-3">
            {/* Axis X: Pitch */}
            <div className="bg-gray-950/50 p-3 rounded-xl border border-red-900/40 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                    X
                  </span>
                  <span className="text-xs font-bold text-red-300">X Ekseni (Pitch / Ön-Arka)</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={Math.round(modelRotation?.x || 0)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      onModelRotationChange({ ...modelRotation, x: val }, true);
                    }}
                    className="w-16 bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-right font-mono text-xs text-white focus:border-red-500 focus:outline-none"
                  />
                  <span className="text-gray-500 text-xs">°</span>
                </div>
              </div>

              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={modelRotation?.x || 0}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onModelRotationChange({ ...modelRotation, x: val }, false);
                }}
                className="w-full accent-red-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
              />

              {/* Quick Steppers */}
              <div className="grid grid-cols-6 gap-1 pt-1">
                {[-90, -45, -15, 15, 45, 90].map((step) => (
                  <button
                    key={`x-step-${step}`}
                    onClick={() => onStepRotate && onStepRotate('x', step)}
                    className="py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-red-300 rounded border border-gray-800 text-[10px] font-mono transition"
                  >
                    {step > 0 ? `+${step}°` : `${step}°`}
                  </button>
                ))}
              </div>
            </div>

            {/* Axis Y: Yaw */}
            <div className="bg-gray-950/50 p-3 rounded-xl border border-emerald-900/40 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                    Y
                  </span>
                  <span className="text-xs font-bold text-emerald-300">Y Ekseni (Yaw / Sağa-Sola)</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={Math.round(modelRotation?.y || 0)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      onModelRotationChange({ ...modelRotation, y: val }, true);
                    }}
                    className="w-16 bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-right font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-gray-500 text-xs">°</span>
                </div>
              </div>

              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={modelRotation?.y || 0}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onModelRotationChange({ ...modelRotation, y: val }, false);
                }}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
              />

              {/* Quick Steppers */}
              <div className="grid grid-cols-6 gap-1 pt-1">
                {[-90, -45, -15, 15, 45, 90].map((step) => (
                  <button
                    key={`y-step-${step}`}
                    onClick={() => onStepRotate && onStepRotate('y', step)}
                    className="py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-emerald-300 rounded border border-gray-800 text-[10px] font-mono transition"
                  >
                    {step > 0 ? `+${step}°` : `${step}°`}
                  </button>
                ))}
              </div>
            </div>

            {/* Axis Z: Roll */}
            <div className="bg-gray-950/50 p-3 rounded-xl border border-blue-900/40 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                    Z
                  </span>
                  <span className="text-xs font-bold text-blue-300">Z Ekseni (Roll / Yan Yatırma)</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={Math.round(modelRotation?.z || 0)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      onModelRotationChange({ ...modelRotation, z: val }, true);
                    }}
                    className="w-16 bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-right font-mono text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-gray-500 text-xs">°</span>
                </div>
              </div>

              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={modelRotation?.z || 0}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onModelRotationChange({ ...modelRotation, z: val }, false);
                }}
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
              />

              {/* Quick Steppers */}
              <div className="grid grid-cols-6 gap-1 pt-1">
                {[-90, -45, -15, 15, 45, 90].map((step) => (
                  <button
                    key={`z-step-${step}`}
                    onClick={() => onStepRotate && onStepRotate('z', step)}
                    className="py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-blue-300 rounded border border-gray-800 text-[10px] font-mono transition"
                  >
                    {step > 0 ? `+${step}°` : `${step}°`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Bed Alignment Presets Card */}
          <div className="bg-gray-950/40 p-3.5 rounded-xl border border-gray-800 flex flex-col gap-2.5">
            <div className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>Hızlı Hizalama ve Yerleşim Presetleri</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onAlignFlat}
                className="py-2 px-2.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow"
                title="Modeli en yakın 90° dik açıyla tablaya oturt"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Tablaya Oturt (90° Snap)</span>
              </button>

              <button
                onClick={() => onStepRotate && onStepRotate('x', 180)}
                className="py-2 px-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-gray-700"
                title="Modeli 180° ters çevir"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                <span>180° Ters Çevir</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onStepRotate && onStepRotate('x', 90)}
                className="py-1.5 px-2 bg-gray-900 hover:bg-gray-850 text-red-300 rounded border border-red-900/40 text-[11px] font-semibold transition"
              >
                +90° X
              </button>
              <button
                onClick={() => onStepRotate && onStepRotate('y', 90)}
                className="py-1.5 px-2 bg-gray-900 hover:bg-gray-850 text-emerald-300 rounded border border-emerald-900/40 text-[11px] font-semibold transition"
              >
                +90° Y
              </button>
              <button
                onClick={() => onStepRotate && onStepRotate('z', 90)}
                className="py-1.5 px-2 bg-gray-900 hover:bg-gray-850 text-blue-300 rounded border border-blue-900/40 text-[11px] font-semibold transition"
              >
                +90° Z
              </button>
            </div>
          </div>

          {/* 3D Print Guidance Note */}
          <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800 text-[11px] text-gray-400 leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-gray-300 font-semibold">3D Baskı İpucu:</strong> Modeli düz bir yüzeyi tablaya bakacak şekilde döndürdükten sonra Clipping Plane ile dilimlediğinizde, kesim yüzeyleri tablaya mükemmel oturur ve destek (support) ihtiyacı en aza iner.
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Precision Measurement Tool */}
      {activeTab === 'measure' && (
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Ruler className="w-4 h-4 text-cyan-400" /> STL 3D Hassas Ölçüm Aracı
            </div>
            <button
              onClick={onToggleMeasure}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition flex items-center gap-1 ${
                isMeasureActive
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-900/40 animate-pulse'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
              }`}
            >
              <Target className="w-3 h-3" />
              <span>{isMeasureActive ? 'Ölçüm Aktif' : 'Ölçümü Başlat'}</span>
            </button>
          </div>

          {/* Primary Calculated Distance Card */}
          <div className="bg-gradient-to-br from-cyan-950/50 via-gray-900 to-slate-900 p-4 rounded-2xl border border-cyan-500/40 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
              <Ruler className="w-24 h-24 text-cyan-400" />
            </div>

            <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Toplam 3D Mesafe (Euclidean)</span>
            </div>

            <div className="my-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white tracking-tight">
                {measuredDistance !== null ? measuredDistance.toFixed(2) : '—'}
              </span>
              <span className="text-sm font-semibold text-cyan-300 font-mono">milimetre (mm)</span>
            </div>

            {/* Delta Coordinates Breakdown */}
            {deltaCoords ? (
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-800/80">
                <div className="bg-gray-950/60 p-2 rounded-lg border border-red-950/80">
                  <div className="text-[10px] text-red-400 font-semibold">ΔX Ekseni</div>
                  <div className="text-xs font-mono font-bold text-gray-200">
                    {deltaCoords.dx.toFixed(2)} <span className="text-[10px] text-gray-500 font-normal">mm</span>
                  </div>
                </div>
                <div className="bg-gray-950/60 p-2 rounded-lg border border-green-950/80">
                  <div className="text-[10px] text-green-400 font-semibold">ΔY Ekseni</div>
                  <div className="text-xs font-mono font-bold text-gray-200">
                    {deltaCoords.dy.toFixed(2)} <span className="text-[10px] text-gray-500 font-normal">mm</span>
                  </div>
                </div>
                <div className="bg-gray-950/60 p-2 rounded-lg border border-blue-950/80">
                  <div className="text-[10px] text-blue-400 font-semibold">ΔZ Ekseni</div>
                  <div className="text-xs font-mono font-bold text-gray-200">
                    {deltaCoords.dz.toFixed(2)} <span className="text-[10px] text-gray-500 font-normal">mm</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-gray-400 mt-2">
                {!measurePointA
                  ? 'Model üzerinde ilk noktayı (Nokta A) seçmek için tıklayın.'
                  : 'İkinci noktayı (Nokta B) seçerek mesafeyi tamamlayın.'}
              </div>
            )}

            {/* Quick Action Buttons */}
            {measuredDistance !== null && (
              <div className="flex items-center gap-2 mt-3.5">
                <button
                  onClick={handleCopyMeasurement}
                  className="flex-1 py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Panoya Kopyalandı!' : 'Değeri Kopyala'}</span>
                </button>
                <button
                  onClick={onClearMeasurement}
                  className="py-1.5 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-gray-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Sıfırla</span>
                </button>
              </div>
            )}
          </div>

          {/* Coordinate Points Detail Table */}
          <div className="bg-gray-950/40 p-3.5 rounded-xl border border-gray-800 flex flex-col gap-2.5">
            <div className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" /> Nokta Koordinatları (3D Pozisyon)
            </div>

            {/* Point A */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900/70 border border-cyan-900/40 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span className="font-bold text-cyan-300">Nokta A</span>
              </div>
              <div className="font-mono text-[11px] text-gray-300">
                {measurePointA
                  ? `[${measurePointA.x.toFixed(1)}, ${measurePointA.y.toFixed(1)}, ${measurePointA.z.toFixed(1)}] mm`
                  : 'Seçilmedi'}
              </div>
            </div>

            {/* Point B */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900/70 border border-amber-900/40 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="font-bold text-amber-300">Nokta B</span>
              </div>
              <div className="font-mono text-[11px] text-gray-300">
                {measurePointB
                  ? `[${measurePointB.x.toFixed(1)}, ${measurePointB.y.toFixed(1)}, ${measurePointB.z.toFixed(1)}] mm`
                  : 'Seçilmedi'}
              </div>
            </div>
          </div>

          {/* Model Bounding Box Reference */}
          {modelInfo && (
            <div className="bg-gray-950/40 p-3.5 rounded-xl border border-gray-800 flex flex-col gap-2">
              <div className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                <span>Model Genel Boyutları</span>
                <span className="text-[10px] text-gray-500">Bounding Box</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono text-gray-300">
                <div className="bg-gray-900 p-1.5 rounded border border-gray-800">
                  <span className="text-gray-500 text-[10px]">X (Genişlik):</span>
                  <div className="font-bold text-cyan-300">{modelInfo.dimensions.x} mm</div>
                </div>
                <div className="bg-gray-900 p-1.5 rounded border border-gray-800">
                  <span className="text-gray-500 text-[10px]">Y (Yükseklik):</span>
                  <div className="font-bold text-emerald-300">{modelInfo.dimensions.y} mm</div>
                </div>
                <div className="bg-gray-900 p-1.5 rounded border border-gray-800">
                  <span className="text-gray-500 text-[10px]">Z (Derinlik):</span>
                  <div className="font-bold text-purple-300">{modelInfo.dimensions.z} mm</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Material & Shading Customization */}
      {activeTab === 'material' && (
        <div className="p-4 flex flex-col gap-3.5">
          {/* Objects & Meshes Side Panel Launcher Card */}
          <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/40 flex items-center justify-between gap-2 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-400/30">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
                  <span>3D Nesneler & Katmanlar</span>
                  <span className="text-[10px] bg-indigo-500 text-white font-mono px-1.5 py-0.2 rounded-full font-bold">
                    {meshCount}
                  </span>
                </div>
                <div className="text-[10px] text-indigo-300">
                  Her parçaya özel opaklık, tel kafes & renk ayarı
                </div>
              </div>
            </div>

            <button
              onClick={onOpenMeshList}
              className="py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-md shadow-indigo-950/60"
            >
              <span>Yönet</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="text-xs text-gray-300 font-semibold uppercase tracking-wider flex items-center gap-1.5 pt-1">
            <Palette className="w-3.5 h-3.5 text-emerald-400" /> Genel Sahne Materyali
          </div>

          <div className="grid grid-cols-1 gap-2">
            {MATERIAL_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => onSelectMaterialTheme(theme)}
                className={`p-2.5 rounded-xl border flex items-center justify-between transition text-xs font-medium ${
                  materialTheme?.id === theme.id
                    ? 'bg-emerald-950/40 border-emerald-500 text-white'
                    : 'bg-gray-800/60 border-gray-700/80 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shadow-inner"
                    style={{
                      background: theme.normalShader
                        ? 'linear-gradient(135deg, #ef4444, #22c55e, #3b82f6)'
                        : theme.color
                    }}
                  />
                  <span>{theme.name}</span>
                </div>
                {materialTheme?.id === theme.id && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Export Sliced STL (Available when splitResult is active) */}
      {activeTab === 'export' && splitResult && (
        <div className="p-4 flex flex-col gap-3.5">
          <div className="text-xs text-gray-300 font-semibold uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-cyan-400" /> Sliced STL Mesh Dışa Aktarma
            </span>
            <button
              onClick={onOpenExportModal}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>Ayrıntılı Panel</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Part 1 Box */}
          <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-blue-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Part 1
              </span>
              {statsA && <span className="font-mono text-[10px] text-blue-400">{statsA.binarySizeFormatted}</span>}
            </div>
            <p className="text-[10px] text-gray-400">
              {statsA?.triangles.toLocaleString()} üçgen • Su sızdırmaz düzlem
            </p>
            <button
              onClick={onExportPartA}
              className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Part 1 STL İndir
            </button>
          </div>

          {/* Part 2 Box */}
          <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Part 2 (Silindirik Soket Delikli)
              </span>
              {statsB && <span className="font-mono text-[10px] text-emerald-400">{statsB.binarySizeFormatted}</span>}
            </div>
            <p className="text-[10px] text-gray-400">
              {statsB?.triangles.toLocaleString()} üçgen • Silindirik hizalama deliği
            </p>
            <button
              onClick={onExportPartB}
              className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Part 2 STL İndir
            </button>
          </div>

          {/* Standalone Dowel Pin */}
          {dowelGeom && (
            <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <CircleDot className="w-3.5 h-3.5 text-amber-400" />
                  Dübel Pimi STL (Ø{dowelSpecs?.diameter || 8}mm × {dowelSpecs?.length || 20}mm)
                </span>
              </div>
              <button
                onClick={onExportDowelPin}
                className="w-full py-1.5 px-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Dübel Pimi STL İndir
              </button>
            </div>
          )}

          {/* Combined STL */}
          <button
            onClick={onExportCombined}
            className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" />
            Birleştirilmiş Modifiye Mesh (Tek STL)
          </button>

          {/* ZIP */}
          <button
            onClick={onExportZip}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg"
          >
            <FolderArchive className="w-4 h-4" />
            Tüm Parçaları ZIP İndir (3D Baskı)
          </button>
        </div>
      )}

      {/* Sticky Export Footer */}
      <div className="p-4 flex flex-col gap-2.5 mt-auto border-t border-gray-800 bg-gray-950/60">
        <div className="flex items-center justify-between text-xs text-gray-300 font-semibold uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-blue-400" /> STL Dışa Aktarma
          </span>
          {splitResult && (
            <button
              onClick={onOpenExportModal}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 normal-case font-normal underline"
            >
              Seçenekler
            </button>
          )}
        </div>

        {splitResult ? (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onExportPartA}
                className="py-2 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 shadow"
                title="Part 1 STL İndir"
              >
                <Download className="w-3.5 h-3.5" /> Part 1 STL
              </button>
              <button
                onClick={onExportPartB}
                className="py-2 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 shadow"
                title="Part 2 STL İndir"
              >
                <Download className="w-3.5 h-3.5" /> Part 2 STL
              </button>
            </div>

            {dowelGeom && (
              <button
                onClick={onExportDowelPin}
                className="w-full py-1.5 px-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
              >
                <CircleDot className="w-3.5 h-3.5" /> Dübel Pimi STL İndir (Ø{dowelSpecs?.diameter || 8}mm)
              </button>
            )}

            <button
              onClick={onExportZip}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg"
            >
              <FolderArchive className="w-4 h-4" /> Tüm Parçaları ZIP İndir (3D Baskı)
            </button>
          </div>
        ) : (
          <button
            onClick={onExportFullModel}
            className="w-full py-2 px-3 bg-blue-600/80 hover:bg-blue-600 text-white rounded-xl text-xs font-medium transition flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5" /> Modeli STL Olarak İndir
          </button>
        )}
      </div>
    </div>
  );
}
