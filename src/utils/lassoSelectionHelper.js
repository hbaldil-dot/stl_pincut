import * as THREE from 'three';

/**
 * Point-in-Polygon test using the Ray-Casting algorithm (Jordan Curve Theorem).
 * Determines if a 2D point (px, py) is inside a polygon defined by an array of {x, y} vertices.
 */
export function isPointInPolygon(px, py, polygon) {
  if (!polygon || polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculates 2D axis-aligned bounding box of a polygon.
 */
export function getPolygonBoundingBox(polygon) {
  if (!polygon || polygon.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  let minX = polygon[0].x;
  let maxX = polygon[0].x;
  let minY = polygon[0].y;
  let maxY = polygon[0].y;

  for (let i = 1; i < polygon.length; i++) {
    const p = polygon[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Performs a Raycaster-based Lasso Selection on an STL BufferGeometry.
 * 
 * Algorithm:
 * 1. Collects screen-projected vertices and face centers of the mesh.
 * 2. Checks which vertices/faces fall within the 2D lasso polygon traced by the user.
 * 3. Uses Raycaster and face normals to filter for camera-facing / visible surface triangles.
 * 4. Also incorporates any faces directly intersected by the raycaster along the mouse path stroke.
 * 5. Identifies all intersecting vertices (unique indices & positions) of the selected faces.
 * 6. Calculates total selected surface area, centroid, and average normal.
 * 
 * @param {Object} params
 * @param {THREE.Mesh} params.mesh - The target 3D STL mesh
 * @param {Array<{x: number, y: number}>} params.screenPoints - Traced mouse path points in canvas pixel coordinates
 * @param {Array<THREE.Vector3>} [params.surfacePoints] - 3D raycast hit points along the stroke
 * @param {Array<number>} [params.strokeFaceIndices] - Faces hit directly by raycaster while drawing
 * @param {THREE.Camera} params.camera - The active Three.js camera
 * @param {HTMLCanvasElement} params.canvas - The WebGL canvas element
 * @param {THREE.Raycaster} params.raycaster - Three.js Raycaster instance
 * @param {Object} [params.options] - Configuration options
 * @param {boolean} [params.options.frontFacingOnly=true] - Only select faces pointing towards the camera
 * @param {string} [params.options.mode='replace'] - 'replace' | 'add' | 'subtract'
 * @param {Array<number>} [params.existingSelection=[]] - Current selected face indices
 * 
 * @returns {Object} { selectedFaceIndices, selectedVertexIndices, surfaceArea, centroid, normal, faceCount, vertexCount }
 */
export function performLassoRaycastSelection({
  mesh,
  screenPoints = [],
  surfacePoints = [],
  strokeFaceIndices = [],
  camera,
  canvas,
  raycaster,
  options = {}
}) {
  if (!mesh || !mesh.geometry || !camera || !canvas) {
    return {
      selectedFaceIndices: [],
      selectedVertexIndices: [],
      surfaceArea: 0,
      centroid: new THREE.Vector3(0, 0, 0),
      normal: new THREE.Vector3(0, 1, 0),
      faceCount: 0,
      vertexCount: 0
    };
  }

  const {
    frontFacingOnly = true,
    mode = 'replace',
    existingSelection = []
  } = options;

  const geometry = mesh.geometry;
  const posAttr = geometry.attributes.position;
  if (!posAttr) {
    return {
      selectedFaceIndices: [],
      selectedVertexIndices: [],
      surfaceArea: 0,
      centroid: new THREE.Vector3(0, 0, 0),
      normal: new THREE.Vector3(0, 1, 0),
      faceCount: 0,
      vertexCount: 0
    };
  }

  const isIndexed = !!geometry.index;
  const indexAttr = geometry.index;
  const triangleCount = isIndexed
    ? Math.floor(indexAttr.count / 3)
    : Math.floor(posAttr.count / 3);

  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  mesh.updateMatrixWorld(true);
  const matrixWorld = mesh.matrixWorld;

  const newSelection = new Set();

  // If adding or subtracting, initialize with existing selection
  if (mode === 'add' || mode === 'subtract') {
    existingSelection.forEach((idx) => newSelection.add(idx));
  }

  // 1. Incorporate direct raycast hits along the stroke
  if (strokeFaceIndices && strokeFaceIndices.length > 0) {
    strokeFaceIndices.forEach((fIdx) => {
      if (fIdx >= 0 && fIdx < triangleCount) {
        if (mode === 'subtract') {
          newSelection.delete(fIdx);
        } else {
          newSelection.add(fIdx);
        }
      }
    });
  }

  // 2. If user traced a polygon (at least 3 points), perform screen-space projection & containment test
  const hasPolygon = screenPoints && screenPoints.length >= 3;
  if (hasPolygon) {
    const bbox = getPolygonBoundingBox(screenPoints);

    // Reuse vector instances to avoid garbage collection overhead
    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();
    const center = new THREE.Vector3();
    const edge1 = new THREE.Vector3();
    const edge2 = new THREE.Vector3();
    const faceNormal = new THREE.Vector3();
    const viewDir = new THREE.Vector3();
    const projCenter = new THREE.Vector3();
    const projA = new THREE.Vector3();
    const projB = new THREE.Vector3();
    const projC = new THREE.Vector3();

    // Helper to convert normalized device coordinate (-1 to 1) to canvas pixel
    const ndcToScreen = (ndc, out) => {
      out.x = ((ndc.x + 1) * 0.5) * width + rect.left;
      out.y = ((-ndc.y + 1) * 0.5) * height + rect.top;
      return out;
    };

    const screenA = { x: 0, y: 0 };
    const screenB = { x: 0, y: 0 };
    const screenC = { x: 0, y: 0 };
    const screenCenter = { x: 0, y: 0 };

    for (let f = 0; f < triangleCount; f++) {
      let idx0, idx1, idx2;
      if (isIndexed) {
        idx0 = indexAttr.getX(f * 3);
        idx1 = indexAttr.getX(f * 3 + 1);
        idx2 = indexAttr.getX(f * 3 + 2);
      } else {
        idx0 = f * 3;
        idx1 = f * 3 + 1;
        idx2 = f * 3 + 2;
      }

      vA.fromBufferAttribute(posAttr, idx0).applyMatrix4(matrixWorld);
      vB.fromBufferAttribute(posAttr, idx1).applyMatrix4(matrixWorld);
      vC.fromBufferAttribute(posAttr, idx2).applyMatrix4(matrixWorld);

      // Compute face center
      center.set(
        (vA.x + vB.x + vC.x) / 3,
        (vA.y + vB.y + vC.y) / 3,
        (vA.z + vB.z + vC.z) / 3
      );

      // Camera view direction & front-facing test
      if (camera.isPerspectiveCamera) {
        viewDir.subVectors(camera.position, center);
      } else {
        camera.getWorldDirection(viewDir).negate();
      }

      edge1.subVectors(vB, vA);
      edge2.subVectors(vC, vA);
      faceNormal.crossVectors(edge1, edge2).normalize();

      const dot = faceNormal.dot(viewDir);
      if (frontFacingOnly && dot <= 0.0) {
        // Face points away from camera
        continue;
      }

      // Project vertices & center to screen coordinates
      projCenter.copy(center).project(camera);
      // Skip if behind near plane or beyond far plane
      if (projCenter.z < -1.0 || projCenter.z > 1.0) continue;

      ndcToScreen(projCenter, screenCenter);

      // Bounding box pre-check for quick rejection
      projA.copy(vA).project(camera);
      projB.copy(vB).project(camera);
      projC.copy(vC).project(camera);

      ndcToScreen(projA, screenA);
      ndcToScreen(projB, screenB);
      ndcToScreen(projC, screenC);

      const triMinX = Math.min(screenA.x, screenB.x, screenC.x);
      const triMaxX = Math.max(screenA.x, screenB.x, screenC.x);
      const triMinY = Math.min(screenA.y, screenB.y, screenC.y);
      const triMaxY = Math.max(screenA.y, screenB.y, screenC.y);

      if (
        triMaxX < bbox.minX ||
        triMinX > bbox.maxX ||
        triMaxY < bbox.minY ||
        triMinY > bbox.maxY
      ) {
        continue;
      }

      // Check containment: if centroid is in polygon OR at least two vertices are in polygon
      const centerIn = isPointInPolygon(screenCenter.x, screenCenter.y, screenPoints);
      let verticesInCount = 0;
      if (isPointInPolygon(screenA.x, screenA.y, screenPoints)) verticesInCount++;
      if (isPointInPolygon(screenB.x, screenB.y, screenPoints)) verticesInCount++;
      if (isPointInPolygon(screenC.x, screenC.y, screenPoints)) verticesInCount++;

      const isFaceSelected = centerIn || verticesInCount >= 2;

      if (isFaceSelected) {
        if (mode === 'subtract') {
          newSelection.delete(f);
        } else {
          newSelection.add(f);
        }
      }
    }
  }

  const selectedFaceIndices = Array.from(newSelection).sort((a, b) => a - b);

  // 3. Identify all intersecting vertices from the selected faces
  const vertexIndexSet = new Set();
  let totalArea = 0;
  const avgCenter = new THREE.Vector3();
  const avgNormal = new THREE.Vector3();

  const tempA = new THREE.Vector3();
  const tempB = new THREE.Vector3();
  const tempC = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const fNorm = new THREE.Vector3();

  selectedFaceIndices.forEach((f) => {
    let i0, i1, i2;
    if (isIndexed) {
      i0 = indexAttr.getX(f * 3);
      i1 = indexAttr.getX(f * 3 + 1);
      i2 = indexAttr.getX(f * 3 + 2);
    } else {
      i0 = f * 3;
      i1 = f * 3 + 1;
      i2 = f * 3 + 2;
    }

    vertexIndexSet.add(i0);
    vertexIndexSet.add(i1);
    vertexIndexSet.add(i2);

    tempA.fromBufferAttribute(posAttr, i0).applyMatrix4(matrixWorld);
    tempB.fromBufferAttribute(posAttr, i1).applyMatrix4(matrixWorld);
    tempC.fromBufferAttribute(posAttr, i2).applyMatrix4(matrixWorld);

    // Compute area = 0.5 * |e1 x e2|
    e1.subVectors(tempB, tempA);
    e2.subVectors(tempC, tempA);
    fNorm.crossVectors(e1, e2);
    const area = fNorm.length() * 0.5;
    totalArea += area;

    fNorm.normalize();
    avgNormal.add(fNorm);

    avgCenter.add(tempA).add(tempB).add(tempC);
  });

  const selectedVertexIndices = Array.from(vertexIndexSet);

  if (selectedFaceIndices.length > 0) {
    avgCenter.divideScalar(selectedFaceIndices.length * 3);
    avgNormal.normalize();
  } else {
    avgNormal.set(0, 1, 0);
  }

  return {
    selectedFaceIndices,
    selectedVertexIndices,
    surfaceArea: parseFloat(totalArea.toFixed(2)),
    centroid: avgCenter,
    normal: avgNormal,
    faceCount: selectedFaceIndices.length,
    vertexCount: selectedVertexIndices.length,
    totalMeshFaces: triangleCount
  };
}

/**
 * Creates an explicit Three.js BufferGeometry containing only the selected faces.
 * Suitable for high-contrast highlighted rendering with polygonOffset.
 */
export function createSelectedFacesGeometry(mesh, selectedFaceIndices) {
  if (!mesh || !mesh.geometry || !selectedFaceIndices || selectedFaceIndices.length === 0) {
    return null;
  }

  const geometry = mesh.geometry;
  const posAttr = geometry.attributes.position;
  if (!posAttr) return null;

  const isIndexed = !!geometry.index;
  const indexAttr = geometry.index;
  const faceCount = selectedFaceIndices.length;

  const positions = new Float32Array(faceCount * 9);
  const normals = new Float32Array(faceCount * 9);

  const normAttr = geometry.attributes.normal;

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const nA = new THREE.Vector3();
  const nB = new THREE.Vector3();
  const nC = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const computedNormal = new THREE.Vector3();

  for (let i = 0; i < faceCount; i++) {
    const f = selectedFaceIndices[i];
    let i0, i1, i2;
    if (isIndexed) {
      i0 = indexAttr.getX(f * 3);
      i1 = indexAttr.getX(f * 3 + 1);
      i2 = indexAttr.getX(f * 3 + 2);
    } else {
      i0 = f * 3;
      i1 = f * 3 + 1;
      i2 = f * 3 + 2;
    }

    vA.fromBufferAttribute(posAttr, i0);
    vB.fromBufferAttribute(posAttr, i1);
    vC.fromBufferAttribute(posAttr, i2);

    const base = i * 9;
    positions[base] = vA.x;
    positions[base + 1] = vA.y;
    positions[base + 2] = vA.z;

    positions[base + 3] = vB.x;
    positions[base + 4] = vB.y;
    positions[base + 5] = vB.z;

    positions[base + 6] = vC.x;
    positions[base + 7] = vC.y;
    positions[base + 8] = vC.z;

    if (normAttr) {
      nA.fromBufferAttribute(normAttr, i0);
      nB.fromBufferAttribute(normAttr, i1);
      nC.fromBufferAttribute(normAttr, i2);

      normals[base] = nA.x;
      normals[base + 1] = nA.y;
      normals[base + 2] = nA.z;

      normals[base + 3] = nB.x;
      normals[base + 4] = nB.y;
      normals[base + 5] = nB.z;

      normals[base + 6] = nC.x;
      normals[base + 7] = nC.y;
      normals[base + 8] = nC.z;
    } else {
      e1.subVectors(vB, vA);
      e2.subVectors(vC, vA);
      computedNormal.crossVectors(e1, e2).normalize();

      for (let k = 0; k < 3; k++) {
        normals[base + k * 3] = computedNormal.x;
        normals[base + k * 3 + 1] = computedNormal.y;
        normals[base + k * 3 + 2] = computedNormal.z;
      }
    }
  }

  const highlightGeom = new THREE.BufferGeometry();
  highlightGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  highlightGeom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

  return highlightGeom;
}

/**
 * Creates a point cloud geometry representing the unique intersecting vertices of the selected faces.
 */
export function createSelectedVerticesGeometry(mesh, selectedVertexIndices) {
  if (!mesh || !mesh.geometry || !selectedVertexIndices || selectedVertexIndices.length === 0) {
    return null;
  }

  const posAttr = mesh.geometry.attributes.position;
  if (!posAttr) return null;

  const count = selectedVertexIndices.length;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const vIdx = selectedVertexIndices[i];
    positions[i * 3] = posAttr.getX(vIdx);
    positions[i * 3 + 1] = posAttr.getY(vIdx);
    positions[i * 3 + 2] = posAttr.getZ(vIdx);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geom;
}

/**
 * Deletes selected faces from a Three.js Mesh geometry, returning a new modified Mesh.
 */
export function deleteSelectedFacesFromMesh(mesh, selectedFaceIndices) {
  if (!mesh || !mesh.geometry || !selectedFaceIndices || selectedFaceIndices.length === 0) {
    return mesh;
  }

  const geometry = mesh.geometry;
  const posAttr = geometry.attributes.position;
  const normAttr = geometry.attributes.normal;
  const isIndexed = !!geometry.index;
  const indexAttr = geometry.index;
  const totalFaces = isIndexed
    ? Math.floor(indexAttr.count / 3)
    : Math.floor(posAttr.count / 3);

  const deleteSet = new Set(selectedFaceIndices);
  const remainingFaceCount = totalFaces - deleteSet.size;

  if (remainingFaceCount <= 0) {
    return null; // All faces deleted
  }

  const newPositions = new Float32Array(remainingFaceCount * 9);
  const newNormals = normAttr ? new Float32Array(remainingFaceCount * 9) : null;

  let writeIdx = 0;
  for (let f = 0; f < totalFaces; f++) {
    if (deleteSet.has(f)) continue;

    let i0, i1, i2;
    if (isIndexed) {
      i0 = indexAttr.getX(f * 3);
      i1 = indexAttr.getX(f * 3 + 1);
      i2 = indexAttr.getX(f * 3 + 2);
    } else {
      i0 = f * 3;
      i1 = f * 3 + 1;
      i2 = f * 3 + 2;
    }

    const base = writeIdx * 9;

    newPositions[base] = posAttr.getX(i0);
    newPositions[base + 1] = posAttr.getY(i0);
    newPositions[base + 2] = posAttr.getZ(i0);

    newPositions[base + 3] = posAttr.getX(i1);
    newPositions[base + 4] = posAttr.getY(i1);
    newPositions[base + 5] = posAttr.getZ(i1);

    newPositions[base + 6] = posAttr.getX(i2);
    newPositions[base + 7] = posAttr.getY(i2);
    newPositions[base + 8] = posAttr.getZ(i2);

    if (newNormals && normAttr) {
      newNormals[base] = normAttr.getX(i0);
      newNormals[base + 1] = normAttr.getY(i0);
      newNormals[base + 2] = normAttr.getZ(i0);

      newNormals[base + 3] = normAttr.getX(i1);
      newNormals[base + 4] = normAttr.getY(i1);
      newNormals[base + 5] = normAttr.getZ(i1);

      newNormals[base + 6] = normAttr.getX(i2);
      newNormals[base + 7] = normAttr.getY(i2);
      newNormals[base + 8] = normAttr.getZ(i2);
    }

    writeIdx++;
  }

  const newGeometry = new THREE.BufferGeometry();
  newGeometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
  if (newNormals) {
    newGeometry.setAttribute('normal', new THREE.BufferAttribute(newNormals, 3));
  } else {
    newGeometry.computeVertexNormals();
  }

  newGeometry.computeBoundingBox();
  newGeometry.computeBoundingSphere();

  const newMesh = new THREE.Mesh(newGeometry, mesh.material.clone());
  newMesh.position.copy(mesh.position);
  newMesh.rotation.copy(mesh.rotation);
  newMesh.scale.copy(mesh.scale);
  newMesh.castShadow = true;
  newMesh.receiveShadow = true;

  return newMesh;
}
