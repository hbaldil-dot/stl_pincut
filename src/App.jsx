import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import { Scissors, Download, Upload, Sliders, Eye, Brush, CheckCircle } from 'lucide-react';

function SceneManager({ model, isPainting, paintedFaces, setPaintedFaces, cutPoints, isShiftPressed }) {
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Fare ile sürükleyerek boyama (Face painting)
  const handlePointerDown = (e) => {
    if (isShiftPressed || !isPainting) return;
    e.stopPropagation();
    setIsMouseDown(true);
    if (e.faceIndex !== undefined) {
      paintFace(e.faceIndex);
    }
  };

  const handlePointerMove = (e) => {
    if (!isPainting || !isMouseDown || isShiftPressed) return;
    if (e.faceIndex !== undefined) {
      paintFace(e.faceIndex);
    }
  };

  const handlePointerUp = () => {
    setIsMouseDown(false);
  };

  const paintFace = (faceIndex) => {
    if (!model) return;
    
    setPaintedFaces((prev) => {
      if (prev.has(faceIndex)) return prev;
      const newSet = new Set(prev);
      newSet.add(faceIndex);

      // Yüzeyi anlık olarak kırmızı renge boya (Vertex colors üzerinden)
      const geometry = model.geometry;
      let colorAttr = geometry.attributes.color;
      
      if (!colorAttr) {
        const colors = new Float32Array(geometry.attributes.position.count * 3);
        colors.fill(0.25); // Varsayılan renk (gri/yeşil tonu)
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        colorAttr = geometry.attributes.color;
      }

      // Bu üçgenin 3 köşesini kırmızı yap
      const i3 = faceIndex * 3;
      colorAttr.setXYZ(i3, 1, 0, 0);     // Kırmızı
      colorAttr.setXYZ(i3 + 1, 1, 0, 0); // Kırmızı
      colorAttr.setXYZ(i3 + 2, 1, 0, 0); // Kırmızı
      colorAttr.needsUpdate = true;

      return newSet;
    });
  };

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 20, 15]} intensity={1.2} />
      <pointLight position={[-10, -20, -15]} intensity={0.6} />
      
      {model && (
        <primitive 
          object={model} 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerOut={handlePointerUp}
        />
      )}

      {/* Oluşan Kement / Kesim Çevresi Çizgisi */}
      {cutPoints.length > 1 && (
        <Line
          points={cutPoints}
          color="yellow"
          lineWidth={4}
        />
      )}
    </>
  );
}

