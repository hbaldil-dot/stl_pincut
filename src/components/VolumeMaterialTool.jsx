import React, { useState, useMemo } from 'react';
import {
  Scale,
  Box,
  Layers,
  Sparkles,
  Info,
  Copy,
  Check,
  Coins,
  Ruler,
  Sliders,
  ChevronRight,
  ChevronDown,
  TrendingDown,
  Droplet,
  Flame,
  Zap,
  Tag,
  Scissors,
  Maximize2,
  Paintbrush,
  Activity,
  Shield,
  Gauge,
  Cpu,
  Download,
  FileCode,
  FileSpreadsheet
} from 'lucide-react';
import { downloadMetricsFile } from '../utils/exportMetrics';
import {
  calculateGeometryVolume,
  calculateSurfaceAreaStats,
  formatSurfaceArea,
  calculateModelMass,
  formatMass,
  estimateMaterialRequirement,
  PRINT_MATERIALS,
  INFILL_PRESETS,
  calculateSplitPartsVolumeStats
} from '../utils/volumeCalculator';

export function VolumeMaterialTool({
  model,
  modelInfo,
  splitResult,
  onClose,
  isModal = false,
  showBoundingBox = false,
  onToggleBoundingBox
}) {
  // Volume unit state: 'cm3' | 'mm3' | 'in3'
  const [unit, setUnit] = useState('cm3');

  // Surface area unit state: 'cm2' | 'mm2' | 'in2' | 'dm2'
  const [surfaceUnit, setSurfaceUnit] = useState('cm2');

  // Mass unit state: 'g' | 'kg' | 'oz'
  const [massUnit, setMassUnit] = useState('g');

  // Surface Analysis Section collapse/expand
  const [isSurfaceDetailsOpen, setIsSurfaceDetailsOpen] = useState(true);

  // Coating coats (1 or 2 coats)
  const [coatingCoats, setCoatingCoats] = useState(1);

  // Active material selection & density input state
  const [selectedMaterialId, setSelectedMaterialId] = useState('pla');
  const [densityInput, setDensityInput] = useState('1.24');
  const [customDensity, setCustomDensity] = useState(1.24);

  // Infill and slicer configuration
  const [infillPercent, setInfillPercent] = useState(20);
  const [wallThicknessMm, setWallThicknessMm] = useState(1.2);
  const [useSlicerModel, setUseSlicerModel] = useState(true);
  const [filamentDiameter, setFilamentDiameter] = useState(1.75);

  // Cost and spool configuration
  const [spoolWeightG, setSpoolWeightG] = useState(1000);
  const [spoolCost, setSpoolCost] = useState(22);
  const [currency, setCurrency] = useState('$');

  // Sliced part sub-tab: 'total' | 'partA' | 'partB' | 'dowelPin'
  const [selectedPartView, setSelectedPartView] = useState('total');

  // Copy notification state
  const [isCopied, setIsCopied] = useState(false);

  // Export notification state: null | 'json' | 'csv'
  const [exportedFormat, setExportedFormat] = useState(null);

  const effectiveDensity = Math.max(0.001, parseFloat(densityInput) || 1.24);

  const handleExportMetrics = (format) => {
    downloadMetricsFile({
      modelName: modelInfo?.name || '3D_Model',
      dimensions: modelInfo?.dimensions || {
        x: modelVolumeStats?.bounds?.size?.x,
        y: modelVolumeStats?.bounds?.size?.y,
        z: modelVolumeStats?.bounds?.size?.z
      },
      volumeStats: modelVolumeStats,
      surfaceStats: surfaceStats,
      massStats: solidMassStats,
      density: effectiveDensity,
      meshInfo: {
        triangleCount: modelInfo?.triangleCount || modelVolumeStats?.triangleCount,
        vertexCount: modelInfo?.vertexCount
      }
    }, format);

    setExportedFormat(format);
    setTimeout(() => setExportedFormat(null), 2500);
  };

  // Selected material metadata
  const currentMaterial = useMemo(() => {
    const found = PRINT_MATERIALS.find((m) => m.id === selectedMaterialId);
    const base = found || PRINT_MATERIALS[0];
    return { ...base, density: effectiveDensity };
  }, [selectedMaterialId, effectiveDensity]);

  const handleDensityChange = (val) => {
    setDensityInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setCustomDensity(num);
      const match = PRINT_MATERIALS.find((m) => Math.abs(m.density - num) < 0.005);
      if (match) {
        setSelectedMaterialId(match.id);
      } else {
        setSelectedMaterialId('custom');
      }
    }
  };

  const handleSelectMaterial = (mat) => {
    setSelectedMaterialId(mat.id);
    if (mat.id === 'custom') {
      setDensityInput(customDensity.toString());
    } else {
      setDensityInput(mat.density.toString());
      setCustomDensity(mat.density);
    }
  };

  // Model geometry volume & surface area calculation
  const modelVolumeStats = useMemo(() => {
    if (model?.geometry) {
      return calculateGeometryVolume(model.geometry, model.scale);
    }
    if (modelInfo) {
      const vCm3 = modelInfo.volumeCm3 || 0;
      const saCm2 = modelInfo.surfaceAreaCm2 || 0;
      return {
        volumeMm3: Math.round(vCm3 * 1000),
        volumeCm3: vCm3,
        volumeLiters: parseFloat((vCm3 / 1000).toFixed(4)),
        volumeIn3: parseFloat((vCm3 / 16.387).toFixed(2)),
        surfaceAreaMm2: Math.round(saCm2 * 100),
        surfaceAreaCm2: saCm2,
        surfaceAreaDm2: parseFloat((saCm2 / 100).toFixed(3)),
        surfaceAreaM2: parseFloat((saCm2 / 10000).toFixed(5)),
        surfaceAreaIn2: parseFloat((saCm2 / 6.4516).toFixed(2)),
        triangleCount: modelInfo.triangleCount || 0,
        averageTriangleAreaMm2: modelInfo.triangleCount > 0 ? (saCm2 * 100) / modelInfo.triangleCount : 0
      };
    }
    return {
      volumeMm3: 0,
      volumeCm3: 0,
      volumeLiters: 0,
      volumeIn3: 0,
      surfaceAreaMm2: 0,
      surfaceAreaCm2: 0,
      surfaceAreaDm2: 0,
      surfaceAreaM2: 0,
      surfaceAreaIn2: 0,
      triangleCount: 0,
      averageTriangleAreaMm2: 0
    };
  }, [model, modelInfo]);

  // Total solid model mass calculation (m = V * rho)
  const solidMassStats = useMemo(() => {
    return calculateModelMass(modelVolumeStats.volumeCm3, effectiveDensity);
  }, [modelVolumeStats.volumeCm3, effectiveDensity]);

  // Complementary Surface Area Statistics (SA:V ratio, Sphericity, Coatings)
  const surfaceStats = useMemo(() => {
    return calculateSurfaceAreaStats(
      modelVolumeStats.surfaceAreaMm2,
      modelVolumeStats.volumeMm3,
      modelInfo?.dimensions
    );
  }, [modelVolumeStats, modelInfo?.dimensions]);

  // Multi-part split calculation if model is cut
  const splitStats = useMemo(() => {
    if (!splitResult) return null;
    return calculateSplitPartsVolumeStats(splitResult, {
      surfaceAreaMm2: modelVolumeStats.surfaceAreaMm2,
      density: currentMaterial.density,
      infillPercent,
      wallThicknessMm,
      filamentDiameter,
      spoolWeightG,
      spoolCost,
      currency,
      useSlicerModel
    });
  }, [
    splitResult,
    modelVolumeStats.surfaceAreaMm2,
    currentMaterial.density,
    infillPercent,
    wallThicknessMm,
    filamentDiameter,
    spoolWeightG,
    spoolCost,
    currency,
    useSlicerModel
  ]);

  // Overall active material estimates
  const materialEstimates = useMemo(() => {
    return estimateMaterialRequirement({
      volumeMm3: modelVolumeStats.volumeMm3,
      surfaceAreaMm2: modelVolumeStats.surfaceAreaMm2,
      density: currentMaterial.density,
      infillPercent,
      wallThicknessMm,
      filamentDiameter,
      spoolWeightG,
      spoolCost,
      currency,
      useSlicerModel
    });
  }, [
    modelVolumeStats,
    currentMaterial.density,
    infillPercent,
    wallThicknessMm,
    filamentDiameter,
    spoolWeightG,
    spoolCost,
    currency,
    useSlicerModel
  ]);

  // Bounding box compactness ratio
  const boundingBoxCompactness = useMemo(() => {
    if (!modelInfo?.dimensions) return null;
    const { x, y, z } = modelInfo.dimensions;
    const bboxMm3 = x * y * z;
    if (bboxMm3 <= 0) return null;
    const ratio = (modelVolumeStats.volumeMm3 / bboxMm3) * 100;
    return Math.min(100, Math.max(1, ratio)).toFixed(1);
  }, [modelInfo, modelVolumeStats]);

  // Format volume value based on selected unit
  const formatVolume = (cm3Val, mm3Val) => {
    if (unit === 'mm3') {
      const v = mm3Val ?? cm3Val * 1000;
      return `${Math.round(v).toLocaleString('tr-TR')} mm³`;
    }
    if (unit === 'in3') {
      const v = (mm3Val ?? cm3Val * 1000) / 16387.064;
      return `${v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in³`;
    }
    const v = cm3Val ?? mm3Val / 1000;
    return `${v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cm³`;
  };

  // Format surface area based on selected unit
  const formatArea = (cm2Val, mm2Val) => {
    return formatSurfaceArea(cm2Val, mm2Val, surfaceUnit);
  };

  // Copy specifications to clipboard
  const handleCopySummary = () => {
    const lines = [
      `--- 3D Model Hacim, Yüzey Alanı ve Malzeme Raporu ---`,
      `Model: ${modelInfo?.name || '3D Model'}`,
      `Toplam Katı Hacim: ${modelVolumeStats.volumeCm3.toFixed(2)} cm³ (${Math.round(modelVolumeStats.volumeMm3).toLocaleString('tr-TR')} mm³ / ${modelVolumeStats.volumeIn3} in³)`,
      `Toplam Yüzey Alanı: ${modelVolumeStats.surfaceAreaCm2.toFixed(2)} cm² (${Math.round(modelVolumeStats.surfaceAreaMm2).toLocaleString('tr-TR')} mm² / ${modelVolumeStats.surfaceAreaIn2} in² / ${modelVolumeStats.surfaceAreaM2} m²)`,
      `Toplam Katı Model Kütlesi (100% Solid): ${solidMassStats.formattedGrams} (${solidMassStats.formattedKg} / ${solidMassStats.formattedOz} / ${solidMassStats.formattedLb}) [Tanımlı Yoğunluk: ${effectiveDensity} g/cm³]`,
      `Yüzey / Hacim Oranı (SA:V): ${surfaceStats.saToVolCm} cm⁻¹ (${surfaceStats.saToVolMm} mm⁻¹ - ${surfaceStats.classificationLabel})`,
      `Geometrik Sferisite (Küre Kompaktlığı): %${surfaceStats.sphericityPercent}`,
      `Astar / Boya Kaplama Gereksinimi: ~${surfaceStats.coating.primerSingleCoatMl} ml (Tek Kat) / ~${surfaceStats.coating.primerTwoCoatsMl} ml (Çift Kat)`,
      `Seçilen Malzeme: ${currentMaterial.name} (Yoğunluk: ${currentMaterial.density} g/cm³)`,
      `Dolgu Oranı (Infill): %${infillPercent}`,
      `Efektif Baskı Hacmi: ${materialEstimates.effectiveVolumeCm3} cm³`,
      `Tahmini Baskı Ağırlığı: ${materialEstimates.weightGrams} g (${materialEstimates.weightKg} kg)`,
      `Filament Uzunluğu (Ø${filamentDiameter}mm): ${materialEstimates.filamentLengthMeters} metre`,
      `1kg Makaradan Baskı Adedi: ~${materialEstimates.printsPerSpool} adet`,
      `Tahmini Malzeme Maliyeti: ${currency}${materialEstimates.cost}`
    ];
    if (splitResult && splitStats) {
      lines.push('');
      lines.push(`-- Kesilmiş Parça Dağılımı --`);
      if (splitStats.partA?.stats) {
        lines.push(`Parça 1 (Pimli): Hacim ${splitStats.partA.stats.volumeCm3} cm³ • Yüzey: ${splitStats.partA.stats.surfaceAreaCm2} cm² • ${splitStats.partA.material.weightGrams} g`);
      }
      if (splitStats.partB?.stats) {
        lines.push(`Parça 2 (Yuvalı): Hacim ${splitStats.partB.stats.volumeCm3} cm³ • Yüzey: ${splitStats.partB.stats.surfaceAreaCm2} cm² • ${splitStats.partB.material.weightGrams} g`);
      }
      if (splitStats.dowelPin?.stats) {
        lines.push(`Dübel Pimi: Hacim ${splitStats.dowelPin.stats.volumeCm3} cm³ • Yüzey: ${splitStats.dowelPin.stats.surfaceAreaCm2} cm² • ${splitStats.dowelPin.material.weightGrams} g`);
      }
      if (splitStats.total.cutInterfaceAreaCm2) {
        lines.push(`Kesit Birleşim / Yapışma Yüzey Alanı: ${splitStats.total.cutInterfaceAreaCm2} cm²`);
      }
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    });
  };

  return (
    <div className="flex flex-col gap-4 text-xs select-none">
      {/* 1. Triple Complementary Hero Metric Cards (Solid Volume, Total Surface Area, Total Solid Mass) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Hero Card A: Solid Volume */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950/30 p-3.5 rounded-2xl border border-emerald-500/30 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/30 shadow-inner">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-medium">Model Katı Hacmi (Volume)</span>
                <div className="text-lg font-black font-mono tracking-tight text-white flex items-baseline gap-2">
                  <span>{formatVolume(modelVolumeStats.volumeCm3, modelVolumeStats.volumeMm3)}</span>
                </div>
              </div>
            </div>

            {/* Volume Unit Toggle: cm³ vs mm³ vs in³ */}
            <div className="flex items-center bg-gray-950 p-1 rounded-xl border border-gray-800 shadow-inner">
              <button
                onClick={() => setUnit('cm3')}
                className={`px-2 py-0.5 rounded-lg font-mono font-bold transition text-[11px] ${
                  unit === 'cm3'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/60'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Santimetreküp (cm³)"
              >
                cm³
              </button>
              <button
                onClick={() => setUnit('mm3')}
                className={`px-2 py-0.5 rounded-lg font-mono font-bold transition text-[11px] ${
                  unit === 'mm3'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/60'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Milimetreküp (mm³)"
              >
                mm³
              </button>
              <button
                onClick={() => setUnit('in3')}
                className={`px-2 py-0.5 rounded-lg font-mono font-bold transition text-[11px] ${
                  unit === 'in3'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/60'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="İnçküp (in³)"
              >
                in³
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800/80 text-[11px]">
            <div className="bg-gray-950/60 p-2 rounded-xl border border-gray-800/80">
              <span className="text-[10px] text-gray-400 block">Litre Eşdeğeri:</span>
              <span className="font-mono font-bold text-gray-200">
                {modelVolumeStats.volumeLiters} L
              </span>
            </div>
            <div className="bg-gray-950/60 p-2 rounded-xl border border-gray-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 block">BBox Doluluk:</span>
                <span className="font-mono font-bold text-cyan-300">
                  %{boundingBoxCompactness || '—'}
                </span>
              </div>
              {onToggleBoundingBox && (
                <button
                  type="button"
                  onClick={onToggleBoundingBox}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition flex items-center gap-1 ${
                    showBoundingBox
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow'
                      : 'bg-gray-900 text-cyan-300 border-gray-700 hover:bg-gray-850'
                  }`}
                  title="3D Sahnede Modelin AABB Tel Kafesini Göster/Gizle"
                >
                  <Box className="w-3 h-3" />
                  <span>{showBoundingBox ? 'AABB Açık' : 'AABB'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hero Card B: Total Surface Area (Complementary Metric) */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-teal-950/30 p-3.5 rounded-2xl border border-teal-500/30 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl border border-teal-400/30 shadow-inner">
                <Maximize2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-medium">Toplam Yüzey Alanı (Surface Area)</span>
                <div className="text-lg font-black font-mono tracking-tight text-teal-300 flex items-baseline gap-2">
                  <span>{formatArea(modelVolumeStats.surfaceAreaCm2, modelVolumeStats.surfaceAreaMm2)}</span>
                </div>
              </div>
            </div>

            {/* Surface Unit Toggle: cm² vs mm² vs in² */}
            <div className="flex items-center bg-gray-950 p-1 rounded-xl border border-gray-800 shadow-inner">
              <button
                onClick={() => setSurfaceUnit('cm2')}
                className={`px-2 py-0.5 rounded-lg font-mono font-bold transition text-[11px] ${
                  surfaceUnit === 'cm2'
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-900/60'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Santimetrekare (cm²)"
              >
                cm²
              </button>
              <button
                onClick={() => setSurfaceUnit('mm2')}
                className={`px-2 py-0.5 rounded-lg font-mono font-bold transition text-[11px] ${
                  surfaceUnit === 'mm2'
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-900/60'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Milimetrekare (mm²)"
              >
                mm²
              </button>
              <button
                onClick={() => setSurfaceUnit('in2')}
                className={`px-2 py-0.5 rounded-lg font-mono font-bold transition text-[11px] ${
                  surfaceUnit === 'in2'
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-900/60'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="İnçkare (in²)"
              >
                in²
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800/80 text-[11px]">
            <div className="bg-gray-950/60 p-2 rounded-xl border border-gray-800/80">
              <span className="text-[10px] text-gray-400 block">Metrekare (m²):</span>
              <span className="font-mono font-bold text-gray-200">
                {modelVolumeStats.surfaceAreaM2} m²
              </span>
            </div>
            <div className="bg-gray-950/60 p-2 rounded-xl border border-gray-800/80">
              <span className="text-[10px] text-gray-400 block">SA:V Oranı:</span>
              <span className="font-mono font-bold text-amber-300">
                {surfaceStats.saToVolCm} cm⁻¹
              </span>
            </div>
          </div>
        </div>

        {/* Hero Card C: Total Solid Mass (m = V * rho) */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-amber-950/30 p-3.5 rounded-2xl border border-amber-500/30 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30 shadow-inner">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-medium">Toplam Katı Kütle (Mass)</span>
                <div className="text-lg font-black font-mono tracking-tight text-amber-300 flex items-baseline gap-2">
                  <span>
                    {massUnit === 'kg'
                      ? solidMassStats.formattedKg
                      : massUnit === 'oz'
                      ? solidMassStats.formattedOz
                      : massUnit === 'lb'
                      ? solidMassStats.formattedLb
                      : solidMassStats.formattedGrams}
                  </span>
                </div>
              </div>
            </div>

            {/* Mass Unit Toggle: g vs kg vs oz vs lb */}
            <div className="flex items-center bg-gray-950 p-1 rounded-xl border border-gray-800 shadow-inner">
              <button
                onClick={() => setMassUnit('g')}
                className={`px-2 py-0.5 rounded-lg font-mono font-bold transition text-[11px] ${
                  massUnit === 'g'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-900/60'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Gram (g)"
              >
                g
              </button>
              <button
                onClick={() => setMassUnit('kg')}
                className={`px-2 py-0.5 rounded-lg font-mono font-bold transition text-[11px] ${
                  massUnit === 'kg'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-900/60'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Kilogram (kg)"
              >
                kg
              </button>
              <button
                onClick={() => setMassUnit('oz')}
                className={`px-2 py-0.5 rounded-lg font-mono font-bold transition text-[11px] ${
                  massUnit === 'oz'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-900/60'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Ons (oz)"
              >
                oz
              </button>
              <button
                onClick={() => setMassUnit('lb')}
                className={`px-2 py-0.5 rounded-lg font-mono font-bold transition text-[11px] ${
                  massUnit === 'lb'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-900/60'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Pound (lb)"
              >
                lb
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800/80 text-[11px]">
            <div className="bg-gray-950/60 p-2 rounded-xl border border-gray-800/80">
              <span className="text-[10px] text-gray-400 block">Etkin Yoğunluk:</span>
              <span className="font-mono font-bold text-gray-200">
                {effectiveDensity} g/cm³
              </span>
            </div>
            <div className="bg-gray-950/60 p-2 rounded-xl border border-gray-800/80">
              <span className="text-[10px] text-gray-400 block">Baskı (%{infillPercent}):</span>
              <span className="font-mono font-bold text-emerald-300">
                {formatMass(materialEstimates.weightGrams, massUnit)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Comprehensive Surface Area & Geometry Analysis Card */}
      <div className="bg-gray-900/90 p-3.5 rounded-2xl border border-gray-800 shadow-lg space-y-3">
        <div
          className="flex items-center justify-between cursor-pointer group"
          onClick={() => setIsSurfaceDetailsOpen((prev) => !prev)}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/30">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <span>Yüzey Alanı, SA:V Oranı ve Kaplama Analizi</span>
                <span
                  className="text-[9px] px-2 py-0.2 rounded-full font-mono font-semibold"
                  style={{ backgroundColor: `${surfaceStats.badgeColor}25`, color: surfaceStats.badgeColor, border: `1px solid ${surfaceStats.badgeColor}50` }}
                >
                  {surfaceStats.classificationLabel}
                </span>
              </h3>
              <p className="text-[10px] text-gray-400">
                Yüzey/hacim oranı, sferisite kompaktlığı ve astar/boya kaplama tahmini
              </p>
            </div>
          </div>

          <button
            type="button"
            className="p-1 text-gray-400 hover:text-white rounded-lg transition"
          >
            {isSurfaceDetailsOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {isSurfaceDetailsOpen && (
          <div className="space-y-3 pt-2 border-t border-gray-800">
            {/* Metric Grid: SA:V Ratio, Sphericity, Triangle Area */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* SA:V Ratio Card */}
              <div className="bg-gray-950/70 p-2.5 rounded-xl border border-gray-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium">Yüzey / Hacim (SA:V)</span>
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-base font-black font-mono text-amber-300">
                  {surfaceStats.saToVolCm} <span className="text-[10px] font-normal text-gray-400">cm⁻¹</span>
                </div>
                <div className="text-[9px] text-gray-400 font-mono">
                  ({surfaceStats.saToVolMm} mm⁻¹)
                </div>
                <p className="text-[9px] text-gray-400 leading-tight pt-1">
                  {surfaceStats.classificationDesc}
                </p>
              </div>

              {/* Sphericity Metric */}
              <div className="bg-gray-950/70 p-2.5 rounded-xl border border-gray-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium">Geometrik Sferisite (Ψ)</span>
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-base font-black font-mono text-purple-300">
                  %{surfaceStats.sphericityPercent}
                </div>
                <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-teal-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(5, surfaceStats.sphericityPercent))}%` }}
                  />
                </div>
                <p className="text-[9px] text-gray-400 leading-tight pt-1">
                  Aynı hacimdeki ideal küreye kıyasla kompaktlık oranı (Min. alan: {surfaceStats.sphereAreaCm2} cm²).
                </p>
              </div>

              {/* Mesh Polygon & Triangle Quality */}
              <div className="bg-gray-950/70 p-2.5 rounded-xl border border-gray-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium">Ağ / Üçgen & Vertex Sayımı</span>
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-base font-black font-mono text-cyan-300">
                  {modelVolumeStats.triangleCount.toLocaleString('tr-TR')} <span className="text-[10px] font-normal text-gray-400">üçgen</span>
                </div>
                <div className="text-[10px] text-gray-300 font-mono flex items-center justify-between pt-0.5">
                  <span className="text-gray-400">Tepe Noktası (Vertex):</span>
                  <strong className="text-white font-mono">
                    {(modelInfo?.vertexCount || (modelVolumeStats.triangleCount > 0 ? modelVolumeStats.triangleCount * 3 : 0)).toLocaleString('tr-TR')}
                  </strong>
                </div>
                <div className="text-[10px] text-gray-300 font-mono">
                  Ortalama: <strong className="text-white">{modelVolumeStats.averageTriangleAreaMm2} mm²</strong> / poligon
                </div>
                {surfaceStats.bbox && (
                  <p className="text-[9px] text-gray-400 leading-tight pt-1">
                    Kutusal sınır alanına oranı: %{surfaceStats.bbox.areaRatioPercent}
                  </p>
                )}
              </div>
            </div>

            {/* Practical Application: Primer, Paint & Finishing Estimator */}
            <div className="bg-teal-950/20 border border-teal-500/30 p-3 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-300">
                  <Paintbrush className="w-3.5 h-3.5 text-teal-400" />
                  <span>Yüzey Kaplama, Astar & Boya Tüketimi</span>
                </div>

                <div className="flex items-center gap-1 bg-gray-950/80 p-0.5 rounded-lg border border-teal-500/40 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setCoatingCoats(1)}
                    className={`px-2 py-0.5 rounded ${coatingCoats === 1 ? 'bg-teal-600 text-white font-bold' : 'text-gray-400'}`}
                  >
                    1 Kat
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoatingCoats(2)}
                    className={`px-2 py-0.5 rounded ${coatingCoats === 2 ? 'bg-teal-600 text-white font-bold' : 'text-gray-400'}`}
                  >
                    2 Kat
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="bg-gray-950/60 p-2 rounded-lg border border-gray-800">
                  <span className="text-gray-400 block">Sprey / Astar Hacmi</span>
                  <span className="font-mono font-bold text-teal-300 text-xs">
                    ~{coatingCoats === 1 ? surfaceStats.coating.primerSingleCoatMl : surfaceStats.coating.primerTwoCoatsMl} ml
                  </span>
                </div>
                <div className="bg-gray-950/60 p-2 rounded-lg border border-gray-800">
                  <span className="text-gray-400 block">400ml Aerosol Kutu</span>
                  <span className="font-mono font-bold text-amber-300 text-xs">
                    ~{(surfaceStats.coating.sprayCansNeeded * coatingCoats).toFixed(2)} kutu
                  </span>
                </div>
                <div className="bg-gray-950/60 p-2 rounded-lg border border-gray-800">
                  <span className="text-gray-400 block">Daldırma / Vernik</span>
                  <span className="font-mono font-bold text-cyan-300 text-xs">
                    ~{(surfaceStats.coating.resinDipCoatMl * (coatingCoats === 1 ? 1 : 1.7)).toFixed(1)} ml
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Sliced Model Multi-Part Volume & Surface Breakdown (If Model is Split) */}
      {splitResult && splitStats && (
        <div className="bg-gray-900/80 p-3.5 rounded-2xl border border-amber-500/40 shadow-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <Scissors className="w-4 h-4 text-amber-400" />
              <span>Kesilmiş Parçaların Hacim & Yüzey Dağılımı</span>
            </div>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
              2 Parça + Pim
            </span>
          </div>

          {/* Sub-tabs for parts */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-gray-950 rounded-xl border border-gray-800">
            <button
              onClick={() => setSelectedPartView('total')}
              className={`py-1.5 px-2 rounded-lg text-center transition font-semibold text-[11px] ${
                selectedPartView === 'total'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Toplam
            </button>
            <button
              onClick={() => setSelectedPartView('partA')}
              className={`py-1.5 px-2 rounded-lg text-center transition font-semibold text-[11px] ${
                selectedPartView === 'partA'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Parça A
            </button>
            <button
              onClick={() => setSelectedPartView('partB')}
              className={`py-1.5 px-2 rounded-lg text-center transition font-semibold text-[11px] ${
                selectedPartView === 'partB'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Parça B
            </button>
            <button
              onClick={() => setSelectedPartView('dowelPin')}
              className={`py-1.5 px-2 rounded-lg text-center transition font-semibold text-[11px] ${
                selectedPartView === 'dowelPin'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Pim / Dübel
            </button>
          </div>

          {/* Part details card */}
          {selectedPartView === 'total' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-950/60 p-2.5 rounded-xl border border-gray-800 text-center">
                <div>
                  <span className="text-[10px] text-gray-400 block">Toplam Hacim</span>
                  <span className="font-mono font-bold text-amber-300 text-xs">
                    {formatVolume(splitStats.total.volumeCm3, splitStats.total.volumeMm3)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Toplam Yüzey Alanı</span>
                  <span className="font-mono font-bold text-teal-300 text-xs">
                    {formatArea(splitStats.total.surfaceAreaCm2, splitStats.total.surfaceAreaMm2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Toplam Ağırlık</span>
                  <span className="font-mono font-bold text-emerald-300 text-xs">
                    {splitStats.total.weightGrams} g
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Toplam Filament</span>
                  <span className="font-mono font-bold text-cyan-300 text-xs">
                    {splitStats.total.filamentLengthMeters} m
                  </span>
                </div>
              </div>

              {splitStats.total.cutInterfaceAreaCm2 && (
                <div className="bg-amber-950/30 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center justify-between text-[11px]">
                  <span className="text-amber-200 font-semibold">Kesit Birleşim / Yapışma Yüzeyi Alanı:</span>
                  <span className="font-mono font-bold text-amber-300">
                    {formatArea(splitStats.total.cutInterfaceAreaCm2, splitStats.total.cutInterfaceAreaMm2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {selectedPartView === 'partA' && splitStats.partA?.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-cyan-950/20 p-2.5 rounded-xl border border-cyan-500/30 text-center">
              <div>
                <span className="text-[10px] text-gray-400 block">Parça A Hacmi</span>
                <span className="font-mono font-bold text-cyan-300 text-xs">
                  {formatVolume(splitStats.partA.stats.volumeCm3, splitStats.partA.stats.volumeMm3)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">Yüzey Alanı</span>
                <span className="font-mono font-bold text-teal-300 text-xs">
                  {formatArea(splitStats.partA.stats.surfaceAreaCm2, splitStats.partA.stats.surfaceAreaMm2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">Filament Ağırlığı</span>
                <span className="font-mono font-bold text-emerald-300 text-xs">
                  {formatMass(splitStats.partA.material.weightGrams, massUnit)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">Gereken Filament</span>
                <span className="font-mono font-bold text-gray-200 text-xs">
                  {splitStats.partA.material.filamentLengthMeters} m
                </span>
              </div>
            </div>
          )}

          {selectedPartView === 'partB' && splitStats.partB?.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/30 text-center">
              <div>
                <span className="text-[10px] text-gray-400 block">Parça B Hacmi</span>
                <span className="font-mono font-bold text-emerald-300 text-xs">
                  {formatVolume(splitStats.partB.stats.volumeCm3, splitStats.partB.stats.volumeMm3)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">Yüzey Alanı</span>
                <span className="font-mono font-bold text-teal-300 text-xs">
                  {formatArea(splitStats.partB.stats.surfaceAreaCm2, splitStats.partB.stats.surfaceAreaMm2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">Filament Ağırlığı</span>
                <span className="font-mono font-bold text-emerald-300 text-xs">
                  {formatMass(splitStats.partB.material.weightGrams, massUnit)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">Gereken Filament</span>
                <span className="font-mono font-bold text-gray-200 text-xs">
                  {splitStats.partB.material.filamentLengthMeters} m
                </span>
              </div>
            </div>
          )}

          {selectedPartView === 'dowelPin' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-purple-950/20 p-2.5 rounded-xl border border-purple-500/30 text-center">
              <div>
                <span className="text-[10px] text-gray-400 block">Pim Hacmi (%100 Katı)</span>
                <span className="font-mono font-bold text-purple-300 text-xs">
                  {splitStats.dowelPin?.stats
                    ? formatVolume(splitStats.dowelPin.stats.volumeCm3, splitStats.dowelPin.stats.volumeMm3)
                    : '< 0.5 cm³'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">Pim Yüzey Alanı</span>
                <span className="font-mono font-bold text-teal-300 text-xs">
                  {splitStats.dowelPin?.stats
                    ? formatArea(splitStats.dowelPin.stats.surfaceAreaCm2, splitStats.dowelPin.stats.surfaceAreaMm2)
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">Pim Ağırlığı</span>
                <span className="font-mono font-bold text-emerald-300 text-xs">
                  {splitStats.dowelPin?.material?.weightGrams || 0.4} g
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">Gereken Filament</span>
                <span className="font-mono font-bold text-gray-200 text-xs">
                  {splitStats.dowelPin?.material?.filamentLengthMeters || 0.15} m
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Material (Filament / Resin) Selection & Density Definition */}
      <div className="bg-gray-900/80 p-3.5 rounded-2xl border border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200">
            <Droplet className="w-4 h-4 text-cyan-400" />
            <span>Baskı Malzemesi & Yoğunluk Tanımı (Density)</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-full">
            {effectiveDensity} g/cm³
          </span>
        </div>

        {/* Dedicated Material Density Input Field & Presets Dropdown */}
        <div className="bg-gray-950/90 p-3 rounded-xl border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
          <div>
            <span className="text-[11px] font-semibold text-gray-200 block">
              Malzeme Yoğunluğu (g/cm³)
            </span>
            <span className="text-[10px] text-gray-400 block">
              Açılır menüden hazır önayar seçin veya doğrudan yoğunluk değeri girin
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Common Material Presets Dropdown Menu */}
            <select
              value={
                PRINT_MATERIALS.find(
                  (m) => m.id !== 'custom' && Math.abs(m.density - parseFloat(densityInput)) < 0.005
                )?.id || (selectedMaterialId !== 'custom' ? selectedMaterialId : '')
              }
              onChange={(e) => {
                const found = PRINT_MATERIALS.find((m) => m.id === e.target.value);
                if (found) {
                  handleSelectMaterial(found);
                }
              }}
              className="bg-gray-900 border border-gray-700 hover:border-cyan-500/60 focus:border-cyan-400 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
              title="Yaygın Malzeme Önayarları (PLA, PETG, ABS, Reçine, Alüminyum...)"
            >
              <option value="" disabled>
                Önayar Seç...
              </option>
              {PRINT_MATERIALS.filter((m) => m.id !== 'custom').map((mat) => (
                <option key={mat.id} value={mat.id} className="bg-gray-900 text-gray-200">
                  {mat.shortName || mat.name}: {mat.density} g/cm³
                </option>
              ))}
            </select>

            <input
              type="number"
              step="0.01"
              min="0.01"
              max="30"
              value={densityInput}
              onChange={(e) => handleDensityChange(e.target.value)}
              className="w-20 bg-gray-900 border border-cyan-500/50 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-right font-mono font-bold text-white text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 shadow-inner"
              placeholder="1.24"
              title="Yoğunluk değerini elle girin"
            />
            <span className="text-[11px] font-mono text-cyan-400 font-semibold bg-gray-900 px-2 py-1.5 rounded-lg border border-gray-800">
              g/cm³
            </span>
          </div>
        </div>

        {/* Automatic Total Mass Calculation Summary Banner */}
        <div className="bg-gradient-to-r from-amber-950/40 via-gray-950 to-emerald-950/40 border border-amber-500/30 p-2.5 rounded-xl flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-gray-300 block font-medium">Model Katı Kütlesi (Mass):</span>
              <span className="text-[10px] text-gray-500 font-mono">
                {modelVolumeStats.volumeCm3.toFixed(2)} cm³ × {effectiveDensity} g/cm³
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-black text-amber-300 text-sm">
              {massUnit === 'kg'
                ? solidMassStats.formattedKg
                : massUnit === 'oz'
                ? solidMassStats.formattedOz
                : massUnit === 'lb'
                ? solidMassStats.formattedLb
                : solidMassStats.formattedGrams}
            </div>
            <div className="text-[10px] font-mono text-gray-400">
              {massUnit !== 'g' && solidMassStats.formattedGrams}
              {massUnit === 'g' && `(${solidMassStats.formattedKg} / ${solidMassStats.formattedLb})`}
            </div>
          </div>
        </div>

        {/* Material Preset Buttons */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {PRINT_MATERIALS.map((mat) => {
            const isSelected = selectedMaterialId === mat.id;
            return (
              <button
                key={mat.id}
                onClick={() => handleSelectMaterial(mat)}
                className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                  isSelected
                    ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md shadow-emerald-950/50'
                    : 'bg-gray-950/60 hover:bg-gray-800/80 border-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full border border-white/20"
                  style={{ backgroundColor: mat.color }}
                />
                <span className="font-bold text-[11px] truncate w-full">{mat.shortName}</span>
                <span className="text-[9px] font-mono opacity-80">{mat.density} g/cm³</span>
              </button>
            );
          })}
        </div>

        {/* Selected material profile details */}
        <div className="bg-gray-950/60 p-2.5 rounded-xl border border-gray-800/80 flex items-start gap-2 text-[11px] text-gray-400">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="leading-snug">
            <strong className="text-gray-200">{currentMaterial.name}: </strong>
            <span>{currentMaterial.description} </span>
            {currentMaterial.typicalTemp && currentMaterial.typicalTemp !== '—' && (
              <span className="text-emerald-400 font-mono">
                [Nozül: {currentMaterial.typicalTemp}, Tabla: {currentMaterial.bedTemp}]
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 5. Infill & Slicer Shell Configuration */}
      <div className="bg-gray-900/80 p-3.5 rounded-2xl border border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200">
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>Dolgu Oranı (Infill) & Slicer Simülasyonu</span>
          </div>
          <span className="text-xs font-mono font-black text-purple-300 bg-purple-950/80 border border-purple-500/30 px-2 py-0.5 rounded-full">
            %{infillPercent}
          </span>
        </div>

        {/* Infill Preset Buttons */}
        <div className="grid grid-cols-5 gap-1">
          {INFILL_PRESETS.map((preset) => {
            const isActive = infillPercent === preset.percent;
            return (
              <button
                key={preset.percent}
                onClick={() => setInfillPercent(preset.percent)}
                className={`py-1.5 px-1 rounded-xl text-center border transition ${
                  isActive
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-950/60 font-bold'
                    : 'bg-gray-950/60 hover:bg-gray-800 text-gray-400 hover:text-gray-200 border-gray-800 text-[10px]'
                }`}
                title={preset.desc}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Infill Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
            <span>%0 (İçi Boş Kabuk)</span>
            <span>%50 (Mekanik)</span>
            <span>%100 (Katı)</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={infillPercent}
            onChange={(e) => setInfillPercent(parseInt(e.target.value, 10))}
            className="w-full accent-purple-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Slicer Wall / Shell Thickness Toggle */}
        <div className="bg-gray-950/60 p-2.5 rounded-xl border border-gray-800 flex items-center justify-between text-[11px]">
          <div>
            <span className="text-gray-300 font-semibold block">Akıllı Kabuk + Dolgu Modeli</span>
            <span className="text-[10px] text-gray-400">
              Gerçekçi slicer perimetre duvarı + iç dolgu kafesi
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={wallThicknessMm}
              onChange={(e) => setWallThicknessMm(parseFloat(e.target.value))}
              disabled={!useSlicerModel}
              className="bg-gray-900 border border-gray-700 text-gray-200 rounded-lg px-2 py-1 text-xs font-mono"
            >
              <option value="0.8">0.8 mm (2 Duvar)</option>
              <option value="1.2">1.2 mm (3 Duvar)</option>
              <option value="1.6">1.6 mm (4 Duvar)</option>
              <option value="2.0">2.0 mm (5 Duvar)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 6. 3D Print Material & Cost Estimates */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-cyan-950/30 p-4 rounded-2xl border border-cyan-500/40 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-500/20 text-cyan-300 rounded-lg border border-cyan-400/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Tahmini 3D Baskı Gereksinimi</h3>
              <p className="text-[10px] text-gray-400">Filament uzunluğu, ağırlık ve maliyet</p>
            </div>
          </div>

          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-500/40 font-bold">
            Efektif: {materialEstimates.effectiveVolumeCm3} cm³
          </span>
        </div>

        {/* 4-Stat Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Filament Mass */}
          <div className="bg-gray-950/70 p-2.5 rounded-xl border border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 block font-medium">Baskı Ağırlığı</span>
              <span className="text-[9px] font-mono text-amber-400 font-bold uppercase">({massUnit})</span>
            </div>
            <span className="text-base font-black font-mono text-emerald-400">
              {formatMass(materialEstimates.weightGrams, massUnit)}
            </span>
            <span className="text-[9px] text-gray-400 block font-mono">
              {massUnit !== 'g' ? `(${materialEstimates.weightGrams} g)` : `(${materialEstimates.weightKg} kg)`}
            </span>
          </div>

          {/* Filament Length */}
          <div className="bg-gray-950/70 p-2.5 rounded-xl border border-gray-800">
            <span className="text-[10px] text-gray-400 block font-medium">Filament Boyu</span>
            <span className="text-base font-black font-mono text-cyan-400">
              {materialEstimates.filamentLengthMeters} m
            </span>
            <span className="text-[9px] text-gray-400 block font-mono">(Ø{filamentDiameter} mm)</span>
          </div>

          {/* Spool Usage */}
          <div className="bg-gray-950/70 p-2.5 rounded-xl border border-gray-800">
            <span className="text-[10px] text-gray-400 block font-medium">1kg Makara Tüketimi</span>
            <span className="text-base font-black font-mono text-amber-400">
              %{materialEstimates.spoolUsagePercent}
            </span>
            <span className="text-[9px] text-emerald-400 block font-medium">
              ~{materialEstimates.printsPerSpool} baskı / makara
            </span>
          </div>

          {/* Estimated Cost */}
          <div className="bg-gray-950/70 p-2.5 rounded-xl border border-gray-800">
            <span className="text-[10px] text-gray-400 block font-medium">Tahmini Maliyet</span>
            <span className="text-base font-black font-mono text-rose-400">
              {currency}{materialEstimates.cost}
            </span>
            <span className="text-[9px] text-gray-400 block font-mono">
              ({currency}{spoolCost}/kg makara)
            </span>
          </div>
        </div>

        {/* Cost & Spool Settings Row */}
        <div className="bg-gray-950/60 p-2.5 rounded-xl border border-gray-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-gray-300">Makara Fiyatı:</span>
            <input
              type="number"
              min="1"
              max="200"
              value={spoolCost}
              onChange={(e) => setSpoolCost(parseFloat(e.target.value) || 0)}
              className="w-16 bg-gray-900 border border-gray-700 rounded-lg px-2 py-0.5 font-mono text-white text-center font-bold"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-gray-200 rounded-lg px-1.5 py-0.5 font-mono font-bold"
            >
              <option value="$">$ (USD)</option>
              <option value="€">€ (EUR)</option>
              <option value="₺">₺ (TL)</option>
              <option value="£">£ (GBP)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">Filament Çapı:</span>
            <div className="flex rounded-lg border border-gray-700 overflow-hidden text-[10px] font-mono font-bold">
              <button
                onClick={() => setFilamentDiameter(1.75)}
                className={`px-2 py-0.5 ${
                  filamentDiameter === 1.75 ? 'bg-cyan-600 text-white' : 'bg-gray-900 text-gray-400'
                }`}
              >
                1.75 mm
              </button>
              <button
                onClick={() => setFilamentDiameter(2.85)}
                className={`px-2 py-0.5 ${
                  filamentDiameter === 2.85 ? 'bg-cyan-600 text-white' : 'bg-gray-900 text-gray-400'
                }`}
              >
                2.85 mm
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Footer Action Bar (Copy Summary, Export JSON/CSV & Close if modal) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-800/80">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className={`py-2 px-3.5 rounded-xl border font-semibold text-xs transition flex items-center gap-1.5 shadow-md ${
              isCopied
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700'
            }`}
            title="Tüm metrikleri panoya kopyala"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Rapor Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-300" />
                <span>Raporu Kopyala</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleExportMetrics('json')}
            className="py-2 px-3 bg-gray-900/90 hover:bg-cyan-950/70 hover:text-cyan-300 hover:border-cyan-500/50 text-gray-200 border border-gray-700 rounded-xl font-mono text-xs font-semibold transition flex items-center gap-1.5 shadow-md"
            title="Hacim, yüzey alanı, kütle ve boyutları JSON dosyası olarak indir"
          >
            {exportedFormat === 'json' ? (
              <>
                <Check className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-300">JSON İndirildi!</span>
              </>
            ) : (
              <>
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>JSON İndir</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleExportMetrics('csv')}
            className="py-2 px-3 bg-gray-900/90 hover:bg-emerald-950/70 hover:text-emerald-300 hover:border-emerald-500/50 text-gray-200 border border-gray-700 rounded-xl font-mono text-xs font-semibold transition flex items-center gap-1.5 shadow-md"
            title="Hacim, yüzey alanı, kütle ve boyutları CSV (Excel) dosyası olarak indir"
          >
            {exportedFormat === 'csv' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">CSV İndirildi!</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>CSV İndir</span>
              </>
            )}
          </button>
        </div>

        {isModal && onClose && (
          <button
            onClick={onClose}
            className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs transition shadow-lg shadow-emerald-950/60"
          >
            Kapat
          </button>
        )}
      </div>
    </div>
  );
}

