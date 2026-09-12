import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import * as THREE from 'three'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { ConsoleDiagnosticSummary, recordMountCheckpoint } from './components/ConsoleDiagnosticSummary.jsx'
import { checkHardwareAcceleration } from './utils/hardwareAccelerationCheck.js'
import { UnitProvider } from './context/UnitContext.jsx'

// Record bootstrap phase checkpoint
recordMountCheckpoint('BOOTSTRAP', 'Entrypoint', 'Application bundle loaded and parsed');

/**
 * Robust Central Diagnostic System for STL PinCut 3D.
 * Records timestamped checkpoints across DOM, React lifecycle, WebGL, and Three.js scenes.
 */
class DiagnosticTracker {
  constructor() {
    this.startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.events = [];
    this.listeners = new Set();
    this.stages = {
      STAGE_1_ENV: { id: 'STAGE_1_ENV', name: 'Ortam & Tarayıcı Denetimi', status: 'pending', time: null, details: null },
      STAGE_2_DOM: { id: 'STAGE_2_DOM', name: 'DOM Kök Elemanı (#root)', status: 'pending', time: null, details: null },
      STAGE_3_THREE_CORE: { id: 'STAGE_3_THREE_CORE', name: 'Three.js Çekirdek Modülleri', status: 'pending', time: null, details: null },
      STAGE_4_WEBGL: { id: 'STAGE_4_WEBGL', name: 'GPU & WebGL Pipeline Doğrulaması', status: 'pending', time: null, details: null },
      STAGE_5_REACT_ROOT: { id: 'STAGE_5_REACT_ROOT', name: 'React createRoot & Render', status: 'pending', time: null, details: null },
      STAGE_6_APP_MOUNT: { id: 'STAGE_6_APP_MOUNT', name: 'App Bileşen Ağacı Mount', status: 'pending', time: null, details: null },
      STAGE_7_CANVAS_INIT: { id: 'STAGE_7_CANVAS_INIT', name: 'Three.js Canvas onCreated', status: 'pending', time: null, details: null },
      STAGE_8_SCENE_READY: { id: 'STAGE_8_SCENE_READY', name: '3D Sahne & Kamera Başlatma', status: 'pending', time: null, details: null },
      STAGE_9_FIRST_FRAME: { id: 'STAGE_9_FIRST_FRAME', name: 'İlk 3D Kare (Frame) Çizimi', status: 'pending', time: null, details: null }
    };
  }

  getElapsed() {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return (now - this.startTime).toFixed(1);
  }

  log(stageId, message, data = null) {
    const elapsed = this.getElapsed();
    const entry = { type: 'INFO', elapsed: `${elapsed}ms`, stageId, message, data, timestamp: new Date().toISOString() };
    this.events.push(entry);

    if (this.stages[stageId]) {
      this.stages[stageId].status = 'success';
      this.stages[stageId].time = `${elapsed}ms`;
      this.stages[stageId].details = message;
      if (data) this.stages[stageId].data = data;
    }

    console.log(`%c[STL Diagnostic | +${elapsed}ms] [${stageId}] ${message}`, 'color: #06b6d4; font-weight: bold;', data || '');
    this.notify();
  }

  warn(stageId, message, data = null) {
    const elapsed = this.getElapsed();
    const entry = { type: 'WARN', elapsed: `${elapsed}ms`, stageId, message, data, timestamp: new Date().toISOString() };
    this.events.push(entry);

    if (this.stages[stageId]) {
      this.stages[stageId].status = 'warning';
      this.stages[stageId].time = `${elapsed}ms`;
      this.stages[stageId].details = message;
      if (data) this.stages[stageId].data = data;
    }

    console.warn(`%c[STL Diagnostic | +${elapsed}ms] [${stageId}] WARNING: ${message}`, 'color: #f59e0b; font-weight: bold;', data || '');
    this.notify();
  }

