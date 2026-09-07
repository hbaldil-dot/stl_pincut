import { downloadBlob } from './stlExporter.js';

const STORAGE_KEY = 'stl_slicer_config_history_v1';
const MAX_HISTORY_ITEMS = 50;

/**
 * Loads the stored list of previous model configurations from localStorage.
 * @returns {Array<Object>} List of configuration records
 */
export function loadConfigHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[ConfigHistory] Failed to load from localStorage:', err);
    return [];
  }
}

/**
 * Saves configuration history entries into localStorage and triggers an update event.
 * @param {Array<Object>} entries
 */
export function saveConfigHistory(entries) {
  try {
    const safeEntries = Array.isArray(entries) ? entries.slice(0, MAX_HISTORY_ITEMS) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeEntries));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('stl_config_history_updated', { detail: safeEntries }));
    }
  } catch (err) {
    console.warn('[ConfigHistory] Failed to save to localStorage:', err);
  }
}

/**
 * Adds a new model configuration snapshot to the history log.
 *
 * @param {Object} params
 * @param {string} [params.modelName] - Name of STL file
 * @param {{x: number, y: number, z: number}} params.scale - Model scale factors
 * @param {{name: string, density: number, color?: string}} params.material - Material info
 * @param {number} params.volumeCm3 - Calculated solid volume in cm³
 * @param {number} params.massGrams - Calculated solid mass in grams
 * @param {{x: number, y: number, z: number}} [params.dimensions] - Dimensions in mm
 * @param {'manual' | 'export_json' | 'export_csv' | 'export_stl' | 'snapshot'} [params.source='manual']
 * @param {string} [params.notes] - Optional user tag or note
 * @returns {Object} Created history entry
 */
