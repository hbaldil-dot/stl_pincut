import React, { useState } from 'react';
import {
  Flame,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Compass,
  ArrowUp,
  Sparkles,
  Info
} from 'lucide-react';

export function OverhangLegendOverlay({
  enabled = false,
  onClose,
  stats,
  thresholdDeg = 45,
  warnRangeDeg = 10,
  mode = 0, // 0: Thermal, 1: Highlight, 2: Zebra
  onChangeMode,
  printDirectionName = '+Y (Varsayılan Üst)',
  showBuildPlate = true,
  onToggleBuildPlate,
  onOpenOverhangTab
}) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!enabled) return null;

  const warnDeg = Math.max(5, thresholdDeg - warnRangeDeg);
  const supportPercent = stats ? stats.supportPercent.toFixed(1) : '0.0';
  const supportCm2 = stats ? stats.supportAreaCm2.toFixed(1) : '0.0';
  const difficulty = stats?.difficulty || 'Hesaplanıyor';
  const difficultyColor = stats?.difficultyColor || 'text-emerald-400';

  return (
    <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2 max-w-xs select-none">
      <div className="bg-gray-900/90 backdrop-blur-md rounded-2xl border border-gray-700/80 shadow-2xl p-3 text-white transition-all">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
                <span>Overhang Isı Haritası</span>
                <span className="text-[10px] bg-red-500/30 text-red-300 font-mono px-1.5 py-0.2 rounded-full border border-red-500/40">
                  {thresholdDeg}°
                </span>
              </div>
              <div className="text-[10px] text-gray-400 truncate max-w-[140px]">
                {printDirectionName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition"
              title={isMinimized ? 'Genişlet' : 'Küçült'}
            >
              {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-md text-gray-400 hover:text-red-400 hover:bg-gray-800 transition"
                title="Isı Haritasını Kapat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Color Gradient Legend Bar */}
            <div className="flex flex-col gap-1 mb-3">
              <div className="h-3 w-full rounded-md shadow-inner relative overflow-hidden"
                style={{
                  background:
                    mode === 1
                      ? 'linear-gradient(to right, #2dafa5 0%, #2dafa5 55%, #f59e0b 70%, #ef4444 85%, #d946ef 100%)'
                      : mode === 2
                      ? 'linear-gradient(to right, #10b981 0%, #10b981 55%, #f59e0b 70%, #ef4444 80%, #1e1b4b 100%)'
                      : 'linear-gradient(to right, #10b981 0%, #84cc16 40%, #f59e0b 65%, #ef4444 82%, #d946ef 100%)'
                }}
              >
                {/* Marker for Threshold */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md z-10"
                  style={{ left: '75%' }}
                  title={`Kritik Eşik: ${thresholdDeg}°`}
                />
              </div>

              {/* Labels */}
              <div className="flex justify-between text-[9px] text-gray-400 font-mono">
                <span className="text-emerald-400 font-semibold">0° Güvenli</span>
                <span className="text-amber-400">{warnDeg}° Uyarı</span>
                <span className="text-red-400 font-semibold">{thresholdDeg}° Destek</span>
                <span className="text-purple-400">90° Tavan</span>
              </div>
            </div>

            {/* Quick Live Stats Pill Card */}
            <div className="bg-gray-950/60 rounded-xl p-2.5 border border-gray-800/80 flex flex-col gap-2 mb-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400">Destek Alanı Oranı:</span>
                <span className="text-xs font-bold font-mono text-red-400">
                  %{supportPercent} ({supportCm2} cm²)
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${stats ? stats.safePercent : 100}%` }}
                  title="Güvenli Yüzey"
                />
                <div
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{ width: `${stats ? stats.warnPercent : 0}%` }}
                  title="Uyarı / Eşiğe Yakın"
                />
                <div
                  className="bg-red-500 h-full transition-all duration-300"
                  style={{ width: `${stats ? stats.supportPercent : 0}%` }}
                  title="Kritik Destek Gerektiren Alan"
                />
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400">Baskı Zorluğu:</span>
                <span className={`font-bold ${difficultyColor}`}>{difficulty}</span>
              </div>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-gray-950/80 p-1 rounded-xl border border-gray-800 text-[10px] mb-2">
              <button
                onClick={() => onChangeMode && onChangeMode(0)}
                className={`py-1 px-1.5 rounded-lg font-medium transition text-center ${
                  mode === 0 ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Termal Isı Haritası Gradyanı"
              >
                Termal
              </button>
              <button
                onClick={() => onChangeMode && onChangeMode(1)}
                className={`py-1 px-1.5 rounded-lg font-medium transition text-center ${
                  mode === 1 ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Yalnızca Kritik Destekleri Vurgula"
              >
                Vurgu
              </button>
              <button
                onClick={() => onChangeMode && onChangeMode(2)}
                className={`py-1 px-1.5 rounded-lg font-medium transition text-center ${
                  mode === 2 ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Zebra Çizgili Slicer Görünümü"
              >
                Zebra
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-1 border-t border-gray-800/80 text-[10px]">
              <button
                onClick={onToggleBuildPlate}
                className={`px-2 py-1 rounded-lg border transition flex items-center gap-1 ${
                  showBuildPlate
                    ? 'bg-cyan-950/50 text-cyan-300 border-cyan-800/60'
                    : 'bg-gray-800/50 text-gray-400 border-gray-700/60 hover:text-gray-200'
                }`}
              >
                <ArrowUp className="w-3 h-3" />
                <span>3D Tabla {showBuildPlate ? 'Açık' : 'Kapalı'}</span>
              </button>

              {onOpenOverhangTab && (
                <button
                  onClick={onOpenOverhangTab}
                  className="px-2 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-lg border border-red-500/40 transition flex items-center gap-1 font-semibold"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Detaylı Ayarlar</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
