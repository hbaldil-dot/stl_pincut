import * as THREE from 'three';

/**
 * Creates procedural high-quality 3D models resembling character sculpts and mechanical parts.
 */
export function generatePresetGeometry(type) {
  let geometry;

  switch (type) {
    case 'bust':
    case 'warrior': {
      // Stylized Bearded Hero Bust (Inspired by Greek/Roman sculpts like in the video)
      const group = new THREE.Group();

      // Main Head & Neck
      const headGeom = new THREE.CylinderGeometry(16, 20, 55, 32, 16);
      const headPos = headGeom.attributes.position;
      // Sculpt head shape
      for (let i = 0; i < headPos.count; i++) {
        let x = headPos.getX(i);
        let y = headPos.getY(i);
        let z = headPos.getZ(i);

        // Chin & Jawline
        if (y > -10 && y < 15 && z > 0) {
          z += Math.cos(y * 0.1) * 6;
          x *= 1.1;
        }
        // Nose & Brow
        if (y > 5 && y < 20 && z > 8 && Math.abs(x) < 6) {
          z += Math.sin((y - 5) * 0.2) * 8;
        }
        // Stylized Beard Layers (as in video)
        if (y < 8 && y > -25 && z > -5) {
          const wave = Math.sin(y * 0.4) * Math.cos(x * 0.3) * 5;
          z += Math.max(0, 10 - y * 0.4 + wave);
          x *= (1.0 + (5 - y) * 0.015);
        }
        // Stylized Hair Crown
        if (y > 15) {
          const hairCurl = Math.sin(Math.atan2(x, z) * 6) * 3;
          x += (x / 20) * hairCurl;
          z += (z / 20) * hairCurl;
          y += Math.max(0, 5 - Math.hypot(x, z) * 0.1);
        }
        headPos.setXYZ(i, x, y, z);
      }
      headGeom.computeVertexNormals();

      // Torso & Shoulders Base
      const shouldersGeom = new THREE.CylinderGeometry(28, 38, 40, 32, 10);
      const sPos = shouldersGeom.attributes.position;
      for (let i = 0; i < sPos.count; i++) {
        let x = sPos.getX(i);
        let y = sPos.getY(i);
        let z = sPos.getZ(i);
        // Broad shoulders
        x *= 1.6;
        // Chest curvature
        if (z > 0) z *= 1.25;
        sPos.setXYZ(i, x, y - 40, z);
      }
      shouldersGeom.computeVertexNormals();

      // Merge into a single BufferGeometry
      geometry = mergeGeometries([headGeom, shouldersGeom]);
      break;
    }

    case 'arm':
    case 'anatomy': {
      // Muscular Anatomy Arm (Similar to arm cut at 0:05 - 0:08 in video)
      const armGeom = new THREE.CylinderGeometry(14, 18, 90, 32, 32);
      const pos = armGeom.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        // Shoulder / Deltoid (Top)
        if (y > 20) {
          const dFactor = (y - 20) / 25;
          x *= (1.0 + dFactor * 0.8);
          z *= (1.0 + dFactor * 0.6);
        }
        // Biceps & Triceps (Middle)
        else if (y > -15 && y <= 20) {
          const bFactor = Math.sin((y + 15) / 35 * Math.PI);
          if (z > 0) z += bFactor * 10; // Bicep peak
          if (z < 0) z -= bFactor * 6;  // Tricep peak
          x *= (1.0 + bFactor * 0.25);
        }
        // Forearm & Wrist (Bottom)
        else {
          const fFactor = (y + 45) / 30;
          x *= (0.7 + fFactor * 0.4);
          z *= (0.6 + fFactor * 0.4);
        }

        pos.setXYZ(i, x, y, z);
      }
      armGeom.computeVertexNormals();
      geometry = armGeom;
      break;
    }

    case 'bracket': {
      // Mechanical Bracket with holes & bevels
      const shape = new THREE.Shape();
      shape.moveTo(-30, -30);
      shape.lineTo(30, -30);
      shape.lineTo(30, -12);
      shape.lineTo(-12, -12);
      shape.lineTo(-12, 30);
      shape.lineTo(-30, 30);
      shape.closePath();

      // Bolt hole 1
      const hole1 = new THREE.Path();
      hole1.absarc(12, -21, 6, 0, Math.PI * 2, true);
      shape.holes.push(hole1);

      // Bolt hole 2
      const hole2 = new THREE.Path();
      hole2.absarc(-21, 12, 6, 0, Math.PI * 2, true);
      shape.holes.push(hole2);

      const extrudeSettings = {
        depth: 35,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 2,
        bevelSize: 2,
        bevelThickness: 2
      };
      geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      break;
    }

    case 'cylinder':
    default: {
      // Stepped Joint Connector
      const lathePoints = [
        new THREE.Vector2(0, -40),
        new THREE.Vector2(18, -40),
        new THREE.Vector2(18, -12),
        new THREE.Vector2(26, -12),
        new THREE.Vector2(26, 12),
        new THREE.Vector2(18, 12),
        new THREE.Vector2(18, 40),
        new THREE.Vector2(0, 40)
      ];
      geometry = new THREE.LatheGeometry(lathePoints, 32);
      break;
    }
  }

  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Merges multiple BufferGeometries into one non-indexed BufferGeometry.
 */
function mergeGeometries(geometries) {
  let totalPositions = 0;

  const nonIndexed = geometries.map(g => (g.index ? g.toNonIndexed() : g));
  nonIndexed.forEach(g => {
    totalPositions += g.attributes.position.count * 3;
  });

  const mergedPos = new Float32Array(totalPositions);
  const mergedNorm = new Float32Array(totalPositions);

  let offset = 0;
  nonIndexed.forEach(g => {
    const pos = g.attributes.position.array;
    const norm = g.attributes.normal ? g.attributes.normal.array : null;

    mergedPos.set(pos, offset);
    if (norm) {
      mergedNorm.set(norm, offset);
    }
    offset += pos.length;
  });

  const mergedGeom = new THREE.BufferGeometry();
  mergedGeom.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
  if (mergedNorm.length > 0) {
    mergedGeom.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
  } else {
    mergedGeom.computeVertexNormals();
  }

  return mergedGeom;
}

export const SAMPLE_PRESETS = [
  { id: 'bust', name: 'Antik Heykel Büst (Videodaki)', icon: 'Sparkles', desc: 'Sakal, saç ve boyun kesimi için detaylı büst' },
  { id: 'arm', name: 'Kaslı Kol Anatomisi', icon: 'Layers', desc: 'Pazı & omuz mafsalı kesimi' },
  { id: 'bracket', name: 'Mekanik Montaj Braketi', icon: 'Box', desc: 'Delikli L-braket endüstriyel parça' },
  { id: 'cylinder', name: 'Kademeli Silindir Mafsal', icon: 'RotateCcw', desc: 'Hassas pim ve soket test modeli' }
];
