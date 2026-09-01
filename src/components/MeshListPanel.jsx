import React, { useState } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  Grid,
  Box,
  Sliders,
  Sparkles,
  Scissors,
  CheckCircle2,
  Maximize2,
  Paintbrush,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Info,
  RotateCcw,
  Palette,
  X
} from 'lucide-react';
import { MATERIAL_THEMES } from '../utils/stlLoaderHelper';

/**
 * Single Mesh Item row in the Scene Outliner / Mesh Tree
 */
function MeshItemCard({
  id,
  name,
  badgeText,
  badgeColor = 'emerald',
  triangleCount,
  dimensions,
  volumeCm3,
  config,
  onUpdateConfig,
  onResetConfig,
  isActive = true,
  onFocus
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const opacityPercent = Math.round((config.opacity ?? 1) * 100);

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        config.visible
          ? 'bg-gray-900/90 border-gray-700/80 shadow-md'
          : 'bg-gray-950/60 border-gray-800/60 opacity-60'
      }`}
    >
      {/* Main Header Row */}
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Visibility Toggle Button */}
          <button
            onClick={() => onUpdateConfig(id, { visible: !config.visible })}
            className={`p-1.5 rounded-lg border transition shrink-0 ${
              config.visible
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300'
            }`}
            title={config.visible ? 'Görünürlüğü Kapat (Gizle)' : 'Görünür Yap (Göster)'}
          >
            {config.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Color Preview Pill */}
          <div
            className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 shadow-sm"
            style={{
              background: config.materialTheme?.normalShader
                ? 'linear-gradient(135deg, #ef4444, #22c55e, #3b82f6)'
                : config.customColor || config.materialTheme?.color || '#2dafa5'
            }}
            title={`Renk: ${config.customColor || config.materialTheme?.name || 'Varsayılan'}`}
          />

          {/* Mesh Label & Metadata */}
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-200 truncate">{name}</span>
              {badgeText && (
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border leading-tight ${
                    badgeColor === 'emerald'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                      : badgeColor === 'amber'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                      : badgeColor === 'blue'
                      ? 'bg-blue-950/80 text-blue-300 border-blue-800/60'
                      : 'bg-gray-800 text-gray-300 border-gray-700'
                  }`}
                >
                  {badgeText}
                </span>
              )}
            </div>
            <div className="text-[10px] text-gray-400 font-mono flex items-center gap-2 mt-0.5">
              {triangleCount !== undefined && <span>{triangleCount.toLocaleString()} üçgen</span>}
              {volumeCm3 !== undefined && <span>{volumeCm3} cm³</span>}
            </div>
          </div>
        </div>

        {/* Expand / Collapse Settings Toggle */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onUpdateConfig(id, { wireframe: !config.wireframe })}
            className={`p-1 rounded-md border text-[10px] font-mono transition ${
              config.wireframe
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-gray-200'
            }`}
            title={config.wireframe ? 'Tel Kafes Modu Açık' : 'Tel Kafes (Wireframe) Moduna Geç'}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-md transition"
            title="Materyal ve Görünüm Özelliklerini Düzenle"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Material & Appearance Controls */}
      {isExpanded && (
        <div className="p-3 pt-0 border-t border-gray-800/80 mt-1 flex flex-col gap-3 text-xs animate-in slide-in-from-top-1 duration-150">
          {/* Quick Property Summary Pill Tags */}
          <div className="grid grid-cols-3 gap-1.5 pt-2">
            <div className="bg-gray-950/70 p-1.5 rounded-lg border border-gray-800/80 text-center">
              <div className="text-[9px] text-gray-500 uppercase font-semibold">Görünürlük</div>
              <div className="text-[11px] font-bold font-mono text-gray-200">
                {config.visible ? 'Açık' : 'Gizli'}
              </div>
            </div>

            <div className="bg-gray-950/70 p-1.5 rounded-lg border border-gray-800/80 text-center">
              <div className="text-[9px] text-gray-500 uppercase font-semibold">Tel Kafes</div>
              <div
                className={`text-[11px] font-bold font-mono ${
                  config.wireframe ? 'text-cyan-400' : 'text-gray-400'
                }`}
              >
                {config.wireframe ? 'Aktif' : 'Kapalı'}
              </div>
            </div>

            <div className="bg-gray-950/70 p-1.5 rounded-lg border border-gray-800/80 text-center">
              <div className="text-[9px] text-gray-500 uppercase font-semibold">Opaklık</div>
              <div className="text-[11px] font-bold font-mono text-emerald-400">
                %{opacityPercent}
              </div>
            </div>
          </div>

          {/* 1. Opacity Slider */}
          <div className="space-y-1 bg-gray-950/40 p-2 rounded-xl border border-gray-800">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                Opaklık (Şeffaflık):
              </span>
              <span className="font-mono text-xs font-bold text-emerald-300">
                %{opacityPercent} {opacityPercent < 100 ? '(Şeffaf)' : '(Katı)'}
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={config.opacity ?? 1}
              onChange={(e) =>
                onUpdateConfig(id, { opacity: parseFloat(e.target.value) })
              }
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[9px] text-gray-500 font-mono">
              <span>%5 (Cam)</span>
              <span>%50</span>
              <span>%100 (Opak)</span>
            </div>
          </div>

          {/* 2. Wireframe Toggle & Roughness / Metalness */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdateConfig(id, { wireframe: !config.wireframe })}
              className={`p-2 rounded-xl border transition flex items-center justify-center gap-1.5 text-xs font-semibold ${
                config.wireframe
                  ? 'bg-cyan-950/50 border-cyan-500/60 text-cyan-300 shadow-sm'
                  : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Tel Kafes: {config.wireframe ? 'Açık' : 'Kapalı'}</span>
            </button>

            <button
              onClick={() => onResetConfig(id)}
              className="p-2 bg-gray-800/80 hover:bg-gray-800 border border-gray-700 text-gray-300 rounded-xl transition flex items-center justify-center gap-1.5 text-xs font-semibold"
              title="Bu parçanın materyal ayarlarını varsayılana döndür"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sıfırla</span>
            </button>
          </div>

          {/* 3. Material Themes for this specific mesh */}
          <div className="space-y-1.5">
            <div className="text-[11px] text-gray-300 font-semibold flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span>Özel Materyal Teması:</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {MATERIAL_THEMES.map((theme) => {
                const isSelected =
                  config.materialTheme?.id === theme.id && !config.customColor;
                return (
                  <button
                    key={theme.id}
                    onClick={() =>
                      onUpdateConfig(id, {
                        materialTheme: theme,
                        customColor: null
                      })
                    }
                    className={`p-1.5 rounded-lg border flex items-center gap-2 transition text-[11px] text-left truncate ${
                      isSelected
                        ? 'bg-purple-950/60 border-purple-500 text-white font-bold'
                        : 'bg-gray-800/50 border-gray-700/70 text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                      style={{
                        background: theme.normalShader
                          ? 'linear-gradient(135deg, #ef4444, #22c55e, #3b82f6)'
                          : theme.color
                      }}
                    />
                    <span className="truncate">{theme.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Custom Solid Color Picker */}
          <div className="bg-gray-950/40 p-2 rounded-xl border border-gray-800 flex items-center justify-between">
            <span className="text-[11px] text-gray-300 font-semibold flex items-center gap-1">
              <Paintbrush className="w-3 h-3 text-amber-400" />
              <span>Özel Renk Seç:</span>
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={
                  config.customColor ||
                  config.materialTheme?.color ||
                  '#2dafa5'
                }
                onChange={(e) =>
                  onUpdateConfig(id, {
                    customColor: e.target.value,
                    materialTheme: {
                      ...config.materialTheme,
                      color: e.target.value,
                      normalShader: false
                    }
                  })
                }
                className="w-6 h-6 rounded cursor-pointer border border-gray-700 bg-transparent"
              />
              <span className="font-mono text-[10px] text-gray-400">
                {config.customColor || config.materialTheme?.color || '#2dafa5'}
              </span>
            </div>
          </div>

          {/* Dimensions info if available */}
          {dimensions && (
            <div className="bg-gray-950/80 p-2 rounded-lg border border-gray-800 text-[10px] font-mono text-gray-400 flex items-center justify-between">
              <span>Boyutlar:</span>
              <span className="text-gray-200">
                {dimensions.x} × {dimensions.y} × {dimensions.z} mm
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * MeshListPanel - Dedicated Side Panel for Loaded 3D Objects, Outliner and Material Property Customization
 */
export function MeshListPanel({
  isOpen,
  onClose,
  model,
  modelName,
  modelInfo,
  splitResult,
  meshConfigs, // { [meshId]: { visible: bool, wireframe: bool, opacity: num, materialTheme: obj, customColor: str } }
  onUpdateMeshConfig,
  onResetMeshConfig,
  onResetAllMeshConfigs,
  onSetAllVisibility,
  onSetAllWireframe
}) {
  if (!isOpen) return null;

  // Determine list of meshes present in scene
  const meshItems = [];

  if (splitResult) {
    // Sliced Mode: Part A & Part B (+ Dowel Pin if available)
    meshItems.push({
      id: 'partA',
      name: `${modelName || 'Model'} - Parça 1 (Erkek Pim)`,
      badgeText: 'Part 1 / Pin',
      badgeColor: 'amber',
      triangleCount: splitResult.partA?.geometry?.attributes?.position
        ? Math.floor(splitResult.partA.geometry.attributes.position.count / 3)
        : undefined,
      volumeCm3: splitResult.partAVolumeCm3,
      dimensions: splitResult.partADimensions
    });

    meshItems.push({
      id: 'partB',
      name: `${modelName || 'Model'} - Parça 2 (Dişi Yuva)`,
      badgeText: 'Part 2 / Socket',
      badgeColor: 'blue',
      triangleCount: splitResult.partB?.geometry?.attributes?.position
        ? Math.floor(splitResult.partB.geometry.attributes.position.count / 3)
        : undefined,
      volumeCm3: splitResult.partBVolumeCm3,
      dimensions: splitResult.partBDimensions
    });

    if (splitResult.dowelPinGeometry) {
      meshItems.push({
        id: 'dowelPin',
        name: 'Hizalama Dübel Pimi',
        badgeText: 'Ayrı Dübel',
        badgeColor: 'emerald',
        triangleCount: splitResult.dowelPinGeometry.attributes?.position
          ? Math.floor(splitResult.dowelPinGeometry.attributes.position.count / 3)
          : undefined
      });
    }
  } else if (model) {
    // Single Uncut Model Mode
    meshItems.push({
      id: 'mainModel',
      name: modelName || 'Ana 3D Model',
      badgeText: 'Orijinal STL',
      badgeColor: 'emerald',
      triangleCount: modelInfo?.triangleCount || modelInfo?.triangles,
      volumeCm3: modelInfo?.volumeCm3,
      dimensions: modelInfo?.dimensions
    });
  }

  const allVisible = meshItems.every(
    (item) => meshConfigs[item.id]?.visible !== false
  );
  const allWireframe = meshItems.every(
    (item) => meshConfigs[item.id]?.wireframe === true
  );

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 sm:w-96 bg-gray-900/95 backdrop-blur-2xl border-l border-gray-800 shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Panel Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-100 flex items-center gap-2">
              <span>3D Nesneler & Katmanlar</span>
              <span className="text-[10px] font-mono font-normal bg-gray-800 text-indigo-300 px-2 py-0.5 rounded-full border border-gray-700">
                {meshItems.length} Nesne
              </span>
            </h2>
            <p className="text-[11px] text-gray-400">Görünürlük, Tel Kafes & Opaklık</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          title="Paneli Kapat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Global Quick Actions Bar */}
      <div className="p-3 bg-gray-950/40 border-b border-gray-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Toggle All Visibility */}
          <button
            onClick={() => onSetAllVisibility(!allVisible)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
              allVisible
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/70 hover:bg-emerald-900/50'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200'
            }`}
            title="Tüm nesneleri göster veya gizle"
          >
            {allVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{allVisible ? 'Tümünü Gizle' : 'Tümünü Göster'}</span>
          </button>

          {/* Toggle All Wireframe */}
          <button
            onClick={() => onSetAllWireframe(!allWireframe)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
              allWireframe
                ? 'bg-cyan-950/50 text-cyan-300 border-cyan-800/70 hover:bg-cyan-900/50'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200'
            }`}
            title="Tüm nesnelerde tel kafes modunu aç/kapat"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>{allWireframe ? 'Dolu Yüzey' : 'Tel Kafes'}</span>
          </button>
        </div>

        {/* Reset All */}
        <button
          onClick={onResetAllMeshConfigs}
          className="p-1.5 text-gray-400 hover:text-amber-300 hover:bg-gray-800 rounded-lg transition"
          title="Tüm nesnelerin materyal ve opaklık özelliklerini sıfırla"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Mesh Items List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {meshItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs flex flex-col items-center justify-center gap-2">
            <Box className="w-8 h-8 text-gray-600 animate-pulse" />
            <span>Sahnede yüklü 3D model bulunamadı.</span>
          </div>
        ) : (
          meshItems.map((item) => (
            <MeshItemCard
              key={item.id}
              id={item.id}
              name={item.name}
              badgeText={item.badgeText}
              badgeColor={item.badgeColor}
              triangleCount={item.triangleCount}
              dimensions={item.dimensions}
              volumeCm3={item.volumeCm3}
              config={
                meshConfigs[item.id] || {
                  visible: true,
                  wireframe: false,
                  opacity: 1.0,
                  materialTheme: null,
                  customColor: null
                }
              }
              onUpdateConfig={onUpdateMeshConfig}
              onResetConfig={onResetMeshConfig}
            />
          ))
        )}
      </div>

      {/* Bottom Info Note */}
      <div className="p-3 border-t border-gray-800 bg-gray-950/80 text-[11px] text-gray-400 flex items-start gap-2">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          Her parçanın <strong>şeffaflık</strong> (opacity), <strong>tel kafes</strong> ve{' '}
          <strong>renk/materyal</strong> özelliklerini bağımsız olarak ayarlayarak iç pim yuvalarını
          ve kesim geometrisini net biçimde inceleyebilirsiniz.
        </div>
      </div>
    </div>
  );
}
