import * as THREE from 'three';

/**
 * Calculates volume (mm^3) and surface area (mm^2, cm^2, in^2, m^2) of a Three.js BufferGeometry
 * using the Divergence Theorem on signed tetrahedra and vector cross-products.
 * Supports optional 3D transform scale.
 */
export function calculateGeometryVolume(geometry, scale = null) {
  if (!geometry) {
    return {
      volumeMm3: 0,
      volumeCm3: 0,
      volumeLiters: 0,
      volumeIn3: 0,
      surfaceAreaMm2: 0,
      surfaceAreaCm2: 0,
      surfaceAreaDm2: 0,
      surfaceAreaM2: 0,
      surfaceAreaIn2: 0,
      triangleCount: 0,
      averageTriangleAreaMm2: 0
    };
  }

  const geom = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geom.attributes?.position;
  if (!pos || pos.count < 3) {
    return {
      volumeMm3: 0,
      volumeCm3: 0,
      volumeLiters: 0,
      volumeIn3: 0,
      surfaceAreaMm2: 0,
      surfaceAreaCm2: 0,
      surfaceAreaDm2: 0,
      surfaceAreaM2: 0,
      surfaceAreaIn2: 0,
      triangleCount: 0,
      averageTriangleAreaMm2: 0
    };
  }

  let sx = 1, sy = 1, sz = 1;
  if (scale) {
    if (typeof scale === 'number') {
      sx = sy = sz = scale;
    } else if (scale.isVector3 || (scale.x !== undefined && scale.y !== undefined && scale.z !== undefined)) {
      sx = scale.x;
      sy = scale.y;
      sz = scale.z;
    }
  }

  let totalVolume = 0;
  let totalArea = 0;

  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();
  const cross = new THREE.Vector3();

  const count = pos.count;
  const triangleCount = Math.floor(count / 3);

  for (let i = 0; i < count; i += 3) {
    p1.fromBufferAttribute(pos, i);
    p2.fromBufferAttribute(pos, i + 1);
    p3.fromBufferAttribute(pos, i + 2);

    if (sx !== 1 || sy !== 1 || sz !== 1) {
      p1.x *= sx; p1.y *= sy; p1.z *= sz;
      p2.x *= sx; p2.y *= sy; p2.z *= sz;
      p3.x *= sx; p3.y *= sy; p3.z *= sz;
    }

    // Signed tetrahedron volume
    const v321 = p3.x * p2.y * p1.z;
    const v231 = p2.x * p3.y * p1.z;
    const v312 = p3.x * p1.y * p2.z;
    const v132 = p1.x * p3.y * p2.z;
    const v213 = p2.x * p1.y * p3.z;
    const v123 = p1.x * p2.y * p3.z;
    totalVolume += (-v321 + v231 + v312 - v132 - v213 + v123) / 6.0;

    // Triangle surface area (0.5 * |(p2 - p1) x (p3 - p1)|)
    const edge1 = new THREE.Vector3().subVectors(p2, p1);
    const edge2 = new THREE.Vector3().subVectors(p3, p1);
    cross.crossVectors(edge1, edge2);
    totalArea += cross.length() * 0.5;
  }

  const volumeMm3 = Math.abs(totalVolume);
  const volumeCm3 = volumeMm3 / 1000.0;
  const volumeLiters = volumeCm3 / 1000.0;
  const volumeIn3 = volumeMm3 / 16387.064;

  const surfaceAreaMm2 = totalArea;
  const surfaceAreaCm2 = surfaceAreaMm2 / 100.0;
  const surfaceAreaDm2 = surfaceAreaMm2 / 10000.0;
  const surfaceAreaM2 = surfaceAreaMm2 / 1000000.0;
  const surfaceAreaIn2 = surfaceAreaMm2 / 645.16;

  const averageTriangleAreaMm2 = triangleCount > 0 ? surfaceAreaMm2 / triangleCount : 0;

  return {
    volumeMm3: Math.round(volumeMm3 * 100) / 100,
    volumeCm3: Math.round(volumeCm3 * 100) / 100,
    volumeLiters: parseFloat(volumeLiters.toFixed(4)),
    volumeIn3: Math.round(volumeIn3 * 100) / 100,
    surfaceAreaMm2: Math.round(surfaceAreaMm2 * 100) / 100,
    surfaceAreaCm2: Math.round(surfaceAreaCm2 * 100) / 100,
    surfaceAreaDm2: parseFloat(surfaceAreaDm2.toFixed(3)),
    surfaceAreaM2: parseFloat(surfaceAreaM2.toFixed(5)),
    surfaceAreaIn2: Math.round(surfaceAreaIn2 * 100) / 100,
    triangleCount,
    averageTriangleAreaMm2: parseFloat(averageTriangleAreaMm2.toFixed(3))
  };
}

