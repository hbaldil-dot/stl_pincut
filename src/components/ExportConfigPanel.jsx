import React, { useState, useEffect } from 'react';
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
  TrendingDown,
  Cpu,
  Ruler,
  FileText,
  Bookmark,
  BookmarkPlus,
  Trash2,
  Download,
  Upload,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FolderArchive,
  Box,
  Calendar,
  Settings2,
  Tag
} from 'lucide-react';
import { formatBytes } from '../utils/stlExporter';
import {
  EXPORT_UNITS,
  PART_NAMING_STYLES,
  CASE_CONVENTIONS,
  NAMING_PATTERN_TEMPLATES,
  DEFAULT_EXPORT_SETTINGS,
  loadAllPresets,
  saveCustomPreset,
  deleteCustomPreset,
  exportPresetsAsJSON,
  importPresetsFromJSON,
  resolveAllFilenames,
  saveActiveExportConfig
} from '../utils/exportSettingsStorage';

/**
 * Enhanced STL Export Configuration Panel.
 * Configures Precision & Decimation, Units & Scale Transformations,
 * File Naming Conventions, and Save/Load Presets.
 */
export function ExportConfigPanel({
  config = DEFAULT_EXPORT_SETTINGS,
  onChangeConfig,
  statsA = null,
  statsB = null,
  totalTriangles = 0,
  modelName = 'Model',
  pinConfig = null,
  compact = false,
  onNotify = null
}) {
  const [activeTab, setActiveTab] = useState('precision'); // 'precision' | 'units' | 'naming' | 'presets'
  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [copiedFilename, setCopiedFilename] = useState('');
  const [showAdvancedScale, setShowAdvancedScale] = useState(false);

  // Sync config with defaults
  const activeConfig = {
    ...DEFAULT_EXPORT_SETTINGS,
    ...(config || {})
  };

  // Reload presets on mount and when updated
  const refreshPresets = () => {
    const list = loadAllPresets();
    setPresets(list);
  };

  useEffect(() => {
    refreshPresets();
    const handleUpdate = () => refreshPresets();
    window.addEventListener('stl_export_presets_updated', handleUpdate);
    return () => window.removeEventListener('stl_export_presets_updated', handleUpdate);
  }, []);

  // Detect which preset matches current config
  useEffect(() => {
    const matched = presets.find(p => {
      const cfg = p.config;
      if (!cfg) return false;
      return (
        cfg.format === activeConfig.format &&
        Math.abs(cfg.density - activeConfig.density) < 0.02 &&
        cfg.unit === activeConfig.unit &&
        cfg.namingPattern === activeConfig.namingPattern &&
        cfg.partNamingStyle === activeConfig.partNamingStyle &&
        Boolean(cfg.applyUnitScale) === Boolean(activeConfig.applyUnitScale)
      );
    });
    setSelectedPresetId(matched ? matched.id : '');
  }, [activeConfig, presets]);

  const updateConfig = (partial) => {
    const next = { ...activeConfig, ...partial };
    onChangeConfig(next);
    saveActiveExportConfig(next);
  };

  // Density presets
  const densityPresets = [
    { id: 'original', ratio: 1.0, label: 'Maksimum', badge: '100%', desc: 'Orijinal CAD detayı' },
    { id: 'high', ratio: 0.75, label: 'Yüksek', badge: '75%', desc: 'Hassas tolerans' },
    { id: 'medium', ratio: 0.5, label: 'Dengeli', badge: '50%', desc: 'Slicer optimize' },
    { id: 'draft', ratio: 0.25, label: 'Taslak', badge: '25%', desc: 'Hafif & hızlı' }
  ];

  const handleSelectDensityPreset = (p) => {
    updateConfig({
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

    updateConfig({
      density: val,
      preset: matchedPreset
    });
  };

  const handleToggleFormat = (newFormat) => {
    updateConfig({ format: newFormat });
  };

  const handleDecimalPrecisionChange = (prec) => {
    updateConfig({ decimalPrecision: prec });
  };

  const handleSelectUnit = (unitKey) => {
    const unitDef = EXPORT_UNITS[unitKey] || EXPORT_UNITS.mm;
    updateConfig({
      unit: unitKey,
      unitScale: unitDef.scaleFactor
    });
  };

  const handleResetDefaults = () => {
    onChangeConfig({ ...DEFAULT_EXPORT_SETTINGS });
    saveActiveExportConfig({ ...DEFAULT_EXPORT_SETTINGS });
    if (onNotify) onNotify('Dışa aktarma ayarları varsayılana sıfırlandı.');
  };

  // Preset operations
  const handleLoadPreset = (presetItem) => {
    if (!presetItem || !presetItem.config) return;
    updateConfig(presetItem.config);
    setSelectedPresetId(presetItem.id);
    if (onNotify) onNotify(`"${presetItem.name}" profili yüklendi.`);
  };

  const handleSaveNewPreset = (e) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    try {
      const saved = saveCustomPreset({
        name: newPresetName.trim(),
        description: newPresetDesc.trim() || 'Kullanıcı özel dışa aktarma profili',
        category: 'Kullanıcı Profili',
        config: { ...activeConfig }
      });
      refreshPresets();
      setSelectedPresetId(saved.id);
      setIsSavingPreset(false);
      setNewPresetName('');
      setNewPresetDesc('');
      if (onNotify) onNotify(`"${saved.name}" profili başarıyla kaydedildi!`);
    } catch (err) {
      if (onNotify) onNotify(`Profil kaydedilemedi: ${err.message}`);
    }
  };

  const handleDeletePreset = (presetId, name, e) => {
    e.stopPropagation();
    if (window.confirm(`"${name}" profilini silmek istediğinize emin misiniz?`)) {
      deleteCustomPreset(presetId);
      refreshPresets();
      if (onNotify) onNotify(`"${name}" profili silindi.`);
    }
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          const res = importPresetsFromJSON(text);
          if (res.success) {
            refreshPresets();
            if (onNotify) onNotify(`${res.count} adet profil başarıyla içe aktarıldı!`);
          } else {
            if (onNotify) onNotify(`İçe aktarma hatası: ${res.error}`);
          }
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleCopyPreview = (filename) => {
    navigator.clipboard.writeText(filename);
    setCopiedFilename(filename);
    setTimeout(() => setCopiedFilename(''), 2000);
  };

  // Calculations for live mesh preview
  const originalTrianglesCount = totalTriangles || (
    ((statsA?.triangles || 0) + (statsB?.triangles || 0))
  );

  const projectedTrianglesCount = activeConfig.density >= 0.98
    ? originalTrianglesCount
    : Math.max(12, Math.round(originalTrianglesCount * activeConfig.density));

  const savingsPct = originalTrianglesCount > 0
    ? Math.max(0, Math.round((1 - projectedTrianglesCount / originalTrianglesCount) * 100))
    : 0;

  // File size estimates
  const estOriginalBytes = activeConfig.format === 'binary'
    ? 84 + originalTrianglesCount * 50
    : 100 + originalTrianglesCount * 180;

  const estProjectedBytes = activeConfig.format === 'binary'
    ? 84 + projectedTrianglesCount * 50
    : 100 + projectedTrianglesCount * 180;

  // Generate resolved filenames preview
  const filenames = resolveAllFilenames(modelName, activeConfig, pinConfig);

  return (
    <div className={`bg-gray-950/90 border border-gray-800 rounded-2xl ${compact ? 'p-3' : 'p-4'} space-y-3.5 shadow-2xl`}>
      {/* 1. Header with Active Profile Badge & Quick Presets Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-gray-200">
                  Dışa Aktarma Yapılandırması
                </h3>
                {selectedPresetId ? (
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/70 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Bookmark className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" />
                    {presets.find(p => p.id === selectedPresetId)?.name || 'Aktif Profil'}
                  </span>
                ) : (
                  <span className="text-[10px] bg-gray-800 text-gray-300 border border-gray-700 px-1.5 py-0.5 rounded-full font-mono">
                    Özel Yapılandırma
                  </span>
                )}
              </div>
              {!compact && (
                <p className="text-[11px] text-gray-400">
                  Hassasiyet, ölçü birimi ölçeği ve dosya isimlendirme kurallarını yönetin ve kaydedin.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsSavingPreset(!isSavingPreset)}
              className="text-[11px] bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 px-2 py-1 rounded-lg transition flex items-center gap-1 shadow-sm"
              title="Mevcut ayarları yeni bir profil olarak kaydet"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Profili Kaydet</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-[11px] text-gray-400 hover:text-emerald-300 flex items-center gap-1 transition px-2 py-1 rounded-lg hover:bg-gray-800/60"
              title="Varsayılan standart ayarlara dön (%100 Binary mm)"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Sıfırla</span>
            </button>
          </div>
        </div>

        {/* Inline Save Preset Form Popover */}
        {isSavingPreset && (
          <form
            onSubmit={handleSaveNewPreset}
            className="p-3 bg-gray-900 border border-emerald-500/40 rounded-xl space-y-2 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
              <span className="flex items-center gap-1.5">
                <BookmarkPlus className="w-4 h-4 text-emerald-400" />
                Yeni Dışa Aktarma Profili Olarak Kaydet
              </span>
              <button
                type="button"
                onClick={() => setIsSavingPreset(false)}
                className="text-gray-400 hover:text-gray-200 text-xs"
              >
                Vazgeç
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Profil Adı (örn. Atölye Ender 3 PLA)"
                required
                className="bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                value={newPresetDesc}
                onChange={(e) => setNewPresetDesc(e.target.value)}
                placeholder="Açıklama / Not (İsteğe bağlı)"
                className="bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow"
              >
                Kaydet
              </button>
            </div>
          </form>
        )}

        {/* Quick Presets Horizontal Scrolling Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Bookmark className="w-3 h-3 text-cyan-400" />
            Hızlı Profil:
          </span>
          {presets.map((p) => {
            const isSelected = p.id === selectedPresetId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleLoadPreset(p)}
                className={`px-2.5 py-1 rounded-lg border whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-400 font-bold shadow-md shadow-emerald-950/50'
                    : 'bg-gray-900 text-gray-300 border-gray-800 hover:border-gray-700 hover:bg-gray-800/80'
                }`}
                title={p.description}
              >
                <span>{p.name}</span>
                {p.isBuiltIn ? (
                  <span className="text-[9px] px-1 rounded bg-black/30 font-mono opacity-80">
                    {p.config?.unit || 'mm'}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleDeletePreset(p.id, p.name, e)}
                    className="hover:text-red-300 ml-0.5"
                    title="Bu özel profili sil"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Navigation Tabs (Hassasiyet, Birimler, İsimlendirme, Profiller) */}
      <div className="flex items-center border-b border-gray-800 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('precision')}
          className={`flex items-center gap-1.5 py-2 px-3 border-b-2 font-medium transition ${
            activeTab === 'precision'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Hassasiyet & Format</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('units')}
          className={`flex items-center gap-1.5 py-2 px-3 border-b-2 font-medium transition ${
            activeTab === 'units'
              ? 'border-cyan-500 text-cyan-400 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Birimler & Ölçek</span>
          {activeConfig.unit !== 'mm' && (
            <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1 rounded border border-cyan-800 font-mono">
              {activeConfig.unit}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('naming')}
          className={`flex items-center gap-1.5 py-2 px-3 border-b-2 font-medium transition ${
            activeTab === 'naming'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>İsimlendirme</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-1.5 py-2 px-3 border-b-2 font-medium transition ${
            activeTab === 'presets'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Profiller ({presets.length})</span>
        </button>
      </div>

      {/* TAB CONTENT 1: PRECISION & QUALITY */}
      {activeTab === 'precision' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          {/* Format Selection (Binary vs ASCII) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Binary className="w-3.5 h-3.5 text-cyan-400" />
                <span>Çıktı Formatı</span>
              </span>
              <span className="text-[10px] text-gray-400 font-normal">
                {activeConfig.format === 'binary' ? '50 bayt / üçgen' : '~180 bayt / üçgen'}
              </span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {/* Binary Card */}
              <button
                type="button"
                onClick={() => handleToggleFormat('binary')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  activeConfig.format === 'binary'
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
                  Kompakt ikili veri. Tüm 3D dilimleyiciler (Cura, Bambu, Prusa, Orca) için en hızlı format.
                </p>
              </button>

              {/* ASCII Card */}
              <button
                type="button"
                onClick={() => handleToggleFormat('ascii')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  activeConfig.format === 'ascii'
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
            {activeConfig.format === 'ascii' && (
              <div className="bg-gray-900/70 border border-gray-800/80 rounded-xl p-2.5 flex items-center justify-between animate-in fade-in duration-200">
                <span className="text-[11px] text-gray-300 font-medium flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ondalık Hassasiyet (Hane Sayısı):</span>
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { prec: 6, label: '6 hane (0.000001)' },
                    { prec: 4, label: '4 hane (0.0001)' },
                    { prec: 3, label: '3 hane (0.001)' },
                    { prec: 2, label: '2 hane (0.01)' }
                  ].map(({ prec, label }) => (
                    <button
                      key={prec}
                      type="button"
                      onClick={() => handleDecimalPrecisionChange(prec)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition ${
                        activeConfig.decimalPrecision === prec
                          ? 'bg-cyan-600 text-white border-cyan-500 font-bold shadow'
                          : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200'
                      }`}
                      title={label}
                    >
                      {prec}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Precision & Mesh Density Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ağ Hassasiyeti (Mesh Density & Decimation):</span>
              </label>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-gray-900 border border-emerald-900/60 px-2 py-0.5 rounded-lg">
                %{Math.round(activeConfig.density * 100)}
              </span>
            </div>

            {/* Density Presets */}
            <div className="grid grid-cols-4 gap-1.5">
              {densityPresets.map((p) => {
                const isSelected = activeConfig.preset === p.id && Math.abs(activeConfig.density - p.ratio) < 0.02;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectDensityPreset(p)}
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
                value={activeConfig.density}
                onChange={handleSliderChange}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          {/* Live Statistics & File Size Comparison Card */}
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
                    {activeConfig.density < 0.98 && (
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
                    {activeConfig.density < 0.98 && (
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
      )}

      {/* TAB CONTENT 2: UNITS & SCALE */}
      {activeTab === 'units' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                <span>Hedef Ölçü Birimi (Target Unit)</span>
              </span>
              <span className="text-[10px] text-cyan-400 font-mono font-medium">
                Aktif: {EXPORT_UNITS[activeConfig.unit]?.shortName || 'mm'}
              </span>
            </label>

            {/* Units Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.values(EXPORT_UNITS).map((u) => {
                const isSelected = activeConfig.unit === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUnit(u.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-br from-cyan-950/60 via-gray-900 to-gray-950 border-cyan-500/80 text-white shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                        : 'bg-gray-900/60 border-gray-800 text-gray-300 hover:bg-gray-800/80 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-cyan-300">{u.shortName}</span>
                      <span className="text-[10px] font-mono px-1 rounded bg-black/40 text-gray-400">
                        {u.id === 'mm' ? '1.0x' : u.id === 'in' ? '1/25.4' : u.scaleFactor + 'x'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 line-clamp-1">{u.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unit Scale Transformation Toggle */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-200 block">
                  Dışa Aktarırken Koordinatları Dönüştür (Physical Scaling)
                </span>
                <p className="text-[10px] text-gray-400">
                  STL dosyasındaki köşe noktalarını (vertex) seçilen birim ölçeğiyle ({activeConfig.unitScale || 1}x) çarparak kaydeder.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={Boolean(activeConfig.applyUnitScale)}
                  onChange={(e) => updateConfig({ applyUnitScale: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            {/* Scaling factor configuration */}
            <div className="pt-2 border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-gray-300 font-medium flex items-center gap-1">
                <span>Aktif Ölçek Çarpanı:</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {typeof activeConfig.unitScale === 'number' ? activeConfig.unitScale.toFixed(4) : '1.0000'}x
                </span>
              </span>

              {/* Quick Scale Multiplier Presets */}
              <div className="flex items-center gap-1 text-[10px] font-mono">
                {[
                  { label: '1.0x (Orijinal)', factor: 1.0 },
                  { label: '1/25.4 (mm->İnç)', factor: 1 / 25.4 },
                  { label: '25.4x (İnç->mm)', factor: 25.4 },
                  { label: '0.1x (mm->cm)', factor: 0.1 }
                ].map(({ label, factor }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => updateConfig({ unitScale: factor, applyUnitScale: true })}
                    className={`px-2 py-0.5 rounded border transition ${
                      Math.abs((activeConfig.unitScale || 1) - factor) < 0.0001
                        ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                        : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: FILE NAMING CONVENTIONS */}
      {activeTab === 'naming' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          {/* Naming Pattern Template Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Dosya Adı Şablonu (Naming Pattern)</span>
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                Örn: {activeConfig.namingPattern}
              </span>
            </label>

            <select
              value={activeConfig.namingPattern}
              onChange={(e) => updateConfig({ namingPattern: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            >
              {NAMING_PATTERN_TEMPLATES.map((tmpl) => (
                <option key={tmpl.pattern} value={tmpl.pattern}>
                  {tmpl.label} [{tmpl.pattern}]
                </option>
              ))}
            </select>
          </div>

          {/* Clickable Token Pills */}
          <div className="space-y-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block">
              Kullanılabilir Değişkenler (Tıklayarak Şablona Ekleyin):
            </span>
            <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
              {[
                { token: '{name}', desc: 'Model Adı' },
                { token: '{part}', desc: 'Parça (Part 1/2/Pim)' },
                { token: '{unit}', desc: 'Birim (mm/in)' },
                { token: '{density}', desc: 'Hassasiyet (%100)' },
                { token: '{format}', desc: 'Format (bin/ascii)' },
                { token: '{date}', desc: 'Tarih (YYYY-MM-DD)' },
                { token: '{prefix}', desc: 'Ön Ek' },
                { token: '{suffix}', desc: 'Son Ek' }
              ].map(({ token, desc }) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => {
                    const current = activeConfig.namingPattern || '';
                    if (!current.includes(token)) {
                      updateConfig({ namingPattern: `${current}_${token}` });
                    }
                  }}
                  className="px-2 py-0.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-indigo-300 border border-gray-800 hover:border-indigo-500/50 transition flex items-center gap-1"
                  title={`${desc} değişkenini şablona ekle`}
                >
                  <Tag className="w-2.5 h-2.5" />
                  <span>{token}</span>
                  <span className="text-gray-500 text-[9px]">({desc})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Part Naming Style & Case Convention Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Part Style */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-300 block">
                Parça Numaralandırma Stili
              </label>
              <select
                value={activeConfig.partNamingStyle}
                onChange={(e) => updateConfig({ partNamingStyle: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              >
                {PART_NAMING_STYLES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label} ({st.desc})
                  </option>
                ))}
              </select>
            </div>

            {/* Case Convention */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-300 block">
                Büyük/Küçük Harf (Case) Kuralı
              </label>
              <select
                value={activeConfig.caseConvention}
                onChange={(e) => updateConfig({ caseConvention: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              >
                {CASE_CONVENTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Prefix and Suffix */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 font-medium block mb-1">
                Özel Ön Ek (Prefix)
              </label>
              <input
                type="text"
                value={activeConfig.prefix || ''}
                onChange={(e) => updateConfig({ prefix: e.target.value })}
                placeholder="Örn: 3D_ veya PRJ_"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-medium block mb-1">
                Özel Son Ek (Suffix)
              </label>
              <input
                type="text"
                value={activeConfig.suffix || ''}
                onChange={(e) => updateConfig({ suffix: e.target.value })}
                placeholder="Örn: _v1 veya _Final"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Live Generated Filename Preview Box */}
          <div className="bg-gradient-to-br from-indigo-950/30 via-gray-900 to-gray-950 border border-indigo-900/40 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-indigo-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Canlı Dosya Adı Önizlemesi (Oluşturulacak Dosyalar)
              </span>
              <span className="text-[10px] text-gray-400 font-normal">
                Tıklayarak kopyalayın
              </span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              {/* Part 1 */}
              <div
                onClick={() => handleCopyPreview(filenames.part1)}
                className="bg-gray-950/80 hover:bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-lg p-2 flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-gray-300 text-[11px]">{filenames.part1}</span>
                </div>
                <div className="text-gray-400 hover:text-white">
                  {copiedFilename === filenames.part1 ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </div>
              </div>

              {/* Part 2 */}
              <div
                onClick={() => handleCopyPreview(filenames.part2)}
                className="bg-gray-950/80 hover:bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-lg p-2 flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-gray-300 text-[11px]">{filenames.part2}</span>
                </div>
                <div className="text-gray-400 hover:text-white">
                  {copiedFilename === filenames.part2 ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </div>
              </div>

              {/* Dowel Pin */}
              <div
                onClick={() => handleCopyPreview(filenames.dowel)}
                className="bg-gray-950/80 hover:bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-lg p-2 flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-gray-300 text-[11px]">{filenames.dowel}</span>
                </div>
                <div className="text-gray-400 hover:text-white">
                  {copiedFilename === filenames.dowel ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </div>
              </div>

              {/* Combined Assembly */}
              <div
                onClick={() => handleCopyPreview(filenames.combined)}
                className="bg-gray-950/80 hover:bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-lg p-2 flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-gray-300 text-[11px]">{filenames.combined}</span>
                </div>
                <div className="text-gray-400 hover:text-white">
                  {copiedFilename === filenames.combined ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </div>
              </div>

              {/* ZIP Archive */}
              <div
                onClick={() => handleCopyPreview(filenames.zip)}
                className="bg-gray-950/80 hover:bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-lg p-2 flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-2">
                  <FolderArchive className="w-3 h-3 text-cyan-400" />
                  <span className="text-gray-300 text-[11px]">{filenames.zip}</span>
                </div>
                <div className="text-gray-400 hover:text-white">
                  {copiedFilename === filenames.zip ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: SAVED PROFILES & BACKUP */}
      {activeTab === 'presets' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-amber-400" />
              Tüm Kayıtlı Dışa Aktarma Profilleri
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={exportPresetsAsJSON}
                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-[11px] transition flex items-center gap-1"
                title="Profilleri JSON dosyası olarak indir"
              >
                <Download className="w-3 h-3" />
                <span>JSON İndir</span>
              </button>
              <button
                type="button"
                onClick={handleImportJSON}
                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-[11px] transition flex items-center gap-1"
                title="JSON dosyasından profilleri içe aktar"
              >
                <Upload className="w-3 h-3" />
                <span>İçe Aktar</span>
              </button>
            </div>
          </div>

          {/* List of presets */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {presets.map((p) => {
              const isSelected = p.id === selectedPresetId;
              const cfg = p.config || {};
              return (
                <div
                  key={p.id}
                  onClick={() => handleLoadPreset(p)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-950/60 via-gray-900 to-gray-950 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/30'
                      : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 hover:bg-gray-900'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-200">{p.name}</span>
                      {isSelected && (
                        <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                          Seçili
                        </span>
                      )}
                      <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.2 rounded font-mono">
                        {p.category || (p.isBuiltIn ? 'Hazır Şablon' : 'Kullanıcı')}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">{p.description}</p>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
                      <span>Format: {cfg.format?.toUpperCase() || 'BINARY'}</span>
                      <span>•</span>
                      <span>Yoğunluk: %{Math.round((cfg.density || 1) * 100)}</span>
                      <span>•</span>
                      <span>Birim: {cfg.unit || 'mm'}</span>
                      <span>•</span>
                      <span>Şablon: {cfg.namingPattern || '{name}_{part}'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadPreset(p);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shadow ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                      }`}
                    >
                      {isSelected ? 'Aktif' : 'Yükle'}
                    </button>

                    {!p.isBuiltIn && (
                      <button
                        type="button"
                        onClick={(e) => handleDeletePreset(p.id, p.name, e)}
                        className="p-1 text-gray-500 hover:text-red-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                        title="Profili Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