export default function App() {
  const [model, setModel] = useState(null);
  const [pinSize, setPinSize] = useState(5);
  const [pinType, setPinType] = useState('pyramid');
  const [isPainting, setIsPainting] = useState(false);
  const [paintedFaces, setPaintedFaces] = useState(new Set());
  const [cutPoints, setCutPoints] = useState([]);
  const [isWireframe, setIsWireframe] = useState(true);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

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

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const contents = e.target.result;
      const loader = new STLLoader();
      const geometry = loader.parse(contents);
      geometry.center();

      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.3,
        metalness: 0.1,
        wireframe: true,
        side: THREE.DoubleSide,
      });

      // Başlangıç renklerini ata
      const colors = new Float32Array(geometry.attributes.position.count * 3);
      colors.fill(0.3);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mesh = new THREE.Mesh(geometry, material);
      setModel(mesh);
      setPaintedFaces(new Set());
      setCutPoints([]);
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleWireframe = () => {
    if (model) {
      model.material.wireframe = !model.material.wireframe;
      setIsWireframe(model.material.wireframe);
    }
  };

  // Boyama bittiğinde seçilen yüzeylerin sınır kenarlarını birleştirerek çember oluştur
  const handleCompletePainting = () => {
    if (paintedFaces.size === 0 || !model) {
      alert("Lütfen önce model üzerinde bazı yüzeyleri boyayın.");
      return;
    }

    setIsPainting(false);
    const geometry = model.geometry;
    const posAttr = geometry.attributes.position;
    const edgeCounts = new Map();

    const getVertexKey = (x, y, z) => `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;

    // Boyanan her yüzeyin 3 kenarını say
    paintedFaces.forEach((fIdx) => {
      const i3 = fIdx * 3;
      const vA = new THREE.Vector3(posAttr.getX(i3), posAttr.getY(i3), posAttr.getZ(i3)).applyMatrix4(model.matrixWorld);
      const vB = new THREE.Vector3(posAttr.getX(i3 + 1), posAttr.getY(i3 + 1), posAttr.getZ(i3 + 1)).applyMatrix4(model.matrixWorld);
      const vC = new THREE.Vector3(posAttr.getX(i3 + 2), posAttr.getY(i3 + 2), posAttr.getZ(i3 + 2)).applyMatrix4(model.matrixWorld);

      const edges = [
        [vA, vB],
        [vB, vC],
        [vC, vA]
      ];

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

    // Sadece 1 kez kullanılan kenarlar dış sınır (boundary) kenarlarıdır
    const boundarySegments = [];
    edgeCounts.forEach((data) => {
      if (data.count === 1) {
        boundarySegments.push([
          [data.p1.x, data.p1.y, data.p1.z],
          [data.p2.x, data.p2.y, data.p2.z]
        ]);
      }
    });

    if (boundarySegments.length === 0) {
      alert("Geçerli bir sınır hattı oluşturulamadı. Lütfen daha belirgin bir bölge boyayın.");
      return;
    }

    // Sınır segmentlerini birbirine bağlayarak sıralı bir çember (loop) haline getir
    const orderedPoints = [];
    let currentSeg = boundarySegments.pop();
    orderedPoints.push(currentSeg[0], currentSeg[1]);

    while (boundarySegments.length > 0) {
      const lastPoint = orderedPoints[orderedPoints.length - 1];
      const nextIdx = boundarySegments.findIndex(seg => {
        const d1 = Math.hypot(seg[0][0] - lastPoint[0], seg[0][1] - lastPoint[1], seg[0][2] - lastPoint[2]);
        const d2 = Math.hypot(seg[1][0] - lastPoint[0], seg[1][1] - lastPoint[1], seg[1][2] - lastPoint[2]);
        return d1 < 0.5 || d2 < 0.5;
      });

      if (nextIdx === -1) break;

      const [s1, s2] = boundarySegments.splice(nextIdx, 1)[0];
      const d1 = Math.hypot(s1[0] - lastPoint[0], s1[1] - lastPoint[1], s1[2] - lastPoint[2]);
      
      if (d1 < 0.5) {
        orderedPoints.push(s2);
      } else {
        orderedPoints.push(s1);
      }
    }

    // Çemberi kapatmak için ilk noktayı sona ekle
    if (orderedPoints.length > 0) {
      orderedPoints.push(orderedPoints[0]);
    }

    setCutPoints(orderedPoints);
  };

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-white font-sans overflow-hidden">
      {/* Sol Panel */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col p-5 shadow-2xl z-10 overflow-y-auto">
        <h1 className="text-xl font-bold mb-6 flex items-center gap-2 text-emerald-400">
          <Scissors className="w-6 h-6" /> STL PinCut 3D
        </h1>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-300">STL Modeli Yükle</label>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-lg p-4 cursor-pointer hover:border-emerald-400 transition bg-gray-950/50">
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-400 text-center">Dosya seçin veya sürükleyin</span>
            <input type="file" accept=".stl" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {model && (
          <div className="flex flex-col gap-4 border-t border-gray-800 pt-4">
            <h2 className="text-md font-semibold text-gray-200 flex items-center gap-2">
              <Sliders className="w-4 h-4" /> Kesim ve Pin Yapılandırması
            </h2>

            <button 
              onClick={toggleWireframe}
              className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 py-2 px-4 rounded font-medium transition border border-gray-700 text-sm"
            >
              <Eye className="w-4 h-4 text-emerald-400" /> 
              {isWireframe ? 'Katı Mode Geç (Solid)' : 'Wireframe (Kafes) Göster'}
            </button>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Pin Tipi</label>
              <select 
                value={pinType} 
                onChange={(e) => setPinType(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm text-white focus:border-emerald-400 outline-none"
              >
                <option value="pyramid">Uca Daralan Prizma / Piramit</option>
                <option value="prism">Düz Prizma</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Pin Boyutu: {pinSize} mm</label>
              <input 
                type="range" 
                min="2" 
                max="15" 
                value={pinSize} 
                onChange={(e) => setPinSize(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            <button 
              onClick={() => {
                setIsPainting(!isPainting);
              }}
              className={`py-2 px-4 rounded font-medium transition ${isPainting ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white shadow flex items-center justify-center gap-2`}
            >
              <Brush className="w-4 h-4" />
              {isPainting ? 'Boyama Modu Açık (Kapat)' : 'Yüzey Boyama Modunu Başlat'}
            </button>

            {isPainting && (
              <button 
                onClick={handleCompletePainting}
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded font-medium transition shadow animate-pulse"
              >
                <CheckCircle className="w-4 h-4" /> Boyamayı Tamamla (Kement Oluştur)
              </button>
            )}

            <button 
              onClick={() => alert(`Oluşan kement hattı üzerinden model parçalara ayrılıyor ve pinler ekleniyor...`)}
              className="mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-medium transition shadow"
            >
              <Download className="w-4 h-4" /> Parçaları STL Olarak İndir
            </button>
          </div>
        )}
      </div>

      {/* Sağ Panel: 3D Alan */}
      <div className="flex-1 relative bg-gradient-to-br from-gray-950 via-gray-900 to-black h-full">
        <Canvas camera={{ position: [0, 0, 150], fov: 50 }}>
          <SceneManager 
            model={model} 
            isPainting={isPainting} 
            paintedFaces={paintedFaces} 
            setPaintedFaces={setPaintedFaces}
            cutPoints={cutPoints} 
            isShiftPressed={isShiftPressed}
          />
          <OrbitControls makeDefault enableRotate={!isPainting || isShiftPressed} />
        </Canvas>

        {isPainting && (
          <div className="absolute top-4 right-4 bg-amber-500/20 border border-amber-500 text-amber-300 px-4 py-2 rounded-lg text-sm backdrop-blur-md shadow-lg flex items-center gap-2">
            <span>🎨 Boyama Modu Aktif: Sol tuşa basılı tutarak kesmek istediğiniz bölgeyi boyayın. Kamerayı döndürmek için <b>Shift</b> tuşunu kullanın.</span>
          </div>
        )}
      </div>
    </div>
  );
}
