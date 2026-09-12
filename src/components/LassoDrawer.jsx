import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import { useUnit } from '../context/UnitContext.jsx';
import { performLassoRaycastSelection } from '../utils/lassoSelectionHelper';

/**
 * Handles the interactive Raycaster-based Lasso Selection tool directly on the 3D mesh.
 * 
 * Capabilities:
 * - Traces user's mouse path on the 3D canvas (screen space & 3D surface)
 * - Identifies intersecting vertices of the STL mesh using Raycasting & 2D polygon projection
 * - Explicitly selects faces and updates scene state
 * - Supports both freehand click-and-drag sketching and point-by-point clicking
 * - Real-time 2D canvas SVG lasso stroke with animated glow & translucent fill
 * - 3D Surface Reticle & Crosshair cursor following surface normal
 * - Magnetic proximity snapping to start point
 * - Shift-key camera navigation bypass
 */
export function LassoDrawer({
  mesh,
  isDrawing = true,
  isLoopClosed = false,
  drawnPoints = [],
  onAddPoint,
  onAddStrokePoints,
  onCloseLoop,
  onSelectFaces,
  existingSelection = [],
  frontFacingOnly = true,
  selectionMode = 'replace',
  controlsRef,
  isShiftPressed = false
}) {
  const { camera, raycaster, gl, scene } = useThree();
  const { unit, formatLength, isImperial } = useUnit();

  const [cursorPos, setCursorPos] = useState(null);
  const [cursorNormal, setCursorNormal] = useState(new THREE.Vector3(0, 1, 0));
  const [isNearStart, setIsNearStart] = useState(false);
  const [isPointerOverMesh, setIsPointerOverMesh] = useState(false);
  const [screenPath, setScreenPath] = useState([]); // 2D screen coords for live SVG lasso line

  const isPointerDownRef = useRef(false);
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const lastRecordedPointRef = useRef(null);
  const screenPointsRef = useRef([]);
  const surfacePointsRef = useRef([]);
  const strokeFaceIndicesRef = useRef([]);

  // Collect all real meshes in the model hierarchy (handling Groups and multi-part geometries)
  const targetMeshes = useMemo(() => {
    const list = [];
    const collectMeshes = (obj) => {
      if (!obj) return;
      if (obj.isMesh && !list.includes(obj)) {
        list.push(obj);
      }
      if (obj.traverse) {
        obj.traverse((child) => {
          if (child.isMesh && !list.includes(child)) {
            list.push(child);
          }
        });
      }
    };
    collectMeshes(mesh);
    return list;
  }, [mesh]);

  // Compute bounding sphere radius to adaptively scale snap thresholds & spacing
  const { modelRadius, minSpacing, snapRadius } = useMemo(() => {
    let radius = 50;
    if (targetMeshes.length > 0) {
      const box = new THREE.Box3();
      targetMeshes.forEach((m) => {
        if (m.geometry) {
          if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
          const mBox = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
          box.union(mBox);
        }
      });
      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);
      radius = Math.max(10, sphere.radius || 50);
    }
    return {
      modelRadius: radius,
      minSpacing: Math.max(1.2, Math.min(3.5, radius * 0.025)),
      snapRadius: Math.max(4.0, Math.min(12.0, radius * 0.07))
    };
  }, [targetMeshes]);

  // Sync last recorded point ref when drawnPoints changes
  useEffect(() => {
    if (drawnPoints && drawnPoints.length > 0) {
      lastRecordedPointRef.current = drawnPoints[drawnPoints.length - 1];
    } else {
      lastRecordedPointRef.current = null;
      screenPointsRef.current = [];
      surfacePointsRef.current = [];
      strokeFaceIndicesRef.current = [];
      setScreenPath([]);
    }
  }, [drawnPoints]);

  const startPoint = drawnPoints.length > 0 ? drawnPoints[0] : null;
  const lastPoint = drawnPoints.length > 0 ? drawnPoints[drawnPoints.length - 1] : null;

  // Convert drawn Vector3 points to array of coords for Three.js Line
  const redLinePoints = useMemo(() => {
    if (!drawnPoints || drawnPoints.length === 0) return [];
    return drawnPoints.map((p) => [p.x, p.y, p.z]);
  }, [drawnPoints]);

  // Yellow Elastic Closing Rubber-band line from cursor to green start node
  const yellowLinePoints = useMemo(() => {
    if (!cursorPos || !startPoint || isLoopClosed || !isDrawing) return [];
    const activePt = isNearStart ? startPoint : cursorPos;
    return [
      [activePt.x, activePt.y, activePt.z],
      [startPoint.x, startPoint.y, startPoint.z]
    ];
  }, [cursorPos, startPoint, isNearStart, isLoopClosed, isDrawing]);

  // Cyan live preview line from last placed point to cursor
  const previewLinePoints = useMemo(() => {
    if (!cursorPos || !lastPoint || isLoopClosed || !isDrawing || drawnPoints.length === 0) return [];
    const activePt = isNearStart && startPoint ? startPoint : cursorPos;
    return [
      [lastPoint.x, lastPoint.y, lastPoint.z],
      [activePt.x, activePt.y, activePt.z]
    ];
  }, [cursorPos, lastPoint, startPoint, isNearStart, isLoopClosed, isDrawing, drawnPoints.length]);

  // Surface tangent orientation quaternion for cursor reticle
  const reticleQuat = useMemo(() => {
    const defaultUp = new THREE.Vector3(0, 0, 1);
    return new THREE.Quaternion().setFromUnitVectors(defaultUp, cursorNormal);
  }, [cursorNormal]);

  // Helper to execute face selection with current lasso path and stroke hits
  const executeSelection = useCallback(
    (customScreenPoints = null) => {
      if (!onSelectFaces || !mesh) return;

      const pts = customScreenPoints || screenPointsRef.current;
      if (pts.length < 2 && strokeFaceIndicesRef.current.length === 0) return;

      const result = performLassoRaycastSelection({
        mesh,
        screenPoints: pts,
        surfacePoints: surfacePointsRef.current,
        strokeFaceIndices: strokeFaceIndicesRef.current,
        camera,
        canvas: gl.domElement,
        raycaster,
        options: {
          frontFacingOnly,
          mode: selectionMode,
          existingSelection
        }
      });

      onSelectFaces(result);
    },
    [
      onSelectFaces,
      mesh,
      camera,
      gl.domElement,
      raycaster,
      frontFacingOnly,
      selectionMode,
      existingSelection
    ]
  );

  // Active Direct Canvas Event Handling for Surface Picking & Drawing
  useEffect(() => {
    const canvas = gl?.domElement;
    if (!canvas || !isDrawing || isLoopClosed) {
      if (canvas) canvas.style.cursor = 'auto';
      return;
    }

    const getPointerCoords = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      return new THREE.Vector2(x, y);
    };

    const getIntersections = (e) => {
      if (!targetMeshes || targetMeshes.length === 0) return [];
      const coords = getPointerCoords(e);
      raycaster.setFromCamera(coords, camera);
      return raycaster.intersectObjects(targetMeshes, true);
    };

    const handlePointerMove = (e) => {
      // If user is holding Shift to rotate camera, allow normal OrbitControls behavior
      if (isShiftPressed) {
        canvas.style.cursor = 'grab';
        setIsPointerOverMesh(false);
        setCursorPos(null);
        setIsNearStart(false);
        return;
      }

      const screenPt = { x: e.clientX, y: e.clientY };
      const hits = getIntersections(e);

      if (hits.length > 0) {
        const hit = hits[0];
        const rawPt = hit.point.clone();

        // Calculate world surface normal
        let normal = new THREE.Vector3(0, 1, 0);
        if (hit.face && hit.object) {
          normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
        }

        // Lift slightly (+0.25mm) along normal to prevent Z-fighting on the surface
        const surfaceHitPoint = rawPt.clone().add(normal.clone().multiplyScalar(0.25));

        // Check proximity to start node for magnetic snapping
        let near = false;
        if (startPoint && drawnPoints.length >= 3) {
          const distToStart = surfaceHitPoint.distanceTo(startPoint);
          if (distToStart < snapRadius) {
            near = true;
          }
        }

        setIsNearStart(near);
        setCursorPos(near && startPoint ? startPoint.clone() : surfaceHitPoint);
        setCursorNormal(normal);
        setIsPointerOverMesh(true);

        canvas.style.cursor = near ? 'pointer' : 'crosshair';

        // Continuous drawing while dragging (holding left button)
        if (isPointerDownRef.current && (e.buttons === 1 || e.buttons === undefined)) {
          const distMovedScreen = Math.hypot(
            e.clientX - pointerDownPosRef.current.x,
            e.clientY - pointerDownPosRef.current.y
          );
          if (distMovedScreen > 4) {
            hasMovedRef.current = true;
          }

          // Track screen points for 2D lasso polygon
          screenPointsRef.current.push(screenPt);
          setScreenPath((prev) => [...prev, screenPt]);

          // Track surface hits and face index for raycast stroke
          surfacePointsRef.current.push(surfaceHitPoint);
          if (hit.faceIndex !== undefined && hit.faceIndex !== null) {
            strokeFaceIndicesRef.current.push(hit.faceIndex);
          }

          // If dragged back to start with >= 3 points, close the loop!
          if (near && drawnPoints.length >= 3) {
            onCloseLoop();
            executeSelection(screenPointsRef.current);
            isPointerDownRef.current = false;
            if (controlsRef?.current) controlsRef.current.enabled = true;
            return;
          }

          const lastPt = lastRecordedPointRef.current;
          if (!lastPt || lastPt.distanceTo(surfaceHitPoint) >= minSpacing) {
            lastRecordedPointRef.current = surfaceHitPoint;
            onAddPoint(surfaceHitPoint);
          }
        }
      } else {
        // Pointer is not over mesh, but if user is dragging lasso in 2D space around mesh:
        setIsPointerOverMesh(false);
        setCursorPos(null);
        setIsNearStart(false);

        if (isPointerDownRef.current && (e.buttons === 1 || e.buttons === undefined)) {
          screenPointsRef.current.push(screenPt);
          setScreenPath((prev) => [...prev, screenPt]);
          hasMovedRef.current = true;
        }

        canvas.style.cursor = isPointerDownRef.current ? 'crosshair' : 'default';
      }
    };

    const handlePointerDown = (e) => {
      // Only handle left click (e.button === 0)
      if (e.button !== 0 || isShiftPressed) return;

      const screenPt = { x: e.clientX, y: e.clientY };
      const hits = getIntersections(e);

      // Start drawing stroke
      isPointerDownRef.current = true;
      pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
      hasMovedRef.current = false;

      screenPointsRef.current = [screenPt];
      surfacePointsRef.current = [];
      strokeFaceIndicesRef.current = [];
      setScreenPath([screenPt]);

      // Temporarily pause OrbitControls camera rotation so canvas drag draws on mesh
      if (controlsRef?.current) {
        controlsRef.current.enabled = false;
      }

      if (hits.length > 0) {
        const hit = hits[0];
        let normal = new THREE.Vector3(0, 1, 0);
        if (hit.face && hit.object) {
          normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
        }
        const surfaceHitPoint = hit.point.clone().add(normal.clone().multiplyScalar(0.25));

        // Check if clicked directly on/near start point to close loop
        if (startPoint && drawnPoints.length >= 3) {
          const distToStart = surfaceHitPoint.distanceTo(startPoint);
          if (distToStart < snapRadius || isNearStart) {
            e.stopPropagation();
            onCloseLoop();
            executeSelection(screenPointsRef.current);
            isPointerDownRef.current = false;
            return;
          }
        }

        surfacePointsRef.current.push(surfaceHitPoint);
        if (hit.faceIndex !== undefined && hit.faceIndex !== null) {
          strokeFaceIndicesRef.current.push(hit.faceIndex);
        }

        lastRecordedPointRef.current = surfaceHitPoint;
        onAddPoint(surfaceHitPoint);
      }
    };

    const handlePointerUp = (e) => {
      if (!isPointerDownRef.current) return;
      isPointerDownRef.current = false;

      // Restore OrbitControls
      if (controlsRef?.current) {
        controlsRef.current.enabled = true;
      }

      // If user moved enough, calculate and trigger lasso face selection
      if (hasMovedRef.current && screenPointsRef.current.length >= 3) {
        executeSelection(screenPointsRef.current);
      }
    };

    const handleDblClick = (e) => {
      if (e.button === 0 && drawnPoints.length >= 3) {
        onCloseLoop();
        executeSelection(screenPointsRef.current);
      }
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('dblclick', handleDblClick);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('dblclick', handleDblClick);
      if (canvas) canvas.style.cursor = 'auto';
      if (controlsRef?.current) {
        controlsRef.current.enabled = true;
      }
    };
  }, [
    gl,
    camera,
    raycaster,
    targetMeshes,
    isDrawing,
    isLoopClosed,
    drawnPoints,
    startPoint,
    minSpacing,
    snapRadius,
    isShiftPressed,
    isNearStart,
    onAddPoint,
    onCloseLoop,
    executeSelection,
    controlsRef
  ]);

  // Convert 2D screen points to SVG polygon points string
  const svgPathData = useMemo(() => {
    if (!screenPath || screenPath.length < 2) return '';
    const rect = gl?.domElement?.getBoundingClientRect();
    if (!rect) return '';
    return screenPath
      .map((p) => `${p.x - rect.left},${p.y - rect.top}`)
      .join(' ');
  }, [screenPath, gl?.domElement]);

  return (
    <group>
      {/* 1. Red 3D Spline Curve on Surface (Videodaki Parlak Kırmızı Kesim Çizgisi) */}
      {redLinePoints.length > 1 && (
        <Line
          points={redLinePoints}
          color="#ef4444"
          lineWidth={4.5}
        />
      )}

      {/* 2. Key Point Nodes along the curve */}
      {drawnPoints.map((pt, idx) => (
        <mesh key={idx} position={[pt.x, pt.y, pt.z]}>
          <sphereGeometry args={[idx === 0 ? 0.9 : 0.45, 12, 12]} />
          <meshBasicMaterial color={idx === 0 ? "#22c55e" : "#f87171"} />
        </mesh>
      ))}

      {/* 3. Green Start Point Node (Videodaki Yeşil Başlangıç Noktası) */}
      {startPoint && (
        <group position={[startPoint.x, startPoint.y, startPoint.z]}>
          {/* Glowing Green Central Sphere */}
          <mesh>
            <sphereGeometry args={[isNearStart ? 1.8 : 1.2, 16, 16]} />
            <meshBasicMaterial color={isNearStart ? "#4ade80" : "#22c55e"} />
          </mesh>

          {/* Concentric Pulsing Ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[isNearStart ? 1.9 : 1.4, isNearStart ? 2.8 : 2.0, 24]} />
            <meshBasicMaterial color={isNearStart ? "#86efac" : "#4ade80"} side={THREE.DoubleSide} />
          </mesh>

          {/* Floating Proximity Callout Badge */}
          {isNearStart && drawnPoints.length >= 3 && (
            <Html center position={[0, snapRadius * 0.8, 0]} distanceFactor={18}>
              <div className="pointer-events-none px-2.5 py-1 bg-emerald-600/95 text-white font-bold text-[11px] rounded-lg shadow-2xl border border-emerald-300 flex items-center gap-1.5 whitespace-nowrap backdrop-blur-md animate-bounce">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span>Halkayı Kapat & Seç</span>
              </div>
            </Html>
          )}
        </group>
      )}

      {/* 4. Live Preview Line from last point to active cursor (Cyan) */}
      {previewLinePoints.length > 0 && (
        <Line
          points={previewLinePoints}
          color="#38bdf8"
          lineWidth={2.5}
          dashed={true}
          dashScale={2.5}
          dashSize={1.2}
          gapSize={0.8}
        />
      )}

      {/* 5. Yellow Elastic Rubber-band Closing Guide Line (Videodaki Sarı Kapatma Çizgisi) */}
      {yellowLinePoints.length > 0 && (
        <Line
          points={yellowLinePoints}
          color="#eab308"
          lineWidth={2.2}
          dashed={true}
          dashScale={2.5}
          dashSize={1.2}
          gapSize={0.8}
        />
      )}

      {/* 6. Live 3D Crosshair (+) Surface Reticle following Cursor */}
      {cursorPos && isDrawing && !isLoopClosed && !isShiftPressed && (
        <group position={[cursorPos.x, cursorPos.y, cursorPos.z]} quaternion={reticleQuat}>
          {/* Surface Orientation Reticle Ring */}
          <mesh>
            <ringGeometry args={[1.5, 2.2, 32]} />
            <meshBasicMaterial
              color={isNearStart ? "#4ade80" : "#38bdf8"}
              side={THREE.DoubleSide}
              transparent
              opacity={0.85}
            />
          </mesh>

          {/* Center Point Dot */}
          <mesh>
            <circleGeometry args={[0.6, 16]} />
            <meshBasicMaterial color={isNearStart ? "#22c55e" : "#ffffff"} side={THREE.DoubleSide} />
          </mesh>

          {/* Crisp 2D Crosshair Overlay with Live Coordinate HUD */}
          <Html center distanceFactor={18}>
            <div className="pointer-events-none flex flex-col items-center -translate-x-1/2 -translate-y-1/2">
              <div className={`transition-transform duration-150 ${isNearStart ? 'text-emerald-400 scale-125' : 'text-white'}`}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="14" y1="2" x2="14" y2="9" />
                  <line x1="14" y1="19" x2="14" y2="26" />
                  <line x1="2" y1="14" x2="9" y2="14" />
                  <line x1="19" y1="14" x2="26" y2="14" />
                  <circle cx="14" cy="14" r="3.5" strokeWidth="1.8" />
                </svg>
              </div>

              <div className="mt-1 px-1.5 py-0.5 bg-gray-950/90 border border-gray-700/80 rounded text-[9px] font-mono text-gray-300 backdrop-blur-md shadow-lg whitespace-nowrap">
                {drawnPoints.length === 0
                  ? 'Kement Çiz'
                  : isNearStart
                  ? 'Halkayı Kapat'
                  : `${drawnPoints.length} nokta`}
              </div>
            </div>
          </Html>
        </group>
      )}

      {/* 7. Live 2D Screen Space Lasso SVG Stroke & Translucent Fill Overlay */}
      {svgPathData && (
        <Html fullscreen style={{ pointerEvents: 'none', zIndex: 15 }}>
          <svg className="w-full h-full overflow-visible pointer-events-none">
            <defs>
              <filter id="lasso-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {screenPath.length >= 3 ? (
              <polygon
                points={svgPathData}
                fill="rgba(245, 158, 11, 0.18)"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="6,4"
                filter="url(#lasso-glow)"
              />
            ) : (
              <polyline
                points={svgPathData}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeDasharray="5,3"
                filter="url(#lasso-glow)"
              />
            )}
          </svg>
        </Html>
      )}
    </group>
  );
}

export default LassoDrawer;
