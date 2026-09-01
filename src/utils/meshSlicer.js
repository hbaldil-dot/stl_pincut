import * as THREE from 'three';

/**
 * Calculates best-fit plane (center point and unit normal) from 3D points.
 */
export function calculateBestFitPlane(points) {
  if (!points || points.length < 3) {
    return {
      center: new THREE.Vector3(0, 0, 0),
      normal: new THREE.Vector3(0, 1, 0)
    };
  }

  // Calculate centroid
  const center = new THREE.Vector3();
  points.forEach(p => center.add(p));
  center.divideScalar(points.length);

  // Newell's method for arbitrary non-planar 3D polygon
  const normal = new THREE.Vector3();
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const current = points[i];
    const next = points[(i + 1) % n];

    normal.x += (current.y - next.y) * (current.z + next.z);
    normal.y += (current.z - next.z) * (current.x + next.x);
    normal.z += (current.x - next.x) * (current.y + next.y);
  }

  if (normal.lengthSq() < 0.0001) {
    normal.set(0, 1, 0);
  } else {
    normal.normalize();
  }

  if (normal.y < 0 && Math.abs(normal.y) > 0.3) {
    normal.negate();
  }

  return { center, normal };
}

/**
 * Creates 3D Connector Pin geometry based on type, dimensions, and normal orientation.
 */
export function createPinGeometry(config, center, normal) {
  const {
    type = 'cylinder', // 'cylinder' | 'pyramid' | 'hex'
    diameter = 8,
    size = 8,          // base diameter/width mm
    depth = 10,
    height = 10,       // height mm
    taper = 0.85,      // top width factor (e.g. 0.85 for easy insertion)
    flip = false
  } = config || {};

  const effectiveSize = diameter || size || 8;
  const effectiveHeight = depth || height || 10;
  const effNormal = flip ? normal.clone().negate() : normal.clone();
  const topSize = effectiveSize * (taper || 0.85);

  let pinGeom;
  if (type === 'cylinder') {
    pinGeom = new THREE.CylinderGeometry(topSize * 0.5, effectiveSize * 0.5, effectiveHeight, 32);
  } else if (type === 'hex') {
    pinGeom = new THREE.CylinderGeometry(topSize * 0.5, effectiveSize * 0.5, effectiveHeight, 6);
  } else {
    pinGeom = new THREE.CylinderGeometry(topSize * 0.5, effectiveSize * 0.5, effectiveHeight, 4);
  }

  // Rotate cylinder from default Y-axis to align with normal vector
  const defaultUp = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultUp, effNormal);
  pinGeom.applyQuaternion(quaternion);

  // Position pin so its base sits right on the cut plane center and extends along normal
  const offset = effNormal.clone().multiplyScalar(effectiveHeight * 0.5);
  const pinPos = center.clone().add(offset);
  pinGeom.translate(pinPos.x, pinPos.y, pinPos.z);
  pinGeom.computeVertexNormals();

  return { pinGeom, effNormal, pinPos };
}

/**
 * Creates a standalone 3D-printable cylindrical dowel pin BufferGeometry with beveled/chamfered ends.
 */
