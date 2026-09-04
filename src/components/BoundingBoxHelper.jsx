import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

/**
 * Visualizes the model's Axis-Aligned Bounding Box (AABB) in 3D space
 * using a clean wireframe helper (without diagonal tessellation artifacts),
 * subtle volumetric bounding volume, corner anchor points, and dimension badges
 * along the X, Y, and Z axes to provide spatial context for measurements.
 */
export function BoundingBoxHelper({
  model,
  modelInfo,
  visible = true,
  color = '#06b6d4',
  modelRotation
}) {
  const aabbData = useMemo(() => {
    if (!visible) return null;

    let box = new THREE.Box3();
    let hasValidBox = false;

    if (model) {
      model.updateMatrixWorld(true);
      box.setFromObject(model);
      if (!box.isEmpty()) {
        hasValidBox = true;
      }
    }

    // Fallback to modelInfo bounding box dimensions if mesh Box3 is not ready
    if (!hasValidBox && modelInfo?.dimensions) {
      const { x, y, z } = modelInfo.dimensions;
      box.min.set(-x / 2, -y / 2, -z / 2);
      box.max.set(x / 2, y / 2, z / 2);
      hasValidBox = true;
    }

    if (!hasValidBox) return null;

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Safeguard minimum thickness
    size.x = Math.max(size.x, 0.1);
    size.y = Math.max(size.y, 0.1);
    size.z = Math.max(size.z, 0.1);

    const min = box.min;
    const max = box.max;

    // 8 corner vertex coordinates for spatial anchor points
    const corners = [
      new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(max.x, min.y, min.z),
      new THREE.Vector3(min.x, max.y, min.z),
      new THREE.Vector3(max.x, max.y, min.z),
      new THREE.Vector3(min.x, min.y, max.z),
      new THREE.Vector3(max.x, min.y, max.z),
      new THREE.Vector3(min.x, max.y, max.z),
      new THREE.Vector3(max.x, max.y, max.z)
    ];

    // Corner radius proportionally scaled to model size
    const maxDim = Math.max(size.x, size.y, size.z);
    const cornerRadius = Math.max(0.4, Math.min(1.8, maxDim * 0.01));

    return {
      box,
      size,
      center,
      min,
      max,
      corners,
      cornerRadius
    };
  }, [model, modelInfo, visible, modelRotation]);

  // Edges geometry for clean 12 wireframe box edges without triangulation diagonals
  const edgesGeometry = useMemo(() => {
    if (!aabbData) return null;
    const boxGeom = new THREE.BoxGeometry(
      aabbData.size.x,
      aabbData.size.y,
      aabbData.size.z
    );
    const edges = new THREE.EdgesGeometry(boxGeom);
    boxGeom.dispose();
    return edges;
  }, [aabbData?.size.x, aabbData?.size.y, aabbData?.size.z]);

  if (!visible || !aabbData || !edgesGeometry) return null;

  const { size, center, min, max, corners, cornerRadius } = aabbData;

  return (
    <group>
      {/* 1. Clean 12-edge Wireframe AABB Cage */}
      <lineSegments position={center} geometry={edgesGeometry}>
        <lineBasicMaterial color={color} linewidth={2} />
      </lineSegments>

      {/* 2. Semi-transparent subtle bounding volume for spatial depth */}
      <mesh position={center}>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshBasicMaterial
          color={color}
          transparent={true}
          opacity={0.035}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. Luminous Corner Anchors (8 Vertices) */}
      <group>
        {corners.map((pos, idx) => (
          <mesh key={idx} position={pos}>
            <sphereGeometry args={[cornerRadius, 8, 8]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        ))}
      </group>

      {/* 4. Spatial Measurement Dimension Badges (X, Y, Z) */}
      {/* X Axis Dimension Badge (Bottom Front Edge) */}
      <Html
        position={[center.x, min.y, max.z]}
        center
        distanceFactor={190}
        zIndexRange={[80, 0]}
      >
        <div className="pointer-events-none select-none bg-gray-950/90 border border-red-500/80 px-2 py-0.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <span className="text-[10px] font-mono font-bold text-red-300">
            X: {size.x.toFixed(1)} mm
          </span>
        </div>
      </Html>

      {/* Y Axis Dimension Badge (Vertical Side Edge) */}
      <Html
        position={[max.x, center.y, max.z]}
        center
        distanceFactor={190}
        zIndexRange={[80, 0]}
      >
        <div className="pointer-events-none select-none bg-gray-950/90 border border-green-500/80 px-2 py-0.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-[10px] font-mono font-bold text-green-300">
            Y: {size.y.toFixed(1)} mm
          </span>
        </div>
      </Html>

      {/* Z Axis Dimension Badge (Depth Side Edge) */}
      <Html
        position={[max.x, min.y, center.z]}
        center
        distanceFactor={190}
        zIndexRange={[80, 0]}
      >
        <div className="pointer-events-none select-none bg-gray-950/90 border border-blue-500/80 px-2 py-0.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="text-[10px] font-mono font-bold text-blue-300">
            Z: {size.z.toFixed(1)} mm
          </span>
        </div>
      </Html>

      {/* Header Summary Pill with Dimensions */}
      <Html
        position={[center.x, max.y + Math.max(3, size.y * 0.05), center.z]}
        center
        distanceFactor={220}
        zIndexRange={[90, 0]}
      >
        <div className="pointer-events-none select-none bg-cyan-950/90 border border-cyan-400/70 text-cyan-200 px-2.5 py-1 rounded-xl shadow-xl backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] font-mono font-bold">
            AABB: {size.x.toFixed(1)} × {size.y.toFixed(1)} × {size.z.toFixed(1)} mm
          </span>
        </div>
      </Html>
    </group>
  );
}
