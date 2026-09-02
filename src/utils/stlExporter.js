import JSZip from 'jszip';
import * as THREE from 'three';

/**
 * Fast spatial vertex clustering and decimation algorithm for STL geometries.
 * Safely scales mesh density down while preserving boundary bounds and normals.
 */
export function simplifyGeometry(geometry, targetRatio = 1.0, options = {}) {
  if (!geometry || !geometry.attributes || !geometry.attributes.position) {
    return geometry;
  }
  if (targetRatio >= 0.98) {
    return geometry.clone();
  }

  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = nonIndexed.attributes.position;
  const count = pos.count;
  const numTris = Math.floor(count / 3);

  // If mesh is already very low polygon, don't reduce further
  if (numTris <= 24) {
    return geometry.clone();
  }

  try {
    // 1. Calculate sample average edge length and bounding box
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);

    let sampleEdges = 0;
    let edgeSum = 0;
    const sampleLimit = Math.min(300, numTris);
    for (let i = 0; i < sampleLimit; i++) {
      const idx = i * 3;
      const ax = pos.getX(idx), ay = pos.getY(idx), az = pos.getZ(idx);
      const bx = pos.getX(idx + 1), by = pos.getY(idx + 1), bz = pos.getZ(idx + 1);
      edgeSum += Math.hypot(bx - ax, by - ay, bz - az);
      sampleEdges++;
    }
    const avgEdge = sampleEdges > 0 ? edgeSum / sampleEdges : maxDim * 0.05;

    // 2. Binary search across cell sizing to converge to requested density
    let lowFactor = 0.02;
    let highFactor = 6.0;
    let bestGeom = null;
    let bestDiff = Infinity;
    const maxIterations = 4;

    for (let iter = 0; iter < maxIterations; iter++) {
      const midFactor = (lowFactor + highFactor) / 2;
      const cellSize = Math.max(1e-5, avgEdge * midFactor);
      const cellRep = new Map();

      const getSnapped = (x, y, z) => {
        const cx = Math.round(x / cellSize);
        const cy = Math.round(y / cellSize);
        const cz = Math.round(z / cellSize);
        const key = cx + '_' + cy + '_' + cz;
        let rep = cellRep.get(key);
        if (!rep) {
          rep = [cx * cellSize, cy * cellSize, cz * cellSize];
          cellRep.set(key, rep);
        }
        return rep;
      };

      const newPositions = [];
      let validTris = 0;

      for (let i = 0; i < numTris; i++) {
        const i3 = i * 3;
        const vA = getSnapped(pos.getX(i3), pos.getY(i3), pos.getZ(i3));
        const vB = getSnapped(pos.getX(i3 + 1), pos.getY(i3 + 1), pos.getZ(i3 + 1));
        const vC = getSnapped(pos.getX(i3 + 2), pos.getY(i3 + 2), pos.getZ(i3 + 2));

        // Skip collapsed degenerate triangles
        const dAB = (vA[0] - vB[0]) ** 2 + (vA[1] - vB[1]) ** 2 + (vA[2] - vB[2]) ** 2;
        const dBC = (vB[0] - vC[0]) ** 2 + (vB[1] - vC[1]) ** 2 + (vB[2] - vC[2]) ** 2;
        const dCA = (vC[0] - vA[0]) ** 2 + (vC[1] - vA[1]) ** 2 + (vC[2] - vA[2]) ** 2;
        if (dAB < 1e-12 || dBC < 1e-12 || dCA < 1e-12) continue;

        // Skip degenerate collinear zero-area triangles
        const abx = vB[0] - vA[0], aby = vB[1] - vA[1], abz = vB[2] - vA[2];
        const acx = vC[0] - vA[0], acy = vC[1] - vA[1], acz = vC[2] - vA[2];
        const crossX = aby * acz - abz * acy;
        const crossY = abz * acx - abx * acz;
        const crossZ = abx * acy - aby * acx;
        const area2 = crossX * crossX + crossY * crossY + crossZ * crossZ;
        if (area2 < 1e-12) continue;

        newPositions.push(vA[0], vA[1], vA[2], vB[0], vB[1], vB[2], vC[0], vC[1], vC[2]);
        validTris++;
      }

      const currentRatio = validTris / numTris;
      const diff = Math.abs(currentRatio - targetRatio);

      if (validTris >= 12 && diff < bestDiff) {
        bestDiff = diff;
        bestGeom = { positions: newPositions, count: validTris };
      }

      if (currentRatio > targetRatio) {
        lowFactor = midFactor;
      } else {
        highFactor = midFactor;
      }
    }

    if (!bestGeom || bestGeom.count < 12) {
      return geometry.clone();
    }

    const resGeom = new THREE.BufferGeometry();
    resGeom.setAttribute('position', new THREE.Float32BufferAttribute(bestGeom.positions, 3));
    resGeom.computeVertexNormals();
    return resGeom;
  } catch (err) {
    console.warn('Decimation fallback to original geometry:', err);
    return geometry.clone();
  }
}

