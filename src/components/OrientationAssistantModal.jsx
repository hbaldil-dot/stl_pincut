import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  Sparkles,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  ArrowDown,
  Layers,
  Sliders,
  X,
  TrendingDown,
  ShieldCheck,
  Zap,
  Info,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { findOptimalFlatBottomOrientations } from '../utils/orientationAssistant';

export function OrientationAssistantModal({
  isOpen,
  onClose,
  model,
  splitResult,
  modelRotation = { x: 0, y: 0, z: 0 },
  onApplyRotation,
  onNotify,
  onOpenHeatmap
}) {
  const [thresholdDeg, setThresholdDeg] = useState(45);
  const [isScanning, setIsScanning] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [previewCandidateId, setPreviewCandidateId] = useState(null);

  const activeGeometry = useMemo(() => {
    if (splitResult?.partA?.geometry) return splitResult.partA.geometry;
    return model?.geometry || null;
  }, [model, splitResult]);

  // Run analysis whenever modal opens or geometry / threshold changes
  const runAnalysis = () => {
    if (!activeGeometry) return;
    setIsScanning(true);
    setPreviewCandidateId(null);

    setTimeout(() => {
      try {
        const result = findOptimalFlatBottomOrientations(activeGeometry, {
          thresholdDeg,
          warnRangeDeg: 10,
          currentRotation: modelRotation,
          maxCandidates: 6
        });
        setAnalysisData(result);
      } catch (err) {
        console.error('Orientation analysis failed:', err);
        if (onNotify) onNotify('Yönelim analizi sırasında bir hata oluştu.');
      } finally {
        setIsScanning(false);
      }
    }, 180);
  };

  useEffect(() => {
    if (isOpen && activeGeometry) {
      runAnalysis();
    }
  }, [isOpen, activeGeometry, thresholdDeg]);

  if (!isOpen) return null;

  const best = analysisData?.bestCandidate;
  const current = analysisData?.currentStats;

  const handleApply = (candidate) => {
    if (!candidate || !onApplyRotation) return;
    onApplyRotation(candidate.rotation, `Optimal Düz Taban Uygulandı: ${candidate.name} (X:${candidate.rotation.x}° Y:${candidate.rotation.y}° Z:${candidate.rotation.z}°)`);
    if (onNotify) {
      onNotify(
        `Model ${candidate.name} açısıyla tablaya oturtuldu: Destek %${candidate.supportPercent.toFixed(1)} (${candidate.supportAreaCm2} cm²)`
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700/80 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-950 via-indigo-950/50 to-gray-950 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Otomatik Düz Taban & Yönelim Asistanı
                </h2>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/40">
                  AI Algoritması
                </span>
              </div>
              <p className="text-xs text-gray-400">
                STL yüzey geometrisini tarayarak en az destek (overhang) gerektiren ve tablaya en sağlam oturan açıyı hesaplar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runAnalysis}
              disabled={isScanning}
              className="p-2 bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white rounded-xl border border-gray-700 transition flex items-center gap-1.5 text-xs font-semibold shadow-sm"
              title="Yeniden Analiz Et"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-gray-200">
          {/* Overhang Threshold Filter Bar */}
          <div className="bg-gray-950/70 p-3.5 rounded-2xl border border-gray-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Sliders className="w-4 h-4 text-red-400" />
              <span className="font-semibold">Kritik Destek Açısı Eşiği:</span>
              <span className="font-mono text-red-400 font-bold text-sm">{thresholdDeg}°</span>
            </div>

            <div className="flex items-center gap-1.5">
              {[
                { angle: 40, label: '40° Hassas' },
                { angle: 45, label: '45° Standart FDM' },
                { angle: 50, label: '50° İleri' },
                { angle: 60, label: '60° Agresif' }
              ].map((item) => (
                <button
                  key={item.angle}
                  onClick={() => setThresholdDeg(item.angle)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition border ${
                    thresholdDeg === item.angle
                      ? 'bg-red-950 border-red-500 text-red-300 shadow-md ring-1 ring-red-500/40'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-850'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading / Scanning Indicator */}
          {isScanning && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <Sparkles className="w-5 h-5 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="text-sm font-semibold text-white">Yüzey Geometrisi Taranıyor...</div>
              <p className="text-xs text-gray-400 max-w-sm">
                STL dosyasındaki düz yüzeyler tespit ediliyor, her açı için destek alanları ve tabla temas yüzeyleri hesaplanıyor.
              </p>
            </div>
          )}

          {!isScanning && analysisData && (
            <>
              {/* Side-by-Side Comparison Card (Current vs Recommended) */}
              <div className="bg-gradient-to-br from-indigo-950/40 via-gray-900 to-gray-950 p-5 rounded-3xl border border-indigo-500/30 shadow-xl flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-bold text-white">Yönelim Karşılaştırması & Tasarruf Analizi</span>
                  </div>

                  {best && best.supportReductionPercent > 0.5 ? (
                    <div className="bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                      <TrendingDown className="w-4 h-4 text-emerald-400" />
                      <span>%{best.supportReductionPercent.toFixed(0)} Daha Az Destek Yapısı!</span>
                    </div>
                  ) : (
                    <div className="bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs px-3 py-1 rounded-full">
                      Mevcut yönelim zaten optimal tabana çok yakın
                    </div>
                  )}
                </div>

                {/* 2 Columns: Current vs Recommended */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Current Orientation */}
                  <div className="bg-gray-950/70 p-4 rounded-2xl border border-gray-800 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Mevcut Model Yönelimi
                      </span>
                      <span className="text-xs font-mono text-gray-300 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                        X:{Math.round(modelRotation?.x || 0)}° Y:{Math.round(modelRotation?.y || 0)}° Z:{Math.round(modelRotation?.z || 0)}°
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-900 p-2.5 rounded-xl border border-gray-800">
                        <div className="text-[10px] text-gray-400">Destek Gereken Alan</div>
                        <div className="text-sm font-bold text-red-400 font-mono mt-0.5">
                          {current?.supportAreaCm2.toFixed(1)} cm²
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          %{current?.supportPercent.toFixed(1)} yüzey
                        </div>
                      </div>

                      <div className="bg-gray-900 p-2.5 rounded-xl border border-gray-800">
                        <div className="text-[10px] text-gray-400">Taban Temas Alanı</div>
                        <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                          {current?.bedContactAreaCm2.toFixed(1)} cm²
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          %{current?.bedContactPercent.toFixed(1)} temas
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-850 pt-2 font-mono">
                      <span>Baskı Yüksekliği:</span>
                      <span className="text-gray-200 font-semibold">{current?.modelHeightMm} mm</span>
                    </div>
                  </div>

                  {/* Right Column: Optimal Recommended Orientation */}
                  {best && (
                    <div className="bg-gradient-to-br from-indigo-950/60 to-emerald-950/30 p-4 rounded-2xl border border-emerald-500/40 shadow-lg flex flex-col gap-3 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                            Önerilen Optimal Taban
                          </span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                            Önerilen
                          </span>
                        </div>
                        <span className="text-xs font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 font-bold">
                          X:{best.rotation.x}° Y:{best.rotation.y}° Z:{best.rotation.z}°
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-900/90 p-2.5 rounded-xl border border-emerald-900/50">
                          <div className="text-[10px] text-gray-400">Destek Gereken Alan</div>
                          <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                            <span>{best.supportAreaCm2.toFixed(1)} cm²</span>
                            {best.supportReductionCm2 > 0.05 && (
                              <span className="text-[10px] text-emerald-400 font-normal">
                                (-{best.supportReductionCm2.toFixed(1)})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-emerald-300/80 font-mono">
                            %{best.supportPercent.toFixed(1)} (Çok Düşük)
                          </div>
                        </div>

                        <div className="bg-gray-900/90 p-2.5 rounded-xl border border-emerald-900/50">
                          <div className="text-[10px] text-gray-400">Taban Temas Alanı</div>
                          <div className="text-sm font-bold text-emerald-300 font-mono mt-0.5">
                            {best.bedContactAreaCm2.toFixed(1)} cm²
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            %{best.bedContactPercent.toFixed(1)} güçlü yapışma
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-300 border-t border-emerald-900/40 pt-2 font-mono">
                        <span>Baskı Yüksekliği:</span>
                        <span className="text-white font-semibold">{best.modelHeightMm} mm</span>
                      </div>

                      {/* Primary Quick Apply Button */}
                      <button
                        onClick={() => handleApply(best)}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 active:scale-98"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Önerilen Açıyı Uygula ve Tablaya Oturt</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* All Candidate Flat-Bottom Orientations Grid */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-gray-300 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <span>Tespit Edilen Düz Taban Yüzeyleri & Alternatif Açılar ({analysisData.candidates.length})</span>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    Toplam {analysisData.totalTriangles.toLocaleString()} üçgen tarandı
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analysisData.candidates.map((cand, idx) => {
                    const isOptimal = cand.isOptimal;
                    const isCurrent = cand.isCurrent;

                    return (
                      <div
                        key={cand.id}
                        className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                          isOptimal
                            ? 'bg-gradient-to-br from-indigo-950/50 via-gray-900 to-emerald-950/30 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                            : 'bg-gray-950/70 hover:bg-gray-900 border-gray-800'
                        }`}
                      >
                        {/* Candidate Card Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{cand.name}</span>
                            </div>
                            <div className="text-[10px] text-cyan-400 font-mono font-semibold mt-0.5">
                              X:{cand.rotation.x}° Y:{cand.rotation.y}° Z:{cand.rotation.z}°
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isOptimal
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-gray-850 text-gray-300 border-gray-700'
                          }`}>
                            {cand.badge}
                          </span>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                          <div className="bg-gray-900/90 p-2 rounded-lg border border-gray-800">
                            <div className="text-[9px] text-gray-400">Destek Alanı</div>
                            <div className="text-red-400 font-bold mt-0.5">
                              {cand.supportAreaCm2.toFixed(1)} cm²
                            </div>
                            <div className="text-[9px] text-gray-500">%{cand.supportPercent.toFixed(1)}</div>
                          </div>

                          <div className="bg-gray-900/90 p-2 rounded-lg border border-gray-800">
                            <div className="text-[9px] text-gray-400">Taban Teması</div>
                            <div className="text-emerald-400 font-bold mt-0.5">
                              {cand.bedContactAreaCm2.toFixed(1)} cm²
                            </div>
                            <div className="text-[9px] text-gray-500">%{cand.bedContactPercent.toFixed(1)}</div>
                          </div>
                        </div>

                        {/* Extra stats */}
                        <div className="flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-850 pt-2 font-mono">
                          <span>Yükseklik: {cand.modelHeightMm} mm</span>
                          {cand.supportReductionPercent > 0.5 ? (
                            <span className="text-emerald-400 font-bold">
                              -%{cand.supportReductionPercent.toFixed(0)} Tasarruf
                            </span>
                          ) : (
                            <span className="text-gray-500">Standart</span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleApply(cand)}
                            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                              isOptimal
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                                : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isOptimal ? 'Optimal Açıyı Seç' : 'Bu Yönü Uygula'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3D Printing Pro-Tip Box */}
              <div className="bg-gray-950/60 rounded-2xl p-3.5 border border-gray-800 flex items-start gap-3 text-xs text-gray-400">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-gray-200">3D Baskı İpucu:</strong> Düz taban yönelimi seçildiğinde model
                  otomatik olarak ilgili düz yüzeyi alta gelecek şekilde döndürülür. Bu sayede tabla yapışması (adhesion)
                  en üst düzeye çıkar, modelin baskı sırasında tabladan kalkması (warping) önlenir ve havada asılı kalan
                  destek israfı en aza indirilir. İşlemi dilediğiniz an <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-300 font-mono">Ctrl+Z</kbd> ile geri alabilirsiniz.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-gray-950 border-t border-gray-800 flex items-center justify-between text-xs">
          <div className="text-gray-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Tüm dönüş açıları geçmiş çizelgesine (Undo/Redo) otomatik kaydedilir.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-semibold transition"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
