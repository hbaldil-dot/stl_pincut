/**
 * Export Settings, Presets, Unit Conversions, and File Naming Conventions Storage.
 * Provides persistent saving, loading, importing, and exporting of user configuration profiles.
 */

export const STORAGE_KEY_PRESETS = 'stl_export_presets_v1';
export const STORAGE_KEY_ACTIVE_CONFIG = 'stl_export_active_config_v1';

/**
 * Standard Unit Definitions with Scale Factors relative to Millimeters (standard 3D printing STL coordinate system)
 */
export const EXPORT_UNITS = {
  mm: {
    id: 'mm',
    name: 'Milimetre (mm)',
    shortName: 'mm',
    scaleFactor: 1.0,
    description: '3D Baskı (FDM/SLA) ve dilimleyiciler (Cura, Bambu, Prusa) için evrensel standart'
  },
  cm: {
    id: 'cm',
    name: 'Santimetre (cm)',
    shortName: 'cm',
    scaleFactor: 0.1, // 1 mm = 0.1 cm
    description: '10 mm = 1 cm. Bazı mimari ve animasyon programları için'
  },
  m: {
    id: 'm',
    name: 'Metre (m)',
    shortName: 'm',
    scaleFactor: 0.001, // 1 mm = 0.001 m
    description: '1000 mm = 1 m. Büyük ölçekli simülasyon ve CAD ortamları için'
  },
  in: {
    id: 'in',
    name: 'İnç (Inch - in)',
    shortName: 'in',
    scaleFactor: 1 / 25.4, // ~0.03937007874
    description: '1 inç = 25.4 mm. ABD ve İngiliz ölçü birimi standartları için'
  }
};

/**
 * Part Naming Styles
 */
export const PART_NAMING_STYLES = [
  { id: 'part_num', label: 'Part_1 / Part_2', desc: 'Standart numaralandırma', p1: 'Part_1', p2: 'Part_2' },
  { id: 'part_alpha', label: 'Part_A / Part_B', desc: 'Alfabetik harfler', p1: 'Part_A', p2: 'Part_B' },
  { id: 'feature', label: 'Part_1_Pin / Part_2_Socket', desc: 'Özellik/fonksiyon tabanlı', p1: 'Part_1_Pin', p2: 'Part_2_Socket' },
  { id: 'short', label: 'P1 / P2', desc: 'Kısa etiketler', p1: 'P1', p2: 'P2' },
  { id: 'halves', label: 'Half_1 / Half_2', desc: 'Yarım parçalar', p1: 'Half_1', p2: 'Half_2' }
];

/**
 * Case Conventions
 */
export const CASE_CONVENTIONS = [
  { id: 'as_is', label: 'Orijinal (As-Is)' },
  { id: 'lowercase', label: 'küçük_harf (lowercase)' },
  { id: 'uppercase', label: 'BÜYÜK_HARF (UPPERCASE)' },
  { id: 'snake_case', label: 'snake_case (alt_cizgi)' },
  { id: 'kebab_case', label: 'kebab-case (tireli)' }
];

/**
 * Pre-defined Common Naming Patterns
 */
export const NAMING_PATTERN_TEMPLATES = [
  { pattern: '{name}_{part}', label: 'Basit: Model_Part_1.stl' },
  { pattern: '{name}_{part}_{unit}', label: 'Birimli: Model_Part_1_mm.stl' },
  { pattern: '{name}_{part}_{density}', label: 'Hassasiyetli: Model_Part_1_100pct.stl' },
  { pattern: '{name}_{part}_{format}', label: 'Formatlı: Model_Part_1_bin.stl' },
  { pattern: '{name}_{date}_{part}', label: 'Tarihli: Model_2026-09-10_Part_1.stl' },
  { pattern: '{prefix}{name}_{part}{suffix}', label: 'Ön Ek & Son Ek: PRJ_Model_Part_1_v1.stl' }
];

/**
 * Default Export Settings Configuration
 */