/**
 * Calculates geometry statistics (triangle count, vertex count, estimated binary/ascii file sizes)
 * with optional projected density for live preview calculations.
 */
export function calculateGeometryStats(geometry, density = 1.0) {
  if (!geometry) {
    return {
      triangles: 0,
      vertices: 0,
      projectedTriangles: 0,
      binarySize: 0,
      projectedBinarySize: 0,
      asciiSize: 0,
      projectedAsciiSize: 0,
      binarySizeFormatted: '0 B',
      projectedBinarySizeFormatted: '0 B',
      asciiSizeFormatted: '0 B',
      projectedAsciiSizeFormatted: '0 B',
      savingsPercent: 0
    };
  }

  const posAttr = geometry.attributes.position;
  if (!posAttr) {
    return {
      triangles: 0,
      vertices: 0,
      projectedTriangles: 0,
      binarySize: 0,
      projectedBinarySize: 0,
      asciiSize: 0,
      projectedAsciiSize: 0,
      binarySizeFormatted: '0 B',
      projectedBinarySizeFormatted: '0 B',
      asciiSizeFormatted: '0 B',
      projectedAsciiSizeFormatted: '0 B',
      savingsPercent: 0
    };
  }

  const triangles = geometry.index
    ? Math.floor(geometry.index.count / 3)
    : Math.floor(posAttr.count / 3);
  const vertices = posAttr.count;

  const effectiveDensity = Math.max(0.05, Math.min(1.0, density || 1.0));
  const projectedTriangles = effectiveDensity >= 0.98
    ? triangles
    : Math.max(12, Math.round(triangles * effectiveDensity));

  // Binary STL size: 84 byte header + 50 bytes per triangle
  const binarySize = 84 + triangles * 50;
  const projectedBinarySize = 84 + projectedTriangles * 50;

  // ASCII STL size approx: ~180 bytes per triangle
  const asciiSize = 100 + triangles * 180;
  const projectedAsciiSize = 100 + projectedTriangles * 180;

  const savingsPercent = Math.max(0, Math.round((1 - projectedTriangles / Math.max(1, triangles)) * 100));

  return {
    triangles,
    vertices,
    projectedTriangles,
    binarySize,
    projectedBinarySize,
    asciiSize,
    projectedAsciiSize,
    binarySizeFormatted: formatBytes(binarySize),
    projectedBinarySizeFormatted: formatBytes(projectedBinarySize),
    asciiSizeFormatted: formatBytes(asciiSize),
    projectedAsciiSizeFormatted: formatBytes(projectedAsciiSize),
    savingsPercent
  };
}

/**
 * Formats bytes to readable KB/MB string
 */
export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Converts Three.js BufferGeometry to binary STL ArrayBuffer.
 * Supports optional density reduction (options.density).
 */
