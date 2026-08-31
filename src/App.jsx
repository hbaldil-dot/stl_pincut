import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import { 
  Scissors, Download, Upload, Sliders, Eye, Brush, CheckCircle, 
  Undo2, RotateCcw, Box, Sparkles, Layers, Check, AlertCircle, ChevronDown
} from 'lucide-react';

// Procedural Sample Models
function generateSampleGeometry(type) {
  let geometry;
  if (type === 'bracket') {
    // Mechanical Bracket
    const shape = new THREE.Shape();
    shape.moveTo(-25, -25);
    shape.lineTo(25, -25);
    shape.lineTo(25, -10);
    shape.lineTo(-10, -10);
    shape.lineTo(-10, 25);
    shape.lineTo(-25, 25);
    shape.closePath();
    const extrudeSettings = { depth: 30, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 1.5, bevelThickness: 1.5 };
    geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  } else if (type === 'cylinder') {
    // Stepped Cylinder Joint
    const lathePoints = [];
    lathePoints.push(new THREE.Vector2(0, -30));
    lathePoints.push(new THREE.Vector2(14, -30));
    lathePoints.push(new THREE.Vector2(14, -8));
    lathePoints.push(new THREE.Vector2(22, -8));
    lathePoints.push(new THREE.Vector2(22, 8));
    lathePoints.push(new THREE.Vector2(14, 8));
    lathePoints.push(new THREE.Vector2(14, 30));
    lathePoints.push(new THREE.Vector2(0, 30));
    geometry = new THREE.LatheGeometry(lathePoints, 24);
  } else if (type === 'prism') {
    // Hexagonal Prism
    geometry = new THREE.CylinderGeometry(20, 20, 45, 6);
  } else {
    // Default: Low-poly Figurine / Sculpture
    const lathePoints = [
      new THREE.Vector2(0, -35),
      new THREE.Vector2(20, -35),
      new THREE.Vector2(24, -28),
      new THREE.Vector2(18, -20),
      new THREE.Vector2(14, -10),
      new THREE.Vector2(19, 2),
      new THREE.Vector2(11, 14),
      new THREE.Vector2(15, 22),
      new THREE.Vector2(16, 30),
      new THREE.Vector2(11, 35),
      new THREE.Vector2(0, 38)
    ];
    geometry = new THREE.LatheGeometry(lathePoints, 16);
  }

  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

// STL Binary Exporter Function
function exportBinarySTL(geometry, name = 'model') {
  const posAttr = geometry.attributes.position;
  const normalAttr = geometry.attributes.normal;
  const numFaces = posAttr.count / 3;

  const bufferSize = 84 + numFaces * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const dataView = new DataView(buffer);

  // 80-byte header
  const header = `STL PinCut 3D - Exported ${name}`;
  for (let i = 0; i < 80; i++) {
    dataView.setUint8(i, i < header.length ? header.charCodeAt(i) : 0x20);
  }

  // 4-byte face count (little endian)
  dataView.setUint32(80, numFaces, true);

  let offset = 84;
  for (let i = 0; i < numFaces; i++) {
    const i3 = i * 3;
    // Normal
    const nx = normalAttr ? normalAttr.getX(i3) : 0;
    const ny = normalAttr ? normalAttr.getY(i3) : 0;
    const nz = normalAttr ? normalAttr.getZ(i3) : 1;
    dataView.setFloat32(offset, nx, true);
    dataView.setFloat32(offset + 4, ny, true);
    dataView.setFloat32(offset + 8, nz, true);
    offset += 12;

    // 3 Vertices
    for (let v = 0; v < 3; v++) {
      const vx = posAttr.getX(i3 + v);
      const vy = posAttr.getY(i3 + v);
      const vz = posAttr.getZ(i3 + v);
      dataView.setFloat32(offset, vx, true);
      dataView.setFloat32(offset + 4, vy, true);
      dataView.setFloat32(offset + 8, vz, true);
      offset += 12;
    }

    // 2-byte attribute byte count
    dataView.setUint16(offset, 0, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${name.replace(/\s+/g, '_')}.stl`;
  link.click();
}

function SceneManager({ 
  model, 
  splitMeshes,
  explodedDistance,
  isPainting, 
  paintedFaces, 
  setPaintedFaces, 
  cutPoints, 
  isShiftPressed, 
  brushSize, 
  setHistory 
}) {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const { camera } = useThree();

  const handlePointerDown = (e) => {
    if (isShiftPressed || !isPainting) return;
    e.stopPropagation();
    setIsMouseDown(true);
    if (e.faceIndex !== undefined && e.point) {
      paintArea(e.point);
    }
  };

  const handlePointerMove = (e) => {
    if (!isPainting || !isMouseDown || isShiftPressed) return;
    if (e.faceIndex !== undefined && e.point) {
      paintArea(e.point);
    }
  };

  const handlePointerUp = () => {
    setIsMouseDown(false);
  };

  const paintArea = (hitPoint) => {
    if (!model) return;
    const geometry = model.geometry;
    const posAttr = geometry.attributes.position;
    const normalAttr = geometry.attributes.normal;
    const newlyPainted = [];

    const faceCount = posAttr.count / 3;
    const cameraDir = new THREE.Vector3();
    camera.getWorldPosition(cameraDir);

    for (let i = 0; i < faceCount; i++) {
      const i3 = i * 3;
      const vA = new THREE.Vector3(posAttr.getX(i3), posAttr.getY(i3), posAttr.getZ(i3)).applyMatrix4(model.matrixWorld);
      const vB = new THREE.Vector3(posAttr.getX(i3 + 1), posAttr.getY(i3 + 1), posAttr.getZ(i3 + 1)).applyMatrix4(model.matrixWorld);
      const vC = new THREE.Vector3(posAttr.getX(i3 + 2), posAttr.getY(i3 + 2), posAttr.getZ(i3 + 2)).applyMatrix4(model.matrixWorld);

      const center = new THREE.Vector3().addVectors(vA, vB).add(vC).divideScalar(3);

      if (center.distanceTo(hitPoint) <= brushSize) {
        if (normalAttr) {
          const nA = new THREE.Vector3(normalAttr.getX(i3), normalAttr.getY(i3), normalAttr.getZ(i3));
          const nB = new THREE.Vector3(normalAttr.getX(i3+1), normalAttr.getY(i3+1), normalAttr.getZ(i3+1));
          const nC = new THREE.Vector3(normalAttr.getX(i3+2), normalAttr.getY(i3+2), normalAttr.getZ(i3+2));
          const faceNormal = new THREE.Vector3().add(nA).add(nB).add(nC).normalize();
          faceNormal.transformDirection(model.matrixWorld);

          const toCameraDir = new THREE.Vector3().subVectors(cameraDir, center).normalize();
          if (faceNormal.dot(toCameraDir) > -0.1) {
            if (!paintedFaces.has(i)) newlyPainted.push(i);
          }
        } else {
          if (!paintedFaces.has(i)) newlyPainted.push(i);
        }
      }
    }

    if (newlyPainted.length > 0) {
      setHistory((prev) => [...prev, new Set(paintedFaces)]);

      setPaintedFaces((prev) => {
        const newSet = new Set(prev);
        let colorAttr = geometry.attributes.color;

        if (!colorAttr) {
          const colors = new Float32Array(posAttr.count * 3);
          colors.fill(0.3);
          geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          colorAttr = geometry.attributes.color;
        }

        newlyPainted.forEach((faceIndex) => {
          newSet.add(faceIndex);
          const i3 = faceIndex * 3;
          colorAttr.setXYZ(i3, 1, 0.2, 0.2);
          colorAttr.setXYZ(i3 + 1, 1, 0.2, 0.2);
          colorAttr.setXYZ(i3 + 2, 1, 0.2, 0.2);
        });

        colorAttr.needsUpdate = true;
        return newSet;
      });
    }
  };

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[10, 20, 15]} intensity={1.3} />
      <pointLight position={[-10, -20, -15]} intensity={0.7} />
      <gridHelper args={[100, 20, '#059669', '#1f2937']} position={[0, -35, 0]} />

      {/* When split, render separated Part A and Part B with pins */}
      {splitMeshes ? (
        <group>
          <primitive 
            object={splitMeshes.partA} 
            position={[0, explodedDistance * 0.5, 0]} 
          />
          <primitive 
            object={splitMeshes.partB} 
            position={[0, -explodedDistance * 0.5, 0]} 
          />
        </group>
      ) : (
        model && (
          <primitive 
            object={model} 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerOut={handlePointerUp}
          />
        )
      )}

      {/* Radial Catmull-Rom Spline Line */}
      {cutPoints.length > 1 && !splitMeshes && (
        <Line
          points={cutPoints}
          color="#facc15"
          lineWidth={4.5}
          closed={true}
        />
      )}
    </>
  );
}

export default function App() {
  const [model, setModel] = useState(null);
  const [modelName, setModelName] = useState('Low-Poly Figurine');
  const [pinSize, setPinSize] = useState(5);
  const [brushSize, setBrushSize] = useState(6);
  const [pinType, setPinType] = useState('pyramid');
  const [isPainting, setIsPainting] = useState(false);
  const [paintedFaces, setPaintedFaces] = useState(new Set());
  const [history, setHistory] = useState([]);
  const [cutPoints, setCutPoints] = useState([]);
  const [isWireframe, setIsWireframe] = useState(true);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [splitMeshes, setSplitMeshes] = useState(null);
  const [explodedDistance, setExplodedDistance] = useState(15);
  const [statusMsg, setStatusMsg] = useState('3D İnceleme Modu: Modeli döndürmek için sürükleyin');
  const [isSampleMenuOpen, setIsSampleMenuOpen] = useState(false);
  const controlsRef = useRef();

  // Initialize with procedural figurine model
  useEffect(() => {
    loadPresetModel('figurine', 'Low-Poly Figurine');
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
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
  }, []);

  const createMeshFromGeometry = (geometry, name) => {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.35,
      metalness: 0.15,
      wireframe: isWireframe,
      side: THREE.DoubleSide,
    });

    const colors = new Float32Array(geometry.attributes.position.count * 3);
    colors.fill(0.35);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mesh = new THREE.Mesh(geometry, material);
    setModel(mesh);
    setModelName(name);
    setPaintedFaces(new Set());
    setHistory([]);
    setCutPoints([]);
    setSplitMeshes(null);
    setStatusMsg(`${name} yüklendi (${geometry.attributes.position.count / 3} yüzey)`);
  };

  const loadPresetModel = (type, label) => {
    const geom = generateSampleGeometry(type);
    createMeshFromGeometry(geom, label);
    setIsSampleMenuOpen(false);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const contents = e.target.result;
      const loader = new STLLoader();
      const geometry = loader.parse(contents);
      geometry.center();
      geometry.computeVertexNormals();

      createMeshFromGeometry(geometry, file.name);
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleWireframe = () => {
    const newWire = !isWireframe;
    setIsWireframe(newWire);
    if (model) {
      model.material.wireframe = newWire;
    }
    if (splitMeshes) {
      splitMeshes.partA.material.wireframe = newWire;
      splitMeshes.partB.material.wireframe = newWire;
    }
  };

  const handleUndo = () => {
    if (history.length === 0 || !model) return;

    const previousFaces = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setPaintedFaces(previousFaces);

    const geometry = model.geometry;
    const colorAttr = geometry.attributes.color;
    const count = geometry.attributes.position.count;

    for (let i = 0; i < count; i++) {
      colorAttr.setXYZ(i, 0.35, 0.35, 0.35);
    }

    previousFaces.forEach((fIdx) => {
      const i3 = fIdx * 3;
      colorAttr.setXYZ(i3, 1, 0.2, 0.2);
      colorAttr.setXYZ(i3 + 1, 1, 0.2, 0.2);
      colorAttr.setXYZ(i3 + 2, 1, 0.2, 0.2);
    });
    colorAttr.needsUpdate = true;
    setCutPoints([]);
    setStatusMsg(`Geri alındı (${previousFaces.size} yüzey boyalı)`);
  };

  // Radial sorting & Catmull-Rom spline extraction
  const handleCompletePainting = () => {
    if (paintedFaces.size === 0 || !model) {
      setStatusMsg("Lütfen önce model üzerinde çevre hatlarını boyayın.");
      return;
    }

    setIsPainting(false);
    const geometry = model.geometry;
    const posAttr = geometry.attributes.position;
    const edgeCounts = new Map();
    const getVertexKey = (x, y, z) => `${x.toFixed(1)},${y.toFixed(1)},${z.toFixed(1)}`;

    paintedFaces.forEach((fIdx) => {
      const i3 = fIdx * 3;
      const vA = new THREE.Vector3(posAttr.getX(i3), posAttr.getY(i3), posAttr.getZ(i3)).applyMatrix4(model.matrixWorld);
      const vB = new THREE.Vector3(posAttr.getX(i3 + 1), posAttr.getY(i3 + 1), posAttr.getZ(i3 + 1)).applyMatrix4(model.matrixWorld);
      const vC = new THREE.Vector3(posAttr.getX(i3 + 2), posAttr.getY(i3 + 2), posAttr.getZ(i3 + 2)).applyMatrix4(model.matrixWorld);

      const edges = [[vA, vB], [vB, vC], [vC, vA]];
      edges.forEach(([p1, p2]) => {
        const k1 = getVertexKey(p1.x, p1.y, p1.z);
        const k2 = getVertexKey(p2.x, p2.y, p2.z);
        const edgeKey = k1 < k2 ? `${k1}_${k2}` : `${k2}_${k1}`;

        if (!edgeCounts.has(edgeKey)) {
          edgeCounts.set(edgeKey, { count: 0, p1, p2 });
        }
        edgeCounts.get(edgeKey).count += 1;
      });
    });

    const boundaryPoints = [];
    edgeCounts.forEach((data) => {
      if (data.count === 1) {
        boundaryPoints.push(data.p1, data.p2);
      }
    });

    if (boundaryPoints.length < 3) {
      setStatusMsg("Sınır noktaları bulunamadı. Lütfen kesintisiz bir halka boyayın.");
      return;
    }

    // Unique boundary points
    const uniquePoints = [];
    const addedKeys = new Set();
    boundaryPoints.forEach(p => {
      const key = getVertexKey(p.x, p.y, p.z);
      if (!addedKeys.has(key)) {
        addedKeys.add(key);
        uniquePoints.push(p.clone());
      }
    });

    // Center point
    const center = new THREE.Vector3();
    uniquePoints.forEach(p => center.add(p));
    center.divideScalar(uniquePoints.length);

    // Radially sort around center
    uniquePoints.sort((a, b) => {
      const angleA = Math.atan2(a.z - center.z, a.x - center.x);
      const angleB = Math.atan2(b.z - center.z, b.x - center.x);
      return angleA - angleB;
    });

    const curve = new THREE.CatmullRomCurve3(uniquePoints, true, 'catmullrom', 0.2);
    const sampledPoints = curve.getPoints(150);

    setCutPoints(sampledPoints.map(v => [v.x, v.y, v.z]));
    setStatusMsg("Spline Kement Çemberi Oluşturuldu! Kesim ve Pin eklemeye hazır.");
  };

  // Perform split into Part A (Male Pin) and Part B (Female Socket)
  const handleSplitAndAddPins = () => {
    if (!model || cutPoints.length === 0) {
      setStatusMsg("Lütfen önce boyamayı tamamlayıp spline kement oluşturun.");
      return;
    }

    const origGeom = model.geometry.clone();
    const posAttr = origGeom.attributes.position;
    const count = posAttr.count / 3;

    // Plane y-cutoff based on cut points average
    let avgY = 0;
    cutPoints.forEach(p => avgY += p[1]);
    avgY /= cutPoints.length;

    const partAGeom = new THREE.BufferGeometry();
    const partBGeom = new THREE.BufferGeometry();

    const partAVerts = [];
    const partBVerts = [];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const v1 = new THREE.Vector3(posAttr.getX(i3), posAttr.getY(i3), posAttr.getZ(i3));
      const v2 = new THREE.Vector3(posAttr.getX(i3 + 1), posAttr.getY(i3 + 1), posAttr.getZ(i3 + 1));
      const v3 = new THREE.Vector3(posAttr.getX(i3 + 2), posAttr.getY(i3 + 2), posAttr.getZ(i3 + 2));

      const cy = (v1.y + v2.y + v3.y) / 3;
      if (cy >= avgY) {
        partAVerts.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
      } else {
        partBVerts.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
      }
    }

    // Add Male Pin Geometry to Part A (Pyramid or Prism)
    const pinGeom = pinType === 'pyramid' 
      ? new THREE.ConeGeometry(pinSize * 0.8, pinSize * 1.5, 4)
      : new THREE.CylinderGeometry(pinSize * 0.6, pinSize * 0.6, pinSize * 1.2, 8);
    pinGeom.translate(0, avgY - (pinSize * 0.75), 0);
    const pinPos = pinGeom.attributes.position;
    for (let i = 0; i < pinPos.count; i++) {
      partAVerts.push(pinPos.getX(i), pinPos.getY(i), pinPos.getZ(i));
    }

    partAGeom.setAttribute('position', new THREE.Float32BufferAttribute(partAVerts, 3));
    partBGeom.setAttribute('position', new THREE.Float32BufferAttribute(partBVerts, 3));
    partAGeom.computeVertexNormals();
    partBGeom.computeVertexNormals();

    const matA = new THREE.MeshStandardMaterial({
      color: '#10b981',
      roughness: 0.3,
      metalness: 0.2,
      wireframe: isWireframe
    });
    const matB = new THREE.MeshStandardMaterial({
      color: '#6366f1',
      roughness: 0.3,
      metalness: 0.2,
      wireframe: isWireframe
    });

    const meshA = new THREE.Mesh(partAGeom, matA);
    const meshB = new THREE.Mesh(partBGeom, matB);

    setSplitMeshes({ partA: meshA, partB: meshB });
    setStatusMsg("Model başarıyla ayrıştırıldı! Part A (Erkek Pin) ve Part B (Dişi Yuva) oluşturuldu.");
  };

  const handleExportSTL = () => {
    if (splitMeshes) {
      exportBinarySTL(splitMeshes.partA.geometry, `${modelName}_Part_A_Male_Pin`);
      setTimeout(() => {
        exportBinarySTL(splitMeshes.partB.geometry, `${modelName}_Part_B_Female_Socket`);
      }, 400);
      setStatusMsg("Part A ve Part B STL dosyaları indirildi.");
    } else if (model) {
      exportBinarySTL(model.geometry, `${modelName}`);
      setStatusMsg("STL modeli başarıyla indirildi.");
    }
  };

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-gray-950 text-white font-sans overflow-hidden">
      {/* Sol Panel / Alt Panel (Mobil Uyumlu Kontroller) */}
      <div className="w-full md:w-88 md:max-w-xs bg-gray-900 border-b md:border-b-0 md:border-r border-gray-800 flex flex-col p-4 shadow-2xl z-10 overflow-y-auto max-h-[45vh] md:max-h-full">
        {/* Başlık ve Logo */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
            <Scissors className="w-5 h-5 text-emerald-400" /> STL PinCut 3D
          </h1>
          
          {/* Örnek Modeller Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsSampleMenuOpen(!isSampleMenuOpen)}
              className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-emerald-400 px-2.5 py-1.5 rounded-lg border border-gray-700 transition"
            >
              <Box className="w-3.5 h-3.5" /> Örnekler <ChevronDown className="w-3 h-3" />
            </button>
            {isSampleMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-gray-850 border border-gray-700 rounded-lg shadow-xl py-1 z-50">
                <button 
                  onClick={() => loadPresetModel('figurine', 'Low-Poly Figurine')}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-emerald-600/20 hover:text-emerald-400 flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Heykel Figür
                </button>
                <button 
                  onClick={() => loadPresetModel('bracket', 'Mechanical Bracket')}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-emerald-600/20 hover:text-emerald-400 flex items-center gap-2"
                >
                  <Layers className="w-3.5 h-3.5" /> Mekanik Braket
                </button>
                <button 
                  onClick={() => loadPresetModel('cylinder', 'Cylinder Joint')}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-emerald-600/20 hover:text-emerald-400 flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Silindir Mafsal
                </button>
                <button 
                  onClick={() => loadPresetModel('prism', 'Hexagonal Prism')}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-emerald-600/20 hover:text-emerald-400 flex items-center gap-2"
                >
                  <Box className="w-3.5 h-3.5" /> Altıgen Prizma
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Model Yükleme Kartı */}
        <div className="mb-4">
          <label className="flex items-center gap-3 border-2 border-dashed border-gray-700 hover:border-emerald-500 rounded-lg p-2.5 cursor-pointer transition bg-gray-950/60">
            <Upload className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-200">STL Modeli Yükle</span>
              <span className="text-[10px] text-gray-400">{modelName}</span>
            </div>
            <input type="file" accept=".stl" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {model && (
          <div className="flex flex-col gap-3.5 border-t border-gray-800 pt-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Kesim ve Pin Ayarları
              </h2>
              <button 
                onClick={toggleWireframe}
                className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-1 px-2 rounded text-[11px] border border-gray-700"
              >
                <Eye className="w-3 h-3 text-emerald-400" /> 
                {isWireframe ? 'Solid' : 'Kafes'}
              </button>
            </div>

            {/* Pin Tipi */}
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Pin Geometrisi</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPinType('pyramid')}
                  className={`py-1.5 px-2 rounded text-xs font-medium border transition ${pinType === 'pyramid' ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' : 'bg-gray-800/60 border-gray-700 text-gray-400'}`}
                >
                  Piramit Pin
                </button>
                <button
                  onClick={() => setPinType('prism')}
                  className={`py-1.5 px-2 rounded text-xs font-medium border transition ${pinType === 'prism' ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' : 'bg-gray-800/60 border-gray-700 text-gray-400'}`}
                >
                  Düz Prizma
                </button>
              </div>
            </div>

            {/* Pin Boyutu */}
            <div>
              <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                <span>Pin Boyutu</span>
                <span className="text-emerald-400 font-bold">{pinSize} mm</span>
              </div>
              <input 
                type="range" 
                min="2" 
                max="15" 
                value={pinSize} 
                onChange={(e) => setPinSize(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
              />
            </div>

            {/* Fırça Kalınlığı */}
            <div>
              <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                <span>Fırça Kalınlığı</span>
                <span className="text-amber-400 font-bold">{brushSize} mm</span>
              </div>
              <input 
                type="range" 
                min="2" 
                max="15" 
                value={brushSize} 
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
              />
            </div>

            {/* Patlatılmış Görünüm Slider */}
            {splitMeshes && (
              <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-lg p-2">
                <div className="flex justify-between text-[11px] text-indigo-300 mb-1">
                  <span>Ayrılma Mesafesi</span>
                  <span className="font-bold">{explodedDistance} mm</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="40" 
                  value={explodedDistance} 
                  onChange={(e) => setExplodedDistance(Number(e.target.value))}
                  className="w-full accent-indigo-400 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                />
              </div>
            )}

            {/* Boyama & Geri Al Butonları */}
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const next = !isPainting;
                  setIsPainting(next);
                  setStatusMsg(next ? "Boyama Modu: Model üzerinde kesim hattı çizin" : "3D İnceleme Modu");
                }}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold transition text-xs flex items-center justify-center gap-1.5 shadow ${isPainting ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
              >
                <Brush className="w-3.5 h-3.5" />
                {isPainting ? 'Boyamayı Kapat' : 'Boyamayı Başlat'}
              </button>

              <button 
                onClick={handleUndo}
                disabled={history.length === 0}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-200 px-3 rounded-lg font-medium transition border border-gray-700 flex items-center justify-center text-xs"
                title="Geri Al"
              >
                <Undo2 className="w-4 h-4" />
              </button>
            </div>

            {/* Spline Kement Tamamlama */}
            {(isPainting || paintedFaces.size > 0) && (
              <button 
                onClick={handleCompletePainting}
                className="flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white py-2 px-3 rounded-lg font-semibold transition shadow text-xs animate-pulse"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Boyamayı Tamamla (Spline Kement)
              </button>
            )}

            {/* Modeli Ayrıştır ve Pin Ekle */}
            {cutPoints.length > 0 && !splitMeshes && (
              <button 
                onClick={handleSplitAndAddPins}
                className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 rounded-lg font-bold transition shadow text-xs"
              >
                <Scissors className="w-3.5 h-3.5" /> Parçaları Ayrıştır & Pim Ekle
              </button>
            )}

            {/* STL İndir Butonu */}
            <button 
              onClick={handleExportSTL}
              className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 rounded-lg font-bold transition shadow text-xs"
            >
              <Download className="w-3.5 h-3.5" /> {splitMeshes ? 'Parçaları STL Olarak İndir' : 'Modeli STL Olarak İndir'}
            </button>
          </div>
        )}
      </div>

      {/* Sağ Panel: 3D Görünüm Alanı */}
      <div className="flex-1 relative bg-gradient-to-br from-gray-950 via-gray-900 to-black h-full">
        {/* Durum / Bildirim Rozeti */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700/80 px-3 py-1.5 rounded-full text-xs text-gray-200 shadow-lg flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${splitMeshes ? 'bg-indigo-400 animate-ping' : isPainting ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span>{statusMsg}</span>
          </div>
        </div>

        {/* Hızlı Kamera Sıfırlama Butonu */}
        <div className="absolute top-3 right-3 z-10">
          <button 
            onClick={resetCamera}
            className="p-2 bg-gray-900/80 hover:bg-gray-800 backdrop-blur-md border border-gray-700 text-gray-300 rounded-full shadow-lg transition"
            title="Kamerayı Sıfırla"
          >
            <RotateCcw className="w-4 h-4 text-emerald-400" />
          </button>
        </div>

        {/* 3D Sahne Canvas */}
        <Canvas camera={{ position: [0, 0, 140], fov: 50 }}>
          <SceneManager 
            model={model} 
            splitMeshes={splitMeshes}
            explodedDistance={explodedDistance}
            isPainting={isPainting} 
            paintedFaces={paintedFaces} 
            setPaintedFaces={setPaintedFaces}
            cutPoints={cutPoints} 
            isShiftPressed={isShiftPressed}
            brushSize={brushSize} 
            setHistory={setHistory}
          />
          <OrbitControls ref={controlsRef} makeDefault enableRotate={!isPainting || isShiftPressed} />
        </Canvas>

        {/* Boyama İpucu Kutusu */}
        {isPainting && (
          <div className="absolute bottom-4 left-4 right-4 md:right-auto md:left-4 bg-amber-500/20 border border-amber-500/50 text-amber-300 px-3.5 py-2 rounded-xl text-xs backdrop-blur-md shadow-xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Radyal sıralama aktif: Yüzeyleri boyayın, sistem kusursuz bir kement halkası oluşturacaktır. (Shift ile döndürün)</span>
          </div>
        )}
      </div>
    </div>
  );
}
