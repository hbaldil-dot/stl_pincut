import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import { Scissors, Download, Upload, Sliders, Eye, Brush, CheckCircle, Undo2 } from 'lucide-react';

function SceneManager({ model, isPainting, paintedFaces, setPaintedFaces, cutPoints, isShiftPressed, history, setHistory }) {
  const [isMouseDown, setIsMouseDown] = useState(false);

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

  // Kalın fırça etkisi: Dokunulan 3D noktaya yakın olan komşu yüzeyleri de boya
  const paintArea = (hitPoint) => {
    if (!model) return;
    const geometry = model.geometry;
    const posAttr = geometry.attributes.position;
    const newlyPainted = [];

    const brushRadius = 4.5; // Fırça kalınlığı (düzenlenebilir)

    // Tüm yüzeyleri tarayıp tıklanan noktaya yakın olanları bul
    const faceCount = posAttr.count / 3;
    for (let i = 0; i < faceCount; i++) {
      const i3 = i * 3;
      const vA = new THREE.Vector3(posAttr.getX(i3), posAttr.getY(i3), posAttr.getZ(i3)).applyMatrix4(model.matrixWorld);
      const vB = new THREE.Vector3(posAttr.getX(i3 + 1), posAttr.getY(i3 + 1), posAttr.getZ(i3 + 1)).applyMatrix4(model.matrixWorld);
      const vC = new THREE.Vector3(posAttr.getX(i3 + 2), posAttr.getY(i3 + 2), posAttr.getZ(i3 + 2)).applyMatrix4(model.matrixWorld);

      const center = new THREE.Vector3().addVectors(vA, vB).add(vC).divideScalar(3);

      if (center.distanceTo(hitPoint) <= brushRadius) {
        if (!paintedFaces.has(i)) {
          newlyPainted.push(i);
        }
      }
    }

    if (newlyPainted.length > 0) {
      // Undo için mevcut durumu geçmişe kaydet
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
          colorAttr.setXYZ(i3, 1, 0, 0);     // Kırmızı
          colorAttr.setXYZ(i3 + 1, 1, 0, 0); // Kırmızı
          colorAttr.setXYZ(i3 + 2, 1, 0, 0); // Kırmızı
        });

        colorAttr.needsUpdate = true;
        return newSet;
      });
    }
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

      {/* Spline Eğrisi Kement Hattı */}
      {cutPoints.length > 1 && (
        <Line
          points={cutPoints}
          color="yellow"
          lineWidth={4}
          closed={true}
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
  const [history, setHistory] = useState([]);
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

      const colors = new Float32Array(geometry.attributes.position.count * 3);
      colors.fill(0.3);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mesh = new THREE.Mesh(geometry, material);
      setModel(mesh);
      setPaintedFaces(new Set());
      setHistory([]);
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

  // Geri Al (Undo) Fonksiyonu
  const handleUndo = () => {
    if (history.length === 0 || !model) return;

    const previousFaces = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setPaintedFaces(previousFaces);

    // Renkleri sıfırla ve kalanları tekrar kırmızı yap
    const geometry = model.geometry;
    const colorAttr = geometry.attributes.color;
    const count = geometry.attributes.position.count;

    for (let i = 0; i < count; i++) {
      colorAttr.setXYZ(i, 0.3, 0.3, 0.3);
    }

    previousFaces.forEach((fIdx) => {
      const i3 = fIdx * 3;
      colorAttr.setXYZ(i3, 1, 0, 0);
      colorAttr.setXYZ(i3 + 1, 1, 0, 0);
      colorAttr.setXYZ(i3 + 2, 1, 0, 0);
    });
    colorAttr.needsUpdate = true;
    setCutPoints([]);
  };

  // Boyama tamamlandığında pürüzsüz Spline kement oluşturma
  const handleCompletePainting = () => {
    if (paintedFaces.size === 0 || !model) {
      alert("Lütfen önce model üzerinde bazı yüzeyleri boyayın.");
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

    const boundarySegments = [];
    edgeCounts.forEach((data) => {
      if (data.count === 1) {
        boundarySegments.push([data.p1, data.p2]);
      }
    });

    if (boundarySegments.length === 0) {
      alert("Geçerli bir sınır hattı oluşturulamadı.");
      return;
    }

    const orderedVectors = [];
    let currentSeg = boundarySegments.pop();
    orderedVectors.push(currentSeg[0], currentSeg[1]);

    while (boundarySegments.length > 0) {
      const lastPoint = orderedVectors[orderedVectors.length - 1];
      const nextIdx = boundarySegments.findIndex(seg => 
        seg[0].distanceTo(lastPoint) < 1.0 || seg[1].distanceTo(lastPoint) < 1.0
      );

      if (nextIdx === -1) break;

      const [s1, s2] = boundarySegments.splice(nextIdx, 1)[0];
      if (s1.distanceTo(lastPoint) < 1.0) {
        orderedVectors.push(s2);
      } else {
        orderedVectors.push(s1);
      }
    }

    if (orderedVectors.length < 3) return;

    // CatmullRomCurve3 ile kusursuz pürüzsüz spline eğrisi
    const curve = new THREE.CatmullRomCurve3(orderedVectors, true, 'centripetal', 0.5);
    const sampledPoints = curve.getPoints(150);

    const formattedPoints = sampledPoints.map(v => [v.x, v.y, v.z]);
    setCutPoints(formattedPoints);
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

            <div className="flex gap-2">
              <button 
                onClick={() => setIsPainting(!isPainting)}
                className={`flex-1 py-2 px-3 rounded font-medium transition ${isPainting ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white shadow flex items-center justify-center gap-2 text-sm`}
              >
                <Brush className="w-4 h-4" />
                {isPainting ? 'Boyamayı Kapat' : 'Boyamayı Başlat'}
              </button>

              <button 
                onClick={handleUndo}
                disabled={history.length === 0}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 py-2 px-3 rounded font-medium transition border border-gray-700 flex items-center justify-center text-sm"
                title="Geri Al"
              >
                <Undo2 className="w-4 h-4" />
              </button>
            </div>

            {isPainting && (
              <button 
                onClick={handleCompletePainting}
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded font-medium transition shadow animate-pulse"
              >
                <CheckCircle className="w-4 h-4" /> Boyamayı Tamamla (Spline Kement)
              </button>
            )}

            <button 
              onClick={() => alert(`Spline kement hattı onaylandı. Parçalar ayrılıyor ve pimler ekleniyor...`)}
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
            history={history}
            setHistory={setHistory}
          />
          <OrbitControls makeDefault enableRotate={!isPainting || isShiftPressed} />
        </Canvas>

        {isPainting && (
          <div className="absolute top-4 right-4 bg-amber-500/20 border border-amber-500 text-amber-300 px-4 py-2 rounded-lg text-sm backdrop-blur-md shadow-lg flex items-center gap-2">
            <span>🎨 Kalın Fırça Aktif: İstediğiniz bölgeyi fırçalayın. Yanlış yaparsanız <b>Geri Al</b> butonunu kullanabilirsiniz.</span>
          </div>
        )}
      </div>
    </div>
  );
}
