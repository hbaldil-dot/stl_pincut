import React, { useState, useMemo } from 'react';
import * as THREE from 'three';
import { Line, Html } from '@react-three/drei';

/**
 * Interactive 3D Measurement Tool.
 * Allows users to click on two points on the model mesh surface to calculate
 * and display the exact Euclidean distance (in mm) along with Delta X, Y, Z coordinates.
 */
export function MeasureTool({
  mesh,
  meshes = [],
  active,
  pointA,
  pointB,
  onSetPointA,
  onSetPointB,
  onClearMeasurement
}) {
  const [hoverPoint, setHoverPoint] = useState(null);
  const [isHovering, setIsHovering] = useState(false);

  // Collect all target meshes to raycast against
  const targetMeshes = useMemo(() => {
    const list = [];
    if (mesh) list.push(mesh);
    if (meshes && meshes.length > 0) {
      meshes.forEach((m) => {
        if (m) list.push(m);
      });
    }
    return list;
  }, [mesh, meshes]);

  // Compute live distance for hover preview (if Point A is placed but Point B is not)
  const hoverDistance = useMemo(() => {
    if (!pointA || pointB || !hoverPoint) return null;
    return pointA.distanceTo(hoverPoint);
  }, [pointA, pointB, hoverPoint]);

  // Compute final distance once both points are placed
  const finalDistance = useMemo(() => {
    if (!pointA || !pointB) return null;
    return pointA.distanceTo(pointB);
  }, [pointA, pointB]);

  // Compute midpoint for distance label positioning
  const midpoint = useMemo(() => {
    if (pointA && pointB) {
      return new THREE.Vector3().addVectors(pointA, pointB).multiplyScalar(0.5);
    }
    if (pointA && hoverPoint) {
      return new THREE.Vector3().addVectors(pointA, hoverPoint).multiplyScalar(0.5);
    }
    return null;
  }, [pointA, pointB, hoverPoint]);

  // Handle pointer movements on mesh
  const handlePointerMove = (e) => {
    if (!active) return;
    e.stopPropagation();

    const intersects = e.intersections;
    const hit = intersects && intersects.find((h) => targetMeshes.includes(h.object));

    if (hit && hit.point) {
      setHoverPoint(hit.point.clone());
      setIsHovering(true);
    } else {
      setHoverPoint(null);
      setIsHovering(false);
    }
  };

  const handlePointerOut = () => {
    setHoverPoint(null);
    setIsHovering(false);
  };

  // Handle pointer clicks to set Point A and Point B
  const handlePointerDown = (e) => {
    if (!active || e.button !== 0) return; // Only left-click
    e.stopPropagation();

    const intersects = e.intersections;
    const hit = intersects && intersects.find((h) => targetMeshes.includes(h.object));

    if (hit && hit.point) {
      const clickPoint = hit.point.clone();

      if (!pointA) {
        // Place Point A
        onSetPointA(clickPoint);
      } else if (!pointB) {
        // Place Point B
        onSetPointB(clickPoint);
      } else {
        // Both are already set: start a fresh new measurement starting with Point A
        onSetPointA(clickPoint);
        onSetPointB(null);
      }
    }
  };

  // Build line coordinates for rendering
  const measurementLine = useMemo(() => {
    if (pointA && pointB) {
      return [
        [pointA.x, pointA.y, pointA.z],
        [pointB.x, pointB.y, pointB.z]
      ];
    }
    if (pointA && hoverPoint && !pointB) {
      return [
        [pointA.x, pointA.y, pointA.z],
        [hoverPoint.x, hoverPoint.y, hoverPoint.z]
      ];
    }
    return [];
  }, [pointA, pointB, hoverPoint]);

  if (!active && !pointA && !pointB) return null;

  return (
    <group>
      {/* Invisible mesh listener for raycasting when measure mode is active */}
      {active &&
        targetMeshes.map((targetMesh, idx) => (
          <mesh
            key={`measure-target-${idx}-${targetMesh.id}`}
            geometry={targetMesh.geometry}
            position={targetMesh.position}
            rotation={targetMesh.rotation}
            scale={targetMesh.scale}
            visible={false}
            onPointerMove={handlePointerMove}
            onPointerOut={handlePointerOut}
            onPointerDown={handlePointerDown}
          />
        ))}

      {/* 1. Point A Marker */}
      {pointA && (
        <group position={[pointA.x, pointA.y, pointA.z]}>
          {/* Glowing Inner Core Sphere */}
          <mesh>
            <sphereGeometry args={[1.3, 24, 24]} />
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#0891b2"
              emissiveIntensity={0.9}
              roughness={0.2}
            />
          </mesh>
          {/* Outer Pulsing Aura Ring */}
          <mesh>
            <ringGeometry args={[1.7, 2.6, 32]} />
            <meshBasicMaterial color="#22d3ee" side={THREE.DoubleSide} />
          </mesh>
          {/* Node Label "A" */}
          <Html center distanceFactor={24}>
            <div className="pointer-events-none -translate-x-1/2 -translate-y-9 bg-cyan-950/95 border border-cyan-400 text-cyan-200 px-2 py-0.5 rounded-full text-[11px] font-bold shadow-xl shadow-cyan-950/80 flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Nokta A</span>
            </div>
          </Html>
        </group>
      )}

      {/* 2. Point B Marker */}
      {pointB && (
        <group position={[pointB.x, pointB.y, pointB.z]}>
          {/* Glowing Inner Core Sphere */}
          <mesh>
            <sphereGeometry args={[1.3, 24, 24]} />
            <meshStandardMaterial
              color="#f59e0b"
              emissive="#d97706"
              emissiveIntensity={0.9}
              roughness={0.2}
            />
          </mesh>
          {/* Outer Ring */}
          <mesh>
            <ringGeometry args={[1.7, 2.6, 32]} />
            <meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} />
          </mesh>
          {/* Node Label "B" */}
          <Html center distanceFactor={24}>
            <div className="pointer-events-none -translate-x-1/2 -translate-y-9 bg-amber-950/95 border border-amber-400 text-amber-200 px-2 py-0.5 rounded-full text-[11px] font-bold shadow-xl shadow-amber-950/80 flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Nokta B</span>
            </div>
          </Html>
        </group>
      )}

      {/* 3. Measurement Line (Solid if both set, Dashed if hovering for Point B) */}
      {measurementLine.length === 2 && (
        <Line
          points={measurementLine}
          color={pointB ? '#10b981' : '#38bdf8'}
          lineWidth={4}
          dashed={!pointB}
          dashScale={2.5}
          dashSize={1.2}
          gapSize={0.8}
        />
      )}

      {/* 4. Live Distance Badge Floating at Midpoint */}
      {midpoint && (finalDistance !== null || hoverDistance !== null) && (
        <group position={[midpoint.x, midpoint.y, midpoint.z]}>
          <Html center distanceFactor={20}>
            <div className="pointer-events-none -translate-x-1/2 -translate-y-1/2 bg-gray-950/95 border-2 border-emerald-400 text-white px-3.5 py-1.5 rounded-xl shadow-2xl backdrop-blur-md flex flex-col items-center gap-0.5 animate-in zoom-in-90 duration-150 whitespace-nowrap">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-300">
                <span className="text-[13px]">📐</span>
                <span>
                  {pointB
                    ? `${finalDistance.toFixed(2)} mm`
                    : `~${hoverDistance?.toFixed(2)} mm`}
                </span>
              </div>
              {pointB && (
                <div className="text-[9px] text-gray-400 font-mono tracking-tight">
                  ΔX: {Math.abs(pointB.x - pointA.x).toFixed(1)} | ΔY: {Math.abs(pointB.y - pointA.y).toFixed(1)} | ΔZ: {Math.abs(pointB.z - pointA.z).toFixed(1)} mm
                </div>
              )}
            </div>
          </Html>
        </group>
      )}

      {/* 5. Live Cursor Hover Caliper Ring on Surface */}
      {active && hoverPoint && isHovering && (
        <group position={[hoverPoint.x, hoverPoint.y, hoverPoint.z]}>
          <mesh>
            <sphereGeometry args={[0.7, 16, 16]} />
            <meshBasicMaterial color={!pointA ? '#06b6d4' : '#f59e0b'} />
          </mesh>

          <Html center distanceFactor={16}>
            <div className="pointer-events-none flex flex-col items-center -translate-x-1/2 -translate-y-12">
              <div
                className={`px-2 py-0.5 rounded text-[10px] font-bold border shadow-md whitespace-nowrap ${
                  !pointA
                    ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60'
                    : 'bg-amber-950/90 text-amber-300 border-amber-500/60'
                }`}
              >
                {!pointA ? '1. Noktayı Seçin (A)' : '2. Noktayı Seçin (B)'}
              </div>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={!pointA ? 'text-cyan-400' : 'text-amber-400'}
              >
                <circle cx="12" cy="12" r="6" />
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
              </svg>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
