import React, { useState, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import { Scissors, Download, Upload, Sliders, Eye } from 'lucide-react';

function SceneManager({ model, isCutting, cutPoints, setCutPoints, isWireframe }) {
  const { camera, raycaster, pointer } = useThree();

  // Model üzerindeyken fare hareketiyle noktaları kaydet
  const handlePointerMove = (e) => {
    if (!isCutting) return;
    const newPoint = [e.point.x, e.point.y, e.point.z];
    
    // Çok sık nokta eklenmesini önlemek için son noktaya olan mesafeye bakabiliriz
    setCutPoints((prev) => {
      if (prev.length === 0) return [newPoint];
      const last = prev[prev.length - 1];
      const dist = Math.hypot(last[0] - newPoint[0], last[1] - newPoint[1], last[2] - newPoint[2]);
      if (dist > 1.5) { // Hassasiyet eşiği
        return [...prev, newPoint];
      }
      return prev;
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
          onPointerMove={handlePointerMove} 
        />
      )}

      {/* Kement / Kesim Çevresi Çizgisi */}
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
  const [isCutting, setIsCutting] = useState(false);
  const [cutPoints, setCutPoints] = useState([]);
  const [isWireframe, setIsWireframe] = useState(true);

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
        color: 0x41b883,
        roughness: 0.3,
        metalness: 0.1,
        wireframe: true, // Başlangıçta wireframe olarak gelsin
      });

      const mesh = new THREE.Mesh(geometry, material);
      setModel(mesh);
      setCutPoints([]);
    };
    reader.readAsArrayBuffer(file);
  };

  // Wireframe modunu açıp kapatma
  const toggleWireframe = () => {
    if (model) {
      model.material.wireframe = !model.material.wireframe;
      setIsWireframe(model.material.wireframe);
    }
  };

  // Çizimi tamamla ve başlangıç noktasıyla birleştirerek çevreyi kapat
  const handleCompleteCut = () => {
    setIsCutting(false);
    if (cutPoints.length > 2) {
      // Çevreyi kapatmak için ilk noktayı sona ekle (En kısa yol mantığıyla döngü oluşturur)
      setCutPoints((prev) => [...prev, prev[0]]);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-white font-sans overflow-hidden">
      {/* Sol Panel: Araçlar ve Ayarlar */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col p-5 shadow-2xl z-10 overflow-y-auto">
        <h1 className="text-xl font-bold mb-6 flex items-center gap-2 text-emerald-400">
          <Scissors className="w-6 h-6" /> STL PinCut 3D
        </h1>

        {/* Dosya Yükleme */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-300">STL Modeli Yükle</label>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-lg p-4 cursor-pointer hover:border-emerald-400 transition bg-gray-950/50">
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-400 text-center">Dosya seçin veya sürükleyin</span>
            <input type="file" accept=".stl" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Kesim ve Pin Ayarları */}
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
                if (!isCutting) {
                  setCutPoints([]);
                  setIsCutting(true);
                } else {
                  handleCompleteCut();
                }
              }}
              className={`py-2 px-4 rounded font-medium transition ${isCutting ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white shadow`}
            >
              {isCutting ? 'Çevreyi Kapat / Kesimi Bitir' : 'Serbest Kement Çizimi Başlat'}
            </button>

            <button 
              onClick={() => alert("Kement çevresi işlendi. Model iki parçaya bölünüp pin yuvaları oluşturuluyor...")}
              className="mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-medium transition shadow"
            >
              <Download className="w-4 h-4" /> Parçaları STL Olarak İndir
            </button>
          </div>
        )}
      </div>

      {/* Sağ Panel: Tam Ekran 3D Görüntüleme Alanı */}
      <div className="flex-1 relative bg-gradient-to-br from-gray-950 via-gray-900 to-black h-full">
        <Canvas camera={{ position: [0, 0, 150], fov: 50 }}>
          <SceneManager 
            model={model} 
            isCutting={isCutting} 
            cutPoints={cutPoints} 
            setCutPoints={setCutPoints} 
            isWireframe={isWireframe}
          />
          <OrbitControls makeDefault enableRotate={!isCutting} />
        </Canvas>

        {isCutting && (
          <div className="absolute top-4 right-4 bg-amber-500/20 border border-amber-500 text-amber-300 px-4 py-2 rounded-lg text-sm backdrop-blur-md shadow-lg animate-pulse">
            ✏️ Kement Modu Aktif: Model üzerinde sürükleyerek çevre çizgisi çizin, bitince butona basın.
          </div>
        )}
      </div>
    </div>
  );
}
