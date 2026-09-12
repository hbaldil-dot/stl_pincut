import * as THREE from 'three';
import { calculateOverhangStatistics } from './supportHeatmap';

/**
 * Normalizes Euler angle into [-180, 180] degrees.
 */
export function normalizeDeg(deg) {
  return ((((deg % 360) + 540) % 360) - 180);
}

/**
 * Snaps angle to common cardinal angles if within threshold.
 */
export function snapToCardinalDeg(deg, tolerance = 1.2) {
  const cardinals = [-180, -90, 0, 90, 180];
  for (const c of cardinals) {
    if (Math.abs(deg - c) <= tolerance) {
      return c === -180 ? 180 : c;
    }
  }
  return parseFloat(deg.toFixed(1));
}

/**
 * Computes an orthonormal Euler rotation (XYZ) in degrees that rotates
 * `normalLocal` to point downwards onto the build bed (world vector: (0, -1, 0)).
 */
export function computeRotationForFlatBottom(normalLocal) {
  const norm = normalLocal.clone().normalize();
  const targetDown = new THREE.Vector3(0, -1, 0);

  // If already pointing down
  if (norm.distanceTo(targetDown) < 1e-4) {
    return { x: 0, y: 0, z: 0 };
  }

  // If pointing straight up, flip 180 deg around X
  const targetUp = new THREE.Vector3(0, 1, 0);
  if (norm.distanceTo(targetUp) < 1e-4) {
    return { x: 180, y: 0, z: 0 };
  }

  const q = new THREE.Quaternion().setFromUnitVectors(norm, targetDown);
  const euler = new THREE.Euler().setFromQuaternion(q, 'XYZ');

  let rx = snapToCardinalDeg(normalizeDeg(THREE.MathUtils.radToDeg(euler.x)));
  let ry = snapToCardinalDeg(normalizeDeg(THREE.MathUtils.radToDeg(euler.y)));
  let rz = snapToCardinalDeg(normalizeDeg(THREE.MathUtils.radToDeg(euler.z)));

  return { x: rx, y: ry, z: rz };
}

/**
 * Extracts candidate flat facets and significant planar surface clusters from a BufferGeometry.
 */
export function extractCandidateFlatNormals(geometry, options = {}) {
  if (!geometry) return [];

  const pos = geometry.attributes.position;
  if (!pos || pos.count < 3) return [];

  const index = geometry.index;
  const numTriangles = index ? index.count / 3 : pos.count / 3;

  // Stride for high-poly meshes to guarantee instantaneous analysis under 30ms
  const stride = numTriangles > 60000 ? Math.ceil(numTriangles / 45000) : 1;

  const clusters = [];
  const cosTol = Math.cos(THREE.MathUtils.degToRad(options.normalAngleToleranceDeg || 4.0)); // ~4 degrees

  let totalEstimatedArea = 0;

  for (let t = 0; t < numTriangles; t += stride) {
    const i0 = index ? index.getX(t * 3) : t * 3;
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;

    const p1x = pos.getX(i0), p1y = pos.getY(i0), p1z = pos.getZ(i0);
    const p2x = pos.getX(i1), p2y = pos.getY(i1), p2z = pos.getZ(i1);
    const p3x = pos.getX(i2), p3y = pos.getY(i2), p3z = pos.getZ(i2);

    const e1x = p2x - p1x, e1y = p2y - p1y, e1z = p2z - p1z;
    const e2x = p3x - p1x, e2y = p3y - p1y, e2z = p3z - p1z;

    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;

    const lenSq = nx * nx + ny * ny + nz * nz;
    if (lenSq <= 1e-12) continue;

    const len = Math.sqrt(lenSq);
    const area = len * 0.5;
    totalEstimatedArea += area;

    const unx = nx / len;
    const uny = ny / len;
    const unz = nz / len;

    // Check against existing clusters
    let matched = false;
    for (let c = 0; c < clusters.length; c++) {
      const cl = clusters[c];
      const dot = unx * cl.nx + uny * cl.ny + unz * cl.nz;
      if (dot >= cosTol) {
        cl.area += area;
        cl.count++;
        matched = true;
        break;
      }
    }

    if (!matched && clusters.length < 120) {
      clusters.push({
        nx: unx,
        ny: uny,
        nz: unz,
        area: area,
        count: 1
      });
    }
  }

  // Sort clusters by accumulated surface area
  clusters.sort((a, b) => b.area - a.area);

  // Collect candidate normals
  const candidates = [];
  const minAreaCutoff = totalEstimatedArea * 0.005; // at least 0.5% of total area

  for (const c of clusters) {
    if (c.area >= minAreaCutoff || candidates.length < 5) {
      candidates.push(new THREE.Vector3(c.nx, c.ny, c.nz).normalize());
    }
  }

  // Always include the 6 cardinal directions (+Y, -Y, +X, -X, +Z, -Z)
  const cardinals = [
    new THREE.Vector3(0, -1, 0), // Base bottom
    new THREE.Vector3(0, 1, 0),  // Top
    new THREE.Vector3(1, 0, 0),  // Right
    new THREE.Vector3(-1, 0, 0), // Left
    new THREE.Vector3(0, 0, 1),  // Front
    new THREE.Vector3(0, 0, -1)  // Back
  ];

  for (const card of cardinals) {
    const exists = candidates.some((cand) => cand.dot(card) > 0.985);
    if (!exists) {
      candidates.push(card);
    }
  }

  return candidates;
}

