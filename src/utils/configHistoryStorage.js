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
    source, // 'manual', 'export_json', 'export_csv', etc.
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
 *
 * @param {Array<Object>} entries
 * @param {Object} [currentConfig]
 */
export function downloadConfigComparisonCSV(entries, currentConfig = null) {
  if (!entries || entries.length === 0) return;

  const rows = [
    [
      'Tarih / Saat',
      'Model Adi',
      'Olcek X (%)',
      'Olcek Y (%)',
      'Olcek Z (%)',
      'Esit Olcek (Uniform)',
      'Malzeme Adi',
      'Yogunluk (g/cm3)',
      'Hacim (cm3)',
      'Hesaplanan Kutle (g)',
      'Hesaplanan Kutle (kg)',
      'Boyut X (mm)',
      'Boyut Y (mm)',
      'Boyut Z (mm)',
      'Kayit Kaynagi',
      'Mevcut Ayara Gore Kutle Farki (g)',
      'Mevcut Ayara Gore Kutle Farki (%)'
    ]
  ];

  entries.forEach((item) => {
    let deltaMassGStr = '-';
    let deltaMassPctStr = '-';
    if (currentConfig && currentConfig.massGrams) {
      const delta = calculateConfigDelta(item, currentConfig);
      if (delta) {
        deltaMassGStr = (delta.deltaMassG > 0 ? `+${delta.deltaMassG}` : `${delta.deltaMassG}`);
        deltaMassPctStr = (delta.deltaMassPercent > 0 ? `+${delta.deltaMassPercent}%` : `${delta.deltaMassPercent}%`);
      }
    }

    rows.push([
      `"${item.formattedDate} ${item.formattedTime}"`,
      `"${(item.modelName || 'Model').replace(/"/g, '""')}"`,
      item.scalePercent?.x ?? Math.round(item.scale.x * 100),
      item.scalePercent?.y ?? Math.round(item.scale.y * 100),
      item.scalePercent?.z ?? Math.round(item.scale.z * 100),
      item.isUniform ? 'Evet' : 'Hayir',
      `"${(item.material?.name || 'Ozel').replace(/"/g, '""')}"`,
      item.material?.density ?? 1.24,
      item.volumeCm3,
      item.massGrams,
      item.massKg,
      item.dimensions?.x ?? 0,
      item.dimensions?.y ?? 0,
      item.dimensions?.z ?? 0,
      `"${item.source || 'manual'}"`,
      deltaMassGStr,
      deltaMassPctStr
    ]);
  });

  const csvContent = rows.map((r) => r.join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `model_configuration_comparison_${Date.now()}.csv`);
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
