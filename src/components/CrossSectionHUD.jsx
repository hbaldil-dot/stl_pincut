import React, { useState } from 'react';
import {
  Scissors,
  Eye,
  EyeOff,
  X,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  Sun,
  Layers,
  ChevronDown,
  ChevronUp,
  Sliders,
  HelpCircle
} from 'lucide-react';

/**
 * Floating Cross-Section & Internal Geometry Inspection HUD Overlay
 * Enables real-time slicing and inspection of model internal cavities,
 * with quick toggling of the hidden plane guide.
 */
export function CrossSectionHUD({
  isOpen,
  onClose,
  clippingConfig,
  onClippingConfigChange,
  modelInfo,
  onResetOffset
}) {
  const [showAdvancedAngles, setShowAdvancedAngles] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  if (!isOpen) return null;

  const isPlaneHidden = clippingConfig?.showPlaneHelper === false;
  const isInteriorHighlighted = clippingConfig?.highlightInterior !== false;
  const currentAxis = clippingConfig?.axis || 'y';
  const currentOffset = clippingConfig?.offset || 0;

  // Compute reasonable offset min/max based on model dimensions
  const dims = modelInfo?.dimensions || { x: 50, y: 50, z: 50 };
  let axisDim = 50;
  if (currentAxis === 'x') axisDim = dims.x || 50;
  else if (currentAxis === 'y') axisDim = dims.y || 50;
  else if (currentAxis === 'z') axisDim = dims.z || 50;

  const maxOffset = Math.ceil(axisDim * 0.75);
  const minOffset = -maxOffset;

  const interiorColors = [
    { id: '#f59e0b', name: 'Altın Kehribar', bgClass: 'bg-amber-500' },
    { id: '#06b6d4', name: 'Siyanür Mavi', bgClass: 'bg-cyan-500' },
    { id: '#ec4899', name: 'Fuşya Pembe', bgClass: 'bg-pink-500' },
    { id: '#10b981', name: 'Zümrüt Yeşil', bgClass: 'bg-emerald-500' },
    { id: '#f97316', name: 'Alev Turuncu', bgClass: 'bg-orange-500' }
  ];

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      className="absolute top-16 left-4 z-20 bg-gray-900/95 border border-sky-500/50 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl w-84 sm:w-92 max-w-[calc(100vw-2rem)] animate-in slide-in-from-top-2 duration-200 select-none text-xs"
    >
      {/* HUD Header */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-2.5 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-sky-500/20 text-sky-300 rounded-lg border border-sky-400/30">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-white text-xs">
              <span>Kesit & İç Geometri İnceleme</span>
              <span className="text-[10px] bg-sky-950 text-sky-300 px-1.5 py-0.2 rounded font-mono border border-sky-500/40">
                Canlı Kesit
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Model iç oyuklarını ve et kalınlığını inceleyin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHelp((prev) => !prev)}
            className={`p-1 rounded-lg transition ${
              showHelp ? 'bg-sky-900/60 text-sky-300' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
            title="Kullanım İpuçları"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition"
            title="Paneli Kapat"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Help Banner */}
      {showHelp && (
        <div className="bg-sky-950/60 border border-sky-500/40 rounded-xl p-2.5 mb-2.5 text-[11px] text-sky-200 space-y-1 animate-fade-in">
          <div className="font-bold flex items-center gap-1 text-sky-100">
            <Sparkles className="w-3 h-3 text-sky-300" />
            <span>Kesit İnceleme İpuçları:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-gray-300">
            <li><strong>Gizli Düzlem (Kısayol: P):</strong> Kılavuz sacını gizleyerek modelin içini engelsiz görün.</li>
            <li><strong>Kesit Kaydırıcı:</strong> Modeli katman katman tarayarak iç kusurları kontrol edin.</li>
            <li><strong>İç Yüzey Vurgusu:</strong> İç duvarlar ve boşluklar zıt renkle öne çıkar.</li>
          </ul>
        </div>
      )}

      {/* Primary: Toggle Hidden Plane (Gizli Düzlem Modu) */}
      <div className="mb-3">
        <button
          onClick={() => {
            onClippingConfigChange({ showPlaneHelper: !isPlaneHidden }, false);
          }}
          className={`w-full py-2 px-3 rounded-xl border font-semibold transition flex items-center justify-between shadow-md ${
            isPlaneHidden
              ? 'bg-gradient-to-r from-amber-950/80 via-amber-900/40 to-gray-900 border-amber-500/60 text-amber-300 shadow-amber-950/50 ring-1 ring-amber-400/30'
              : 'bg-gray-800/80 hover:bg-gray-800 border-gray-700 text-gray-200'
          }`}
          title="Kılavuz sacını gizle veya göster (Kısayol: P tuşu)"
        >
          <div className="flex items-center gap-2">
            {isPlaneHidden ? (
              <div className="p-1 bg-amber-500/20 rounded-lg text-amber-300">
                <EyeOff className="w-4 h-4" />
              </div>
            ) : (
              <div className="p-1 bg-sky-500/20 rounded-lg text-sky-300">
                <Eye className="w-4 h-4" />
              </div>
            )}
            <div className="text-left">
              <span className="block font-bold text-xs">
                {isPlaneHidden ? 'Gizli Düzlem Modu: AKTİF' : 'Düzlem Kılavuzu: GÖRÜNÜR'}
              </span>
              <span className="text-[10px] text-gray-400 block">
                {isPlaneHidden
                  ? 'Kılavuz gizlendi • İç geometri engelsiz inceleniyor'
                  : 'Kılavuz sacı ve yön oku ekranda görüntüleniyor'}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                isPlaneHidden
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                  : 'bg-gray-700 text-gray-300 border-gray-600'
              }`}
            >
              {isPlaneHidden ? 'Düzlem Gizli' : 'Düzlem Açık'}
            </span>
            <span className="text-[9px] text-gray-500 font-mono mt-0.5">[P Tuşu]</span>
          </div>
        </button>
      </div>

      {/* Axis Selection & Direction (Negate) */}
      <div className="space-y-1.5 mb-3 bg-gray-950/50 p-2.5 rounded-xl border border-gray-800">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-gray-300">Kesit Düzlemi Ekseni:</span>
          <span className="font-mono text-sky-400 font-bold">
            {currentAxis.toUpperCase()} {clippingConfig?.negate ? '(-)' : '(+)'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => onClippingConfigChange({ axis: 'x' }, false)}
            className={`py-1.5 px-2 rounded-lg font-mono font-bold text-xs transition border ${
              currentAxis === 'x'
                ? 'bg-red-600 text-white border-red-400 shadow-md shadow-red-950/60'
                : 'bg-gray-900 hover:bg-gray-800 text-gray-400 border-gray-800'
            }`}
          >
            X (Sol/Sağ)
          </button>
          <button
            onClick={() => onClippingConfigChange({ axis: 'y' }, false)}
            className={`py-1.5 px-2 rounded-lg font-mono font-bold text-xs transition border ${
              currentAxis === 'y'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/60'
                : 'bg-gray-900 hover:bg-gray-800 text-gray-400 border-gray-800'
            }`}
          >
            Y (Dikey)
          </button>
          <button
            onClick={() => onClippingConfigChange({ axis: 'z' }, false)}
            className={`py-1.5 px-2 rounded-lg font-mono font-bold text-xs transition border ${
              currentAxis === 'z'
                ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-950/60'
                : 'bg-gray-900 hover:bg-gray-800 text-gray-400 border-gray-800'
            }`}
          >
            Z (Ön/Arka)
          </button>
          <button
            onClick={() => onClippingConfigChange({ negate: !clippingConfig?.negate }, false)}
            className={`py-1.5 px-2 rounded-lg font-bold text-xs transition border flex items-center justify-center gap-1 ${
              clippingConfig?.negate
                ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-950/60'
                : 'bg-gray-900 hover:bg-gray-800 text-gray-300 border-gray-800'
            }`}
            title="Kesit yönünü tersine çevir"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>Ters Yön</span>
          </button>
        </div>
      </div>

      {/* Interactive Depth / Offset Slider */}
      <div className="space-y-1.5 mb-3 bg-gray-950/50 p-2.5 rounded-xl border border-gray-800">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-gray-300 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>Kesit Derinliği (Konum):</span>
          </span>
          <div className="flex items-center gap-1">
            <span className="font-mono font-bold text-sky-300 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-500/40">
              {currentOffset >= 0 ? `+${currentOffset.toFixed(1)}` : currentOffset.toFixed(1)} mm
            </span>
            <button
              onClick={() => {
                if (onResetOffset) onResetOffset();
                else onClippingConfigChange({ offset: 0 }, false);
              }}
              className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition"
              title="Merkeze Sıfırla (0 mm)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        <input
          type="range"
          min={minOffset}
          max={maxOffset}
          step="0.5"
          value={currentOffset}
          onChange={(e) => {
            onClippingConfigChange({ offset: parseFloat(e.target.value) || 0 }, true);
          }}
          className="w-full accent-sky-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
        />

        {/* Quick Steppers & Preset Snaps */}
        <div className="flex items-center justify-between pt-1 gap-1 text-[10px] font-mono">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onClippingConfigChange({ offset: currentOffset - 5 }, false)}
              className="px-1.5 py-0.5 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 rounded"
              title="-5 mm kaydır"
            >
              -5mm
            </button>
            <button
              onClick={() => onClippingConfigChange({ offset: currentOffset - 1 }, false)}
              className="px-1.5 py-0.5 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 rounded"
              title="-1 mm ince adım"
            >
              -1mm
            </button>
          </div>

          <button
            onClick={() => onClippingConfigChange({ offset: 0 }, false)}
            className="px-2 py-0.5 bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-700/60 rounded font-bold"
          >
            0 (Merkez)
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onClippingConfigChange({ offset: currentOffset + 1 }, false)}
              className="px-1.5 py-0.5 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 rounded"
              title="+1 mm ince adım"
            >
              +1mm
            </button>
            <button
              onClick={() => onClippingConfigChange({ offset: currentOffset + 5 }, false)}
              className="px-1.5 py-0.5 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 rounded"
              title="+5 mm kaydır"
            >
              +5mm
            </button>
          </div>
        </div>
      </div>

      {/* Internal Geometry Contrast Highlighting & Lighting */}
      <div className="space-y-2 mb-3 bg-gray-950/50 p-2.5 rounded-xl border border-gray-800">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-gray-300">İç Yüzey Vurgusu (İç Boşluklar):</span>
          </div>
          <button
            onClick={() => {
              onClippingConfigChange(
                { highlightInterior: !isInteriorHighlighted },
                false
              );
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
              isInteriorHighlighted
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-gray-800 text-gray-400 border-gray-700'
            }`}
          >
            {isInteriorHighlighted ? 'Açık' : 'Kapalı'}
          </button>
        </div>

        {isInteriorHighlighted && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-800/80">
            <span className="text-[10px] text-gray-400">İç Yüzey Rengi:</span>
            <div className="flex items-center gap-1.5">
              {interiorColors.map((col) => {
                const isSelected = (clippingConfig?.interiorColor || '#f59e0b') === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => onClippingConfigChange({ interiorColor: col.id }, false)}
                    className={`w-4 h-4 rounded-full ${col.bgClass} transition ${
                      isSelected ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                    }`}
                    title={col.name}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Angle Accordion */}
      <div className="border border-gray-800 rounded-xl overflow-hidden bg-gray-950/30">
        <button
          onClick={() => setShowAdvancedAngles((prev) => !prev)}
          className="w-full py-1.5 px-2.5 flex items-center justify-between text-[11px] text-gray-400 hover:text-gray-200 transition"
        >
          <span className="flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-sky-400" />
            <span>Hassas Kesit Düzlemi Açıları</span>
          </span>
          {showAdvancedAngles ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showAdvancedAngles && (
          <div className="p-2.5 space-y-2 border-t border-gray-800 text-[11px]">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-red-400 block font-mono">X Açısı</span>
                <input
                  type="number"
                  value={Math.round(clippingConfig?.rotX || 0)}
                  onChange={(e) => {
                    onClippingConfigChange(
                      { axis: 'custom', rotX: parseFloat(e.target.value) || 0 },
                      false
                    );
                  }}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-center font-mono text-white text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 block font-mono">Y Açısı</span>
                <input
                  type="number"
                  value={Math.round(clippingConfig?.rotY || 0)}
                  onChange={(e) => {
                    onClippingConfigChange(
                      { axis: 'custom', rotY: parseFloat(e.target.value) || 0 },
                      false
                    );
                  }}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-center font-mono text-white text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-blue-400 block font-mono">Z Açısı</span>
                <input
                  type="number"
                  value={Math.round(clippingConfig?.rotZ || 0)}
                  onChange={(e) => {
                    onClippingConfigChange(
                      { axis: 'custom', rotZ: parseFloat(e.target.value) || 0 },
                      false
                    );
                  }}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-center font-mono text-white text-xs"
                />
              </div>
            </div>

            <button
              onClick={() => onClippingConfigChange({ rotX: 0, rotY: 0, rotZ: 0 }, false)}
              className="w-full py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded text-[10px] transition"
            >
              Açıları Sıfırla (0°)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