export function geometryToBinarySTL(geometry, headerTitle = 'STLPinCut3D', options = {}) {
  // Support calling with (geometry, options)
  let title = headerTitle;
  let opts = options;
  if (typeof headerTitle === 'object' && headerTitle !== null) {
    opts = headerTitle;
    title = opts.headerTitle || 'STLPinCut3D';
  }

  let targetGeom = geometry;
  if (opts.density && opts.density < 0.98) {
    targetGeom = simplifyGeometry(geometry, opts.density, opts);
  }

  let nonIndexedGeom = targetGeom.index ? targetGeom.toNonIndexed() : targetGeom.clone();

  if (!nonIndexedGeom.attributes.normal) {
    nonIndexedGeom.computeVertexNormals();
  }

  const posAttr = nonIndexedGeom.attributes.position;
  const normalAttr = nonIndexedGeom.attributes.normal;
  const numFaces = Math.floor(posAttr.count / 3);

  const bufferSize = 84 + numFaces * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const dataView = new DataView(buffer);

  // 80-byte ASCII header
  const titleStr = `STL PinCut 3D - ${title.substring(0, 50)} [Density:${Math.round((opts.density || 1) * 100)}%]`;
  for (let i = 0; i < 80; i++) {
    dataView.setUint8(i, i < titleStr.length ? titleStr.charCodeAt(i) : 0x20);
  }

  // 4-byte face count (little endian)
  dataView.setUint32(80, numFaces, true);

  let offset = 84;
  for (let i = 0; i < numFaces; i++) {
    const i3 = i * 3;

    // Normal vector
    const nx = normalAttr ? normalAttr.getX(i3) : 0;
    const ny = normalAttr ? normalAttr.getY(i3) : 0;
    const nz = normalAttr ? normalAttr.getZ(i3) : 1;
    dataView.setFloat32(offset, nx, true);
    dataView.setFloat32(offset + 4, ny, true);
    dataView.setFloat32(offset + 8, nz, true);
    offset += 12;

    // 3 Vertices
    for (let v = 0; v < 3; v++) {
      const vx = posAttr.getX(i3 + v);
      const vy = posAttr.getY(i3 + v);
      const vz = posAttr.getZ(i3 + v);
      dataView.setFloat32(offset, vx, true);
      dataView.setFloat32(offset + 4, vy, true);
      dataView.setFloat32(offset + 8, vz, true);
      offset += 12;
    }

    // 2-byte attribute byte count (set to 0)
    dataView.setUint16(offset, 0, true);
    offset += 2;
  }

  return buffer;
}

/**
 * Converts Three.js BufferGeometry to ASCII STL string.
 * Supports optional density reduction (options.density) and decimal precision (options.decimalPrecision).
 */
export function geometryToAsciiSTL(geometry, solidName = 'STLPinCut3D', options = {}) {
  let name = solidName;
  let opts = options;
  if (typeof solidName === 'object' && solidName !== null) {
    opts = solidName;
    name = opts.solidName || 'STLPinCut3D';
  }

  let targetGeom = geometry;
  if (opts.density && opts.density < 0.98) {
    targetGeom = simplifyGeometry(geometry, opts.density, opts);
  }

  let nonIndexedGeom = targetGeom.index ? targetGeom.toNonIndexed() : targetGeom.clone();

  if (!nonIndexedGeom.attributes.normal) {
    nonIndexedGeom.computeVertexNormals();
  }

  const posAttr = nonIndexedGeom.attributes.position;
  const normalAttr = nonIndexedGeom.attributes.normal;
  const numFaces = Math.floor(posAttr.count / 3);

  const dec = typeof opts.decimalPrecision === 'number' ? opts.decimalPrecision : 6;
  const formatCoord = (val) => {
    if (dec >= 6) {
      return val.toExponential(6);
    }
    const fixed = val.toFixed(dec);
    return Object.is(Number(fixed), -0) ? '0' : fixed;
  };

  let output = `solid ${name.replace(/\s+/g, '_')}\n`;

  for (let i = 0; i < numFaces; i++) {
    const i3 = i * 3;
    const nx = normalAttr ? normalAttr.getX(i3) : 0;
    const ny = normalAttr ? normalAttr.getY(i3) : 0;
    const nz = normalAttr ? normalAttr.getZ(i3) : 1;

    output += `  facet normal ${formatCoord(nx)} ${formatCoord(ny)} ${formatCoord(nz)}\n`;
    output += `    outer loop\n`;

    for (let v = 0; v < 3; v++) {
      const vx = posAttr.getX(i3 + v);
      const vy = posAttr.getY(i3 + v);
      const vz = posAttr.getZ(i3 + v);
      output += `      vertex ${formatCoord(vx)} ${formatCoord(vy)} ${formatCoord(vz)}\n`;
    }

    output += `    endloop\n`;
    output += `  endfacet\n`;
  }

  output += `endsolid ${name.replace(/\s+/g, '_')}\n`;
  return output;
}

