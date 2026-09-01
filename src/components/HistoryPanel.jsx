import React from 'react';
import {
  History,
  Scissors,
  Ruler,
  Sparkles,
  PenTool,
  Sliders,
  RotateCcw,
  RotateCw,
  X,
  Clock,
  ArrowLeftRight,
  CheckCircle2,
  Trash2,
  Undo2,
  Redo2,
  Layers,
  CircleDot
} from 'lucide-react';

export function HistoryPanel({
  isOpen,
  onClose,
  history,
  currentIndex,
  onJumpToHistory,
  onUndo,
  onRedo,
  onClearHistory,
  canUndo,
  canRedo
}) {
  if (!isOpen) return null;

  const getActionIcon = (type) => {
    switch (type) {
      case 'CUT_PLANE':
      case 'CUT_LASSO':
      case 'RESET_SPLIT':
        return <Scissors className="w-3.5 h-3.5 text-blue-400" />;
      case 'PIN_CONFIG':
      case 'PIN_PLACEMENT':
        return <Sparkles className="w-3.5 h-3.5 text-orange-400" />;
      case 'MEASURE_POINT_A':
      case 'MEASURE_POINT_B':
      case 'MEASURE_CLEAR':
      case 'MEASURE_TOGGLE':
        return <Ruler className="w-3.5 h-3.5 text-cyan-400" />;
      case 'LASSO_DRAW':
      case 'LASSO_CLOSE':
      case 'LASSO_CLEAR':
      case 'LASSO_UNDO':
        return <PenTool className="w-3.5 h-3.5 text-emerald-400" />;
      case 'MODEL_ROTATE':
      case 'MODEL_ALIGN':
        return <RotateCw className="w-3.5 h-3.5 text-amber-400" />;
      case 'CLIPPING_CONFIG':
        return <Sliders className="w-3.5 h-3.5 text-purple-400" />;
      case 'MODEL_LOAD':
        return <Layers className="w-3.5 h-3.5 text-emerald-300" />;
      default:
        return <History className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-gray-900/98 backdrop-blur-2xl border-l border-gray-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 bg-gray-950/80 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>İşlem Geçmişi (Undo/Redo)</span>
              <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800/60 px-2 py-0.5 rounded-full font-mono">
                {history.length} Adım
              </span>
            </h2>
            <p className="text-[11px] text-gray-400">Geri al, yinele veya geçmiş bir adıma atla</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white bg-gray-800/60 hover:bg-gray-800 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Controls Bar */}
      <div className="p-3 bg-gray-950/40 border-b border-gray-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
              canUndo
                ? 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border-blue-500/40'
                : 'bg-gray-800/40 text-gray-600 border-gray-850 cursor-not-allowed'
            }`}
            title="Geri Al (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Geri Al</span>
            <span className="text-[9px] opacity-60 font-mono">Ctrl+Z</span>
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
              canRedo
                ? 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border-emerald-500/40'
                : 'bg-gray-800/40 text-gray-600 border-gray-850 cursor-not-allowed'
            }`}
            title="Yinele (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span>Yinele</span>
            <span className="text-[9px] opacity-60 font-mono">Ctrl+Y</span>
          </button>
        </div>

        {history.length > 1 && (
          <button
            onClick={onClearHistory}
            className="p-1.5 text-gray-500 hover:text-red-400 bg-gray-850 hover:bg-gray-800 rounded-lg text-xs border border-gray-800 transition"
            title="Geçmişi Temizle"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* History Timeline List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-transparent">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
            <History className="w-10 h-10 mb-2 opacity-30 text-gray-400" />
            <p className="text-xs">Henüz bir işlem kaydedilmedi.</p>
          </div>
        ) : (
          history.map((item, index) => {
            const isCurrent = index === currentIndex;
            const isFuture = index > currentIndex;
            const isPast = index < currentIndex;

            return (
              <div
                key={item.id || index}
                onClick={() => onJumpToHistory(index)}
                className={`group relative p-2.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                  isCurrent
                    ? 'bg-gradient-to-r from-blue-950/80 to-indigo-950/70 border-blue-500/60 shadow-lg shadow-blue-950/50'
                    : isFuture
                    ? 'bg-gray-950/30 border-gray-850 text-gray-500 hover:bg-gray-850/50 hover:text-gray-300'
                    : 'bg-gray-900/60 border-gray-800 text-gray-300 hover:bg-gray-850 hover:border-gray-700'
                }`}
              >
                {/* Timeline connector dot */}
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg border mt-0.5 shrink-0 ${
                      isCurrent
                        ? 'bg-blue-500/20 border-blue-400/50 text-blue-400'
                        : isFuture
                        ? 'bg-gray-850 border-gray-700/50 text-gray-600'
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}
                  >
                    {getActionIcon(item.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-gray-500">#{index + 1}</span>
                      <span
                        className={`text-xs font-semibold truncate ${
                          isCurrent
                            ? 'text-blue-200 font-bold'
                            : isFuture
                            ? 'text-gray-500 line-through'
                            : 'text-gray-200'
                        }`}
                      >
                        {item.description}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(item.timestamp)}
                      </span>
                      {isCurrent && (
                        <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-sans font-bold">
                          Şu anki Durum
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                {isCurrent && (
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 self-center" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-gray-950/80 border-t border-gray-800 text-[11px] text-gray-400 flex items-center justify-between">
        <span className="font-mono text-[10px]">
          Konum: {currentIndex + 1} / {history.length}
        </span>
        <span className="text-gray-500">Kısayol: Ctrl+Z / Ctrl+Y</span>
      </div>
    </div>
  );
}
