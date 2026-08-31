import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Scissors, Download, Upload, Sliders } from 'lucide-react';

export default function App() {
  const [model, setModel] = useState(null);
  const [pinSize, setPinSize] = useState(5);
  const [pinType, setPinType] = useState('pyramid'); // 'pyramid' veya 'prism'
  const [isCutting, setIsCutting] = useState(false);
  const [cutPoints, setCutPoints] = useState([]);

  // STL Dosya Yükleme İşleyicisi
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const contents = e.target.result;
      const loader = new STLLoader();
      const geometry = loader.parse(contents);
      geometry.center(); // Modeli merkeze oturt

      const material = new THREE.MeshStandardMaterial({
        color: 0x41b883,
        roughness: 0.4,
        metalness: 0.2,
      });

      const mesh = new THREE.Mesh(geometry, material);
      setModel(mesh);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white font-sans overflow-hidden">
      {/* Sol Panel: Araçlar ve Ayarlar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col p-5 shadow-lg z-10">
        <h1 className="text-xl font-bold mb-6 flex items-center gap-2 text-emerald-400">
          <Scissors className="w-6 h-6" /> STL PinCut 3D
        </h1>

        {/* Dosya Yükleme */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-300">STL Modeli Yükle</label>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-4 cursor-pointer hover:border-emerald-400 transition bg-gray-900/50">
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-400">Dosya seçin veya sürükleyin</span>
            <input type="file" accept=".stl" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Kesim ve Pin Ayarları */}
        {model && (
          <div className="flex flex-col gap-4 border-t border-gray-700 pt-4">
            <h2 className="text-md font-semibold text-gray-200 flex items-center gap-2">
              <Sliders className="w-4 h-4" /> Kesim ve Pin Yapılandırması
            </h2>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Pin Tipi</label>
              <select 
                value={pinType} 
                onChange={(e) => setPinType(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-emerald-400 outline-none"
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
              onClick={() => setIsCutting(!isCutting)}
              className={`py-2 px-4 rounded font-medium transition ${isCutting ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white shadow`}
            >
              {isCutting ? 'Kesimi İptal Et / Tamamla' : 'Serbest Çizgiyle Kes (Lasso)'}
            </button>

            <button 
              onClick={() => alert("Parçalar ve pimler hesaplanıp STL olarak indirilecek.")}
              className="mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-medium transition shadow"
            >
              <Download className="w-4 h-4" /> Parçaları STL Olarak İndir
            </button>
          </div>
        )}
      </div>

      {/* Sağ Panel: 3D Görüntüleme Alanı */}
      <div className="flex-1 relative bg-gradient-to-br from-gray-950 to-gray-900">
        <Canvas camera={{ position: [0, 0, 150], fov: 50 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 20, 15]} intensity={1} />
          <pointLight position={[-10, -20, -15]} intensity={0.5} />
          
          {model && <primitive object={model} />}
          
          <OrbitControls makeDefault enableRotate={!isCutting} />
        </Canvas>

        {isCutting && (
          <div className="absolute top-4 right-4 bg-emerald-500/20 border border-emerald-500 text-emerald-300 px-4 py-2 rounded-lg text-sm backdrop-blur-md shadow-lg">
            ✂️ Model üzerinde serbest kesim çizgisi çizebilirsiniz.
          </div>
        )}
      </div>
    </div>
  );
}