/**
 * Accurately calculates bed contact area, overhang support area, and model height
 * when a given normal is placed flat on the print bed.
 */
export function evaluateFlatBottomOrientation(geometry, normalCandidate, thresholdDeg = 45, warnRangeDeg = 10) {
  if (!geometry) return null;

  const pos = geometry.attributes.position;
  if (!pos || pos.count < 3) return null;

  const index = geometry.index;
  const numTriangles = index ? index.count / 3 : pos.count / 3;

  const baseNormal = normalCandidate.clone().normalize();
  // Print growth vector in local geometry space is -baseNormal (upwards from bed)
  const printDir = baseNormal.clone().negate();

  const thresholdRad = THREE.MathUtils.degToRad(thresholdDeg);
  const warnRad = THREE.MathUtils.degToRad(Math.max(5, thresholdDeg - warnRangeDeg));

  // 1. Calculate height extent along printDir
  let minHeight = Infinity;
  let maxHeight = -Infinity;

  // Compute height bounds from position buffer
  const count = pos.count;
  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const h = x * printDir.x + y * printDir.y + z * printDir.z;
    if (h < minHeight) minHeight = h;
    if (h > maxHeight) maxHeight = h;
  }

  const modelHeightMm = Math.max(0, maxHeight - minHeight);
  // Bed layer contact tolerance (bottom 0.35 mm or 0.5% of height)
  const bedContactThreshold = minHeight + Math.max(0.35, modelHeightMm * 0.005);

  let totalArea = 0;
  let bedContactArea = 0;
  let supportArea = 0;
  let warnArea = 0;
  let safeArea = 0;

  const cosBedNormal = Math.cos(THREE.MathUtils.degToRad(12.0)); // within 12 degrees of flat bed normal

  for (let t = 0; t < numTriangles; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3;
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;

    const p1x = pos.getX(i0), p1y = pos.getY(i0), p1z = pos.getZ(i0);
    const p2x = pos.getX(i1), p2y = pos.getY(i1), p2z = pos.getZ(i1);
    const p3x = pos.getX(i2), p3y = pos.getY(i2), p3z = pos.getZ(i2);

    const e1x = p2x - p1x, e1y = p2y - p1y, e1z = p2z - p1z;
    const e2x = p3x - p1x, e2y = p3y - p1y, e2z = p3z - p1z;

    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;

    const lenSq = nx * nx + ny * ny + nz * nz;
    if (lenSq <= 1e-12) continue;

    const len = Math.sqrt(lenSq);
    const area = len * 0.5;
    totalArea += area;

    const unx = nx / len;
    const uny = ny / len;
    const unz = nz / len;

    // Normal dot with base bed normal (pointing into the bed)
    const dotBed = unx * baseNormal.x + uny * baseNormal.y + unz * baseNormal.z;

    // Height of triangle base
    const h1 = p1x * printDir.x + p1y * printDir.y + p1z * printDir.z;
    const h2 = p2x * printDir.x + p2y * printDir.y + p2z * printDir.z;
    const h3 = p3x * printDir.x + p3y * printDir.y + p3z * printDir.z;
    const minTriH = Math.min(h1, h2, h3);

    // If triangle faces into the bed and touches the first layer bed plane
    if (dotBed >= cosBedNormal && minTriH <= bedContactThreshold) {
      bedContactArea += area;
      safeArea += area;
      continue;
    }

    // Downward angle against print growth direction
    // d = dot(normal, -printDir) = dot(normal, baseNormal)
    const d = dotBed;

    if (d <= 0.0) {
      safeArea += area;
    } else {
      const theta = Math.asin(Math.min(1.0, Math.max(0.0, d)));
      if (theta < warnRad) {
        safeArea += area;
      } else if (theta < thresholdRad) {
        warnArea += area;
      } else {
        supportArea += area;
      }
    }
  }

  const safePercent = totalArea > 0 ? (safeArea / totalArea) * 100 : 100;
  const warnPercent = totalArea > 0 ? (warnArea / totalArea) * 100 : 0;
  const supportPercent = totalArea > 0 ? (supportArea / totalArea) * 100 : 0;
  const bedContactPercent = totalArea > 0 ? (bedContactArea / totalArea) * 100 : 0;

  // Printability difficulty
  let difficulty = 'Mükemmel';
  let difficultyColor = 'text-emerald-400';
  if (supportPercent > 22) {
    difficulty = 'Çok Yüksek';
    difficultyColor = 'text-red-400';
  } else if (supportPercent > 14) {
    difficulty = 'Yüksek';
    difficultyColor = 'text-orange-400';
  } else if (supportPercent > 5) {
    difficulty = 'Orta';
    difficultyColor = 'text-amber-400';
  } else if (supportPercent > 0.5) {
    difficulty = 'Düşük';
    difficultyColor = 'text-lime-400';
  }

  // Composite Quality Score (Lower is better):
  // We heavily penalize support area, reward solid bed adhesion (contact area),
  // and lightly reward lower print height.
  const supportAreaCm2 = supportArea / 100;
  const bedContactAreaCm2 = bedContactArea / 100;
  const score = supportAreaCm2 * 100 - bedContactAreaCm2 * 2.5 + modelHeightMm * 0.08;

  const rotation = computeRotationForFlatBottom(baseNormal);

  return {
    normal: baseNormal,
    rotation,
    modelHeightMm: parseFloat(modelHeightMm.toFixed(1)),
    totalAreaMm2: totalArea,
    totalAreaCm2: parseFloat((totalArea / 100).toFixed(2)),
    bedContactAreaMm2: bedContactArea,
    bedContactAreaCm2: parseFloat(bedContactAreaCm2.toFixed(2)),
    bedContactPercent: parseFloat(bedContactPercent.toFixed(1)),
    supportAreaMm2: supportArea,
    supportAreaCm2: parseFloat(supportAreaCm2.toFixed(2)),
    supportPercent: parseFloat(supportPercent.toFixed(1)),
    warnAreaMm2: warnArea,
    warnAreaCm2: parseFloat((warnArea / 100).toFixed(2)),
    warnPercent: parseFloat(warnPercent.toFixed(1)),
    safeAreaMm2: safeArea,
    safeAreaCm2: parseFloat((safeArea / 100).toFixed(2)),
    safePercent: parseFloat(safePercent.toFixed(1)),
    difficulty,
    difficultyColor,
    score
  };
}

