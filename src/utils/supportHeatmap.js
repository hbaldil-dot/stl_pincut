import * as THREE from 'three';

/**
 * Custom Three.js Shader for 3D Print Overhang & Support Structure Heat-Map.
 * Calculates angle between world-space surface normal and the user-defined print direction.
 */
export function createSupportHeatmapMaterial({
  printDirection = new THREE.Vector3(0, 1, 0),
  thresholdDeg = 45,
  warnRangeDeg = 10,
  mode = 0, // 0: Thermal Gradient, 1: Support-Only Highlight, 2: Hazard Zebra Hatch
  baseColor = '#2dafa5',
  opacity = 1.0,
  wireframe = false
} = {}) {
  const normPrintDir = printDirection.clone().normalize();
  const thresholdRad = THREE.MathUtils.degToRad(thresholdDeg);
  const warnRad = THREE.MathUtils.degToRad(Math.max(5, thresholdDeg - warnRangeDeg));
  const isTransparent = opacity < 0.999;
  const parsedColor = new THREE.Color(baseColor);

  const customUniforms = {
    uPrintDirection: { value: normPrintDir },
    uThresholdRad: { value: thresholdRad },
    uWarnRad: { value: warnRad },
    uMode: { value: mode },
    uBaseColor: { value: parsedColor },
    uOpacity: { value: opacity },
    uLightDirection: { value: new THREE.Vector3(0.5, 0.9, 0.6).normalize() }
  };

  const vertexShader = `
    #include <clipping_planes_pars_vertex>
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
      #include <begin_vertex>
      #include <project_vertex>
      #include <clipping_planes_vertex>

      // Compute world normal accurately including non-uniform scale
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    }
  `;

  const fragmentShader = `
    #include <clipping_planes_pars_fragment>
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    uniform vec3 uPrintDirection;
    uniform float uThresholdRad;
    uniform float uWarnRad;
    uniform int uMode;
    uniform vec3 uBaseColor;
    uniform float uOpacity;
    uniform vec3 uLightDirection;

    void main() {
      #include <clipping_planes_fragment>

      vec3 n = normalize(vWorldNormal);
      vec3 printDir = normalize(uPrintDirection);

      // Downward component against print orientation
      // If printDir = (0, 1, 0) Up, downward vector is (0, -1, 0)
      // d = dot(n, -printDir) = -dot(n, printDir)
      float d = -dot(n, printDir);

      vec3 surfaceColor;

      if (d <= 0.0) {
        // Upward facing surface or perpendicular vertical wall: 100% Safe (0 deg overhang)
        if (uMode == 1) {
          surfaceColor = uBaseColor;
        } else {
          // Vibrant emerald green
          surfaceColor = vec3(0.06, 0.76, 0.45);
        }
      } else {
        // Downward facing surface: compute overhang angle from vertical wall
        // d = 0 -> 0 deg overhang (vertical)
        // d = 1 -> 90 deg overhang (horizontal ceiling facing directly down)
        float theta = asin(clamp(d, 0.0, 1.0));

        if (theta < uWarnRad) {
          // Safe zone
          if (uMode == 1) {
            surfaceColor = uBaseColor;
          } else {
            float t = theta / max(uWarnRad, 0.001);
            // Emerald green to lime
            surfaceColor = mix(vec3(0.06, 0.76, 0.45), vec3(0.48, 0.82, 0.18), t);
          }
        } else if (theta < uThresholdRad) {
          // Warning zone approaching critical support threshold
          float t = (theta - uWarnRad) / max(uThresholdRad - uWarnRad, 0.001);
          if (uMode == 1) {
            // Subtle amber glow on model base color
            surfaceColor = mix(uBaseColor, vec3(0.96, 0.65, 0.12), t * 0.75);
          } else {
            // Lime to Amber / Orange
            surfaceColor = mix(vec3(0.96, 0.78, 0.12), vec3(0.98, 0.45, 0.08), t);
          }
        } else {
          // Critical Overhang: Support structures strictly required!
          float t = (theta - uThresholdRad) / max(1.5707963 - uThresholdRad, 0.001);

          if (uMode == 2) {
            // High-contrast diagonal hazard hatch stripes
            float stripe = sin((vWorldPosition.x + vWorldPosition.y + vWorldPosition.z) * 10.0);
            if (stripe > 0.0) {
              surfaceColor = vec3(0.95, 0.15, 0.15); // Crimson
            } else {
              surfaceColor = vec3(0.12, 0.12, 0.18); // Dark contrast
            }
          } else if (uMode == 1) {
            // Support-only highlight: Intense red support alert
            surfaceColor = mix(vec3(0.95, 0.18, 0.18), vec3(0.85, 0.08, 0.85), clamp(t, 0.0, 1.0));
          } else {
            // Full thermal: Crimson Red (45 deg) to Magenta/Purple (horizontal flat ceiling 90 deg)
            surfaceColor = mix(vec3(0.95, 0.18, 0.18), vec3(0.88, 0.12, 0.88), clamp(t, 0.0, 1.0));
          }
        }
      }

      // Directional diffuse + ambient lighting to preserve 3D depth and surface curvature
      vec3 light = normalize(uLightDirection);
      float diff = max(dot(n, light), 0.0);
      float ambient = 0.45;
      float lighting = ambient + (1.0 - ambient) * diff;

      gl_FragColor = vec4(surfaceColor * lighting, uOpacity);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms: customUniforms,
    vertexShader,
    fragmentShader,
    wireframe,
    side: THREE.DoubleSide,
    transparent: isTransparent,
    depthWrite: !isTransparent,
    clipping: true
  });

  return material;
}

/**
 * Computes exact surface areas and percentage of overhangs requiring supports.
 */
export function calculateOverhangStatistics(
  geometry,
  printDirection = new THREE.Vector3(0, 1, 0),
  thresholdDeg = 45,
  warnRangeDeg = 10,
  modelRotation = null
) {
  if (!geometry) return null;

  const geom = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geom.attributes.position;
  if (!pos || pos.count < 3) return null;

  let normPrintDir = printDirection.clone().normalize();

  // If model is rotated in 3D space, adjust the effective print direction into model space
  if (modelRotation && (modelRotation.x !== 0 || modelRotation.y !== 0 || modelRotation.z !== 0)) {
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(modelRotation.x || 0),
      THREE.MathUtils.degToRad(modelRotation.y || 0),
      THREE.MathUtils.degToRad(modelRotation.z || 0),
      'XYZ'
    );
    const rotMatrix = new THREE.Matrix4().makeRotationFromEuler(euler);
    const rotMatrix3 = new THREE.Matrix3().setFromMatrix4(rotMatrix);
    // Inverse/transpose to transform print direction into local geometry space
    rotMatrix3.transpose();
    normPrintDir.applyMatrix3(rotMatrix3).normalize();
  }

  const thresholdRad = THREE.MathUtils.degToRad(thresholdDeg);
  const warnRad = THREE.MathUtils.degToRad(Math.max(5, thresholdDeg - warnRangeDeg));
  const ceilingRad = THREE.MathUtils.degToRad(84); // Flat bottom ceiling

  let totalArea = 0;
  let supportArea = 0;
  let warnArea = 0;
  let safeArea = 0;
  let ceilingArea = 0;

  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();
  const normal = new THREE.Vector3();

  const count = pos.count;
  const triangleCount = count / 3;

  for (let i = 0; i < count; i += 3) {
    p1.fromBufferAttribute(pos, i);
    p2.fromBufferAttribute(pos, i + 1);
    p3.fromBufferAttribute(pos, i + 2);

    edge1.subVectors(p2, p1);
    edge2.subVectors(p3, p1);
    normal.crossVectors(edge1, edge2);

    const length = normal.length();
    if (length <= 1e-8) continue;

    const area = length * 0.5; // mm^2
    totalArea += area;

    normal.divideScalar(length); // Unit normal
    const d = -normal.dot(normPrintDir);

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
        if (theta >= ceilingRad) {
          ceilingArea += area;
        }
      }
    }
  }

  const safePercent = totalArea > 0 ? (safeArea / totalArea) * 100 : 100;
  const warnPercent = totalArea > 0 ? (warnArea / totalArea) * 100 : 0;
  const supportPercent = totalArea > 0 ? (supportArea / totalArea) * 100 : 0;
  const ceilingPercent = totalArea > 0 ? (ceilingArea / totalArea) * 100 : 0;

  // Printability rating based on support requirement percentage
  let difficulty = 'Mükemmel';
  let difficultyColor = 'text-emerald-400';
  if (supportPercent > 25) {
    difficulty = 'Çok Yüksek';
    difficultyColor = 'text-red-400';
  } else if (supportPercent > 15) {
    difficulty = 'Yüksek';
    difficultyColor = 'text-orange-400';
  } else if (supportPercent > 5) {
    difficulty = 'Orta';
    difficultyColor = 'text-amber-400';
  } else if (supportPercent > 0.5) {
    difficulty = 'Düşük';
    difficultyColor = 'text-lime-400';
  }

  return {
    totalAreaMm2: totalArea,
    totalAreaCm2: totalArea / 100,
    safeAreaMm2: safeArea,
    safeAreaCm2: safeArea / 100,
    safePercent,
    warnAreaMm2: warnArea,
    warnAreaCm2: warnArea / 100,
    warnPercent,
    supportAreaMm2: supportArea,
    supportAreaCm2: supportArea / 100,
    supportPercent,
    ceilingAreaMm2: ceilingArea,
    ceilingAreaCm2: ceilingArea / 100,
    ceilingPercent,
    difficulty,
    difficultyColor,
    triangleCount
  };
}

/**
 * Standard orientation presets
 */
export const PRINT_ORIENTATION_PRESETS = [
  {
    id: 'up_y',
    name: '+Y (Varsayılan Üst)',
    description: 'Baskı tablası tabanda, katmanlar yukarı doğru büyür',
    vector: new THREE.Vector3(0, 1, 0),
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    id: 'down_y',
    name: '-Y (Ters Baskı)',
    description: 'Ters yönlü baskı tablası yönelimi',
    vector: new THREE.Vector3(0, -1, 0),
    rotation: { x: 180, y: 0, z: 0 }
  },
  {
    id: 'front_z',
    name: '+Z (Ön Yüz Tablası)',
    description: 'Model ön yüzü üzerine yatırılmış baskı',
    vector: new THREE.Vector3(0, 0, 1),
    rotation: { x: -90, y: 0, z: 0 }
  },
  {
    id: 'back_z',
    name: '-Z (Arka Yüz Tablası)',
    description: 'Model arka yüzü üzerine yatırılmış baskı',
    vector: new THREE.Vector3(0, 0, -1),
    rotation: { x: 90, y: 0, z: 0 }
  },
  {
    id: 'right_x',
    name: '+X (Sağ Yan Tablası)',
    description: 'Model sağ yan yüzeyi üzerine yatırılmış',
    vector: new THREE.Vector3(1, 0, 0),
    rotation: { x: 0, y: 0, z: -90 }
  },
  {
    id: 'left_x',
    name: '-X (Sol Yan Tablası)',
    description: 'Model sol yan yüzeyi üzerine yatırılmış',
    vector: new THREE.Vector3(-1, 0, 0),
    rotation: { x: 0, y: 0, z: 90 }
  }
];

/**
 * Finds the orientation among standard cardinal directions that minimizes support structures.
 */
export function findOptimalPrintOrientation(geometry, thresholdDeg = 45) {
  if (!geometry) return null;

  const results = PRINT_ORIENTATION_PRESETS.map((preset) => {
    const stats = calculateOverhangStatistics(geometry, preset.vector, thresholdDeg, 10);
    return {
      preset,
      stats,
      supportPercent: stats?.supportPercent || 0,
      supportAreaCm2: stats?.supportAreaCm2 || 0
    };
  });

  results.sort((a, b) => a.supportPercent - b.supportPercent);
  const best = results[0];

  return {
    bestOrientation: best.preset,
    bestStats: best.stats,
    allOrientations: results
  };
}

/**
 * Converts Euler angles (degrees) into a 3D print direction unit vector.
 */
export function anglesToPrintVector(pitchDeg = 0, yawDeg = 0, rollDeg = 0) {
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(pitchDeg),
    THREE.MathUtils.degToRad(yawDeg),
    THREE.MathUtils.degToRad(rollDeg),
    'XYZ'
  );
  const up = new THREE.Vector3(0, 1, 0);
  up.applyEuler(euler);
  return up.normalize();
}