export const DEFAULT_EXPORT_SETTINGS = {
  // Precision & Format
  format: 'binary', // 'binary' | 'ascii'
  density: 1.0, // 0.10 - 1.0
  preset: 'original', // 'original' | 'high' | 'medium' | 'draft' | 'custom'
  decimalPrecision: 4, // 2, 3, 4, 6 (for ASCII)
  
  // Units & Scale
  unit: 'mm',
  unitScale: 1.0,
  applyUnitScale: false, // Apply scale multiplier to geometry vertices on export
  customScale: 1.0,
  
  // File Naming Conventions
  namingPattern: '{name}_{part}',
  partNamingStyle: 'part_num',
  prefix: '',
  suffix: '',
  caseConvention: 'as_is',
  includeDate: false,
  dateFormat: 'YYYY-MM-DD',
  dowelNaming: 'Alignment_Dowel_Pin',
  combinedNaming: 'Combined_Assembly'
};

/**
 * Built-in Curated Presets
 */
export const BUILT_IN_PRESETS = [
  {
    id: 'preset_standard_3d',
    name: 'Standart 3D Baskı (mm - Binary)',
    category: '3D Baskı',
    isBuiltIn: true,
    description: 'Cura, PrusaSlicer, Bambu Studio ve Orca Slicer için optimize kompakt Binary STL.',
    config: {
      format: 'binary',
      density: 1.0,
      preset: 'original',
      decimalPrecision: 4,
      unit: 'mm',
      unitScale: 1.0,
      applyUnitScale: false,
      namingPattern: '{name}_{part}',
      partNamingStyle: 'part_num',
      prefix: '',
      suffix: '',
      caseConvention: 'as_is',
      dowelNaming: 'Alignment_Dowel_Pin',
      combinedNaming: 'Combined_Assembly'
    }
  },
  {
    id: 'preset_high_precision_ascii',
    name: 'Yüksek Hassasiyetli CAD & Kalıp (ASCII)',
    category: 'Mühendislik',
    isBuiltIn: true,
    description: 'Metroloji, CNC simülasyonu ve CAD doğrulaması için 6 haneli ondalık hassasiyetli ASCII format.',
    config: {
      format: 'ascii',
      density: 1.0,
      preset: 'original',
      decimalPrecision: 6,
      unit: 'mm',
      unitScale: 1.0,
      applyUnitScale: false,
      namingPattern: '{name}_{part}_HighPrec',
      partNamingStyle: 'feature',
      prefix: '',
      suffix: '_HighPrec',
      caseConvention: 'as_is',
      dowelNaming: 'Precision_Dowel_Pin_6Dec',
      combinedNaming: 'Combined_Assembly_Validated'
    }
  },
  {
    id: 'preset_imperial_inch',
    name: 'İnç / Imperial Standardı (1/25.4 in)',
    category: 'Mühendislik',
    isBuiltIn: true,
    description: 'İnç tabanlı CAM/CNC yazılımları için koordinatları inç birimine ölçekleyerek dışa aktarır.',
    config: {
      format: 'binary',
      density: 1.0,
      preset: 'original',
      decimalPrecision: 4,
      unit: 'in',
      unitScale: 1 / 25.4,
      applyUnitScale: true,
      namingPattern: '{name}_{part}_in',
      partNamingStyle: 'part_num',
      prefix: '',
      suffix: '_in',
      caseConvention: 'as_is',
      dowelNaming: 'Alignment_Dowel_Pin_in',
      combinedNaming: 'Combined_Assembly_in'
    }
  },
  {
    id: 'preset_draft_lightweight',
    name: 'Taslak & Hafif Ağ (%50 Poligon)',
    category: 'Hızlı Prototip',
    isBuiltIn: true,
    description: 'Hızlı önizleme, web 3D görüntüleyiciler ve hafif dilimleme için %50 poligon azaltmalı ağ.',
    config: {
      format: 'binary',
      density: 0.5,
      preset: 'medium',
      decimalPrecision: 3,
      unit: 'mm',
      unitScale: 1.0,
      applyUnitScale: false,
      namingPattern: '{name}_{part}_Draft_50pct',
      partNamingStyle: 'short',
      prefix: '',
      suffix: '_50pct',
      caseConvention: 'as_is',
      dowelNaming: 'Dowel_Pin_P50',
      combinedNaming: 'Combined_P50'
    }
  },
  {
    id: 'preset_bambu_production',
    name: 'Bambu / Orca Slicer Çoklu Parça',
    category: '3D Baskı',
    isBuiltIn: true,
    description: 'Çoklu parça tablasında parçaları ve montaj özelliklerini (Pim, Soket) anında ayırt eder.',
    config: {
      format: 'binary',
      density: 1.0,
      preset: 'original',
      decimalPrecision: 4,
      unit: 'mm',
      unitScale: 1.0,
      applyUnitScale: false,
      namingPattern: '{name}_{part}',
      partNamingStyle: 'feature',
      prefix: '',
      suffix: '',
      caseConvention: 'as_is',
      dowelNaming: 'Alignment_Dowel_Pin',
      combinedNaming: 'Combined_Assembly'
    }
  },
  {
    id: 'preset_archival_dated',
    name: 'Arşivleme & Versiyonlama (Tarihli)',
    category: 'Arşiv',
    isBuiltIn: true,
    description: 'Otomatik tarih damgası ve snake_case dosya isimlendirmesi ile kurumsal arşiv formatı.',
    config: {
      format: 'binary',
      density: 1.0,
      preset: 'original',
      decimalPrecision: 4,
      unit: 'mm',
      unitScale: 1.0,
      applyUnitScale: false,
      namingPattern: '{name}_{date}_{part}',
      partNamingStyle: 'part_num',
      prefix: '',
      suffix: '',
      caseConvention: 'snake_case',
      dowelNaming: 'alignment_dowel_pin',
      combinedNaming: 'combined_assembly'
    }
  }
];

