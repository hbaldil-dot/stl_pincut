import React, { useState, useMemo, useEffect } from 'react';
import {
  Bookmark,
  BookmarkPlus,
  Scissors,
  Sparkles,
  Search,
  Check,
  Trash2,
  Download,
  Upload,
  Copy,
  X,
  Target,
  Sliders,
  RotateCcw,
  Info,
  Layers,
  FileJson,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FolderArchive
} from 'lucide-react';
import {
  BUILT_IN_CUTTING_PRESETS,
  PRESET_CATEGORIES,
  loadAllCuttingPresets,
  saveNewCustomPreset,
  deleteCustomPreset,
  computePresetDelta,
  exportPresetsToJSON,
  importPresetsFromJSON
} from '../utils/cuttingPresetsStorage';

/**
 * Cutting & Pin Alignment Presets Management Panel.
 * Allows saving, loading, inspecting, exporting, and importing
 * reusable cutting plane configurations and pin alignment parameters.
 */
export function CuttingPresetsPanel({
  clippingConfig,
  pinConfig,
  onApplyPreset,
  onNotify,
  compact = false
}) {
  const [presets, setPresets] = useState(() => loadAllCuttingPresets());
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [appliedPresetId, setAppliedPresetId] = useState(null);

  // New preset form inputs
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetCategory, setNewPresetCategory] = useState('Standart FDM');
  const [newPresetDescription, setNewPresetDescription] = useState('');

  const refreshPresets = () => {
    setPresets(loadAllCuttingPresets());
  };

  useEffect(() => {
    refreshPresets();
  }, []);

  // Filtered presets
  const filteredPresets = useMemo(() => {
    return presets.filter((preset) => {
      const matchesCategory =
        selectedCategory === 'Tümü' ||
        preset.category === selectedCategory ||
        (selectedCategory === 'Özel Şablonlar' && !preset.isBuiltIn);

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        preset.name.toLowerCase().includes(q) ||
        preset.description.toLowerCase().includes(q) ||
        preset.category.toLowerCase().includes(q) ||
        (preset.pinConfig?.type || '').toLowerCase().includes(q) ||
        (preset.clippingConfig?.axis || '').toLowerCase().includes(q) ||
        `${preset.pinConfig?.diameter}mm`.includes(q) ||
        `${preset.pinConfig?.clearance}mm`.includes(q);

      return matchesCategory && matchesQuery;
    });
  }, [presets, selectedCategory, searchQuery]);

  const handleSavePreset = (e) => {
    e?.preventDefault();
    if (!newPresetName.trim()) {
      onNotify?.('Lütfen şablon için bir isim girin.');
      return;
    }

    const created = saveNewCustomPreset({
      name: newPresetName,
      category: newPresetCategory,
      description: newPresetDescription,
      clippingConfig,
      pinConfig
    });

    refreshPresets();
    setIsCreatingNew(false);
    setNewPresetName('');
    setNewPresetDescription('');
    setAppliedPresetId(created.id);
    onNotify?.(`"${created.name}" şablonu başarıyla kaydedildi.`);
  };

  const handleDeletePreset = (presetId, presetName) => {
    if (window.confirm(`"${presetName}" şablonunu silmek istediğinize emin misiniz?`)) {
      deleteCustomPreset(presetId);
      refreshPresets();
      onNotify?.(`"${presetName}" şablonu silindi.`);
    }
  };

  const handleApply = (preset) => {
    onApplyPreset?.(preset);
    setAppliedPresetId(preset.id);
  };

  const handleExportJSON = () => {
    const jsonStr = exportPresetsToJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `STL_Cutting_Presets_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify?.('Özel şablonlar JSON dosyası olarak indirildi.');
  };

  const handleCopyJSON = () => {
    const jsonStr = exportPresetsToJSON();
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
      onNotify?.('Şablonlar JSON formatında panoya kopyalandı.');
    });
  };

  const handleImportJSON = () => {
    if (!importJsonText.trim()) {
      setImportError('Lütfen içe aktarılacak JSON metnini yapıştırın.');
      return;
    }

    const result = importPresetsFromJSON(importJsonText);
    if (result.error) {
      setImportError(result.error);
    } else {
      refreshPresets();
      setImportJsonText('');
      setImportError(null);
      setIsImportExportOpen(false);
      onNotify?.(`${result.importedCount} adet şablon başarıyla içe aktarıldı.`);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const result = importPresetsFromJSON(content);
        if (result.error) {
          setImportError(result.error);
        } else {
          refreshPresets();
          setImportError(null);
          setIsImportExportOpen(false);
          onNotify?.(`${result.importedCount} adet şablon dosyadan içe aktarıldı.`);
        }
      }
    };
    reader.readAsText(file);
  };

  const getModeLabel = (mode) => {
    switch (mode) {
      case 'holes_both':
        return 'Çift Dübel';
      case 'pin_and_hole':
        return 'Pim + Delik';
      case 'hole_only':
        return 'Yalnızca Delik';
      case 'pin_only':
        return 'Yalnızca Pim';
      case 'flat':
        return 'Düz Kesim';
      default:
        return mode || 'Standart';
    }
  };

  const currentAxis = (clippingConfig?.axis || 'y').toUpperCase();
  const currentDiam = pinConfig?.diameter ?? pinConfig?.size ?? 8;
  const currentDepth = pinConfig?.depth ?? pinConfig?.height ?? 10;
  const currentClearance = pinConfig?.clearance ?? 0.20;

  return (
    <div className="flex flex-col gap-3.5 p-3.5 sm:p-4 text-gray-200">
      {/* Top Banner / Title Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 shadow-sm">
            <Bookmark className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Kesim & Pim Şablonları (Presets)
            </h3>
            <p className="text-[11px] text-gray-400">
              Farklı STL modellerinde tekrar kullanım için hazır veya özel şablonlar
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsImportExportOpen((prev) => !prev)}
          className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 shrink-0 ${
            isImportExportOpen
              ? 'bg-blue-900/60 border-blue-500 text-blue-200'
              : 'bg-gray-800 hover:bg-gray-750 text-gray-300 border-gray-700 hover:text-white'
          }`}
          title="Şablonları JSON Olarak Dışa/İçe Aktar"
        >
          <FileJson className="w-3.5 h-3.5 text-blue-400" />
          <span>Yedekle / Aktar</span>
        </button>
      </div>

      {/* JSON Import/Export Drawer (Collapsible) */}
      {isImportExportOpen && (
        <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl flex flex-col gap-2.5 animate-fade-in">
          <div className="flex items-center justify-between text-xs font-bold text-blue-300">
            <div className="flex items-center gap-1.5">
              <FileJson className="w-4 h-4 text-blue-400" />
              <span>Şablonları Yedekle & İçe Aktar</span>
            </div>
            <button
              onClick={() => setIsImportExportOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Export */}
            <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg flex flex-col justify-between gap-2">
              <div>
                <span className="font-semibold text-gray-200 block">Dışa Aktar (Export)</span>
                <span className="text-[10px] text-gray-400">Özel şablonları JSON dosyası olarak kaydedin</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExportJSON}
                  className="flex-1 py-1 px-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition flex items-center justify-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>JSON İndir</span>
                </button>
                <button
                  onClick={handleCopyJSON}
                  className="py-1 px-2 rounded bg-gray-800 hover:bg-gray-750 text-gray-300 font-medium text-[11px] border border-gray-700 transition flex items-center justify-center gap-1"
                >
                  {copySuccess ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copySuccess ? 'Kopyalandı' : 'Kopyala'}</span>
                </button>
              </div>
            </div>

            {/* Import */}
            <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-200">İçe Aktar (Import)</span>
                <label className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer font-semibold underline flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Dosya Seç
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
              <input
                type="text"
                placeholder="JSON metnini yapıştırın..."
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 text-[11px] text-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
              />
              {importError && (
                <span className="text-[10px] text-red-400">{importError}</span>
              )}
              <div className="flex justify-end">
                <button
                  onClick={handleImportJSON}
                  disabled={!importJsonText.trim()}
                  className="py-1 px-2.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-[11px] transition flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>Aktar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Scene Parameters & Quick-Save Box */}
      <div className="p-3 bg-gray-950/70 border border-gray-800 rounded-xl flex flex-col gap-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Sahnedeki Aktif Parametreler
            </span>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] mt-1">
              <span className="bg-blue-950/70 border border-blue-800/60 text-blue-300 px-2 py-0.5 rounded-md font-semibold">
                Eksen: {currentAxis}
              </span>
              <span className="bg-orange-950/70 border border-orange-800/60 text-orange-300 px-2 py-0.5 rounded-md font-semibold">
                Ø{currentDiam} × {currentDepth}mm
              </span>
              <span className="bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                +{currentClearance.toFixed(2)}mm
              </span>
              <span className="bg-purple-950/70 border border-purple-800/60 text-purple-300 px-2 py-0.5 rounded-md capitalize">
                {pinConfig?.type || 'silindir'}
              </span>
              <span className="bg-gray-800/90 border border-gray-700 text-gray-300 px-2 py-0.5 rounded-md">
                {getModeLabel(pinConfig?.mode)}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsCreatingNew((prev) => !prev)}
            className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-emerald-600/90 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-1.5 shadow-sm shrink-0"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>{isCreatingNew ? 'Formu Kapat' : 'Şablon Olarak Kaydet'}</span>
          </button>
        </div>

        {/* New Preset Creation Form */}
        {isCreatingNew && (
          <form
            onSubmit={handleSavePreset}
            className="p-3 bg-gray-900 border border-emerald-500/40 rounded-xl flex flex-col gap-2.5 mt-1 animate-fade-in"
          >
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <BookmarkPlus className="w-4 h-4" />
              <span>Aktif Kesim & Pim Ayarlarını Kaydet</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] font-medium text-gray-300 block">Şablon İsmi</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 0.4mm Nozul PETG Dübel (Ø8x12mm)"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-gray-300 block">Kategori</label>
                <select
                  value={newPresetCategory}
                  onChange={(e) => setNewPresetCategory(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {PRESET_CATEGORIES.filter((c) => c !== 'Tümü').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-300 block">Açıklama / Notlar (İsteğe Bağlı)</label>
              <input
                type="text"
                placeholder="Örn: Model gövdesi için sıkı geçme pim ayarı"
                value={newPresetDescription}
                onChange={(e) => setNewPresetDescription(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="py-1 px-2.5 rounded-lg text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-750 transition"
              >
                İptal
              </button>
              <button
                type="submit"
                className="py-1 px-3.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Kaydet</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-2 pt-1">
        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
          {PRESET_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`py-1 px-2 rounded-lg text-[11px] font-medium transition shrink-0 ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'bg-gray-800/80 text-gray-400 hover:text-gray-200 hover:bg-gray-750'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Şablon ismi, eksen veya tolerans ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-950 border border-gray-750 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Presets Cards List */}
      <div className="flex flex-col gap-2.5 pt-1">
        {filteredPresets.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
            <Bookmark className="w-8 h-8 text-gray-600 stroke-1" />
            <span className="text-xs font-semibold text-gray-400">Şablon bulunamadı</span>
            <p className="text-[11px] text-gray-500">
              Filtreyi temizleyebilir veya yeni bir şablon kaydedebilirsiniz.
            </p>
          </div>
        ) : (
          filteredPresets.map((preset) => {
            const pClip = preset.clippingConfig || {};
            const pPin = preset.pinConfig || {};
            const diam = pPin.diameter ?? pPin.size ?? 8;
            const depth = pPin.depth ?? pPin.height ?? 10;
            const clr = pPin.clearance ?? 0.20;
            const axis = (pClip.axis || 'y').toUpperCase();
            const isFlat = pClip.addPinOnSlice === false || pPin.mode === 'flat';

            // Check diffs vs current settings
            const deltas = computePresetDelta(preset, clippingConfig, pinConfig);
            const isExactMatch = deltas.length === 0;

            return (
              <div
                key={preset.id}
                className={`rounded-xl border p-3 transition-all flex flex-col justify-between gap-2.5 ${
                  isExactMatch
                    ? 'bg-emerald-950/20 border-emerald-500/70 shadow-sm'
                    : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                }`}
              >
                {/* Title & Category */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white tracking-wide">
                        {preset.name}
                      </span>
                      {preset.isBuiltIn ? (
                        <span className="text-[9px] bg-blue-950 text-blue-300 border border-blue-800 px-1 py-0.1 rounded font-mono font-medium">
                          Hazır
                        </span>
                      ) : (
                        <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1 py-0.1 rounded font-mono font-medium">
                          Özel
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      {preset.category}
                    </span>
                  </div>

                  {!preset.isBuiltIn && (
                    <button
                      onClick={() => handleDeletePreset(preset.id, preset.name)}
                      className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-950/40 rounded transition"
                      title="Özel Şablonu Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Description */}
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {preset.description}
                </p>

                {/* Specs */}
                <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
                  <span className="bg-gray-800 text-blue-300 border border-blue-900/40 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                    <Scissors className="w-2.5 h-2.5 text-blue-400" />
                    <span>{axis}</span>
                  </span>

                  {!isFlat ? (
                    <>
                      <span className="bg-gray-800 text-orange-300 border border-orange-900/40 px-1.5 py-0.5 rounded font-semibold">
                        Ø{diam}×{depth}mm
                      </span>
                      <span className="bg-gray-800 text-emerald-300 border border-emerald-900/40 px-1.5 py-0.5 rounded font-semibold">
                        +{clr.toFixed(2)}mm
                      </span>
                      <span className="bg-gray-800 text-purple-300 border border-purple-900/40 px-1.5 py-0.5 rounded font-sans capitalize">
                        {pPin.type || 'silindir'}
                      </span>
                      <span className="bg-gray-800 text-gray-300 border border-gray-750 px-1.5 py-0.5 rounded font-sans">
                        {getModeLabel(pPin.mode)}
                      </span>
                    </>
                  ) : (
                    <span className="bg-gray-800 text-amber-300 border border-amber-900/40 px-1.5 py-0.5 rounded font-sans">
                      Pimsiz Düz
                    </span>
                  )}

                  {pPin.snapToNormal && (
                    <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-1 py-0.5 rounded text-[9px] font-sans flex items-center gap-0.5">
                      <Target className="w-2.5 h-2.5" /> 90°
                    </span>
                  )}
                </div>

                {/* Actions & Delta */}
                <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between gap-2 text-[11px]">
                  <div className="truncate text-gray-400 max-w-[180px]">
                    {isExactMatch ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Sahne ile eşleşiyor
                      </span>
                    ) : (
                      <span>{deltas.slice(0, 2).join(', ')}{deltas.length > 2 ? '...' : ''}</span>
                    )}
                  </div>

                  <button
                    onClick={() => handleApply(preset)}
                    className={`py-1 px-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm shrink-0 ${
                      isExactMatch
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-750'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <span>{isExactMatch ? 'Uygulandı' : 'Sahneye Uygula'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
export default CuttingPresetsPanel;
