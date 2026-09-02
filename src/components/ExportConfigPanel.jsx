import React from 'react';
import {
  Sliders,
  FileCode,
  Binary,
  Layers,
  Sparkles,
  Gauge,
  Info,
  CheckCircle2,
  RotateCcw,
  Zap,
  TrendingDown,
  Cpu
} from 'lucide-react';
import { formatBytes } from '../utils/stlExporter';

/**
 * STL Export Precision and Format Configuration Panel.
 * Allows users to choose mesh density (decimation), binary vs ASCII format,
 * and decimal precision with live triangle & file size impact previews.
 */
export function ExportConfigPanel({
  config = {
    format: 'binary',
    density: 1.0,
    preset: 'original',
    decimalPrecision: 4
  },
  onChangeConfig,
  statsA = null,
  statsB = null,
  totalTriangles = 0,
  compact = false
}) {
  const format = config.format || 'binary';
  const density = typeof config.density === 'number' ? config.density : 1.0;
  const preset = config.preset || 'original';
  const decimalPrecision = config.decimalPrecision || 4;

  const densityPresets = [
    {
      id: 'original',
      ratio: 1.0,
      label: 'Maksimum',
      badge: '100%',
      desc: 'Orijinal CAD detayı'
    },
    {
      id: 'high',
      ratio: 0.75,
      label: 'Yüksek',
      badge: '75%',
      desc: 'Hassas tolerans'
    },
    {
      id: 'medium',
      ratio: 0.5,
      label: 'Dengeli',
      badge: '50%',
      desc: 'Slicer optimize'
    },
    {
      id: 'draft',
      ratio: 0.25,
      label: 'Taslak',
      badge: '25%',
      desc: 'Hafif & hızlı'
    }
  ];

  const handleSelectPreset = (p) => {
    onChangeConfig({
      ...config,
      preset: p.id,
      density: p.ratio
    });
  };

  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    let matchedPreset = 'custom';
    if (Math.abs(val - 1.0) < 0.01) matchedPreset = 'original';
    else if (Math.abs(val - 0.75) < 0.01) matchedPreset = 'high';
    else if (Math.abs(val - 0.5) < 0.01) matchedPreset = 'medium';
    else if (Math.abs(val - 0.25) < 0.01) matchedPreset = 'draft';

    onChangeConfig({
      ...config,
      density: val,
      preset: matchedPreset
    });
  };

  const handleToggleFormat = (newFormat) => {
    onChangeConfig({
      ...config,
      format: newFormat
    });
  };

  const handleDecimalPrecisionChange = (prec) => {
    onChangeConfig({
      ...config,
      decimalPrecision: prec
    });
  };

  const handleResetDefaults = () => {
    onChangeConfig({
      format: 'binary',
      density: 1.0,
      preset: 'original',
      decimalPrecision: 4
    });
  };

  // Calculations for live preview
  const originalTrianglesCount = totalTriangles || (
    ((statsA?.triangles || 0) + (statsB?.triangles || 0))
  );

  const projectedTrianglesCount = density >= 0.98
    ? originalTrianglesCount
    : Math.max(12, Math.round(originalTrianglesCount * density));

  const savingsPct = originalTrianglesCount > 0
    ? Math.max(0, Math.round((1 - projectedTrianglesCount / originalTrianglesCount) * 100))
    : 0;

  // File size estimates
  const estOriginalBytes = format === 'binary'
    ? 84 + originalTrianglesCount * 50
    : 100 + originalTrianglesCount * 180;

  const estProjectedBytes = format === 'binary'
    ? 84 + projectedTrianglesCount * 50
    : 100 + projectedTrianglesCount * 180;

  return (
    <div className={`bg-gray-950/80 border border-gray-800 rounded-2xl ${compact ? 'p-3' : 'p-4'} space-y-3.5 shadow-xl`}>
      {/* Header with Title & Reset button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-lg text-emerald-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-200 flex items-center gap-2">
              <span>STL Dışa Aktarma Yapılandırması</span>
              {density < 0.98 && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.2 rounded-full">
                  -%{savingsPct}
                </span>
              )}
            </h3>
            {!compact && (
              <p className="text-[11px] text-gray-400">
                Ağ yoğunluğu (poligon çözünürlüğü) ve dosya formatını ayarlayın
              </p>
            )}
          </div>
        </div>

        {(format !== 'binary' || density < 0.98) && (
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[11px] text-gray-400 hover:text-emerald-300 flex items-center gap-1 transition px-2 py-1 rounded-lg hover:bg-gray-800/60"
            title="Standart ayarlara dön (%100 Binary)"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Sıfırla</span>
          </button>
        )}
      </div>

      {/* 1. Format Selection (Binary vs ASCII) */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-gray-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Binary className="w-3.5 h-3.5 text-cyan-400" />
            <span>Çıktı Formatı</span>
          </span>
          <span className="text-[10px] text-gray-400 font-normal">
            {format === 'binary' ? '50 bayt / üçgen' : '~180 bayt / üçgen'}
          </span>
        </label>

        <div className="grid grid-cols-2 gap-2">
          {/* Binary Card */}
          <button
            type="button"
            onClick={() => handleToggleFormat('binary')}
            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
              format === 'binary'
                ? 'bg-gradient-to-br from-emerald-950/60 via-gray-900 to-gray-950 border-emerald-500/60 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 text-gray-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                <Binary className="w-3.5 h-3.5" />
                Binary STL
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold">
                Önerilen
              </span>
            </div>
            <p className="text-[10px] text-gray-400 line-clamp-2">
              Kompakt ikili veri. Tüm 3D dilimleyiciler (Cura, Bambu, Prusa) için hızlı ve hafif.
            </p>
          </button>

          {/* ASCII Card */}
          <button
            type="button"
            onClick={() => handleToggleFormat('ascii')}
            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
              format === 'ascii'
                ? 'bg-gradient-to-br from-cyan-950/60 via-gray-900 to-gray-950 border-cyan-500/60 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/30'
                : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 text-gray-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold flex items-center gap-1.5 text-cyan-400">
                <FileCode className="w-3.5 h-3.5" />
                ASCII STL
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
                Düz Metin
              </span>
            </div>
            <p className="text-[10px] text-gray-400 line-clamp-2">
              İnsan tarafından okunabilir metin. CAD doğrulama ve script entegrasyonu için.
            </p>
          </button>
        </div>

        {/* ASCII Decimal Precision Sub-selector */}
        {format === 'ascii' && (
          <div className="bg-gray-900/70 border border-gray-800/80 rounded-xl p-2.5 flex items-center justify-between animate-in fade-in duration-200">
            <span className="text-[11px] text-gray-300 font-medium flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ondalık Hassasiyet:</span>
            </span>
            <div className="flex items-center gap-1">
              {[
                { prec: 6, label: '6 hane' },
                { prec: 4, label: '4 hane' },
                { prec: 3, label: '3 hane' },
                { prec: 2, label: '2 hane' }
              ].map(({ prec, label }) => (
                <button
                  key={prec}
                  type="button"
                  onClick={() => handleDecimalPrecisionChange(prec)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition ${
                    decimalPrecision === prec
                      ? 'bg-cyan-600 text-white border-cyan-500 font-bold shadow'
                      : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Precision & Mesh Density Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ağ Hassasiyeti (Mesh Density):</span>
          </label>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-gray-900 border border-emerald-900/60 px-2 py-0.5 rounded-lg">
            %{Math.round(density * 100)}
          </span>
        </div>

        {/* Preset Buttons */}
        <div className="grid grid-cols-4 gap-1.5">
          {densityPresets.map((p) => {
            const isSelected = preset === p.id && Math.abs(density - p.ratio) < 0.02;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`py-1.5 px-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-emerald-600 border-emerald-400 text-white font-bold shadow-md shadow-emerald-950/50'
                    : 'bg-gray-900/60 border-gray-800 text-gray-300 hover:bg-gray-800 hover:border-gray-700'
                }`}
              >
                <span className="text-xs">{p.label}</span>
                <span className={`text-[10px] font-mono ${isSelected ? 'text-emerald-100' : 'text-gray-400'}`}>
                  {p.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Continuous Slider for Custom Density */}
        <div className="pt-1">
          <div className="flex justify-between text-[10px] text-gray-400 font-mono mb-1">
            <span>Düşük Poligon (%10)</span>
            <span>Orijinal CAD (%100)</span>
          </div>
          <input
            type="range"
            min="0.10"
            max="1.0"
            step="0.05"
            value={density}
            onChange={handleSliderChange}
            className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>

      {/* 3. Live Statistics & File Size Comparison Card */}
      {originalTrianglesCount > 0 && (
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border border-gray-800 rounded-xl p-3 space-y-2">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Gauge className="w-3 h-3 text-cyan-400" />
              Tahmini Dışa Aktarma Etkisi
            </span>
            {savingsPct > 0 && (
              <span className="text-emerald-400 flex items-center gap-1 normal-case font-medium">
                <TrendingDown className="w-3 h-3" />
                %{savingsPct} Poligon Tasarrufu
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Triangles projection */}
            <div className="bg-gray-950/80 border border-gray-800/80 rounded-lg p-2 font-mono">
              <span className="text-[10px] text-gray-400 block">Üçgen Sayısı</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-gray-200 font-bold">
                  {projectedTrianglesCount.toLocaleString()}
                </span>
                {density < 0.98 && (
                  <span className="text-[10px] text-gray-500 line-through">
                    {originalTrianglesCount.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* File size projection */}
            <div className="bg-gray-950/80 border border-gray-800/80 rounded-lg p-2 font-mono">
              <span className="text-[10px] text-gray-400 block">Tahmini Toplam Boyut</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-emerald-400 font-bold">
                  {formatBytes(estProjectedBytes)}
                </span>
                {density < 0.98 && (
                  <span className="text-[10px] text-gray-500 line-through">
                    {formatBytes(estOriginalBytes)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