/**
 * Main Orientation Assistant: Analyzes the STL geometry and finds
 * candidate flat-bottom rotations that minimize required overhang support structures.
 */
export function findOptimalFlatBottomOrientations(
  geometry,
  {
    thresholdDeg = 45,
    warnRangeDeg = 10,
    currentRotation = { x: 0, y: 0, z: 0 },
    maxCandidates = 6
  } = {}
) {
  if (!geometry) return null;

  // 1. Calculate current orientation stats for baseline comparison
  // In world space, bed downward normal is (0, -1, 0).
  // When model is rotated by currentRotation, local bed normal is R^-1 * (0, -1, 0) = R^T * (0, -1, 0).
  const currentEuler = new THREE.Euler(
    THREE.MathUtils.degToRad(currentRotation?.x || 0),
    THREE.MathUtils.degToRad(currentRotation?.y || 0),
    THREE.MathUtils.degToRad(currentRotation?.z || 0),
    'XYZ'
  );
  const currentRotMatrix = new THREE.Matrix4().makeRotationFromEuler(currentEuler);
  const currentRotMatrix3 = new THREE.Matrix3().setFromMatrix4(currentRotMatrix);
  currentRotMatrix3.transpose();
  const currentLocalBedNormal = new THREE.Vector3(0, -1, 0).applyMatrix3(currentRotMatrix3).normalize();

  const currentStats = evaluateFlatBottomOrientation(
    geometry,
    currentLocalBedNormal,
    thresholdDeg,
    warnRangeDeg
  );

  // 2. Discover planar facets and candidate normals
  const candidateNormals = extractCandidateFlatNormals(geometry);

  // Ensure current normal is also in the pool
  if (currentLocalBedNormal) {
    const hasCurrent = candidateNormals.some((n) => n.dot(currentLocalBedNormal) > 0.985);
    if (!hasCurrent) {
      candidateNormals.unshift(currentLocalBedNormal);
    }
  }

  // 3. Evaluate each candidate
  const evaluatedList = [];

  for (let i = 0; i < candidateNormals.length; i++) {
    const candNorm = candidateNormals[i];
    const stats = evaluateFlatBottomOrientation(geometry, candNorm, thresholdDeg, warnRangeDeg);
    if (!stats) continue;

    // Check if this rotation is almost identical to an already evaluated candidate
    const isDuplicate = evaluatedList.some((existing) => {
      const rotDiff =
        Math.abs(existing.rotation.x - stats.rotation.x) +
        Math.abs(existing.rotation.y - stats.rotation.y) +
        Math.abs(existing.rotation.z - stats.rotation.z);
      return rotDiff < 4.0;
    });

    if (!isDuplicate) {
      // Comparison with current orientation
      const currentSupportCm2 = currentStats?.supportAreaCm2 || 0;
      const candSupportCm2 = stats.supportAreaCm2;
      const supportReductionCm2 = parseFloat((currentSupportCm2 - candSupportCm2).toFixed(2));
      const supportReductionPercent =
        currentSupportCm2 > 0.05
          ? parseFloat((((currentSupportCm2 - candSupportCm2) / currentSupportCm2) * 100).toFixed(1))
          : 0;

      const isCurrent =
        Math.abs(normalizeDeg((currentRotation?.x || 0) - stats.rotation.x)) < 2.0 &&
        Math.abs(normalizeDeg((currentRotation?.y || 0) - stats.rotation.y)) < 2.0 &&
        Math.abs(normalizeDeg((currentRotation?.z || 0) - stats.rotation.z)) < 2.0;

      evaluatedList.push({
        ...stats,
        id: `flat-cand-${i}`,
        isCurrent,
        supportReductionCm2,
        supportReductionPercent
      });
    }
  }

  // 4. Sort by composite score (lowest support area + largest bed adhesion)
  evaluatedList.sort((a, b) => {
    // If support percent is zero or close to zero, favor bed contact area
    if (Math.abs(a.supportPercent - b.supportPercent) < 0.5) {
      return b.bedContactAreaCm2 - a.bedContactAreaCm2;
    }
    return a.score - b.score;
  });

  // Assign informative names and badges
  const finalCandidates = evaluatedList.slice(0, maxCandidates).map((item, idx) => {
    let badge = 'Alternatif';
    let name = `Düz Taban Seçeneği #${idx + 1}`;

    if (idx === 0) {
      badge = '🥇 En Optimal Düz Taban';
      name = 'Önerilen Optimal Taban';
    } else if (item.bedContactAreaCm2 > evaluatedList[0].bedContactAreaCm2 * 1.3) {
      badge = '🛡️ Maksimum Taban Yapışması';
      name = 'Geniş Yüzey Tabanı';
    } else if (item.modelHeightMm < evaluatedList[0].modelHeightMm * 0.75) {
      badge = '⚡ Hızlı Baskı (Düşük Profil)';
      name = 'Düşük Yükseklik Yönelimi';
    } else if (idx === 1) {
      badge = '🥈 İkinci En İyi Yön';
      name = 'Alternatif Dengeli Taban';
    }

    return {
      ...item,
      badge,
      name,
      isOptimal: idx === 0
    };
  });

  const bestCandidate = finalCandidates[0] || null;

  return {
    candidates: finalCandidates,
    bestCandidate,
    currentStats,
    thresholdDeg,
    totalTriangles: geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3,
    totalAreaCm2: bestCandidate?.totalAreaCm2 || 0,
    hasSupportSavings: bestCandidate && bestCandidate.supportReductionCm2 > 0.05
  };
}
