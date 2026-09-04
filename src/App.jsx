import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Viewport3D } from './components/Viewport3D';
import { ControlsPanel } from './components/ControlsPanel';
import { ModelInspector } from './components/ModelInspector';
import { ExportModal } from './components/ExportModal';
import { HistoryPanel } from './components/HistoryPanel';
import { MeshListPanel } from './components/MeshListPanel';
import { BatchProcessingModal } from './components/BatchProcessingModal';
import { VolumeMaterialModal } from './components/VolumeMaterialModal';
import { loadSamplePreset, parseCustomSTL, MATERIAL_THEMES } from './utils/stlLoaderHelper';
import { SAMPLE_PRESETS } from './utils/sampleModels';
import { sliceMeshWithPlane, sliceMeshWithLasso } from './utils/meshSlicer';
import { createWorkspaceSnapshot, restoreWorkspaceSnapshot } from './utils/historyManager';
import {
  CommandStack,
  ModelTransformCommand,
  CutPlaneAdjustCommand,
  PinPlacementCommand,
  SplitModelCommand,
  MeasureCommand,
  InitialModelCommand
} from './utils/commandPattern';
import {
  downloadMeshSTL,
  downloadCombinedSTL,
  downloadAllPartsZip,
  downloadBatchProcessedZip,
  calculateGeometryStats
} from './utils/stlExporter';
import {
  createSupportHeatmapMaterial,
  calculateOverhangStatistics
} from './utils/supportHeatmap';
import {
  Download,
  Scissors,
  Layers,
  FolderArchive,
  Sparkles,
  Sliders,
  CheckCircle2,
  X,
  FileDown,
  Ruler,
  Undo2,
  Redo2,
  History,
  Flame
} from 'lucide-react';