/**
 * Calculates complementary engineering metrics based on total surface area and volume:
 * - Surface Area to Volume Ratio (SA:V ratio in cm^-1 and mm^-1)
 * - Sphericity metric (comparison to ideal sphere of same volume)
 * - Paint / Primer coating consumption (ml and aerosol cans)
 * - Resin dip / sealing fluid requirements
 */
export function calculateSurfaceAreaStats(surfaceAreaMm2, volumeMm3, dimensions = null) {
  const safeAreaMm2 = Math.max(0, surfaceAreaMm2 || 0);
  const safeAreaCm2 = safeAreaMm2 / 100.0;
  const safeAreaM2 = safeAreaMm2 / 1000000.0;
  const safeVolMm3 = Math.max(0.001, volumeMm3 || 0.001);
  const safeVolCm3 = safeVolMm3 / 1000.0;

  // 1. Surface-Area-to-Volume Ratio (SA:V)
  // in mm^-1
  const saToVolMm = safeAreaMm2 / safeVolMm3;
  // in cm^-1: (area_cm2 / vol_cm3) = (area_mm2 / 100) / (vol_mm3 / 1000) = (area_mm2 / vol_mm3) * 10
  const saToVolCm = (safeAreaCm2 / safeVolCm3);

  // Engineering classification for 3D Printing & Heat Dissipation
  let classification = 'balanced';
  let classificationLabel = 'Dengeli Yapısal Form';
  let classificationDesc = 'Optimum yüzey ve hacim dengesi. Standart soğutma ve perimetre profilleri uygundur.';
  let badgeColor = '#10b981';

  if (saToVolCm < 1.0) {
    classification = 'compact_solid';
    classificationLabel = 'Kompakt Masif Blok';
    classificationDesc = 'Düşük yüzey/hacim oranı. Yüksek termal kütle, yavaş soğuma ve iç gerilme riski; dolgu oranı dikkatle seçilmelidir.';
    badgeColor = '#06b6d4';
  } else if (saToVolCm > 4.5) {
    classification = 'thin_walled';
    classificationLabel = 'İnce Duvarlı / Geniş Yüzey';
    classificationDesc = 'Yüksek yüzey/hacim oranı. Hızlı ısı yayılımı; bükülme (warping) riskine karşı tabla yapışması ve çevre duvarları desteklenmelidir.';
    badgeColor = '#f59e0b';
  }

  // 2. Sphericity (Küre Eşdeğerliği)
  // Minimal surface area for an equal volume sphere: A_sphere = (36 * PI * V^2)^(1/3)
  const sphereAreaMm2 = Math.pow(36 * Math.PI * Math.pow(safeVolMm3, 2), 1.0 / 3.0);
  const sphericity = safeAreaMm2 > 0 ? Math.min(1.0, sphereAreaMm2 / safeAreaMm2) : 0;
  const sphericityPercent = parseFloat((sphericity * 100).toFixed(1));

  // 3. Surface Finishing & Coating Estimations
  // Standard aerosol primer / spray paint coverage: ~100-120 ml/m² per single coat
  const primerSingleCoatMl = safeAreaM2 * 120.0;
  const primerTwoCoatsMl = primerSingleCoatMl * 1.85; // slight efficiency gain on second coat
  // 400ml aerosol spray can coverage: ~1.6 m² per can
  const sprayCansNeeded = Math.max(0.05, safeAreaM2 / 1.6);

  // Liquid Resin Dip / Clear Coat estimate: ~80 ml/m²
  const resinDipCoatMl = safeAreaM2 * 80.0;

  // Bounding box surface area comparison if dimensions available
  let bboxSurfaceAreaMm2 = null;
  let bboxSurfaceAreaCm2 = null;
  let bboxAreaRatio = null;
  if (dimensions && dimensions.x > 0 && dimensions.y > 0 && dimensions.z > 0) {
    const { x, y, z } = dimensions;
    bboxSurfaceAreaMm2 = 2 * (x * y + y * z + x * z);
    bboxSurfaceAreaCm2 = bboxSurfaceAreaMm2 / 100.0;
    if (bboxSurfaceAreaMm2 > 0) {
      bboxAreaRatio = parseFloat(((safeAreaMm2 / bboxSurfaceAreaMm2) * 100).toFixed(1));
    }
  }

  return {
    surfaceAreaMm2: Math.round(safeAreaMm2),
    surfaceAreaCm2: parseFloat(safeAreaCm2.toFixed(2)),
    surfaceAreaDm2: parseFloat((safeAreaMm2 / 10000.0).toFixed(3)),
    surfaceAreaM2: parseFloat(safeAreaM2.toFixed(5)),
    surfaceAreaIn2: parseFloat((safeAreaMm2 / 645.16).toFixed(2)),
    saToVolCm: parseFloat(saToVolCm.toFixed(2)),
    saToVolMm: parseFloat(saToVolMm.toFixed(3)),
    classification,
    classificationLabel,
    classificationDesc,
    badgeColor,
    sphericityPercent,
    sphereAreaCm2: parseFloat((sphereAreaMm2 / 100.0).toFixed(2)),
    coating: {
      primerSingleCoatMl: parseFloat(primerSingleCoatMl.toFixed(1)),
      primerTwoCoatsMl: parseFloat(primerTwoCoatsMl.toFixed(1)),
      sprayCansNeeded: parseFloat(sprayCansNeeded.toFixed(2)),
      resinDipCoatMl: parseFloat(resinDipCoatMl.toFixed(1))
    },
    bbox: bboxSurfaceAreaMm2 ? {
      surfaceAreaMm2: Math.round(bboxSurfaceAreaMm2),
      surfaceAreaCm2: parseFloat(bboxSurfaceAreaCm2.toFixed(2)),
      areaRatioPercent: bboxAreaRatio
    } : null
  };
}

