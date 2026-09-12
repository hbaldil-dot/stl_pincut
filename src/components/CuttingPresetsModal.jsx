import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Bookmark,
  BookmarkCheck,
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
  ChevronDown,
  ChevronUp,
  FileJson,
  SlidersHorizontal,
  ArrowRight
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

export function CuttingPresetsModal({
  isOpen,
  onClose,
  clippingConfig,
  pinConfig,
  onApplyPreset,
  onNotify
}) {
  const [presets, setPresets] = useState(() => loadAllCuttingPresets());
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // New preset form state
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetCategory, setNewPresetCategory] = useState('Standart FDM');
  const [newPresetDescription, setNewPresetDescription] = useState('');

  const modalRef = useRef(null);

  // Reload presets on open
  useEffect(() => {
    if (isOpen) {
      setPresets(loadAllCuttingPresets());
      setIsCreatingNew(false);
      setIsImportExportOpen(false);
      setImportError(null);
      setCopySuccess(false);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  if (!isOpen) return null;

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

    setPresets(loadAllCuttingPresets());
    setIsCreatingNew(false);
    setNewPresetName('');
    setNewPresetDescription('');
    onNotify?.(`"${created.name}" şablonu başarıyla kaydedildi.`);
  };

  const handleDeletePreset = (presetId, presetName) => {
    if (window.confirm(`"${presetName}" şablonunu silmek istediğinize emin misiniz?`)) {
      deleteCustomPreset(presetId);
      setPresets(loadAllCuttingPresets());
      onNotify?.(`"${presetName}" şablonu silindi.`);
    }
  };

  const handleExportJSON = () => {
    const jsonStr = exportPresetsToJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `STL_PinCut_Presets_${new Date().toISOString().slice(0, 10)}.json`;
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
      setPresets(loadAllCuttingPresets());
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
          setPresets(loadAllCuttingPresets());
          setImportError(null);
          setIsImportExportOpen(false);
          onNotify?.(`${result.importedCount} adet şablon dosyadan içe aktarıldı.`);
        }
      }
    };
    reader.readAsText(file);
  };

  // Helper for mode title
  const getModeLabel = (mode) => {
    switch (mode) {
      case 'holes_both':
        return 'Çift Dübel Deliği';
      case 'pin_and_hole':
        return 'Pim + Delik (Erkek/Dişi)';
      case 'hole_only':
        return 'Yalnızca Delik';
      case 'pin_only':
        return 'Yalnızca Pim';
      case 'flat':
        return 'Düz Kesim (Pimsiz)';
      default:
        return mode || 'Standart';
    }
  };

  const currentAxis = (clippingConfig?.axis || 'y').toUpperCase();
  const currentDiam = pinConfig?.diameter ?? pinConfig?.size ?? 8;
  const currentDepth = pinConfig?.depth ?? pinConfig?.height ?? 10;
  const currentClearance = pinConfig?.clearance ?? 0.20;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-gray-900 border border-gray-750 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-800 bg-gray-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 shadow-sm">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Kesim & Pim Hizalama Şablonları (Presets)
                </h2>
                <span className="text-[11px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full font-semibold">
                  {presets.length} Şablon
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Farklı STL modellerinde hızlı ve tutarlı kesim için hazır parametre şablonlarını uygulayın veya kendi ayarlarınızı kaydedin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportExportOpen((prev) => !prev)}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                isImportExportOpen
                  ? 'bg-blue-900/60 border-blue-500 text-blue-200'
                  : 'bg-gray-800 hover:bg-gray-750 text-gray-300 border-gray-700 hover:text-white'
              }`}
              title="Şablonları JSON Olarak Dışa/İçe Aktar"
            >
              <FileJson className="w-3.5 h-3.5 text-blue-400" />
              <span>Yedekle / Aktar</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition"
              title="Kapat (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Import/Export Backup Drawer (collapsible) */}
        {isImportExportOpen && (
          <div className="p-4 bg-gray-950 border-b border-gray-800 flex flex-col gap-3 animate-fade-in shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                <FileJson className="w-4 h-4 text-blue-400" />
                <span>Şablonları JSON ile Paylaş & Yedekle</span>
              </div>
              <span className="text-[11px] text-gray-400">
                Tarayıcılar ve cihazlar arasında şablonlarınızı aktarabilirsiniz.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Export column */}
              <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 flex flex-col justify-between gap-2.5">
                <div>
                  <div className="text-xs font-semibold text-gray-200">Dışa Aktar (Export)</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Tüm özel şablonlarınızı JSON dosyası olarak kaydedin veya panoya kopyalayın.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportJSON}
                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JSON İndir</span>
                  </button>
                  <button
                    onClick={handleCopyJSON}
                    className="py-1.5 px-3 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition flex items-center justify-center gap-1.5"
                  >
                    {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copySuccess ? 'Kopyalandı' : 'Panoya Kopyala'}</span>
                  </button>
                </div>
              </div>

              {/* Import column */}
              <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-200">İçe Aktar (Import)</div>
                  <label className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer underline flex items-center gap-1">
                    <Upload className="w-3 h-3" /> Dosyadan Yükle
                    <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="Veya buraya JSON metnini yapıştırın..."
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-750 text-xs text-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                />
                {importError && (
                  <div className="text-[11px] text-red-400 font-medium">{importError}</div>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={handleImportJSON}
                    disabled={!importJsonText.trim()}
                    className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white transition flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Şablonları Aktar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Active Settings & Save New Preset Banner */}
        <div className="p-3.5 sm:px-5 bg-gray-950/40 border-b border-gray-800 flex flex-col gap-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-medium">Sahnedeki Aktif Parametreler:</span>
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
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
              <BookmarkPlus className="w-4 h-4" />
              <span>{isCreatingNew ? 'Formu Kapat' : 'Aktif Ayarları Yeni Şablon Olarak Kaydet'}</span>
            </button>
          </div>

          {/* New Preset Creation Form (expanded) */}
          {isCreatingNew && (
            <form onSubmit={handleSavePreset} className="p-3.5 bg-gray-900 border border-emerald-500/40 rounded-xl flex flex-col gap-3 mt-1 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <BookmarkPlus className="w-4 h-4" />
                  <span>Yeni Özel Şablon Oluştur</span>
                </div>
                <span className="text-[11px] text-gray-400">
                  Mevcut kesim düzlemi ve pim ayarları bu şablona kaydedilecek
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-medium text-gray-300 block">Şablon İsmi</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 0.4mm Nozul PETG Dübel (Ø8x12mm)"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-300 block">Kategori</label>
                  <select
                    value={newPresetCategory}
                    onChange={(e) => setNewPresetCategory(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
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
                <label className="text-[11px] font-medium text-gray-300 block">Açıklama / Notlar (İsteğe Bağlı)</label>
                <input
                  type="text"
                  placeholder="Örn: Yüksek dayanımlı montaj parçaları için özel tolerans ayarı"
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="py-1.5 px-3 rounded-lg text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-750 transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Şablonu Kaydet</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Filter Bar: Categories + Search */}
        <div className="px-5 py-2.5 bg-gray-950/80 border-b border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          {/* Categories pill list */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {PRESET_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`py-1 px-2.5 rounded-lg text-xs font-medium transition shrink-0 ${
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
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Şablon, eksen, çap ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-750 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
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

        {/* Presets List / Grid (scrollable) */}
        <div className="p-5 overflow-y-auto flex-1 bg-gray-950/20">
          {filteredPresets.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
              <Bookmark className="w-10 h-10 text-gray-600 stroke-1" />
              <div className="text-sm font-semibold text-gray-400">Aramanızla eşleşen şablon bulunamadı</div>
              <p className="text-xs text-gray-500 max-w-sm">
                Farklı bir kategori seçebilir veya arama kelimenizi temizleyebilirsiniz.
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-1 text-xs text-emerald-400 hover:underline font-medium"
                >
                  Aramayı Temizle
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredPresets.map((preset) => {
                const pClip = preset.clippingConfig || {};
                const pPin = preset.pinConfig || {};
                const diam = pPin.diameter ?? pPin.size ?? 8;
                const depth = pPin.depth ?? pPin.height ?? 10;
                const clr = pPin.clearance ?? 0.20;
                const axis = (pClip.axis || 'y').toUpperCase();
                const isFlat = pClip.addPinOnSlice === false || pPin.mode === 'flat';

                // Check differences vs current settings
                const deltas = computePresetDelta(preset, clippingConfig, pinConfig);
                const isExactMatch = deltas.length === 0;

                return (
                  <div
                    key={preset.id}
                    className={`rounded-xl border p-4 transition-all duration-150 flex flex-col justify-between gap-3 ${
                      isExactMatch
                        ? 'bg-emerald-950/20 border-emerald-500/70 shadow-md shadow-emerald-950/30'
                        : 'bg-gray-900/90 border-gray-800 hover:border-gray-700 hover:bg-gray-850/80 shadow-sm'
                    }`}
                  >
                    {/* Top Row: Title & Badges */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white tracking-wide">
                              {preset.name}
                            </span>
                            {preset.isBuiltIn ? (
                              <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.2 rounded font-mono font-medium">
                                Hazır
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded font-mono font-medium">
                                Özel
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 font-medium mt-0.5">
                            {preset.category}
                          </span>
                        </div>

                        {/* Delete button for custom presets */}
                        {!preset.isBuiltIn && (
                          <button
                            onClick={() => handleDeletePreset(preset.id, preset.name)}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/50 rounded-lg transition"
                            title="Özel Şablonu Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                        {preset.description}
                      </p>
                    </div>

                    {/* Parameters Spec Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="bg-gray-800/90 text-blue-300 border border-blue-900/50 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold flex items-center gap-1">
                        <Scissors className="w-3 h-3 text-blue-400" />
                        <span>Eksen: {axis}</span>
                      </span>

                      {!isFlat ? (
                        <>
                          <span className="bg-gray-800/90 text-orange-300 border border-orange-900/50 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold">
                            Ø{diam} × {depth}mm
                          </span>
                          <span className="bg-gray-800/90 text-emerald-300 border border-emerald-900/50 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold">
                            +{clr.toFixed(2)}mm
                          </span>
                          <span className="bg-gray-800/90 text-purple-300 border border-purple-900/50 px-2 py-0.5 rounded-md text-[11px] font-medium capitalize">
                            {pPin.type || 'silindir'}
                          </span>
                          <span className="bg-gray-800/90 text-gray-300 border border-gray-750 px-2 py-0.5 rounded-md text-[11px]">
                            {getModeLabel(pPin.mode)}
                          </span>
                        </>
                      ) : (
                        <span className="bg-gray-800/90 text-amber-300 border border-amber-900/50 px-2 py-0.5 rounded-md text-[11px] font-medium">
                          Pimsiz Düz Kesim
                        </span>
                      )}

                      {pPin.snapToNormal && (
                        <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-0.5">
                          <Target className="w-3 h-3" /> 90° Flush
                        </span>
                      )}
                    </div>

                    {/* Comparison indicator vs current settings */}
                    <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
                      <div className="text-[11px] text-gray-400 truncate max-w-[240px]">
                        {isExactMatch ? (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" /> Şu an sahnede aktif
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            Farklar: <span className="text-gray-300">{deltas.slice(0, 2).join(', ')}{deltas.length > 2 ? ` (+${deltas.length - 2})` : ''}</span>
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          onApplyPreset(preset);
                          onClose();
                        }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                          isExactMatch
                            ? 'bg-gray-800 text-gray-300 hover:bg-gray-750'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                        }`}
                      >
                        <span>{isExactMatch ? 'Yeniden Uygula' : 'Sahneye Uygula'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-gray-800 bg-gray-950/80 flex items-center justify-between text-xs text-gray-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>Şablon uygulandığında geri almak için <strong>Ctrl+Z</strong> kısayolunu kullanabilirsiniz.</span>
          </div>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl text-xs font-semibold bg-gray-800 hover:bg-gray-750 text-gray-200 transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

export default CuttingPresetsModal;