/**
 * Merges two BufferGeometries into a single BufferGeometry.
 */
export function mergeGeometries(geometries) {
  const validGeoms = geometries.filter(g => g && g.attributes && g.attributes.position);
  if (validGeoms.length === 0) return new THREE.BufferGeometry();
  if (validGeoms.length === 1) return validGeoms[0].clone();

  const allPositions = [];
  const allNormals = [];

  for (const geom of validGeoms) {
    const nonIndexed = geom.index ? geom.toNonIndexed() : geom;
    if (!nonIndexed.attributes.normal) {
      nonIndexed.computeVertexNormals();
    }
    const pos = nonIndexed.attributes.position;
    const norm = nonIndexed.attributes.normal;

    for (let i = 0; i < pos.count; i++) {
      allPositions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (norm) {
        allNormals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
      } else {
        allNormals.push(0, 1, 0);
      }
    }
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
  return merged;
}

/**
 * Triggers a browser file download for a single Blob.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Downloads a single mesh geometry as STL (Binary or ASCII).
 * Supports options for density and decimal precision.
 */
export function downloadMeshSTL(geometry, filename = 'model.stl', format = 'binary', options = {}) {
  const cleanFilename = filename.endsWith('.stl') ? filename : `${filename}.stl`;
  
  let effectiveFormat = format;
  let effectiveOpts = options;
  if (typeof format === 'object' && format !== null) {
    effectiveOpts = format;
    effectiveFormat = effectiveOpts.format || 'binary';
  }

  if (effectiveFormat === 'ascii') {
    const text = geometryToAsciiSTL(geometry, cleanFilename.replace('.stl', ''), effectiveOpts);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, cleanFilename);
  } else {
    const buffer = geometryToBinarySTL(geometry, cleanFilename.replace('.stl', ''), effectiveOpts);
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    downloadBlob(blob, cleanFilename);
  }
}

/**
 * Exports both sliced parts merged as a single combined modified STL file.
 */
export function downloadCombinedSTL(partA, partB, baseName = 'Modified_Model', format = 'binary', options = {}) {
  if (!partA?.geometry && !partB?.geometry) return;
  const geoms = [];
  if (partA?.geometry) geoms.push(partA.geometry);
  if (partB?.geometry) geoms.push(partB.geometry);

  let effectiveFormat = format;
  let effectiveOpts = options;
  if (typeof format === 'object' && format !== null) {
    effectiveOpts = format;
    effectiveFormat = effectiveOpts.format || 'binary';
  }

  const merged = mergeGeometries(geoms);
  downloadMeshSTL(merged, `${baseName}_Sliced_Combined.stl`, effectiveFormat, effectiveOpts);
}

/**
 * Bundles Part A, Part B, optional Standalone Dowel Pin, and Combined STL into a ZIP file with documentation.
 */
