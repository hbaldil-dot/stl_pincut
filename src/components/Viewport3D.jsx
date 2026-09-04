import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, TransformControls } from '@react-three/drei';
import { LassoDrawer } from './LassoDrawer';
import { PinGizmo } from './PinGizmo';
import { ClippingPlaneHelper } from './ClippingPlaneHelper';
import { MeasureTool } from './MeasureTool';
import { CrossSectionHUD } from './CrossSectionHUD';
import {
  Camera,
  Eye,
  EyeOff,
  RotateCw,
  Grid,
  Layers,
  Sparkles,
  UploadCloud,
  Scissors,
  Maximize2,
  Ruler,
  Copy,
  Check,
  RotateCcw,
  X,
  Crosshair,
  Sliders,
  Compass,
  ArrowDownUp,
  CornerDownRight,
  Flame,
  Activity,
  Scale,
  Box
} from 'lucide-react';
import { PrintBedHelper } from './PrintBedHelper';
import { BoundingBoxHelper } from './BoundingBoxHelper';
import { OverhangLegendOverlay } from './OverhangLegendOverlay';
import { PerformanceMonitor } from './PerformanceMonitor';
import { PerformanceOverlay } from './PerformanceOverlay';

/**
 * Inner Rotatable Model Mesh with Three.js TransformControls rotation rings
 */
function RotatableModelMesh({
  model,
  modelRotation,
  onModelRotationChange,
  onRotationEnd,
  isRotateGizmoActive,
  snapAngle,
  controlsRef,
  clippingConfig,
  activeMode,
  splitResult
}) {
  const transformRef = useRef();

  // Synchronize 3D mesh rotation with external degree states
  useEffect(() => {
    if (model) {
      model.rotation.set(
        THREE.MathUtils.degToRad(modelRotation?.x || 0),
        THREE.MathUtils.degToRad(modelRotation?.y || 0),
        THREE.MathUtils.degToRad(modelRotation?.z || 0)
      );
      model.updateMatrixWorld(true);
    }
  }, [model, modelRotation]);

  useEffect(() => {
    const controls = transformRef.current;
    if (!controls) return;

    const handleDragging = (e) => {
      if (controlsRef?.current) {
        controlsRef.current.enabled = !e.value;
      }
      if (!e.value) {
        if (onRotationEnd) onRotationEnd();
      }
    };

    const handleObjectChange = () => {
      if (model && controls.dragging) {
        const rx = THREE.MathUtils.radToDeg(model.rotation.x);
        const ry = THREE.MathUtils.radToDeg(model.rotation.y);
        const rz = THREE.MathUtils.radToDeg(model.rotation.z);
        const norm = (deg) => {
          let d = Math.round(deg * 10) / 10;
          d = d % 360;
          if (d > 180) d -= 360;
          if (d < -180) d += 360;
          return Math.round(d * 10) / 10;
        };
        onModelRotationChange(
          {
            x: norm(rx),
            y: norm(ry),
            z: norm(rz)
          },
          false
        );
      }
    };

    controls.addEventListener('dragging-changed', handleDragging);
    controls.addEventListener('objectChange', handleObjectChange);

    return () => {
      controls.removeEventListener('dragging-changed', handleDragging);
      controls.removeEventListener('objectChange', handleObjectChange);
    };
  }, [model, controlsRef, onModelRotationChange, onRotationEnd]);

  const snapRad = snapAngle ? THREE.MathUtils.degToRad(snapAngle) : null;

  return (
    <>
      <primitive object={model} />

      {/* Contrasting Internal Geometry Backface Mesh for Cross-Section Inspection */}
      {activeMode === 'plane' &&
        clippingConfig?.enabled &&
        !splitResult &&
        clippingConfig?.highlightInterior !== false &&
        model?.geometry && (
          <mesh
            geometry={model.geometry}
            position={model.position}
            rotation={model.rotation}
            scale={model.scale}
          >
            <meshStandardMaterial
              color={clippingConfig.interiorColor || '#f59e0b'}
              roughness={0.4}
              metalness={0.12}
              side={THREE.BackSide}
              clippingPlanes={model.material?.clippingPlanes || []}
              clipShadows={true}
            />
          </mesh>
        )}

      {isRotateGizmoActive && model && (
        <TransformControls
          ref={transformRef}
          object={model}
          mode="rotate"
          size={0.85}
          rotationSnap={snapRad}
        />
      )}
    </>
  );
}

/**
 * Inner scene controller for handling camera preset jumps, renderer configuration and local clipping.
 */
function SceneController({
  cameraPreset,
  onPresetHandled,
  autoRotate,
  showBoundingBox,
  model,
  controlsRef,
  clippingEnabled
}) {
  const { camera, gl, scene } = useThree();

  // Enable local clipping on WebGLRenderer
  useEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);

  useEffect(() => {
    if (!cameraPreset) return;

    const distance = 130;
    switch (cameraPreset) {
      case 'front':
        camera.position.set(0, 0, distance);
        break;
      case 'top':
        camera.position.set(0, distance, 0);
        break;
      case 'side':
        camera.position.set(distance, 0, 0);
        break;
      case 'iso':
      default:
        camera.position.set(0, 15, 120);
        break;
    }
    camera.lookAt(0, 0, 0);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
    onPresetHandled();
  }, [cameraPreset, camera, controlsRef, onPresetHandled]);

  return (
    <>
      {/* Gizmo Orientation Indicator in bottom right corner */}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="#ffffff" />
      </GizmoHelper>
    </>
  );
}

/**
 * Main 3D Viewport with Three.js STL loading, interactive Clipping Plane, Lasso Slicing, and Precision Caliper Measurement Tool.
 */
