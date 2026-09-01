import JSZip from 'jszip';
import * as THREE from 'three';

/**
 * Calculates geometry statistics (triangle count, vertex count, estimated binary/ascii file sizes).
 */
export function calculateGeometryStats(geometry) {
  if (!geometry) return { triangles: 0, vertices: 0, binarySize: 0, asciiSize: 0 };
  const posAttr = geometry.attributes.position;
  if (!posAttr) return { triangles: 0, vertices: 0, binarySize: 0, asciiSize: 0 };

  const triangles = geometry.index
    ? Math.floor(geometry.index.count / 3)
    : Math.floor(posAttr.count / 3);
  const vertices = posAttr.count;

  // Binary STL size: 84 header + 50 bytes per triangle
  const binarySize = 84 + triangles * 50;
  // ASCII STL size approx: 150-200 bytes per triangle
  const asciiSize = 100 + triangles * 180;

  return {
    triangles,
    vertices,
    binarySize,
    asciiSize,
    binarySizeFormatted: formatBytes(binarySize),
    asciiSizeFormatted: formatBytes(asciiSize)
  };
}

/**
 * Formats bytes to readable KB/MB string
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Converts Three.js BufferGeometry to binary STL ArrayBuffer.
 */
export function geometryToBinarySTL(geometry, headerTitle = 'STLPinCut3D') {
  let nonIndexedGeom = geometry.index ? geometry.toNonIndexed() : geometry.clone();

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
  const title = `STL PinCut 3D - ${headerTitle.substring(0, 60)}`;
  for (let i = 0; i < 80; i++) {
    dataView.setUint8(i, i < title.length ? title.charCodeAt(i) : 0x20);
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
 */
export function geometryToAsciiSTL(geometry, solidName = 'STLPinCut3D') {
  let nonIndexedGeom = geometry.index ? geometry.toNonIndexed() : geometry.clone();

  if (!nonIndexedGeom.attributes.normal) {
    nonIndexedGeom.computeVertexNormals();
  }

  const posAttr = nonIndexedGeom.attributes.position;
  const normalAttr = nonIndexedGeom.attributes.normal;
  const numFaces = Math.floor(posAttr.count / 3);

  let output = `solid ${solidName.replace(/\s+/g, '_')}\n`;

  for (let i = 0; i < numFaces; i++) {
    const i3 = i * 3;
    const nx = normalAttr ? normalAttr.getX(i3) : 0;
    const ny = normalAttr ? normalAttr.getY(i3) : 0;
    const nz = normalAttr ? normalAttr.getZ(i3) : 1;

    output += `  facet normal ${nx.toExponential(6)} ${ny.toExponential(6)} ${nz.toExponential(6)}\n`;
    output += `    outer loop\n`;

    for (let v = 0; v < 3; v++) {
      const vx = posAttr.getX(i3 + v);
      const vy = posAttr.getY(i3 + v);
      const vz = posAttr.getZ(i3 + v);
      output += `      vertex ${vx.toExponential(6)} ${vy.toExponential(6)} ${vz.toExponential(6)}\n`;
    }

    output += `    endloop\n`;
    output += `  endfacet\n`;
  }

  output += `endsolid ${solidName.replace(/\s+/g, '_')}\n`;
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
 */
export function downloadMeshSTL(geometry, filename = 'model.stl', format = 'binary') {
  const cleanFilename = filename.endsWith('.stl') ? filename : `${filename}.stl`;
  
  if (format === 'ascii') {
    const text = geometryToAsciiSTL(geometry, cleanFilename.replace('.stl', ''));
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, cleanFilename);
  } else {
    const buffer = geometryToBinarySTL(geometry, cleanFilename.replace('.stl', ''));
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    downloadBlob(blob, cleanFilename);
  }
}

/**
 * Exports both sliced parts merged as a single combined modified STL file.
 */
export function downloadCombinedSTL(partA, partB, baseName = 'Modified_Model', format = 'binary') {
  if (!partA?.geometry && !partB?.geometry) return;
  const geoms = [];
  if (partA?.geometry) geoms.push(partA.geometry);
  if (partB?.geometry) geoms.push(partB.geometry);

  const merged = mergeGeometries(geoms);
  downloadMeshSTL(merged, `${baseName}_Sliced_Combined.stl`, format);
}

/**
 * Bundles Part A, Part B, optional Standalone Dowel Pin, and Combined STL into a ZIP file with documentation.
 */
export async function downloadAllPartsZip(partA, partB, baseName = 'STL_PinCut_Model', options = {}) {
  const zip = new JSZip();
  const format = options.format || 'binary';
  const dowelPinGeometry = options.dowelPinGeometry || null;
  const dowelSpecs = options.dowelSpecs || null;

  const cleanBase = baseName.replace(/\.stl$/i, '');

  if (partA && partA.geometry) {
    if (format === 'ascii') {
      const asciiA = geometryToAsciiSTL(partA.geometry, `${cleanBase}_Part_1`);
      zip.file(`${cleanBase}_Part_1.stl`, asciiA);
    } else {
      const bufferA = geometryToBinarySTL(partA.geometry, `${cleanBase}_Part_1`);
      zip.file(`${cleanBase}_Part_1.stl`, bufferA);
    }
  }

  if (partB && partB.geometry) {
    if (format === 'ascii') {
      const asciiB = geometryToAsciiSTL(partB.geometry, `${cleanBase}_Part_2`);
      zip.file(`${cleanBase}_Part_2.stl`, asciiB);
    } else {
      const bufferB = geometryToBinarySTL(partB.geometry, `${cleanBase}_Part_2`);
      zip.file(`${cleanBase}_Part_2.stl`, bufferB);
    }
  }

  // Include Standalone Dowel Pin if available
  if (dowelPinGeometry) {
    if (format === 'ascii') {
      zip.file(`${cleanBase}_Alignment_Dowel_Pin.stl`, geometryToAsciiSTL(dowelPinGeometry, `${cleanBase}_Dowel_Pin`));
    } else {
      zip.file(`${cleanBase}_Alignment_Dowel_Pin.stl`, geometryToBinarySTL(dowelPinGeometry, `${cleanBase}_Dowel_Pin`));
    }
  }

  // Also include combined modified STL in zip if requested
  if (options.includeCombined !== false && partA?.geometry && partB?.geometry) {
    const merged = mergeGeometries([partA.geometry, partB.geometry]);
    if (format === 'ascii') {
      zip.file(`${cleanBase}_Combined_Assembly.stl`, geometryToAsciiSTL(merged, `${cleanBase}_Combined`));
    } else {
      zip.file(`${cleanBase}_Combined_Assembly.stl`, geometryToBinarySTL(merged, `${cleanBase}_Combined`));
    }
  }

  const statsA = calculateGeometryStats(partA?.geometry);
  const statsB = calculateGeometryStats(partB?.geometry);

  // Readme info for 3D printing
  const infoText = `=====================================================
STL PinCut 3D - 3D Printing & Assembly Package
=====================================================
Model Name: ${cleanBase}
Export Date: ${new Date().toISOString()}
Export Format: ${format.toUpperCase()} STL

Files Included:
1. ${cleanBase}_Part_1.stl
   - Triangle Count: ${statsA.triangles.toLocaleString()}
   - Features: Watertight planar cap with alignment features.
   
2. ${cleanBase}_Part_2.stl
   - Triangle Count: ${statsB.triangles.toLocaleString()}
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