export async function downloadAllPartsZip(partA, partB, baseName = 'STL_PinCut_Model', options = {}) {
  const zip = new JSZip();
  const format = options.format || 'binary';
  const density = typeof options.density === 'number' ? options.density : 1.0;
  const decimalPrecision = options.decimalPrecision || 6;
  const dowelPinGeometry = options.dowelPinGeometry || null;
  const dowelSpecs = options.dowelSpecs || null;

  const cleanBase = baseName.replace(/\.stl$/i, '');

  const exportOpts = {
    density,
    decimalPrecision,
    format
  };

  if (partA && partA.geometry) {
    if (format === 'ascii') {
      const asciiA = geometryToAsciiSTL(partA.geometry, `${cleanBase}_Part_1`, exportOpts);
      zip.file(`${cleanBase}_Part_1.stl`, asciiA);
    } else {
      const bufferA = geometryToBinarySTL(partA.geometry, `${cleanBase}_Part_1`, exportOpts);
      zip.file(`${cleanBase}_Part_1.stl`, bufferA);
    }
  }

  if (partB && partB.geometry) {
    if (format === 'ascii') {
      const asciiB = geometryToAsciiSTL(partB.geometry, `${cleanBase}_Part_2`, exportOpts);
      zip.file(`${cleanBase}_Part_2.stl`, asciiB);
    } else {
      const bufferB = geometryToBinarySTL(partB.geometry, `${cleanBase}_Part_2`, exportOpts);
      zip.file(`${cleanBase}_Part_2.stl`, bufferB);
    }
  }

  // Include Standalone Dowel Pin if available
  if (dowelPinGeometry) {
    if (format === 'ascii') {
      zip.file(`${cleanBase}_Alignment_Dowel_Pin.stl`, geometryToAsciiSTL(dowelPinGeometry, `${cleanBase}_Dowel_Pin`, exportOpts));
    } else {
      zip.file(`${cleanBase}_Alignment_Dowel_Pin.stl`, geometryToBinarySTL(dowelPinGeometry, `${cleanBase}_Dowel_Pin`, exportOpts));
    }
  }

  // Also include combined modified STL in zip if requested
  if (options.includeCombined !== false && partA?.geometry && partB?.geometry) {
    const merged = mergeGeometries([partA.geometry, partB.geometry]);
    if (format === 'ascii') {
      zip.file(`${cleanBase}_Combined_Assembly.stl`, geometryToAsciiSTL(merged, `${cleanBase}_Combined`, exportOpts));
    } else {
      zip.file(`${cleanBase}_Combined_Assembly.stl`, geometryToBinarySTL(merged, `${cleanBase}_Combined`, exportOpts));
    }
  }

  const statsA = calculateGeometryStats(partA?.geometry, density);
  const statsB = calculateGeometryStats(partB?.geometry, density);

  // Readme info for 3D printing
  const infoText = `=====================================================
STL PinCut 3D - 3D Printing & Assembly Package
=====================================================
Model Name: ${cleanBase}
Export Date: ${new Date().toISOString()}
Export Format: ${format.toUpperCase()} STL
Mesh Density (Precision): ${Math.round(density * 100)}% (${density >= 0.98 ? 'Original CAD Resolution' : `Optimized with ${statsA.savingsPercent}% polygon reduction`})
${format === 'ascii' ? `ASCII Float Precision: ${decimalPrecision} decimals` : ''}

Files Included:
1. ${cleanBase}_Part_1.stl
   - Original Triangles: ${statsA.triangles.toLocaleString()}
   - Exported Triangles: ${statsA.projectedTriangles.toLocaleString()}
   - Features: Watertight planar cap with alignment features.
   
2. ${cleanBase}_Part_2.stl
   - Original Triangles: ${statsB.triangles.toLocaleString()}
   - Exported Triangles: ${statsB.projectedTriangles.toLocaleString()}
   - Features: Watertight planar cap with matching cylindrical socket hole(s).

${dowelPinGeometry ? `3. ${cleanBase}_Alignment_Dowel_Pin.stl
   - Specs: Diameter Ø${dowelSpecs?.diameter || 8}mm x Length ${dowelSpecs?.length || 20}mm (Chamfered tips)
   - Usage: Print separately to securely lock Part 1 and Part 2 together.
` : ''}
4. ${cleanBase}_Combined_Assembly.stl
   - Complete modified mesh with both sliced halves.

-----------------------------------------------------
Recommended 3D Slicer Settings (Cura / Prusa / Bambu / Orca):
-----------------------------------------------------
- Layer Height: 0.12mm - 0.20mm (0.16mm optimal for pin/hole tolerance fit)
- Infill: 15% - 25% (Gyroid, Cross Hatch or Grid)
- Wall Loops / Perimeters: 3 or 4 for structural pin & hole wall strength
- Build Plate Adhesion: Brim recommended for parts with small footprints
- Orientation: Orient the flat cut plane flat on the build plate for 100% support-free printing.
=====================================================
`;
  zip.file(`README_3D_PRINTING.txt`, infoText);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, `${cleanBase}_PinCut_3D_Package.zip`);
}