  error(stageId, message, error = null) {
    const elapsed = this.getElapsed();
    const errText = error ? (error.stack || error.message || String(error)) : null;
    const entry = { type: 'ERROR', elapsed: `${elapsed}ms`, stageId, message, error: errText, timestamp: new Date().toISOString() };
    this.events.push(entry);

    if (this.stages[stageId]) {
      this.stages[stageId].status = 'error';
      this.stages[stageId].time = `${elapsed}ms`;
      this.stages[stageId].details = message;
      this.stages[stageId].error = errText;
    }

    console.error(`%c[STL Diagnostic | +${elapsed}ms] [${stageId}] ERROR: ${message}`, 'color: #ef4444; font-weight: bold;', error || '');
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const snapshot = { ...this.stages };
    for (const listener of this.listeners) {
      try {
        listener(snapshot, this.events);
      } catch (e) {
        console.warn('Diagnostic subscriber error:', e);
      }
    }
  }

  getExportReport() {
    return JSON.stringify({
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      timestamp: new Date().toISOString(),
      stages: this.stages,
      events: this.events
    }, null, 2);
  }
}

// Attach globally for dev tools inspection (window.__STL_DIAGNOSTICS__)
export const diagnostics = new DiagnosticTracker();
if (typeof window !== 'undefined') {
  window.__STL_DIAGNOSTICS__ = diagnostics;
}

// Stage 1: Environment & Browser Initialization Check
try {
  diagnostics.log('STAGE_1_ENV', 'Tarayıcı ortamı algılandı.', {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    screenSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'
  });
} catch (envErr) {
  diagnostics.error('STAGE_1_ENV', 'Ortam bilgisi okunamadı', envErr);
}

// Stage 3: Three.js Core Integrity Check
try {
  if (THREE && THREE.Vector3 && THREE.BufferGeometry && THREE.WebGLRenderer) {
    diagnostics.log('STAGE_3_THREE_CORE', `Three.js çekirdek sınıfları hazır (r${THREE.REVISION}).`, {
      revision: THREE.REVISION
    });
  } else {
    diagnostics.error('STAGE_3_THREE_CORE', 'Three.js çekirdek sınıfları eksik veya tanımsız.');
  }
} catch (threeErr) {
  diagnostics.error('STAGE_3_THREE_CORE', 'Three.js kütüphane kontrol hatası', threeErr);
}

// Global runtime error listeners
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    diagnostics.error('STAGE_5_REACT_ROOT', `Global Window Error: ${event.message}`, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    diagnostics.error('STAGE_5_REACT_ROOT', `Unhandled Promise Rejection: ${event.reason}`, event.reason);
  });
}

/**
 * Promise-based check for 3D Canvas & WebGL Pipeline Readiness with explicit WebGL2 and hardware acceleration verification.
 */