/**
 * Format surface area according to selected unit: 'cm2', 'mm2', 'in2', 'm2'
 */
export function formatSurfaceArea(areaCm2, areaMm2, unit = 'cm2') {
  const mm2 = areaMm2 !== undefined ? areaMm2 : (areaCm2 || 0) * 100;
  const cm2 = areaCm2 !== undefined ? areaCm2 : mm2 / 100.0;

  switch (unit) {
    case 'mm2':
      return `${Math.round(mm2).toLocaleString('tr-TR')} mm²`;
    case 'in2':
      return `${(mm2 / 645.16).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in²`;
    case 'm2':
      return `${(mm2 / 1000000.0).toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} m²`;
    case 'cm2':
    default:
      return `${cm2.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cm²`;
  }
}

/**
 * Calculates total mass of a 3D model based on its solid volume (cm³) and material density (g/cm³).
 * Formula: Mass = Volume (cm³) * Density (g/cm³)
 *
 * @param {number} volumeCm3 - Solid volume in cm³
 * @param {number} [density=1.24] - Material density in g/cm³
 * @returns {Object} Calculated mass breakdown in grams, kilograms, ounces, and pounds
 */
export function calculateModelMass(volumeCm3, density = 1.24) {
  const safeVol = Math.max(0, Number(volumeCm3) || 0);
  const safeDensity = Math.max(0, Number(density) || 0);

  const massGrams = safeVol * safeDensity;
  const massKg = massGrams / 1000.0;
  const massOz = massGrams * 0.03527396;
  const massLb = massGrams * 0.00220462;

  return {
    volumeCm3: parseFloat(safeVol.toFixed(2)),
    density: parseFloat(safeDensity.toFixed(3)),
    massGrams: parseFloat(massGrams.toFixed(2)),
    massKg: parseFloat(massKg.toFixed(4)),
    massOz: parseFloat(massOz.toFixed(2)),
    massLb: parseFloat(massLb.toFixed(3)),
    formattedGrams: `${massGrams.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} g`,
    formattedKg: `${massKg.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} kg`,
    formattedOz: `${massOz.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} oz`,
    formattedLb: `${massLb.toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} lb`
  };
}

/**
 * Formats mass according to selected unit: 'g', 'kg', 'oz', 'lb'
 */
export function formatMass(massGrams, unit = 'g') {
  const g = Math.max(0, Number(massGrams) || 0);
  switch (unit) {
    case 'kg':
      return `${(g / 1000.0).toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} kg`;
    case 'oz':
      return `${(g * 0.03527396).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} oz`;
    case 'lb':
      return `${(g * 0.00220462).toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} lb`;
    case 'g':
    default:
      return `${g.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} g`;
  }
}

/**
 * 3D Printing Materials Database
 * Densities in g/cm^3, standard market prices, typical printing properties
 */
