import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { checkHardwareAcceleration } from '../utils/hardwareAccelerationCheck.js';

/**
 * Diagnostic runner that tests WebGL contexts, Three.js versions, and environment features.
 * Returns a structured audit report.
 */
export function runStartupDiagnostics() {
  const hwCheck = checkHardwareAcceleration({ failIfMajorPerformanceCaveat: true });

  const report = {
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    three: {
      version: typeof THREE !== 'undefined' ? THREE.REVISION : 'MISSING',
      classes: {}
    },
    webgl: {
      webgl2: hwCheck.hasWebGL2,
      webgl1: hwCheck.hasWebGL1,
      experimental: false,
      activeContext: hwCheck.activeContextType,
      isHardwareAccelerated: hwCheck.isHardwareAccelerated,
      isSoftwareEmulated: hwCheck.isSoftwareEmulated,
      softwareRendererName: hwCheck.softwareRendererName,
      renderer: hwCheck.unmaskedRenderer || hwCheck.renderer || 'Unknown',
      vendor: hwCheck.unmaskedVendor || hwCheck.vendor || 'Unknown',
      maxTextureSize: hwCheck.maxTextureSize || null,
      maxVertexUniformVectors: null,
      maxFragmentUniformVectors: null,
      extensions: {}
    },
    mountSequence: typeof window !== 'undefined' && window.__STL_MOUNT_SEQUENCE__ ? [...window.__STL_MOUNT_SEQUENCE__] : []
  };

  // 1. Audit THREE.js library classes
  if (typeof THREE !== 'undefined') {
    const requiredClasses = [
      'Vector3',
      'Matrix4',
      'BufferGeometry',
      'WebGLRenderer',
      'Mesh',
      'MeshStandardMaterial',
      'Plane',
      'Raycaster'
    ];
    requiredClasses.forEach((cls) => {
      report.three.classes[cls] = typeof THREE[cls] === 'function';
    });
  }

  // 2. Audit WebGL Rendering Contexts
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;

    // Test WebGL2
    try {
      const gl2 = canvas.getContext('webgl2');
      report.webgl.webgl2 = !!gl2;
      if (gl2 && !report.webgl.activeContext) {
        report.webgl.activeContext = 'webgl2';
        extractGLInfo(gl2, report.webgl);
      }
    } catch (e) {
      report.webgl.webgl2Error = e.message;
    }

    // Test WebGL1
    try {
      const gl1 = canvas.getContext('webgl');
      report.webgl.webgl1 = !!gl1;
      if (gl1 && !report.webgl.activeContext) {
        report.webgl.activeContext = 'webgl';
        extractGLInfo(gl1, report.webgl);
      }
    } catch (e) {
      report.webgl.webgl1Error = e.message;
    }

    // Test Experimental WebGL
    try {
      const glExp = canvas.getContext('experimental-webgl');
      report.webgl.experimental = !!glExp;
      if (glExp && !report.webgl.activeContext) {
        report.webgl.activeContext = 'experimental-webgl';
        extractGLInfo(glExp, report.webgl);
      }
    } catch (e) {
      report.webgl.experimentalError = e.message;
    }
  }

  return report;
}

function extractGLInfo(gl, target) {
  try {
    const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugExt) {
      target.renderer = gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL) || target.renderer;
      target.vendor = gl.getParameter(debugExt.UNMASKED_VENDOR_WEBGL) || target.vendor;
    }
    target.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    target.maxVertexUniformVectors = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
    target.maxFragmentUniformVectors = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);

    const checkedExtensions = [
      'WEBGL_debug_renderer_info',
      'EXT_color_buffer_float',
      'OES_element_index_uint',
      'OES_texture_float',
      'WEBGL_lose_context'
    ];
    checkedExtensions.forEach((ext) => {
      target.extensions[ext] = !!gl.getExtension(ext);
    });
  } catch (err) {
    target.extractError = err.message;
  }
}

/**
 * Print a color-coded table summary to the browser console.
 */
