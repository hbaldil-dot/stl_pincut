import React from 'react';
import {
  Box,
  Layers,
  Ruler,
  Maximize2,
  FileCode,
  HardDrive,
  Cpu,
  Info,
  CheckCircle,
  HelpCircle,
  X
} from 'lucide-react';

export function ModelInspector({ info, isOpen, onClose }) {
  if (!isOpen || !info) return null;

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">STL Model Analizi & Geometri Bilgisi</h2>
              <p className="text-[11px] text-gray-400">3D Baskı ve mesh detayları</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white bg-gray-800/60 hover:bg-gray-800 rounded-lg border border-gray-700/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* File Name & Type */}
          <div className="bg-gray-950/50 p-3.5 rounded-xl border border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCode className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-gray-200 text-sm truncate max-w-xs">{info.name}</div>
                <div className="text-[11px] text-gray-400">{info.format} ({formatBytes(info.fileSize)})</div>
              </div>
            </div>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-mono text-[10px] font-bold">
              STL 3D
            </span>
          </div>

          {/* Geometric Dimensions (X, Y, Z Bounding Box in mm) */}
          <div className="bg-gray-950/40 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
            <div className="flex items-center gap-2 text-gray-300 font-semibold">
              <Ruler className="w-4 h-4 text-emerald-400" />
              <span>Sınır Kutusu Boyutları (Bounding Box)</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                <span className="text-[10px] text-gray-400 block font-mono">X (Genişlik)</span>
                <span className="text-sm font-bold text-red-400 font-mono">{info.dimensions.x} mm</span>
              </div>
              <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                <span className="text-[10px] text-gray-400 block font-mono">Y (Yükseklik)</span>
                <span className="text-sm font-bold text-green-400 font-mono">{info.dimensions.y} mm</span>
              </div>
              <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                <span className="text-[10px] text-gray-400 block font-mono">Z (Derinlik)</span>
                <span className="text-sm font-bold text-blue-400 font-mono">{info.dimensions.z} mm</span>
              </div>
            </div>
          </div>

          {/* Mesh Properties */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-800 flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <span className="text-[10px] text-gray-400 block">Üçgen (Yüzey) Sayısı</span>
                <span className="font-bold text-gray-200 font-mono">{info.triangleCount.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-800 flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] text-gray-400 block">Tepe Noktası (Vertex)</span>
                <span className="font-bold text-gray-200 font-mono">{info.vertexCount.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-800 flex items-center gap-2.5">
              <Box className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-gray-400 block">Tahmini Hacim</span>
                <span className="font-bold text-amber-300 font-mono">{info.volumeCm3} cm³</span>
              </div>
            </div>

            <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-800 flex items-center gap-2.5">
              <Maximize2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-gray-400 block">Yüzey Alanı</span>
                <span className="font-bold text-emerald-300 font-mono">{info.surfaceAreaCm2} cm²</span>
              </div>
            </div>
          </div>

          {/* 3D Printing Recommendation */}
          <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-xl flex items-start gap-2.5 text-emerald-300">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="text-emerald-200 block">3D Baskı Uyumlu:</strong>
              Üçgen normalleri ve merkezleme başarıyla hesaplandı. Kement aracını kullanarak modeli istediğiniz açıdan kesebilir ve montaj pimleri ekleyebilirsiniz.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-gray-800 bg-gray-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-emerald-900/30"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}