export const PRINT_MATERIALS = [
  {
    id: 'pla',
    name: 'PLA (Polilaktik Asit)',
    shortName: 'PLA',
    category: 'fdm',
    density: 1.24, // g/cm³
    typicalTemp: '200-215 °C',
    bedTemp: '50-60 °C',
    defaultPricePerKg: 22,
    defaultCurrency: '$',
    color: '#10b981',
    description: 'En popüler ve basımı en kolay filament. Mükemmel boyutsal kararlılık, düşük çekme.'
  },
  {
    id: 'pla_plus',
    name: 'PLA+ / Tough PLA',
    shortName: 'PLA+',
    category: 'fdm',
    density: 1.25,
    typicalTemp: '210-225 °C',
    bedTemp: '55-65 °C',
    defaultPricePerKg: 25,
    defaultCurrency: '$',
    color: '#06b6d4',
    description: 'Standart PLA\'ya göre geliştirilmiş darbe dayanımı ve katman yapışması.'
  },
  {
    id: 'petg',
    name: 'PETG',
    shortName: 'PETG',
    category: 'fdm',
    density: 1.27,
    typicalTemp: '230-245 °C',
    bedTemp: '70-85 °C',
    defaultPricePerKg: 24,
    defaultCurrency: '$',
    color: '#3b82f6',
    description: 'Mükemmel tokluk, kimyasal dayanım, su geçirmezlik ve mekanik güç.'
  },
  {
    id: 'abs',
    name: 'ABS',
    shortName: 'ABS',
    category: 'fdm',
    density: 1.04,
    typicalTemp: '235-255 °C',
    bedTemp: '95-110 °C',
    defaultPricePerKg: 20,
    defaultCurrency: '$',
    color: '#f59e0b',
    description: 'Hafif, yüksek sıcaklık dayanımı, aseton buharıyla pürüzsüzleştirilebilir.'
  },
  {
    id: 'asa',
    name: 'ASA (Hava Koşullarına Dayanıklı)',
    shortName: 'ASA',
    category: 'fdm',
    density: 1.07,
    typicalTemp: '240-260 °C',
    bedTemp: '90-110 °C',
    defaultPricePerKg: 28,
    defaultCurrency: '$',
    color: '#ea580c',
    description: 'Dış mekan için UV ve sararma dayanımlı yüksek mukavemetli malzeme.'
  },
  {
    id: 'tpu',
    name: 'TPU 95A (Esnek / Flex)',
    shortName: 'TPU',
    category: 'fdm',
    density: 1.21,
    typicalTemp: '215-235 °C',
    bedTemp: '40-60 °C',
    defaultPricePerKg: 34,
    defaultCurrency: '$',
    color: '#8b5cf6',
    description: 'Kauçuk benzeri elastik, darbe emici ve aşınmaya dayanıklı esnek filament.'
  },
  {
    id: 'nylon',
    name: 'Naylon (PA12 / Poliamid)',
    shortName: 'Nylon',
    category: 'fdm',
    density: 1.14,
    typicalTemp: '250-270 °C',
    bedTemp: '80-100 °C',
    defaultPricePerKg: 45,
    defaultCurrency: '$',
    color: '#ec4899',
    description: 'Endüstriyel dişli, menteşe ve sürtünmeli mekanik parçalar için üstün tokluk.'
  },
  {
    id: 'pc',
    name: 'PC (Polikarbonat)',
    shortName: 'PC',
    category: 'fdm',
    density: 1.20,
    typicalTemp: '260-290 °C',
    bedTemp: '100-120 °C',
    defaultPricePerKg: 42,
    defaultCurrency: '$',
    color: '#6366f1',
    description: 'Aşırı darbe ve yüksek sıcaklık dayanımı gerektiren kritik parçalar.'
  },
  {
    id: 'resin_standard',
    name: 'Standart UV Reçine (SLA / DLP)',
    shortName: 'Reçine',
    category: 'resin',
    density: 1.10,
    typicalTemp: '25-30 °C',
    bedTemp: 'Oda Sıcaklığı',
    defaultPricePerKg: 30, // per Liter
    defaultCurrency: '$',
    color: '#14b8a6',
    description: 'Sıvı reçine fotopolimer. Mikron düzeyinde pürüzsüz yüzey detayları.'
  },
  {
    id: 'custom',
    name: 'Özel Malzeme / Yoğunluk',
    shortName: 'Özel',
    category: 'custom',
    density: 1.24,
    typicalTemp: '—',
    bedTemp: '—',
    defaultPricePerKg: 25,
    defaultCurrency: '$',
    color: '#a855f7',
    description: 'Kendi filament veya reçine yoğunluk değerinizi girin.'
  }
];

