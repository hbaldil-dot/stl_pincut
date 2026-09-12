import React, { useState, useRef } from 'react';
import {
  Layers,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Maximize2,
  FolderArchive,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Box,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  Compass,
  Crosshair,
  X,
  Upload,
  Check,
  Info,
  Bookmark
} from 'lucide-react';
import { formatBytes } from '../utils/stlExporter';
import { loadAllCuttingPresets } from '../utils/cuttingPresetsStorage';

export function BatchQueueTab({
  queue = [],
  onUpdateQueue,
  onOpenBatchModal,
  isProcessing = false,
  currentProcessingId = null,
  onStartProcessing,
  onCancelProcessing,
  onDownloadAllZip,
  isExportingAll = false,
  onLoadItemInViewport,
  onDownloadPartA,
  onDownloadPartB,
  onDownloadDowel,
  onDownloadItemZip,
  onAddFiles,
  onAddAllPresets,
  onClearQueue,
  onAddCurrentModel,
  hasActiveModel = false,
  currentModelName = null,
  activeClippingConfig = null,
  activePinConfig = null,
  // Uniform settings props
  batchSettings,
  onBatchSettingsChange,
  onSyncWithViewport,
  onApplyToViewport
}) {
  const fileInputRef = useRef(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  // Fallback state if batchSettings isn't passed from parent
  const [localBatchSettings, setLocalBatchSettings] = useState({
    clipping: {
      axis: 'y',
      offset: 0,
      offsetMode: 'absolute', // 'absolute' | 'percentage'
      negate: false,
      addPinOnSlice: true
    },
    pin: {
      mode: 'pin_and_hole',
      diameter: 8.0,
      depth: 10.0,
      clearance: 0.2,
      type: 'cylinder',
      taper: 0.85,
      snapToNormal: true,
      snapToCenter: true,
      flushFit: true
    }
  });

  const settings = batchSettings || localBatchSettings;
  const updateSettings = onBatchSettingsChange || setLocalBatchSettings;

  const updateClipping = (patch) => {
    updateSettings({
      ...settings,
      clipping: {
        ...settings.clipping,
        ...patch
      }
    });
  };

  const updatePin = (patch) => {
    updateSettings({
      ...settings,
      pin: {
        ...settings.pin,
        ...patch
      }
    });
  };

  const completedCount = queue.filter(item => item.status === 'completed').length;
  const pendingCount = queue.filter(item => item.status === 'pending').length;
  const errorCount = queue.filter(item => item.status === 'error').length;
  const totalCount = queue.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleRemoveItem = (id) => {
    if (onUpdateQueue) {
      onUpdateQueue(queue.filter(item => item.id !== id));
    }
  };

  const handleResetQueueStatus = () => {
    if (isProcessing || !onUpdateQueue) return;
    const reset = queue.map(item => ({
      ...item,
      status: 'pending',
      progress: 0,
      statusText: 'Bekliyor',
      result: null,
      error: null
    }));
    onUpdateQueue(reset);
  };

  const clipping = settings.clipping || {};
  const pin = settings.pin || {};

  return (
    <div className="flex flex-col p-3.5 gap-3.5">
      {/* Top Banner with Quick Summary & Expand to Fullscreen Modal */}
      <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/40 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-gray-200">Toplu İşleme Kuyruğu</h3>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-600/40 px-1.5 py-0.2 rounded-full font-bold">
                {completedCount}/{totalCount}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 truncate">
              Tüm modellere aynı kesim düzlemi ve pim ayarını uygular
            </p>
          </div>
        </div>

        <button
          onClick={onOpenBatchModal}
          className="p-1.5 bg-gray-800 hover:bg-gray-700 text-emerald-300 rounded-xl border border-gray-700 transition shrink-0 ml-1"
          title="Genişletilmiş Toplu İşleme Yöneticisini Aç"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="space-y-1 bg-gray-950/50 p-2 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
            <span>Genel İlerleme:</span>
            <span className="text-emerald-400 font-bold">%{progressPercent} ({completedCount} Tamamlandı)</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload & Add Presets Buttons */}
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".stl"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onAddFiles?.(e.target.files);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }
          }}
          className="hidden"
        />

        <div className="grid grid-cols-2 gap-2">
          {hasActiveModel && onAddCurrentModel && (
            <button
              onClick={onAddCurrentModel}
              className="col-span-2 py-2 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-950/50"
              title="Aktif 3D sahnede yüklü olan modeli kuyruğa ekle"
            >
              <Box className="w-3.5 h-3.5" />
              <span>Aktif Modeli Kuyruğa Ekle ({currentModelName || 'Model'})</span>
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>STL Dosya Ekle</span>
          </button>

          <button
            onClick={onAddAllPresets}
            className="py-2 px-2.5 bg-gray-800 hover:bg-gray-700 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1"
            title="4 adet örnek modeli kuyruğa ekle"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>+4 Örnek Model</span>
          </button>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              onAddFiles?.(e.dataTransfer.files);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-xl p-2.5 text-center cursor-pointer transition flex items-center justify-center gap-2 text-xs ${
            isDragOver
              ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300'
              : 'border-gray-800 bg-gray-950/30 text-gray-400 hover:border-gray-700 hover:text-gray-300'
          }`}
        >
          <Upload className="w-3.5 h-3.5 text-emerald-400" />
          <span>Birden fazla STL dosyasını buraya sürükleyin</span>
        </div>
      </div>

      {/* UNIFORM CUT PLANE & PIN CONFIGURATION (Ortak Ayarlar) */}
      <div className="bg-gray-950/60 rounded-xl border border-gray-800 overflow-hidden shadow-sm">
        {/* Accordion Header */}
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="w-full p-2.5 bg-gray-900/90 hover:bg-gray-850 flex items-center justify-between text-left transition"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sliders className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-200">Ortak Kesim & Pim Ayarları</div>
              <div className="text-[10px] text-gray-400 font-mono truncate">
                {clipping.axis?.toUpperCase()}-Ekseni • {clipping.offsetMode === 'percentage' ? `%${clipping.offset || 50}` : `${clipping.offset || 0}mm`} • {clipping.addPinOnSlice !== false ? `Ø${pin.diameter || 8}×${pin.depth || 10}mm` : 'Düz Pimsiz'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isSettingsOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </button>

        {/* Accordion Body */}
        {isSettingsOpen && (
          <div className="p-3 space-y-3 border-t border-gray-800 text-xs">
            {/* Quick Preset Selector */}
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Bookmark className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] font-semibold text-amber-300 truncate">Hazır Şablon:</span>
              </div>
              <select
                onChange={(e) => {
                  const presets = loadAllCuttingPresets();
                  const found = presets.find((p) => p.id === e.target.value);
                  if (found) {
                    updateSettings({
                      ...settings,
                      clipping: {
                        ...settings.clipping,
                        axis: found.clippingConfig?.axis || settings.clipping?.axis || 'y',
                        offset: typeof found.clippingConfig?.offset === 'number' ? found.clippingConfig.offset : 0,
                        offsetMode: found.clippingConfig?.offsetMode || settings.clipping?.offsetMode || 'absolute',
                        negate: found.clippingConfig?.negate || false,
                        addPinOnSlice: found.clippingConfig?.addPinOnSlice !== false
                      },
                      pin: {
                        ...settings.pin,
                        mode: found.pinConfig?.mode || settings.pin?.mode || 'pin_and_hole',
                        diameter: found.pinConfig?.diameter || 8.0,
                        depth: found.pinConfig?.depth || 10.0,
                        clearance: typeof found.pinConfig?.clearance === 'number' ? found.pinConfig.clearance : 0.2,
                        type: found.pinConfig?.type || 'cylinder',
                        taper: typeof found.pinConfig?.taper === 'number' ? found.pinConfig.taper : 0.85,
                        snapToNormal: found.pinConfig?.snapToNormal !== false,
                        snapToCenter: found.pinConfig?.snapToCenter !== false,
                        flushFit: found.pinConfig?.flushFit !== false
                      }
                    });
                  }
                }}
                defaultValue=""
                className="bg-gray-900 border border-amber-500/40 text-amber-300 text-[11px] font-semibold rounded px-2 py-1 focus:outline-none max-w-[160px] truncate"
              >
                <option value="" disabled>Şablon Seç...</option>
                {loadAllCuttingPresets().map((p) => (
                  <option key={p.id} value={p.id} className="bg-gray-900 text-gray-200">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Viewport Sync & Apply Buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={onSyncWithViewport}
                className="py-1.5 px-2 bg-gray-850 hover:bg-gray-800 text-cyan-300 border border-cyan-500/30 rounded-lg text-[10px] font-semibold transition flex items-center justify-center gap-1"
                title="Aktif 3D sahnede görünen kesim ve pim ayarlarını al"
              >
                <RefreshCw className="w-3 h-3 text-cyan-400" />
                <span>3D'den Ayarları Al</span>
              </button>

              <button
                type="button"
                onClick={onApplyToViewport}
                className="py-1.5 px-2 bg-gray-850 hover:bg-gray-800 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-semibold transition flex items-center justify-center gap-1"
                title="Bu ortak ayarları aktif 3D sahneye ve modeline uygula"
              >
                <Eye className="w-3 h-3 text-emerald-400" />
                <span>3D Sahneye Uygula</span>
              </button>
            </div>

            {/* 1. Cut Plane Settings */}
            <div className="space-y-2 pt-1 border-t border-gray-850">
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-300">
                <span className="flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Kesim Düzlemi Ekseni</span>
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {clipping.axis?.toUpperCase()}-Ekseni
                </span>
              </div>

              {/* Axis Selector */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'y', label: 'Y (Yatay)', desc: 'Taban' },
                  { id: 'x', label: 'X (Yan)', desc: 'Sağ/Sol' },
                  { id: 'z', label: 'Z (Ön)', desc: 'Ön/Arka' }
                ].map(ax => (
                  <button
                    key={ax.id}
                    onClick={() => updateClipping({ axis: ax.id })}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-bold border transition text-center ${
                      clipping.axis === ax.id
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                        : 'bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-850'
                    }`}
                  >
                    {ax.label}
                  </button>
                ))}
              </div>

              {/* Offset Mode & Value Slider */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">Düzlem Konumu:</span>
                  <div className="flex items-center gap-1 bg-gray-900 p-0.5 rounded-lg border border-gray-800">
                    <button
                      onClick={() => updateClipping({ offsetMode: 'absolute' })}
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                        clipping.offsetMode !== 'percentage'
                          ? 'bg-emerald-600 text-white'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Ofset (mm)
                    </button>
                    <button
                      onClick={() => updateClipping({ offsetMode: 'percentage', offset: 50 })}
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                        clipping.offsetMode === 'percentage'
                          ? 'bg-emerald-600 text-white'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Oran (%)
                    </button>
                  </div>
                </div>

                {clipping.offsetMode === 'percentage' ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-gray-400">Model Yükseklik Yüzdesi:</span>
                      <span className="text-emerald-400 font-bold font-mono">
                        %{typeof clipping.offset === 'number' ? clipping.offset : 50}
                        {(clipping.offset === 50 || clipping.offset === undefined) && ' (Merkez)'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="5"
                      value={typeof clipping.offset === 'number' ? clipping.offset : 50}
                      onChange={(e) => updateClipping({ offset: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                      <span>%10 Alt</span>
                      <span className="text-emerald-400 font-bold">%50 Orta</span>
                      <span>%90 Üst</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-gray-400">Merkezden Sapma:</span>
                      <span className="text-emerald-400 font-bold font-mono">
                        {clipping.offset || 0} mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      step="0.5"
                      value={clipping.offset || 0}
                      onChange={(e) => updateClipping({ offset: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                    />
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => updateClipping({ negate: !clipping.negate })}
                  className={`p-1.5 rounded-lg border text-[10px] font-medium transition flex items-center justify-between ${
                    clipping.negate
                      ? 'bg-amber-950/40 border-amber-500/70 text-amber-300'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-850'
                  }`}
                >
                  <span>Kesim Yönünü Ters Çevir</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${clipping.negate ? 'bg-amber-400' : 'bg-gray-600'}`} />
                </button>

                <button
                  type="button"
                  onClick={() => updateClipping({ addPinOnSlice: !clipping.addPinOnSlice })}
                  className={`p-1.5 rounded-lg border text-[10px] font-medium transition flex items-center justify-between ${
                    clipping.addPinOnSlice !== false
                      ? 'bg-emerald-950/40 border-emerald-500/70 text-emerald-300'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-850'
                  }`}
                >
                  <span>Hizalama Pimi Ekle</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${clipping.addPinOnSlice !== false ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                </button>
              </div>
            </div>

            {/* 2. Alignment Pin Configuration */}
            {clipping.addPinOnSlice !== false && (
              <div className="space-y-2 pt-2 border-t border-gray-800">
                <div className="flex items-center justify-between text-[11px] font-semibold text-gray-300">
                  <span className="flex items-center gap-1">
                    <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Hizalama Pimi & Yuva</span>
                  </span>
                  <span className="font-mono text-cyan-300 text-[10px]">
                    Ø{pin.diameter || 8} × {pin.depth || 10}mm
                  </span>
                </div>

                {/* Pin Mode */}
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'pin_and_hole', label: 'Pim & Yuva' },
                    { id: 'holes_both', label: 'Çift Yuva + Dübel' },
                    { id: 'flat', label: 'Düz (Pimsiz)' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => updatePin({ mode: m.id })}
                      className={`py-1 px-1 rounded-lg text-[9px] font-bold border transition text-center ${
                        pin.mode === m.id
                          ? 'bg-cyan-600 text-white border-cyan-400'
                          : 'bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-850'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {pin.mode !== 'flat' && (
                  <>
                    {/* Pin Type */}
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { id: 'cylinder', label: 'Silindir' },
                        { id: 'square', label: 'Kare' },
                        { id: 'hex', label: 'Altıgen' },
                        { id: 'cone', label: 'Konik' }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => updatePin({ type: t.id })}
                          className={`py-1 px-1 rounded text-[9px] font-semibold border transition ${
                            (pin.type || 'cylinder') === t.id
                              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600 font-bold'
                              : 'bg-gray-900 text-gray-400 border-gray-800'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Diameter Presets */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-400">Pim Çapı (Ø):</span>
                        <span className="font-mono text-cyan-400 font-bold">Ø{pin.diameter || 8} mm</span>
                      </div>
                      <div className="flex gap-1">
                        {[4, 6, 8, 10, 12].map(d => (
                          <button
                            key={d}
                            onClick={() => updatePin({ diameter: d })}
                            className={`flex-1 py-0.5 rounded text-[10px] font-mono border transition ${
                              (pin.diameter || 8) === d
                                ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                                : 'bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-850'
                            }`}
                          >
                            Ø{d}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Depth Presets */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-400">Pim Boyu / Derinlik:</span>
                        <span className="font-mono text-cyan-400 font-bold">{pin.depth || 10} mm</span>
                      </div>
                      <div className="flex gap-1">
                        {[6, 8, 10, 12, 16].map(l => (
                          <button
                            key={l}
                            onClick={() => updatePin({ depth: l })}
                            className={`flex-1 py-0.5 rounded text-[10px] font-mono border transition ${
                              (pin.depth || 10) === l
                                ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                                : 'bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-850'
                            }`}
                          >
                            {l}mm
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3D Print Tolerance */}
                    <div className="flex items-center justify-between p-1.5 bg-gray-900 rounded-lg border border-gray-800 text-[10px]">
                      <span className="text-gray-300">FDM 3D Baskı Toleransı:</span>
                      <div className="flex items-center gap-1">
                        {[0.15, 0.20, 0.30].map(c => (
                          <button
                            key={c}
                            onClick={() => updatePin({ clearance: c })}
                            className={`px-1.5 py-0.5 rounded font-mono text-[9px] border transition ${
                              (pin.clearance ?? 0.2) === c
                                ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                                : 'bg-gray-800 text-gray-400 border-gray-700'
                            }`}
                          >
                            +{c}mm
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Primary Start / Stop Execution Controls */}
      <div className="flex flex-col gap-2">
        {isProcessing ? (
          <button
            onClick={onCancelProcessing}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-red-950/60 animate-pulse"
          >
            <Pause className="w-4 h-4" />
            <span>Toplu İşlemeyi Durdur</span>
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Primary ONE-GO PROCESS & EXPORT BUTTON */}
            <button
              onClick={() => onStartProcessing?.({ autoExportZip: true, useCurrentViewport: true })}
              disabled={totalCount === 0 || pendingCount === 0}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 shadow-xl ${
                totalCount > 0 && pendingCount > 0
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-400 text-gray-950 shadow-emerald-950/60 hover:scale-[1.01] ring-1 ring-emerald-300/40'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
              }`}
              title="Kuyruktaki tüm modelleri aktif kesim ve pim ayarlarıyla keser ve bitince tek ZIP olarak otomatik indirir"
            >
              <FolderArchive className="w-4 h-4" />
              <span>Hepsini Kes ve Tek Seferde İndir ({pendingCount > 0 ? `${pendingCount} Bekliyor` : 'Hazır'})</span>
            </button>

            {/* Secondary Sadece Kes Button */}
            <button
              onClick={() => onStartProcessing?.({ autoExportZip: false, useCurrentViewport: true })}
              disabled={totalCount === 0 || pendingCount === 0}
              className="w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-gray-700 hover:border-gray-600"
              title="Modelleri kesit düzlemi ve pim yuvalarıyla dilimler, sonuçları kuyrukta incelemek için hazır tutar"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
              <span>Sadece Kes (Kuyrukta Tut)</span>
            </button>
          </div>
        )}

        {completedCount > 0 && (
          <button
            onClick={onDownloadAllZip}
            disabled={isExportingAll}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-950/50"
          >
            <FolderArchive className="w-4 h-4" />
            <span>{isExportingAll ? 'ZIP Paketleniyor...' : `Tüm Parçaları ZIP İndir (${completedCount} Model)`}</span>
          </button>
        )}
      </div>

      {/* Queue Items List */}
      <div className="space-y-2 mt-1">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Kuyruktaki Modeller ({totalCount})</span>
          <div className="flex items-center gap-2">
            {completedCount > 0 && completedCount === totalCount && !isProcessing && (
              <button
                onClick={handleResetQueueStatus}
                className="text-[10px] text-teal-400 hover:text-teal-300 transition flex items-center gap-0.5"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Tekrar Çalıştır</span>
              </button>
            )}
            {totalCount > 0 && !isProcessing && (
              <button
                onClick={onClearQueue}
                className="text-[10px] text-red-400 hover:text-red-300 transition flex items-center gap-0.5"
              >
                <Trash2 className="w-2.5 h-2.5" />
                <span>Temizle</span>
              </button>
            )}
          </div>
        </div>

        {totalCount === 0 ? (
          <div className="p-6 bg-gray-950/40 border border-gray-800 rounded-2xl text-center text-gray-500 text-xs">
            Kuyrukta model yok. Yukarıdan STL dosyaları seçebilir veya "+4 Örnek Model" butonuna tıklayarak deneyebilirsiniz.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
            {queue.map((item, index) => {
              const isCurrent = currentProcessingId === item.id;
              const isDone = item.status === 'completed';
              const isErr = item.status === 'error';
              const cleanName = item.name.replace(/\.stl$/i, '');

              return (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border text-xs transition flex flex-col gap-2 ${
                    isCurrent
                      ? 'bg-blue-950/40 border-blue-500/70 shadow-sm ring-1 ring-blue-500/30'
                      : isDone
                      ? 'bg-gray-950/60 border-emerald-900/60'
                      : isErr
                      ? 'bg-red-950/30 border-red-900/60'
                      : 'bg-gray-950/40 border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-gray-500 w-4">#{index + 1}</span>
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-200 truncate block">{cleanName}</span>
                        <span className="text-[9px] text-gray-500 font-mono">
                          {formatBytes(item.size)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                          isCurrent
                            ? 'bg-blue-950 text-blue-300 border-blue-800 animate-pulse'
                            : isDone
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800 font-bold'
                            : isErr
                            ? 'bg-red-950 text-red-300 border-red-800'
                            : 'bg-gray-800 text-gray-400 border-gray-700'
                        }`}
                      >
                        {item.statusText}
                      </span>

                      {!isProcessing && (
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-gray-500 hover:text-red-400 transition"
                          title="Kuyruktan Çıkar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions when completed */}
                  {isDone && (
                    <div className="flex items-center justify-between pt-1 border-t border-gray-800/60 text-[10px]">
                      <span className="text-emerald-400 font-mono">
                        {item.result?.cutAreaCm2?.toFixed(1) || 0} cm²
                      </span>

                      <div className="flex items-center gap-1">
                        {onLoadItemInViewport && (
                          <button
                            onClick={() => onLoadItemInViewport(item)}
                            className="px-2 py-0.5 bg-gray-800 hover:bg-emerald-950/60 text-gray-300 hover:text-emerald-300 rounded border border-gray-700 hover:border-emerald-700 transition flex items-center gap-0.5"
                            title="Bu modeli ana 3D sahnede aç"
                          >
                            <Eye className="w-3 h-3 text-emerald-400" />
                            <span>3D</span>
                          </button>
                        )}

                        <button
                          onClick={() => onDownloadItemZip && onDownloadItemZip(item)}
                          className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-teal-300 rounded border border-gray-700 transition flex items-center gap-0.5"
                          title="Bu modelin ZIP paketini indir"
                        >
                          <Download className="w-3 h-3" />
                          <span>ZIP</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {isErr && item.error && (
                    <div className="text-[10px] text-red-400 font-mono truncate">
                      {item.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