export function check3DCanvasReadiness() {
  return new Promise((resolve) => {
    diagnostics.log('STAGE_4_WEBGL', 'GPU ve WebGL 2 donanım ivmesi test ediliyor...');

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      diagnostics.warn('STAGE_4_WEBGL', 'DOM mevcut değil, WebGL kontrolü atlandı.');
      return resolve({ ready: false, warning: 'Non-browser execution environment.' });
    }

    try {
      const hwResult = checkHardwareAcceleration({ failIfMajorPerformanceCaveat: true });

      if (!hwResult.isSupported) {
        diagnostics.error('STAGE_4_WEBGL', 'WebGL context oluşturulamadı. Donanım hızlandırması devre dışı olabilir.', {
          reason: hwResult.failureReason
        });
        return resolve({
          ready: false,
          warning: hwResult.failureReason || 'WebGL tarayıcınızda etkinleştirilmemiş veya donanım ivmesi devre dışı.'
        });
      }

      if (!hwResult.isHardwareAccelerated) {
        diagnostics.warn('STAGE_4_WEBGL', `WebGL aktif fakat donanım ivmesi kapalı veya CPU emülasyonu (${hwResult.softwareRendererName || hwResult.unmaskedRenderer}).`, {
          isSoftwareEmulated: hwResult.isSoftwareEmulated,
          renderer: hwResult.unmaskedRenderer,
          vendor: hwResult.unmaskedVendor,
          activeContext: hwResult.activeContextType
        });
      } else {
        diagnostics.log('STAGE_4_WEBGL', `WebGL 2 & Donanım İvmesi Doğrulandı (${hwResult.unmaskedRenderer}).`, {
          glContext: hwResult.activeContextType,
          renderer: hwResult.unmaskedRenderer,
          vendor: hwResult.unmaskedVendor,
          maxTextureSize: hwResult.maxTextureSize
        });
      }

      resolve({
        ready: true,
        glContext: hwResult.activeContextType,
        isHardwareAccelerated: hwResult.isHardwareAccelerated,
        renderer: hwResult.unmaskedRenderer,
        vendor: hwResult.unmaskedVendor
      });
    } catch (checkErr) {
      diagnostics.error('STAGE_4_WEBGL', 'WebGL kontrolü sırasında istisna oluştu.', checkErr);
      resolve({
        ready: false,
        error: checkErr.message
      });
    }
  });
}

/**
 * On-Screen Diagnostic HUD Overlay Component.
 * Visible if an error occurs, watchdog timeout trips, or toggleable by user.
 */
function DiagnosticOverlayHUD({ stages, onDismiss, onRetry, isStalled }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      const report = diagnostics.getExportReport();
      navigator.clipboard?.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  const stageList = Object.values(stages);
  const hasErrors = stageList.some((s) => s.status === 'error');

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        maxWidth: '440px',
        width: 'calc(100vw - 32px)',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        border: hasErrors ? '1px solid #ef4444' : isStalled ? '1px solid #f59e0b' : '1px solid #334155',
        borderRadius: '12px',
        padding: '16px',
        color: '#f8fafc',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        zIndex: 99999,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '13px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
          <span style={{ fontSize: '16px' }}>{hasErrors ? '🚨' : isStalled ? '⏳' : '🔍'}</span>
          <span>{hasErrors ? 'Tanılama: Hata Tespit Edildi' : isStalled ? 'Tanılama: 3D Yükleme Bekleniyor' : 'Sistem Tanılama Durumu'}</span>
        </div>
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '2px 6px'
          }}
          title="Paneli Kapat"
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto', marginBottom: '12px' }}>
        {stageList.map((stage) => {
          const isOk = stage.status === 'success';
          const isErr = stage.status === 'error';
          const isWarn = stage.status === 'warning';
          const icon = isOk ? '✅' : isErr ? '❌' : isWarn ? '⚠️' : '⏳';
          const textColor = isOk ? '#34d399' : isErr ? '#f87171' : isWarn ? '#fbbf24' : '#94a3b8';

          return (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px' }}>
              <span>{icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: textColor, fontWeight: '500' }}>{stage.name}</div>
                {stage.details && <div style={{ color: '#94a3b8', fontSize: '11px' }}>{stage.details}</div>}
                {stage.error && <div style={{ color: '#f87171', fontSize: '11px', wordBreak: 'break-all' }}>{stage.error}</div>}
              </div>
              {stage.time && <span style={{ color: '#64748b', fontSize: '10px' }}>{stage.time}</span>}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleCopy}
          style={{
            flex: 1,
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            color: '#f8fafc',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: '600'
          }}
        >
          {copied ? '✓ Kopyalandı' : '📋 Raporu Kopyala'}
        </button>
        <button
          onClick={onRetry}
          style={{
            flex: 1,
            backgroundColor: '#059669',
            border: 'none',
            color: '#ffffff',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: '600'
          }}
        >
          🔄 Yeniden Başlat
        </button>
      </div>
    </div>
  );
}

/**
 * Diagnostic Root Gate Wrapper that wraps App and manages readiness,
 * stage subscriptions, and watchdog monitoring.
 */
