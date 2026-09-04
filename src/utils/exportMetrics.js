import { downloadBlob } from './stlExporter.js';

/**
 * Normalizes analysis metrics into a clean, structured payload.
 *
 * @param {Object} params
 * @param {string} [params.modelName] - Model name or filename
 * @param {Object} [params.dimensions] - Bounding box dimensions {x, y, z} in mm
 * @param {Object} [params.volumeStats] - Calculated volume stats (volumeCm3, volumeMm3, surfaceAreaCm2, etc.)
 * @param {Object} [params.surfaceStats] - Complementary surface statistics
 * @param {Object} [params.massStats] - Calculated mass breakdown (massGrams, massKg, massOz, massLb)
 * @param {number} [params.density] - Material density in g/cm³
 * @param {Object} [params.meshInfo] - Geometric mesh info (triangleCount, vertexCount)
 * @returns {Object} Structured metrics payload
 */
export function buildAnalysisMetricsPayload({
  modelName = 'model',
  dimensions = { x: 0, y: 0, z: 0 },
  volumeStats = {},
  surfaceStats = {},
  massStats = {},
  density = 1.24,
  meshInfo = {}
}) {
  const safeDimX = Number(dimensions?.x) || 0;
  const safeDimY = Number(dimensions?.y) || 0;
  const safeDimZ = Number(dimensions?.z) || 0;

  const volCm3 = Number(volumeStats?.volumeCm3) || 0;
  const volMm3 = Number(volumeStats?.volumeMm3) || volCm3 * 1000;
  const volIn3 = Number(volumeStats?.volumeIn3) || parseFloat((volCm3 * 0.0610237).toFixed(3));
  const volLiters = Number(volumeStats?.volumeLiters) || parseFloat((volCm3 / 1000).toFixed(4));

  const saCm2 = Number(volumeStats?.surfaceAreaCm2 ?? surfaceStats?.surfaceAreaCm2) || 0;
  const saMm2 = Number(volumeStats?.surfaceAreaMm2 ?? surfaceStats?.surfaceAreaMm2) || saCm2 * 100;
  const saIn2 = Number(volumeStats?.surfaceAreaIn2 ?? surfaceStats?.surfaceAreaIn2) || parseFloat((saCm2 * 0.155).toFixed(3));

  const safeDensity = Number(density) || 1.24;

  const massGrams = Number(massStats?.massGrams) || parseFloat((volCm3 * safeDensity).toFixed(2));
  const massKg = Number(massStats?.massKg) || parseFloat((massGrams / 1000).toFixed(4));
  const massOz = Number(massStats?.massOz) || parseFloat((massGrams * 0.03527396).toFixed(2));
  const massLb = Number(massStats?.massLb) || parseFloat((massGrams * 0.00220462).toFixed(3));

  return {
    modelName: modelName || '3D_Model',
    exportTimestamp: new Date().toISOString(),
    dimensions: {
      unit: 'mm',
      x: safeDimX,
      y: safeDimY,
      z: safeDimZ
    },
    volume: {
      cm3: parseFloat(volCm3.toFixed(2)),
      mm3: parseFloat(volMm3.toFixed(2)),
      in3: parseFloat(volIn3.toFixed(3)),
      liters: parseFloat(volLiters.toFixed(4))
    },
    surfaceArea: {
      cm2: parseFloat(saCm2.toFixed(2)),
      mm2: parseFloat(saMm2.toFixed(2)),
      in2: parseFloat(saIn2.toFixed(3))
    },
    material: {
      density_g_cm3: parseFloat(safeDensity.toFixed(3))
    },
    mass: {
      grams: parseFloat(massGrams.toFixed(2)),
      kilograms: parseFloat(massKg.toFixed(4)),
      ounces: parseFloat(massOz.toFixed(2)),
      pounds: parseFloat(massLb.toFixed(3))
    },
    meshProperties: {
      triangleCount: Number(meshInfo?.triangleCount) || 0,
      vertexCount: Number(meshInfo?.vertexCount) || 0
    }
  };
}