/**
 * Standard Infill Presets for 3D Printing
 */
export const INFILL_PRESETS = [
  { percent: 100, label: '%100 Katı', desc: 'Tam dolu sağlam parça (Solid)', icon: 'solid' },
  { percent: 50, label: '%50 Mekanik', desc: 'Ağır yük ve fonksiyonel aparatlar', icon: 'heavy' },
  { percent: 20, label: '%20 Standart', desc: 'Önerilen genel FDM dolgusu', icon: 'standard' },
  { percent: 15, label: '%15 Hafif', desc: 'Figür, prototip ve hızlı baskı', icon: 'light' },
  { percent: 0, label: '%0 Boş', desc: 'Spiralize vazo modu / kabuk', icon: 'hollow' }
];

/**
 * Estimates material requirements, mass, length, cost, and spool consumption
 *
 * @param {Object} params
 * @param {number} params.volumeMm3 - Exact solid STL volume in mm^3
 * @param {number} params.surfaceAreaMm2 - Exact STL surface area in mm^2
 * @param {number} [params.density=1.24] - Material density in g/cm^3
 * @param {number} [params.infillPercent=20] - Infill percentage (0 to 100)
 * @param {number} [params.wallThicknessMm=1.2] - Perimeter shell wall thickness in mm
 * @param {number} [params.filamentDiameter=1.75] - Filament diameter in mm (1.75 or 2.85)
 * @param {number} [params.spoolWeightG=1000] - Spool size in grams (default 1000g / 1kg)
 * @param {number} [params.spoolCost=25] - Cost of 1 full spool
 * @param {string} [params.currency='$'] - Currency symbol
 * @param {boolean} [params.useSlicerModel=true] - Use realistic shell + infill model
 */
export function estimateMaterialRequirement({
  volumeMm3 = 0,
  surfaceAreaMm2 = 0,
  density = 1.24,
  infillPercent = 20,
  wallThicknessMm = 1.2,
  filamentDiameter = 1.75,
  spoolWeightG = 1000,
  spoolCost = 25,
  currency = '$',
  useSlicerModel = true
}) {
  if (volumeMm3 <= 0) {
    return {
      volumeMm3: 0,
      volumeCm3: 0,
      effectiveVolumeMm3: 0,
      effectiveVolumeCm3: 0,
      weightGrams: 0,
      weightKg: 0,
      spoolUsagePercent: 0,
      printsPerSpool: 0,
      filamentLengthMeters: 0,
      cost: 0,
      currency,
      density,
      infillPercent,
      resinMl: 0
    };
  }

  const solidVolumeCm3 = volumeMm3 / 1000.0;

  let effectiveVolumeMm3 = volumeMm3;

  if (useSlicerModel && infillPercent < 100) {
    // Realistic slicer modeling:
    // Shell Volume = Surface Area * Wall Thickness (capped at solid volume)
    const shellVolumeMm3 = Math.min(volumeMm3, surfaceAreaMm2 * wallThicknessMm);
    const coreVolumeMm3 = Math.max(0, volumeMm3 - shellVolumeMm3);
    const infillRatio = Math.max(0, Math.min(100, infillPercent)) / 100.0;

    effectiveVolumeMm3 = shellVolumeMm3 + coreVolumeMm3 * infillRatio;
  } else if (!useSlicerModel) {
    // Linear scaling model
    effectiveVolumeMm3 = volumeMm3 * (Math.max(0, Math.min(100, infillPercent)) / 100.0);
  }

  const effectiveVolumeCm3 = effectiveVolumeMm3 / 1000.0;

  // Mass (Grams) = Effective Volume (cm^3) * Density (g/cm^3)
  const weightGrams = effectiveVolumeCm3 * density;
  const weightKg = weightGrams / 1000.0;

  // Spool consumption
  const safeSpoolWeight = spoolWeightG > 0 ? spoolWeightG : 1000;
  const spoolUsagePercent = (weightGrams / safeSpoolWeight) * 100.0;
  const printsPerSpool = weightGrams > 0 ? Math.floor(safeSpoolWeight / weightGrams) : 0;

  // Filament length (Meters)
  // Cross section area of filament cylinder = PI * (d/2)^2
  const filRadius = filamentDiameter / 2.0;
  const filAreaMm2 = Math.PI * filRadius * filRadius;
  const filamentLengthMm = filAreaMm2 > 0 ? effectiveVolumeMm3 / filAreaMm2 : 0;
  const filamentLengthMeters = filamentLengthMm / 1000.0;

  // Cost calculation
  const cost = safeSpoolWeight > 0 ? (weightGrams / safeSpoolWeight) * spoolCost : 0;

  // Resin volume (mL) (1 cm^3 = 1 mL)
  const resinMl = effectiveVolumeCm3;

  return {
    volumeMm3: Math.round(volumeMm3),
    volumeCm3: parseFloat(solidVolumeCm3.toFixed(2)),
    effectiveVolumeMm3: Math.round(effectiveVolumeMm3),
    effectiveVolumeCm3: parseFloat(effectiveVolumeCm3.toFixed(2)),
    weightGrams: parseFloat(weightGrams.toFixed(1)),
    weightKg: parseFloat(weightKg.toFixed(3)),
    spoolUsagePercent: parseFloat(spoolUsagePercent.toFixed(1)),
    printsPerSpool,
    filamentLengthMeters: parseFloat(filamentLengthMeters.toFixed(2)),
    cost: parseFloat(cost.toFixed(2)),
    currency,
    density,
    infillPercent,
    resinMl: parseFloat(resinMl.toFixed(1))
  };
}

