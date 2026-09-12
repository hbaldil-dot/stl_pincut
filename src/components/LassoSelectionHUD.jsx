import React from 'react';
import {
  PenTool,
  Trash2,
  CheckCircle2,
  Maximize2,
  Eye,
  EyeOff,
  RotateCcw,
  Scissors,
  Layers,
  Sparkles,
  HelpCircle,
  Sliders,
  Plus,
  Minus,
  Replace
} from 'lucide-react';
import { useUnit } from '../context/UnitContext.jsx';

/**
 * Floating Interactive HUD for Raycaster-based Lasso Selection
 */
export function LassoSelectionHUD({
  visible = true,
  selectedFacesCount = 0,
  selectedVerticesCount = 0,
  totalFacesCount = 0,
  surfaceArea = 0,
  isDrawing = true,
  isLoopClosed = false,
  drawnPointsCount = 0,
  frontFacingOnly = true,
  selectionMode = 'replace', // 'replace' | 'add' | 'subtract'
  onToggleDrawing,
  onClearDrawing,
  onClearSelection,
  onInvertSelection,
  onSelectAll,
  onDeleteSelectedFaces,
  onToggleFrontFacing,
  onChangeSelectionMode,
  onAlignPlaneToSelection,
  onCloseLoop,
  onExecuteLassoSplit
}) {
  const { unit, isImperial } = useUnit();

  if (!visible) return null;

  const percentage =
    totalFacesCount > 0
      ? ((selectedFacesCount / totalFacesCount) * 100).toFixed(1)
      : '0';

  // Area formatting based on current unit
  const formattedArea = isImperial
    ? `${(surfaceArea / 645.16).toFixed(2)} in²`
    : `${surfaceArea.toFixed(1)} mm²`;

  return (
    <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 max-w-sm pointer-events-auto select-none">
      {/* Main Glassmorphic Card */}
      <div className="bg-gray-900/90 backdrop-blur-md border border-gray-700/80 rounded-2xl p-3.5 shadow-2xl text-gray-100 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-wide flex items-center gap-1.5">
                <span>Kement Yüzey Seçimi</span>
                <span className="text-[10px] font-normal text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800/60">
                  Raycaster
                </span>
              </h3>
              <p className="text-[10px] text-gray-400">
                Tuvalde çizimle köşe & üçgen yüzey seçimi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onToggleFrontFacing}
              className={`p-1.5 rounded-lg border text-xs transition flex items-center gap-1 ${
                frontFacingOnly
                  ? 'bg-blue-600/30 border-blue-500/50 text-blue-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
              title={
                frontFacingOnly
                  ? 'Yalnızca kameraya bakan yüzeyler seçiliyor'
                  : 'Tüm yüzeyler (arkadakiler dahil) seçiliyor'
              }
            >
              {frontFacingOnly ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="text-[10px] hidden sm:inline">
                {frontFacingOnly ? 'Ön Yüz' : 'Tümü'}
              </span>
            </button>
          </div>
        </div>

        {/* Real-time Metric Indicators */}
        <div className="grid grid-cols-3 gap-2 bg-gray-950/60 p-2.5 rounded-xl border border-gray-800/80">
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-400 uppercase font-semibold">Seçili Yüzey</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-bold text-amber-400 font-mono">
                {selectedFacesCount.toLocaleString()}
              </span>
              <span className="text-[9px] text-gray-500 font-mono">
                %{percentage}
              </span>
            </div>
          </div>

          <div className="flex flex-col border-l border-gray-800 pl-2">
            <span className="text-[9px] text-gray-400 uppercase font-semibold">Kesişen Köşe</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-bold text-cyan-400 font-mono">
                {selectedVerticesCount.toLocaleString()}
              </span>
              <span className="text-[9px] text-gray-500">v</span>
            </div>
          </div>

          <div className="flex flex-col border-l border-gray-800 pl-2">
            <span className="text-[9px] text-gray-400 uppercase font-semibold">Yüzey Alanı</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xs font-bold text-emerald-400 font-mono truncate">
                {formattedArea}
              </span>
            </div>
          </div>
        </div>

        {/* Selection Mode Selector: Replace / Add / Subtract */}
        <div className="flex items-center gap-1 bg-gray-950/80 p-1 rounded-lg border border-gray-800">
          <span className="text-[9px] text-gray-400 font-medium px-1.5">Mod:</span>
          {[
            { id: 'replace', label: 'Yeni', icon: Replace },
            { id: 'add', label: 'Ekle', icon: Plus },
            { id: 'subtract', label: 'Çıkar', icon: Minus }
          ].map((m) => {
            const Icon = m.icon;
            const active = selectionMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onChangeSelectionMode && onChangeSelectionMode(m.id)}
                className={`flex-1 py-1 px-1.5 rounded text-[10px] font-semibold flex items-center justify-center gap-1 transition ${
                  active
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                <Icon className="w-2.5 h-2.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Action Button Strip */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedFacesCount > 0 ? (
            <>
              <button
                onClick={onClearSelection}
                className="flex-1 py-1.5 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1 border border-gray-700"
                title="Yüzey seçimini temizle"
              >
                <RotateCcw className="w-3 h-3 text-gray-400" />
                <span>Temizle</span>
              </button>

              <button
                onClick={onInvertSelection}
                className="flex-1 py-1.5 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1 border border-gray-700"
                title="Seçimi tersine çevir"
              >
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>Tersine Çevir</span>
              </button>

              <button
                onClick={onDeleteSelectedFaces}
                className="py-1.5 px-2.5 bg-red-950/60 hover:bg-red-900/60 text-red-300 rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1 border border-red-800/60"
                title="Seçili yüzeyleri modelden sil"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
                <span>Yüzeyleri Sil</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onSelectAll}
                className="flex-1 py-1.5 px-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1.5 border border-gray-700"
              >
                <Maximize2 className="w-3 h-3 text-blue-400" />
                <span>Tüm Modeli Seç</span>
              </button>

              {drawnPointsCount > 0 && (
                <button
                  onClick={onClearDrawing}
                  className="py-1.5 px-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1.5 border border-gray-700"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                  <span>Çizimi Sıfırla</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Alignment / Split Quick-Action */}
        {selectedFacesCount > 0 && onAlignPlaneToSelection && (
          <button
            onClick={onAlignPlaneToSelection}
            className="w-full py-1.5 px-2.5 bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1.5 border border-cyan-700/60 shadow"
          >
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span>Kesim Düzlemini & Pimi Seçime Hizala</span>
          </button>
        )}

        {/* Micro User Tip */}
        <div className="text-[10px] text-gray-400 flex items-start gap-1.5 bg-gray-950/40 p-2 rounded-lg border border-gray-800/60">
          <HelpCircle className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
          <span>
            Model üzerinde farenizi sürükleyerek kement çizin. Kamera açısını değiştirmek için <strong>Shift</strong> tuşunu basılı tutun.
          </span>
        </div>
      </div>
    </div>
  );
}

export default LassoSelectionHUD;
