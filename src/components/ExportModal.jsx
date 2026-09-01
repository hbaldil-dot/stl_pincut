import React, { useState } from 'react';
import {
  Download,
  FolderArchive,
  FileCode,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  Info,
  Sliders,
  FileDown,
  Box,
  HardDrive,
  Copy,
  Check,
  CircleDot
} from 'lucide-react';
import {
  calculateGeometryStats,
  downloadMeshSTL,
  downloadCombinedSTL,
  downloadAllPartsZip
} from '../utils/stlExporter';

export function ExportModal({
  isOpen,
  onClose,
  modelName,
  splitResult,
  originalModel,
  onNotify
}) {
  const [exportFormat, setExportFormat] = useState('binary'); // 'binary' | 'ascii'
  const [customName, setCustomName] = useState(modelName || 'Modified_Model');
  const [copiedTip, setCopiedTip] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);

  if (!isOpen) return null;

  const cleanName = (customName || modelName || 'Model').trim().replace(/\.stl$/i, '');

  const statsA = calculateGeometryStats(splitResult?.partA?.geometry);
  const statsB = calculateGeometryStats(splitResult?.partB?.geometry);
  const dowelGeom = splitResult?.dowelPinGeometry || null;
  const dowelSpecs = splitResult?.dowelSpecs || null;
  const pinCfg = splitResult?.pinConfig || null;

  const totalTriangles = (statsA.triangles || 0) + (statsB.triangles || 0);

  const handleDownloadPartA = () => {
    if (!splitResult?.partA?.geometry) return;
    const suffix = pinCfg?.mode === 'holes_both' ? 'Part_1_Hole' : 'Part_1';
    downloadMeshSTL(
      splitResult.partA.geometry,
      `${cleanName}_${suffix}.stl`,
      exportFormat
    );
    if (onNotify) onNotify(`Part 1 (${cleanName}_${suffix}.stl) indirildi.`);
  };

  const handleDownloadPartB = () => {
    if (!splitResult?.partB?.geometry) return;
    const suffix = pinCfg?.mode === 'holes_both' ? 'Part_2_Hole' : 'Part_2';
    downloadMeshSTL(
      splitResult.partB.geometry,
      `${cleanName}_${suffix}.stl`,
      exportFormat
    );
    if (onNotify) onNotify(`Part 2 (${cleanName}_${suffix}.stl) indirildi.`);
  };

  const handleDownloadDowelPin = () => {
    if (!dowelGeom) return;
    downloadMeshSTL(
      dowelGeom,
      `${cleanName}_Alignment_Dowel_Pin_D${dowelSpecs?.diameter || 8}xL${dowelSpecs?.length || 20}.stl`,
      exportFormat
    );
    if (onNotify) onNotify(`Hizalama Dübel Pimi STL indirildi (Ø${dowelSpecs?.diameter || 8}mm x ${dowelSpecs?.length || 20}mm).`);
  };

  const handleDownloadCombined = () => {
    if (!splitResult) return;
    downloadCombinedSTL(
      splitResult.partA,
      splitResult.partB,
      cleanName,
      exportFormat
    );
    if (onNotify) onNotify(`Birleştirilmiş Model (${cleanName}_Sliced_Combined.stl) indirildi.`);
  };

  const handleDownloadZip = async () => {
    if (!splitResult) return;
    setIsExportingZip(true);
    try {
      await downloadAllPartsZip(splitResult.partA, splitResult.partB, cleanName, {
        format: exportFormat,
        includeCombined: true,
        dowelPinGeometry: dowelGeom,
        dowelSpecs
      });
      if (onNotify) onNotify('Tüm STL parçaları, dübel pimi ve 3D baskı kılavuzu ZIP olarak indirildi!');
    } catch (err) {
      console.error(err);
      if (onNotify) onNotify(`ZIP İndirme hatası: ${err.message}`);
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleCopyTips = () => {
    const tips = `3D Baskı Önerileri:\n- Katman Kalınlığı: 0.16mm (Hassas geçme toleransı için)\n- Dolgu: %20 Gyroid veya Grid\n- Duvar / Çeper Sayısı: 3-4 (Pin ve Delik mukavemeti için)\n- Düzlem oryantasyonu: Kesim yüzeyi tablaya düz yerleştirilmeli.`;
    navigator.clipboard.writeText(tips);
    setCopiedTip(true);
    setTimeout(() => setCopiedTip(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-gray-950/70 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Modifiye Edilmiş STL Mesh Dışa Aktar</span>
                <span className="text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full font-mono">
                  3D Printable
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Kesilmiş parçaları, silindirik hizalama deliklerini ve dübel pimlerini STL veya ZIP olarak indirin
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white bg-gray-800/60 hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* File Name & Format Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                Dosya Adı Ön Eki
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition font-mono"
                placeholder="Model_Adi"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                STL Formatı
              </label>
              <div className="grid grid-cols-2 gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800">
                <button
                  type="button"
                  onClick={() => setExportFormat('binary')}
                  className={`py-1 px-2 rounded-lg text-xs font-semibold transition ${
                    exportFormat === 'binary'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Binary (Kompakt)
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('ascii')}
                  className={`py-1 px-2 rounded-lg text-xs font-semibold transition ${
                    exportFormat === 'ascii'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  ASCII (Metin)
                </button>
              </div>
            </div>
          </div>

          {/* Sliced Parts Cards */}
          {splitResult ? (
            <div className="space-y-3">
              <div className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" /> Kesilmiş ve Hazırlanmış Parçalar
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Part 1 Card */}
                <div className="bg-gradient-to-br from-blue-950/40 to-gray-950 border border-blue-800/40 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        Part 1
                      </span>
                      <span className="text-[10px] font-mono text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/50">
                        {exportFormat === 'binary' ? statsA.binarySizeFormatted : statsA.asciiSizeFormatted}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 space-y-0.5 font-mono">
                      <div>Üçgen Sayısı: <span className="text-gray-200">{statsA.triangles.toLocaleString()}</span></div>
                      <div>Özellik: <span className="text-emerald-400">{pinCfg?.mode === 'holes_both' ? 'Silindirik Dübel Deliği' : pinCfg?.mode === 'pin_only' || pinCfg?.mode === 'pin_and_hole' ? 'Montaj Pimi Entegre' : 'Su Sızdırmaz Kapak'}</span></div>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadPartA}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-950/40"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Part 1 STL İndir (.stl)</span>
                  </button>
                </div>

                {/* Part 2 Card */}
                <div className="bg-gradient-to-br from-emerald-950/40 to-gray-950 border border-emerald-800/40 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        Part 2
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
                        {exportFormat === 'binary' ? statsB.binarySizeFormatted : statsB.asciiSizeFormatted}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 space-y-0.5 font-mono">
                      <div>Üçgen Sayısı: <span className="text-gray-200">{statsB.triangles.toLocaleString()}</span></div>
                      <div>Özellik: <span className="text-emerald-400">{pinCfg?.mode === 'pin_and_hole' ? 'Hizalama Deliği (Soket)' : pinCfg?.mode === 'holes_both' ? 'Silindirik Dübel Deliği' : 'Su Sızdırmaz Kapak'}</span></div>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadPartB}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Part 2 STL İndir (.stl)</span>
                  </button>
                </div>
              </div>

              {/* Standalone Dowel Pin Card */}
              {dowelGeom && (
                <div className="bg-gradient-to-r from-amber-950/30 via-orange-950/20 to-gray-950 border border-amber-800/40 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <CircleDot className="w-4 h-4 text-orange-400" />
                      <span>Ayrı 3D Yazdırılabilir Dübel Pimi (Dowel Pin STL)</span>
                    </div>
                    <p className="text-[11px] text-gray-300 mt-0.5 font-mono">
                      Ölçüler: Ø{dowelSpecs?.diameter || 8} mm Çap × {dowelSpecs?.length || 20} mm Uzunluk • Pahlı Uçlar
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadDowelPin}
                    className="py-1.5 px-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow shrink-0 ml-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Dübel Pimi STL İndir</span>
                  </button>
                </div>
              )}

              {/* Combined Sliced Mesh Option */}
              <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                    <Box className="w-4 h-4 text-purple-400" />
                    <span>Birleştirilmiş Modifiye Mesh (Combined Assembly)</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Her iki kesilmiş parçayı tek bir STL dosyasında indirir ({totalTriangles.toLocaleString()} üçgen)
                  </p>
                </div>

                <button
                  onClick={handleDownloadCombined}
                  className="py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow shrink-0 ml-2"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Tek STL İndir</span>
                </button>
              </div>

              {/* Full Bundle ZIP Package Button */}
              <button
                onClick={handleDownloadZip}
                disabled={isExportingZip}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50"
              >
                <FolderArchive className="w-4 h-4" />
                <span>
                  {isExportingZip
                    ? 'ZIP Paketi Oluşturuluyor...'
                    : 'Tüm Parçaları, Dübel Pimini ve 3D Baskı Kılavuzunu ZIP Olarak İndir'}
                </span>
              </button>
            </div>
          ) : (
            /* If no slice operation has taken place yet, allow exporting the loaded model */
            <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 text-center space-y-3">
              <div className="text-xs text-gray-300">
                Henüz bir kesme işlemi yapılmadı. Mevcut modeli STL olarak indirebilir veya kesme işlemini tamamladıktan sonra ayrıştırılmış STL parçalarını alabilirsiniz.
              </div>
              <button
                onClick={() => {
                  if (originalModel?.geometry) {
                    downloadMeshSTL(originalModel.geometry, `${cleanName}.stl`, exportFormat);
                    if (onNotify) onNotify(`${cleanName}.stl indirildi.`);
                  }
                }}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Mevcut Modeli STL Olarak İndir</span>
              </button>
            </div>
          )}

          {/* 3D Printing & Slicing Advice Box */}
          <div className="bg-gray-950/40 border border-gray-800 rounded-xl p-3 flex items-start justify-between text-xs text-gray-400 gap-2">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-gray-200">3D Baskı Tavsiyesi:</span>
                <span className="ml-1">
                  En iyi montaj ve tolerans için katman kalınlığını 0.16mm veya 0.12mm, dolguyu %20 (Gyroid) olarak ayarlayın.
                </span>
              </div>
            </div>
            <button
              onClick={handleCopyTips}
              className="p-1 text-gray-400 hover:text-white bg-gray-800 rounded hover:bg-gray-700 transition shrink-0"
              title="Önerileri Kopyala"
            >
              {copiedTip ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-950/70 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