/**
 * Computes volume and material stats for split parts (Part A, Part B, Dowel Pin, Total)
 */
export function calculateSplitPartsVolumeStats(splitResult, materialConfig) {
  if (!splitResult) return null;

  const statsA = splitResult.partA?.geometry
    ? calculateGeometryVolume(splitResult.partA.geometry)
    : null;
  const statsB = splitResult.partB?.geometry
    ? calculateGeometryVolume(splitResult.partB.geometry)
    : null;
  const statsPin = splitResult.dowelPinGeometry
    ? calculateGeometryVolume(splitResult.dowelPinGeometry)
    : null;

  const matA = statsA ? estimateMaterialRequirement({ ...materialConfig, ...statsA }) : null;
  const matB = statsB ? estimateMaterialRequirement({ ...materialConfig, ...statsB }) : null;
  const matPin = statsPin ? estimateMaterialRequirement({ ...materialConfig, ...statsPin, infillPercent: 100 }) : null;

  const totalVolumeMm3 = (statsA?.volumeMm3 || 0) + (statsB?.volumeMm3 || 0) + (statsPin?.volumeMm3 || 0);
  const totalVolumeCm3 = totalVolumeMm3 / 1000.0;
  const totalSurfaceAreaMm2 = (statsA?.surfaceAreaMm2 || 0) + (statsB?.surfaceAreaMm2 || 0) + (statsPin?.surfaceAreaMm2 || 0);
  const totalSurfaceAreaCm2 = totalSurfaceAreaMm2 / 100.0;
  const originalAreaMm2 = materialConfig?.surfaceAreaMm2 || 0;
  const cutInterfaceAreaMm2 = originalAreaMm2 > 0 && totalSurfaceAreaMm2 > originalAreaMm2
    ? Math.round((totalSurfaceAreaMm2 - originalAreaMm2) / 2.0)
    : null;
  const cutInterfaceAreaCm2 = cutInterfaceAreaMm2 ? parseFloat((cutInterfaceAreaMm2 / 100.0).toFixed(2)) : null;

  const totalWeightGrams = (matA?.weightGrams || 0) + (matB?.weightGrams || 0) + (matPin?.weightGrams || 0);
  const totalFilamentLengthMeters = (matA?.filamentLengthMeters || 0) + (matB?.filamentLengthMeters || 0) + (matPin?.filamentLengthMeters || 0);
  const totalCost = (matA?.cost || 0) + (matB?.cost || 0) + (matPin?.cost || 0);

  return {
    partA: { stats: statsA, material: matA },
    partB: { stats: statsB, material: matB },
    dowelPin: { stats: statsPin, material: matPin },
    total: {
      volumeMm3: totalVolumeMm3,
      volumeCm3: parseFloat(totalVolumeCm3.toFixed(2)),
      surfaceAreaMm2: totalSurfaceAreaMm2,
      surfaceAreaCm2: parseFloat(totalSurfaceAreaCm2.toFixed(2)),
      cutInterfaceAreaMm2,
      cutInterfaceAreaCm2,
      weightGrams: parseFloat(totalWeightGrams.toFixed(1)),
      filamentLengthMeters: parseFloat(totalFilamentLengthMeters.toFixed(2)),
      cost: parseFloat(totalCost.toFixed(2))
    }
  };
}
