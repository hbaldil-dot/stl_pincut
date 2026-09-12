import * as THREE from 'three';

/**
 * Built-in default cutting & pin alignment presets
 * Covering common 3D printing workflows across different slicers, nozzles, materials and tolerances.
 */
export const BUILT_IN_CUTTING_PRESETS = [
  {
    id: 'preset_standard_fdm_dowel',
    name: 'Standart FDM Dübel (Ø8 × 10mm)',
    category: 'Standart FDM',
    description: 'PLA ve PETG için genel amaçlı en dengeli silindirik erkek/dişi pim. 0.20mm 3D yazıcı toleransı.',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    clippingConfig: {
      axis: 'y',
      offset: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      negate: false,
      showPlaneHelper: true,
      addPinOnSlice: true,
      highlightInterior: true,
      interiorColor: '#f59e0b'
    },
    pinConfig: {
      mode: 'pin_and_hole',
      diameter: 8.0,
      size: 8.0,
      depth: 10.0,
      height: 10.0,
      clearance: 0.20,
      type: 'cylinder',
      taper: 0.85,
      snapToNormal: true,
      snapToCenter: true,
      flushFit: true,
      offsetU: 0,
      offsetV: 0,
      magneticThreshold: 3.0
    }
  },
  {
    id: 'preset_heavy_duty_hex_dowel',
    name: 'Ağır Hizmet Altıgen Dübel (Ø10 × 15mm)',
    category: 'Ağır Hizmet & Yüksek Yük',
    description: 'Çift taraflı altıgen soket ve ayrı basılan kilitleme dübeli. Yüksek burulma ve dönme direnci.',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    clippingConfig: {
      axis: 'y',
      offset: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      negate: false,
      showPlaneHelper: true,
      addPinOnSlice: true,
      highlightInterior: true,
      interiorColor: '#f59e0b'
    },
    pinConfig: {
      mode: 'holes_both',
      diameter: 10.0,
      size: 10.0,
      depth: 15.0,
      height: 15.0,
      clearance: 0.25,
      type: 'hex',
      taper: 0.90,
      snapToNormal: true,
      snapToCenter: true,
      flushFit: true,
      offsetU: 0,
      offsetV: 0,
      magneticThreshold: 3.0
    }
  },
  {
    id: 'preset_resin_sla_micro',
    name: 'SLA / Reçine Mikro Pim (Ø4 × 6mm)',
    category: 'Yüksek Hassasiyet / SLA',
    description: 'Reçine veya 0.2mm nozul için 0.10mm hassas geçme toleransı. Küçük figür ve biblolar için idealdir.',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    clippingConfig: {
      axis: 'y',
      offset: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      negate: false,
      showPlaneHelper: true,
      addPinOnSlice: true,
      highlightInterior: true,
      interiorColor: '#f59e0b'
    },
    pinConfig: {
      mode: 'pin_and_hole',
      diameter: 4.0,
      size: 4.0,
      depth: 6.0,
      height: 6.0,
      clearance: 0.10,
      type: 'cylinder',
      taper: 0.90,
      snapToNormal: true,
      snapToCenter: true,
      flushFit: true,
      offsetU: 0,
      offsetV: 0,
      magneticThreshold: 2.0
    }
  },
  {
    id: 'preset_easy_slide_pyramid',
    name: 'Hızlı Montaj Piramit (Ø6 × 8mm)',
    category: 'Hızlı Geçme / Piramit',
    description: 'Eğimli piramit konikliği sayesinde sıkışmadan kolayca birbirine geçen yönlendirici pim yapısı.',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    clippingConfig: {
      axis: 'y',
      offset: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      negate: false,
      showPlaneHelper: true,
      addPinOnSlice: true,
      highlightInterior: true,
      interiorColor: '#f59e0b'
    },
    pinConfig: {
      mode: 'pin_and_hole',
      diameter: 6.0,
      size: 6.0,
      depth: 8.0,
      height: 8.0,
      clearance: 0.20,
      type: 'pyramid',
      taper: 0.75,
      snapToNormal: true,
      snapToCenter: true,
      flushFit: true,
      offsetU: 0,
      offsetV: 0,
      magneticThreshold: 3.0
    }
  },
  {
    id: 'preset_clean_flat_split',
    name: 'Düz Tabla Kesimi (Pimsiz)',
    category: 'Pimsiz Düz Kesim',
    description: 'İçerisinde pim veya delik oluşturulmayan temiz düzlem kesimi. Tabla alanına sığmayan parçalar için.',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    clippingConfig: {
      axis: 'y',
      offset: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      negate: false,
      showPlaneHelper: true,
      addPinOnSlice: false,
      highlightInterior: true,
      interiorColor: '#f59e0b'
    },
    pinConfig: {
      mode: 'flat',
      diameter: 8.0,
      size: 8.0,
      depth: 10.0,
      height: 10.0,
      clearance: 0.20,
      type: 'cylinder',
      taper: 0.85,
      snapToNormal: true,
      snapToCenter: true,
      flushFit: true,
      offsetU: 0,
      offsetV: 0,
      magneticThreshold: 3.0
    }
  },
  {
    id: 'preset_horizontal_x_split',
    name: 'Yatay X Ekseni Kesimi (Ø8 × 12mm)',
    category: 'Eksenel Yönelimler',
    description: 'Sağ-Sol (X) ekseni doğrultusunda dikey bölme ve uzatılmış 12mm kılavuz pim montajı.',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    clippingConfig: {
      axis: 'x',
      offset: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      negate: false,
      showPlaneHelper: true,
      addPinOnSlice: true,
      highlightInterior: true,
      interiorColor: '#f59e0b'
    },
    pinConfig: {
      mode: 'pin_and_hole',
      diameter: 8.0,
      size: 8.0,
      depth: 12.0,
      height: 12.0,
      clearance: 0.20,
      type: 'cylinder',
      taper: 0.85,
      snapToNormal: true,
      snapToCenter: true,
      flushFit: true,
      offsetU: 0,
      offsetV: 0,
      magneticThreshold: 3.0
    }
  },
  {
    id: 'preset_vertical_z_depth_split',
    name: 'Derinlik Z Ekseni Kesimi (Ø8 × 10mm Çift Delik)',
    category: 'Eksenel Yönelimler',
    description: 'Ön-Arka (Z) ekseni boyunca kesim. Her iki yarıya çift delik açarak bağımsız dübel ile birleştirme.',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    clippingConfig: {
      axis: 'z',
      offset: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      negate: false,
      showPlaneHelper: true,
      addPinOnSlice: true,
      highlightInterior: true,
      interiorColor: '#f59e0b'
    },
    pinConfig: {
      mode: 'holes_both',
      diameter: 8.0,
      size: 8.0,
      depth: 10.0,
      height: 10.0,
      clearance: 0.20,
      type: 'cylinder',
      taper: 0.85,
      snapToNormal: true,
      snapToCenter: true,
      flushFit: true,
      offsetU: 0,
      offsetV: 0,
      magneticThreshold: 3.0
    }
  },
  {
    id: 'preset_loose_fit_fdm',
    name: 'Geniş Toleranslı Dübel (Ø8 × 10mm, +0.35mm)',
    category: 'Standart FDM',
    description: 'Kalın nozul (0.6 - 0.8mm) veya esnek/şişme yapan filamentler için rahat geçme toleransı (+0.35mm).',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    clippingConfig: {
      axis: 'y',
      offset: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      negate: false,
      showPlaneHelper: true,
      addPinOnSlice: true,
      highlightInterior: true,
      interiorColor: '#f59e0b'
    },
    pinConfig: {
      mode: 'pin_and_hole',
      diameter: 8.0,
      size: 8.0,
      depth: 10.0,
      height: 10.0,
      clearance: 0.35,
      type: 'cylinder',
      taper: 0.85,
      snapToNormal: true,
      snapToCenter: true,
      flushFit: true,
      offsetU: 0,
      offsetV: 0,
      magneticThreshold: 3.0
    }
  }
];

