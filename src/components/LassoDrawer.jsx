import React, { useState, useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';

/**
 * Handles the interactive Lasso cut line drawing directly on the 3D mesh surface.
 * Replicates the exact workflow from the video:
 * - Crosshair cursor (+) on surface
 * - Glowing Red Spline Curve on surface
 * - Glowing Green Start Point marker
 * - Yellow Elastic Rubber-band closing line
 * - Automatic / manual loop snapping & closure
 */
export function LassoDrawer({
  mesh,
  isDrawing,
  drawnPoints,
  onAddPoint,
  onAddStrokePoints,
  onCloseLoop,
  onHoverStateChange
}) {
  const { camera, raycaster, gl, scene } = useThree();
  const [cursorPos, setCursorPos] = useState(null);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [isNearStart, setIsNearStart] = useState(false);
  const lastRecordedPointRef = useRef(null);

  // Convert drawn Vector3 points to array of coords for Three.js Line
  const redLinePoints = useMemo(() => {
    if (!drawnPoints || drawnPoints.length === 0) return [];
    return drawnPoints.map(p => [p.x, p.y, p.z]);
  }, [drawnPoints]);

  // Yellow Elastic Closing Rubber-band line from cursor to green start node
  const yellowLinePoints = useMemo(() => {
    if (!cursorPos || drawnPoints.length === 0) return [];
    const start = drawnPoints[0];
    return [
      [cursorPos.x, cursorPos.y, cursorPos.z],
      [start.x, start.y, start.z]
    ];
  }, [cursorPos, drawnPoints]);

  const startPoint = drawnPoints.length > 0 ? drawnPoints[0] : null;

  // Raycast to mesh surface on pointer move
  const handlePointerMove = (e) => {
    if (!isDrawing || !mesh) return;

    // Check intersection with mesh
    const intersects = e.intersections;
    const meshHit = intersects && intersects.find(hit => hit.object === mesh);

    if (meshHit && meshHit.point) {
      const hitPoint = meshHit.point.clone();
      setCursorPos(hitPoint);

      // Check proximity to start node for snapping
      if (startPoint && drawnPoints.length >= 3) {
        const distToStart = hitPoint.distanceTo(startPoint);
        const near = distToStart < 4.0; // Snap radius
        setIsNearStart(near);
      } else {
        setIsNearStart(false);
      }

      // If dragging/drawing, add points with smooth spacing
      if (isPointerDown) {
        if (!lastRecordedPointRef.current || lastRecordedPointRef.current.distanceTo(hitPoint) > 1.8) {
          lastRecordedPointRef.current = hitPoint;
          onAddPoint(hitPoint);
        }
      }
    } else {
      setCursorPos(null);
      setIsNearStart(false);
    }
  };

  const handlePointerDown = (e) => {
    if (!isDrawing || !mesh || e.button !== 0) return; // Only left click for drawing
    e.stopPropagation();

    const intersects = e.intersections;
    const meshHit = intersects && intersects.find(hit => hit.object === mesh);

    if (meshHit && meshHit.point) {
      const hitPoint = meshHit.point.clone();

      // If clicked near start point with at least 3 points, close the loop!
      if (startPoint && drawnPoints.length >= 3 && hitPoint.distanceTo(startPoint) < 5.0) {
        onCloseLoop();
        return;
      }

      setIsPointerDown(true);
      lastRecordedPointRef.current = hitPoint;
      onAddPoint(hitPoint);
    }
  };

  const handlePointerUp = () => {
    setIsPointerDown(false);
  };

  return (
    <group>
      {/* Invisible mesh overlay listener for raycasting */}
      {mesh && (
        <mesh
          geometry={mesh.geometry}
          visible={false}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        />
      )}

      {/* 1. Red 3D Spline Curve on Surface (Videodaki Kırmızı Kesim Çizgisi) */}
      {redLinePoints.length > 1 && (
        <Line
          points={redLinePoints}
          color="#ef4444"
          lineWidth={4.5}
        />
      )}

      {/* 2. Green Start Point Node (Videodaki Yeşil Başlangıç Noktası) */}
      {startPoint && (
        <group position={[startPoint.x, startPoint.y, startPoint.z]}>
          <mesh>
            <sphereGeometry args={[isNearStart ? 1.6 : 1.1, 16, 16]} />
            <meshBasicMaterial color={isNearStart ? "#4ade80" : "#22c55e"} />
          </mesh>
          {/* Pulsing ring indicator */}
          <mesh>
            <ringGeometry args={[1.6, 2.3, 24]} />
            <meshBasicMaterial color="#4ade80" side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* 3. Yellow Elastic Rubber-band Closing Guide Line (Videodaki Sarı Kapatma Çizgisi) */}
      {yellowLinePoints.length > 0 && isDrawing && (
        <Line
          points={yellowLinePoints}
          color="#eab308"
          lineWidth={2.2}
          dashed={true}
          dashScale={3}
          dashSize={1}
          gapSize={0.8}
        />
      )}

      {/* 4. Live 3D Crosshair (+) Cursor Marker on Surface (Videodaki Artı İmleç) */}
      {cursorPos && isDrawing && (
        <group position={[cursorPos.x, cursorPos.y, cursorPos.z]}>
          {/* Small Center Dot */}
          <mesh>
            <sphereGeometry args={[0.5, 12, 12]} />
            <meshBasicMaterial color={isNearStart ? "#22c55e" : "#ffffff"} />
          </mesh>

          {/* HTML Overlay Crosshair (+) for crisp 2D overlay rendering */}
          <Html center distanceFactor={15}>
            <div className={`pointer-events-none flex items-center justify-center -translate-x-1/2 -translate-y-1/2 ${isNearStart ? 'text-green-400 scale-125' : 'text-white'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="2" x2="12" y2="8" />
                <line x1="12" y1="16" x2="12" y2="22" />
                <line x1="2" y1="12" x2="8" y2="12" />
                <line x1="16" y1="12" x2="22" y2="12" />
                <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
              </svg>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
