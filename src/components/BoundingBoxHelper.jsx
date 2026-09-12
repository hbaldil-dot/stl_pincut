import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useUnit } from '../context/UnitContext.jsx';

/**
 * Visualizes the model's Axis-Aligned Bounding Box (AABB) in 3D space
 * with real-time dimensions, corner anchors, center coordinates,
 * and build plate footprint projection to aid in positioning.
 */
export function BoundingBoxHelper({
  model,
  modelInfo,
  visible = true,
  color = '#06b6d4',
  modelRotation,
  modelScale,
  modelPosition,
  showDimensionLabels = true,
  showFootprint = true,
  showCenterPoint = true,
  floorY = -45
}) {
  const { unit, formatLength, formatValue, isImperial } = useUnit();

  // Compute live Axis-Aligned Bounding Box (AABB) in world space
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
      const sx = modelScale?.x ?? 1;
      const sy = modelScale?.y ?? 1;
      const sz = modelScale?.z ?? 1;
      const px = modelPosition?.x ?? 0;
      const py = modelPosition?.y ?? 0;
      const pz = modelPosition?.z ?? 0;

      const x = (modelInfo.dimensions.x || 0) * sx;
      const y = (modelInfo.dimensions.y || 0) * sy;
      const z = (modelInfo.dimensions.z || 0) * sz;
      box.min.set(-x / 2 + px, -y / 2 + py, -z / 2 + pz);
      box.max.set(x / 2 + px, y / 2 + py, z / 2 + pz);
      hasValidBox = true;
    }

    if (!hasValidBox) return null;

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Safeguard minimum thickness for flat planes
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
    const cornerRadius = Math.max(0.4, Math.min(1.8, maxDim * 0.012));

    // Bed clearance (distance from bottom of bounding box to build plate)
    const bedClearance = min.y - floorY;
    const isFlushWithBed = Math.abs(bedClearance) < 0.25;

    return {
      box,
      size,
      center,
      min,
      max,
      corners,
      cornerRadius,
      bedClearance,
      isFlushWithBed
    };
  }, [model, modelInfo, visible, modelRotation, modelScale, modelPosition, floorY]);

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

  // Clean up WebGL geometry on unmount or dimension change
  useEffect(() => {
    return () => {
      edgesGeometry?.dispose();
    };
  }, [edgesGeometry]);

  // Ground footprint line geometry
  const footprintGeometry = useMemo(() => {
    if (!aabbData || !showFootprint) return null;
    const { min, max } = aabbData;
    const y = floorY + 0.05; // slightly above floor grid to prevent Z-fighting
    const points = [
      new THREE.Vector3(min.x, y, min.z),
      new THREE.Vector3(max.x, y, min.z),
      new THREE.Vector3(max.x, y, max.z),
      new THREE.Vector3(min.x, y, max.z),
      new THREE.Vector3(min.x, y, min.z) // closed loop
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [aabbData?.min?.x, aabbData?.min?.z, aabbData?.max?.x, aabbData?.max?.z, floorY, showFootprint]);

  useEffect(() => {
    return () => {
      footprintGeometry?.dispose();
    };
  }, [footprintGeometry]);

  // Vertical drop line geometry from model bottom center to bed floor
  const dropLineGeometry = useMemo(() => {
    if (!aabbData || !showFootprint) return null;
    const { center, min } = aabbData;
    const points = [
      new THREE.Vector3(center.x, min.y, center.z),
      new THREE.Vector3(center.x, floorY, center.z)
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [aabbData?.center?.x, aabbData?.center?.z, aabbData?.min?.y, floorY, showFootprint]);

  useEffect(() => {
    return () => {
      dropLineGeometry?.dispose();
    };
  }, [dropLineGeometry]);

  if (!visible || !aabbData || !edgesGeometry) return null;

  const {
    size,
    center,
    min,
    max,
    corners,
    cornerRadius,
    bedClearance,
    isFlushWithBed
  } = aabbData;

  return (
    <group>
      {/* 1. Clean 12-edge Wireframe AABB Cage */}
      <lineSegments position={center} geometry={edgesGeometry}>
        <lineBasicMaterial color={color} linewidth={2} transparent opacity={0.85} />
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
            <sphereGeometry args={[cornerRadius, 10, 10]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        ))}
      </group>

      {/* 4. Center Point Crosshair Indicator */}
      {showCenterPoint && (
        <group position={center}>
          <mesh>
            <sphereGeometry args={[cornerRadius * 1.1, 8, 8]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
        </group>
      )}

      {/* 5. Build Plate / Floor Footprint Projection */}
      {showFootprint && footprintGeometry && (
        <group>
          {/* Projected Outline on Bed */}
          <line geometry={footprintGeometry}>
            <lineBasicMaterial color="#10b981" linewidth={2} transparent opacity={0.7} />
          </line>

          {/* Footprint Area Fill on Bed */}
          <mesh position={[center.x, floorY + 0.02, center.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[size.x, size.z]} />
            <meshBasicMaterial
              color="#10b981"
              transparent
              opacity={0.045}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Vertical Drop-line from Model Bottom Center to Floor */}
          {dropLineGeometry && Math.abs(bedClearance) > 0.4 && (
            <line geometry={dropLineGeometry}>
              <lineDashedMaterial
                color={bedClearance >= 0 ? '#38bdf8' : '#ef4444'}
                dashSize={2}
                gapSize={1.5}
                transparent
                opacity={0.75}
              />
            </line>
          )}

          {/* Bed Clearance Badge on Drop Line */}
          {showDimensionLabels && (
            <Html
              position={[center.x, (min.y + floorY) * 0.5, center.z]}
              center
              distanceFactor={180}
              zIndexRange={[70, 0]}
            >
              <div className="pointer-events-none select-none bg-gray-950/90 border border-emerald-500/60 px-2 py-0.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isFlushWithBed
                      ? 'bg-emerald-400'
                      : bedClearance > 0
                      ? 'bg-sky-400 animate-pulse'
                      : 'bg-red-400 animate-bounce'
                  }`}
                />
                <span
                  className={`text-[10px] font-mono font-bold ${
                    isFlushWithBed
                      ? 'text-emerald-300'
                      : bedClearance > 0
                      ? 'text-sky-300'
                      : 'text-red-300'
                  }`}
                >
                  {isFlushWithBed
                    ? 'Tabla Teması: 0.0 mm'
                    : `Tabla Mesafesi: ${bedClearance >= 0 ? '+' : ''}${formatLength(
                        bedClearance,
                        isImperial ? 2 : 1
                      )}`}
                </span>
              </div>
            </Html>
          )}
        </group>
      )}

      {/* 6. Spatial Real-Time Measurement Dimension Badges (X, Y, Z) */}
      {showDimensionLabels && (
        <>
          {/* X Axis Dimension Badge (Bottom Front Edge - Width) */}
          <Html
            position={[center.x, min.y, max.z]}
            center
            distanceFactor={190}
            zIndexRange={[80, 0]}
          >
            <div className="pointer-events-none select-none bg-gray-950/95 border border-red-500/80 px-2 py-0.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-[10px] font-mono font-bold text-red-300">
                X (Genişlik): {formatLength(size.x, isImperial ? 2 : 1)}
              </span>
            </div>
          </Html>

          {/* Y Axis Dimension Badge (Vertical Right Edge - Height) */}
          <Html
            position={[max.x, center.y, max.z]}
            center
            distanceFactor={190}
            zIndexRange={[80, 0]}
          >
            <div className="pointer-events-none select-none bg-gray-950/95 border border-green-500/80 px-2 py-0.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] font-mono font-bold text-green-300">
                Y (Yükseklik): {formatLength(size.y, isImperial ? 2 : 1)}
              </span>
            </div>
          </Html>

          {/* Z Axis Dimension Badge (Depth Side Edge - Depth) */}
          <Html
            position={[max.x, min.y, center.z]}
            center
            distanceFactor={190}
            zIndexRange={[80, 0]}
          >
            <div className="pointer-events-none select-none bg-gray-950/95 border border-blue-500/80 px-2 py-0.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-[10px] font-mono font-bold text-blue-300">
                Z (Derinlik): {formatLength(size.z, isImperial ? 2 : 1)}
              </span>
            </div>
          </Html>

          {/* Header Summary Pill with Dimensions & Coordinates */}
          <Html
            position={[center.x, max.y + Math.max(3.5, size.y * 0.06), center.z]}
            center
            distanceFactor={220}
            zIndexRange={[90, 0]}
          >
            <div className="pointer-events-none select-none bg-cyan-950/95 border border-cyan-400/80 text-cyan-200 px-3 py-1 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[11px] font-mono font-bold text-white">
                  AABB: {formatValue(size.x, isImperial ? 2 : 1)} × {formatValue(size.y, isImperial ? 2 : 1)} × {formatValue(size.z, isImperial ? 2 : 1)} {unit}
                </span>
                <span className="text-[9px] font-mono text-cyan-300/80">
                  Konum: ({center.x.toFixed(1)}, {center.y.toFixed(1)}, {center.z.toFixed(1)}) mm
                </span>
              </div>
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

export default BoundingBoxHelper;