export function App() {
  // Model state
  const [model, setModel] = useState(null);
  const [modelName, setModelName] = useState('Stanford Bunny');
  const [modelInfo, setModelInfo] = useState(null);
  const [faceCount, setFaceCount] = useState(0);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Stanford Bunny yüklendi.');

  // Modes: 'plane' (interactive clipping plane) | 'lasso' (freeform curve)
  const [activeMode, setActiveMode] = useState('plane');

  // Interactive Clipping Plane Configuration
  const [clippingConfig, setClippingConfig] = useState({
    enabled: true,
    axis: 'y', // 'x' | 'y' | 'z' | 'custom'
    offset: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    negate: false,
    showPlaneHelper: true,
    addPinOnSlice: true,
    highlightInterior: true,
    interiorColor: '#f59e0b',
    normal: new THREE.Vector3(0, 1, 0)
  });

  // Cross-Section & Internal Geometry Inspection HUD state
  const [isCrossSectionHUDOpen, setIsCrossSectionHUDOpen] = useState(false);

  // Lasso Painting / Freehand points
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState([]);
  const [isLoopClosed, setIsLoopClosed] = useState(false);
  const [loopPoints, setLoopPoints] = useState([]);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // Alignment Pin & Hole Configuration with Surface Normal Snapping & Flush Fitting
  const [pinConfig, setPinConfig] = useState({
    mode: 'pin_and_hole', // 'pin_and_hole' | 'holes_both' | 'hole_only' | 'pin_only' | 'flat'
    diameter: 8.0,
    size: 8.0,
    depth: 10.0,
    height: 10.0,
    clearance: 0.2, // mm 3D print fit tolerance
    type: 'cylinder', // 'cylinder' | 'pyramid' | 'hex'
    taper: 0.85,
    snapToNormal: true,     // Force pin axis collinear with cut-plane surface normal (90° flush fit)
    snapToCenter: true,     // Force pin center to geometric centroid of planar cut section
    flushFit: true,         // Guarantee zero-gap flush mating between cut sections
    offsetU: 0,             // Tangent coordinate offset U (mm) on cut plane
    offsetV: 0,             // Tangent coordinate offset V (mm) on cut plane
    magneticThreshold: 3.0  // Magnetic snap snap-to-center threshold in mm
  });

  // Model 3D Rotation & Alignment State
  const [modelRotation, setModelRotation] = useState({ x: 0, y: 0, z: 0 });
  const [isRotateGizmoActive, setIsRotateGizmoActive] = useState(false);
  const [snapAngle, setSnapAngle] = useState(null);

  // Sliced Meshes & Exploded View
  const [splitResult, setSplitResult] = useState(null);
  const [explodedDistance, setExplodedDistance] = useState(15);

  // Measurement Tool State
  const [isMeasureActive, setIsMeasureActive] = useState(false);
  const [measurePointA, setMeasurePointA] = useState(null);
  const [measurePointB, setMeasurePointB] = useState(null);

  // Viewport Settings
  const [isWireframe, setIsWireframe] = useState(false);
  const [materialTheme, setMaterialTheme] = useState(MATERIAL_THEMES[0]);
  const [showGrid, setShowGrid] = useState(true);
  const [showBoundingBox, setShowBoundingBox] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false);
  const [isMeshListOpen, setIsMeshListOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showPostCutBanner, setShowPostCutBanner] = useState(false);
  const [activeControlsTab, setActiveControlsTab] = useState('slice');

  // Overhang Heat-map and Print Orientation state
  const [heatmapConfig, setHeatmapConfig] = useState({
    enabled: false,
    thresholdDeg: 45,
    warnRangeDeg: 10,
    mode: 0, // 0: Thermal, 1: Highlight, 2: Zebra
    presetId: 'up_y',
    printDirection: new THREE.Vector3(0, 1, 0),
    customPitch: 0,
    customYaw: 0,
    customRoll: 0,
    showBuildPlate: true
  });

  // STL Export Configuration (Mesh density / decimation ratio & Binary/ASCII format)
  const [exportConfig, setExportConfig] = useState({
    format: 'binary',
    density: 1.0,
    preset: 'original',
    decimalPrecision: 4
  });

  // Per-Mesh display & material customization configs
  // Map of meshId -> { visible: boolean, wireframe: boolean, opacity: number, materialTheme: object|null, customColor: string|null }
  const [meshConfigs, setMeshConfigs] = useState({
    mainModel: { visible: true, wireframe: false, opacity: 1.0, materialTheme: null, customColor: null },
    partA: { visible: true, wireframe: false, opacity: 1.0, materialTheme: null, customColor: null },
    partB: { visible: true, wireframe: false, opacity: 1.0, materialTheme: null, customColor: null },
    dowelPin: { visible: true, wireframe: false, opacity: 1.0, materialTheme: null, customColor: null }
  });

  // Undo / Redo / History State (Backed by Command Pattern Stack)
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const isRestoringRef = useRef(false);

  // Up-to-date state references for Commands
  const modelRotationRef = useRef(modelRotation);
  modelRotationRef.current = modelRotation;

  const clippingConfigRef = useRef(clippingConfig);
  clippingConfigRef.current = clippingConfig;

  const pinConfigRef = useRef(pinConfig);
  pinConfigRef.current = pinConfig;

  const splitResultRef = useRef(splitResult);
  splitResultRef.current = splitResult;

  const measurePointARef = useRef(measurePointA);
  measurePointARef.current = measurePointA;

  const measurePointBRef = useRef(measurePointB);
  measurePointBRef.current = measurePointB;

  const isMeasureActiveRef = useRef(isMeasureActive);
  isMeasureActiveRef.current = isMeasureActive;

  const activeModeRef = useRef(activeMode);
  activeModeRef.current = activeMode;

  const isDraggingRotationRef = useRef(false);
  const rotationBeforeDragRef = useRef(modelRotation);

  // Command Context provided to Command instances for executing/undoing/redoing state updates
  const commandContext = useMemo(() => ({
    setModelRotation: (rot) => setModelRotation(rot),
    setClippingConfig: (cfg) => setClippingConfig(cfg),
    setPinConfig: (pin) => setPinConfig(pin),
    setSplitResult: (res) => {
      setSplitResult(res);
      setShowPostCutBanner(!!res);
    },
    setShowPostCutBanner: (show) => setShowPostCutBanner(show),
    setMeasurePointA: (pt) => setMeasurePointA(pt),
    setMeasurePointB: (pt) => setMeasurePointB(pt),
    setIsMeasureActive: (act) => setIsMeasureActive(act),
    setDrawnPoints: (pts) => setDrawnPoints(pts),
    setIsLoopClosed: (closed) => setIsLoopClosed(closed),
    setLoopPoints: (pts) => setLoopPoints(pts),
    setActiveMode: (mode) => setActiveMode(mode)
  }), []);

  // Central CommandStack Invoker
  const commandStackRef = useRef(null);
  if (!commandStackRef.current) {
    commandStackRef.current = new CommandStack({
      maxHistory: 60,
      onStateChange: (state) => {
        setHistory(state.historyList);
        setHistoryIndex(state.currentIndex);
      }
    });
  }

  // Executes a Command instance via the CommandStack invoker
  const executeCommand = (command) => {
    if (isRestoringRef.current) return;
    commandStackRef.current.execute(command, commandContext);
  };

  // Batch Processing Queue State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchQueue, setBatchQueue] = useState([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [currentBatchProcessingId, setCurrentBatchProcessingId] = useState(null);
  const [isExportingBatchAll, setIsExportingBatchAll] = useState(false);
  const cancelBatchRef = useRef(false);

  const controlsRef = useRef(null);

  /**
   * Universal adapter routing actions into concrete Command objects
   */
  const pushHistory = (description, type, overrides = {}, subType = null, isContinuous = false) => {
    if (isRestoringRef.current) return;

    if (type === 'MODEL_ROTATE' || type === 'MODEL_ALIGN') {
      const targetRot = overrides.modelRotation !== undefined ? overrides.modelRotation : modelRotationRef.current;
      const cmd = new ModelTransformCommand({
        previousRotation: modelRotationRef.current,
        newRotation: targetRot,
        description,
        subType: subType || (type === 'MODEL_ALIGN' ? 'rotation_snap' : 'rotation_drag'),
        isContinuous
      });
      executeCommand(cmd);
      return;
    }

    if (type === 'CLIPPING_CONFIG') {
      const targetClip = overrides.clippingConfig !== undefined ? overrides.clippingConfig : clippingConfigRef.current;
      const cmd = new CutPlaneAdjustCommand({
        previousConfig: clippingConfigRef.current,
        newConfig: targetClip,
        description,
        subType: subType || 'clipping_general',
        isContinuous
      });
      executeCommand(cmd);
      return;
    }

    if (type === 'PIN_CONFIG' || type === 'PIN_PLACEMENT') {
      const targetPin = overrides.pinConfig !== undefined ? overrides.pinConfig : pinConfigRef.current;
      const cmd = new PinPlacementCommand({
        previousConfig: pinConfigRef.current,
        newConfig: targetPin,
        description,
        subType: subType || 'pin_general',
        isContinuous
      });
      executeCommand(cmd);
      return;
    }

    if (type === 'CUT_PLANE' || type === 'CUT_LASSO' || type === 'RESET_SPLIT') {
      const targetSplit = overrides.splitResult !== undefined ? overrides.splitResult : splitResultRef.current;
      const cmd = new SplitModelCommand({
        previousSplitResult: splitResultRef.current,
        newSplitResult: targetSplit,
        description,
        subType: type === 'RESET_SPLIT' ? 'split_reset' : type === 'CUT_LASSO' ? 'split_lasso' : 'split_plane'
      });
      executeCommand(cmd);
      return;
    }

    if (type.startsWith('MEASURE_')) {
      const prevA = measurePointARef.current;
      const prevB = measurePointBRef.current;
      const nextA = overrides.measurePointA !== undefined ? overrides.measurePointA : prevA;
      const nextB = overrides.measurePointB !== undefined ? overrides.measurePointB : prevB;
      const cmd = new MeasureCommand({
        previousMeasure: { pointA: prevA, pointB: prevB, isMeasureActive: isMeasureActiveRef.current },
        newMeasure: { pointA: nextA, pointB: nextB, isMeasureActive: isMeasureActiveRef.current },
        description,
        subType: type.toLowerCase()
      });
      executeCommand(cmd);
      return;
    }
  };

  const canUndo = commandStackRef.current ? commandStackRef.current.canUndo() : false;
  const canRedo = commandStackRef.current ? commandStackRef.current.canRedo() : false;

  const undoCmd = commandStackRef.current ? commandStackRef.current.getUndoCommand() : null;
  const redoCmd = commandStackRef.current ? commandStackRef.current.getRedoCommand() : null;
  const undoActionDesc = undoCmd ? undoCmd.description : null;
  const redoActionDesc = redoCmd ? redoCmd.description : null;
  const undoTooltip = canUndo ? `Geri Al (Ctrl+Z): ${undoActionDesc || ''}` : 'Geri Alınacak işlem yok';
  const redoTooltip = canRedo ? `Yinele (Ctrl+Y): ${redoActionDesc || ''}` : 'Yinelenecek işlem yok';

  const handleUndo = () => {
    if (!commandStackRef.current || !commandStackRef.current.canUndo()) return;
    isRestoringRef.current = true;
    const undoneCmd = commandStackRef.current.undo(commandContext);
    if (undoneCmd) {
      setStatusMessage(`Geri Alındı: ${undoneCmd.description}`);
    }
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 50);
  };

  const handleRedo = () => {
    if (!commandStackRef.current || !commandStackRef.current.canRedo()) return;
    isRestoringRef.current = true;
    const redoneCmd = commandStackRef.current.redo(commandContext);
    if (redoneCmd) {
      setStatusMessage(`Yinelendi: ${redoneCmd.description}`);
    }
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 50);
  };

  const handleJumpToHistory = (index) => {
    if (!commandStackRef.current) return;
    isRestoringRef.current = true;
    const targetCmd = commandStackRef.current.jumpTo(index, commandContext);
    if (targetCmd) {
      setStatusMessage(`Adıma Dönüldü (#${index + 1}): ${targetCmd.description}`);
    }
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 50);
  };

  const handleClearHistory = () => {
    if (!commandStackRef.current) return;
    const currentCmd = commandStackRef.current.commands[historyIndex];
    commandStackRef.current.clear(currentCmd);
    setStatusMessage('İşlem geçmişi temizlendi.');
  };

  // Load initial preset
  useEffect(() => {
    loadPresetModel('bunny', 'Stanford Bunny');
  }, []);

  // Update plane normal whenever axis, custom rotation, offset, or toggles change
  const handleClippingConfigChange = (changes, isContinuous = false) => {
    let nextNormal = new THREE.Vector3(0, 1, 0);
    const prevConfig = clippingConfigRef.current;
    const nextConfig = { ...prevConfig, ...changes };

    if (nextConfig.axis === 'x') {
      nextNormal.set(1, 0, 0);
    } else if (nextConfig.axis === 'y') {
      nextNormal.set(0, 1, 0);
    } else if (nextConfig.axis === 'z') {
      nextNormal.set(0, 0, 1);
    } else if (nextConfig.axis === 'custom') {
      if (changes.normal) {
        nextNormal.copy(changes.normal).normalize();
      } else {
        const radX = THREE.MathUtils.degToRad(nextConfig.rotX || 0);
        const radY = THREE.MathUtils.degToRad(nextConfig.rotY || 0);
        const radZ = THREE.MathUtils.degToRad(nextConfig.rotZ || 0);
        const euler = new THREE.Euler(radX, radY, radZ, 'XYZ');
        nextNormal.set(0, 1, 0).applyEuler(euler).normalize();
      }
    }
    nextConfig.normal = nextNormal;

    let desc = 'Kesit Düzlemi Güncellendi';
    let subType = 'clipping_general';

    if (changes.axis) {
      desc = changes.axis === 'custom' ? 'Kesit Düzlemi: Serbest Açı' : `Kesit Düzlemi: ${changes.axis.toUpperCase()} Ekseni`;
      subType = 'clipping_axis';
      isContinuous = false;
    } else if (changes.negate !== undefined) {
      desc = changes.negate ? 'Düzlem Yönü Ters Çevrildi' : 'Düzlem Normal Yönü';
      subType = 'clipping_negate';
      isContinuous = false;
    } else if (changes.offset !== undefined) {
      desc = `Düzlem Konumu: ${changes.offset > 0 ? '+' : ''}${changes.offset?.toFixed(1)} mm`;
      subType = 'clipping_offset';
    } else if (changes.rotX !== undefined || changes.rotY !== undefined || changes.rotZ !== undefined) {
      const rx = Math.round(nextConfig.rotX || 0);
      const ry = Math.round(nextConfig.rotY || 0);
      const rz = Math.round(nextConfig.rotZ || 0);
      desc = `Düzlem Açısı: X:${rx}° Y:${ry}° Z:${rz}°`;
      subType = 'clipping_rot';
    } else if (changes.enabled !== undefined) {
      desc = changes.enabled ? 'Canlı Kesit Düzlemi Açıldı' : 'Canlı Kesit Düzlemi Kapatıldı';
      subType = 'clipping_enabled';
      isContinuous = false;
    } else if (changes.showPlaneHelper !== undefined) {
      desc = changes.showPlaneHelper ? 'Düzlem Kılavuzu Açıldı' : 'Gizli Düzlem (İç Geometri İnceleme)';
      subType = 'clipping_helper';
      isContinuous = false;
    } else if (changes.highlightInterior !== undefined) {
      desc = changes.highlightInterior ? 'İç Yüzey Vurgusu: Açık' : 'İç Yüzey Vurgusu: Kapalı';
      subType = 'clipping_highlight';
      isContinuous = false;
    } else if (changes.addPinOnSlice !== undefined) {
      desc = changes.addPinOnSlice ? 'Kesimde Pim Ekleme: Açık' : 'Kesimde Pim Ekleme: Kapalı';
      subType = 'clipping_add_pin';
      isContinuous = false;
    }

    const cmd = new CutPlaneAdjustCommand({
      previousConfig: prevConfig,
      newConfig: nextConfig,
      description: desc,
      subType,
      isContinuous
    });
    executeCommand(cmd);
  };

  // Sync Three.js Clipping Planes on model material
  useEffect(() => {
    if (!model || !model.material) return;

    if (activeMode === 'plane' && clippingConfig.enabled && !splitResult) {
      const effNormal = clippingConfig.negate
        ? clippingConfig.normal.clone().negate()
        : clippingConfig.normal.clone();
      const effOffset = clippingConfig.negate
        ? -clippingConfig.offset
        : clippingConfig.offset;

      const threePlane = new THREE.Plane(effNormal, -effOffset);
      model.material.clippingPlanes = [threePlane];
      model.material.clipShadows = true;
      if (clippingConfig.highlightInterior !== false) {
        model.material.side = THREE.FrontSide;
      } else {
        model.material.side = THREE.DoubleSide;
      }
      model.material.needsUpdate = true;
    } else {
      model.material.clippingPlanes = [];
      model.material.side = THREE.DoubleSide;
      model.material.needsUpdate = true;
    }
  }, [model, activeMode, clippingConfig, splitResult]);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') setIsShiftPressed(true);

      // Undo / Redo Shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y, Cmd+Z, Cmd+Shift+Z, Cmd+Y)
      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleRedo();
      } else if ((e.key === 'h' || e.key === 'H') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsHistoryOpen((prev) => !prev);
      }

      // Toggle Hidden Plane Helper (P key - inspect internal geometry without visual obstruction)
      if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!e.target.matches('input, textarea, select')) {
          e.preventDefault();
          const isCurrentlyHidden = clippingConfig.showPlaneHelper === false;
          handleClippingConfigChange({ showPlaneHelper: isCurrentlyHidden }, false);
        }
      }

      // Toggle Cross-Section HUD Panel (C key)
      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!e.target.matches('input, textarea, select')) {
          e.preventDefault();
          setIsCrossSectionHUDOpen((prev) => !prev);
          if (!clippingConfig.enabled) {
            handleClippingConfigChange({ enabled: true }, false);
          }
        }
      }

      if (e.key === 'm' || e.key === 'M') {
        if (!e.target.matches('input, textarea')) {
          e.preventDefault();
          handleToggleMeasure();
        }
      }
      if (e.key === 'Escape') {
        if (isMeasureActive) {
          handleClearMeasurement();
        }
      }
      if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        if (activeMode === 'lasso') {
          setIsDrawing((prev) => !prev);
        } else {
          handleClippingConfigChange({ enabled: !clippingConfig.enabled }, false);
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [history, historyIndex, activeMode, isMeasureActive, clippingConfig, isCrossSectionHUDOpen]);

  /**
   * Measurement tool handlers (MeasureCommand)
   */
  const handleToggleMeasure = () => {
    const prevActive = isMeasureActiveRef.current;
    const next = !prevActive;
    const cmd = new MeasureCommand({
      previousMeasure: {
        pointA: measurePointARef.current,
        pointB: measurePointBRef.current,
        isMeasureActive: prevActive
      },
      newMeasure: {
        pointA: measurePointARef.current,
        pointB: measurePointBRef.current,
        isMeasureActive: next
      },
      description: next ? 'Ölçüm Modu Açıldı' : 'Ölçüm Modu Kapatıldı',
      subType: 'measure_toggle'
    });
    executeCommand(cmd);
    if (next) {
      setStatusMessage('Ölçüm Aracı Aktif: Model üzerinde 2 noktaya tıklayarak mm cinsinden mesafeyi ölçün.');
    } else {
      setStatusMessage('Ölçüm aracı kapatıldı.');
    }
  };

  const handleSetMeasurePointA = (point) => {
    const prevA = measurePointARef.current;
    const prevB = measurePointBRef.current;
    const cmd = new MeasureCommand({
      previousMeasure: {
        pointA: prevA,
        pointB: prevB,
        isMeasureActive: isMeasureActiveRef.current
      },
      newMeasure: {
        pointA: point,
        pointB: null,
        isMeasureActive: isMeasureActiveRef.current
      },
      description: `Ölçüm: Nokta A Belirlendi (${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)})`,
      subType: 'measure_point_a'
    });
    executeCommand(cmd);
    setStatusMessage('1. Nokta (A) işaretlendi. İkinci noktaya tıklayarak mesafeyi ölçün.');
  };

  const handleSetMeasurePointB = (point) => {
    const prevA = measurePointARef.current;
    const prevB = measurePointBRef.current;
    const d = prevA ? prevA.distanceTo(point) : 0;
    const desc = prevA
      ? `Ölçüm: ${d.toFixed(2)} mm (Nokta A → B)`
      : `Ölçüm: Nokta B Belirlendi (${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)})`;
    const cmd = new MeasureCommand({
      previousMeasure: {
        pointA: prevA,
        pointB: prevB,
        isMeasureActive: isMeasureActiveRef.current
      },
      newMeasure: {
        pointA: prevA,
        pointB: point,
        isMeasureActive: isMeasureActiveRef.current
      },
      description: desc,
      subType: 'measure_point_b'
    });
    executeCommand(cmd);
    if (prevA) {
      setStatusMessage(`Ölçüm Tamamlandı: ${d.toFixed(2)} mm`);
    }
  };

  const handleClearMeasurement = () => {
    const prevA = measurePointARef.current;
    const prevB = measurePointBRef.current;
    if (!prevA && !prevB) return;
    const cmd = new MeasureCommand({
      previousMeasure: {
        pointA: prevA,
        pointB: prevB,
        isMeasureActive: isMeasureActiveRef.current
      },
      newMeasure: {
        pointA: null,
        pointB: null,
        isMeasureActive: isMeasureActiveRef.current
      },
      description: 'Ölçüm Noktaları Temizlendi',
      subType: 'measure_clear'
    });
    executeCommand(cmd);
    setStatusMessage('Ölçüm noktaları temizlendi.');
  };

  /**
   * Applies the current material theme to a mesh with custom opacity and wireframe
   */
  const createMaterialForTheme = (theme, wireframe = false, opacity = 1.0, customColor = null) => {
    const isTransparent = opacity < 0.999;

    if (theme?.normalShader && !customColor) {
      return new THREE.MeshNormalMaterial({
        wireframe: wireframe,
        side: THREE.DoubleSide,
        transparent: isTransparent,
        opacity: opacity,
        depthWrite: !isTransparent
      });
    }

    const color = customColor || theme?.color || '#2dafa5';
    const roughness = theme?.roughness ?? 0.35;
    const metalness = theme?.metalness ?? 0.15;

    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: roughness,
      metalness: metalness,
      wireframe: wireframe,
      side: THREE.DoubleSide,
      transparent: isTransparent,
      opacity: opacity,
      depthWrite: !isTransparent
    });
  };

  /**
   * Synchronizes visual properties (visibility, wireframe, opacity, material) to Three.js meshes
   */
  const applyMeshPropertiesToScene = (
    configs,
    currentTheme = materialTheme,
    globalWireframe = isWireframe,
    currentHeatmap = heatmapConfig
  ) => {
    // 1. Single Main Model
    if (model) {
      const cfg = configs.mainModel || {};
      model.visible = cfg.visible !== false;
      const effectiveWireframe = cfg.wireframe !== undefined ? cfg.wireframe : globalWireframe;
      const effectiveOpacity = cfg.opacity !== undefined ? cfg.opacity : 1.0;
      const effectiveTheme = cfg.materialTheme || currentTheme;
      const effectiveColor = cfg.customColor || null;

      if (currentHeatmap?.enabled) {
        model.material = createSupportHeatmapMaterial({
          printDirection: currentHeatmap.printDirection,
          thresholdDeg: currentHeatmap.thresholdDeg,
          warnRangeDeg: currentHeatmap.warnRangeDeg,
          mode: currentHeatmap.mode,
          baseColor: effectiveColor || effectiveTheme?.color || '#2dafa5',
          opacity: effectiveOpacity,
          wireframe: effectiveWireframe
        });
      } else {
        model.material = createMaterialForTheme(effectiveTheme, effectiveWireframe, effectiveOpacity, effectiveColor);
      }
      model.material.clippingPlanes = clippingConfig.enabled && !splitResult ? [new THREE.Plane()] : [];
      model.material.needsUpdate = true;
    }

    // 2. Split Result: Part A & Part B
    if (splitResult) {
      if (splitResult.partA) {
        const cfgA = configs.partA || {};
        splitResult.partA.visible = cfgA.visible !== false;
        const effectiveWireframeA = cfgA.wireframe !== undefined ? cfgA.wireframe : globalWireframe;
        const effectiveOpacityA = cfgA.opacity !== undefined ? cfgA.opacity : 1.0;
        const themeA = cfgA.materialTheme || { name: 'Part A (Pin)', color: '#38bdf8', roughness: 0.3, metalness: 0.2 };
        const colorA = cfgA.customColor || null;

        if (currentHeatmap?.enabled) {
          splitResult.partA.material = createSupportHeatmapMaterial({
            printDirection: currentHeatmap.printDirection,
            thresholdDeg: currentHeatmap.thresholdDeg,
            warnRangeDeg: currentHeatmap.warnRangeDeg,
            mode: currentHeatmap.mode,
            baseColor: colorA || themeA.color || '#38bdf8',
            opacity: effectiveOpacityA,
            wireframe: effectiveWireframeA
          });
        } else {
          splitResult.partA.material = createMaterialForTheme(themeA, effectiveWireframeA, effectiveOpacityA, colorA);
        }
        splitResult.partA.material.needsUpdate = true;
      }

      if (splitResult.partB) {
        const cfgB = configs.partB || {};
        splitResult.partB.visible = cfgB.visible !== false;
        const effectiveWireframeB = cfgB.wireframe !== undefined ? cfgB.wireframe : globalWireframe;
        const effectiveOpacityB = cfgB.opacity !== undefined ? cfgB.opacity : 1.0;
        const themeB = cfgB.materialTheme || { name: 'Part B (Socket)', color: '#a855f7', roughness: 0.3, metalness: 0.2 };
        const colorB = cfgB.customColor || null;

        if (currentHeatmap?.enabled) {
          splitResult.partB.material = createSupportHeatmapMaterial({
            printDirection: currentHeatmap.printDirection,
            thresholdDeg: currentHeatmap.thresholdDeg,
            warnRangeDeg: currentHeatmap.warnRangeDeg,
            mode: currentHeatmap.mode,
            baseColor: colorB || themeB.color || '#a855f7',
            opacity: effectiveOpacityB,
            wireframe: effectiveWireframeB
          });
        } else {
          splitResult.partB.material = createMaterialForTheme(themeB, effectiveWireframeB, effectiveOpacityB, colorB);
        }
        splitResult.partB.material.needsUpdate = true;
      }
    }
  };

  // Re-apply mesh properties when configs change
  useEffect(() => {
    applyMeshPropertiesToScene(meshConfigs, materialTheme, isWireframe, heatmapConfig);
  }, [meshConfigs, materialTheme, isWireframe, heatmapConfig, model, splitResult]);

  // Overhang & Support Statistics Calculation
  const overhangStats = useMemo(() => {
    if (!heatmapConfig.enabled) return null;
    const targetGeom = splitResult?.partA?.geometry || model?.geometry;
    if (!targetGeom) return null;
    return calculateOverhangStatistics(
      targetGeom,
      heatmapConfig.printDirection,
      heatmapConfig.thresholdDeg,
      heatmapConfig.warnRangeDeg,
      modelRotation
    );
  }, [
    heatmapConfig.enabled,
    heatmapConfig.printDirection,
    heatmapConfig.thresholdDeg,
    heatmapConfig.warnRangeDeg,
    modelRotation,
    model,
    splitResult
  ]);

  const handleToggleHeatmap = () => {
    setHeatmapConfig((prev) => {
      const nextEnabled = !prev.enabled;
      setStatusMessage(
        nextEnabled
          ? 'Destek & Overhang Isı Haritası aktif edildi.'
          : 'Destek Isı Haritası kapatıldı.'
      );
      return { ...prev, enabled: nextEnabled };
    });
  };

  const handleChangeHeatmapConfig = (updates) => {
    setHeatmapConfig((prev) => ({
      ...prev,
      ...updates
    }));
  };

  const handleApplyModelRotationAsPrintDir = () => {
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(modelRotation.x || 0),
      THREE.MathUtils.degToRad(modelRotation.y || 0),
      THREE.MathUtils.degToRad(modelRotation.z || 0),
      'XYZ'
    );
    const vec = new THREE.Vector3(0, 1, 0).applyEuler(euler).normalize();
    setHeatmapConfig((prev) => ({
      ...prev,
      presetId: 'custom',
      printDirection: vec,
      customPitch: Math.round(modelRotation.x || 0),
      customYaw: Math.round(modelRotation.y || 0),
      customRoll: Math.round(modelRotation.z || 0)
    }));
    setStatusMessage('Baskı yönü modelin mevcut açılarına hizalandı.');
  };

  const handleUpdateMeshConfig = (meshId, updates) => {
    setMeshConfigs((prev) => {
      const next = {
        ...prev,
        [meshId]: {
          ...(prev[meshId] || { visible: true, wireframe: false, opacity: 1.0 }),
          ...updates
        }
      };
      applyMeshPropertiesToScene(next, materialTheme, isWireframe);
      return next;
    });
  };

  const handleResetMeshConfig = (meshId) => {
    setMeshConfigs((prev) => {
      const next = {
        ...prev,
        [meshId]: { visible: true, wireframe: false, opacity: 1.0, materialTheme: null, customColor: null }
      };
      applyMeshPropertiesToScene(next, materialTheme, isWireframe);
      return next;
    });
  };

  const handleResetAllMeshConfigs = () => {
    const next = {
      mainModel: { visible: true, wireframe: false, opacity: 1.0, materialTheme: null, customColor: null },
      partA: { visible: true, wireframe: false, opacity: 1.0, materialTheme: null, customColor: null },
      partB: { visible: true, wireframe: false, opacity: 1.0, materialTheme: null, customColor: null },
      dowelPin: { visible: true, wireframe: false, opacity: 1.0, materialTheme: null, customColor: null }
    };
    setMeshConfigs(next);
    applyMeshPropertiesToScene(next, materialTheme, isWireframe);
    setStatusMessage('Tüm nesne materyal ve görünürlük ayarları sıfırlandı.');
  };

  const handleSetAllVisibility = (visible) => {
    setMeshConfigs((prev) => {
      const next = {};
      Object.keys(prev).forEach((key) => {
        next[key] = { ...prev[key], visible };
      });
      applyMeshPropertiesToScene(next, materialTheme, isWireframe);
      return next;
    });
    setStatusMessage(visible ? 'Tüm 3D nesneler görünür yapıldı.' : 'Tüm 3D nesneler gizlendi.');
  };

  const handleSetAllWireframe = (wireframe) => {
    setIsWireframe(wireframe);
    setMeshConfigs((prev) => {
      const next = {};
      Object.keys(prev).forEach((key) => {
        next[key] = { ...prev[key], wireframe };
      });
      applyMeshPropertiesToScene(next, materialTheme, wireframe);
      return next;
    });
    setStatusMessage(wireframe ? 'Tüm nesneler için Tel Kafes (Wireframe) aktif.' : 'Katı yüzey görünümüne geçildi.');
  };

  const toggleWireframe = () => {
    const nextState = !isWireframe;
    setIsWireframe(nextState);
    handleSetAllWireframe(nextState);
  };

  const handleSelectMaterialTheme = (theme) => {
    setMaterialTheme(theme);
    applyMeshPropertiesToScene(meshConfigs, theme, isWireframe);
  };

  /**
   * Loads preset sample 3D model
   */
  const loadPresetModel = (presetId, name) => {
    setIsLoadingFile(true);
    setStatusMessage(`${name} yükleniyor...`);
    setSplitResult(null);
    setShowPostCutBanner(false);
    handleClearDrawing();
    handleClearMeasurement();

    try {
      const { mesh, info } = loadSamplePreset(presetId);
      mesh.material = createMaterialForTheme(materialTheme, isWireframe);

      setModel(mesh);
      setModelName(name);
      setModelInfo(info);
      setFaceCount(info.triangles);
      setClippingConfig((prev) => ({ ...prev, offset: 0 }));
      setModelRotation({ x: 0, y: 0, z: 0 });

      // Initialize fresh history for new model with InitialModelCommand
      const initCmd = new InitialModelCommand({
        modelName: name,
        initialState: {
          modelRotation: { x: 0, y: 0, z: 0 },
          splitResult: null,
          pinConfig,
          clippingConfig: { ...clippingConfig, offset: 0 },
          activeMode
        }
      });
      if (commandStackRef.current) {
        commandStackRef.current.clear(initCmd);
      } else {
        setHistory([initCmd.toSnapshot()]);
        setHistoryIndex(0);
      }

      setStatusMessage(`${name} hazır.`);
    } catch (err) {
      console.error(err);
      setStatusMessage('Model yükleme hatası.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  /**
   * Handles user uploaded custom STL file (supports multiple files for batch queue)
   */
  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (files.length > 1) {
      handleAddBatchFiles(files);
      setIsBatchModalOpen(true);
      return;
    }
    handleProcessSTLFile(files[0]);
  };

  // Batch Queue Handlers
  const handleAddBatchFiles = (files) => {
    if (!files || files.length === 0) return;
    const newItems = Array.from(files)
      .filter(f => f.name.toLowerCase().endsWith('.stl'))
      .map(file => ({
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
        name: file.name,
        size: file.size,
        file: file,
        isPreset: false,
        status: 'pending',
        progress: 0,
        statusText: 'Bekliyor',
        result: null,
        error: null
      }));
    if (newItems.length > 0) {
      setBatchQueue(prev => [...prev, ...newItems]);
      setStatusMessage(`${newItems.length} STL modeli toplu işleme kuyruğuna eklendi.`);
    }
  };

  const handleAddAllBatchPresets = () => {
    const newItems = SAMPLE_PRESETS.map(p => ({
      id: `preset_${p.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: `${p.name}.stl`,
      size: 150000,
      file: null,
      isPreset: true,
      presetId: p.id,
      status: 'pending',
      progress: 0,
      statusText: 'Bekliyor',
      result: null,
      error: null
    }));
    setBatchQueue(prev => [...prev, ...newItems]);
    setStatusMessage('Tüm 4 örnek model toplu işleme kuyruğuna eklendi.');
  };

  const handleClearBatchQueue = () => {
    if (isBatchProcessing) return;
    setBatchQueue([]);
    setStatusMessage('Toplu işleme kuyruğu temizlendi.');
  };

  const handleLoadBatchItemInViewport = (item) => {
    if (!item?.result) return;
    try {
      const res = item.result;
      const originalMesh = res.originalMesh;
      const originalInfo = res.originalInfo;

      if (originalMesh) {
        originalMesh.material = createMaterialForTheme(materialTheme, isWireframe);
        setModel(originalMesh);
      }
      setModelName(item.name);
      if (originalInfo) {
        setModelInfo(originalInfo);
        setFaceCount(originalInfo.triangles);
      }
      setSplitResult(res);
      setShowPostCutBanner(true);
      setIsBatchModalOpen(false);

      pushHistory(`${item.name} Kesim Sonucu Sahneye Yüklendi`, 'BATCH_ITEM_LOAD', {
        splitResult: res,
        modelRotation: { x: 0, y: 0, z: 0 }
      });

      setStatusMessage(`${item.name} 3D sahnede aktif edildi.`);
    } catch (err) {
      console.error(err);
      setStatusMessage('Model sahneye yüklenirken hata oluştu.');
    }
  };

  const handleStartBatchProcessing = async () => {
    if (batchQueue.length === 0 || isBatchProcessing) return;
    setIsBatchProcessing(true);
    cancelBatchRef.current = false;

    const effNormal = new THREE.Vector3(
      clippingConfig.axis === 'x' ? 1 : 0,
      clippingConfig.axis === 'y' ? 1 : 0,
      clippingConfig.axis === 'z' ? 1 : 0
    );
    if (clippingConfig.negate) {
      effNormal.negate();
    }
    const effOffset = clippingConfig.negate ? -clippingConfig.offset : clippingConfig.offset;

    let currentQueue = [...batchQueue];

    for (let i = 0; i < currentQueue.length; i++) {
      if (cancelBatchRef.current) {
        setStatusMessage('Toplu işleme durduruldu.');
        break;
      }
      const item = currentQueue[i];
      if (item.status === 'completed') continue;

      setCurrentBatchProcessingId(item.id);
      currentQueue[i] = {
        ...currentQueue[i],
        status: 'processing',
        progress: 25,
        statusText: 'STL ayrıştırılıyor...'
      };
      setBatchQueue([...currentQueue]);
      await new Promise(r => setTimeout(r, 40));

      try {
        let mesh, info;
        if (item.isPreset) {
          const loaded = loadSamplePreset(item.presetId);
          mesh = loaded.mesh;
          info = loaded.info;
        } else if (item.file) {
          const buffer = await item.file.arrayBuffer();
          const parsed = parseCustomSTL(buffer, item.name);
          mesh = parsed.mesh;
          info = parsed.info;
        } else {
          throw new Error('Dosya kaynağı geçersiz.');
        }

        currentQueue[i] = {
          ...currentQueue[i],
          progress: 60,
          statusText: 'Düzlem boyunca kesiliyor ve pim yuvaları açılıyor...'
        };
        setBatchQueue([...currentQueue]);
        await new Promise(r => setTimeout(r, 40));

        const result = sliceMeshWithPlane(
          mesh,
          effNormal,
          effOffset,
          pinConfig,
          clippingConfig.addPinOnSlice
        );

        currentQueue[i] = {
          ...currentQueue[i],
          status: 'completed',
          progress: 100,
          statusText: `Tamamlandı (${result.cutAreaCm2?.toFixed(1) || 0} cm²)`,
          result: {
            ...result,
            originalMesh: mesh,
            originalInfo: info
          },
          error: null
        };
        setBatchQueue([...currentQueue]);
      } catch (err) {
        console.error(`Batch processing error on ${item.name}:`, err);
        currentQueue[i] = {
          ...currentQueue[i],
          status: 'error',
          progress: 100,
          statusText: 'Hata',
          error: err.message || 'Kesim sırasında hata oluştu.'
        };
        setBatchQueue([...currentQueue]);
      }

      await new Promise(r => setTimeout(r, 50));
    }

    setCurrentBatchProcessingId(null);
    setIsBatchProcessing(false);
    if (!cancelBatchRef.current) {
      setStatusMessage('Toplu kesim işlemi tamamlandı.');
    }
  };

  const handleCancelBatchProcessing = () => {
    cancelBatchRef.current = true;
    setIsBatchProcessing(false);
    setCurrentBatchProcessingId(null);
  };

  const handleDownloadAllBatchZip = async () => {
    const completedItems = batchQueue.filter(item => item.status === 'completed' && item.result);
    if (completedItems.length === 0) {
      setStatusMessage('İndirilecek tamamlanmış model bulunmuyor.');
      return;
    }
    setIsExportingBatchAll(true);
    setStatusMessage('Toplu STL dosyaları ZIP olarak paketleniyor...');
    try {
      await downloadBatchProcessedZip(
        completedItems,
        { clippingConfig, pinConfig },
        exportConfig
      );
      setStatusMessage(`${completedItems.length} modelin tüm parçaları tek ZIP olarak indirildi!`);
    } catch (err) {
      console.error(err);
      setStatusMessage('Toplu ZIP indirme sırasında hata oluştu.');
    } finally {
      setIsExportingBatchAll(false);
    }
  };

  const handleProcessSTLFile = (file) => {
    setIsLoadingFile(true);
    setStatusMessage(`${file.name} ayrıştırılıyor...`);
    setSplitResult(null);
    setShowPostCutBanner(false);
    handleClearDrawing();
    handleClearMeasurement();

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target.result;
        const { mesh, info } = parseCustomSTL(buffer, file.name);
        mesh.material = createMaterialForTheme(materialTheme, isWireframe);

        setModel(mesh);
        setModelName(file.name.replace(/\.stl$/i, ''));
        setModelInfo(info);
        setFaceCount(info.triangles);
        setClippingConfig((prev) => ({ ...prev, offset: 0 }));
        setModelRotation({ x: 0, y: 0, z: 0 });

        const initCmd = new InitialModelCommand({
          modelName: file.name.replace(/\.stl$/i, ''),
          initialState: {
            modelRotation: { x: 0, y: 0, z: 0 },
            splitResult: null,
            pinConfig,
            clippingConfig: { ...clippingConfig, offset: 0 },
            activeMode
          }
        });
        if (commandStackRef.current) {
          commandStackRef.current.clear(initCmd);
        } else {
          setHistory([initCmd.toSnapshot()]);
          setHistoryIndex(0);
        }

        setStatusMessage(`${file.name} başarıyla yüklendi.`);
      } catch (err) {
        console.error(err);
        setStatusMessage('STL ayrıştırma hatası: Geçersiz dosya formatı.');
      } finally {
        setIsLoadingFile(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  /**
   * Executes Mesh Slicing using Clipping Plane
   */
  const handleExecutePlaneSlice = () => {
    if (!model) return;

    setStatusMessage('Düzlem boyunca kesim yapılıyor ve su sızdırmaz yüzeyler örülüyor...');

    setTimeout(() => {
      try {
        const effNormal = clippingConfig.negate
          ? clippingConfig.normal.clone().negate()
          : clippingConfig.normal.clone();
        const effOffset = clippingConfig.negate
          ? -clippingConfig.offset
          : clippingConfig.offset;

        const result = sliceMeshWithPlane(
          model,
          effNormal,
          effOffset,
          pinConfig,
          clippingConfig.addPinOnSlice
        );

        const prevSplit = splitResultRef.current;
        const cmd = new SplitModelCommand({
          previousSplitResult: prevSplit,
          newSplitResult: result,
          description: `Düzlem Kesimi (${result.cutAreaCm2 || 0} cm²)`,
          subType: 'split_plane'
        });
        executeCommand(cmd);
        setStatusMessage(
          `Model başarıyla 2 parçaya ayrıldı! (Kesit: ${result.cutAreaCm2} cm²)`
        );
      } catch (err) {
        console.error(err);
        setStatusMessage('Kesim sırasında hata oluştu.');
      }
    }, 50);
  };

  /**
   * Executes Mesh Slicing using Lasso Path
   */
  const handleExecuteLassoSplit = () => {
    if (!model || drawnPoints.length < 3) return;

    setStatusMessage('Kement çizgisi boyunca kesim ve pin oluşturuluyor...');

    setTimeout(() => {
      try {
        const result = sliceMeshWithLasso(model, drawnPoints, pinConfig);
        const prevSplit = splitResultRef.current;
        const cmd = new SplitModelCommand({
          previousSplitResult: prevSplit,
          newSplitResult: result,
          description: 'Serbest Kement Kesimi',
          subType: 'split_lasso'
        });
        executeCommand(cmd);
        setIsDrawing(false);
        setStatusMessage('Model serbest kement eğrisi boyunca başarıyla kesildi!');
      } catch (err) {
        console.error(err);
        setStatusMessage('Kesim başarısız oldu.');
      }
    }, 50);
  };

  const handleResetSplit = () => {
    const prevSplit = splitResultRef.current;
    if (!prevSplit) return;
    const cmd = new SplitModelCommand({
      previousSplitResult: prevSplit,
      newSplitResult: null,
      description: 'Model Yeniden Birleştirildi',
      subType: 'split_reset'
    });
    executeCommand(cmd);
    setStatusMessage('Model orijinal haline getirildi.');
  };

  /**
   * Lasso Freehand Drawing Point management
   */
  const handleAddPoint = (point) => {
    setDrawnPoints((prev) => [...prev, point]);
  };

  const handleAddStrokePoints = (points) => {
    setDrawnPoints((prev) => [...prev, ...points]);
  };

  const handleClearDrawing = () => {
    setDrawnPoints([]);
    setIsLoopClosed(false);
    setLoopPoints([]);
    setStatusMessage('Çizim temizlendi.');
    pushHistory('Kement Çizimi Temizlendi', 'LASSO_CLEAR', {
      drawnPoints: [],
      isLoopClosed: false,
      loopPoints: []
    });
  };

  const handleUndoPoint = () => {
    setDrawnPoints((prev) => {
      const next = prev.slice(0, -5);
      if (next.length < 3) setIsLoopClosed(false);
      return next;
    });
  };

  const handleCloseLoop = () => {
    if (drawnPoints.length < 3) return;
    const nextLoop = [...drawnPoints, drawnPoints[0]];
    setIsLoopClosed(true);
    setLoopPoints(nextLoop);
    setIsDrawing(false);
    setStatusMessage('Kement halkası kapatıldı. Kilit pimi yerleşimi hazır.');
    pushHistory('Kement Halkası Kapatıldı', 'LASSO_CLOSE', {
      isLoopClosed: true,
      loopPoints: nextLoop
    });
  };

  const handlePinConfigChange = (changes, isContinuous = false) => {
    const prevPin = pinConfigRef.current;
    const nextPin = { ...prevPin, ...changes };

    let desc = 'Pim/Delik Ayarı Güncellendi';
    let subType = 'pin_general';

    if (changes.mode) {
      const modeLabel =
        changes.mode === 'holes_both'
          ? 'Çift Delik (Dübel)'
          : changes.mode === 'pin_and_hole'
          ? 'Pim + Delik'
          : changes.mode === 'hole_only'
          ? 'Yalnızca Delik'
          : changes.mode === 'pin_only'
          ? 'Yalnızca Pim'
          : 'Düz Kesim';
      desc = `Bağlantı Modu: ${modeLabel}`;
      subType = 'pin_mode';
      isContinuous = false;
    } else if (changes.diameter !== undefined || changes.size !== undefined) {
      const d = changes.diameter ?? changes.size;
      desc = `Pim Çapı: Ø${d} mm`;
      subType = 'pin_diameter';
    } else if (changes.depth !== undefined || changes.height !== undefined) {
      const dp = changes.depth ?? changes.height;
      desc = `Pim Derinliği: ${dp} mm`;
      subType = 'pin_depth';
    } else if (changes.clearance !== undefined) {
      desc = `Fit Toleransı: +${changes.clearance.toFixed(2)} mm`;
      subType = 'pin_clearance';
      isContinuous = false;
    } else if (changes.type) {
      const typeLabel =
        changes.type === 'hex'
          ? 'Altıgen'
          : changes.type === 'square'
          ? 'Kare'
          : changes.type === 'countersink'
          ? 'Havşalı'
          : changes.type === 'pyramid'
          ? 'Piramit'
          : 'Silindirik';
      desc = `Pim Geometrisi: ${typeLabel}`;
      subType = 'pin_type';
      isContinuous = false;
    } else if (changes.snapToNormal !== undefined && changes.snapToCenter !== undefined && changes.snapToNormal && changes.snapToCenter) {
      desc = 'Pim Merkeze ve Yüzey Normaline Kitlendi (90° Flush)';
      subType = 'pin_snap_all';
      isContinuous = false;
    } else if (changes.snapToNormal !== undefined) {
      desc = changes.snapToNormal ? 'Yüzey Normaline Kitle: Açık (90° Dik)' : 'Yüzey Normaline Kitle: Serbest';
      subType = 'pin_snap_normal';
      isContinuous = false;
    } else if (changes.snapToCenter !== undefined) {
      desc = changes.snapToCenter ? 'Kesit Merkezine Kitle: Açık' : 'Kesit Merkezine Kitle: Serbest';
      subType = 'pin_snap_center';
      isContinuous = false;
    } else if (changes.offsetU !== undefined && changes.offsetV !== undefined) {
      desc = `Pim Konumu: U:${changes.offsetU > 0 ? '+' : ''}${changes.offsetU.toFixed(1)} V:${changes.offsetV > 0 ? '+' : ''}${changes.offsetV.toFixed(1)} mm`;
      subType = 'pin_offset_both';
    } else if (changes.offsetU !== undefined) {
      desc = `Pim U-Konumu: ${changes.offsetU > 0 ? '+' : ''}${changes.offsetU.toFixed(1)} mm`;
      subType = 'pin_offset_u';
    } else if (changes.offsetV !== undefined) {
      desc = `Pim V-Konumu: ${changes.offsetV > 0 ? '+' : ''}${changes.offsetV.toFixed(1)} mm`;
      subType = 'pin_offset_v';
    } else if (changes.flushFit !== undefined) {
      desc = changes.flushFit ? 'Flush Fit: Açık' : 'Flush Fit: Kapalı';
      subType = 'pin_flush';
      isContinuous = false;
    }

    const cmd = new PinPlacementCommand({
      previousConfig: prevPin,
      newConfig: nextPin,
      description: desc,
      subType,
      isContinuous
    });
    executeCommand(cmd);
  };

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      setStatusMessage('Kamera sıfırlandı.');
    }
  };

  /**
   * 3D Model Rotation & Alignment Handlers (ModelTransformCommand)
   */
  const handleModelRotationChange = (newRotation, pushToHist = false) => {
    const norm = {
      x: ((newRotation.x % 360) + 540) % 360 - 180,
      y: ((newRotation.y % 360) + 540) % 360 - 180,
      z: ((newRotation.z % 360) + 540) % 360 - 180
    };

    if (!isDraggingRotationRef.current) {
      isDraggingRotationRef.current = true;
      rotationBeforeDragRef.current = modelRotationRef.current;
    }

    if (pushToHist) {
      isDraggingRotationRef.current = false;
      const cmd = new ModelTransformCommand({
        previousRotation: rotationBeforeDragRef.current,
        newRotation: norm,
        description: `Model Döndürüldü (X:${Math.round(norm.x)}° Y:${Math.round(norm.y)}° Z:${Math.round(norm.z)}°)`,
        subType: 'rotation_drag',
        isContinuous: false
      });
      executeCommand(cmd);
      rotationBeforeDragRef.current = norm;
    } else {
      setModelRotation(norm);
    }
  };

  const handleStepRotate = (axis, delta) => {
    const prev = modelRotationRef.current;
    const next = {
      ...prev,
      [axis]: (((prev[axis] + delta) % 360) + 540) % 360 - 180
    };
    const desc = `${axis.toUpperCase()} Ekseninde ${delta > 0 ? '+' : ''}${delta}° Döndürüldü`;
    const cmd = new ModelTransformCommand({
      previousRotation: prev,
      newRotation: next,
      description: desc,
      subType: 'rotation_step',
      isContinuous: false
    });
    executeCommand(cmd);
    setStatusMessage(`${axis.toUpperCase()} ekseninde ${delta > 0 ? '+' : ''}${delta}° döndürüldü.`);
  };

  const handleResetRotation = () => {
    const prev = modelRotationRef.current;
    const resetRot = { x: 0, y: 0, z: 0 };
    const cmd = new ModelTransformCommand({
      previousRotation: prev,
      newRotation: resetRot,
      description: 'Model Yönelimi Sıfırlandı (0°, 0°, 0°)',
      subType: 'rotation_reset',
      isContinuous: false
    });
    executeCommand(cmd);
    setStatusMessage('Model dönüşü sıfırlandı (0°, 0°, 0°).');
  };

  const handleAlignFlat = () => {
    const prev = modelRotationRef.current;
    const snapped = {
      x: Math.round((prev.x || 0) / 90) * 90,
      y: Math.round((prev.y || 0) / 90) * 90,
      z: Math.round((prev.z || 0) / 90) * 90
    };
    const cmd = new ModelTransformCommand({
      previousRotation: prev,
      newRotation: snapped,
      description: 'Model Tablaya Oturtuldu (90° Snap)',
      subType: 'rotation_snap',
      isContinuous: false
    });
    executeCommand(cmd);
    setStatusMessage('Model en yakın 90° dik açıyla tablaya hizalandı.');
  };

  const handleRotationDragEnd = () => {
    isDraggingRotationRef.current = false;
    const prev = rotationBeforeDragRef.current || { x: 0, y: 0, z: 0 };
    const current = modelRotationRef.current;
    if (prev.x === current.x && prev.y === current.y && prev.z === current.z) return;

    const cmd = new ModelTransformCommand({
      previousRotation: prev,
      newRotation: current,
      description: `Model Döndürüldü (Gizmo: X:${Math.round(current.x)}° Y:${Math.round(current.y)}° Z:${Math.round(current.z)}°)`,
      subType: 'rotation_gizmo',
      isContinuous: false
    });
    executeCommand(cmd);
    rotationBeforeDragRef.current = current;
  };

  const handleToggleRotateGizmo = () => {
    setIsRotateGizmoActive((prev) => {
      const next = !prev;
      setStatusMessage(
        next
          ? '3D Döndürme Gizmosu açıldı. Eksen halkalarını sürükleyerek modeli çevirebilirsiniz.'
          : '3D Döndürme Gizmosu kapatıldı.'
      );
      return next;
    });
  };

  /**
   * Direct STL Downloads
   */
  const handleExportPartA = () => {
    if (splitResult) {
      downloadMeshSTL(splitResult.partA.geometry, `${modelName}_Part_1_Pin.stl`, exportConfig.format, exportConfig);
      setStatusMessage(`Part 1 STL (${modelName}_Part_1_Pin.stl) [${exportConfig.format.toUpperCase()} • %${Math.round(exportConfig.density * 100)}] indirildi.`);
    }
  };

  const handleExportPartB = () => {
    if (splitResult) {
      downloadMeshSTL(splitResult.partB.geometry, `${modelName}_Part_2_Socket.stl`, exportConfig.format, exportConfig);
      setStatusMessage(`Part 2 STL (${modelName}_Part_2_Socket.stl) [${exportConfig.format.toUpperCase()} • %${Math.round(exportConfig.density * 100)}] indirildi.`);
    }
  };

  const handleExportCombined = () => {
    if (splitResult) {
      downloadCombinedSTL(splitResult.partA, splitResult.partB, modelName, exportConfig.format, exportConfig);
      setStatusMessage(`Birleştirilmiş Kesilmiş STL (${modelName}_Sliced_Combined.stl) [${exportConfig.format.toUpperCase()}] indirildi.`);
    }
  };

  const handleExportZip = async () => {
    if (splitResult) {
      await downloadAllPartsZip(splitResult.partA, splitResult.partB, modelName, {
        ...exportConfig,
        dowelPinGeometry: splitResult.dowelPinGeometry,
        dowelSpecs: splitResult.dowelSpecs
      });
      setStatusMessage(`Tüm parçalar ZIP paketi olarak indirildi [${exportConfig.format.toUpperCase()} • %${Math.round(exportConfig.density * 100)}].`);
    }
  };

  const handleExportDowelPin = () => {
    if (splitResult?.dowelPinGeometry) {
      const specs = splitResult.dowelSpecs || { diameter: 8, length: 20 };
      downloadMeshSTL(
        splitResult.dowelPinGeometry,
        `${modelName}_Alignment_Dowel_Pin_D${specs.diameter}xL${specs.length}.stl`,
        exportConfig.format,
        exportConfig
      );
      setStatusMessage(`Hizalama Dübel Pimi STL indirildi (Ø${specs.diameter}mm x ${specs.length}mm) [${exportConfig.format.toUpperCase()}].`);
    }
  };

  const handleExportFullModel = () => {
    if (model) {
      downloadMeshSTL(model.geometry, `${modelName}.stl`, exportConfig.format, exportConfig);
      setStatusMessage(`${modelName}.stl dosyası indirildi [${exportConfig.format.toUpperCase()} • %${Math.round(exportConfig.density * 100)}].`);
    }
  };

  const statsA = splitResult ? calculateGeometryStats(splitResult.partA?.geometry, exportConfig.density) : null;
  const statsB = splitResult ? calculateGeometryStats(splitResult.partB?.geometry, exportConfig.density) : null;

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-gray-950 text-white font-sans overflow-hidden select-none">
      {/* Left Control Panel */}
      <ControlsPanel
        modelName={modelName}
        modelInfo={modelInfo}
        faceCount={faceCount}
        activeMode={activeMode}
        onSelectMode={(mode) => {
          setActiveMode(mode);
          if (mode === 'lasso') setIsDrawing(true);
        }}
        clippingConfig={clippingConfig}
        onClippingConfigChange={handleClippingConfigChange}
        onExecutePlaneSlice={handleExecutePlaneSlice}
        isDrawing={isDrawing}
        onToggleDrawing={() => setIsDrawing((prev) => !prev)}
        drawnPointsCount={drawnPoints.length}
        onCloseLoop={handleCloseLoop}
        onClearDrawing={handleClearDrawing}
        onUndoPoint={handleUndoPoint}
        isLoopClosed={isLoopClosed}
        pinConfig={pinConfig}
        onPinConfigChange={handlePinConfigChange}
        splitResult={splitResult}
        onExecuteLassoSplit={handleExecuteLassoSplit}
        onResetSplit={handleResetSplit}
        explodedDistance={explodedDistance}
        onExplodedDistanceChange={(val) => {
          setExplodedDistance(val);
          pushHistory(`Patlatılmış Görünüm: ${val} mm`, 'EXPLODED_DISTANCE', { explodedDistance: val });
        }}
        onExportPartA={handleExportPartA}
        onExportPartB={handleExportPartB}
        onExportCombined={handleExportCombined}
        onExportZip={handleExportZip}
        onExportFullModel={handleExportFullModel}
        onExportDowelPin={handleExportDowelPin}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        exportConfig={exportConfig}
        onChangeExportConfig={setExportConfig}
        onFileUpload={handleFileUpload}
        onSelectPreset={loadPresetModel}
        isWireframe={isWireframe}
        onToggleWireframe={toggleWireframe}
        onResetCamera={resetCamera}
        materialTheme={materialTheme}
        onSelectMaterialTheme={handleSelectMaterialTheme}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((prev) => !prev)}
        showBoundingBox={showBoundingBox}
        onToggleBoundingBox={() => setShowBoundingBox((prev) => !prev)}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate((prev) => !prev)}
        onOpenInspector={() => setIsInspectorOpen(true)}
        model={model}
        onOpenVolumeTool={() => setIsVolumeModalOpen(true)}
        onToggleCrossSectionHUD={() => setIsCrossSectionHUDOpen((prev) => !prev)}
        isCrossSectionHUDOpen={isCrossSectionHUDOpen}
        isMeasureActive={isMeasureActive}
        onToggleMeasure={handleToggleMeasure}
        measurePointA={measurePointA}
        measurePointB={measurePointB}
        onClearMeasurement={handleClearMeasurement}
        // Model Rotation & Alignment props
        modelRotation={modelRotation}
        onModelRotationChange={handleModelRotationChange}
        onStepRotate={handleStepRotate}
        onResetRotation={handleResetRotation}
        onAlignFlat={handleAlignFlat}
        isRotateGizmoActive={isRotateGizmoActive}
        onToggleRotateGizmo={handleToggleRotateGizmo}
        snapAngle={snapAngle}
        onSetSnapAngle={setSnapAngle}
        // History props
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        undoTooltip={undoTooltip}
        redoTooltip={redoTooltip}
        historyCount={history.length}
        currentHistoryIndex={historyIndex}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenMeshList={() => setIsMeshListOpen((prev) => !prev)}
        meshCount={splitResult ? (splitResult.dowelPinGeometry ? 3 : 2) : (model ? 1 : 0)}
        // Overhang Heat-map props
        heatmapConfig={heatmapConfig}
        onChangeHeatmapConfig={handleChangeHeatmapConfig}
        onApplyModelRotationAsPrintDir={handleApplyModelRotationAsPrintDir}
        overhangStats={overhangStats}
        currentTab={activeControlsTab}
        onSelectTab={setActiveControlsTab}
        // Batch Processing props
        batchQueue={batchQueue}
        onOpenBatchModal={() => setIsBatchModalOpen(true)}
        onUpdateQueue={setBatchQueue}
        isBatchProcessing={isBatchProcessing}
        currentBatchProcessingId={currentBatchProcessingId}
        onStartBatchProcessing={handleStartBatchProcessing}
        onCancelBatchProcessing={handleCancelBatchProcessing}
        onDownloadAllBatchZip={handleDownloadAllBatchZip}
        isExportingBatchAll={isExportingBatchAll}
        onLoadBatchItemInViewport={handleLoadBatchItemInViewport}
        onAddBatchFiles={handleAddBatchFiles}
        onAddAllBatchPresets={handleAddAllBatchPresets}
        onClearBatchQueue={handleClearBatchQueue}
      />

      {/* Right 3D Viewport Scene */}
      <div className="flex-1 relative h-full bg-gradient-to-br from-gray-950 via-slate-900 to-black">
        {/* Top Floating Bar: Status Badge & Quick Undo/Redo/History */}
        <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none flex items-center justify-between gap-2">
          {/* Status Badge */}
          <div className="bg-gray-900/90 backdrop-blur-md border border-gray-700/80 px-3.5 py-1.5 rounded-full text-xs text-gray-200 shadow-2xl flex items-center gap-2.5 pointer-events-auto">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isLoadingFile
                  ? 'bg-amber-400 animate-spin'
                  : isRotateGizmoActive
                  ? 'bg-amber-400 animate-pulse'
                  : isMeasureActive
                  ? 'bg-cyan-400 animate-pulse'
                  : splitResult
                  ? 'bg-cyan-400 animate-pulse'
                  : activeMode === 'plane' && clippingConfig.enabled
                  ? 'bg-blue-400 animate-pulse'
                  : isLoopClosed
                  ? 'bg-emerald-400'
                  : 'bg-emerald-500'
              }`}
            />
            <span className="font-medium truncate max-w-[280px] sm:max-w-md">{statusMessage}</span>
          </div>

          {/* Top Right Quick Undo/Redo & Export Controls */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Viewport Floating Undo / Redo */}
            <div className="hidden sm:flex items-center bg-gray-900/90 backdrop-blur-md border border-gray-700/80 rounded-full p-1 shadow-2xl">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className={`p-1.5 rounded-full transition ${
                  canUndo
                    ? 'text-blue-300 hover:bg-blue-500/20 active:scale-95'
                    : 'text-gray-600 cursor-not-allowed opacity-50'
                }`}
                title={undoTooltip}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className={`p-1.5 rounded-full transition ${
                  canRedo
                    ? 'text-emerald-300 hover:bg-emerald-500/20 active:scale-95'
                    : 'text-gray-600 cursor-not-allowed opacity-50'
                }`}
                title={redoTooltip}
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-3 bg-gray-700 mx-0.5" />

              <button
                onClick={() => setIsHistoryOpen(true)}
                className="p-1.5 rounded-full text-indigo-300 hover:bg-indigo-500/20 transition flex items-center gap-1 text-[11px] px-2 font-mono"
                title="İşlem Geçmişi Çizelgesi"
              >
                <History className="w-3.5 h-3.5" />
                <span>{historyIndex + 1}/{history.length}</span>
              </button>
            </div>

            {/* Quick Batch Queue Button */}
            <button
              onClick={() => setIsBatchModalOpen(true)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 border transition ${
                batchQueue.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/40 hover:scale-105'
                  : 'bg-gray-900/90 hover:bg-gray-800 text-emerald-300 border-gray-700/80'
              }`}
              title="Toplu İşleme Kuyruğu (Batch Queue)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Toplu Kuyruk</span>
              {batchQueue.length > 0 && (
                <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                  {batchQueue.length}
                </span>
              )}
            </button>

            {/* Quick Export Button when Split Result is active */}
            {splitResult && (
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 border border-emerald-400/40 transition hover:scale-105"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Modifiye STL İndir</span>
                <span className="sm:hidden">İndir</span>
              </button>
            )}
          </div>
        </div>

        {/* Post-Cut Floating Download Banner */}
        {splitResult && showPostCutBanner && (
          <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-6 bg-gray-900/95 border border-emerald-500/50 text-white p-4 rounded-2xl backdrop-blur-xl shadow-2xl z-20 flex flex-col md:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                  <span>Kesim Tamamlandı! Modifiye Edilmiş STL Mesh Hazır</span>
                  {statsA && statsB && (
                    <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono">
                      {(statsA.triangles + statsB.triangles).toLocaleString()} Üçgen
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">
                  Parçaları ayrı ayrı STL olarak veya 3D baskı paketi (ZIP) olarak tek tıkla indirebilirsiniz. (Geri almak için Ctrl+Z yapabilirsiniz)
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
              <button
                onClick={handleExportPartA}
                className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow"
                title="Part 1 STL İndir"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Part 1 STL</span>
              </button>

              <button
                onClick={handleExportPartB}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow"
                title="Part 2 STL İndir"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Part 2 STL</span>
              </button>

              {splitResult.dowelPinGeometry && (
                <button
                  onClick={handleExportDowelPin}
                  className="py-1.5 px-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
                  title="Ayrı Dübel Pimi STL İndir"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Dübel Pimi STL</span>
                </button>
              )}

              <button
                onClick={handleExportZip}
                className="py-1.5 px-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
                title="Tüm Parçaları ZIP İndir"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>Tümü (ZIP)</span>
              </button>

              <button
                onClick={() => setIsExportModalOpen(true)}
                className="py-1.5 px-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition"
                title="Gelişmiş Dışa Aktarma Seçenekleri"
              >
                Seçenekler...
              </button>

              <button
                onClick={() => setShowPostCutBanner(false)}
                className="p-1.5 text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-800 rounded-lg transition"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Live Hint Bars */}
        {activeMode === 'plane' && clippingConfig.enabled && !splitResult && !isMeasureActive && (
          <div className="absolute bottom-4 left-4 right-4 md:right-auto bg-gray-900/90 border border-blue-500/40 text-blue-300 px-4 py-2.5 rounded-2xl text-xs backdrop-blur-lg shadow-2xl flex items-center gap-3 z-10">
            <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
              <Sliders className="w-4 h-4 shrink-0" />
            </div>
            <div>
              <span className="font-semibold text-white">Canlı Kesit:</span> Kesim eksenini veya offset kaydırıcısını ayarlayarak modeli inceleyin. <kbd className="bg-gray-800 border border-gray-700 px-1 py-0.5 rounded text-white font-mono text-[10px]">P</kbd> ile düzlemi gizleyip iç geometriyi görün, <kbd className="bg-gray-800 border border-gray-700 px-1 py-0.5 rounded text-white font-mono text-[10px]">C</kbd> ile Kesit Panelini açın.
            </div>
          </div>
        )}

        {activeMode === 'lasso' && isDrawing && !isLoopClosed && !isMeasureActive && (
          <div className="absolute bottom-4 left-4 right-4 md:right-auto bg-gray-900/90 border border-amber-500/40 text-amber-300 px-4 py-2.5 rounded-2xl text-xs backdrop-blur-lg shadow-2xl flex items-center gap-3 z-10">
            <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400">
              <Sparkles className="w-4 h-4 shrink-0" />
            </div>
            <div>
              <span className="font-semibold text-white">Çizim İpucu:</span> Model üzerinde sürükleyerek kesim kementi çizin. Modeli döndürmek için <kbd className="bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded text-white font-mono text-[10px]">Shift</kbd> tuşunu basılı tutun.
            </div>
          </div>
        )}

        {/* 3D Viewport Component */}
        <Viewport3D
          model={model}
          modelInfo={modelInfo}
          splitResult={splitResult}
          explodedDistance={explodedDistance}
          activeMode={activeMode}
          clippingConfig={clippingConfig}
          onClippingConfigChange={handleClippingConfigChange}
          isDrawing={isDrawing}
          drawnPoints={drawnPoints}
          onAddPoint={handleAddPoint}
          onAddStrokePoints={handleAddStrokePoints}
          onCloseLoop={handleCloseLoop}
          isLoopClosed={isLoopClosed}
          loopPoints={loopPoints}
          pinConfig={pinConfig}
          onPinConfigChange={handlePinConfigChange}
          isShiftPressed={isShiftPressed}
          controlsRef={controlsRef}
          materialTheme={materialTheme}
          showGrid={showGrid}
          showBoundingBox={showBoundingBox}
          onToggleBoundingBox={() => setShowBoundingBox((prev) => !prev)}
          autoRotate={autoRotate}
          onFileDrop={handleProcessSTLFile}
          isMeasureActive={isMeasureActive}
          measurePointA={measurePointA}
          measurePointB={measurePointB}
          onSetMeasurePointA={handleSetMeasurePointA}
          onSetMeasurePointB={handleSetMeasurePointB}
          onClearMeasurement={handleClearMeasurement}
          onToggleMeasure={handleToggleMeasure}
          // Model Rotation & Alignment props
          modelRotation={modelRotation}
          onModelRotationChange={handleModelRotationChange}
          onRotationEnd={handleRotationDragEnd}
          isRotateGizmoActive={isRotateGizmoActive}
          onToggleRotateGizmo={handleToggleRotateGizmo}
          snapAngle={snapAngle}
          onSetSnapAngle={setSnapAngle}
          onStepRotate={handleStepRotate}
          onResetRotation={handleResetRotation}
          onAlignFlat={handleAlignFlat}
          // Mesh List Side Panel props
          isMeshListOpen={isMeshListOpen}
          onToggleMeshList={() => setIsMeshListOpen((prev) => !prev)}
          meshCount={splitResult ? (splitResult.dowelPinGeometry ? 3 : 2) : (model ? 1 : 0)}
          // Overhang Heat-map props
          isHeatmapActive={heatmapConfig.enabled}
          onToggleHeatmap={handleToggleHeatmap}
          heatmapConfig={heatmapConfig}
          onChangeHeatmapConfig={handleChangeHeatmapConfig}
          overhangStats={overhangStats}
          onOpenOverhangTab={() => setActiveControlsTab('overhang')}
          // Batch processing props
          onMultipleFilesDrop={(files) => {
            handleAddBatchFiles(files);
            setIsBatchModalOpen(true);
          }}
          onOpenBatchModal={() => setIsBatchModalOpen(true)}
          batchQueueCount={batchQueue.length}
          onOpenVolumeTool={() => setIsVolumeModalOpen(true)}
          isCrossSectionHUDOpen={isCrossSectionHUDOpen}
          onToggleCrossSectionHUD={() => setIsCrossSectionHUDOpen((prev) => !prev)}
        />

        {/* 3D Meshes & Outliner Side Panel */}
        <MeshListPanel
          isOpen={isMeshListOpen}
          onClose={() => setIsMeshListOpen(false)}
          model={model}
          modelName={modelName}
          modelInfo={modelInfo}
          splitResult={splitResult}
          meshConfigs={meshConfigs}
          onUpdateMeshConfig={handleUpdateMeshConfig}
          onResetMeshConfig={handleResetMeshConfig}
          onResetAllMeshConfigs={handleResetAllMeshConfigs}
          onSetAllVisibility={handleSetAllVisibility}
          onSetAllWireframe={handleSetAllWireframe}
        />
      </div>

      {/* Model Inspector Modal */}
      <ModelInspector
        info={modelInfo}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        onOpenVolumeTool={() => setIsVolumeModalOpen(true)}
        showBoundingBox={showBoundingBox}
        onToggleBoundingBox={() => setShowBoundingBox((prev) => !prev)}
      />

      {/* STL Volume & 3D Print Material Calculator Modal */}
      <VolumeMaterialModal
        isOpen={isVolumeModalOpen}
        onClose={() => setIsVolumeModalOpen(false)}
        model={model}
        modelInfo={modelInfo}
        splitResult={splitResult}
        showBoundingBox={showBoundingBox}
        onToggleBoundingBox={() => setShowBoundingBox((prev) => !prev)}
      />

      {/* Sliced STL Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        modelName={modelName}
        splitResult={splitResult}
        originalModel={model}
        exportConfig={exportConfig}
        onChangeExportConfig={setExportConfig}
        onNotify={(msg) => setStatusMessage(msg)}
      />

      {/* Batch Processing Queue Modal */}
      <BatchProcessingModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        queue={batchQueue}
        onUpdateQueue={setBatchQueue}
        activeClippingConfig={clippingConfig}
        activePinConfig={pinConfig}
        onLoadItemInViewport={handleLoadBatchItemInViewport}
        onNotify={(msg) => setStatusMessage(msg)}
      />

      {/* History Timeline Panel (Undo/Redo & Time Travel) */}
      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        currentIndex={historyIndex}
        onJumpToHistory={handleJumpToHistory}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearHistory={handleClearHistory}
        canUndo={canUndo}
        canRedo={canRedo}
      />
    </div>
  );
}

export default App;

