import React, { useState, useRef, useMemo } from 'react';
import * as THREE from 'three';
import {
  Layers,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Upload,
  Plus,
  Trash2,
  X,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Eye,
  Sliders,
  Compass,
  Crosshair,
  Target,
  Box,
  FileCheck,
  FolderArchive,
  RefreshCw,
  Info,
  Check
} from 'lucide-react';
import { parseCustomSTL, loadSamplePreset } from '../utils/stlLoaderHelper';
import { SAMPLE_PRESETS } from '../utils/sampleModels';
import { sliceMeshWithPlane } from '../utils/meshSlicer';
import {
  downloadMeshSTL,
  downloadAllPartsZip,
  downloadBatchProcessedZip,
  formatBytes
} from '../utils/stlExporter';

export function BatchProcessingModal({
  isOpen,
  onClose,
  queue = [],
  onUpdateQueue,
  activeClippingConfig,
  activePinConfig,
  onLoadItemInViewport,
  onNotify
}) {
  // Shared Batch Cut Plane & Pin Configuration State
  const [batchClipping, setBatchClipping] = useState({
    axis: activeClippingConfig?.axis || 'y',
    offset: activeClippingConfig?.offset || 0,
    negate: activeClippingConfig?.negate || false,
    addPinOnSlice: activeClippingConfig?.addPinOnSlice !== false
  });

  const [batchPin, setBatchPin] = useState({
    mode: activePinConfig?.mode || 'pin_and_hole',
    diameter: activePinConfig?.diameter || 8.0,
    depth: activePinConfig?.depth || 10.0,
    clearance: typeof activePinConfig?.clearance === 'number' ? activePinConfig.clearance : 0.2,
    type: activePinConfig?.type || 'cylinder',
    taper: activePinConfig?.taper || 0.85,
    snapToNormal: activePinConfig?.snapToNormal !== false,
    snapToCenter: activePinConfig?.snapToCenter !== false,
    flushFit: activePinConfig?.flushFit !== false
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [currentProcessingId, setCurrentProcessingId] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('queue'); // 'queue' | 'settings' | 'results'
  const [isDragOver, setIsDragOver] = useState(false);

  // Cancellation ref for non-blocking abort
  const cancelRequestedRef = useRef(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Queue Statistics
  const completedCount = queue.filter(item => item.status === 'completed').length;
  const errorCount = queue.filter(item => item.status === 'error').length;
  const pendingCount = queue.filter(item => item.status === 'pending').length;
  const totalCount = queue.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  /**
   * Sync shared batch settings with the current 3D viewport settings
   */
  const handleSyncWithViewport = () => {
    if (activeClippingConfig) {
      setBatchClipping({
        axis: activeClippingConfig.axis || 'y',
        offset: activeClippingConfig.offset || 0,
        negate: activeClippingConfig.negate || false,
        addPinOnSlice: activeClippingConfig.addPinOnSlice !== false
      });
    }
    if (activePinConfig) {
      setBatchPin({
        mode: activePinConfig.mode || 'pin_and_hole',
        diameter: activePinConfig.diameter || 8.0,
        depth: activePinConfig.depth || 10.0,
        clearance: typeof activePinConfig.clearance === 'number' ? activePinConfig.clearance : 0.2,
        type: activePinConfig.type || 'cylinder',
        taper: activePinConfig.taper || 0.85,
        snapToNormal: activePinConfig.snapToNormal !== false,
        snapToCenter: activePinConfig.snapToCenter !== false,
        flushFit: activePinConfig.flushFit !== false
      });
    }
    onNotify?.('Toplu kesim ayarları 3D sahne ayarlarıyla eşitlendi.');
  };

  /**
   * Adds uploaded STL files to the batch queue
   */
  const handleAddFiles = (files) => {
    if (!files || files.length === 0) return;

    const newItems = Array.from(files)
      .filter(f => f.name.toLowerCase().endsWith('.stl'))
      .map(file => ({
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
        name: file.name,
        size: file.size,
        file: file,
        isPreset: false,
        status: 'pending',
        progress: 0,
        statusText: 'Bekliyor',
        result: null,
        error: null
      }));

    if (newItems.length > 0) {
      onUpdateQueue([...queue, ...newItems]);
      onNotify?.(`${newItems.length} STL dosyası toplu işleme kuyruğuna eklendi.`);
    }
  };

  /**
   * Adds a built-in sample preset model to the queue
   */
  const handleAddPreset = (presetId) => {
    const meta = SAMPLE_PRESETS.find(p => p.id === presetId) || { name: 'Örnek Model' };
    const newItem = {
      id: `preset_${presetId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: `${meta.name}.stl`,
      size: 150000,
      file: null,
      isPreset: true,
      presetId: presetId,
      status: 'pending',
      progress: 0,
      statusText: 'Bekliyor',
      result: null,
      error: null
    };

    onUpdateQueue([...queue, newItem]);
    onNotify?.(`${meta.name} kuyruğa eklendi.`);
  };

  /**
   * Adds all available built-in sample presets to the queue for instant testing
   */
  const handleAddAllPresets = () => {
    const newItems = SAMPLE_PRESETS.map(p => ({
      id: `preset_${p.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: `${p.name}.stl`,
      size: 150000,
      file: null,
      isPreset: true,
      presetId: p.id,
      status: 'pending',
      progress: 0,
      statusText: 'Bekliyor',
      result: null,
      error: null
    }));

    onUpdateQueue([...queue, ...newItems]);
    onNotify?.('Tüm 4 örnek model kuyruğa eklendi.');
  };

  /**
   * Removes an item from the queue
   */
  const handleRemoveItem = (id) => {
    onUpdateQueue(queue.filter(item => item.id !== id));
  };

  /**
   * Clears all items in the queue
   */
  const handleClearQueue = () => {
    if (isProcessing) return;
    onUpdateQueue([]);
  };

  /**
   * Resets status of all items so they can be re-run
   */
  const handleResetQueueStatus = () => {
    if (isProcessing) return;
    const reset = queue.map(item => ({
      ...item,
      status: 'pending',
      progress: 0,
      statusText: 'Bekliyor',
      result: null,
      error: null
    }));
    onUpdateQueue(reset);
    onNotify?.('Kuyruk durumu sıfırlandı.');
  };

  /**
   * SEQUENTIAL BATCH PROCESSING LOOP
   * Iterates through all queue items one-by-one, parsing and slicing with identical shared settings.
   */
  const handleStartProcessing = async () => {
    if (queue.length === 0 || isProcessing) return;

    setIsProcessing(true);
    cancelRequestedRef.current = false;

    // Resolve Normal Vector for the chosen axis
    const effNormal = new THREE.Vector3(
      batchClipping.axis === 'x' ? 1 : 0,
      batchClipping.axis === 'y' ? 1 : 0,
      batchClipping.axis === 'z' ? 1 : 0
    );
    if (batchClipping.negate) {
      effNormal.negate();
    }
    const effOffset = batchClipping.negate ? -batchClipping.offset : batchClipping.offset;

    // Work on a mutable clone of queue
    let currentQueue = [...queue];

    for (let i = 0; i < currentQueue.length; i++) {
      if (cancelRequestedRef.current) {
        onNotify?.('Toplu işleme kullanıcı tarafından durduruldu.');
        break;
      }

      const item = currentQueue[i];

      // Skip already completed items unless re-running
      if (item.status === 'completed') {
        continue;
      }

      setCurrentProcessingId(item.id);

      // Step 1: Update status to 'processing'
      currentQueue[i] = {
        ...currentQueue[i],
        status: 'processing',
        progress: 20,
        statusText: 'STL modeli ayrıştırılıyor...'
      };
      onUpdateQueue([...currentQueue]);

      // Yield event loop for smooth UI rendering
      await new Promise(resolve => setTimeout(resolve, 50));

      try {
        let mesh, info;

        if (item.isPreset) {
          const loaded = loadSamplePreset(item.presetId);
          mesh = loaded.mesh;
          info = loaded.info;
        } else if (item.file) {
          const buffer = await item.file.arrayBuffer();
          const parsed = parseCustomSTL(buffer, item.name);
          mesh = parsed.mesh;
          info = parsed.info;
        } else {
          throw new Error('Dosya kaynağı bulunamadı.');
        }

        // Step 2: Slicing mesh with shared cut plane & alignment pin settings
        currentQueue[i] = {
          ...currentQueue[i],
          progress: 55,
          statusText: 'Kesit düzlemi boyunca ayrıştırılıyor ve pim yuvaları açılıyor...'
        };
        onUpdateQueue([...currentQueue]);
        await new Promise(resolve => setTimeout(resolve, 40));

        const result = sliceMeshWithPlane(
          mesh,
          effNormal,
          effOffset,
          batchPin,
          batchClipping.addPinOnSlice
        );

        // Step 3: Success
        currentQueue[i] = {
          ...currentQueue[i],
          status: 'completed',
          progress: 100,
          statusText: `Tamamlandı (${result.cutAreaCm2?.toFixed(1) || 0} cm²)`,
          result: {
            ...result,
            originalMesh: mesh,
            originalInfo: info
          },
          error: null
        };
        onUpdateQueue([...currentQueue]);
      } catch (err) {
        console.error(`Error batch processing ${item.name}:`, err);
        currentQueue[i] = {
          ...currentQueue[i],
          status: 'error',
          progress: 100,
          statusText: 'Hata oluştu',
          error: err.message || 'Kesim sırasında beklenmeyen hata.'
        };
        onUpdateQueue([...currentQueue]);
      }

      // Small pause between items
      await new Promise(resolve => setTimeout(resolve, 60));
    }

    setCurrentProcessingId(null);
    setIsProcessing(false);
    if (!cancelRequestedRef.current) {
      onNotify?.(`Toplu işleme tamamlandı! (${completedCount + 1}/${totalCount} model hazır)`);
    }
  };

  /**
   * Cancels the sequential processing queue
   */
  const handleCancelProcessing = () => {
    cancelRequestedRef.current = true;
    setIsProcessing(false);
    setCurrentProcessingId(null);
  };

  /**
   * Downloads single item Part A
   */
  const handleDownloadPartA = (item) => {
    if (!item.result?.partA?.geometry) return;
    const clean = item.name.replace(/\.stl$/i, '');
    downloadMeshSTL(item.result.partA.geometry, `${clean}_Part_1.stl`, 'binary');
    onNotify?.(`${clean}_Part_1.stl indirildi.`);
  };

  /**
   * Downloads single item Part B
   */
  const handleDownloadPartB = (item) => {
    if (!item.result?.partB?.geometry) return;
    const clean = item.name.replace(/\.stl$/i, '');
    downloadMeshSTL(item.result.partB.geometry, `${clean}_Part_2.stl`, 'binary');
    onNotify?.(`${clean}_Part_2.stl indirildi.`);
  };

  /**
   * Downloads single item's Alignment Dowel Pin
   */
  const handleDownloadDowel = (item) => {
    if (!item.result?.dowelPinGeometry) return;
    const clean = item.name.replace(/\.stl$/i, '');
    downloadMeshSTL(item.result.dowelPinGeometry, `${clean}_Alignment_Dowel_Pin.stl`, 'binary');
    onNotify?.(`${clean} Hizalama Dübel Pimi indirildi.`);
  };

  /**
   * Downloads single item complete ZIP package
   */
  const handleDownloadItemZip = async (item) => {
    if (!item.result) return;
    const clean = item.name.replace(/\.stl$/i, '');
    await downloadAllPartsZip(item.result.partA, item.result.partB, clean, {
      format: 'binary',
      dowelPinGeometry: item.result.dowelPinGeometry,
      dowelSpecs: item.result.dowelSpecs
    });
    onNotify?.(`${clean} ZIP paketi indirildi.`);
  };

  /**
   * Downloads all completed models in a single consolidated ZIP file
   */
  const handleDownloadAllZip = async () => {
    const completedItems = queue.filter(item => item.status === 'completed' && item.result);
    if (completedItems.length === 0) return;

    setIsExportingAll(true);
    try {
      await downloadBatchProcessedZip(
        completedItems,
        { clippingConfig: batchClipping, pinConfig: batchPin },
        { format: 'binary', density: 1.0 }
      );
      onNotify?.(`${completedItems.length} modelin tüm parçaları tek ZIP olarak indirildi!`);
    } catch (err) {
      console.error(err);
      onNotify?.('Toplu ZIP indirme sırasında hata oluştu.');
    } finally {
      setIsExportingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="bg-gray-900 border border-gray-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="p-4 border-b border-gray-800 bg-gray-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-400 shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-100">Toplu İşleme Kuyruğu (Batch Queue)</h2>
                <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-full font-bold">
                  {completedCount}/{totalCount} Tamamlandı
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Birden fazla STL modelini içe aktarın; aynı kesme düzlemi ve pim ayarlarını sırayla uygulayın.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center justify-between px-4 border-b border-gray-800 bg-gray-900/80 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveSubTab('queue')}
              className={`py-2.5 px-3.5 font-semibold transition flex items-center gap-1.5 border-b-2 ${
                activeSubTab === 'queue'
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-gray-400 border-transparent hover:text-gray-200'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Model Kuyruğu ({totalCount})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('settings')}
              className={`py-2.5 px-3.5 font-semibold transition flex items-center gap-1.5 border-b-2 ${
                activeSubTab === 'settings'
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-gray-400 border-transparent hover:text-gray-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Ortak Kesim & Pim Ayarları</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncWithViewport}
              className="py-1 px-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 text-[11px] font-medium transition flex items-center gap-1"
              title="Aktif 3D sahnede görünen düzlem ve pim ayarlarını çek"
            >
              <RefreshCw className="w-3 h-3 text-cyan-400" />
              <span>3D Sahnenden Ayarları Al</span>
            </button>
          </div>
        </div>

        {/* Global Progress Bar (if processing or completed) */}
        {totalCount > 0 && (
          <div className="bg-gray-950 px-4 py-2 border-b border-gray-800 flex items-center gap-3">
            <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-mono font-bold text-gray-300 shrink-0">
              %{progressPercent} ({completedCount}/{totalCount})
            </span>
          </div>
        )}

        {/* Tab 1: Queue View */}
        {activeSubTab === 'queue' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {/* Action Bar: Add Files, Add Presets, Start Processing */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-gray-950/60 p-3 rounded-xl border border-gray-800">
              <div className="flex items-center flex-wrap gap-2">
                {/* File Upload Trigger with multiple support */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".stl"
                  onChange={(e) => {
                    handleAddFiles(e.target.files);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
                >
                  <Plus className="w-4 h-4" />
                  <span>STL Dosyaları Ekle</span>
                </button>

                {/* Preset Models Quick Inject */}
                <button
                  onClick={handleAddAllPresets}
                  className="py-1.5 px-3 bg-gray-800 hover:bg-gray-700 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
                  title="Test için 4 örnek modeli birden kuyruğa ekle"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Örnek Modelleri Ekle (+4)</span>
                </button>

                {totalCount > 0 && (
                  <button
                    onClick={handleClearQueue}
                    disabled={isProcessing}
                    className="py-1.5 px-2.5 bg-gray-800/80 hover:bg-red-950/40 text-gray-400 hover:text-red-300 border border-gray-700 hover:border-red-700/60 rounded-xl text-xs transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kuyruğu Temizle</span>
                  </button>
                )}
              </div>

              {/* Execution Controls */}
              <div className="flex items-center gap-2">
                {completedCount > 0 && completedCount === totalCount && (
                  <button
                    onClick={handleResetQueueStatus}
                    className="py-1.5 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-medium transition flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Tekrar Çalıştır</span>
                  </button>
                )}

                {isProcessing ? (
                  <button
                    onClick={handleCancelProcessing}
                    className="py-1.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-red-950/50 animate-pulse"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Durdur</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartProcessing}
                    disabled={totalCount === 0 || pendingCount === 0}
                    className={`py-1.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg ${
                      totalCount > 0 && pendingCount > 0
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50 hover:scale-[1.02]'
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Toplu İşlemi Başlat ({pendingCount > 0 ? `${pendingCount} Model` : 'Hazır'})</span>
                  </button>
                )}

                {completedCount > 0 && (
                  <button
                    onClick={handleDownloadAllZip}
                    disabled={isExportingAll}
                    className="py-1.5 px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-950/50"
                    title="İşlenmiş tüm modellerin STL parçalarını tek bir ZIP arşivi olarak indir"
                  >
                    <FolderArchive className="w-4 h-4" />
                    <span>{isExportingAll ? 'ZIP Paketleniyor...' : 'Tümünü ZIP İndir'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drag & Drop Zone when empty */}
            {totalCount === 0 && (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  handleAddFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                  isDragOver
                    ? 'border-emerald-400 bg-emerald-950/30 text-emerald-300'
                    : 'border-gray-700/80 bg-gray-950/40 text-gray-400 hover:border-gray-600 hover:bg-gray-950/70'
                }`}
              >
                <div className="p-4 bg-gray-800/80 rounded-2xl text-emerald-400 mb-3 border border-gray-700">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-gray-200">Birden Çok STL Dosyası Sürükleyin veya Tıklayın</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  Seçtiğiniz tüm modellere aynı kesme düzlemi yüksekliği, yönü ve hizalama pimleri sırayla otomatik uygulanacaktır.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddAllPresets();
                    }}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-teal-300 rounded-xl text-xs font-semibold border border-teal-500/30 transition flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Dene: 4 Örnek Modeli Kuyruğa Ekle</span>
                  </button>
                </div>
              </div>
            )}

            {/* Queue Items List */}
            {totalCount > 0 && (
              <div className="space-y-2">
                {queue.map((item, index) => {
                  const isCurrent = currentProcessingId === item.id;
                  const isDone = item.status === 'completed';
                  const isErr = item.status === 'error';
                  const cleanName = item.name.replace(/\.stl$/i, '');

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-blue-950/40 border-blue-500/70 shadow-md shadow-blue-950/40 ring-1 ring-blue-500/30'
                          : isDone
                          ? 'bg-gray-950/60 border-emerald-900/60'
                          : isErr
                          ? 'bg-red-950/30 border-red-900/60'
                          : 'bg-gray-950/40 border-gray-800'
                      }`}
                    >
                      {/* Left: Index, Icon, Name, Stats */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-[11px] font-mono text-gray-500 w-5 text-right shrink-0">
                          {index + 1}.
                        </span>

                        <div
                          className={`p-2 rounded-xl border shrink-0 ${
                            isCurrent
                              ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 animate-spin'
                              : isDone
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                              : isErr
                              ? 'bg-red-500/20 border-red-500/40 text-red-400'
                              : 'bg-gray-800 border-gray-700 text-gray-400'
                          }`}
                        >
                          {isCurrent ? (
                            <RefreshCw className="w-4 h-4" />
                          ) : isDone ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : isErr ? (
                            <AlertCircle className="w-4 h-4" />
                          ) : (
                            <Box className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-200 truncate">{item.name}</span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                                isCurrent
                                  ? 'bg-blue-950 text-blue-300 border-blue-800'
                                  : isDone
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800 font-bold'
                                  : isErr
                                  ? 'bg-red-950 text-red-300 border-red-800'
                                  : 'bg-gray-800 text-gray-400 border-gray-700'
                              }`}
                            >
                              {item.statusText}
                            </span>
                          </div>

                          <div className="text-[10px] text-gray-400 font-mono mt-0.5 flex items-center gap-2">
                            <span>{formatBytes(item.size)}</span>
                            {item.result && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-400 font-bold">
                                  Kesit: {item.result.cutAreaCm2?.toFixed(1) || 0} cm²
                                </span>
                                {item.result.dowelPinGeometry && (
                                  <>
                                    <span>•</span>
                                    <span className="text-purple-300">Ayrı Dübel Pimi</span>
                                  </>
                                )}
                              </>
                            )}
                            {item.error && (
                              <span className="text-red-400 truncate max-w-xs">{item.error}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        {isDone && (
                          <>
                            {/* Inspect in 3D Viewport button */}
                            {onLoadItemInViewport && (
                              <button
                                onClick={() => onLoadItemInViewport(item)}
                                className="py-1 px-2.5 bg-gray-800 hover:bg-emerald-950/60 text-gray-300 hover:text-emerald-300 border border-gray-700 hover:border-emerald-700 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                                title="Bu modeli ve kesilmiş parçalarını ana 3D sahnede görüntüle"
                              >
                                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                <span>3D İncele</span>
                              </button>
                            )}

                            {/* Single item Part 1 download */}
                            <button
                              onClick={() => handleDownloadPartA(item)}
                              className="py-1 px-2 bg-gray-800 hover:bg-blue-900/40 text-blue-300 border border-gray-700 rounded-lg text-[10px] font-semibold transition"
                              title="Part 1 STL İndir"
                            >
                              P1 STL
                            </button>

                            {/* Single item Part 2 download */}
                            <button
                              onClick={() => handleDownloadPartB(item)}
                              className="py-1 px-2 bg-gray-800 hover:bg-emerald-900/40 text-emerald-300 border border-gray-700 rounded-lg text-[10px] font-semibold transition"
                              title="Part 2 STL İndir"
                            >
                              P2 STL
                            </button>

                            {/* Dowel pin download if available */}
                            {item.result?.dowelPinGeometry && (
                              <button
                                onClick={() => handleDownloadDowel(item)}
                                className="py-1 px-2 bg-gray-800 hover:bg-purple-900/40 text-purple-300 border border-gray-700 rounded-lg text-[10px] font-semibold transition"
                                title="Hizalama Dübeli STL İndir"
                              >
                                Dübel
                              </button>
                            )}

                            {/* Single item ZIP */}
                            <button
                              onClick={() => handleDownloadItemZip(item)}
                              className="py-1 px-2 bg-gray-800 hover:bg-gray-700 text-teal-300 border border-gray-700 rounded-lg text-[10px] font-semibold transition flex items-center gap-0.5"
                              title="Tek Model ZIP İndir"
                            >
                              <Download className="w-3 h-3" />
                              <span>ZIP</span>
                            </button>
                          </>
                        )}

                        {/* Remove item button */}
                        {!isProcessing && (
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-gray-500 hover:text-red-400 transition"
                            title="Kuyruktan Çıkar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Shared Cut Plane & Pin Configuration */}
        {activeSubTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-xs text-gray-300">
                  Bu ayarlar kuyruktaki <strong>tüm STL modellerine</strong> sırasıyla uygulanacaktır.
                </span>
              </div>
              <button
                onClick={handleSyncWithViewport}
                className="py-1 px-2.5 bg-gray-800 hover:bg-gray-700 text-cyan-300 rounded-lg border border-gray-700 text-xs font-semibold transition flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>3D Sahnenden Çek</span>
              </button>
            </div>

            {/* 1. Shared Cut Plane Settings */}
            <div className="bg-gray-950/40 p-4 rounded-xl border border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>Ortak Kesme Düzlemi (Cut Plane)</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  {batchClipping.axis.toUpperCase()}-Ekseni | Ofset: {batchClipping.offset}mm
                </span>
              </div>

              {/* Axis Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400">Kesim Ekseni:</label>
                <div className="grid grid-cols-3 gap-2">
                  {['x', 'y', 'z'].map((ax) => (
                    <button
                      key={ax}
                      onClick={() => setBatchClipping({ ...batchClipping, axis: ax })}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                        batchClipping.axis === ax
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/40'
                          : 'bg-gray-850 text-gray-300 border-gray-700 hover:bg-gray-800'
                      }`}
                    >
                      {ax.toUpperCase()} {ax === 'y' ? '(Yatay)' : ax === 'z' ? '(Ön/Arka)' : '(Sağ/Sol)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plane Offset Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Düzlem Yüksekliği / Ofset:</span>
                  <span className="font-mono text-emerald-400 font-bold">{batchClipping.offset} mm</span>
                </div>
                <input
                  type="range"
                  min="-40"
                  max="40"
                  step="0.5"
                  value={batchClipping.offset}
                  onChange={(e) => setBatchClipping({ ...batchClipping, offset: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => setBatchClipping({ ...batchClipping, negate: !batchClipping.negate })}
                  className={`p-2 rounded-xl text-left border text-xs font-semibold transition flex items-center justify-between ${
                    batchClipping.negate
                      ? 'bg-amber-950/40 border-amber-500/70 text-amber-300'
                      : 'bg-gray-850 border-gray-800 text-gray-400'
                  }`}
                >
                  <span>Kesim Yönünü Ters Çevir</span>
                  <span className={`w-2 h-2 rounded-full ${batchClipping.negate ? 'bg-amber-400' : 'bg-gray-600'}`} />
                </button>

                <button
                  onClick={() => setBatchClipping({ ...batchClipping, addPinOnSlice: !batchClipping.addPinOnSlice })}
                  className={`p-2 rounded-xl text-left border text-xs font-semibold transition flex items-center justify-between ${
                    batchClipping.addPinOnSlice
                      ? 'bg-emerald-950/40 border-emerald-500/70 text-emerald-300'
                      : 'bg-gray-850 border-gray-800 text-gray-400'
                  }`}
                >
                  <span>Hizalama Pimi & Yuvası Ekle</span>
                  <span className={`w-2 h-2 rounded-full ${batchClipping.addPinOnSlice ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                </button>
              </div>
            </div>

            {/* 2. Shared Alignment Pin & Socket Configuration */}
            {batchClipping.addPinOnSlice && (
              <div className="bg-gray-950/40 p-4 rounded-xl border border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                    <span>Ortak Hizalama Pimi & Yuva Delik Ayarları</span>
                  </span>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                    Ø{batchPin.diameter} × {batchPin.depth}mm
                  </span>
                </div>

                {/* Pin Modes */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-400">Pim Bağlantı Modu:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'pin_and_hole', label: 'Pim & Yuva Deliği', desc: 'Erkek pim Part 1 üzerinde, dişi yuva Part 2 üzerinde' },
                      { id: 'holes_both', label: 'Çift Delik + Dübel', desc: 'İki parçada delik açılır, ayrı dübel STL üretilir' },
                      { id: 'flat', label: 'Düz Kesim (Pimsiz)', desc: 'Yalnızca su sızdırmaz düzlemsel kapak' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setBatchPin({ ...batchPin, mode: m.id })}
                        className={`p-2 rounded-xl text-left border transition flex flex-col justify-between ${
                          batchPin.mode === m.id
                            ? 'bg-cyan-950/40 border-cyan-500/70 text-cyan-300 shadow-sm'
                            : 'bg-gray-850 border-gray-800 text-gray-400 hover:bg-gray-800'
                        }`}
                      >
                        <span className="text-xs font-bold">{m.label}</span>
                        <span className="text-[9px] text-gray-400 mt-1 leading-tight">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dimension Presets */}
                {batchPin.mode !== 'flat' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Diameter */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Pim Çapı (Ø):</span>
                          <span className="font-mono text-cyan-400 font-bold">{batchPin.diameter} mm</span>
                        </div>
                        <div className="flex gap-1.5">
                          {[4, 6, 8, 10, 12].map((d) => (
                            <button
                              key={d}
                              onClick={() => setBatchPin({ ...batchPin, diameter: d })}
                              className={`flex-1 py-1 rounded text-[11px] font-mono border transition ${
                                batchPin.diameter === d
                                  ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                                  : 'bg-gray-800 text-gray-400 border-gray-700'
                              }`}
                            >
                              Ø{d}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Depth */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Pim Boyu / Derinlik:</span>
                          <span className="font-mono text-cyan-400 font-bold">{batchPin.depth} mm</span>
                        </div>
                        <div className="flex gap-1.5">
                          {[6, 8, 10, 12, 16].map((l) => (
                            <button
                              key={l}
                              onClick={() => setBatchPin({ ...batchPin, depth: l })}
                              className={`flex-1 py-1 rounded text-[11px] font-mono border transition ${
                                batchPin.depth === l
                                  ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                                  : 'bg-gray-800 text-gray-400 border-gray-700'
                              }`}
                            >
                              {l}mm
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tolerance Fit & Snapping */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800/60">
                      <div className="p-2 bg-gray-900 rounded-xl border border-gray-800 flex items-center justify-between">
                        <div className="text-[11px]">
                          <div className="font-bold text-gray-200">Fit Boşluğu (Tolerans)</div>
                          <div className="text-[9px] text-gray-400">FDM 3D baskı için</div>
                        </div>
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          +{batchPin.clearance} mm
                        </span>
                      </div>

                      <div className="p-2 bg-gray-900 rounded-xl border border-gray-800 flex items-center justify-between">
                        <div className="text-[11px]">
                          <div className="font-bold text-emerald-300">Yüzey Normaline Dik</div>
                          <div className="text-[9px] text-gray-400">90.0° Flush Kilitli</div>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Bottom Footer */}
        <div className="p-3.5 border-t border-gray-800 bg-gray-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Kuyrukta: <strong className="text-gray-200">{totalCount} Model</strong></span>
            {completedCount > 0 && (
              <>
                <span>•</span>
                <span className="text-emerald-400 font-bold">{completedCount} Hazır</span>
              </>
            )}
            {errorCount > 0 && (
              <>
                <span>•</span>
                <span className="text-red-400">{errorCount} Hata</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="py-1.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition"
            >
              Kapat
            </button>
            {completedCount > 0 && (
              <button
                onClick={handleDownloadAllZip}
                disabled={isExportingAll}
                className="py-1.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-950/40"
              >
                <FolderArchive className="w-4 h-4" />
                <span>{isExportingAll ? 'Paketleniyor...' : 'Tümünü ZIP Olarak İndir'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