export function addConfigHistoryEntry({
  modelName = 'Model',
  scale = { x: 1, y: 1, z: 1 },
  material = { name: 'PLA', density: 1.24 },
  volumeCm3 = 0,
  massGrams = 0,
  dimensions = { x: 0, y: 0, z: 0 },
  source = 'manual',
  notes = ''
}) {
  const currentHistory = loadConfigHistory();

  const sx = Number(scale?.x ?? 1);
  const sy = Number(scale?.y ?? 1);
  const sz = Number(scale?.z ?? 1);
  const isUniform = Math.abs(sx - sy) < 0.001 && Math.abs(sy - sz) < 0.001;

  const safeDensity = Number(material?.density) || 1.24;
  const safeVol = Number(volumeCm3) || 0;
  const safeMassG = Number(massGrams) || parseFloat((safeVol * safeDensity).toFixed(2));
  const safeMassKg = parseFloat((safeMassG / 1000).toFixed(4));

  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const newEntry = {
    id: `cfg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toISOString(),
    formattedDate: dateStr,
    formattedTime: timeStr,
    modelName: modelName || 'Model',
    scale: {
      x: parseFloat(sx.toFixed(3)),
      y: parseFloat(sy.toFixed(3)),
      z: parseFloat(sz.toFixed(3))
    },
    scalePercent: {
      x: Math.round(sx * 100),
      y: Math.round(sy * 100),
      z: Math.round(sz * 100)
    },
    isUniform,
    material: {
      name: material?.name || 'Özel Malzeme',
      density: parseFloat(safeDensity.toFixed(3)),
      color: material?.color || '#06b6d4'
    },
    volumeCm3: parseFloat(safeVol.toFixed(2)),
    massGrams: parseFloat(safeMassG.toFixed(2)),
    massKg: safeMassKg,
    dimensions: {
      x: parseFloat((Number(dimensions?.x) || 0).toFixed(1)),
      y: parseFloat((Number(dimensions?.y) || 0).toFixed(1)),
      z: parseFloat((Number(dimensions?.z) || 0).toFixed(1))
    },
    exportFormat: (material?.exportFormat || source?.includes('ascii') ? 'ascii' : 'binary'),
    meshDensity: typeof material?.meshDensity === 'number' ? material.meshDensity : 1.0,
    infillPercent: typeof material?.infillPercent === 'number' ? material.infillPercent : null,
    source, // 'manual', 'export_json', 'export_csv', 'export_stl', etc.
    notes: notes || ''
  };

  // Avoid creating identical consecutive entries within 2 seconds
  if (currentHistory.length > 0) {
    const last = currentHistory[0];
    const isDuplicate =
      last.modelName === newEntry.modelName &&
      Math.abs(last.scale.x - newEntry.scale.x) < 0.001 &&
      Math.abs(last.scale.y - newEntry.scale.y) < 0.001 &&
      Math.abs(last.scale.z - newEntry.scale.z) < 0.001 &&
      Math.abs(last.material.density - newEntry.material.density) < 0.001 &&
      Math.abs(last.massGrams - newEntry.massGrams) < 0.05 &&
      Date.now() - new Date(last.timestamp).getTime() < 3000;

    if (isDuplicate) {
      return last;
    }
  }

  const updated = [newEntry, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);
  saveConfigHistory(updated);
  return newEntry;
}

/**
 * Removes an entry by ID from history.
 * @param {string} id
 */
export function deleteConfigHistoryEntry(id) {
  const current = loadConfigHistory();
  const filtered = current.filter((item) => item.id !== id);
  saveConfigHistory(filtered);
  return filtered;
}

/**
 * Clears all configuration history.
 */
export function clearConfigHistory() {
  saveConfigHistory([]);
}

/**
 * Calculates differences between a historical configuration and the active model state.
 *
 * @param {Object} historyEntry
 * @param {Object} currentConfig
 * @param {{x: number, y: number, z: number}} currentConfig.scale
 * @param {number} currentConfig.density
 * @param {number} currentConfig.massGrams
 * @param {number} currentConfig.volumeCm3
 * @returns {Object} Delta analysis
 */
export function calculateConfigDelta(historyEntry, currentConfig) {
  if (!historyEntry || !currentConfig) return null;

  const curMass = Number(currentConfig.massGrams) || 0;
  const histMass = Number(historyEntry.massGrams) || 0;
  const deltaMassG = parseFloat((histMass - curMass).toFixed(2));
  const deltaMassPercent = curMass > 0 ? parseFloat(((deltaMassG / curMass) * 100).toFixed(1)) : 0;

  const curVol = Number(currentConfig.volumeCm3) || 0;
  const histVol = Number(historyEntry.volumeCm3) || 0;
  const deltaVolCm3 = parseFloat((histVol - curVol).toFixed(2));

  const curDensity = Number(currentConfig.density) || 1.24;
  const histDensity = Number(historyEntry.material?.density) || 1.24;
  const deltaDensity = parseFloat((histDensity - curDensity).toFixed(3));

  const curScale = currentConfig.scale || { x: 1, y: 1, z: 1 };
  const histScale = historyEntry.scale || { x: 1, y: 1, z: 1 };
  const isScaleEqual =
    Math.abs(histScale.x - (curScale.x ?? 1)) < 0.005 &&
    Math.abs(histScale.y - (curScale.y ?? 1)) < 0.005 &&
    Math.abs(histScale.z - (curScale.z ?? 1)) < 0.005;

  const isDensityEqual = Math.abs(deltaDensity) < 0.005;

  return {
    deltaMassG,
    deltaMassPercent,
    deltaVolCm3,
    deltaDensity,
    isScaleEqual,
    isDensityEqual,
    isIdentical: isScaleEqual && isDensityEqual
  };
}

/**
 * Exports all configuration comparison records into a structured CSV document.
 * Includes UTF-8 BOM (\uFEFF) for seamless compatibility with Microsoft Excel, Google Sheets, and LibreOffice.
 *
 * @param {Array<Object>} entries - List of history log records
 * @param {Object} [currentConfig] - Active model configuration for delta calculations and fallback
 * @returns {{success: boolean, filename: string, count: number}|boolean}
 */
export function downloadConfigComparisonCSV(entries, currentConfig = null) {
  let list = Array.isArray(entries) && entries.length > 0 ? [...entries] : [];

  // If list is empty but currentConfig is available, generate a baseline row so user can always export their current settings
  if (list.length === 0 && currentConfig) {
    const sx = Number(currentConfig.scale?.x ?? 1);
    const sy = Number(currentConfig.scale?.y ?? 1);
    const sz = Number(currentConfig.scale?.z ?? 1);
    const now = new Date();
    const safeDensity = Number(currentConfig.density) || 1.24;
    const safeVol = Number(currentConfig.volumeCm3) || 0;
    const safeMassG = Number(currentConfig.massGrams) || parseFloat((safeVol * safeDensity).toFixed(2));

    list = [
      {
        id: `cfg_active_${Date.now()}`,
        timestamp: now.toISOString(),
        formattedDate: now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        formattedTime: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        modelName: currentConfig.modelName || 'Model',
        scale: { x: sx, y: sy, z: sz },
        scalePercent: { x: Math.round(sx * 100), y: Math.round(sy * 100), z: Math.round(sz * 100) },
        isUniform: Math.abs(sx - sy) < 0.001 && Math.abs(sy - sz) < 0.001,
        material: {
          name: currentConfig.materialName || 'PLA',
          density: safeDensity
        },
        volumeCm3: safeVol,
        massGrams: safeMassG,
        massKg: parseFloat((safeMassG / 1000).toFixed(4)),
        dimensions: currentConfig.dimensions || { x: 0, y: 0, z: 0 },
        exportFormat: currentConfig.format || 'binary',
        meshDensity: typeof currentConfig.meshDensity === 'number' ? currentConfig.meshDensity : 1.0,
        infillPercent: typeof currentConfig.infillPercent === 'number' ? currentConfig.infillPercent : 20,
        source: 'active_print_settings',
        notes: 'Aktif model konfigürasyonu ve baskı ayarları'
      }
    ];
  }

  if (list.length === 0) return false;

  const headers = [
    'Kayit No (Record ID)',
    'Tarih (Date)',
    'Saat (Time)',
    'Model Adi (Model Name)',
    'Olcek X (%)',
    'Olcek Y (%)',
    'Olcek Z (%)',
    'Olcek Carpani (X,Y,Z)',
    'Uniform Olcek (Uniform Scale)',
    'Boyut X - Genislik (mm)',
    'Boyut Y - Derinlik (mm)',
    'Boyut Z - Yukseklik (mm)',
    'Malzeme Adi (Material)',
    'Malzeme Yogunlugu (g/cm3)',
    'Kati Hacim (cm3)',
    'Kati Hacim (mm3)',
    'Hesaplanan Kutle (g)',
    'Hesaplanan Kutle (kg)',
    'Baski Formati (Export Format)',
    'Mesh Detayi / Yogunlugu (%)',
    'Dolgu Orani (Infill %)',
    'Kayit Kaynagi / Islem (Source)',
    'Aktif Modele Gore Kutle Farki (g)',
    'Aktif Modele Gore Kutle Farki (%)',
    'Aktif Modele Gore Hacim Farki (cm3)',
    'Aktif Modele Gore Yogunluk Farki (g/cm3)',
    'Zaman Damgasi (ISO Timestamp)',
    'Notlar / Aciklama (Notes)'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = list.map((item, index) => {
    let deltaMassGStr = '-';
    let deltaMassPctStr = '-';
    let deltaVolCm3Str = '-';
    let deltaDensityStr = '-';

    if (currentConfig && currentConfig.massGrams) {
      const delta = calculateConfigDelta(item, currentConfig);
      if (delta) {
        deltaMassGStr = delta.deltaMassG > 0 ? `+${delta.deltaMassG}` : `${delta.deltaMassG}`;
        deltaMassPctStr = delta.deltaMassPercent > 0 ? `+${delta.deltaMassPercent}%` : `${delta.deltaMassPercent}%`;
        deltaVolCm3Str = delta.deltaVolCm3 > 0 ? `+${delta.deltaVolCm3}` : `${delta.deltaVolCm3}`;
        deltaDensityStr = delta.deltaDensity > 0 ? `+${delta.deltaDensity}` : `${delta.deltaDensity}`;
      }
    }

    const scaleFactorStr = `${item.scale?.x ?? 1}, ${item.scale?.y ?? 1}, ${item.scale?.z ?? 1}`;
    const meshDensityPct = item.meshDensity ? `${Math.round(item.meshDensity * 100)}%` : '100%';
    const infillStr = item.infillPercent !== null && item.infillPercent !== undefined ? `%${item.infillPercent}` : 'Standart (%20)';
    const volMm3 = parseFloat(((item.volumeCm3 || 0) * 1000).toFixed(1));

    return [
      escapeCSV(item.id || `#${list.length - index}`),
      escapeCSV(item.formattedDate || ''),
      escapeCSV(item.formattedTime || ''),
      escapeCSV(item.modelName || 'Model'),
      item.scalePercent?.x ?? Math.round((item.scale?.x ?? 1) * 100),
      item.scalePercent?.y ?? Math.round((item.scale?.y ?? 1) * 100),
      item.scalePercent?.z ?? Math.round((item.scale?.z ?? 1) * 100),
      escapeCSV(scaleFactorStr),
      item.isUniform ? 'Evet (Uniform)' : 'Hayir (Non-uniform)',
      item.dimensions?.x ?? 0,
      item.dimensions?.y ?? 0,
      item.dimensions?.z ?? 0,
      escapeCSV(item.material?.name || 'Ozel Malzeme'),
      item.material?.density ?? 1.24,
      item.volumeCm3 ?? 0,
      volMm3,
      item.massGrams ?? 0,
      item.massKg ?? 0,
      escapeCSV((item.exportFormat || 'binary').toUpperCase()),
      escapeCSV(meshDensityPct),
      escapeCSV(infillStr),
      escapeCSV(item.source || 'manual'),
      escapeCSV(deltaMassGStr),
      escapeCSV(deltaMassPctStr),
      escapeCSV(deltaVolCm3Str),
      escapeCSV(deltaDensityStr),
      escapeCSV(item.timestamp || ''),
      escapeCSV(item.notes || '')
    ].join(',');
  });

  const headerRow = headers.map(escapeCSV).join(',');
  const csvContent = [headerRow, ...rows].join('\r\n');

  // Prepend UTF-8 BOM (\uFEFF) to guarantee correct multi-language display in Excel and Calc
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

  const primaryName = list[0]?.modelName || currentConfig?.modelName || 'Model';
  const cleanName = String(primaryName)
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_');
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `${cleanName}_print_settings_history_${dateStamp}.csv`;

  downloadBlob(blob, filename);
  return { success: true, filename, count: list.length };
}

/**
 * Exports a single configuration record to CSV file.
 *
 * @param {Object} entry
 * @param {Object} [currentConfig]
 * @returns {Object|boolean}
 */
export function downloadSingleConfigCSV(entry, currentConfig = null) {
  if (!entry) return false;
  return downloadConfigComparisonCSV([entry], currentConfig);
}

/**
 * Exports all configuration comparison records into a structured JSON file.
 *
 * @param {Array<Object>} entries
 * @param {Object} [currentConfig]
 */
export function downloadConfigComparisonJSON(entries, currentConfig = null) {
  if (!entries || entries.length === 0) return;

  const payload = {
    exportedAt: new Date().toISOString(),
    totalConfigurations: entries.length,
    activeBaselineConfig: currentConfig
      ? {
          scale: currentConfig.scale,
          density: currentConfig.density,
          massGrams: currentConfig.massGrams,
          volumeCm3: currentConfig.volumeCm3
        }
      : null,
    history: entries.map((e) => ({
      ...e,
      comparisonToActive: currentConfig ? calculateConfigDelta(e, currentConfig) : null
    }))
  };

  const jsonContent = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, `model_configuration_comparison_${Date.now()}.json`);
}
