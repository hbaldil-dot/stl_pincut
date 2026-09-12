import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Save,
  Check,
  Trash2,
  RotateCcw,
  FileSpreadsheet,
  FileCode,
  Scale,
  Box,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Layers,
  GitCompare,
  Plus,
  Download,
  AlertCircle,
  Maximize2,
  X,
  Eye
} from 'lucide-react';
import {
  loadConfigHistory,
  addConfigHistoryEntry,
  deleteConfigHistoryEntry,
  clearConfigHistory,
  calculateConfigDelta,
  downloadConfigComparisonCSV,
  downloadSingleConfigCSV,
  downloadConfigComparisonJSON
} from '../utils/configHistoryStorage.js';
import WireframeThumbnail from './WireframeThumbnail.jsx';
import { useUnit } from '../context/UnitContext.jsx';

/**
 * Returns a distinctive color code for a given material name
 */
export const getMaterialColor = (materialName) => {
  const name = (materialName || '').toUpperCase();
  if (name.includes('PLA')) return '#06b6d4'; // cyan
  if (name.includes('ABS')) return '#f59e0b'; // amber
  if (name.includes('PETG')) return '#10b981'; // emerald
  if (name.includes('TPU') || name.includes('FLEX')) return '#a855f7'; // purple
  if (name.includes('REÇİNE') || name.includes('RESIN')) return '#ec4899'; // pink
  if (name.includes('NAYLON') || name.includes('NYLON')) return '#3b82f6'; // blue
  if (name.includes('KARBON') || name.includes('CARBON')) return '#94a3b8'; // slate
  if (name.includes('AHŞAP') || name.includes('WOOD')) return '#d97706'; // amber-orange
  return '#818cf8'; // indigo default
};

/**
 * Configuration & Export History Log Component
 *
 * Tracks, displays, compares, and restores previously used model print configurations
 * (scale, material density, calculated mass, volume) with isometric wireframe preview thumbnails.
 */