export function printConsoleDiagnosticSummary(report) {
  const { webgl, three, mountSequence } = report;

  console.group('%c🚀 [STL PinCut 3D] STARTUP DIAGNOSTIC SUMMARY', 'background: #0f172a; color: #38bdf8; font-size: 13px; font-weight: bold; padding: 6px 10px; border-radius: 4px; border: 1px solid #0284c7;');

  // Table 1: Environment & Engine Health
  const engineHealth = [
    {
      'Diagnostic Item': 'Three.js Library Version',
      'Status': three.version !== 'MISSING' ? '✅ PASS' : '❌ FAIL',
      'Details': `Revision r${three.version}`
    },
    {
      'Diagnostic Item': 'Three.js Core Classes',
      'Status': Object.values(three.classes).every(Boolean) ? '✅ PASS' : '❌ FAIL',
      'Details': Object.keys(three.classes).filter(c => three.classes[c]).join(', ')
    },
    {
      'Diagnostic Item': 'GPU Hardware Acceleration',
      'Status': webgl.isHardwareAccelerated ? '✅ ENABLED' : (webgl.isSoftwareEmulated ? '⚠️ CPU EMULATED' : '❌ DISABLED'),
      'Details': webgl.isHardwareAccelerated
        ? 'Native GPU hardware acceleration confirmed'
        : (webgl.softwareRendererName ? `Software Rasterizer detected (${webgl.softwareRendererName})` : 'Hardware acceleration disabled in browser')
    },
    {
      'Diagnostic Item': 'WebGL 2 Context',
      'Status': webgl.webgl2 ? '✅ AVAILABLE' : '⚠️ UNAVAILABLE',
      'Details': webgl.webgl2 ? 'Supported (Explicit High-Performance)' : 'WebGL 2 not supported by browser'
    },
    {
      'Diagnostic Item': 'WebGL 1 Context',
      'Status': webgl.webgl1 ? '✅ AVAILABLE' : '❌ UNAVAILABLE',
      'Details': webgl.webgl1 ? 'Supported (Standard Fallback)' : 'WebGL 1 disabled/missing'
    },
    {
      'Diagnostic Item': 'GPU Hardware Unmasked',
      'Status': webgl.renderer !== 'Unknown' ? '✅ DETECTED' : '⚠️ GENERIC',
      'Details': `${webgl.renderer} (${webgl.vendor})`
    },
    {
      'Diagnostic Item': 'Max Texture Resolution',
      'Status': webgl.maxTextureSize ? '✅ OK' : '⚠️ UNKNOWN',
      'Details': webgl.maxTextureSize ? `${webgl.maxTextureSize}px` : 'N/A'
    }
  ];

  console.log('%cHardware & Framework Audit:', 'color: #34d399; font-weight: bold; font-size: 11px;');
  if (console.table) {
    console.table(engineHealth);
  } else {
    console.log(engineHealth);
  }

  // Table 2: Component Mounting Sequence
  if (mountSequence && mountSequence.length > 0) {
    const sequenceRows = mountSequence.map((step, idx) => ({
      '#': idx + 1,
      'Phase': step.phase,
      'Component / Stage': step.name,
      'Status': step.status === 'OK' ? '✅ OK' : '⚠️ WARN',
      'Offset': `+${step.elapsed}ms`,
      'Details': step.details || '-'
    }));

    console.log('%cComponent Mounting Sequence Track:', 'color: #a78bfa; font-weight: bold; font-size: 11px;');
    if (console.table) {
      console.table(sequenceRows);
    } else {
      console.log(sequenceRows);
    }
  } else {
    console.log('%cComponent Mounting Sequence: Initializing...', 'color: #94a3b8;');
  }

  console.log('%cTip: Run window.__runDiagnosticSummary() in console anytime to re-evaluate startup status.', 'color: #64748b; font-style: italic;');
  console.groupEnd();
}

/**
 * Record a mount sequence checkpoint safely.
 */
export function recordMountCheckpoint(phase, name, details = '', status = 'OK') {
  if (typeof window === 'undefined') return;
  if (!window.__STL_START_TIME__) {
    window.__STL_START_TIME__ = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }
  if (!window.__STL_MOUNT_SEQUENCE__) {
    window.__STL_MOUNT_SEQUENCE__ = [];
  }

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const elapsed = (now - window.__STL_START_TIME__).toFixed(1);

  const entry = {
    phase,
    name,
    status,
    details,
    elapsed,
    timestamp: new Date().toISOString()
  };

  window.__STL_MOUNT_SEQUENCE__.push(entry);

  // If startup diagnostic runner is attached, notify it
  if (typeof window.__STL_ON_MOUNT_CHECKPOINT__ === 'function') {
    window.__STL_ON_MOUNT_CHECKPOINT__(entry);
  }
}

/**
 * React Component that automates running and printing the diagnostic summary
 * during component mount, and exposes a global function for on-demand console evaluation.
 */
export function ConsoleDiagnosticSummary({ delayMs = 600 }) {
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    recordMountCheckpoint('REACT', 'ConsoleDiagnosticSummary', 'Mounted in component tree');

    // Register on-demand runner for console
    if (typeof window !== 'undefined') {
      window.__runDiagnosticSummary = () => {
        const freshReport = runStartupDiagnostics();
        printConsoleDiagnosticSummary(freshReport);
        return freshReport;
      };
    }

    // Schedule automatic print after initial mount settles
    const timer = setTimeout(() => {
      if (!hasPrintedRef.current) {
        hasPrintedRef.current = true;
        const report = runStartupDiagnostics();
        printConsoleDiagnosticSummary(report);
      }
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [delayMs]);

  return null; // Headless diagnostic component
}