export const PRESET_STORAGE_KEY = 'stl_cutting_presets_v1';
export const PRESET_CATEGORIES = [
  'Tümü',
  'Standart FDM',
  'Ağır Hizmet & Yüksek Yük',
  'Yüksek Hassasiyet / SLA',
  'Hızlı Geçme / Piramit',
  'Pimsiz Düz Kesim',
  'Eksenel Yönelimler',
  'Özel Şablonlar'
];

/**
 * Retrieves custom presets saved in browser localStorage
 * @returns {Array} List of custom presets
 */
export function loadCustomPresets() {
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse custom cutting presets from localStorage:', err);
    return [];
  }
}

/**
 * Saves or updates custom presets in localStorage
 * @param {Array} presets Full list of custom presets
 */
export function saveCustomPresetsList(presets) {
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  } catch (err) {
    console.error('Failed to save cutting presets to localStorage:', err);
  }
}

/**
 * Retrieves all presets (built-in + custom)
 * @returns {Array} Combined list
 */
export function loadAllCuttingPresets() {
  const custom = loadCustomPresets();
  return [...BUILT_IN_CUTTING_PRESETS, ...custom];
}

/**
 * Saves a new custom preset created by the user
 * @param {Object} params Preset details
 * @returns {Object} Newly created preset object
 */