export function createDowelPinGeometry(diameter = 8, length = 18, chamfer = 0.6) {
  const radius = Math.max(0.5, diameter * 0.5);
  const safeLength = Math.max(2.0, length);
  const safeChamfer = Math.min(chamfer, radius * 0.35, safeLength * 0.15);

  // Cross section for lathe with chamfered tips
  const points = [
    new THREE.Vector2(0, -safeLength * 0.5),
    new THREE.Vector2(Math.max(0.1, radius - safeChamfer), -safeLength * 0.5),
    new THREE.Vector2(radius, -safeLength * 0.5 + safeChamfer),
    new THREE.Vector2(radius, safeLength * 0.5 - safeChamfer),
    new THREE.Vector2(Math.max(0.1, radius - safeChamfer), safeLength * 0.5),
    new THREE.Vector2(0, safeLength * 0.5)
  ];

  const geom = new THREE.LatheGeometry(points, 36);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Generates watertight planar capping vertices for a cut cross-section,
 * with optional cylindrical hole of specified diameter and depth recessed into the solid interior.
 */
export function buildCapWithOptionalHole(segments, center, planeNormal, outwardNormal, holeConfig = null) {
  const capVerts = [];
  if (!segments || segments.length === 0) return capVerts;

  const hasHole =
    holeConfig &&
    holeConfig.hasHole &&
    (holeConfig.diameter || holeConfig.size) > 0 &&
    (holeConfig.depth || holeConfig.height) > 0;

  // Case 1: Standard flat planar cap (no hole)
  if (!hasHole) {
    for (const [p1, p2] of segments) {
      const triNorm = new THREE.Vector3().crossVectors(
        new THREE.Vector3().subVectors(p2, p1),
        new THREE.Vector3().subVectors(center, p1)
      );

      if (triNorm.dot(outwardNormal) >= 0) {
        capVerts.push(
          center.x, center.y, center.z,
          p1.x, p1.y, p1.z,
          p2.x, p2.y, p2.z
        );
      } else {
        capVerts.push(
          center.x, center.y, center.z,
          p2.x, p2.y, p2.z,
          p1.x, p1.y, p1.z
        );
      }
    }
    return capVerts;
  }

  // Case 2: Capping with recessed cylindrical alignment hole
  const requestedDiameter = holeConfig.diameter || holeConfig.size || 8;
  const requestedDepth = holeConfig.depth || holeConfig.height || 10;

  // Calculate shortest distance from center to all boundary vertices to safeguard hole size
  let minBoundaryDist = Infinity;
  for (const [p1, p2] of segments) {
    const d1 = p1.distanceTo(center);
    const d2 = p2.distanceTo(center);
    if (d1 < minBoundaryDist) minBoundaryDist = d1;
    if (d2 < minBoundaryDist) minBoundaryDist = d2;
  }

  // Ensure hole radius leaves reasonable structural wall thickness
  const maxSafeRadius = minBoundaryDist > 1.5 ? minBoundaryDist * 0.88 : minBoundaryDist * 0.5;
  const safeRadius = Math.max(0.5, Math.min(requestedDiameter * 0.5, maxSafeRadius));
  const safeDepth = Math.max(1.0, requestedDepth);

  // Inward vector penetrating into the solid interior
  const inwardNormal = outwardNormal.clone().negate().normalize();

  // Construct orthonormal tangent vectors (u, v) on the cut plane
  const pNorm = planeNormal.clone().normalize();
  const u = new THREE.Vector3();
  if (Math.abs(pNorm.x) < 0.9) {
    u.crossVectors(pNorm, new THREE.Vector3(1, 0, 0)).normalize();
  } else {
    u.crossVectors(pNorm, new THREE.Vector3(0, 1, 0)).normalize();
  }
  const v = new THREE.Vector3().crossVectors(pNorm, u).normalize();

  // 1. Annular cut surface: connect cut boundary segments [p1, p2] to circle opening rim
  const addTriWithNormal = (a, b, c, targetNorm) => {
    const norm = new THREE.Vector3().crossVectors(
      new THREE.Vector3().subVectors(b, a),
      new THREE.Vector3().subVectors(c, a)
    );
    if (norm.dot(targetNorm) >= 0) {
      capVerts.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    } else {
      capVerts.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
    }
  };

  for (const [p1, p2] of segments) {
    const v1 = new THREE.Vector3().subVectors(p1, center);
    const v2 = new THREE.Vector3().subVectors(p2, center);

    const th1 = Math.atan2(v1.dot(v), v1.dot(u));
    const th2 = Math.atan2(v2.dot(v), v2.dot(u));

    const c1 = center.clone()
      .add(u.clone().multiplyScalar(safeRadius * Math.cos(th1)))
      .add(v.clone().multiplyScalar(safeRadius * Math.sin(th1)));

    const c2 = center.clone()
      .add(u.clone().multiplyScalar(safeRadius * Math.cos(th2)))
      .add(v.clone().multiplyScalar(safeRadius * Math.sin(th2)));

    addTriWithNormal(p1, p2, c2, outwardNormal);
    addTriWithNormal(p1, c2, c1, outwardNormal);
  }

  // 2. Discretize cylindrical hole rim and bottom points
  const numSegs = 28;
  const rimPoints = [];
  const botPoints = [];
  const holeBottomCenter = center.clone().add(inwardNormal.clone().multiplyScalar(safeDepth));

  for (let i = 0; i < numSegs; i++) {
    const angle = (i / numSegs) * Math.PI * 2;
    const rPt = center.clone()
      .add(u.clone().multiplyScalar(safeRadius * Math.cos(angle)))
      .add(v.clone().multiplyScalar(safeRadius * Math.sin(angle)));
    const bPt = rPt.clone().add(inwardNormal.clone().multiplyScalar(safeDepth));
    rimPoints.push(rPt);
    botPoints.push(bPt);
  }

  // 3. Cylinder Internal Walls (normals face inward towards hole axis cavity)
  const holeAxisMid = center.clone().add(inwardNormal.clone().multiplyScalar(safeDepth * 0.5));
  for (let i = 0; i < numSegs; i++) {
    const next = (i + 1) % numSegs;
    const r1 = rimPoints[i];
    const r2 = rimPoints[next];
    const b1 = botPoints[i];
    const b2 = botPoints[next];

    const midWall = new THREE.Vector3().add(r1).add(r2).add(b1).add(b2).multiplyScalar(0.25);
    const desiredWallNorm = new THREE.Vector3().subVectors(holeAxisMid, midWall).normalize();

    addTriWithNormal(r1, r2, b2, desiredWallNorm);
    addTriWithNormal(r1, b2, b1, desiredWallNorm);
  }

  // 4. Cylinder Bottom Disk (sealing the cavity base)
  for (let i = 0; i < numSegs; i++) {
    const next = (i + 1) % numSegs;
    const b1 = botPoints[i];
    const b2 = botPoints[next];

    addTriWithNormal(holeBottomCenter, b1, b2, outwardNormal);
  }

  return capVerts;
}

/**
 * Slices a mesh exactly along an arbitrary mathematical 3D clipping plane:
 * Plane Equation: normal.x * x + normal.y * y + normal.z * z + planeConstant = 0
 * 
 * Performs exact triangle-plane cutting, splits into Part A (>= 0) and Part B (<= 0),
 * caps the cut cross-section with user-defined cylindrical holes / alignment pins,
 * creating watertight 3D-printable STL solids.
 */
export function sliceMeshWithPlane(mesh, normalVec, planeOffset, pinConfig = null, addPin = true) {
  if (!mesh || !mesh.geometry) return null;

  const normal = normalVec.clone().normalize();
  const planeConstant = -planeOffset;
  const plane = new THREE.Plane(normal, planeConstant);

  const originalGeom = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  const posAttr = originalGeom.attributes.position;
  const numTriangles = posAttr.count / 3;
  const matrixWorld = mesh.matrixWorld;

  const partAVerts = [];
  const partBVerts = [];
  const intersectionSegments = []; // Pairs of Vector3 [p1, p2] on cut plane

  const eps = 1e-5;

  const interpolateEdge = (vA, vB, dA, dB) => {
    const t = -dA / (dB - dA);
    return new THREE.Vector3().lerpVectors(vA, vB, Math.max(0, Math.min(1, t)));
  };

  for (let i = 0; i < numTriangles; i++) {
    const i3 = i * 3;
    const v1 = new THREE.Vector3(posAttr.getX(i3), posAttr.getY(i3), posAttr.getZ(i3)).applyMatrix4(matrixWorld);
    const v2 = new THREE.Vector3(posAttr.getX(i3 + 1), posAttr.getY(i3 + 1), posAttr.getZ(i3 + 1)).applyMatrix4(matrixWorld);
    const v3 = new THREE.Vector3(posAttr.getX(i3 + 2), posAttr.getY(i3 + 2), posAttr.getZ(i3 + 2)).applyMatrix4(matrixWorld);

    const d1 = plane.distanceToPoint(v1);
    const d2 = plane.distanceToPoint(v2);
    const d3 = plane.distanceToPoint(v3);

    const s1 = d1 >= -eps ? 1 : -1;
    const s2 = d2 >= -eps ? 1 : -1;
    const s3 = d3 >= -eps ? 1 : -1;

    // Case 1: All vertices on Side A
    if (s1 === 1 && s2 === 1 && s3 === 1) {
      partAVerts.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
      continue;
    }

    // Case 2: All vertices on Side B
    if (s1 === -1 && s2 === -1 && s3 === -1) {
      partBVerts.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
      continue;
    }

    // Case 3: Cut triangle across plane
    const verts = [v1, v2, v3];
    const dists = [d1, d2, d3];
    const signs = [s1, s2, s3];

    let singleIdx = -1;
    if (signs[0] !== signs[1] && signs[0] !== signs[2]) singleIdx = 0;
    else if (signs[1] !== signs[0] && signs[1] !== signs[2]) singleIdx = 1;
    else singleIdx = 2;

    const iA = singleIdx;
    const iB = (singleIdx + 1) % 3;
    const iC = (singleIdx + 2) % 3;

    const vSingle = verts[iA];
    const dSingle = dists[iA];
    const vNext1 = verts[iB];
    const dNext1 = dists[iB];
    const vNext2 = verts[iC];
    const dNext2 = dists[iC];

    const int1 = interpolateEdge(vSingle, vNext1, dSingle, dNext1);
    const int2 = interpolateEdge(vSingle, vNext2, dSingle, dNext2);

    if (signs[iA] === 1) {
      partAVerts.push(
        vSingle.x, vSingle.y, vSingle.z,
        int1.x, int1.y, int1.z,
        int2.x, int2.y, int2.z
      );

      partBVerts.push(
        vNext1.x, vNext1.y, vNext1.z,
        vNext2.x, vNext2.y, vNext2.z,
        int2.x, int2.y, int2.z,

        vNext1.x, vNext1.y, vNext1.z,
        int2.x, int2.y, int2.z,
        int1.x, int1.y, int1.z
      );

      intersectionSegments.push([int1, int2]);
    } else {
      partBVerts.push(
        vSingle.x, vSingle.y, vSingle.z,
        int1.x, int1.y, int1.z,
        int2.x, int2.y, int2.z
      );

      partAVerts.push(
        vNext1.x, vNext1.y, vNext1.z,
        vNext2.x, vNext2.y, vNext2.z,
        int2.x, int2.y, int2.z,

        vNext1.x, vNext1.y, vNext1.z,
        int2.x, int2.y, int2.z,
        int1.x, int1.y, int1.z
      );

      intersectionSegments.push([int2, int1]);
    }
  }

  // Calculate cut cross-section center and area
  let center = new THREE.Vector3();
  let totalCapArea = 0;

  if (intersectionSegments.length > 0) {
    intersectionSegments.forEach(([p1, p2]) => {
      center.add(p1).add(p2);
    });
    center.divideScalar(intersectionSegments.length * 2);

    // Project center onto the plane to guarantee exact coplanarity
    plane.projectPoint(center, center);

    // Calculate planar cut area
    for (const [p1, p2] of intersectionSegments) {
      const triNorm = new THREE.Vector3().crossVectors(
        new THREE.Vector3().subVectors(p2, p1),
        new THREE.Vector3().subVectors(center, p1)
      );
      totalCapArea += triNorm.length() * 0.5;
    }
  } else {
    center = new THREE.Vector3(0, planeOffset, 0);
  }

  // Resolve Pin & Hole configuration
  const cfg = pinConfig || {};
  const mode = cfg.mode || 'pin_and_hole'; // 'pin_and_hole' | 'holes_both' | 'hole_only' | 'pin_only' | 'flat'
  const diameter = cfg.diameter || cfg.size || 8;
  const depth = cfg.depth || cfg.height || 10;
  const clearance = typeof cfg.clearance === 'number' ? cfg.clearance : 0.2; // mm

  const outwardNormalA = normal.clone().negate(); // Outward for Part A's cut face is -n
  const outwardNormalB = normal.clone();          // Outward for Part B's cut face is +n

  let holeConfigA = { hasHole: false };
  let holeConfigB = { hasHole: false };
  let shouldAddPinA = false;

  if (addPin && mode !== 'flat') {
    if (mode === 'pin_and_hole') {
      shouldAddPinA = true;
      // Part B gets matching cylindrical hole with fit tolerance clearance
      holeConfigB = {
        hasHole: true,
        diameter: diameter + clearance * 2,
        depth: depth + clearance
      };
    } else if (mode === 'holes_both') {
      // Both parts receive matching cylindrical holes for separate dowel pin insertion
      holeConfigA = {
        hasHole: true,
        diameter: diameter,
        depth: depth
      };
      holeConfigB = {
        hasHole: true,
        diameter: diameter,
        depth: depth
      };
    } else if (mode === 'hole_only') {
      holeConfigB = {
        hasHole: true,
        diameter: diameter,
        depth: depth
      };
    } else if (mode === 'pin_only') {
      shouldAddPinA = true;
    }
  }

  // 1. Build Capping for Part A
  const capVertsA = buildCapWithOptionalHole(
    intersectionSegments,
    center,
    normal,
    outwardNormalA,
    holeConfigA
  );
  partAVerts.push(...capVertsA);

  // 2. Build Capping for Part B
  const capVertsB = buildCapWithOptionalHole(
    intersectionSegments,
    center,
    normal,
    outwardNormalB,
    holeConfigB
  );
  partBVerts.push(...capVertsB);

  // 3. Add Protruding Male Pin to Part A if configured
  let effNormal = normal.clone();
  if (shouldAddPinA) {
    const pinPayload = {
      type: cfg.type || 'cylinder',
      diameter: diameter,
      size: diameter,
      depth: depth,
      height: depth,
      taper: cfg.taper || 0.85,
      flip: true // pin points from Part A into Part B along -normal
    };
    const { pinGeom, effNormal: pinEffNorm } = createPinGeometry(pinPayload, center, normal);
    effNormal = pinEffNorm;
    const pinPos = pinGeom.attributes.position;
    for (let i = 0; i < pinPos.count; i++) {
      partAVerts.push(pinPos.getX(i), pinPos.getY(i), pinPos.getZ(i));
    }
  }

  // Build Final BufferGeometries
  const geomA = new THREE.BufferGeometry();
  geomA.setAttribute('position', new THREE.Float32BufferAttribute(partAVerts, 3));
  geomA.computeVertexNormals();

  const geomB = new THREE.BufferGeometry();
  geomB.setAttribute('position', new THREE.Float32BufferAttribute(partBVerts, 3));
  geomB.computeVertexNormals();

  // Distinct Materials
  const matA = new THREE.MeshStandardMaterial({
    color: '#0284c7', // Sky Blue
    roughness: 0.35,
    metalness: 0.15,
    side: THREE.DoubleSide
  });

  const matB = new THREE.MeshStandardMaterial({
    color: '#10b981', // Emerald Mint
    roughness: 0.35,
    metalness: 0.15,
    side: THREE.DoubleSide
  });

  const meshA = new THREE.Mesh(geomA, matA);
  const meshB = new THREE.Mesh(geomB, matB);

  // Generate matching standalone Dowel Pin geometry (for separate 3D print download)
  const dowelLength = mode === 'holes_both' ? depth * 2 : depth;
  const dowelDiameter = Math.max(1.0, diameter - clearance * 2);
  const dowelPinGeom = createDowelPinGeometry(dowelDiameter, dowelLength, 0.6);

  return {
    partA: meshA,
    partB: meshB,
    center,
    normal: effNormal,
    plane,
    cutAreaCm2: parseFloat((totalCapArea / 100).toFixed(2)),
    triangleCountA: Math.floor(partAVerts.length / 9),
    triangleCountB: Math.floor(partBVerts.length / 9),
    intersectionSegmentsCount: intersectionSegments.length,
    pinConfig: {
      mode,
      diameter,
      depth,
      clearance,
      type: cfg.type || 'cylinder',
      taper: cfg.taper || 0.85
    },
    dowelPinGeometry: dowelPinGeom,
    dowelSpecs: {
      diameter: dowelDiameter,
      length: dowelLength,
      clearance
    }
  };
}

/**
 * Creates a triangulated flat cap polygon from boundary loop points.
 */
export function createCapGeometry(loopPoints, center, normal, invertNormal = false) {
  if (!loopPoints || loopPoints.length < 3) return new THREE.BufferGeometry();

  const vertices = [];
  const n = loopPoints.length;

  for (let i = 0; i < n; i++) {
    const p1 = loopPoints[i];
    const p2 = loopPoints[(i + 1) % n];

    if (!invertNormal) {
      vertices.push(center.x, center.y, center.z);
      vertices.push(p1.x, p1.y, p1.z);
      vertices.push(p2.x, p2.y, p2.z);
    } else {
      vertices.push(center.x, center.y, center.z);
      vertices.push(p2.x, p2.y, p2.z);
      vertices.push(p1.x, p1.y, p1.z);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.computeVertexNormals();
  return geom;
}

/**
 * Slices a Three.js Mesh along a plane defined by contour/lasso points.
 */
export function sliceMeshWithPins(mesh, loopPoints, pinConfig) {
  if (!mesh || !mesh.geometry) return null;

  const { center, normal } = calculateBestFitPlane(loopPoints);
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, center);
  const planeOffset = -plane.constant;

  return sliceMeshWithPlane(mesh, normal, planeOffset, pinConfig, true);
}

export const sliceMeshWithLasso = sliceMeshWithPins;
