import React, { useState } from 'react';
import {
  Activity,
  Gauge,
  Zap,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  TrendingUp,
  Info,
  Maximize2,
  Minimize2,
  ArrowDownLeft,
  ArrowUpLeft,
  Sparkles,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

/**
 * Formats large numbers with commas or K/M abbreviations
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('tr-TR');
}

function formatCompactNumber(num) {
  if (num === null || num === undefined) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Calculates model complexity tier based on triangle count
 */
function getComplexityTier(triangles) {
  if (triangles < 50000) {
    return {
      tier: 'Düşük',
      label: 'Düşük (Optimum)',
      color: 'emerald',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/40',
      progressPercent: Math.max(10, Math.min(25, (triangles / 50000) * 25)),
      description: 'Hızlı dilimleme ve akıcı önizleme.',
      slicerAdvice: 'Tüm FDM ve SLA dilimleyiciler (Cura, PrusaSlicer, Bambu) için son derece hafif ve pürüzsüz geometri.'
    };
  }
  if (triangles <= 250000) {
    return {
      tier: 'Dengeli',
      label: 'Dengeli (İdeal)',
      color: 'sky',
      textColor: 'text-sky-400',
      bgColor: 'bg-sky-500/20',
      borderColor: 'border-sky-500/40',
      progressPercent: Math.max(26, Math.min(50, 25 + ((triangles - 50000) / 200000) * 25)),
      description: 'Optimum detay ve baskı kalitesi dengesi.',
      slicerAdvice: '0.12 - 0.20 mm katman yüksekliğinde kavisler pürüzsüz basılır. Standart dilimleme süresi (~2-4 sn).'
    };
  }
  if (triangles <= 800000) {
    return {
      tier: 'Yüksek',
      label: 'Yüksek Detay',
      color: 'amber',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-500/40',
      progressPercent: Math.max(51, Math.min(75, 50 + ((triangles - 250000) / 550000) * 25)),
      description: 'Yüksek çözünürlüklü organik / tarama mesh.',
      slicerAdvice: 'Yüksek yüzey kalitesi sağlar. Dilimleyicinizde katman hesaplama süresi ve RAM tüketimi bir miktar artabilir.'
    };
  }
  return {
    tier: 'Ultra',
    label: 'Ultra / Ağır',
    color: 'rose',
    textColor: 'text-rose-400',
    bgColor: 'bg-rose-500/20',
    borderColor: 'border-rose-500/40',
    progressPercent: Math.max(76, Math.min(100, 75 + Math.min(25, ((triangles - 800000) / 1200000) * 25))),
    description: 'Aşırı poligon yoğunluğu.',
    slicerAdvice: 'Dilimleyici donmalarına yol açabilir. Dilimleme yavaşsa yazdırmadan önce ağ sadeleştirme (decimation) önerilir.'
  };
}

/**
 * Gets performance quality badge and color
 */
function getFpsStatus(fps) {
  if (fps >= 55) {
    return {
      label: 'Çok Akıcı',
      textColor: 'text-emerald-400',
      dotColor: 'bg-emerald-400',
      glowColor: 'shadow-emerald-500/30'
    };
  }
  if (fps >= 40) {
    return {
      label: 'Akıcı',
      textColor: 'text-cyan-400',
      dotColor: 'bg-cyan-400',
      glowColor: 'shadow-cyan-500/30'
    };
  }
  if (fps >= 25) {
    return {
      label: 'Orta',
      textColor: 'text-amber-400',
      dotColor: 'bg-amber-400',
      glowColor: 'shadow-amber-500/30'
    };
  }
  return {
    label: 'Düşük FPS',
    textColor: 'text-rose-400',
    dotColor: 'bg-rose-400',
    glowColor: 'shadow-rose-500/30'
  };
}

/**
 * Real-time Performance & Model Complexity HUD Overlay
 */
export function PerformanceOverlay({
  visible = true,
  stats,
  onClose,
  initialExpanded = false
}) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [dockPosition, setDockPosition] = useState('top-left'); // 'top-left' | 'bottom-left'

  if (!visible) return null;

  const currentFps = stats?.fps ?? 60;
  const frameTime = stats?.frameTimeMs ?? '16.6';
  const modelTriangles = stats?.modelTriangles ?? 0;
  const renderedTriangles = stats?.renderedTriangles ?? 0;
  const modelVertices = stats?.modelVertices ?? 0;
  const drawCalls = stats?.drawCalls ?? 0;
  const geometries = stats?.geometriesInMemory ?? 0;
  const hasSplit = stats?.hasSplit ?? false;
  const partATriangles = stats?.partATriangles ?? 0;
  const partBTriangles = stats?.partBTriangles ?? 0;
  const pinTriangles = stats?.pinTriangles ?? 0;
  const history = stats?.history && stats.history.length > 0 ? stats.history : [60, 60, 60];
  const minFps = stats?.minFps ?? currentFps;
  const maxFps = stats?.maxFps ?? currentFps;

  const complexity = getComplexityTier(modelTriangles);
  const fpsStatus = getFpsStatus(currentFps);

  // Calculate SVG sparkline points
  const sparklinePoints = (() => {
    if (!history || history.length < 2) return '';
    const width = 160;
    const height = 28;
    const minVal = Math.min(20, Math.min(...history));
    const maxVal = Math.max(65, Math.max(...history));
    const range = maxVal - minVal || 1;

    return history
      .map((val, idx) => {
        const x = (idx / (history.length - 1)) * width;
        const normalized = (val - minVal) / range;
        const y = height - normalized * (height - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  })();

  const positionClass =
    dockPosition === 'bottom-left'
      ? 'bottom-6 left-6'
      : 'top-4 left-4';

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      className={`absolute ${positionClass} z-20 select-none transition-all duration-200 animate-in fade-in`}
    >
      {!isExpanded ? (
        /* ================= COMPACT PILL HUD ================= */
        <div
          onClick={() => setIsExpanded(true)}
          className="group flex items-center gap-2 bg-gray-900/90 hover:bg-gray-900/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-700/80 hover:border-gray-600 shadow-xl cursor-pointer transition-all hover:scale-[1.02]"
          title="Model Karmaşıklığı ve FPS Detaylarını Açmak İçin Tıklayın"
        >
          {/* Status Indicator Dot */}
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${fpsStatus.dotColor}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${fpsStatus.dotColor}`} />
          </span>

          {/* Real-time FPS Metric */}
          <div className="flex items-center gap-1 font-mono text-xs font-bold">
            <Zap className={`w-3 h-3 ${fpsStatus.textColor}`} />
            <span className={fpsStatus.textColor}>{currentFps}</span>
            <span className="text-[10px] text-gray-400 font-sans font-medium">FPS</span>
          </div>

          <div className="w-[1px] h-3 bg-gray-700 mx-0.5" />

          {/* Real-time Triangles Metric */}
          <div className="flex items-center gap-1 font-mono text-xs">
            <span className="text-gray-400 text-[10px]">▲</span>
            <span className="font-bold text-gray-200">{formatCompactNumber(modelTriangles)}</span>
            <span className="text-[10px] text-gray-400 font-sans font-medium">üçgen</span>
          </div>

          {/* Complexity Tier Badge */}
          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${complexity.bgColor} ${complexity.textColor} ${complexity.borderColor}`}>
            {complexity.tier}
          </span>

          {/* Expand Arrow */}
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-200 transition-transform group-hover:translate-y-0.5" />
        </div>
      ) : (
        /* ================= EXPANDED DETAILED HUD ================= */
        <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/90 rounded-2xl shadow-2xl p-4 text-white w-80 sm:w-88 animate-in zoom-in-95 duration-150">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-gray-800 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
                  <span>Model & Render Monitörü</span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[10px] text-gray-400">Gerçek zamanlı kare & poligon telemetrisi</div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1">
              {/* Dock Position Switcher */}
              <button
                onClick={() => setDockPosition(prev => prev === 'top-left' ? 'bottom-left' : 'top-left')}
                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition"
                title={dockPosition === 'top-left' ? 'Alt Köşeye Taşı' : 'Üst Köşeye Taşı'}
              >
                {dockPosition === 'top-left' ? (
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                ) : (
                  <ArrowUpLeft className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Minimize to Pill */}
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition"
                title="Kompakt Moda Küçült"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>

              {/* Close Overlay */}
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1 text-gray-400 hover:text-rose-400 hover:bg-gray-800 rounded-lg transition"
                  title="Monitörü Kapat"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Section 1: Real-time FPS & Latency */}
          <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black font-mono tracking-tight ${fpsStatus.textColor}`}>
                  {currentFps}
                </span>
                <span className="text-xs font-bold text-gray-400">FPS</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-1 ${fpsStatus.textColor} bg-gray-800/80 border border-gray-700`}>
                  {fpsStatus.label}
                </span>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-mono font-semibold text-gray-300">
                  {frameTime} <span className="text-[10px] text-gray-400">ms</span>
                </div>
                <div className="text-[9px] text-gray-400">Kare Gecikmesi</div>
              </div>
            </div>

            {/* Sparkline Graph */}
            <div className="relative pt-1">
              <div className="flex items-center justify-between text-[9px] text-gray-400 mb-1 font-mono">
                <span>FPS Grafiği (Son 24 kare)</span>
                <span>Min: {minFps} • Maks: {maxFps}</span>
              </div>
              <div className="h-7 w-full bg-gray-900/80 rounded-lg border border-gray-800/80 px-1 py-0.5 flex items-center justify-center overflow-hidden">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 160 28" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="fpsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {sparklinePoints && (
                    <>
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={sparklinePoints}
                      />
                    </>
                  )}
                </svg>
              </div>
            </div>
          </div>

          {/* Section 2: Real-time Triangle & Polygon Metrics */}
          <div className="space-y-2 mb-3">
            <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-gray-300 font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Model Üçgen Sayısı:</span>
                </span>
                <span className="text-sm font-bold font-mono text-cyan-300">
                  {formatNumber(modelTriangles)} <span className="text-[10px] text-gray-400 font-sans">▲</span>
                </span>
              </div>

              {/* Sliced Model Part Breakdown */}
              {hasSplit && (
                <div className="mt-2 pt-2 border-t border-gray-800/80 grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="bg-cyan-950/30 border border-cyan-900/40 p-1.5 rounded-lg">
                    <span className="text-gray-400 block">Parça A:</span>
                    <span className="font-mono font-bold text-cyan-300">{formatNumber(partATriangles)} ▲</span>
                  </div>
                  <div className="bg-emerald-950/30 border border-emerald-900/40 p-1.5 rounded-lg">
                    <span className="text-gray-400 block">Parça B:</span>
                    <span className="font-mono font-bold text-emerald-300">{formatNumber(partBTriangles)} ▲</span>
                  </div>
                  {pinTriangles > 0 && (
                    <div className="col-span-2 bg-amber-950/30 border border-amber-900/40 p-1.5 rounded-lg flex items-center justify-between">
                      <span className="text-gray-400">Bağlantı Pimi (Dowel):</span>
                      <span className="font-mono font-bold text-amber-300">{formatNumber(pinTriangles)} ▲</span>
                    </div>
                  )}
                </div>
              )}

              {/* Secondary Details: Vertices & GPU Render Triangles */}
              <div className="mt-2 pt-2 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-400">
                <span>Toplam Köşe (Vertex): <strong className="text-gray-200 font-mono">{formatNumber(modelVertices)}</strong></span>
                <span>GPU Render: <strong className="text-gray-200 font-mono">{formatCompactNumber(renderedTriangles)} ▲</strong></span>
              </div>
            </div>
          </div>

          {/* Section 3: Model Complexity & Slicer Suitability Rating */}
          <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800 mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-gray-300 font-semibold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>3D Dilimleyici Karmaşıklığı:</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${complexity.bgColor} ${complexity.textColor} ${complexity.borderColor}`}>
                {complexity.label}
              </span>
            </div>

            {/* Complexity Progress Bar */}
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden my-2 flex">
              <div
                className={`h-full transition-all duration-300 ${
                  complexity.color === 'emerald'
                    ? 'bg-emerald-400'
                    : complexity.color === 'sky'
                    ? 'bg-sky-400'
                    : complexity.color === 'amber'
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${complexity.progressPercent}%` }}
              />
            </div>

            {/* Slicer Guidance & Advice Note */}
            <div className="flex items-start gap-1.5 text-[10px] text-gray-400 bg-gray-900/90 p-2 rounded-lg border border-gray-800/80 mt-2">
              <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
              <span>{complexity.slicerAdvice}</span>
            </div>
          </div>

          {/* Section 4: WebGL Engine Telemetry */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-gray-950/40 p-2 rounded-lg border border-gray-800 flex items-center justify-between">
              <span className="text-gray-400">Çizim Çağrısı:</span>
              <span className="font-mono font-bold text-gray-200">{drawCalls} calls</span>
            </div>
            <div className="bg-gray-950/40 p-2 rounded-lg border border-gray-800 flex items-center justify-between">
              <span className="text-gray-400">Geometri Buffer:</span>
              <span className="font-mono font-bold text-gray-200">{geometries} adet</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