/**
 * Formats analysis metrics as a clean, human-readable JSON string.
 */
export function formatMetricsAsJSON(payload) {
  return JSON.stringify(payload, null, 2);
}

/**
 * Formats analysis metrics as a structured CSV document suitable for Excel, Google Sheets, or CAD logs.
 */
export function formatMetricsAsCSV(payload) {
  const rows = [
    ['Category', 'Metric', 'Value', 'Unit', 'Description'],
    ['Metadata', 'Model Name', `"${(payload.modelName || 'Model').replace(/"/g, '""')}"`, '', 'Name of inspected 3D model'],
    ['Metadata', 'Export Timestamp', payload.exportTimestamp, 'ISO 8601', 'Timestamp when metrics were exported'],
    ['Dimensions', 'Bounding Box X (Width)', payload.dimensions.x, 'mm', 'Model dimension along X axis'],
    ['Dimensions', 'Bounding Box Y (Height)', payload.dimensions.y, 'mm', 'Model dimension along Y axis'],
    ['Dimensions', 'Bounding Box Z (Depth)', payload.dimensions.z, 'mm', 'Model dimension along Z axis'],
    ['Volume', 'Solid Volume (cm³)', payload.volume.cm3, 'cm³', 'Solid volume computed from geometry'],
    ['Volume', 'Solid Volume (mm³)', payload.volume.mm3, 'mm³', 'Solid volume in cubic millimeters'],
    ['Volume', 'Solid Volume (in³)', payload.volume.in3, 'in³', 'Solid volume in cubic inches'],
    ['Volume', 'Solid Volume (Liters)', payload.volume.liters, 'L', 'Solid volume in liters'],
    ['Surface Area', 'Surface Area (cm²)', payload.surfaceArea.cm2, 'cm²', 'Total mesh surface area in square centimeters'],
    ['Surface Area', 'Surface Area (mm²)', payload.surfaceArea.mm2, 'mm²', 'Total mesh surface area in square millimeters'],
    ['Surface Area', 'Surface Area (in²)', payload.surfaceArea.in2, 'in²', 'Total mesh surface area in square inches'],
    ['Material', 'Material Density', payload.material.density_g_cm3, 'g/cm³', 'Defined material density'],
    ['Mass', 'Total Solid Mass (g)', payload.mass.grams, 'g', 'Calculated model mass (Volume × Density) in grams'],
    ['Mass', 'Total Solid Mass (kg)', payload.mass.kilograms, 'kg', 'Calculated model mass in kilograms'],
    ['Mass', 'Total Solid Mass (oz)', payload.mass.ounces, 'oz', 'Calculated model mass in ounces'],
    ['Mass', 'Total Solid Mass (lb)', payload.mass.pounds, 'lb', 'Calculated model mass in pounds'],
    ['Mesh', 'Triangle Count', payload.meshProperties.triangleCount, 'triangles', 'Total number of geometric triangles'],
    ['Mesh', 'Vertex Count', payload.meshProperties.vertexCount, 'vertices', 'Total number of geometric vertices']
  ];

  return rows.map((r) => r.join(',')).join('\r\n');
}

/**
 * Exports and triggers browser download of the metrics analysis file in either JSON or CSV format.
 *
 * @param {Object} metricsData - Input data parameters
 * @param {'json' | 'csv'} [format='json'] - Desired file format
 */
export function downloadMetricsFile(metricsData, format = 'json') {
  const payload = buildAnalysisMetricsPayload(metricsData);
  const cleanName = (payload.modelName || 'model')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_');

  if (format === 'csv') {
    const csvContent = formatMetricsAsCSV(payload);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${cleanName}_analysis_metrics.csv`);
  } else {
    const jsonContent = formatMetricsAsJSON(payload);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    downloadBlob(blob, `${cleanName}_analysis_metrics.json`);
  }
}
