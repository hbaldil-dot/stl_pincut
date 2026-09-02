import React, { useState, useMemo } from 'react';
import {
  Flame,
  RotateCw,
  Sliders,
  Sparkles,
  ArrowUp,
  AlertTriangle,
  Layers,
  Compass,
  CheckCircle2,
  TrendingDown,
  Info,
  Maximize2
} from 'lucide-react';
import {
  PRINT_ORIENTATION_PRESETS,
  findOptimalPrintOrientation
} from '../utils/supportHeatmap';

export function OverhangSupportTab({
  model,
  splitResult,
  modelRotation,
  heatmapConfig,
  onChangeHeatmapConfig,
  onApplyModelRotationAsPrintDir,
  overhangStats
}) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState(null);

  const activeGeometry = useMemo(() => {
    if (splitResult?.partA?.geometry) return splitResult.partA.geometry;
    return model?.geometry || null;
  }, [model, splitResult]);

  const handleRunOptimizer = () => {
    if (!activeGeometry) return;
    setIsOptimizing(true);
    setTimeout(() => {
      const result = findOptimalPrintOrientation(activeGeometry, heatmapConfig.thresholdDeg);
      setOptimizationResult(result);
      setIsOptimizing(false);
    }, 150);
  };

  const handleApplyPreset = (preset) => {
    onChangeHeatmapConfig({
      presetId: preset.id,
      printDirection: preset.vector.clone(),
      customPitch: preset.rotation.x,
      customYaw: preset.rotation.y,
      customRoll: preset.rotation.z
    });
  };

  const handleCustomAngleChange = (axis, value) => {
    const num = parseFloat(value);
    const newConfig = {
      ...heatmapConfig,
      presetId: 'custom',
      [axis === 'pitch' ? 'customPitch' : axis === 'yaw' ? 'customYaw' : 'customRoll']: num
    };

    // Recalculate vector
    const pitchRad = (newConfig.customPitch * Math.PI) / 180;
    const yawRad = (newConfig.customYaw * Math.PI) / 180;
    const rollRad = (newConfig.customRoll * Math.PI) / 180;

    const euler = new THREE.Euler(pitchRad, yawRad, rollRad, 'XYZ');
    const vec = new THREE.Vector3(0, 1, 0).applyEuler(euler).normalize();

    onChangeHeatmapConfig({
      ...newConfig,
      printDirection: vec
    });
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* 1. Master Toggle Card */}
      <div className="bg-gradient-to-r from-red-950/40 via-gray-900 to-amber-950/30 p-3.5 rounded-2xl border border-red-500/30 shadow-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2.5 rounded-xl border transition ${
            heatmapConfig.enabled
              ? 'bg-red-500 text-white border-red-400 shadow-md shadow-red-900/50 ring-2 ring-red-500/20'
              : 'bg-gray-800 text-gray-400 border-gray-700'
          }`}>
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
              <span>Overhang & Destek Isı Haritası</span>
              {heatmapConfig.enabled && (
                <span className="text-[10px] bg-red-500/30 text-red-300 font-mono px-1.5 py-0.2 rounded-full border border-red-500/40">
                  Aktif
                </span>
              )}
            </div>
            <div className="text-[10px] text-gray-400">
              Belirlenen baskı yönüne göre destek gereken yüzeyleri görselleştirir
            </div>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={heatmapConfig.enabled}
            onChange={(e) => onChangeHeatmapConfig({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-750 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 border border-gray-700 peer-checked:border-red-500"></div>
        </label>
      </div>

      {/* 2. Live Support Analytics Card */}
      {heatmapConfig.enabled && overhangStats && (
        <div className="bg-gray-950/80 rounded-2xl p-3.5 border border-gray-800 flex flex-col gap-3 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-300 font-semibold flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-red-400" />
              <span>Canlı Baskı Analizi</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-gray-400">Zorluk:</span>
              <span className={`font-bold font-mono ${overhangStats.difficultyColor}`}>
                {overhangStats.difficulty}
              </span>
            </div>
          </div>

          {/* Progress Breakdown */}
          <div className="flex flex-col gap-1.5">
            <div className="h-2.5 w-full bg-gray-850 rounded-full overflow-hidden flex shadow-inner">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${overhangStats.safePercent}%` }}
                title={`Güvenli Yüzey: %${overhangStats.safePercent.toFixed(1)}`}
              />
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${overhangStats.warnPercent}%` }}
                title={`Sınır / Uyarı: %${overhangStats.warnPercent.toFixed(1)}`}
              />
              <div
                className="bg-red-500 h-full transition-all duration-300"
                style={{ width: `${overhangStats.supportPercent}%` }}
                title={`Kritik Destek: %${overhangStats.supportPercent.toFixed(1)}`}
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-center">
              <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-lg p-1.5 text-emerald-300">
                <div className="text-[9px] text-gray-400">Güvenli</div>
                <div className="font-bold">%{overhangStats.safePercent.toFixed(1)}</div>
              </div>
              <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-1.5 text-amber-300">
                <div className="text-[9px] text-gray-400">Uyarı ({Math.max(5, heatmapConfig.thresholdDeg - heatmapConfig.warnRangeDeg)}°)</div>
                <div className="font-bold">%{overhangStats.warnPercent.toFixed(1)}</div>
              </div>
              <div className="bg-red-950/40 border border-red-800/40 rounded-lg p-1.5 text-red-300">
                <div className="text-[9px] text-gray-400">Destek (&gt;{heatmapConfig.thresholdDeg}°)</div>
                <div className="font-bold">%{overhangStats.supportPercent.toFixed(1)}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-800/80 pt-2 font-mono">
            <span>Destek Gereken Alan:</span>
            <span className="text-red-400 font-bold">
              {overhangStats.supportAreaCm2.toFixed(1)} cm² / {overhangStats.totalAreaCm2.toFixed(1)} cm²
            </span>
          </div>
        </div>
      )}

      {/* 3. Print Orientation Controls */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs text-gray-300 font-semibold">
          <span className="flex items-center gap-1.5">
            <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Baskı Yönelimi (Katman Büyüme Yönü)</span>
          </span>
          <span className="text-[10px] text-cyan-400 font-mono">
            {heatmapConfig.presetId !== 'custom' ? heatmapConfig.presetId : 'Özel'}
          </span>
        </div>

        {/* Orientation Preset Buttons Grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {PRINT_ORIENTATION_PRESETS.map((preset) => {
            const isSelected = heatmapConfig.presetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition border flex flex-col items-center gap-1 text-center ${
                  isSelected
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950/80 ring-1 ring-cyan-400/40'
                    : 'bg-gray-900 hover:bg-gray-800 border-gray-700/80 text-gray-300'
                }`}
                title={preset.description}
              >
                <span>{preset.name}</span>
                <span className="text-[9px] text-gray-400 font-mono">
                  [{preset.vector.x},{preset.vector.y},{preset.vector.z}]
                </span>
              </button>
            );
          })}
        </div>

        {/* Sync with Current 3D Model Rotation Button */}
        {modelRotation && (
          <button
            onClick={onApplyModelRotationAsPrintDir}
            className="w-full py-1.5 px-3 bg-gray-900 hover:bg-gray-850 text-gray-200 rounded-xl text-xs font-semibold border border-gray-700/80 transition flex items-center justify-center gap-2 shadow-sm"
            title="Modelin şu anki döndürme açısına göre yön belirle"
          >
            <RotateCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Mevcut Model Döndürmesine Eşitle</span>
            <span className="text-[10px] text-gray-400 font-mono">
              ({modelRotation.x}°, {modelRotation.y}°, {modelRotation.z}°)
            </span>
          </button>
        )}

        {/* Custom Angle Sliders Toggle */}
        <div className="bg-gray-950/50 p-3 rounded-xl border border-gray-800 flex flex-col gap-2.5">
          <div className="text-[11px] text-gray-400 font-medium">İnce Açı Ayarları (Pitch / Roll):</div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Eğim (Pitch X):</span>
              <span className="font-mono text-cyan-400 font-bold">{heatmapConfig.customPitch}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="5"
              value={heatmapConfig.customPitch}
              onChange={(e) => handleCustomAngleChange('pitch', e.target.value)}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Yana Yatırma (Roll Z):</span>
              <span className="font-mono text-cyan-400 font-bold">{heatmapConfig.customRoll}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="5"
              value={heatmapConfig.customRoll}
              onChange={(e) => handleCustomAngleChange('roll', e.target.value)}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg"
            />
          </div>
        </div>

        {/* 3D Build Plate Visualizer Switch */}
        <div className="flex items-center justify-between bg-gray-900/60 p-2.5 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-cyan-500/20 text-cyan-400">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs text-gray-300 font-medium">3D Baskı Tablası & Yön Oku</span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={heatmapConfig.showBuildPlate}
              onChange={(e) => onChangeHeatmapConfig({ showBuildPlate: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-750 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600 border border-gray-700"></div>
          </label>
        </div>
      </div>

      {/* 4. Threshold & Overhang Angle Slider */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-gray-300 font-semibold">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-red-400" />
            <span>Kritik Destek Eşik Açısı</span>
          </span>
          <span className="text-red-400 font-bold font-mono text-sm">
            {heatmapConfig.thresholdDeg}°
          </span>
        </div>

        <input
          type="range"
          min="20"
          max="75"
          step="1"
          value={heatmapConfig.thresholdDeg}
          onChange={(e) => onChangeHeatmapConfig({ thresholdDeg: parseInt(e.target.value, 10) })}
          className="w-full accent-red-500 cursor-pointer h-2 bg-gray-800 rounded-lg"
        />

        {/* Quick Presets for Angle */}
        <div className="grid grid-cols-4 gap-1">
          {[
            { angle: 40, label: '40° Hassas' },
            { angle: 45, label: '45° FDM' },
            { angle: 55, label: '55° Soğutmalı' },
            { angle: 65, label: '65° Agresif' }
          ].map((item) => (
            <button
              key={item.angle}
              onClick={() => onChangeHeatmapConfig({ thresholdDeg: item.angle })}
              className={`py-1 px-1.5 rounded-lg text-[10px] font-mono font-medium transition border ${
                heatmapConfig.thresholdDeg === item.angle
                  ? 'bg-red-950 border-red-500 text-red-300 font-bold'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Overlay Visual Style Modes */}
      <div className="flex flex-col gap-2">
        <div className="text-xs text-gray-300 font-semibold flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Görselleştirme Modu</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 0, name: 'Termal Isı', desc: 'Yeşil -> Kırmızı geçiş' },
            { id: 1, name: 'Vurgu Modu', desc: 'Sadece destekleri parla' },
            { id: 2, name: 'Zebra Çizgi', desc: 'Slicer tehlike çizgisi' }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => onChangeHeatmapConfig({ mode: mode.id })}
              className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition ${
                heatmapConfig.mode === mode.id
                  ? 'bg-red-950/80 border-red-500 text-white shadow-md ring-1 ring-red-500/30'
                  : 'bg-gray-900 hover:bg-gray-850 border-gray-800 text-gray-300'
              }`}
            >
              <span className="text-xs font-bold">{mode.name}</span>
              <span className="text-[9px] text-gray-400">{mode.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 6. Auto-Optimization Recommendation Card */}
      <div className="bg-indigo-950/40 rounded-2xl p-3.5 border border-indigo-500/30 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-100">Optimal Yön Bulucu</div>
              <div className="text-[10px] text-indigo-300">En az destek gerektiren baskı açısını hesaplar</div>
            </div>
          </div>

          <button
            onClick={handleRunOptimizer}
            disabled={isOptimizing}
            className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-950/80 flex items-center gap-1.5"
          >
            {isOptimizing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{isOptimizing ? 'Analiz Ediliyor...' : 'Analiz Et'}</span>
          </button>
        </div>

        {optimizationResult && (
          <div className="bg-indigo-950/80 rounded-xl p-2.5 border border-indigo-800/60 flex flex-col gap-2 mt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-indigo-200 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Önerilen Yön: {optimizationResult.bestOrientation.name}
              </span>
              <span className="text-emerald-400 font-bold font-mono">
                %{optimizationResult.bestStats.supportPercent.toFixed(1)} Destek
              </span>
            </div>

            <button
              onClick={() => handleApplyPreset(optimizationResult.bestOrientation)}
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Önerilen Yönü Uygula ({optimizationResult.bestOrientation.name})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