export function saveNewCustomPreset({
  name,
  description = '',
  category = 'Özel Şablonlar',
  clippingConfig,
  pinConfig
}) {
  const trimmedName = (name || '').trim() || `Özel Şablon ${new Date().toLocaleTimeString('tr-TR')}`;
  const customPresets = loadCustomPresets();

  // Normalize clipping config serializable data
  const safeClipping = {
    axis: clippingConfig.axis || 'y',
    offset: typeof clippingConfig.offset === 'number' ? clippingConfig.offset : 0,
    rotX: typeof clippingConfig.rotX === 'number' ? clippingConfig.rotX : 0,
    rotY: typeof clippingConfig.rotY === 'number' ? clippingConfig.rotY : 0,
    rotZ: typeof clippingConfig.rotZ === 'number' ? clippingConfig.rotZ : 0,
    negate: !!clippingConfig.negate,
    showPlaneHelper: clippingConfig.showPlaneHelper !== false,
    addPinOnSlice: clippingConfig.addPinOnSlice !== false,
    highlightInterior: clippingConfig.highlightInterior !== false,
    interiorColor: clippingConfig.interiorColor || '#f59e0b'
  };

  if (clippingConfig.normal) {
    safeClipping.normal = {
      x: clippingConfig.normal.x ?? 0,
      y: clippingConfig.normal.y ?? 1,
      z: clippingConfig.normal.z ?? 0
    };
  }

  // Normalize pin config serializable data
  const diam = clippingConfig.addPinOnSlice === false && pinConfig.mode === 'flat'
    ? (pinConfig.diameter ?? 8)
    : (pinConfig.diameter ?? pinConfig.size ?? 8);
  const dpth = pinConfig.depth ?? pinConfig.height ?? 10;

  const safePin = {
    mode: pinConfig.mode || 'pin_and_hole',
    diameter: diam,
    size: diam,
    depth: dpth,
    height: dpth,
    clearance: typeof pinConfig.clearance === 'number' ? pinConfig.clearance : 0.20,
    type: pinConfig.type || 'cylinder',
    taper: typeof pinConfig.taper === 'number' ? pinConfig.taper : 0.85,
    snapToNormal: pinConfig.snapToNormal !== false,
    snapToCenter: pinConfig.snapToCenter !== false,
    flushFit: pinConfig.flushFit !== false,
    offsetU: typeof pinConfig.offsetU === 'number' ? pinConfig.offsetU : 0,
    offsetV: typeof pinConfig.offsetV === 'number' ? pinConfig.offsetV : 0,
    magneticThreshold: typeof pinConfig.magneticThreshold === 'number' ? pinConfig.magneticThreshold : 3.0
  };

  const newPreset = {
    id: `custom_preset_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name: trimmedName,
    category: category || 'Özel Şablonlar',
    description: (description || '').trim() || `Kullanıcı tarafından kaydedilen kesim ve pim ayarı.`,
    isBuiltIn: false,
    createdAt: new Date().toISOString(),
    clippingConfig: safeClipping,
    pinConfig: safePin
  };

  customPresets.unshift(newPreset);
  saveCustomPresetsList(customPresets);
  return newPreset;
}

/**
 * Deletes a custom preset by ID
 * @param {string} presetId
 * @returns {boolean} Whether item was deleted
 */
export function deleteCustomPreset(presetId) {
  const customPresets = loadCustomPresets();
  const filtered = customPresets.filter((p) => p.id !== presetId);
  if (filtered.length !== customPresets.length) {
    saveCustomPresetsList(filtered);
    return true;
  }
  return false;
}

/**
 * Applies preset settings to current active viewport configs,
 * producing updated Three.js Vector3 structures and complete state blocks.
 * @param {Object} preset Preset object to apply
 * @param {Object} currentClipping Current clippingConfig
 * @param {Object} currentPin Current pinConfig
 * @returns {{ nextClippingConfig: Object, nextPinConfig: Object }}
 */
export function resolvePresetConfigs(preset, currentClipping, currentPin) {
  const pClip = preset.clippingConfig || {};
  const pPin = preset.pinConfig || {};

  let targetNormal = new THREE.Vector3(0, 1, 0);
  if (pClip.axis === 'x') {
    targetNormal.set(1, 0, 0);
  } else if (pClip.axis === 'y') {
    targetNormal.set(0, 1, 0);
  } else if (pClip.axis === 'z') {
    targetNormal.set(0, 0, 1);
  } else if (pClip.normal) {
    targetNormal.set(pClip.normal.x ?? 0, pClip.normal.y ?? 1, pClip.normal.z ?? 0);
  } else if (currentClipping?.normal) {
    targetNormal.copy(currentClipping.normal);
  }

  if (pClip.negate) {
    targetNormal.negate();
  }

  const nextClippingConfig = {
    ...currentClipping,
    enabled: true,
    axis: pClip.axis || currentClipping.axis || 'y',
    offset: typeof pClip.offset === 'number' ? pClip.offset : 0,
    rotX: typeof pClip.rotX === 'number' ? pClip.rotX : 0,
    rotY: typeof pClip.rotY === 'number' ? pClip.rotY : 0,
    rotZ: typeof pClip.rotZ === 'number' ? pClip.rotZ : 0,
    negate: !!pClip.negate,
    showPlaneHelper: pClip.showPlaneHelper !== false,
    addPinOnSlice: pClip.addPinOnSlice !== false,
    highlightInterior: pClip.highlightInterior !== false,
    interiorColor: pClip.interiorColor || currentClipping.interiorColor || '#f59e0b',
    normal: targetNormal
  };

  const diam = pPin.diameter ?? pPin.size ?? currentPin.diameter ?? 8.0;
  const dpth = pPin.depth ?? pPin.height ?? currentPin.depth ?? 10.0;

  const nextPinConfig = {
    ...currentPin,
    mode: pPin.mode || currentPin.mode || 'pin_and_hole',
    diameter: diam,
    size: diam,
    depth: dpth,
    height: dpth,
    clearance: typeof pPin.clearance === 'number' ? pPin.clearance : (currentPin.clearance ?? 0.20),
    type: pPin.type || currentPin.type || 'cylinder',
    taper: typeof pPin.taper === 'number' ? pPin.taper : (currentPin.taper ?? 0.85),
    snapToNormal: pPin.snapToNormal !== false,
    snapToCenter: pPin.snapToCenter !== false,
    flushFit: pPin.flushFit !== false,
    offsetU: typeof pPin.offsetU === 'number' ? pPin.offsetU : 0,
    offsetV: typeof pPin.offsetV === 'number' ? pPin.offsetV : 0,
    magneticThreshold: typeof pPin.magneticThreshold === 'number' ? pPin.magneticThreshold : 3.0
  };

  return { nextClippingConfig, nextPinConfig };
}

/**
 * Computes a list of key differences between a preset and current settings for previewing
 * @param {Object} preset
 * @param {Object} currentClipping
 * @param {Object} currentPin
 * @returns {Array<string>} Human-readable differences
 */
export function computePresetDelta(preset, currentClipping, currentPin) {
  const diffs = [];
  const pClip = preset.clippingConfig || {};
  const pPin = preset.pinConfig || {};

  if (pClip.axis && currentClipping?.axis && pClip.axis !== currentClipping.axis) {
    diffs.push(`Eksen: ${currentClipping.axis.toUpperCase()} → ${pClip.axis.toUpperCase()}`);
  }

  if (pPin.mode && currentPin?.mode && pPin.mode !== currentPin.mode) {
    const modeName = (m) =>
      m === 'holes_both' ? 'Çift Delik' : m === 'pin_and_hole' ? 'Pim+Delik' : m === 'hole_only' ? 'Delik' : m === 'pin_only' ? 'Pim' : 'Düz';
    diffs.push(`Bağlantı: ${modeName(currentPin.mode)} → ${modeName(pPin.mode)}`);
  }

  const pDiam = pPin.diameter ?? pPin.size;
  const cDiam = currentPin?.diameter ?? currentPin?.size;
  if (pDiam !== undefined && cDiam !== undefined && Math.abs(pDiam - cDiam) > 0.05) {
    diffs.push(`Çap: Ø${cDiam}mm → Ø${pDiam}mm`);
  }

  const pDepth = pPin.depth ?? pPin.height;
  const cDepth = currentPin?.depth ?? currentPin?.height;
  if (pDepth !== undefined && cDepth !== undefined && Math.abs(pDepth - cDepth) > 0.05) {
    diffs.push(`Derinlik: ${cDepth}mm → ${pDepth}mm`);
  }

  const pClear = pPin.clearance;
  const cClear = currentPin?.clearance;
  if (pClear !== undefined && cClear !== undefined && Math.abs(pClear - cClear) > 0.005) {
    diffs.push(`Tolerans: +${cClear.toFixed(2)}mm → +${pClear.toFixed(2)}mm`);
  }

  if (pPin.type && currentPin?.type && pPin.type !== currentPin.type) {
    diffs.push(`Pim Tipi: ${currentPin.type} → ${pPin.type}`);
  }

  return diffs;
}

/**
 * Export custom presets to downloadable JSON
 * @returns {string} JSON string
 */
export function exportPresetsToJSON() {
  const allCustom = loadCustomPresets();
  return JSON.stringify(
    {
      version: 1,
      appName: 'STL PinCut 3D',
      exportedAt: new Date().toISOString(),
      presets: allCustom
    },
    null,
    2
  );
}

/**
 * Import presets from JSON string
 * @param {string} jsonString
 * @returns {{ importedCount: number, error: string|null }}
 */
export function importPresetsFromJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    const presetsToImport = Array.isArray(data) ? data : data.presets;
    if (!Array.isArray(presetsToImport)) {
      return { importedCount: 0, error: 'Geçersiz JSON formatı: Şablon dizisi bulunamadı.' };
    }

    const currentCustom = loadCustomPresets();
    let importedCount = 0;

    presetsToImport.forEach((item) => {
      if (item && item.name && (item.clippingConfig || item.pinConfig)) {
        const newPreset = {
          id: `custom_preset_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: item.name,
          category: item.category || 'Özel Şablonlar',
          description: item.description || 'İçe aktarılan şablon',
          isBuiltIn: false,
          createdAt: new Date().toISOString(),
          clippingConfig: item.clippingConfig || {},
          pinConfig: item.pinConfig || {}
        };
        currentCustom.unshift(newPreset);
        importedCount++;
      }
    });

    if (importedCount > 0) {
      saveCustomPresetsList(currentCustom);
    }

    return { importedCount, error: null };
  } catch (err) {
    return { importedCount: 0, error: 'JSON dosyası okunamadı: ' + err.message };
  }
}
