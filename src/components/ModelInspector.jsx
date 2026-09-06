import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Layers,
  Ruler,
  Maximize2,
  FileCode,
  HardDrive,
  Cpu,
  Info,
  CheckCircle,
  HelpCircle,
  X,
  Scale,
  ExternalLink,
  Droplet,
  Download,
  FileSpreadsheet,
  Check,
  Gauge,
  Activity,
  RotateCcw,
  Edit3
} from 'lucide-react';
import {
  calculateModelMass,
  calculateGeometryVolume,
  COMMON_DENSITY_PRESETS,
  OTHER_DENSITY_PRESETS,
  ALL_DENSITY_PRESETS
} from '../utils/volumeCalculator';
import { downloadMetricsFile } from '../utils/exportMetrics';
import { getComplexityTier } from './PerformanceOverlay';

const DENSITY_PRESETS = ALL_DENSITY_PRESETS;

export function ModelInspector({
  info,
  isOpen,
  onClose,
  onOpenVolumeTool,
  showBoundingBox = false,
  onToggleBoundingBox,
  modelScale = { x: 1, y: 1, z: 1 },
  onResetScale,
  model,
  density: propDensity,
  onChangeDensity
}) {
  const [volumeUnit, setVolumeUnit] = useState('cm3');
  const [surfaceUnit, setSurfaceUnit] = useState('cm2');
  const [internalDensity, setInternalDensity] = useState('1.24');
  const [massUnit, setMassUnit] = useState('g'); // 'g' | 'kg' | 'oz' | 'lb'
  const [exportedFormat, setExportedFormat] = useState(null);

  const initialDensityStr = propDensity !== undefined ? propDensity.toString() : internalDensity;
  const [densityInputText, setDensityInputText] = useState(initialDensityStr);

  useEffect(() => {
    if (propDensity !== undefined) {
      const parsed = parseFloat(densityInputText);
      if (isNaN(parsed) || Math.abs(parsed - propDensity) > 0.0001) {
        setDensityInputText(propDensity.toString());
      }
    }
  }, [propDensity]);

  const density = propDensity !== undefined ? propDensity.toString() : internalDensity;

  const handleDensityInputChange = (val) => {
    setDensityInputText(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setInternalDensity(val);
      if (onChangeDensity) onChangeDensity(num);
    }
  };

  const handleDensitySelect = (val) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setDensityInputText(num.toString());
      setInternalDensity(num.toString());
      if (onChangeDensity) onChangeDensity(num);
    }
  };

  const densityNum = parseFloat(density);
  const matchedPreset = DENSITY_PRESETS.find(
    (p) => !isNaN(densityNum) && Math.abs(densityNum - p.density) < 0.005
  );
  const isCustomDensity = !matchedPreset;

  const sx = modelScale?.x ?? 1;
  const sy = modelScale?.y ?? 1;
  const sz = modelScale?.z ?? 1;
  const isScaled = Math.abs(sx - 1) > 1e-3 || Math.abs(sy - 1) > 1e-3 || Math.abs(sz - 1) > 1e-3;

  // Real-time scaled volume and surface area calculation
  const calculatedStats = useMemo(() => {
    if (model?.geometry) {
      try {
        const stats = calculateGeometryVolume(model.geometry, { x: sx, y: sy, z: sz });
        return {
          volumeCm3: stats.volumeCm3,
          volumeMm3: stats.volumeMm3,
          surfaceAreaCm2: stats.surfaceAreaCm2,
          surfaceAreaMm2: stats.surfaceAreaMm2
        };
      } catch (e) {
        // Fallback to proportional
      }
    }
    const baseV = info?.volumeCm3 ?? 0;
    const baseA = info?.surfaceAreaCm2 ?? 0;
    const vCm3 = baseV * (isScaled ? sx * sy * sz : 1);
    const areaRatio = isScaled
      ? (Math.abs(sx - sy) < 1e-4 && Math.abs(sy - sz) < 1e-4 ? sx * sx : (sx * sy + sy * sz + sz * sx) / 3)
      : 1;
    const saCm2 = baseA * areaRatio;
    return {
      volumeCm3: parseFloat(vCm3.toFixed(2)),
      volumeMm3: Math.round(vCm3 * 1000),
      surfaceAreaCm2: parseFloat(saCm2.toFixed(2)),
      surfaceAreaMm2: Math.round(saCm2 * 100)
    };
  }, [model?.geometry, sx, sy, sz, isScaled, info?.volumeCm3, info?.surfaceAreaCm2]);

  if (!isOpen || !info) return null;

  const volumeCm3 = calculatedStats.volumeCm3;
  const volumeMm3 = calculatedStats.volumeMm3;
  const surfaceAreaCm2 = calculatedStats.surfaceAreaCm2;
  const surfaceAreaMm2 = calculatedStats.surfaceAreaMm2;

  const handleExportMetrics = (format) => {
    downloadMetricsFile({
      modelName: info.name,
      dimensions: {
        x: ((info.dimensions?.x || 0) * (isScaled ? sx : 1)).toFixed(2),
        y: ((info.dimensions?.y || 0) * (isScaled ? sy : 1)).toFixed(2),
        z: ((info.dimensions?.z || 0) * (isScaled ? sz : 1)).toFixed(2)
      },
      volumeStats: {
        volumeCm3,
        volumeMm3,
        surfaceAreaCm2,
        surfaceAreaMm2
      },
      massStats,
      density: numDensity,
      meshInfo: {
        triangleCount: info.triangleCount,
        vertexCount: info.vertexCount
      }
    }, format);

    setExportedFormat(format);
    setTimeout(() => setExportedFormat(null), 2500);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formattedVolume =
    volumeUnit === 'mm3'
      ? `${volumeMm3.toLocaleString('tr-TR')} mm³`
      : `${volumeCm3.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cm³`;

  const formattedSurfaceArea =
    surfaceUnit === 'mm2'
      ? `${surfaceAreaMm2.toLocaleString('tr-TR')} mm²`
      : `${surfaceAreaCm2.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cm²`;

  const numDensity = Math.max(0.001, parseFloat(density) || 0);
  const massStats = useMemo(() => {
    return calculateModelMass(volumeCm3, numDensity);
  }, [volumeCm3, numDensity]);

  const triangles = info.triangleCount ?? info.triangles ?? 0;
  const vertices = info.vertexCount ?? (triangles > 0 ? triangles * 3 : 0);
  const complexity = useMemo(() => getComplexityTier(triangles), [triangles]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">STL Model Analizi & Geometri Bilgisi</h2>
              <p className="text-[11px] text-gray-400">3D Baskı ve mesh detayları</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white bg-gray-800/60 hover:bg-gray-800 rounded-lg border border-gray-700/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* File Name & Type */}
          <div className="bg-gray-950/50 p-3.5 rounded-xl border border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCode className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-gray-200 text-sm truncate max-w-xs">{info.name}</div>
                <div className="text-[11px] text-gray-400">{info.format} ({formatBytes(info.fileSize)})</div>
              </div>
            </div>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-mono text-[10px] font-bold">
              STL 3D
            </span>
          </div>

          {/* Active Model Scale Indicator Banner & Single-Click Reset Action */}
          {(Math.abs((modelScale?.x ?? 1) - 1) > 1e-3 ||
            Math.abs((modelScale?.y ?? 1) - 1) > 1e-3 ||
            Math.abs((modelScale?.z ?? 1) - 1) > 1e-3) && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between text-amber-300">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                    <span>Model Ölçeklendirilmiş</span>
                    <span className="text-[10px] bg-amber-500/30 text-amber-200 px-1.5 py-0.2 rounded font-mono font-bold">
                      {Math.abs((modelScale.x || 1) - (modelScale.y || 1)) < 1e-3 && Math.abs((modelScale.y || 1) - (modelScale.z || 1)) < 1e-3
                        ? `%${Math.round((modelScale.x || 1) * 100)} (${(modelScale.x || 1).toFixed(2)}x)`
                        : `X:%${Math.round((modelScale.x || 1) * 100)} Y:%${Math.round((modelScale.y || 1) * 100)} Z:%${Math.round((modelScale.z || 1) * 100)}`}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Hacim, kütle ve yüzey alanı ölçek faktörüne göre canlı hesaplandı.
                  </div>
                </div>
              </div>
              {onResetScale && (
                <button
                  type="button"
                  onClick={onResetScale}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition shadow-sm shrink-0"
                  title="Modeli orijinal 1.0 (%100) boyutuna sıfırla"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ölçeği Sıfırla (%100)</span>
                </button>
              )}
            </div>
          )}

          {/* Geometric Dimensions (X, Y, Z Bounding Box in mm) */}
          <div className="bg-gray-950/40 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-300 font-semibold">
                <Ruler className="w-4 h-4 text-emerald-400" />
                <span>Sınır Kutusu Boyutları (AABB)</span>
              </div>

              {/* AABB Wireframe Visualization Toggle */}
              {onToggleBoundingBox && (
                <button
                  type="button"
                  onClick={onToggleBoundingBox}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1.5 shadow-sm ${
                    showBoundingBox
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-cyan-900/40'
                      : 'bg-gray-900 hover:bg-gray-850 text-cyan-300 border-gray-700 hover:border-cyan-500/50'
                  }`}
                  title="3D Görünümde Modelin Eksen Hizalı Sınır Kutusunu (AABB Tel Kafes) ve Ölçüm Boyutlarını Göster/Gizle"
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>{showBoundingBox ? 'AABB Tel Kafes: Açık' : 'AABB Tel Kafesi Göster'}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      showBoundingBox ? 'bg-cyan-300 animate-pulse' : 'bg-gray-600'
                    }`}
                  />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                <span className="text-[10px] text-gray-400 block font-mono">X (Genişlik)</span>
                <span className="text-sm font-bold text-red-400 font-mono">
                  {((info.dimensions?.x || 0) * (isScaled ? sx : 1)).toFixed(1)} mm
                </span>
                {isScaled && (
                  <span className="text-[9px] text-gray-500 block font-mono">
                    (Orij: {info.dimensions?.x} mm)
                  </span>
                )}
              </div>
              <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                <span className="text-[10px] text-gray-400 block font-mono">Y (Yükseklik)</span>
                <span className="text-sm font-bold text-green-400 font-mono">
                  {((info.dimensions?.y || 0) * (isScaled ? sy : 1)).toFixed(1)} mm
                </span>
                {isScaled && (
                  <span className="text-[9px] text-gray-500 block font-mono">
                    (Orij: {info.dimensions?.y} mm)
                  </span>
                )}
              </div>
              <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                <span className="text-[10px] text-gray-400 block font-mono">Z (Derinlik)</span>
                <span className="text-sm font-bold text-blue-400 font-mono">
                  {((info.dimensions?.z || 0) * (isScaled ? sz : 1)).toFixed(1)} mm
                </span>
                {isScaled && (
                  <span className="text-[9px] text-gray-500 block font-mono">
                    (Orij: {info.dimensions?.z} mm)
                  </span>
                )}
              </div>
            </div>

            <div className="text-[10px] text-gray-400 bg-gray-900/50 p-2 rounded-lg border border-gray-800/80 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Box className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>3D uzaysal ölçüm referansı için eksen hizalı tel kafes ve koordinat etiketleri.</span>
              </span>
              {onToggleBoundingBox && (
                <button
                  type="button"
                  onClick={onToggleBoundingBox}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 ml-2 shrink-0 cursor-pointer"
                >
                  {showBoundingBox ? 'Tel Kafesi Kapat' : '3D Sahneye Ekle'}
                </button>
              )}
            </div>
          </div>

          {/* Model Complexity & Mesh Analysis Gauge */}
          <div className="bg-gray-950/60 p-4 rounded-2xl border border-gray-800 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/15 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-200 text-xs">Model Karmaşıklığı & Ağ Analizi</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${complexity.bgColor} ${complexity.textColor} ${complexity.borderColor}`}
                    >
                      {complexity.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">Üçgen ve tepe noktası (vertex) yoğunluk değerlendirmesi</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-gray-200">
                  %{Math.round(complexity.progressPercent)}
                </span>
                <span className="text-[9px] text-gray-500 block">karmaşıklık</span>
              </div>
            </div>

            {/* Triangle & Vertex Primary Metric Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900/90 p-3 rounded-xl border border-purple-500/30 flex items-center gap-3">
                <div className="p-2 bg-purple-500/15 rounded-lg border border-purple-500/30 shrink-0">
                  <Layers className="w-4 h-4 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-medium text-gray-400 block truncate">
                    Toplam Üçgen (Triangles)
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-extrabold text-purple-300 font-mono text-base">
                      {triangles.toLocaleString('tr-TR')}
                    </span>
                    <span className="text-[10px] text-purple-400 font-mono">yüzey</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/90 p-3 rounded-xl border border-cyan-500/30 flex items-center gap-3">
                <div className="p-2 bg-cyan-500/15 rounded-lg border border-cyan-500/30 shrink-0">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-medium text-gray-400 block truncate">
                    Tepe Noktası (Vertices)
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-extrabold text-cyan-300 font-mono text-base">
                      {vertices.toLocaleString('tr-TR')}
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">nokta</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Multi-Segment Complexity Meter */}
            <div className="space-y-1.5 bg-gray-900/50 p-2.5 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                <span>Model Karmaşıklık Skalası:</span>
                <span className="font-mono font-semibold text-gray-300">
                  {triangles < 50000 ? 'Hafif / Hızlı' : triangles <= 250000 ? 'Optimum Geometri' : triangles <= 800000 ? 'Yüksek Detay' : 'Ağır / Ultra Poligon'}
                </span>
              </div>

              <div className="w-full bg-gray-950 rounded-full h-2.5 overflow-hidden p-0.5 border border-gray-800 flex gap-0.5">
                {/* 4 segments: Low (0-25%), Balanced (25-50%), High (50-75%), Ultra (75-100%) */}
                <div className="h-full rounded-l-full relative flex-1 bg-gray-900 overflow-hidden">
                  <div
                    className="h-full rounded-l-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: complexity.progressPercent < 25 ? `${(complexity.progressPercent / 25) * 100}%` : '100%'
                    }}
                  />
                </div>
                <div className="h-full relative flex-1 bg-gray-900 overflow-hidden">
                  <div
                    className="h-full bg-sky-500 transition-all duration-500"
                    style={{
                      width:
                        complexity.progressPercent >= 25 && complexity.progressPercent < 50
                          ? `${((complexity.progressPercent - 25) / 25) * 100}%`
                          : complexity.progressPercent >= 50
                          ? '100%'
                          : '0%'
                    }}
                  />
                </div>
                <div className="h-full relative flex-1 bg-gray-900 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-500"
                    style={{
                      width:
                        complexity.progressPercent >= 50 && complexity.progressPercent < 75
                          ? `${((complexity.progressPercent - 50) / 25) * 100}%`
                          : complexity.progressPercent >= 75
                          ? '100%'
                          : '0%'
                    }}
                  />
                </div>
                <div className="h-full rounded-r-full relative flex-1 bg-gray-900 overflow-hidden">
                  <div
                    className="h-full rounded-r-full bg-rose-500 transition-all duration-500"
                    style={{
                      width:
                        complexity.progressPercent >= 75
                          ? `${((complexity.progressPercent - 75) / 25) * 100}%`
                          : '0%'
                    }}
                  />
                </div>
              </div>

              {/* Scale Labels */}
              <div className="flex justify-between text-[9px] font-mono px-1 text-gray-500">
                <span className={triangles < 50000 ? 'text-emerald-400 font-bold' : ''}>0 - 50K (Düşük)</span>
                <span className={triangles >= 50000 && triangles <= 250000 ? 'text-sky-400 font-bold' : ''}>50K - 250K (Dengeli)</span>
                <span className={triangles > 250000 && triangles <= 800000 ? 'text-amber-400 font-bold' : ''}>250K - 800K (Yüksek)</span>
                <span className={triangles > 800000 ? 'text-rose-400 font-bold' : ''}>800K+ (Ultra)</span>
              </div>
            </div>

            {/* Slicer Performance & Suitability Guidance */}
            <div className="bg-gray-900/60 p-2.5 rounded-xl border border-gray-800/80 flex items-start gap-2.5">
              <Activity className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-[10px]">
                <div className="text-gray-200 font-medium leading-relaxed">
                  {complexity.slicerAdvice}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-400 font-mono text-[9px] pt-1 border-t border-gray-800/60">
                  <span>Dilimleme Yükü: <strong className="text-gray-200">{complexity.description}</strong></span>
                  <span>•</span>
                  <span>Mesh Dosya Boyutu: <strong className="text-gray-200">{formatBytes(info.fileSize)}</strong></span>
                  {triangles > 0 && (
                    <>
                      <span>•</span>
                      <span>Vertex/Üçgen Oranı: <strong className="text-gray-200">{(vertices / triangles).toFixed(2)}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Volume & Surface Area Measurements */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Box className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-gray-400 block">Model Hacmi</span>
                  <span className="font-bold text-amber-300 font-mono text-xs">{formattedVolume}</span>
                </div>
              </div>
              <div className="flex bg-gray-900 border border-gray-700/80 rounded-lg p-0.5 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setVolumeUnit('cm3')}
                  className={`px-1.5 py-0.5 rounded ${
                    volumeUnit === 'cm3' ? 'bg-amber-500 text-gray-950 font-bold' : 'text-gray-400'
                  }`}
                >
                  cm³
                </button>
                <button
                  type="button"
                  onClick={() => setVolumeUnit('mm3')}
                  className={`px-1.5 py-0.5 rounded ${
                    volumeUnit === 'mm3' ? 'bg-amber-500 text-gray-950 font-bold' : 'text-gray-400'
                  }`}
                >
                  mm³
                </button>
              </div>
            </div>

            <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Maximize2 className="w-4 h-4 text-teal-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-gray-400 block">Yüzey Alanı</span>
                  <span className="font-bold text-teal-300 font-mono text-xs">{formattedSurfaceArea}</span>
                </div>
              </div>
              <div className="flex bg-gray-900 border border-gray-700/80 rounded-lg p-0.5 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setSurfaceUnit('cm2')}
                  className={`px-1.5 py-0.5 rounded ${
                    surfaceUnit === 'cm2' ? 'bg-teal-500 text-gray-950 font-bold' : 'text-gray-400'
                  }`}
                >
                  cm²
                </button>
                <button
                  type="button"
                  onClick={() => setSurfaceUnit('mm2')}
                  className={`px-1.5 py-0.5 rounded ${
                    surfaceUnit === 'mm2' ? 'bg-teal-500 text-gray-950 font-bold' : 'text-gray-400'
                  }`}
                >
                  mm²
                </button>
              </div>
            </div>
          </div>

          {/* Material Density & Total Mass Analysis Panel */}
          <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950/30 p-3.5 rounded-2xl border border-emerald-500/40 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/40">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Malzeme Yoğunluğu & Kütle Analizi</span>
                    <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/40">
                      m = V × ρ
                    </span>
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    Model hacmine göre otomatik toplam katı kütle hesabı
                  </p>
                </div>
              </div>

              {/* Mass Unit Selector (g, kg, oz, lb) */}
              <div className="flex bg-gray-900 border border-gray-700/80 rounded-lg p-0.5 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setMassUnit('g')}
                  className={`px-2 py-0.5 rounded transition ${
                    massUnit === 'g' ? 'bg-emerald-500 text-gray-950 font-bold' : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title="Gram (g)"
                >
                  g
                </button>
                <button
                  type="button"
                  onClick={() => setMassUnit('kg')}
                  className={`px-2 py-0.5 rounded transition ${
                    massUnit === 'kg' ? 'bg-emerald-500 text-gray-950 font-bold' : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title="Kilogram (kg)"
                >
                  kg
                </button>
                <button
                  type="button"
                  onClick={() => setMassUnit('oz')}
                  className={`px-2 py-0.5 rounded transition ${
                    massUnit === 'oz' ? 'bg-emerald-500 text-gray-950 font-bold' : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title="Ons (oz)"
                >
                  oz
                </button>
                <button
                  type="button"
                  onClick={() => setMassUnit('lb')}
                  className={`px-2 py-0.5 rounded transition ${
                    massUnit === 'lb' ? 'bg-emerald-500 text-gray-950 font-bold' : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title="Pound (lb)"
                >
                  lb
                </button>
              </div>
            </div>

            {/* Density Input Field & Presets */}
            <div className="space-y-2.5">
              {/* Material Preset Selection */}
              <div className="bg-gray-950/80 p-2.5 rounded-xl border border-gray-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="material-preset-select-inspector" className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Malzeme Önayarı (Material Preset):</span>
                  </label>
                  <span className="text-[10px] text-gray-500 font-mono">
                    m = V × ρ
                  </span>
                </div>

                <select
                  id="material-preset-select-inspector"
                  value={matchedPreset ? matchedPreset.density.toString() : 'custom'}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      document.getElementById('custom-density-input-inspector')?.focus();
                    } else if (e.target.value) {
                      handleDensitySelect(e.target.value);
                    }
                  }}
                  className="w-full bg-gray-900 border border-gray-700 hover:border-emerald-500/60 focus:border-emerald-400 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400 transition"
                  title="3D Baskı Malzemesi Önayarı Seç (PLA, ABS, PETG, TPU...)"
                >
                  <option value="" disabled>
                    Önayar Seç...
                  </option>
                  <optgroup label="⭐ Yaygın 3D Baskı Malzemeleri (Common 3D Printing)">
                    {COMMON_DENSITY_PRESETS.map((preset) => (
                      <option
                        key={preset.id}
                        value={preset.density.toString()}
                        className="bg-gray-900 text-emerald-300 font-semibold"
                      >
                        {preset.name}: {preset.density} g/cm³
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Diğer Filamentler & Reçineler (Diğer)">
                    {OTHER_DENSITY_PRESETS.map((preset) => (
                      <option
                        key={preset.id}
                        value={preset.density.toString()}
                        className="bg-gray-900 text-gray-300"
                      >
                        {preset.name}: {preset.density} g/cm³
                      </option>
                    ))}
                  </optgroup>
                  <option value="custom" className="bg-gray-900 text-amber-300 font-semibold">
                    ✏️ Özel Malzeme (Listede Olmayan Malzeme / Manuel Giriş)...
                  </option>
                </select>

                {/* Quick Material Presets */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold mr-1 shrink-0">Hızlı Seç:</span>
                  {COMMON_DENSITY_PRESETS.map((preset) => {
                    const isCurrent = matchedPreset?.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleDensitySelect(preset.density.toString())}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition flex items-center gap-1.5 shrink-0 ${
                          isCurrent
                            ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950 border border-emerald-400'
                            : 'bg-gray-900/80 hover:bg-gray-800 text-gray-300 border border-gray-800'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: preset.color }}
                        />
                        <span className="font-bold">{preset.name}</span>
                        <span className="font-mono text-[9px] opacity-80">({preset.density} g/cm³)</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dedicated Custom Material Density Numeric Input Field */}
              <div className="bg-gray-950/80 p-2.5 rounded-xl border border-gray-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="custom-density-input-inspector" className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Özel Malzeme Yoğunluğu (Custom Density):</span>
                  </label>
                  {isCustomDensity ? (
                    <span className="text-[10px] font-medium text-amber-400 bg-amber-950/60 border border-amber-500/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Özel Değer Aktif
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-500 font-mono">
                      Önayar: {matchedPreset?.name} ({matchedPreset?.density} g/cm³)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      id="custom-density-input-inspector"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="30"
                      value={densityInputText}
                      onChange={(e) => handleDensityInputChange(e.target.value)}
                      className={`w-full bg-gray-900 border rounded-lg px-3 py-1.5 text-white font-mono font-bold text-xs focus:outline-none focus:ring-1 shadow-inner pr-16 transition ${
                        isCustomDensity
                          ? 'border-amber-500/60 focus:border-amber-400 focus:ring-amber-400'
                          : 'border-gray-700 hover:border-emerald-500/50 focus:border-emerald-400 focus:ring-emerald-400'
                      }`}
                      placeholder="Örn: 1.24"
                      title="Malzemeniz önayarlar listesinde yoksa özel yoğunluk değerini (g/cm³) girin"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-emerald-400 font-semibold pointer-events-none">
                      g/cm³
                    </span>
                  </div>

                  {isCustomDensity && (
                    <button
                      type="button"
                      onClick={() => handleDensitySelect('1.24')}
                      className="px-2.5 py-1.5 text-[10px] font-medium text-gray-400 hover:text-gray-200 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-lg transition shrink-0"
                      title="Varsayılan PLA yoğunluğuna (1.24 g/cm³) sıfırla"
                    >
                      PLA&apos;ya Sıfırla
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-gray-400 leading-tight">
                  Malzemeniz listede yoksa, özel yoğunluk değerini (g/cm³) girerek kütleyi anında hesaplayabilirsiniz.
                </p>
              </div>
            </div>

            {/* Calculated Total Mass Display Card */}
            <div className="bg-gray-950/90 p-3 rounded-xl border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 block font-medium">Hesaplanan Toplam Model Kütlesi</span>
                <div className="text-xl font-black font-mono text-emerald-300 flex items-baseline gap-1.5">
                  <span>
                    {massUnit === 'kg'
                      ? massStats.formattedKg
                      : massUnit === 'oz'
                      ? massStats.formattedOz
                      : massUnit === 'lb'
                      ? massStats.formattedLb
                      : massStats.formattedGrams}
                  </span>
                  {massUnit === 'g' && (
                    <span className="text-[11px] font-normal text-gray-400 font-mono">
                      (~{massStats.formattedKg} / ~{massStats.formattedLb})
                    </span>
                  )}
                  {massUnit !== 'g' && (
                    <span className="text-[11px] font-normal text-gray-400 font-mono">
                      (~{massStats.formattedGrams})
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                  {volumeCm3.toLocaleString('tr-TR')} cm³ × {numDensity} g/cm³ = {
                    massUnit === 'kg'
                      ? massStats.formattedKg
                      : massUnit === 'oz'
                      ? massStats.formattedOz
                      : massUnit === 'lb'
                      ? massStats.formattedLb
                      : massStats.formattedGrams
                  }
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] text-gray-400 block">Dolgu Durumu</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  %100 Katı Masif
                </span>
              </div>
            </div>
          </div>

          {/* 3D Printing Material & Volume Calculator Launcher Banner */}
          {onOpenVolumeTool && (
            <div className="bg-gradient-to-r from-emerald-950/50 to-cyan-950/40 border border-emerald-500/40 p-3 rounded-xl flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-400/30">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
                    <span>Filament & Malzeme Hesaplayıcı</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.2 rounded-full border border-emerald-500/40">
                      Gereksinim
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Dolgu oranına (%10-100) göre filament gramı, boyu ve maliyeti
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVolumeTool();
                }}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 shrink-0 shadow-md shadow-emerald-950/60"
              >
                <span>Hesapla</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Analysis Metrics Export Card (JSON / CSV) */}
          <div className="bg-gray-950/70 p-3.5 rounded-xl border border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/30">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
                  <span>Metrik Raporunu Dışa Aktar</span>
                  <span className="text-[9px] bg-cyan-500/20 text-cyan-300 font-mono px-1.5 py-0.5 rounded-full border border-cyan-500/30">
                    JSON / CSV
                  </span>
                </div>
                <div className="text-[10px] text-gray-400">
                  Hacim, yüzey alanı, kütle ve boyutları belgelendirme için dosya olarak indirin
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleExportMetrics('json')}
                className="flex-1 sm:flex-none py-1.5 px-3 bg-gray-900 hover:bg-cyan-950/70 hover:text-cyan-300 hover:border-cyan-500/50 text-gray-200 border border-gray-700/80 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                title="Hacim, yüzey alanı, kütle ve boyutları JSON dosyası olarak indir"
              >
                {exportedFormat === 'json' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-cyan-300">İndirildi!</span>
                  </>
                ) : (
                  <>
                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                    <span>JSON İndir</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleExportMetrics('csv')}
                className="flex-1 sm:flex-none py-1.5 px-3 bg-gray-900 hover:bg-emerald-950/70 hover:text-emerald-300 hover:border-emerald-500/50 text-gray-200 border border-gray-700/80 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                title="Excel ve elektronik tablolar için CSV olarak indir"
              >
                {exportedFormat === 'csv' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">İndirildi!</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>CSV İndir</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3D Printing Recommendation */}
          <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-xl flex items-start gap-2.5 text-emerald-300">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="text-emerald-200 block">3D Baskı Uyumlu:</strong>
              Üçgen normalleri ve merkezleme başarıyla hesaplandı. Kement aracını kullanarak modeli istediğiniz açıdan kesebilir ve montaj pimleri ekleyebilirsiniz.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-gray-800 bg-gray-950/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">Rapor:</span>
            <button
              type="button"
              onClick={() => handleExportMetrics('json')}
              className="px-2.5 py-1 bg-gray-800/90 hover:bg-cyan-950/70 hover:text-cyan-300 hover:border-cyan-500/50 text-gray-300 border border-gray-700/80 rounded-lg text-[11px] font-mono font-semibold transition flex items-center gap-1 shadow-sm"
              title="JSON dosyası olarak indir"
            >
              {exportedFormat === 'json' ? (
                <Check className="w-3 h-3 text-cyan-400" />
              ) : (
                <Download className="w-3 h-3 text-cyan-400" />
              )}
              <span>{exportedFormat === 'json' ? 'JSON İndirildi' : 'JSON'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportMetrics('csv')}
              className="px-2.5 py-1 bg-gray-800/90 hover:bg-emerald-950/70 hover:text-emerald-300 hover:border-emerald-500/50 text-gray-300 border border-gray-700/80 rounded-lg text-[11px] font-mono font-semibold transition flex items-center gap-1 shadow-sm"
              title="CSV (Excel/Sheets) tablosu olarak indir"
            >
              {exportedFormat === 'csv' ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Download className="w-3 h-3 text-emerald-400" />
              )}
              <span>{exportedFormat === 'csv' ? 'CSV İndirildi' : 'CSV'}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-emerald-900/30"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}