function DiagnosticRootWrapper() {
  const [stages, setStages] = useState(diagnostics.stages);
  const [showHUD, setShowHUD] = useState(false);
  const [isStalled, setIsStalled] = useState(false);
  const watchdogTimerRef = useRef(null);

  useEffect(() => {
    diagnostics.log('STAGE_6_APP_MOUNT', 'DiagnosticRootWrapper DOM’a yerleşti.');
    recordMountCheckpoint('REACT', 'DiagnosticRootWrapper', 'Mounted root diagnostic wrapper');

    // Subscribe to ongoing diagnostic checkpoints
    const unsubscribe = diagnostics.subscribe((updatedStages) => {
      setStages(updatedStages);
      // Auto-show HUD if an error occurs
      const anyError = Object.values(updatedStages).some((s) => s.status === 'error');
      if (anyError) {
        setShowHUD(true);
      }
    });

    // Run WebGL readiness check
    check3DCanvasReadiness().then((res) => {
      if (!res.ready) {
        setShowHUD(true);
      }
    });

    // Watchdog timer: If 3D canvas does not register within 4.5 seconds, display HUD
    watchdogTimerRef.current = setTimeout(() => {
      const isSceneReady = diagnostics.stages.STAGE_8_SCENE_READY.status === 'success';
      if (!isSceneReady) {
        diagnostics.warn('STAGE_7_CANVAS_INIT', '3D Sahne başlatması beklenenden uzun sürdü (Watchdog tetiklendi).');
        setIsStalled(true);
        setShowHUD(true);
      }
    }, 4500);

    return () => {
      unsubscribe();
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ConsoleDiagnosticSummary delayMs={500} />
      <UnitProvider>
        <App />
      </UnitProvider>
      {showHUD && (
        <DiagnosticOverlayHUD
          stages={stages}
          onDismiss={() => setShowHUD(false)}
          onRetry={handleRetry}
          isStalled={isStalled}
        />
      )}
    </div>
  );
}

// Stage 2: DOM container lookup & geometry validation
const rootElement = document.getElementById('root');

if (!rootElement) {
  recordMountCheckpoint('DOM', 'ContainerLookup', 'Element #root missing in document DOM', 'WARN');
  diagnostics.error('STAGE_2_DOM', 'DOM içinde #root elemanı bulunamadı. Kurtarma div elemanı oluşturuluyor.');
  const fallbackDiv = document.createElement('div');
  fallbackDiv.id = 'root';
  document.body.appendChild(fallbackDiv);
  recordMountCheckpoint('DOM', 'FallbackCreated', 'Emergency #root element appended to body');
  mountApp(fallbackDiv);
} else {
  recordMountCheckpoint('DOM', 'ContainerLookup', 'Element #root verified in document DOM');
  diagnostics.log('STAGE_2_DOM', 'DOM #root elemanı doğrulandı.', {
    clientWidth: rootElement.clientWidth,
    clientHeight: rootElement.clientHeight
  });
  mountApp(rootElement);
}

function mountApp(container) {
  try {
    recordMountCheckpoint('REACT', 'createRoot', 'Invoking ReactDOM.createRoot(container)');
    diagnostics.log('STAGE_5_REACT_ROOT', 'ReactDOM.createRoot çağrılıyor...');
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <DiagnosticRootWrapper />
        </ErrorBoundary>
      </React.StrictMode>
    );
    recordMountCheckpoint('REACT', 'root.render', 'Dispatched root.render(<DiagnosticRootWrapper />)');
    diagnostics.log('STAGE_5_REACT_ROOT', 'React root render başarıyla gönderildi.');
  } catch (mountError) {
    recordMountCheckpoint('REACT', 'MountFailure', mountError.message, 'WARN');
    diagnostics.error('STAGE_5_REACT_ROOT', 'React root render başlatılamadı!', mountError);
  }
}