/**
 * Loads custom user presets from localStorage.
 */
export function loadCustomPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRESETS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[ExportSettings] Failed to load custom presets:', err);
    return [];
  }
}

/**
 * Loads all presets (built-in + custom).
 */
export function loadAllPresets() {
  const custom = loadCustomPresets();
  return [...BUILT_IN_PRESETS, ...custom];
}

/**
 * Saves a new custom preset or updates an existing one.
 */
export function saveCustomPreset(preset) {
  try {
    const current = loadCustomPresets();
    const existingIndex = current.findIndex(p => p.id === preset.id);

    const now = new Date().toISOString();
    const newPreset = {
      ...preset,
      id: preset.id || `custom_preset_${Date.now()}`,
      isBuiltIn: false,
      updatedAt: now,
      createdAt: preset.createdAt || now
    };

    let updatedList;
    if (existingIndex >= 0) {
      updatedList = [...current];
      updatedList[existingIndex] = newPreset;
    } else {
      updatedList = [...current, newPreset];
    }

    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(updatedList));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('stl_export_presets_updated', { detail: updatedList }));
    }
    return newPreset;
  } catch (err) {
    console.error('[ExportSettings] Failed to save custom preset:', err);
    throw err;
  }
}

/**
 * Deletes a custom preset by ID.
 */
export function deleteCustomPreset(presetId) {
  try {
    const current = loadCustomPresets();
    const filtered = current.filter(p => p.id !== presetId);
    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(filtered));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('stl_export_presets_updated', { detail: filtered }));
    }
    return true;
  } catch (err) {
    console.error('[ExportSettings] Failed to delete custom preset:', err);
    return false;
  }
}

/**
 * Loads the active export configuration from localStorage or returns default.
 */
export function loadActiveExportConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_CONFIG);
    if (!raw) return { ...DEFAULT_EXPORT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_EXPORT_SETTINGS,
      ...parsed
    };
  } catch (err) {
    console.warn('[ExportSettings] Failed to load active config:', err);
    return { ...DEFAULT_EXPORT_SETTINGS };
  }
}

