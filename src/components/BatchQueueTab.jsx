import React, { useRef } from 'react';
import {
  Layers,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Maximize2,
  FolderArchive,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Box,
  Sparkles,
  Sliders
} from 'lucide-react';
import { formatBytes } from '../utils/stlExporter';

export function BatchQueueTab({
  queue = [],
  onUpdateQueue,
  onOpenBatchModal,
  isProcessing,
  currentProcessingId,
  onStartProcessing,
  onCancelProcessing,
  onDownloadAllZip,
  isExportingAll,
  onLoadItemInViewport,
  onDownloadPartA,
  onDownloadPartB,
  onDownloadDowel,
  onDownloadItemZip,
  onAddFiles,
  onAddAllPresets,
  onClearQueue
}) {
  const fileInputRef = useRef(null);

  const completedCount = queue.filter(item => item.status === 'completed').length;
  const pendingCount = queue.filter(item => item.status === 'pending').length;
  const totalCount = queue.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col p-4 gap-4">
      {/* Top Banner with Expand button */}
      <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/40">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-200">Toplu İşleme Kuyruğu</h3>
            <p className="text-[10px] text-gray-400">
              {totalCount === 0 ? 'Kuyruk boş' : `${completedCount}/${totalCount} model hazır (%${progressPercent})`}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenBatchModal}
          className="p-1.5 bg-gray-800 hover:bg-gray-700 text-emerald-300 rounded-xl border border-gray-700 transition"
          title="Genişletilmiş Toplu İşleme Yöneticisini Aç"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
            <span>İlerleme:</span>
            <span className="text-emerald-400 font-bold">%{progressPercent}</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".stl"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onAddFiles(e.target.files);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }
          }}
          className="hidden"
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50"
          >
            <Plus className="w-4 h-4" />
            <span>STL Dosya Ekle</span>
          </button>

          <button
            onClick={onAddAllPresets}
            className="py-2 px-2.5 bg-gray-800 hover:bg-gray-700 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1"
            title="4 örnek modeli kuyruğa ekle"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+4 Örnek Model</span>
          </button>
        </div>

        {/* Primary Start / Stop Button */}
        {isProcessing ? (
          <button
            onClick={onCancelProcessing}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-red-950/60 animate-pulse"
          >
            <Pause className="w-4 h-4" />
            <span>Toplu İşlemeyi Durdur</span>
          </button>
        ) : (
          <button
            onClick={onStartProcessing}
            disabled={totalCount === 0 || pendingCount === 0}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg ${
              totalCount > 0 && pendingCount > 0
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50 hover:scale-[1.01]'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Tümünü Sırayla İşle ({pendingCount} Bekliyor)</span>
          </button>
        )}

        {completedCount > 0 && (
          <button
            onClick={onDownloadAllZip}
            disabled={isExportingAll}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-950/50"
          >
            <FolderArchive className="w-4 h-4" />
            <span>{isExportingAll ? 'ZIP Paketleniyor...' : 'Tüm Parçaları ZIP İndir'}</span>
          </button>
        )}
      </div>

      {/* Queue Items List */}
      <div className="space-y-2 mt-1">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Kuyruktaki Modeller ({totalCount})</span>
          {totalCount > 0 && !isProcessing && (
            <button
              onClick={onClearQueue}
              className="text-[10px] text-red-400 hover:text-red-300 transition"
            >
              Kuyruğu Temizle
            </button>
          )}
        </div>

        {totalCount === 0 ? (
          <div className="p-6 bg-gray-950/40 border border-gray-800 rounded-2xl text-center text-gray-500 text-xs">
            Henüz model eklenmedi. Üstteki butonlarla birden fazla STL dosyası veya örnek model ekleyebilirsiniz.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
            {queue.map((item, index) => {
              const isCurrent = currentProcessingId === item.id;
              const isDone = item.status === 'completed';
              const isErr = item.status === 'error';
              const cleanName = item.name.replace(/\.stl$/i, '');

              return (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border text-xs transition flex flex-col gap-2 ${
                    isCurrent
                      ? 'bg-blue-950/40 border-blue-500/70 shadow-sm'
                      : isDone
                      ? 'bg-gray-950/60 border-emerald-900/60'
                      : isErr
                      ? 'bg-red-950/30 border-red-900/60'
                      : 'bg-gray-950/40 border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-gray-500">#{index + 1}</span>
                      <span className="font-semibold text-gray-200 truncate">{cleanName}</span>
                    </div>

                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border shrink-0 ${
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

                  {/* Actions when completed */}
                  {isDone && (
                    <div className="flex items-center justify-between pt-1 border-t border-gray-800/60 text-[10px]">
                      <span className="text-emerald-400 font-mono">
                        {item.result?.cutAreaCm2?.toFixed(1) || 0} cm²
                      </span>

                      <div className="flex items-center gap-1">
                        {onLoadItemInViewport && (
                          <button
                            onClick={() => onLoadItemInViewport(item)}
                            className="px-2 py-0.5 bg-gray-800 hover:bg-emerald-950/60 text-gray-300 hover:text-emerald-300 rounded border border-gray-700 hover:border-emerald-700 transition flex items-center gap-0.5"
                            title="Bu modeli 3D sahnede aç"
                          >
                            <Eye className="w-3 h-3 text-emerald-400" />
                            <span>3D</span>
                          </button>
                        )}

                        <button
                          onClick={() => onDownloadItemZip && onDownloadItemZip(item)}
                          className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-teal-300 rounded border border-gray-700 transition flex items-center gap-0.5"
                          title="ZIP İndir"
                        >
                          <Download className="w-3 h-3" />
                          <span>ZIP</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
