import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Viewport3D } from './components/Viewport3D';
import { ControlsPanel } from './components/ControlsPanel';
import { ModelInspector } from './components/ModelInspector';
import { ExportModal } from './components/ExportModal';
import { HistoryPanel } from './components/HistoryPanel';
import { MeshListPanel } from './components/MeshListPanel';
import { loadSamplePreset, parseCustomSTL, MATERIAL_THEMES } from './utils/stlLoaderHelper';
import { sliceMeshWithPlane, sliceMeshWithLasso } from './utils/meshSlicer';
import { createWorkspaceSnapshot, restoreWorkspaceSnapshot } from './utils/historyManager';
import {
  downloadMeshSTL,
  downloadCombinedSTL,
  downloadAllPartsZip,
  calculateGeometryStats
} from './utils/stlExporter';
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
  History
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
    normal: new THREE.Vector3(0, 1, 0)
  });

  // Lasso Painting / Freehand points
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState([]);
  const [isLoopClosed, setIsLoopClosed] = useState(false);
  const [loopPoints, setLoopPoints] = useState([]);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // Alignment Pin & Hole Configuration
  const [pinConfig, setPinConfig] = useState({
    mode: 'pin_and_hole', // 'pin_and_hole' | 'holes_both' | 'hole_only' | 'pin_only' | 'flat'
    diameter: 8.0,
    size: 8.0,
    depth: 10.0,
    height: 10.0,
    clearance: 0.2, // mm 3D print fit tolerance
    type: 'cylinder', // 'cylinder' | 'pyramid' | 'hex'
    taper: 0.85
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
  const [isMeshListOpen, setIsMeshListOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showPostCutBanner, setShowPostCutBanner] = useState(false);

  // Per-Mesh display & material customization configs
  // Map of meshId -> { visible: boolean, wireframe: boolean, opacity: number, materialTheme: object|null, customColor: string|null }
  const [meshConfigs, setMeshConfigs] = useState({
    mainModel: { visible: true, wireframe: false, opacity: 1.0, materialTheme: null, customColor: null },
    partA: { visible: true, wireframe: false, opacity: 1.0, materialTheme: null, customColor: null },
    partB: { visible: true, wireframe: false, opacity: 1.0, materialTheme: null, customColor: null },
    dowelPin: { visible: true, wireframe: false, opacity: 1.0, materialTheme: null, customColor: null }
  });

  // Undo / Redo / History State
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const isRestoringRef = useRef(false);
  const lastActionTimeRef = useRef(0);

  const controlsRef = useRef(null);

  /**
   * Pushes a new snapshot onto the Undo/Redo history stack
   */
  const pushHistory = (description, type, overrides = {}) => {
    if (isRestoringRef.current) return;

    const snapshot = createWorkspaceSnapshot({
      description,
      type,
      modelRotation: overrides.modelRotation !== undefined ? overrides.modelRotation : modelRotation,
      splitResult: overrides.splitResult !== undefined ? overrides.splitResult : splitResult,
      pinConfig: overrides.pinConfig !== undefined ? overrides.pinConfig : pinConfig,
      clippingConfig: overrides.clippingConfig !== undefined ? overrides.clippingConfig : clippingConfig,
      drawnPoints: overrides.drawnPoints !== undefined ? overrides.drawnPoints : drawnPoints,
      isLoopClosed: overrides.isLoopClosed !== undefined ? overrides.isLoopClosed : isLoopClosed,
      loopPoints: overrides.loopPoints !== undefined ? overrides.loopPoints : loopPoints,
      measurePointA: overrides.measurePointA !== undefined ? overrides.measurePointA : measurePointA,
      measurePointB: overrides.measurePointB !== undefined ? overrides.measurePointB : measurePointB,
      isMeasureActive: overrides.isMeasureActive !== undefined ? overrides.isMeasureActive : isMeasureActive,
      activeMode: overrides.activeMode !== undefined ? overrides.activeMode : activeMode,
      explodedDistance: overrides.explodedDistance !== undefined ? overrides.explodedDistance : explodedDistance
    });

    setHistory((prev) => {
      const currentIdx = historyIndex;
      const truncated = prev.slice(0, currentIdx + 1);

      // Debounce continuous slider changes (e.g. diameter, rotation, offset)
      const last = truncated[truncated.length - 1];
      const now = Date.now();
      if (
        last &&
        last.type === type &&
        (type === 'PIN_CONFIG' || type === 'CLIPPING_CONFIG' || type === 'EXPLODED_DISTANCE' || type === 'MODEL_ROTATE') &&
        now - lastActionTimeRef.current < 900
      ) {
        lastActionTimeRef.current = now;
        truncated[truncated.length - 1] = snapshot;
        return truncated;
      }

      lastActionTimeRef.current = now;
      const next = [...truncated, snapshot];
      if (next.length > 50) next.shift();
      return next;
    });

    setHistoryIndex((prev) => {
      const nextIdx = Math.min(prev + 1, 49);
      return nextIdx;
    });
  };

  /**
   * Restores a full workspace snapshot
   */
  const applySnapshot = (snapshot, toastMsg) => {
    if (!snapshot) return;
    isRestoringRef.current = true;
    const restored = restoreWorkspaceSnapshot(snapshot);
    if (!restored) {
      isRestoringRef.current = false;
      return;
    }

    if (restored.modelRotation) {
      setModelRotation(restored.modelRotation);
    }
    setSplitResult(restored.splitResult);
    setPinConfig(restored.pinConfig);
    setClippingConfig(restored.clippingConfig);
    setDrawnPoints(restored.drawnPoints);
    setIsLoopClosed(restored.isLoopClosed);
    setLoopPoints(restored.loopPoints);
    setMeasurePointA(restored.measurePointA);
    setMeasurePointB(restored.measurePointB);
    setIsMeasureActive(restored.isMeasureActive);
    setActiveMode(restored.activeMode);
    setExplodedDistance(restored.explodedDistance);

    if (restored.splitResult) {
      setShowPostCutBanner(true);
    } else {
      setShowPostCutBanner(false);
    }

    if (toastMsg) {
      setStatusMessage(toastMsg);
    }

    setTimeout(() => {
      isRestoringRef.current = false;
    }, 50);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIdx = historyIndex - 1;
      const targetSnapshot = history[targetIdx];
      setHistoryIndex(targetIdx);
      applySnapshot(targetSnapshot, `Geri Alındı: ${targetSnapshot.description}`);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIdx = historyIndex + 1;
      const targetSnapshot = history[targetIdx];
      setHistoryIndex(targetIdx);
      applySnapshot(targetSnapshot, `Yinelendi: ${targetSnapshot.description}`);
    }
  };

  const handleJumpToHistory = (index) => {
    if (index >= 0 && index < history.length) {
      const targetSnapshot = history[index];
      setHistoryIndex(index);
      applySnapshot(targetSnapshot, `Adıma Dönüldü (#${index + 1}): ${targetSnapshot.description}`);
    }
  };

  const handleClearHistory = () => {
    if (history.length > 0 && history[historyIndex]) {
      setHistory([history[historyIndex]]);
      setHistoryIndex(0);
      setStatusMessage('İşlem geçmişi temizlendi.');
    }
  };

  // Load initial preset
  useEffect(() => {
    loadPresetModel('bunny', 'Stanford Bunny');
  }, []);

  // Update plane normal whenever axis or custom rotation changes
  const handleClippingConfigChange = (changes) => {
    setClippingConfig((prev) => {
      const next = { ...prev, ...changes };

      let nextNormal = new THREE.Vector3(0, 1, 0);

      if (next.axis === 'x') {
        nextNormal.set(1, 0, 0);
      } else if (next.axis === 'y') {
        nextNormal.set(0, 1, 0);
      } else if (next.axis === 'z') {
        nextNormal.set(0, 0, 1);
      } else if (next.axis === 'custom') {
        const radX = THREE.MathUtils.degToRad(next.rotX || 0);
        const radY = THREE.MathUtils.degToRad(next.rotY || 0);
        const radZ = THREE.MathUtils.degToRad(next.rotZ || 0);
        const euler = new THREE.Euler(radX, radY, radZ, 'XYZ');
        nextNormal.set(0, 1, 0).applyEuler(euler).normalize();
      }

      next.normal = nextNormal;
      return next;
    });

    if (changes.axis || changes.negate !== undefined || changes.offset !== undefined) {
      const desc = changes.axis
        ? `Kesit Düzlemi: ${changes.axis.toUpperCase()} Ekseni`
        : changes.negate !== undefined
        ? 'Düzlem Yönü Ters Çevrildi'
        : `Düzlem Konumu: ${changes.offset?.toFixed(1)} mm`;
      pushHistory(desc, 'CLIPPING_CONFIG', {
        clippingConfig: { ...clippingConfig, ...changes }
      });
    }
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
      model.material.needsUpdate = true;
    } else {
      model.material.clippingPlanes = [];
      model.material.needsUpdate = true;
    }
  }, [model, activeMode, clippingConfig, splitResult]);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') setIsShiftPressed(true);

      // Undo / Redo Shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y, Cmd+Z, Cmd+Shift+Z, Cmd+Y)
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'h' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsHistoryOpen((prev) => !prev);
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
          setClippingConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
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
  }, [history, historyIndex, activeMode, isMeasureActive]);

  /**
   * Measurement tool handlers
   */
  const handleToggleMeasure = () => {
    setIsMeasureActive((prev) => {
      const next = !prev;
      if (next) {
        setStatusMessage('Ölçüm Aracı Aktif: Model üzerinde 2 noktaya tıklayarak mm cinsinden mesafeyi ölçün.');
      } else {
        setStatusMessage('Ölçüm aracı kapatıldı.');
      }
      pushHistory(
        next ? 'Ölçüm Modu Açıldı' : 'Ölçüm Modu Kapatıldı',
        'MEASURE_TOGGLE',
        { isMeasureActive: next }
      );
      return next;
    });
  };

  const handleSetMeasurePointA = (point) => {
    setMeasurePointA(point);
    setStatusMessage('1. Nokta (A) işaretlendi. İkinci noktaya tıklayarak mesafeyi ölçün.');
    pushHistory(
      `Ölçüm: Nokta A Belirlendi (${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)})`,
      'MEASURE_POINT_A',
      { measurePointA: point, measurePointB: null }
    );
  };

  const handleSetMeasurePointB = (point) => {
    setMeasurePointB(point);
    if (measurePointA && point) {
      const d = measurePointA.distanceTo(point);
      setStatusMessage(`Ölçüm Tamamlandı: ${d.toFixed(2)} mm`);
      pushHistory(
        `Ölçüm: ${d.toFixed(2)} mm (Nokta A → B)`,
        'MEASURE_POINT_B',
        { measurePointB: point }
      );
    }
  };

  const handleClearMeasurement = () => {
    setMeasurePointA(null);
    setMeasurePointB(null);
    setStatusMessage('Ölçüm noktaları temizlendi.');
    pushHistory('Ölçüm Noktaları Temizlendi', 'MEASURE_CLEAR', {
      measurePointA: null,
      measurePointB: null
    });
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
  const applyMeshPropertiesToScene = (configs, currentTheme = materialTheme, globalWireframe = isWireframe) => {
    // 1. Single Main Model
    if (model) {
      const cfg = configs.mainModel || {};
      model.visible = cfg.visible !== false;
      const effectiveWireframe = cfg.wireframe !== undefined ? cfg.wireframe : globalWireframe;
      const effectiveOpacity = cfg.opacity !== undefined ? cfg.opacity : 1.0;
      const effectiveTheme = cfg.materialTheme || currentTheme;
      const effectiveColor = cfg.customColor || null;

      model.material = createMaterialForTheme(effectiveTheme, effectiveWireframe, effectiveOpacity, effectiveColor);
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

        splitResult.partA.material = createMaterialForTheme(themeA, effectiveWireframeA, effectiveOpacityA, colorA);
        splitResult.partA.material.needsUpdate = true;
      }

      if (splitResult.partB) {
        const cfgB = configs.partB || {};
        splitResult.partB.visible = cfgB.visible !== false;
        const effectiveWireframeB = cfgB.wireframe !== undefined ? cfgB.wireframe : globalWireframe;
        const effectiveOpacityB = cfgB.opacity !== undefined ? cfgB.opacity : 1.0;
        const themeB = cfgB.materialTheme || { name: 'Part B (Socket)', color: '#a855f7', roughness: 0.3, metalness: 0.2 };
        const colorB = cfgB.customColor || null;

        splitResult.partB.material = createMaterialForTheme(themeB, effectiveWireframeB, effectiveOpacityB, colorB);
        splitResult.partB.material.needsUpdate = true;
      }
    }
  };

  // Re-apply mesh properties when configs change
  useEffect(() => {
    applyMeshPropertiesToScene(meshConfigs, materialTheme, isWireframe);
  }, [meshConfigs, model, splitResult]);

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

      // Initialize fresh history for new model
      const initSnapshot = createWorkspaceSnapshot({
        description: `${name} Yüklendi`,
        type: 'MODEL_LOAD',
        modelRotation: { x: 0, y: 0, z: 0 },
        splitResult: null,
        pinConfig,
        clippingConfig: { ...clippingConfig, offset: 0 },
        activeMode
      });
      setHistory([initSnapshot]);
      setHistoryIndex(0);

      setStatusMessage(`${name} hazır.`);
    } catch (err) {
      console.error(err);
      setStatusMessage('Model yükleme hatası.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  /**
   * Handles user uploaded custom STL file
   */
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleProcessSTLFile(file);
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

        const initSnapshot = createWorkspaceSnapshot({
          description: `${file.name} STL Yüklendi`,
          type: 'MODEL_LOAD',
          modelRotation: { x: 0, y: 0, z: 0 },
          splitResult: null,
          pinConfig,
          clippingConfig: { ...clippingConfig, offset: 0 },
          activeMode
        });
        setHistory([initSnapshot]);
        setHistoryIndex(0);

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

        setSplitResult(result);
        setShowPostCutBanner(true);
        setStatusMessage(
          `Model başarıyla 2 parçaya ayrıldı! (Kesit: ${result.cutAreaCm2} cm²)`
        );

        // Push Cut Operation onto History
        pushHistory(
          `Düzlem Kesimi (${result.cutAreaCm2 || 0} cm²)`,
          'CUT_PLANE',
          { splitResult: result }
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
        setSplitResult(result);
        setIsDrawing(false);
        setShowPostCutBanner(true);
        setStatusMessage('Model serbest kement eğrisi boyunca başarıyla kesildi!');

        // Push Lasso Split Operation onto History
        pushHistory('Serbest Kement Kesimi', 'CUT_LASSO', {
          splitResult: result,
          isDrawing: false
        });
      } catch (err) {
        console.error(err);
        setStatusMessage('Kesim başarısız oldu.');
      }
    }, 50);
  };

  const handleResetSplit = () => {
    setSplitResult(null);
    setShowPostCutBanner(false);
    setStatusMessage('Model orijinal haline getirildi.');
    pushHistory('Model Yeniden Birleştirildi', 'RESET_SPLIT', { splitResult: null });
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

  const handlePinConfigChange = (changes) => {
    const nextPin = { ...pinConfig, ...changes };
    setPinConfig(nextPin);

    let desc = 'Pim/Delik Ayarı Güncellendi';
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
    } else if (changes.diameter !== undefined) {
      desc = `Pim Çapı: Ø${changes.diameter} mm`;
    } else if (changes.depth !== undefined) {
      desc = `Pim Derinliği: ${changes.depth} mm`;
    } else if (changes.clearance !== undefined) {
      desc = `Fit Boşluğu: ${changes.clearance} mm`;
    } else if (changes.type) {
      desc = `Pim Geometrisi: ${changes.type}`;
    }

    pushHistory(desc, 'PIN_CONFIG', { pinConfig: nextPin });
  };

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      setStatusMessage('Kamera sıfırlandı.');
    }
  };

  /**
   * 3D Model Rotation & Alignment Handlers
   */
  const handleModelRotationChange = (newRotation, pushToHist = false) => {
    const norm = {
      x: ((newRotation.x % 360) + 540) % 360 - 180,
      y: ((newRotation.y % 360) + 540) % 360 - 180,
      z: ((newRotation.z % 360) + 540) % 360 - 180
    };
    setModelRotation(norm);

    if (pushToHist) {
      const desc = `Model Döndürüldü (X:${Math.round(norm.x)}° Y:${Math.round(norm.y)}° Z:${Math.round(norm.z)}°)`;
      pushHistory(desc, 'MODEL_ROTATE', { modelRotation: norm });
    }
  };

  const handleStepRotate = (axis, delta) => {
    setModelRotation((prev) => {
      const next = {
        ...prev,
        [axis]: (((prev[axis] + delta) % 360) + 540) % 360 - 180
      };
      const desc = `${axis.toUpperCase()} Ekseninde ${delta > 0 ? '+' : ''}${delta}° Döndürüldü`;
      pushHistory(desc, 'MODEL_ROTATE', { modelRotation: next });
      return next;
    });
    setStatusMessage(`${axis.toUpperCase()} ekseninde ${delta > 0 ? '+' : ''}${delta}° döndürüldü.`);
  };

  const handleResetRotation = () => {
    const resetRot = { x: 0, y: 0, z: 0 };
    setModelRotation(resetRot);
    pushHistory('Model Yönelimi Sıfırlandı (0°, 0°, 0°)', 'MODEL_ALIGN', { modelRotation: resetRot });
    setStatusMessage('Model dönüşü sıfırlandı (0°, 0°, 0°).');
  };

  const handleAlignFlat = () => {
    setModelRotation((prev) => {
      const snapped = {
        x: Math.round((prev.x || 0) / 90) * 90,
        y: Math.round((prev.y || 0) / 90) * 90,
        z: Math.round((prev.z || 0) / 90) * 90
      };
      pushHistory('Model Tablaya Oturtuldu (90° Snap)', 'MODEL_ALIGN', { modelRotation: snapped });
      return snapped;
    });
    setStatusMessage('Model en yakın 90° dik açıyla tablaya hizalandı.');
  };

  const handleRotationDragEnd = () => {
    const desc = `Model Döndürüldü (Gizmo: X:${Math.round(modelRotation.x)}° Y:${Math.round(modelRotation.y)}° Z:${Math.round(modelRotation.z)}°)`;
    pushHistory(desc, 'MODEL_ROTATE', { modelRotation });
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
      downloadMeshSTL(splitResult.partA.geometry, `${modelName}_Part_1_Pin.stl`, 'binary');
      setStatusMessage(`Part 1 STL (${modelName}_Part_1_Pin.stl) indirildi.`);
    }
  };

  const handleExportPartB = () => {
    if (splitResult) {
      downloadMeshSTL(splitResult.partB.geometry, `${modelName}_Part_2_Socket.stl`, 'binary');
      setStatusMessage(`Part 2 STL (${modelName}_Part_2_Socket.stl) indirildi.`);
    }
  };

  const handleExportCombined = () => {
    if (splitResult) {
      downloadCombinedSTL(splitResult.partA, splitResult.partB, modelName, 'binary');
      setStatusMessage(`Birleştirilmiş Kesilmiş STL (${modelName}_Sliced_Combined.stl) indirildi.`);
    }
  };

  const handleExportZip = async () => {
    if (splitResult) {
      await downloadAllPartsZip(splitResult.partA, splitResult.partB, modelName, {
        dowelPinGeometry: splitResult.dowelPinGeometry,
        dowelSpecs: splitResult.dowelSpecs
      });
      setStatusMessage('Tüm parçalar ZIP paketi olarak indirildi (3D baskıya hazır).');
    }
  };

  const handleExportDowelPin = () => {
    if (splitResult?.dowelPinGeometry) {
      const specs = splitResult.dowelSpecs || { diameter: 8, length: 20 };
      downloadMeshSTL(
        splitResult.dowelPinGeometry,
        `${modelName}_Alignment_Dowel_Pin_D${specs.diameter}xL${specs.length}.stl`,
        'binary'
      );
      setStatusMessage(`Hizalama Dübel Pimi STL indirildi (Ø${specs.diameter}mm x ${specs.length}mm).`);
    }
  };

  const handleExportFullModel = () => {
    if (model) {
      downloadMeshSTL(model.geometry, `${modelName}.stl`, 'binary');
      setStatusMessage(`${modelName}.stl dosyası indirildi.`);
    }
  };

  const statsA = splitResult ? calculateGeometryStats(splitResult.partA?.geometry) : null;
  const statsB = splitResult ? calculateGeometryStats(splitResult.partB?.geometry) : null;

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
        historyCount={history.length}
        currentHistoryIndex={historyIndex}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenMeshList={() => setIsMeshListOpen((prev) => !prev)}
        meshCount={splitResult ? (splitResult.dowelPinGeometry ? 3 : 2) : (model ? 1 : 0)}
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
                title="Geri Al (Ctrl+Z)"
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
                title="Yinele (Ctrl+Y)"
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
              <span className="font-semibold text-white">Canlı Kesit:</span> Kesim eksenini veya offset kaydırıcısını ayarlayarak modeli anında inceleyin; hazır olduğunuzda <strong className="text-white">"Düzlemden Kes"</strong> butonuna basın. (Geri almak için <kbd className="bg-gray-800 border border-gray-700 px-1 py-0.5 rounded text-white font-mono text-[10px]">Ctrl+Z</kbd>)
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
      />

      {/* Sliced STL Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        modelName={modelName}
        splitResult={splitResult}
        originalModel={model}
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