/**
 * Saves the active export configuration to localStorage.
 */
export function saveActiveExportConfig(config) {
  try {
    const safe = {
      ...DEFAULT_EXPORT_SETTINGS,
      ...config
    };
    localStorage.setItem(STORAGE_KEY_ACTIVE_CONFIG, JSON.stringify(safe));
    return safe;
  } catch (err) {
    console.warn('[ExportSettings] Failed to save active config:', err);
    return config;
  }
}

/**
 * Exports all custom presets as a JSON string or triggers a file download.
 */
export function exportPresetsAsJSON() {
  const custom = loadCustomPresets();
  const exportPayload = {
    appName: 'STL PinCut 3D',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    presets: custom
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `STL_PinCut_Export_Presets_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return jsonStr;
}

/**
 * Imports presets from a JSON string.
 */
export function importPresetsFromJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    const presetsToImport = Array.isArray(data) ? data : data.presets;
    if (!Array.isArray(presetsToImport) || presetsToImport.length === 0) {
      throw new Error('Geçerli bir ayar profili listesi bulunamadı.');
    }

    const current = loadCustomPresets();
    let importedCount = 0;

    const merged = [...current];
    for (const item of presetsToImport) {
      if (!item.name || !item.config) continue;
      const cleanItem = {
        ...item,
        id: `imported_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        isBuiltIn: false,
        importedAt: new Date().toISOString()
      };
      merged.push(cleanItem);
      importedCount++;
    }

    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(merged));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('stl_export_presets_updated', { detail: merged }));
    }

    return { success: true, count: importedCount };
  } catch (err) {
    console.error('[ExportSettings] Import error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Formats a string according to case convention.
 */
export function applyCaseConvention(str, convention = 'as_is') {
  if (!str) return '';
  switch (convention) {
    case 'lowercase':
      return str.toLowerCase();
    case 'uppercase':
      return str.toUpperCase();
    case 'snake_case':
      return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s\-]+/g, '_')
        .toLowerCase();
    case 'kebab_case':
      return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    case 'as_is':
    default:
      return str;
  }
}

/**
 * Formats date string according to template.
 */
function getFormattedDate(format = 'YYYY-MM-DD') {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  if (format === 'YYYYMMDD') {
    return `${year}${month}${day}`;
  }
  return `${year}-${month}-${day}`;
}

/**
 * Resolves a part identifier based on partNamingStyle and part type.
 */
export function resolvePartIdentifier(partType, style = 'part_num', pinConfig = null) {
  const isSocket = pinConfig?.mode === 'pin_and_hole';
  const bothHoles = pinConfig?.mode === 'holes_both';

  switch (partType) {
    case 'part1':
      if (style === 'part_alpha') return 'Part_A';
      if (style === 'short') return 'P1';
      if (style === 'halves') return 'Half_1';
      if (style === 'feature') {
        if (bothHoles) return 'Part_1_Hole';
        return 'Part_1_Pin';
      }
      return 'Part_1';

    case 'part2':
      if (style === 'part_alpha') return 'Part_B';
      if (style === 'short') return 'P2';
      if (style === 'halves') return 'Half_2';
      if (style === 'feature') {
        if (isSocket || bothHoles) return 'Part_2_Socket';
        return 'Part_2';
      }
      return 'Part_2';

    case 'dowel':
      return 'Alignment_Dowel_Pin';

    case 'combined':
      return 'Combined_Assembly';

    case 'zip':
      return 'PinCut_Package';

    case 'full':
    default:
      return 'Model';
  }
}

/**
 * Generates an export filename based on configuration, tokens, and case conventions.
 *
 * Available Tokens:
 *  {name}    -> Sanitized model base name
 *  {part}    -> Resolved part string
 *  {unit}    -> mm, cm, m, in
 *  {format}  -> bin or ascii
 *  {density} -> e.g. 100pct, 50pct
 *  {date}    -> YYYY-MM-DD
 *  {prefix}  -> Custom prefix
 *  {suffix}  -> Custom suffix
 */