/**
 * Bundles multiple batch-processed sliced models into a consolidated ZIP archive.
 */
export async function downloadBatchProcessedZip(completedItems, sharedSettings = {}, options = {}) {
  const zip = new JSZip();
  const format = options.format || 'binary';
  const density = typeof options.density === 'number' ? options.density : 1.0;
  const decimalPrecision = options.decimalPrecision || 6;

  const exportOpts = {
    density,
    decimalPrecision,
    format
  };

  const modelSummaries = [];

  for (const item of completedItems) {
    if (!item.result) continue;
    const cleanName = (item.name || 'Model').replace(/\.stl$/i, '');
    const folder = zip.folder(cleanName);

    const { partA, partB, dowelPinGeometry, cutAreaCm2 } = item.result;

    if (partA && partA.geometry) {
      const part1Name = `${cleanName}_Part_1.stl`;
      if (format === 'ascii') {
        folder.file(part1Name, geometryToAsciiSTL(partA.geometry, `${cleanName}_Part_1`, exportOpts));
      } else {
        folder.file(part1Name, geometryToBinarySTL(partA.geometry, `${cleanName}_Part_1`, exportOpts));
      }
    }

    if (partB && partB.geometry) {
      const part2Name = `${cleanName}_Part_2.stl`;
      if (format === 'ascii') {
        folder.file(part2Name, geometryToAsciiSTL(partB.geometry, `${cleanName}_Part_2`, exportOpts));
      } else {
        folder.file(part2Name, geometryToBinarySTL(partB.geometry, `${cleanName}_Part_2`, exportOpts));
      }
    }

    if (dowelPinGeometry) {
      const dowelName = `${cleanName}_Alignment_Dowel_Pin.stl`;
      if (format === 'ascii') {
        folder.file(dowelName, geometryToAsciiSTL(dowelPinGeometry, `${cleanName}_Dowel_Pin`, exportOpts));
      } else {
        folder.file(dowelName, geometryToBinarySTL(dowelPinGeometry, `${cleanName}_Dowel_Pin`, exportOpts));
      }
    }

    if (partA?.geometry && partB?.geometry) {
      const merged = mergeGeometries([partA.geometry, partB.geometry]);
      const combinedName = `${cleanName}_Combined_Assembly.stl`;
      if (format === 'ascii') {
        folder.file(combinedName, geometryToAsciiSTL(merged, `${cleanName}_Combined`, exportOpts));
      } else {
        folder.file(combinedName, geometryToBinarySTL(merged, `${cleanName}_Combined`, exportOpts));
      }
    }

    const statsA = calculateGeometryStats(partA?.geometry, density);
    const statsB = calculateGeometryStats(partB?.geometry, density);

    modelSummaries.push({
      name: cleanName,
      cutAreaCm2: cutAreaCm2 || 0,
      part1Tris: statsA.projectedTriangles,
      part2Tris: statsB.projectedTriangles,
      totalTris: statsA.projectedTriangles + statsB.projectedTriangles,
      dowel: !!dowelPinGeometry
    });
  }

  // Generate Master Summary Report
  const clippingConfig = sharedSettings.clippingConfig || {};
  const pinConfig = sharedSettings.pinConfig || {};
  const planeAxis = clippingConfig.axis?.toUpperCase() || 'Y';
  const planeOffset = clippingConfig.offset || 0;
  const pinDiameter = pinConfig.diameter || pinConfig.size || 8;
  const pinDepth = pinConfig.depth || pinConfig.height || 10;
  const pinClearance = typeof pinConfig.clearance === 'number' ? pinConfig.clearance : 0.2;
  const pinType = pinConfig.type || 'cylinder';
  const pinMode = pinConfig.mode || 'pin_and_hole';

  let reportText = `========================================================================
STL PinCut 3D - Toplu Isleme (Batch Processing) Ozeti & Raporu
========================================================================
Tarih: ${new Date().toLocaleString()}
Islenen Toplam Model Sayisi: ${modelSummaries.length}
Format: ${format.toUpperCase()} STL (Hassasiyet/Yogunluk: %${Math.round(density * 100)})

UYGULANAN ORTAK KESME DUZLEMI AYARLARI:
- Kesim Ekseni: ${planeAxis}-Ekseni
- Duzlem Ofseti: ${planeOffset} mm
- Normal Yonu: ${clippingConfig.negate ? 'Ters Cevrilmis (-)' : 'Standart (+)'}
- Hizalama Pimi/Deligi: ${clippingConfig.addPinOnSlice !== false ? 'Aktif' : 'Pasif'}

UYGULANAN ORTAK PIM & DELIK AYARLARI:
- Mod: ${pinMode}
- Pim Tipi: ${pinType}
- Pim Capi: O${pinDiameter} mm
- Pim Derinligi / Boyu: ${pinDepth} mm
- 3D Baski Fit Toleransi: ${pinClearance} mm
- Yuzey Normaline Kitleme: ${pinConfig.snapToNormal !== false ? '90.0 Dik (Kilitli)' : 'Serbest'}
- Kesit Merkezine Kitleme: ${pinConfig.snapToCenter !== false ? 'Merkezde (0, 0)' : 'Ozel Ofset'}
- Flush Fit: ${pinConfig.flushFit !== false ? 'Aktif (+0.5mm dip emniyet payi ile sifir bosluklu montaj)' : 'Pasif'}

ISLENEN MODELLER LISTESI:
------------------------------------------------------------------------
`;

  modelSummaries.forEach((m, idx) => {
    reportText += `${idx + 1}. [${m.name}]
   - Kesit Alani: ${m.cutAreaCm2.toFixed(2)} cm2
   - Part 1 Ucgen Sayisi: ${m.part1Tris.toLocaleString()}
   - Part 2 Ucgen Sayisi: ${m.part2Tris.toLocaleString()}
   - Toplam Ucgen: ${m.totalTris.toLocaleString()}
   - Ayri Dubel Pimi: ${m.dowel ? 'Var' : 'Yok'}
`;
  });

  reportText += `
========================================================================
3D BASKI & MONTAJ TAVSIYELERI (Cura / Prusa / Bambu / OrcaSlicer):
========================================================================
1. Tablaya Yerlesim: Her parcanin duzlem kesim yuzeyini 3D yazici tablasina (Build Plate) sifir yatirin.
   Bu sayede hicbir destek (support) malzemesi kullanmadan %100 temiz ve puruzsuz basilir.
2. Katman Yuksekligi: 0.16mm (0.12mm - 0.20mm arasi tolerans uyumu icin idealdir).
3. Duvar Sayisi (Perimeters): En az 3 veya 4 duvar (pim ve delik yuvalarinin kirilmamasi icin).
4. Dolgu (Infill): %15 - %25 Gyroid veya Grid dolgu.
========================================================================
`;

  zip.file('BATCH_PROCESSING_SUMMARY.txt', reportText);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, `Batch_Sliced_STL_Package_${modelSummaries.length}_Models.zip`);
}