export function Viewport3D({
  model,
  modelInfo,
  splitResult,
  explodedDistance,
  activeMode = 'plane', // 'plane' | 'lasso'
  clippingConfig,
  onClippingConfigChange,
  isDrawing,
  drawnPoints,
  onAddPoint,
  onAddStrokePoints,
  onCloseLoop,
  isLoopClosed,
  loopPoints,
  pinConfig,
  onPinConfigChange,
  isShiftPressed,
  controlsRef,
  materialTheme,
  showGrid = true,
  showBoundingBox = false,
  onToggleBoundingBox,
  autoRotate = false,
  onFileDrop,
  // Measurement Tool props
  isMeasureActive = false,
  measurePointA = null,
  measurePointB = null,
  onSetMeasurePointA,
  onSetMeasurePointB,
  onClearMeasurement,
  onToggleMeasure,
  // Model Rotation & Alignment props
  modelRotation = { x: 0, y: 0, z: 0 },
  onModelRotationChange,
  onRotationEnd,
  isRotateGizmoActive = false,
  onToggleRotateGizmo,
  snapAngle = null,
  onSetSnapAngle,
  onStepRotate,
  onResetRotation,
  onAlignFlat,
  // Mesh List Outliner props
  isMeshListOpen = false,
  onToggleMeshList,
  meshCount = 1,
  // Overhang Heat-map props
  isHeatmapActive = false,
  onToggleHeatmap,
  heatmapConfig,
  onChangeHeatmapConfig,
  overhangStats,
  onOpenOverhangTab,
  // Batch processing props
  onMultipleFilesDrop,
  onOpenBatchModal,
  batchQueueCount = 0,
  // Real-time Performance & Triangle Overlay props
  showPerformanceOverlay: initialShowPerf = true,
  // Volume and Material Requirement props
  onOpenVolumeTool,
  // Cross-Section & Internal Geometry HUD props
  isCrossSectionHUDOpen: externalIsCrossSectionOpen,
  onToggleCrossSectionHUD: externalToggleCrossSectionHUD
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [cameraPreset, setCameraPreset] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isRotationHudOpen, setIsRotationHudOpen] = useState(false);
  const [isPerformanceOverlayOpen, setIsPerformanceOverlayOpen] = useState(initialShowPerf);
  const [performanceStats, setPerformanceStats] = useState(null);
  const [internalIsCrossSectionOpen, setInternalIsCrossSectionOpen] = useState(false);
  const canvasContainerRef = useRef();

  const isCrossSectionHUDOpen = externalIsCrossSectionOpen !== undefined ? externalIsCrossSectionOpen : internalIsCrossSectionOpen;
  const handleToggleCrossSectionHUD = externalToggleCrossSectionHUD || (() => setInternalIsCrossSectionOpen((prev) => !prev));

  // Calculated distance between Point A and Point B
  const measuredDistance = useMemo(() => {
    if (!measurePointA || !measurePointB) return null;
    return measurePointA.distanceTo(measurePointB);
  }, [measurePointA, measurePointB]);

  // Delta coordinates
  const deltaCoords = useMemo(() => {
    if (!measurePointA || !measurePointB) return null;
    return {
      dx: Math.abs(measurePointB.x - measurePointA.x),
      dy: Math.abs(measurePointB.y - measurePointA.y),
      dz: Math.abs(measurePointB.z - measurePointA.z)
    };
  }, [measurePointA, measurePointB]);

  // Copy measurement to clipboard
  const handleCopyMeasurement = () => {
    if (!measuredDistance) return;
    const text = `${measuredDistance.toFixed(2)} mm (ΔX: ${deltaCoords.dx.toFixed(2)}mm, ΔY: ${deltaCoords.dy.toFixed(2)}mm, ΔZ: ${deltaCoords.dz.toFixed(2)}mm)`;
    navigator.clipboard?.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Drag and drop handlers for STL files directly on 3D canvas
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.stl'));
      if (files.length > 1 && onMultipleFilesDrop) {
        onMultipleFilesDrop(files);
      } else if (files.length > 0 && onFileDrop) {
        onFileDrop(files[0]);
      }
    }
  };

  // Screenshot capture
  const handleTakeScreenshot = () => {
    const canvas = canvasContainerRef.current?.querySelector('canvas');
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${modelInfo?.name || 'STL_Model'}_snapshot.png`;
    link.href = dataUrl;
    link.click();
  };

  // Calculate effective clipping normal and offset
  const effNormal = clippingConfig?.negate
    ? (clippingConfig?.normal?.clone() || new THREE.Vector3(0, 1, 0)).negate()
    : (clippingConfig?.normal?.clone() || new THREE.Vector3(0, 1, 0));
  const effOffset = clippingConfig?.negate
    ? -(clippingConfig?.offset || 0)
    : (clippingConfig?.offset || 0);

  // Compute helper size based on model bounding radius
  const helperPlaneSize = Math.max(60, (modelInfo?.boundingSphereRadius || 35) * 2.4);

  // Compute center of the cutting plane projected from the model center for snapping alignment
  const planeCenter = useMemo(() => {
    if (!model?.geometry) return new THREE.Vector3(0, effOffset, 0);
    const center = model.geometry.boundingSphere
      ? model.geometry.boundingSphere.center.clone()
      : new THREE.Vector3(0, 0, 0);
    const plane = new THREE.Plane(effNormal.clone().normalize(), -effOffset);
    const target = new THREE.Vector3();
    plane.projectPoint(center, target);
    return target;
  }, [model, effNormal, effOffset]);

  // Projected distance along cutting plane normal
  const projectedDistance = useMemo(() => {
    if (!measurePointA || !measurePointB || !effNormal) return null;
    return Math.abs(measurePointB.clone().sub(measurePointA).dot(effNormal));
  }, [measurePointA, measurePointB, effNormal]);

  // Perpendicular distance of Point A and Point B from the cutting plane
  const planeA_dist = useMemo(() => {
    if (!measurePointA || !effNormal) return null;
    const plane = new THREE.Plane(effNormal.clone().normalize(), -effOffset);
    return plane.distanceToPoint(measurePointA);
  }, [measurePointA, effNormal, effOffset]);

  const planeB_dist = useMemo(() => {
    if (!measurePointB || !effNormal) return null;
    const plane = new THREE.Plane(effNormal.clone().normalize(), -effOffset);
    return plane.distanceToPoint(measurePointB);
  }, [measurePointB, effNormal, effOffset]);

  // Snap cut-plane to measured points
  const handleSnapPlaneToPoint = (pt) => {
    if (!pt || !onClippingConfigChange) return;
    const norm = clippingConfig?.normal
      ? clippingConfig.normal.clone().normalize()
      : new THREE.Vector3(0, 1, 0);
    const targetOffset = norm.dot(pt);
    onClippingConfigChange(
      {
        offset: Math.round(targetOffset * 10) / 10,
        enabled: true,
        showPlaneHelper: true
      },
      false
    );
  };

  const handleSnapPlaneToMidpoint = () => {
    if (!measurePointA || !measurePointB) return;
    const mid = measurePointA.clone().add(measurePointB).multiplyScalar(0.5);
    handleSnapPlaneToPoint(mid);
  };

  const handleAlignPlaneToAB = () => {
    if (!measurePointA || !measurePointB || !onClippingConfigChange) return;
    const dir = measurePointB.clone().sub(measurePointA).normalize();
    if (dir.length() < 0.001) return;

    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');
    const rotX = THREE.MathUtils.radToDeg(euler.x);
    const rotY = THREE.MathUtils.radToDeg(euler.y);
    const rotZ = THREE.MathUtils.radToDeg(euler.z);

    const mid = measurePointA.clone().add(measurePointB).multiplyScalar(0.5);
    const targetOffset = dir.dot(mid);

    onClippingConfigChange(
      {
        axis: 'custom',
        normal: dir,
        rotX: Math.round(rotX * 10) / 10,
        rotY: Math.round(rotY * 10) / 10,
        rotZ: Math.round(rotZ * 10) / 10,
        offset: Math.round(targetOffset * 10) / 10,
        enabled: true,
        showPlaneHelper: true
      },
      false
    );
  };

  return (
    <div
      ref={canvasContainerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full h-full relative select-none ${
        isMeasureActive ? 'cursor-crosshair' : 'cursor-default'
      }`}
    >
      {/* Visual Drag and Drop Overlay Indicator */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 bg-emerald-950/80 backdrop-blur-md border-4 border-dashed border-emerald-400 flex flex-col items-center justify-center text-white pointer-events-none animate-pulse">
          <div className="p-4 bg-emerald-500/20 rounded-2xl mb-3 border border-emerald-400/40">
            <UploadCloud className="w-12 h-12 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-200">STL Dosyasını Buraya Bırakın</div>
          <div className="text-xs text-gray-300 mt-1">Binary veya ASCII .stl modelleri anında yüklenir</div>
        </div>
      )}

      {/* Viewport Top Right Utility Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-gray-900/85 backdrop-blur-md p-1.5 rounded-xl border border-gray-800 shadow-xl">
        {/* Model Rotation & 3D Gizmo Toggle Button */}
        <button
          onClick={onToggleRotateGizmo}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
            isRotateGizmoActive
              ? 'bg-amber-600 text-white border-amber-400 shadow-lg shadow-amber-900/40 ring-2 ring-amber-400/40'
              : 'bg-gray-800 hover:bg-gray-700 text-amber-300 border-gray-700'
          }`}
          title={
            isRotateGizmoActive
              ? '3D Döndürme Gizmosunu Gizle'
              : '3D Döndürme Gizmosunu ve Hizalama Aracını Aç'
          }
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRotateGizmoActive ? 'animate-spin-slow' : ''}`} />
          <span>Döndür & Hizala</span>
          {isRotateGizmoActive && <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />}
        </button>

        <div className="w-[1px] h-4 bg-gray-700 mx-0.5" />

        {/* Measurement Tool Toggle Button */}
        <button
          onClick={onToggleMeasure}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
            isMeasureActive
              ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-900/40 ring-2 ring-cyan-400/40'
              : 'bg-gray-800 hover:bg-gray-700 text-cyan-300 border-gray-700'
          }`}
          title={isMeasureActive ? 'Ölçüm Modunu Kapat' : 'Ölçüm Modunu Aç (2 Nokta Arası mm Mesafe Ölç)'}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Ölçüm (mm)</span>
          {isMeasureActive && <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping" />}
        </button>

        {/* AABB Bounding Box Wireframe Toggle */}
        {onToggleBoundingBox && (
          <button
            onClick={onToggleBoundingBox}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
              showBoundingBox
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-900/40 ring-2 ring-cyan-400/40'
                : 'bg-gray-800 hover:bg-gray-700 text-cyan-300 border-gray-700'
            }`}
            title={
              showBoundingBox
                ? 'AABB Sınır Kutusu Tel Kafesini Gizle'
                : 'Modelin Eksen Hizalı Sınır Kutusunu (AABB Tel Kafes) ve Ölçüm Boyutlarını Göster'
            }
          >
            <Box className="w-3.5 h-3.5" />
            <span>AABB</span>
            {showBoundingBox && <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />}
          </button>
        )}

        <div className="w-[1px] h-4 bg-gray-700 mx-0.5" />

        {/* 3D Meshes & Outliner Side Panel Toggle Button */}
        <button
          onClick={onToggleMeshList}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
            isMeshListOpen
              ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-900/40 ring-2 ring-indigo-400/40'
              : 'bg-gray-800 hover:bg-gray-700 text-indigo-300 border-gray-700'
          }`}
          title={isMeshListOpen ? 'Nesneler Panelini Kapat' : '3D Nesneler ve Katman Listesi (Opaklık, Tel Kafes, Görünürlük)'}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Nesneler</span>
          <span className="text-[10px] bg-indigo-500/80 text-white font-mono px-1.5 py-0.2 rounded-full font-bold">
            {meshCount}
          </span>
        </button>

        <div className="w-[1px] h-4 bg-gray-700 mx-0.5" />

        {/* Real-time FPS & Triangle Count Performance Overlay Toggle Button */}
        <button
          onClick={() => setIsPerformanceOverlayOpen((prev) => !prev)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
            isPerformanceOverlayOpen
              ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-900/40 ring-2 ring-emerald-400/40'
              : 'bg-gray-800 hover:bg-gray-700 text-emerald-300 border-gray-700'
          }`}
          title={
            isPerformanceOverlayOpen
              ? 'Performans ve Üçgen Monitörünü Gizle'
              : 'Gerçek Zamanlı Model Karmaşıklığı ve FPS Monitörünü Aç'
          }
        >
          <Activity className="w-3.5 h-3.5 text-emerald-300" />
          <span>FPS & Üçgen</span>
          {performanceStats && (
            <span className="text-[10px] bg-emerald-950/80 text-emerald-200 border border-emerald-400/40 font-mono px-1.5 py-0.2 rounded-full font-bold">
              {performanceStats.fps} FPS
            </span>
          )}
        </button>

        {/* STL Volume & 3D Print Material Estimation Button */}
        {onOpenVolumeTool && (
          <button
            onClick={onOpenVolumeTool}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-amber-300 border-gray-700 hover:border-amber-500/50"
            title="STL Hacim (cm³ / mm³) ve 3D Baskı Filament Hesaplayıcı"
          >
            <Scale className="w-3.5 h-3.5 text-amber-400" />
            <span>Hacim</span>
            {modelInfo?.volumeCm3 !== undefined && (
              <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/40 font-mono px-1.5 py-0.2 rounded-full font-bold">
                {modelInfo.volumeCm3} cm³
              </span>
            )}
          </button>
        )}

        <div className="w-[1px] h-4 bg-gray-700 mx-0.5" />

        {/* Cross-Section & Hidden Plane Inspection Button Group */}
        <div className="flex items-center">
          <button
            onClick={() => {
              handleToggleCrossSectionHUD();
              if (!clippingConfig?.enabled) {
                onClippingConfigChange?.({ enabled: true }, false);
              }
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded-l-lg border transition flex items-center gap-1.5 ${
              isCrossSectionHUDOpen || (clippingConfig?.enabled && activeMode === 'plane')
                ? 'bg-sky-600 text-white border-sky-400 shadow-lg shadow-sky-900/40 ring-1 ring-sky-400/40'
                : 'bg-gray-800 hover:bg-gray-700 text-sky-300 border-gray-700'
            }`}
            title="Kesit Görünümü ve İç Geometri İnceleme Paneli (Kısayol: C)"
          >
            <Scissors className="w-3.5 h-3.5 text-sky-200" />
            <span>Kesit Görünümü</span>
            {clippingConfig?.enabled && (
              <span className="text-[10px] bg-sky-950/80 text-sky-200 border border-sky-400/40 font-mono px-1 py-0.2 rounded font-bold">
                {clippingConfig.axis?.toUpperCase() || 'Y'}
              </span>
            )}
          </button>

          {/* Quick Toggle Hidden Plane (Gizli Düzlem / Kılavuz Sacı) */}
          <button
            onClick={() => {
              const isCurrentlyHidden = clippingConfig?.showPlaneHelper === false;
              onClippingConfigChange?.({ showPlaneHelper: isCurrentlyHidden }, false);
            }}
            className={`px-2 py-1 text-xs font-semibold rounded-r-lg border-y border-r transition flex items-center gap-1 ${
              clippingConfig?.showPlaneHelper === false
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 hover:bg-amber-500/30 ring-1 ring-amber-400/30'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
            }`}
            title={
              clippingConfig?.showPlaneHelper === false
                ? 'Gizli Düzlem Aktif: Kılavuz sacı gizlendi. Tıklayarak kılavuz sacını görünür yapın (Kısayol: P)'
                : 'Düzlem Kılavuzunu Gizle: İç geometriyi engelsiz incelemek için tıklayın (Kısayol: P)'
            }
          >
            {clippingConfig?.showPlaneHelper === false ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-mono font-bold text-amber-300">Gizli [P]</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-sky-300" />
                <span className="text-[10px] font-mono text-gray-300">Düzlem [P]</span>
              </>
            )}
          </button>
        </div>

        <div className="w-[1px] h-4 bg-gray-700 mx-0.5" />

        {/* Overhang & Support Heat-map Toggle Button */}
        <button
          onClick={onToggleHeatmap}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
            isHeatmapActive
              ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-900/40 ring-2 ring-red-400/40'
              : 'bg-gray-800 hover:bg-gray-700 text-red-300 border-gray-700'
          }`}
          title={
            isHeatmapActive
              ? 'Overhang ve Destek Isı Haritasını Kapat'
              : 'Overhang ve Destek Isı Haritasını Aç (Baskı Yönüne Göre)'
          }
        >
          <Flame className="w-3.5 h-3.5 text-red-400" />
          <span>Destek Isı Haritası</span>
          {isHeatmapActive && <span className="w-1.5 h-1.5 rounded-full bg-red-300 animate-ping" />}
        </button>

        <div className="w-[1px] h-4 bg-gray-700 mx-0.5" />

        {/* Pin Surface Normal Snapping Quick Button */}
        {pinConfig?.mode !== 'flat' && (
          <button
            onClick={() => {
              const isCurrentlySnapped = pinConfig?.snapToNormal !== false && pinConfig?.snapToCenter !== false;
              onPinConfigChange?.({
                snapToNormal: !isCurrentlySnapped,
                snapToCenter: !isCurrentlySnapped,
                offsetU: 0,
                offsetV: 0
              });
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
              pinConfig?.snapToNormal !== false && pinConfig?.snapToCenter !== false
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-950/40 ring-2 ring-emerald-400/30'
                : 'bg-gray-800 hover:bg-gray-700 text-emerald-400 border-gray-700'
            }`}
            title={
              pinConfig?.snapToNormal !== false && pinConfig?.snapToCenter !== false
                ? 'Pim Kitleme: Yüzey Normaline Dik & Merkezde (90° Flush Fit Aktif). Tıklayarak serbest bırakın.'
                : 'Pimi Kesit Yüzey Normaline ve Merkezine Kitle (90° Flush Fit için tıklayın)'
            }
          >
            <Crosshair className={`w-3.5 h-3.5 ${pinConfig?.snapToNormal !== false && pinConfig?.snapToCenter !== false ? 'text-emerald-200' : 'text-emerald-400'}`} />
            <span>
              {pinConfig?.snapToNormal !== false && pinConfig?.snapToCenter !== false
                ? 'Normal & Merkez Kilitli'
                : 'Pimi Kitle'}
            </span>
            {pinConfig?.snapToNormal !== false && pinConfig?.snapToCenter !== false && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse" />
            )}
          </button>
        )}

        {/* Batch Processing Queue Toggle Button */}
        {onOpenBatchModal && (
          <>
            <div className="w-[1px] h-4 bg-gray-700 mx-0.5" />
            <button
              onClick={onOpenBatchModal}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
                batchQueueCount > 0
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-950/40'
                  : 'bg-gray-800 hover:bg-gray-700 text-emerald-300 border-gray-700'
              }`}
              title="Toplu STL İşleme Kuyruğu (Birden fazla STL modelini aynı ayarlarla kes)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Toplu İşleme</span>
              {batchQueueCount > 0 && (
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/50 font-mono px-1.5 py-0.2 rounded-full font-bold">
                  {batchQueueCount}
                </span>
              )}
            </button>
          </>
        )}

        <div className="w-[1px] h-4 bg-gray-700 mx-0.5" />
        <button
          onClick={() => setCameraPreset('iso')}
          className="px-2 py-1 text-[11px] font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition"
          title="İzometrik Görünüm"
        >
          İzo
        </button>
        <button
          onClick={() => setCameraPreset('front')}
          className="px-2 py-1 text-[11px] font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition"
          title="Ön Görünüm"
        >
          Ön
        </button>
        <button
          onClick={() => setCameraPreset('top')}
          className="px-2 py-1 text-[11px] font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition"
          title="Üst Görünüm"
        >
          Üst
        </button>
        <button
          onClick={() => setCameraPreset('side')}
          className="px-2 py-1 text-[11px] font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition"
          title="Yan Görünüm"
        >
          Yan
        </button>

        <div className="w-[1px] h-4 bg-gray-700 mx-0.5" />

        {/* Screenshot capture button */}
        <button
          onClick={handleTakeScreenshot}
          className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-700 transition"
          title="Ekran Görüntüsü Al (PNG)"
        >
          <Camera className="w-3.5 h-3.5 text-cyan-400" />
        </button>
      </div>

      {/* Floating 3D Model Rotation & Alignment HUD Overlay */}
      {isRotateGizmoActive && (
        <div className="absolute top-16 right-4 z-20 bg-gray-900/95 border border-amber-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl w-80 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <RotateCw className="w-4 h-4 text-amber-400" />
              <span>3D Döndürme & Hizalama Gizmosu</span>
            </div>
            <button
              onClick={onToggleRotateGizmo}
              className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition"
              title="Gizmo Panelini Kapat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Real-time Angle Badges */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <div className="bg-red-950/40 border border-red-800/50 p-1.5 rounded-lg text-center">
              <div className="text-[10px] text-red-400 font-semibold">X (Pitch)</div>
              <div className="text-xs font-bold font-mono text-white">
                {Math.round(modelRotation?.x || 0)}°
              </div>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-800/50 p-1.5 rounded-lg text-center">
              <div className="text-[10px] text-emerald-400 font-semibold">Y (Yaw)</div>
              <div className="text-xs font-bold font-mono text-white">
                {Math.round(modelRotation?.y || 0)}°
              </div>
            </div>
            <div className="bg-blue-950/40 border border-blue-800/50 p-1.5 rounded-lg text-center">
              <div className="text-[10px] text-blue-400 font-semibold">Z (Roll)</div>
              <div className="text-xs font-bold font-mono text-white">
                {Math.round(modelRotation?.z || 0)}°
              </div>
            </div>
          </div>

          {/* Interactive Axis Sliders */}
          <div className="space-y-2 mb-3 bg-gray-950/40 p-2.5 rounded-xl border border-gray-800 text-xs">
            {/* X-Axis */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-red-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  X Açısı:
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={Math.round(modelRotation?.x || 0)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      onModelRotationChange({ ...modelRotation, x: val }, true);
                    }}
                    className="w-14 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-right font-mono text-[11px] text-white focus:border-red-500 focus:outline-none"
                  />
                  <span className="text-gray-500 text-[10px]">°</span>
                </div>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={modelRotation?.x || 0}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onModelRotationChange({ ...modelRotation, x: val }, false);
                }}
                onMouseUp={() => {
                  if (onRotationEnd) onRotationEnd();
                }}
                onTouchEnd={() => {
                  if (onRotationEnd) onRotationEnd();
                }}
                className="w-full accent-red-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
              />
            </div>

            {/* Y-Axis */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Y Açısı:
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={Math.round(modelRotation?.y || 0)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      onModelRotationChange({ ...modelRotation, y: val }, true);
                    }}
                    className="w-14 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-right font-mono text-[11px] text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-gray-500 text-[10px]">°</span>
                </div>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={modelRotation?.y || 0}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onModelRotationChange({ ...modelRotation, y: val }, false);
                }}
                onMouseUp={() => {
                  if (onRotationEnd) onRotationEnd();
                }}
                onTouchEnd={() => {
                  if (onRotationEnd) onRotationEnd();
                }}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
              />
            </div>

            {/* Z-Axis */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-blue-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Z Açısı:
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={Math.round(modelRotation?.z || 0)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      onModelRotationChange({ ...modelRotation, z: val }, true);
                    }}
                    className="w-14 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-right font-mono text-[11px] text-white focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-gray-500 text-[10px]">°</span>
                </div>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={modelRotation?.z || 0}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onModelRotationChange({ ...modelRotation, z: val }, false);
                }}
                onMouseUp={() => {
                  if (onRotationEnd) onRotationEnd();
                }}
                onTouchEnd={() => {
                  if (onRotationEnd) onRotationEnd();
                }}
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
              />
            </div>
          </div>

          {/* Angle Snapping Control */}
          <div className="mb-3 flex items-center justify-between bg-gray-950/60 p-2 rounded-xl border border-gray-800 text-xs">
            <span className="text-gray-400 text-[11px]">Açı Kilidi (Snap):</span>
            <div className="flex items-center gap-1">
              {[
                { label: 'Serbest', val: null },
                { label: '15°', val: 15 },
                { label: '45°', val: 45 },
                { label: '90°', val: 90 }
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => onSetSnapAngle && onSetSnapAngle(s.val)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded transition ${
                    snapAngle === s.val
                      ? 'bg-amber-500 text-gray-950 font-bold'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Alignment Action Buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onAlignFlat}
              className="py-1.5 px-2 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1 shadow-sm"
              title="Modeli 90° dik açıyla tablaya oturt"
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
              <span>Tablaya Oturt</span>
            </button>

            <button
              onClick={onResetRotation}
              className="py-1.5 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1 border border-gray-700"
              title="Yönelimi Sıfırla (0°, 0°, 0°)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>0° Sıfırla</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Measurement HUD Overlay */}
      {(isMeasureActive || measurePointA || measurePointB) && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          className="absolute top-16 left-4 z-20 bg-gray-900/95 border border-cyan-500/50 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl max-w-xs sm:max-w-sm animate-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
              <Ruler className="w-4 h-4 text-cyan-400" />
              <span>Hassas STL 3D Cetvel</span>
            </div>
            <button
              onClick={onClearMeasurement}
              className="text-[10px] text-gray-400 hover:text-red-300 bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded transition flex items-center gap-1"
              title="Ölçüm Noktalarını Sıfırla"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Sıfırla</span>
            </button>
          </div>

          {/* Status & Guidance Indicator */}
          <div className="mb-2.5 space-y-2">
            {!measurePointA && (
              <div className="text-[11px] text-cyan-200 flex items-center gap-1.5 bg-cyan-950/60 p-2 rounded-lg border border-cyan-800/60">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                <span>1. Adım: Model üzerinde ilk noktaya <strong>(Nokta A)</strong> tıklayın.</span>
              </div>
            )}
            {measurePointA && !measurePointB && (
              <div className="text-[11px] text-amber-200 flex items-center gap-1.5 bg-amber-950/60 p-2 rounded-lg border border-amber-800/60">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span>2. Adım: İkinci noktaya <strong>(Nokta B)</strong> tıklayarak mesafeyi hesaplayın.</span>
              </div>
            )}
            {measurePointA && measurePointB && (
              <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-500/40">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold tracking-wider">
                    Hesaplanan 3D Mesafe:
                  </span>
                  <span className="text-[10px] text-emerald-300/80 font-mono">Euclidean</span>
                </div>
                <div className="text-xl font-mono font-bold text-white flex items-baseline gap-1 my-0.5">
                  <span className="text-emerald-300">{measuredDistance?.toFixed(2)}</span>
                  <span className="text-xs text-gray-400 font-normal">mm</span>
                </div>

                {deltaCoords && (
                  <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-emerald-900/60 text-[10px] font-mono text-gray-300">
                    <div>
                      <span className="text-red-400 font-bold">ΔX:</span> {deltaCoords.dx.toFixed(1)}
                    </div>
                    <div>
                      <span className="text-green-400 font-bold">ΔY:</span> {deltaCoords.dy.toFixed(1)}
                    </div>
                    <div>
                      <span className="text-blue-400 font-bold">ΔZ:</span> {deltaCoords.dz.toFixed(1)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cut-Plane Positioning Feedback & Quick Alignment Actions */}
            {measurePointA && measurePointB && (
              <div className="bg-gray-950/70 p-2.5 rounded-xl border border-sky-900/50 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-sky-300">
                  <span className="flex items-center gap-1">
                    <Scissors className="w-3.5 h-3.5 text-sky-400" />
                    <span>Kesit Düzlemi Geri Bildirimi</span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950/80 text-sky-400 border border-sky-800/60">
                    Eksen: {clippingConfig?.axis?.toUpperCase() || 'Y'}
                  </span>
                </div>

                {/* Projected Distance along Cut Axis */}
                {projectedDistance !== null && (
                  <div className="flex items-center justify-between text-[10px] font-mono bg-gray-900/80 px-2 py-1 rounded border border-gray-800">
                    <span className="text-gray-400">Kesit Boyunca Mesafe:</span>
                    <span className="text-white font-bold">{projectedDistance.toFixed(2)} mm</span>
                  </div>
                )}

                {/* Perpendicular Distance of Point A and Point B from Plane */}
                {planeA_dist !== null && planeB_dist !== null && (
                  <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                    <div className="p-1.5 rounded bg-cyan-950/40 border border-cyan-900/40">
                      <span className="text-cyan-400 block text-[9px]">A → Düzlem</span>
                      <span className="text-white font-bold">
                        {planeA_dist >= 0 ? '+' : ''}{planeA_dist.toFixed(1)} mm
                      </span>
                    </div>
                    <div className="p-1.5 rounded bg-amber-950/40 border border-amber-900/40">
                      <span className="text-amber-400 block text-[9px]">B → Düzlem</span>
                      <span className="text-white font-bold">
                        {planeB_dist >= 0 ? '+' : ''}{planeB_dist.toFixed(1)} mm
                      </span>
                    </div>
                  </div>
                )}

                {/* Cut Plane Slicing Notice */}
                {planeA_dist !== null && planeB_dist !== null && (planeA_dist * planeB_dist <= 0) && (
                  <div className="text-[10px] text-rose-300 bg-rose-950/40 border border-rose-900/40 px-2 py-1 rounded flex items-center gap-1 font-medium">
                    <span>✂️ Düzlem şu anda A ve B arasından geçiyor.</span>
                  </div>
                )}

                {/* Fast Cut-Plane Snapping Buttons */}
                <div className="pt-1 border-t border-gray-800/80 space-y-1">
                  <div className="text-[9px] text-gray-400 uppercase font-semibold">
                    Düzlemi Ölçüme Göre Konumlandır:
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => handleSnapPlaneToPoint(measurePointA)}
                      className="py-1 px-1 rounded text-[10px] font-semibold bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 border border-cyan-700/60 transition text-center shadow-sm"
                      title="Kesit düzlemini tam Nokta A'ya ayarlar"
                    >
                      Düzlem → A
                    </button>
                    <button
                      onClick={handleSnapPlaneToMidpoint}
                      className="py-1 px-1 rounded text-[10px] font-bold bg-emerald-950/90 hover:bg-emerald-900 text-emerald-200 border border-emerald-600/70 transition text-center shadow-sm"
                      title="Kesit düzlemini Nokta A ve Nokta B'nin tam ortasına ayarlar"
                    >
                      Tam Ortala
                    </button>
                    <button
                      onClick={() => handleSnapPlaneToPoint(measurePointB)}
                      className="py-1 px-1 rounded text-[10px] font-semibold bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700/60 transition text-center shadow-sm"
                      title="Kesit düzlemini tam Nokta B'ye ayarlar"
                    >
                      Düzlem → B
                    </button>
                  </div>
                  <button
                    onClick={handleAlignPlaneToAB}
                    className="w-full py-1 px-1.5 rounded text-[10px] font-semibold bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-700/60 transition flex items-center justify-center gap-1 shadow-sm"
                    title="Kesit düzlemini A→B ölçüm vektörüne dik açıya çevirip ortalar"
                  >
                    <Compass className="w-3 h-3 text-purple-400" />
                    <span>A→B Doğrultusuna Dik Kesit Aç</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-1.5">
            {measuredDistance !== null && (
              <button
                onClick={handleCopyMeasurement}
                className="flex-1 py-1 px-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 border border-gray-700"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{isCopied ? 'Kopyalandı!' : 'Değeri Kopyala'}</span>
              </button>
            )}
            <button
              onClick={onToggleMeasure}
              className={`py-1 px-2 rounded-lg text-xs font-semibold transition border ${
                isMeasureActive
                  ? 'bg-cyan-950/60 border-cyan-800/80 text-cyan-300 hover:bg-cyan-900/60'
                  : 'bg-gray-800 border-gray-700 text-gray-300'
              }`}
            >
              {isMeasureActive ? 'Modu Kapat' : 'Ölçüm Modu'}
            </button>
          </div>

          {isMeasureActive && (
            <div className="text-[9px] text-gray-500 mt-2 text-center">
              İpucu: Modeli döndürmek için Shift tuşunu basılı tutun veya sağ fare tuşu ile sürükleyin.
            </div>
          )}
        </div>
      )}

      {/* Floating Cross-Section & Internal Geometry HUD Overlay */}
      <CrossSectionHUD
        isOpen={isCrossSectionHUDOpen}
        onClose={() => {
          handleToggleCrossSectionHUD();
        }}
        clippingConfig={clippingConfig}
        onClippingConfigChange={onClippingConfigChange}
        modelInfo={modelInfo}
        onResetOffset={() => onClippingConfigChange?.({ offset: 0 }, false)}
      />

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 15, 120], fov: 48 }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          localClippingEnabled: true
        }}
      >
        {/* Scene Lighting Setup */}
        <ambientLight intensity={0.85} />
        <directionalLight position={[30, 45, 40]} intensity={1.5} castShadow />
        <directionalLight position={[-30, -20, -30]} intensity={0.6} />
        <directionalLight position={[0, -40, 20]} intensity={0.3} />
        <pointLight position={[0, 50, 0]} intensity={0.8} />

        {/* Floor Grid */}
        {showGrid && (
          <gridHelper
            args={[180, 36, '#059669', '#1e293b']}
            position={[0, -45, 0]}
          />
        )}

        {/* Sliced Model with Exploded View */}
        {splitResult ? (
          <group>
            {/* Part A with Male Pin */}
            <primitive
              object={splitResult.partA}
              position={[
                splitResult.normal.x * explodedDistance * 0.5,
                splitResult.normal.y * explodedDistance * 0.5,
                splitResult.normal.z * explodedDistance * 0.5
              ]}
            />
            {/* Part B with Socket Cavity */}
            <primitive
              object={splitResult.partB}
              position={[
                -splitResult.normal.x * explodedDistance * 0.5,
                -splitResult.normal.y * explodedDistance * 0.5,
                -splitResult.normal.z * explodedDistance * 0.5
              ]}
            />

            {/* Separate Dowel Pin Mesh if dowel mode is enabled */}
            {splitResult.dowelPinGeometry && (
              <mesh
                geometry={splitResult.dowelPinGeometry}
                position={[
                  splitResult.center.x,
                  splitResult.center.y,
                  splitResult.center.z
                ]}
              >
                <meshStandardMaterial
                  color="#10b981"
                  roughness={0.3}
                  metalness={0.2}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}

            {/* Interactive Measurement Tool on Sliced Parts */}
            <MeasureTool
              meshes={[splitResult.partA, splitResult.partB]}
              active={isMeasureActive}
              pointA={measurePointA}
              pointB={measurePointB}
              onSetPointA={onSetMeasurePointA}
              onSetPointB={onSetMeasurePointB}
              onClearMeasurement={onClearMeasurement}
              clippingConfig={clippingConfig}
              onClippingConfigChange={onClippingConfigChange}
            />
          </group>
        ) : (
          /* Main Uncut Model */
          model && (
            <group>
              <RotatableModelMesh
                model={model}
                modelRotation={modelRotation}
                onModelRotationChange={onModelRotationChange}
                onRotationEnd={onRotationEnd}
                isRotateGizmoActive={isRotateGizmoActive}
                snapAngle={snapAngle}
                controlsRef={controlsRef}
                clippingConfig={clippingConfig}
                activeMode={activeMode}
                splitResult={splitResult}
              />

              {/* Interior inspection cavity illumination light */}
              {activeMode === 'plane' && clippingConfig?.enabled && (
                <pointLight position={[0, 0, 0]} intensity={0.75} color="#ffffff" distance={250} />
              )}

              {/* Bounding Box Wireframe & Live Dimensions in 3D Space */}
              <BoundingBoxHelper
                model={model}
                modelInfo={modelInfo}
                visible={showBoundingBox}
                color="#06b6d4"
                modelRotation={modelRotation}
              />

              {/* 3D Clipping Plane Visual Helper Sheet */}
              {activeMode === 'plane' && clippingConfig?.enabled && (
                <>
                  <ClippingPlaneHelper
                    planeNormal={effNormal}
                    planeOffset={effOffset}
                    planeSize={helperPlaneSize}
                    visible={clippingConfig.showPlaneHelper !== false}
                    color="#0ea5e9"
                    interactivePinPlacement={clippingConfig.addPinOnSlice && pinConfig?.mode !== 'flat'}
                    onPlaneClick={(u, v) => {
                      onPinConfigChange?.({
                        offsetU: u,
                        offsetV: v,
                        snapToCenter: false
                      }, false);
                    }}
                  />

                  {/* Live Alignment Pin Snapped to Cut-Plane Surface Normal & Center (hidden when plane helper is hidden) */}
                  {clippingConfig.showPlaneHelper !== false && clippingConfig.addPinOnSlice && pinConfig?.mode !== 'flat' && (
                    <PinGizmo
                      planeNormal={effNormal}
                      planeCenter={planeCenter}
                      pinConfig={pinConfig}
                      onPinConfigChange={onPinConfigChange}
                      showSnappingGuide={true}
                    />
                  )}
                </>
              )}

              {/* Lasso Drawing Layer (when in Lasso Mode) */}
              {activeMode === 'lasso' && !isMeasureActive && (
                <>
                  <LassoDrawer
                    mesh={model}
                    isDrawing={isDrawing}
                    drawnPoints={drawnPoints}
                    onAddPoint={onAddPoint}
                    onAddStrokePoints={onAddStrokePoints}
                    onCloseLoop={onCloseLoop}
                  />

                  {/* Once Loop is Closed, show Neon Green Cut Plane & Orange Connector Pin */}
                  {isLoopClosed && loopPoints.length >= 3 && (
                    <PinGizmo
                      loopPoints={loopPoints}
                      pinConfig={pinConfig}
                      onPinConfigChange={onPinConfigChange}
                    />
                  )}
                </>
              )}

              {/* Interactive Precision Caliper Measurement Tool */}
              <MeasureTool
                mesh={model}
                active={isMeasureActive}
                pointA={measurePointA}
                pointB={measurePointB}
                onSetPointA={onSetMeasurePointA}
                onSetPointB={onSetMeasurePointB}
                onClearMeasurement={onClearMeasurement}
                clippingConfig={clippingConfig}
                onClippingConfigChange={onClippingConfigChange}
              />
            </group>
          )
        )}

        {/* 3D Visual Print Bed & Orientation Arrow Helper */}
        {isHeatmapActive && heatmapConfig?.showBuildPlate && (
          <PrintBedHelper
            printDirection={heatmapConfig.printDirection}
            modelInfo={modelInfo}
            visible={true}
          />
        )}

        {/* Scene Controller Helper for camera presets, clipping and orientation */}
        <SceneController
          cameraPreset={cameraPreset}
          onPresetHandled={() => setCameraPreset(null)}
          autoRotate={autoRotate}
          showBoundingBox={showBoundingBox}
          model={model}
          controlsRef={controlsRef}
          clippingEnabled={clippingConfig?.enabled}
        />

        {/* Real-time Rendering Performance & Triangle Count Monitor */}
        <PerformanceMonitor
          model={model}
          splitResult={splitResult}
          onUpdateStats={setPerformanceStats}
        />

        {/* Orbit Controls */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          autoRotate={autoRotate}
          autoRotateSpeed={1.8}
          enableRotate={(!isDrawing && !isMeasureActive) || isShiftPressed}
          rotateSpeed={0.8}
          panSpeed={0.8}
          zoomSpeed={1.0}
        />
      </Canvas>

      {/* Real-time Triangle Count and FPS Performance Overlay */}
      <PerformanceOverlay
        visible={isPerformanceOverlayOpen}
        stats={performanceStats}
        onClose={() => setIsPerformanceOverlayOpen(false)}
      />

      {/* Overhang Heat-map HUD Legend Overlay */}
      <OverhangLegendOverlay
        enabled={isHeatmapActive}
        onClose={onToggleHeatmap}
        stats={overhangStats}
        thresholdDeg={heatmapConfig?.thresholdDeg || 45}
        warnRangeDeg={heatmapConfig?.warnRangeDeg || 10}
        mode={heatmapConfig?.mode || 0}
        onChangeMode={(newMode) => onChangeHeatmapConfig && onChangeHeatmapConfig({ mode: newMode })}
        printDirectionName={
          heatmapConfig?.presetId === 'custom'
            ? 'Özel Yön'
            : heatmapConfig?.presetId === 'down_y'
            ? '-Y (Ters Baskı)'
            : heatmapConfig?.presetId === 'front_z'
            ? '+Z (Ön Yüz)'
            : heatmapConfig?.presetId === 'back_z'
            ? '-Z (Arka Yüz)'
            : heatmapConfig?.presetId === 'right_x'
            ? '+X (Sağ Yan)'
            : heatmapConfig?.presetId === 'left_x'
            ? '-X (Sol Yan)'
            : '+Y (Varsayılan Üst)'
        }
        showBuildPlate={heatmapConfig?.showBuildPlate}
        onToggleBuildPlate={() =>
          onChangeHeatmapConfig && onChangeHeatmapConfig({ showBuildPlate: !heatmapConfig?.showBuildPlate })
        }
        onOpenOverhangTab={onOpenOverhangTab}
      />
    </div>
  );
}