export function generateExportFilename({
  modelName = 'Model',
  partType = 'part1',
  config = DEFAULT_EXPORT_SETTINGS,
  extension = '.stl',
  pinConfig = null
}) {
  const cfg = { ...DEFAULT_EXPORT_SETTINGS, ...(config || {}) };

  // Sanitize base model name
  const cleanName = (modelName || 'Model')
    .replace(/\.[a-zA-Z0-9]+$/i, '')
    .trim()
    .replace(/[<>:"/\\|?*]/g, '_');

  // Resolve Part Name
  let resolvedPart = '';
  if (partType === 'dowel') {
    resolvedPart = cfg.dowelNaming || 'Alignment_Dowel_Pin';
  } else if (partType === 'combined') {
    resolvedPart = cfg.combinedNaming || 'Combined_Assembly';
  } else if (partType === 'zip') {
    resolvedPart = 'Package';
  } else if (partType === 'full') {
    resolvedPart = 'Full';
  } else {
    resolvedPart = resolvePartIdentifier(partType, cfg.partNamingStyle, pinConfig);
  }

  // Token substitutions
  const densityVal = typeof cfg.density === 'number' ? Math.round(cfg.density * 100) : 100;
  const densityToken = `${densityVal}pct`;
  const formatToken = cfg.format === 'ascii' ? 'ascii' : 'bin';
  const unitToken = cfg.unit || 'mm';
  const dateToken = getFormattedDate(cfg.dateFormat);

  let pattern = cfg.namingPattern || '{name}_{part}';

  // If partType is zip and pattern doesn't fit, provide clean package naming
  if (partType === 'zip') {
    pattern = '{name}_{part}_{unit}';
  }

  let result = pattern
    .replace(/\{name\}/g, cleanName)
    .replace(/\{part\}/g, resolvedPart)
    .replace(/\{unit\}/g, unitToken)
    .replace(/\{density\}/g, densityToken)
    .replace(/\{format\}/g, formatToken)
    .replace(/\{date\}/g, dateToken)
    .replace(/\{prefix\}/g, cfg.prefix || '')
    .replace(/\{suffix\}/g, cfg.suffix || '');

  // Add custom prefix / suffix if not already in pattern
  if (cfg.prefix && !cfg.namingPattern.includes('{prefix}')) {
    result = `${cfg.prefix}_${result}`;
  }
  if (cfg.suffix && !cfg.namingPattern.includes('{suffix}')) {
    result = `${result}_${cfg.suffix}`;
  }

  // Clean double underscores or trailing/leading underscores
  result = result
    .replace(/_{2,}/g, '_')
    .replace(/^-+|-+$|^_+|_+$/g, '');

  // Apply case convention
  result = applyCaseConvention(result, cfg.caseConvention);

  // Append extension
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  return `${result}${ext}`;
}

/**
 * Resolves live previews for all export filenames given a model name and export configuration.
 */
export function resolveAllFilenames(modelName = 'Model', config = DEFAULT_EXPORT_SETTINGS, pinConfig = null) {
  return {
    part1: generateExportFilename({ modelName, partType: 'part1', config, extension: '.stl', pinConfig }),
    part2: generateExportFilename({ modelName, partType: 'part2', config, extension: '.stl', pinConfig }),
    dowel: generateExportFilename({ modelName, partType: 'dowel', config, extension: '.stl', pinConfig }),
    combined: generateExportFilename({ modelName, partType: 'combined', config, extension: '.stl', pinConfig }),
    zip: generateExportFilename({ modelName, partType: 'zip', config, extension: '.zip', pinConfig }),
    full: generateExportFilename({ modelName, partType: 'full', config, extension: '.stl', pinConfig })
  };
}
