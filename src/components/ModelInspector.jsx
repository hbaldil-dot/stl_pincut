import React, { useState, useMemo } from 'react';
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
  Check
} from 'lucide-react';
import { calculateModelMass } from '../utils/volumeCalculator';
import { downloadMetricsFile } from '../utils/exportMetrics';

const DENSITY_PRESETS = [
  { id: 'pla', name: 'PLA', density: 1.24, color: '#10b981' },
  { id: 'petg', name: 'PETG', density: 1.27, color: '#06b6d4' },
  { id: 'abs', name: 'ABS', density: 1.04, color: '#f59e0b' },
  { id: 'resin', name: 'Reçine', density: 1.10, color: '#14b8a6' },
  { id: 'tpu', name: 'TPU', density: 1.21, color: '#8b5cf6' },
  { id: 'alu', name: 'Alüminyum', density: 2.70, color: '#94a3b8' },
  { id: 'steel', name: 'Çelik', density: 7.85, color: '#e2e8f0' }
];

export function ModelInspector({
  info,
  isOpen,
  onClose,
  onOpenVolumeTool,
  showBoundingBox = false,
  onToggleBoundingBox
}) {
  const [volumeUnit, setVolumeUnit] = useState('cm3');
  const [surfaceUnit, setSurfaceUnit] = useState('cm2');
  const [density, setDensity] = useState('1.24');
  const [massUnit, setMassUnit] = useState('g'); // 'g' | 'kg' | 'oz' | 'lb'
  const [exportedFormat, setExportedFormat] = useState(null);

  if (!isOpen || !info) return null;

  const handleExportMetrics = (format) => {
    downloadMetricsFile({
      modelName: info.name,
      dimensions: info.dimensions,
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

  const volumeCm3 = info.volumeCm3 ?? 0;
  const volumeMm3 = Math.round(volumeCm3 * 1000);
  const formattedVolume =
    volumeUnit === 'mm3'
      ? `${volumeMm3.toLocaleString('tr-TR')} mm³`
      : `${volumeCm3.toLocaleString('tr-TR')} cm³`;

  const surfaceAreaCm2 = info.surfaceAreaCm2 ?? 0;
  const surfaceAreaMm2 = Math.round(surfaceAreaCm2 * 100);
  const formattedSurfaceArea =
    surfaceUnit === 'mm2'
      ? `${surfaceAreaMm2.toLocaleString('tr-TR')} mm²`
      : `${surfaceAreaCm2.toLocaleString('tr-TR')} cm²`;

  const numDensity = Math.max(0.001, parseFloat(density) || 0);
  const massStats = useMemo(() => {
    return calculateModelMass(volumeCm3, numDensity);
  }, [volumeCm3, numDensity]);

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
                <span className="text-sm font-bold text-red-400 font-mono">{info.dimensions.x} mm</span>
              </div>
              <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                <span className="text-[10px] text-gray-400 block font-mono">Y (Yükseklik)</span>
                <span className="text-sm font-bold text-green-400 font-mono">{info.dimensions.y} mm</span>
              </div>
              <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                <span className="text-[10px] text-gray-400 block font-mono">Z (Derinlik)</span>
                <span className="text-sm font-bold text-blue-400 font-mono">{info.dimensions.z} mm</span>
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

          {/* Mesh Properties */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-800 flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <span className="text-[10px] text-gray-400 block">Üçgen (Yüzey) Sayısı</span>
                <span className="font-bold text-gray-200 font-mono">{info.triangleCount.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-800 flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] text-gray-400 block">Tepe Noktası (Vertex)</span>
                <span className="font-bold text-gray-200 font-mono">{info.vertexCount.toLocaleString()}</span>
              </div>
            </div>

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
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 bg-gray-950/80 p-2.5 rounded-xl border border-gray-800">
                <label className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Malzeme Yoğunluğu (Density):</span>
                </label>

                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="30"
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    className="w-24 bg-gray-900 border border-emerald-500/50 focus:border-emerald-400 rounded-lg px-2.5 py-1 text-right font-mono font-bold text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder="1.24"
                  />
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-gray-900 px-2 py-1 rounded border border-gray-800">
                    g/cm³
                  </span>
                </div>
              </div>

              {/* Quick Material Presets */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold mr-1 shrink-0">Hızlı Seç:</span>
                {DENSITY_PRESETS.map((preset) => {
                  const isCurrent = Math.abs(parseFloat(density) - preset.density) < 0.005;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setDensity(preset.density.toString())}
                      className={`px-2 py-1 rounded-lg text-[10px] font-medium transition flex items-center gap-1 shrink-0 ${
                        isCurrent
                          ? 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-950'
                          : 'bg-gray-900/80 hover:bg-gray-800 text-gray-300 border border-gray-800'
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: preset.color }}
                      />
                      <span>{preset.name}</span>
                      <span className="font-mono text-[9px] opacity-75">({preset.density})</span>
                    </button>
                  );
                })}
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