export default function ConfigurationHistoryLog({
  modelName = 'Model',
  currentScale = { x: 1, y: 1, z: 1 },
  currentDensity = 1.24,
  currentMassGrams = 0,
  currentVolumeCm3 = 0,
  currentDimensions = { x: 0, y: 0, z: 0 },
  matchedMaterialName = 'PLA',
  onApplyConfig = null,
  compact = false,
  title = 'Baskı Ayarları & Dışa Aktarma Geçmişi'
}) {
  const { formatDimensions } = useUnit();
  const [history, setHistory] = useState([]);
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [appliedId, setAppliedId] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [previewEntry, setPreviewEntry] = useState(null);
  const [csvExportFeedback, setCsvExportFeedback] = useState(false);
  const [singleCsvFeedbackId, setSingleCsvFeedbackId] = useState(null);

  // Sync with localStorage and window custom events
  useEffect(() => {
    setHistory(loadConfigHistory());

    const handleHistoryUpdate = (event) => {
      if (event.detail && Array.isArray(event.detail)) {
        setHistory(event.detail);
      } else {
        setHistory(loadConfigHistory());
      }
    };

    window.addEventListener('stl_config_history_updated', handleHistoryUpdate);
    return () => {
      window.removeEventListener('stl_config_history_updated', handleHistoryUpdate);
    };
  }, []);

  // Active baseline configuration object
  const activeConfig = useMemo(() => ({
    scale: currentScale || { x: 1, y: 1, z: 1 },
    density: Number(currentDensity) || 1.24,
    massGrams: Number(currentMassGrams) || 0,
    volumeCm3: Number(currentVolumeCm3) || 0,
    dimensions: currentDimensions || { x: 0, y: 0, z: 0 },
    materialName: matchedMaterialName || 'Özel'
  }), [currentScale, currentDensity, currentMassGrams, currentVolumeCm3, currentDimensions, matchedMaterialName]);

  // Handle saving the current configuration into history
  const handleSaveCurrentConfig = (source = 'manual') => {
    addConfigHistoryEntry({
      modelName: modelName || 'Model',
      scale: activeConfig.scale,
      material: {
        name: activeConfig.materialName,
        density: activeConfig.density
      },
      volumeCm3: activeConfig.volumeCm3,
      massGrams: activeConfig.massGrams,
      dimensions: activeConfig.dimensions,
      source
    });

    setIsSavedFeedback(true);
    setTimeout(() => setIsSavedFeedback(false), 2000);
  };

  // Handle applying a historical configuration back to the active model
  const handleApply = (entry) => {
    if (onApplyConfig) {
      onApplyConfig(entry);
      setAppliedId(entry.id);
      setTimeout(() => setAppliedId(null), 2500);
    }
  };

  // Delete a single record
  const handleDelete = (id) => {
    deleteConfigHistoryEntry(id);
    if (previewEntry?.id === id) {
      setPreviewEntry(null);
    }
  };

  // Clear all records
  const handleClearAll = () => {
    clearConfigHistory();
    setConfirmClear(false);
    setPreviewEntry(null);
  };

  // Handle exporting the current export history log as a CSV file
  const handleExportAllCSV = () => {
    const res = downloadConfigComparisonCSV(history, activeConfig);
    if (res) {
      setCsvExportFeedback(true);
      setTimeout(() => setCsvExportFeedback(false), 2200);
      // If history was empty, snapshot the active config into the history store
      if (history.length === 0) {
        handleSaveCurrentConfig('export_csv');
      }
    }
  };

  // Handle exporting a single historical configuration as a CSV file
  const handleExportSingleCSV = (entry) => {
    const res = downloadSingleConfigCSV(entry, activeConfig);
    if (res) {
      setSingleCsvFeedbackId(entry.id);
      setTimeout(() => setSingleCsvFeedbackId(null), 2000);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950/30 p-3.5 rounded-xl border border-indigo-500/30 flex flex-col gap-3 shadow-lg">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-100">{title}</span>
              <span className="text-[10px] font-mono font-bold bg-indigo-950/70 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded-full">
                {history.length}
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Farklı ölçek ve malzeme kütle hesaplamalarını karşılaştırın ve modele geri yükleyin
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="p-1 text-gray-400 hover:text-gray-200 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg transition"
          title={isExpanded ? 'Geçmişi Gizle' : 'Geçmişi Genişlet'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-gray-800">
            {/* Save Current Button */}
            <button
              type="button"
              onClick={() => handleSaveCurrentConfig('manual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm ${
                isSavedFeedback
                  ? 'bg-emerald-600 text-white shadow-emerald-950 border border-emerald-400'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950 border border-indigo-400'
              }`}
              title="Şu anki model ölçeğini, malzemesini ve kütlesini karşılaştırma listesine kaydet"
            >
              {isSavedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Ayar Kaydedildi!</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Mevcut Ayarı Kaydet</span>
                </>
              )}
            </button>

            {/* View Mode & Export Controls */}
            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              {/* Export History CSV Button (Always accessible) */}
              <button
                type="button"
                data-testid="export-history-csv-btn"
                onClick={handleExportAllCSV}
                className={`p-1.5 rounded-lg text-[10px] font-medium transition flex items-center gap-1.5 border shadow-sm ${
                  csvExportFeedback
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-950'
                    : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 hover:text-emerald-200 border-emerald-500/40'
                }`}
                title={
                  history.length > 0
                    ? `Tüm ${history.length} yapılandırma kaydını ve fark analizini CSV (Excel) olarak indir`
                    : 'Mevcut model baskı ayarlarını ve hesaplanan kütleyi CSV olarak indir'
                }
              >
                {csvExportFeedback ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>CSV İndirildi!</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>CSV Dışa Aktar{history.length > 0 ? ` (${history.length})` : ''}</span>
                  </>
                )}
              </button>

              {history.length > 0 && (
                <>
                  {/* View Mode Toggle */}
                  <div className="bg-gray-900 border border-gray-800 p-0.5 rounded-lg flex items-center text-[10px]">
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      className={`px-2 py-0.5 rounded font-medium transition ${
                        viewMode === 'cards'
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Kartlar
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`px-2 py-0.5 rounded font-medium transition ${
                        viewMode === 'table'
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Tablo
                    </button>
                  </div>

                  {/* Export JSON */}
                  <button
                    type="button"
                    onClick={() => downloadConfigComparisonJSON(history, activeConfig)}
                    className="p-1.5 bg-gray-900 hover:bg-gray-800 text-cyan-400 hover:text-cyan-300 border border-gray-800 rounded-lg text-[10px] font-medium transition flex items-center gap-1"
                    title="Tüm kayıtları JSON olarak indir"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">JSON</span>
                  </button>

                  {/* Clear History */}
                  {confirmClear ? (
                    <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/40 px-1.5 py-0.5 rounded-lg">
                      <span className="text-[9px] text-red-300 font-semibold">Silinsin mi?</span>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-[9px] text-red-400 hover:text-white font-bold px-1 py-0.2 bg-red-800 rounded"
                      >
                        Evet
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className="text-[9px] text-gray-400 hover:text-gray-200 px-1"
                      >
                        İptal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClear(true)}
                      className="p-1.5 bg-gray-900 hover:bg-red-950/50 text-gray-500 hover:text-red-400 border border-gray-800 rounded-lg transition"
                      title="Geçmişi Temizle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Active Model Baseline Summary Pill */}
          <div className="bg-gray-950/80 p-2 rounded-lg border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[11px]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="shrink-0">
                <WireframeThumbnail
                  scale={activeConfig.scale}
                  dimensions={activeConfig.dimensions}
                  materialColor={getMaterialColor(activeConfig.materialName)}
                  materialName={activeConfig.materialName}
                  size={44}
                  showScaleBadge={true}
                  interactive={true}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                  <span className="font-semibold text-gray-200 truncate">Aktif Model Referansı</span>
                </div>
                <div className="text-[9px] text-gray-400 font-mono truncate">
                  {formatDimensions(activeConfig.dimensions)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono flex-wrap text-[10px] shrink-0 justify-end">
              <span className="bg-gray-900 px-2 py-0.5 rounded border border-gray-800 text-gray-300">
                Ölçek: {Math.round((activeConfig.scale.x ?? 1) * 100)}%
                {(Math.abs((activeConfig.scale.x ?? 1) - (activeConfig.scale.y ?? 1)) > 0.005 ||
                  Math.abs((activeConfig.scale.y ?? 1) - (activeConfig.scale.z ?? 1)) > 0.005) &&
                  ` (${activeConfig.scale.x}, ${activeConfig.scale.y}, ${activeConfig.scale.z})`}
              </span>
              <span className="bg-gray-900 px-2 py-0.5 rounded border border-gray-800 text-amber-300">
                {activeConfig.materialName} ({activeConfig.density} g/cm³)
              </span>
              <span className="bg-gray-900 px-2 py-0.5 rounded border border-gray-800 text-cyan-300 font-bold">
                Kütle: {activeConfig.massGrams} g
              </span>
            </div>
          </div>

          {/* History List or Comparison Table */}
          {history.length === 0 ? (
            <div className="bg-gray-950/40 p-4 rounded-xl border border-dashed border-gray-800 text-center flex flex-col items-center justify-center gap-2">
              <History className="w-6 h-6 text-gray-600" />
              <span className="text-xs font-semibold text-gray-300">Henüz Kaydedilmiş Yapılandırma Yok</span>
              <p className="text-[10px] text-gray-500 max-w-sm">
                Farklı ölçek ve malzeme denemelerini kıyaslamak için &quot;Mevcut Ayarı Kaydet&quot; butonuna basabilir veya mevcut ayarları doğrudan CSV olarak indirebilirsiniz.
              </p>
              <button
                type="button"
                onClick={handleExportAllCSV}
                className="mt-1 px-3 py-1.5 bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mevcut Baskı Ayarlarını CSV İndir</span>
              </button>
            </div>
          ) : viewMode === 'table' ? (
            /* Comparison Table View */
            <div className="overflow-x-auto border border-gray-800 rounded-lg bg-gray-950/60 max-h-64 no-scrollbar">
              <table className="w-full text-left text-[10px] font-mono">
                <thead className="bg-gray-900/90 text-gray-400 sticky top-0 border-b border-gray-800">
                  <tr>
                    <th className="p-2 text-center w-12">Tel Kafes</th>
                    <th className="p-2">Zaman</th>
                    <th className="p-2">Ölçek (X,Y,Z)</th>
                    <th className="p-2">Malzeme & ρ</th>
                    <th className="p-2">Hacim</th>
                    <th className="p-2">Kütle</th>
                    <th className="p-2 text-right">Kütle Farkı (Δ)</th>
                    <th className="p-2 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-gray-300">
                  {history.map((entry) => {
                    const delta = calculateConfigDelta(entry, activeConfig);
                    const isApplied = appliedId === entry.id;
                    const isSingleExported = singleCsvFeedbackId === entry.id;

                    return (
                      <tr
                        key={entry.id}
                        className={`hover:bg-gray-900/50 transition ${
                          delta?.isIdentical ? 'bg-indigo-950/20' : ''
                        }`}
                      >
                        <td className="p-1.5 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => setPreviewEntry(entry)}
                            className="inline-block hover:scale-110 active:scale-95 transition-transform"
                            title="Büyük tel kafes 3D önizlemesini aç"
                          >
                            <WireframeThumbnail
                              scale={entry.scale}
                              dimensions={entry.dimensions}
                              materialColor={getMaterialColor(entry.material?.name)}
                              materialName={entry.material?.name}
                              size={38}
                              showScaleBadge={true}
                              interactive={false}
                            />
                          </button>
                        </td>
                        <td className="p-2 whitespace-nowrap text-gray-400">
                          {entry.formattedTime}
                          <span className="block text-[8px] text-gray-600">{entry.formattedDate}</span>
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          {entry.isUniform ? (
                            <span className="text-cyan-300 font-bold">{entry.scalePercent?.x}%</span>
                          ) : (
                            <span>
                              {entry.scalePercent?.x}% / {entry.scalePercent?.y}% / {entry.scalePercent?.z}%
                            </span>
                          )}
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <span className="text-amber-300 font-semibold">{entry.material?.name}</span>
                          <span className="block text-[8px] text-gray-400">{entry.material?.density} g/cm³</span>
                        </td>
                        <td className="p-2 whitespace-nowrap">{entry.volumeCm3} cm³</td>
                        <td className="p-2 whitespace-nowrap font-bold text-emerald-400">
                          {entry.massGrams} g
                        </td>
                        <td className="p-2 whitespace-nowrap text-right">
                          {delta?.isIdentical ? (
                            <span className="text-indigo-400 font-semibold bg-indigo-950/60 px-1 py-0.5 rounded">
                              Aktif Ayar
                            </span>
                          ) : delta ? (
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold ${
                                delta.deltaMassG > 0
                                    ? 'text-amber-400 bg-amber-950/50'
                                    : 'text-emerald-400 bg-emerald-950/50'
                              }`}
                            >
                              {delta.deltaMassG > 0 ? `+${delta.deltaMassG}` : `${delta.deltaMassG}`} g (
                              {delta.deltaMassPercent > 0 ? `+${delta.deltaMassPercent}` : `${delta.deltaMassPercent}`}%)
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-2 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            {onApplyConfig && (
                              <button
                                type="button"
                                onClick={() => handleApply(entry)}
                                disabled={delta?.isIdentical}
                                className={`px-2 py-0.5 rounded font-sans text-[9px] font-semibold transition ${
                                  isApplied
                                    ? 'bg-emerald-600 text-white'
                                    : delta?.isIdentical
                                    ? 'bg-gray-900 text-gray-600 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                                title="Bu ayarı 3D modele uygula"
                              >
                                {isApplied ? 'Uygulandı' : 'Uygula'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleExportSingleCSV(entry)}
                              className={`p-1 rounded transition border ${
                                isSingleExported
                                  ? 'bg-emerald-600 text-white border-emerald-400'
                                  : 'text-emerald-400 hover:text-emerald-300 bg-gray-900 hover:bg-emerald-950/50 border-gray-800'
                              }`}
                              title="Bu yapılandırmayı CSV olarak indir"
                            >
                              {isSingleExported ? <Check className="w-3 h-3" /> : <FileSpreadsheet className="w-3 h-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(entry.id)}
                              className="p-1 text-gray-500 hover:text-red-400 transition"
                              title="Kaydı sil"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Card Comparison View with Wireframe Preview Thumbnails */
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-0.5 no-scrollbar">
              {history.map((entry, index) => {
                const delta = calculateConfigDelta(entry, activeConfig);
                const isApplied = appliedId === entry.id;
                const matColor = getMaterialColor(entry.material?.name);

                return (
                  <div
                    key={entry.id}
                    className={`p-2.5 rounded-xl border transition flex flex-col gap-2 ${
                      delta?.isIdentical
                        ? 'bg-indigo-950/30 border-indigo-500/40 shadow-sm'
                        : 'bg-gray-950/70 hover:bg-gray-900/80 border-gray-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Wireframe Preview Thumbnail */}
                      <div className="shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setPreviewEntry(entry)}
                          className="group relative block rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:scale-105 active:scale-95 transition-transform"
                          title="Tel kafes 3D önizlemesini büyütmek için tıklayın"
                        >
                          <WireframeThumbnail
                            scale={entry.scale}
                            dimensions={entry.dimensions}
                            materialColor={matColor}
                            materialName={entry.material?.name}
                            size={64}
                            showScaleBadge={true}
                            interactive={true}
                          />
                          <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/20 flex items-center justify-center transition-colors pointer-events-none">
                            <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 drop-shadow transition-opacity" />
                          </div>
                        </button>
                      </div>

                      {/* Details Column */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        {/* Top Row: Meta info & Delta Badge */}
                        <div className="flex items-center justify-between text-[10px] flex-wrap gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-300 font-mono">
                              #{history.length - index}
                            </span>
                            <span className="text-gray-400">{entry.formattedTime}</span>
                            <span className="text-gray-600 text-[9px]">{entry.formattedDate}</span>
                            {entry.source?.startsWith('export') && (
                              <span className="text-[8px] bg-cyan-950/70 text-cyan-400 border border-cyan-500/30 px-1 py-0.2 rounded font-mono">
                                Dışa Aktarma
                              </span>
                            )}
                          </div>

                          {/* Delta Mass Pill */}
                          {delta?.isIdentical ? (
                            <span className="text-[9px] font-bold text-indigo-300 bg-indigo-900/60 border border-indigo-500/40 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                              Aktif Model
                            </span>
                          ) : delta ? (
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md flex items-center gap-0.5 ${
                                  delta.deltaMassG > 0
                                    ? 'text-amber-400 bg-amber-950/60 border border-amber-500/30'
                                    : 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30'
                                }`}
                              >
                                {delta.deltaMassG > 0 ? (
                                  <TrendingUp className="w-2.5 h-2.5" />
                                ) : (
                                  <TrendingDown className="w-2.5 h-2.5" />
                                )}
                                <span>
                                  {delta.deltaMassG > 0 ? `+${delta.deltaMassG}` : `${delta.deltaMassG}`} g (
                                  {delta.deltaMassPercent > 0 ? `+${delta.deltaMassPercent}` : `${delta.deltaMassPercent}`}%)
                                </span>
                              </span>
                            </div>
                          ) : null}
                        </div>

                        {/* Middle Row: Comparison Metrics Badges */}
                        <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                          {/* Scale */}
                          <div className="bg-gray-900 p-1.5 rounded border border-gray-800">
                            <span className="text-gray-500 block text-[8px] uppercase">Ölçek:</span>
                            <div className="font-bold text-cyan-300 truncate">
                              {entry.isUniform
                                ? `${entry.scalePercent?.x}%`
                                : `${entry.scalePercent?.x}% / ${entry.scalePercent?.y}% / ${entry.scalePercent?.z}%`}
                            </div>
                          </div>

                          {/* Material & Density */}
                          <div className="bg-gray-900 p-1.5 rounded border border-gray-800">
                            <span className="text-gray-500 block text-[8px] uppercase">Malzeme:</span>
                            <div className="font-bold text-amber-300 truncate">
                              {entry.material?.name}{' '}
                              <span className="text-gray-400 font-normal">({entry.material?.density})</span>
                            </div>
                          </div>

                          {/* Calculated Mass */}
                          <div className="bg-gray-900 p-1.5 rounded border border-gray-800">
                            <span className="text-gray-500 block text-[8px] uppercase">Kütle:</span>
                            <div className="font-bold text-emerald-300 truncate">
                              {entry.massGrams} g{' '}
                              <span className="text-[8px] text-gray-500 font-normal">({entry.volumeCm3} cm³)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Dimensions & Action Buttons */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-gray-800/80 text-[10px]">
                      <span className="text-[9px] text-gray-400 font-mono truncate mr-2 flex items-center gap-1">
                        <Box className="w-3 h-3 text-cyan-400 inline shrink-0" />
                        <span>Boyut: {formatDimensions(entry.dimensions)}</span>
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onApplyConfig && (
                          <button
                            type="button"
                            onClick={() => handleApply(entry)}
                            disabled={delta?.isIdentical}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition flex items-center gap-1 ${
                              isApplied
                                ? 'bg-emerald-600 text-white'
                                : delta?.isIdentical
                                ? 'bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-800'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                            }`}
                            title="Bu ölçek ve malzeme ayarını 3D modele uygula"
                          >
                            {isApplied ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Uygulandı!</span>
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-3 h-3" />
                                <span>Modele Uygula</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Quick CSV Export for this card */}
                        <button
                          type="button"
                          onClick={() => handleExportSingleCSV(entry)}
                          className={`p-1 rounded-md border transition ${
                            singleCsvFeedbackId === entry.id
                              ? 'bg-emerald-600 text-white border-emerald-400'
                              : 'text-emerald-400 hover:text-emerald-300 bg-gray-900 hover:bg-emerald-950/50 border-gray-800 hover:border-emerald-500/40'
                          }`}
                          title="Bu yapılandırmanın baskı ayarlarını CSV olarak indir"
                        >
                          {singleCsvFeedbackId === entry.id ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <FileSpreadsheet className="w-3 h-3" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id)}
                          className="p-1 text-gray-500 hover:text-red-400 bg-gray-900 hover:bg-red-950/40 border border-gray-800 rounded-md transition"
                          title="Bu kaydı sil"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Enlarged Wireframe Configuration Preview Modal */}
      {previewEntry && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewEntry(null)}
        >
          <div
            className="bg-gray-950 border border-indigo-500/40 rounded-2xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                  <Box className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-100">
                    3D Tel Kafes Yapılandırma Önizlemesi
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    {previewEntry.modelName} &bull; {previewEntry.formattedDate} {previewEntry.formattedTime}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewEntry(null)}
                className="p-1.5 text-gray-400 hover:text-gray-100 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Large 3D Wireframe Thumbnail Centerpiece */}
            <div className="bg-gray-900/90 p-4 rounded-xl border border-gray-800 flex flex-col items-center justify-center gap-2">
              <WireframeThumbnail
                scale={previewEntry.scale}
                dimensions={previewEntry.dimensions}
                materialColor={getMaterialColor(previewEntry.material?.name)}
                materialName={previewEntry.material?.name}
                size={160}
                showScaleBadge={true}
                interactive={true}
              />
              <span className="text-[10px] text-gray-400 font-mono text-center">
                İzometrik tel kafes CAD projeksiyonu (Slicer katman ve üçgen yüzeyleri)
              </span>
            </div>

            {/* Detailed Parameters Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-gray-900/70 p-2.5 rounded-lg border border-gray-800">
                <span className="text-[9px] text-gray-500 block uppercase font-sans">Ölçek Faktörleri:</span>
                <span className="font-bold text-cyan-300">
                  X: {Math.round((previewEntry.scale?.x ?? 1) * 100)}% &bull; Y: {Math.round((previewEntry.scale?.y ?? 1) * 100)}% &bull; Z: {Math.round((previewEntry.scale?.z ?? 1) * 100)}%
                </span>
              </div>
              <div className="bg-gray-900/70 p-2.5 rounded-lg border border-gray-800">
                <span className="text-[9px] text-gray-500 block uppercase font-sans">Model Boyutları:</span>
                <span className="font-bold text-gray-200">
                  {formatDimensions(previewEntry.dimensions)}
                </span>
              </div>
              <div className="bg-gray-900/70 p-2.5 rounded-lg border border-gray-800">
                <span className="text-[9px] text-gray-500 block uppercase font-sans">Malzeme & Yoğunluk:</span>
                <span className="font-bold text-amber-300">
                  {previewEntry.material?.name} ({previewEntry.material?.density} g/cm³)
                </span>
              </div>
              <div className="bg-gray-900/70 p-2.5 rounded-lg border border-gray-800">
                <span className="text-[9px] text-gray-500 block uppercase font-sans">Hesaplanan Kütle / Hacim:</span>
                <span className="font-bold text-emerald-300">
                  {previewEntry.massGrams} g &bull; {previewEntry.volumeCm3} cm³
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
              <span className="text-[10px] text-gray-500 font-mono">
                Kayıt ID: {previewEntry.id?.slice?.(-8) || previewEntry.id}
              </span>

              <div className="flex items-center gap-2">
                {/* Download CSV from preview */}
                <button
                  type="button"
                  onClick={() => handleExportSingleCSV(previewEntry)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/60"
                  title="Bu yapılandırmanın baskı ayarlarını CSV olarak indir"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>CSV İndir</span>
                </button>

                {onApplyConfig && (
                  <button
                    type="button"
                    onClick={() => {
                      handleApply(previewEntry);
                      setPreviewEntry(null);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-indigo-950/60"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Bu Ayarı Modele Uygula</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewEntry(null)}
                  className="px-3 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-lg text-xs font-medium transition border border-gray-800"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
