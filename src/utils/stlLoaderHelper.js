import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { generatePresetGeometry, SAMPLE_PRESETS } from './sampleModels';

/**
 * Calculates volume (mm^3) and surface area (mm^2) of a Three.js BufferGeometry.
 */
export function calculateMeshVolumeAndArea(geometry) {
  const geom = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geom.attributes.position;
  let totalVolume = 0;
  let totalArea = 0;

  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();
  const cross = new THREE.Vector3();

  const count = pos.count;
  for (let i = 0; i < count; i += 3) {
    p1.fromBufferAttribute(pos, i);
    p2.fromBufferAttribute(pos, i + 1);
    p3.fromBufferAttribute(pos, i + 2);

    // Signed volume of tetrahedron formed with origin
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

  return {
    volume: Math.abs(totalVolume),
    surfaceArea: totalArea
  };
}

/**
 * Checks if the ArrayBuffer is Binary STL or ASCII STL.
 */
export function isBinarySTL(buffer) {
  if (buffer.byteLength < 84) return false;
  const view = new DataView(buffer);
  const faceCount = view.getUint32(80, true);
  const expectedSize = 84 + faceCount * 50;
  return expectedSize === buffer.byteLength;
}

/**
 * Extracts metadata information from a Three.js BufferGeometry.
 */
export function extractGeometryInfo(geometry, name = 'Model', fileSize = 0, isBinary = true) {
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const bbox = geometry.boundingBox;
  const size = new THREE.Vector3();
  bbox.getSize(size);

  const posAttr = geometry.attributes.position;
  const triangleCount = geometry.index
    ? Math.floor(geometry.index.count / 3)
    : Math.floor(posAttr.count / 3);
  const vertexCount = posAttr.count;

  const { volume, surfaceArea } = calculateMeshVolumeAndArea(geometry);

  return {
    name,
    fileSize,
    isBinary,
    format: isBinary ? 'Binary STL' : 'ASCII STL',
    triangleCount,
    triangles: triangleCount,
    vertexCount,
    dimensions: {
      x: parseFloat(size.x.toFixed(2)),
      y: parseFloat(size.y.toFixed(2)),
      z: parseFloat(size.z.toFixed(2))
    },
    volumeCm3: parseFloat((volume / 1000).toFixed(2)),
    surfaceAreaCm2: parseFloat((surfaceArea / 100).toFixed(2)),
    boundingSphereRadius: parseFloat(
      (geometry.boundingSphere ? geometry.boundingSphere.radius : 35).toFixed(2)
    )
  };
}

/**
 * Loads and constructs a procedural sample model preset.
 */
export function loadSamplePreset(presetId) {
  const geometry = generatePresetGeometry(presetId);
  const presetMeta = SAMPLE_PRESETS.find(p => p.id === presetId) || { name: 'Sample Model' };
  const info = extractGeometryInfo(geometry, presetMeta.name, 0, true);

  const defaultMaterial = new THREE.MeshStandardMaterial({
    color: '#2dafa5',
    roughness: 0.38,
    metalness: 0.12,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, defaultMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return { mesh, info, geometry };
}

/**
 * Parses user-uploaded STL ArrayBuffer into a Three.js Mesh.
 */
export function parseCustomSTL(arrayBuffer, filename = 'Custom_Model.stl') {
  const loader = new STLLoader();
  const geometry = loader.parse(arrayBuffer);

  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }
  geometry.center();

  const isBinary = isBinarySTL(arrayBuffer);
  const info = extractGeometryInfo(geometry, filename, arrayBuffer.byteLength, isBinary);

  const defaultMaterial = new THREE.MeshStandardMaterial({
    color: '#2dafa5',
    roughness: 0.38,
    metalness: 0.12,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, defaultMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return { mesh, info, geometry };
}

/**
 * Parses STL from File or Blob or ArrayBuffer.
 */
export async function loadSTLFromSource(input, fallbackName = 'model.stl') {
  let arrayBuffer;
  let fileName = fallbackName;
  let fileSize = 0;

  if (input instanceof File) {
    fileName = input.name;
    fileSize = input.size;
    arrayBuffer = await input.arrayBuffer();
  } else if (input instanceof Blob) {
    fileSize = input.size;
    arrayBuffer = await input.arrayBuffer();
  } else if (input instanceof ArrayBuffer) {
    arrayBuffer = input;
    fileSize = input.byteLength;
  } else {
    throw new Error('Geçersiz STL veri formatı.');
  }

  return parseCustomSTL(arrayBuffer, fileName);
}

/**
 * Preset material themes for STL 3D viewing.
 */
export const MATERIAL_THEMES = [
  {
    id: 'sculpt',
    name: 'Turkuaz Kil (Sculpt)',
    color: '#2dafa5',
    roughness: 0.38,
    metalness: 0.12,
    normalShader: false
  },
  {
    id: 'studio_white',
    name: 'Stüdyo Mat Beyaz',
    color: '#e2e8f0',
    roughness: 0.5,
    metalness: 0.05,
    normalShader: false
  },
  {
    id: 'obsidian',
    name: 'Obsidiyen Mat Siyah',
    color: '#1e293b',
    roughness: 0.4,
    metalness: 0.2,
    normalShader: false
  },
  {
    id: 'metallic_steel',
    name: 'Metalik Titanyum',
    color: '#94a3b8',
    roughness: 0.2,
    metalness: 0.85,
    normalShader: false
  },
  {
    id: 'gold',
    name: 'Parlak Altın',
    color: '#eab308',
    roughness: 0.25,
    metalness: 0.9,
    normalShader: false
  },
  {
    id: 'emerald',
    name: 'Zümrüt Yeşili',
    color: '#10b981',
    roughness: 0.35,
    metalness: 0.2,
    normalShader: false
  },
  {
    id: 'normals',
    name: 'Normal Vektörleri (RGB)',
    color: '#ffffff',
    roughness: 0.5,
    metalness: 0.0,
    normalShader: true
  }
];
