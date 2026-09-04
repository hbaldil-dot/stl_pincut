import React from 'react';
import { Scale, X } from 'lucide-react';
import { VolumeMaterialTool } from './VolumeMaterialTool';

export function VolumeMaterialModal({
  isOpen,
  onClose,
  model,
  modelInfo,
  splitResult,
  showBoundingBox = false,
  onToggleBoundingBox
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700/90 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>STL Hacim & 3D Baskı Malzeme Hesaplayıcı</span>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.2 rounded-full">
                  cm³ / mm³
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                Model hacmi, filament ağırlığı, uzunluğu ve baskı maliyeti tahmini
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white bg-gray-800/60 hover:bg-gray-800 rounded-lg border border-gray-700/60 transition"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(92vh-75px)]">
          <VolumeMaterialTool
            model={model}
            modelInfo={modelInfo}
            splitResult={splitResult}
            onClose={onClose}
            isModal={true}
            showBoundingBox={showBoundingBox}
            onToggleBoundingBox={onToggleBoundingBox}
          />
        </div>
      </div>
    </div>
  );
}
