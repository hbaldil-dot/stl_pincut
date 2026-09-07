/**
 * Hardware Acceleration & WebGL Context Browser Check Utility
 * 
 * Verifies that the browser supports WebGL (explicitly prioritizing WebGL 2),
 * and confirms that genuine GPU hardware acceleration is enabled rather than
 * slow CPU/software fallback emulation (SwiftShader, llvmpipe, etc.).
 */

/**
 * Known CPU/Software Rasterizers that indicate hardware acceleration is turned off.
 */
const SOFTWARE_RENDERER_PATTERNS = [
  /swiftshader/i,
  /llvmpipe/i,
  /software rasterizer/i,
  /microsoft basic render/i,
  /mesa x11/i,
  /software/i,
  /gdi generic/i
];

/**
 * Check whether a given renderer string points to software emulation.
 */
export function isSoftwareRenderer(rendererString) {
  if (!rendererString || typeof rendererString !== 'string') return false;
  return SOFTWARE_RENDERER_PATTERNS.some(pattern => pattern.test(rendererString));
}

/**
 * Get browser-specific steps to enable Hardware Acceleration.
 * @param {string} [customUserAgent] - Optional custom userAgent string for testing.
 */
export function getHardwareAccelerationInstructions(customUserAgent) {
  const ua = customUserAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const isChrome = /chrome|chromium|crios/i.test(ua) && !/edg|opr\//i.test(ua);
  const isEdge = /edg/i.test(ua);
  const isFirefox = /firefox|fxios/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome|chromium|edg/i.test(ua);

  if (isEdge) {
    return {
      browser: 'Microsoft Edge',
      url: 'edge://settings/system',
      steps: [
        'Adres çubuğuna edge://settings/system yazın ve Enter\'a basın.',
        '"Kullanılabilir olduğunda donanım ivmesini kullan" (Use hardware acceleration when available) seçeneğini AÇIK yapın.',
        'Tarayıcınızı yeniden başlatın.'
      ]
    };
  }

  if (isFirefox) {
    return {
      browser: 'Mozilla Firefox',
      url: 'about:preferences',
      steps: [
        'Ayarlar > Genel > Performans bölümüne gidin.',
        '"Önerilen performans ayarlarını kullan" işaretini kaldırın.',
        '"Mümkün olduğunda donanım ivmesini kullan" seçeneğini işaretleyin.',
        'about:config sayfasında "webgl.disabled" değerinin false olduğundan emin olun.'
      ]
    };
  }

  if (isSafari) {
    return {
      browser: 'Apple Safari',
      url: 'Ayarlar > İleri Düzey',
      steps: [
        'Safari > Tercihler / Ayarlar > İleri Düzey (Advanced) menüsünü açın.',
        '"Geliştirici menüsünü göster" seçeneğini aktif edin.',
        'Geliştirici > Deneysel Özellikler altında WebGL 2.0\'ın açık olduğunu doğrulayın.'
      ]
    };
  }

  // Default: Google Chrome or Chromium based
  return {
    browser: isChrome ? 'Google Chrome' : 'Chromium / Tarayıcı',
    url: 'chrome://settings/system',
    steps: [
      'Adres çubuğuna chrome://settings/system yazın ve Enter\'a basın.',
      '"Kullanılabilir olduğunda grafik hızlandırmayı kullan" (Use hardware acceleration when available) ayarını aktif edin.',
      'chrome://gpu adresinden "WebGL2" durumunun "Hardware accelerated" olduğunu doğrulayın.',
      'Tarayıcınızı yeniden başlatın.'
    ]
  };
}

/**
 * Synchronously checks hardware acceleration and WebGL2/WebGL1 availability.
 * 
 * @param {Object} options
 * @param {boolean} [options.requireWebGL2=false] - Whether WebGL 2 is strictly required.
 * @param {boolean} [options.failIfMajorPerformanceCaveat=true] - Test strict hardware acceleration first.
 * @returns {HardwareAccelerationStatus}
 */
export function checkHardwareAcceleration(options = {}) {
  const {
    requireWebGL2 = false,
    failIfMajorPerformanceCaveat = true
  } = options;

  const result = {
    timestamp: new Date().toISOString(),
    isSupported: false,
    isHardwareAccelerated: false,
    hasWebGL2: false,
    hasWebGL1: false,
    activeContextType: null,
    isMajorPerformanceCaveat: false,
    isSoftwareEmulated: false,
    softwareRendererName: null,
    renderer: 'Unknown',
    vendor: 'Unknown',
    unmaskedRenderer: 'Unknown',
    unmaskedVendor: 'Unknown',
    maxTextureSize: 0,
    glVersion: '',
    shadingLanguageVersion: '',
    diagnostics: [],
    failureReason: null,
    instructions: null
  };

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    result.failureReason = 'Tarayıcı DOM ortamı bulunamadı (SSR/Node).';
    result.diagnostics.push(result.failureReason);
    return result;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;

  let gl = null;
  let contextType = null;
  let majorCaveatDetected = false;

  // 1. Try explicit WebGL 2 with strict hardware acceleration (failIfMajorPerformanceCaveat: true)
  if (failIfMajorPerformanceCaveat) {
    try {
      gl = canvas.getContext('webgl2', {
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: true,
        alpha: true,
        antialias: true
      });
      if (gl) {
        contextType = 'webgl2';
        result.hasWebGL2 = true;
        result.isHardwareAccelerated = true;
        result.diagnostics.push('WebGL 2 context başarıyla GPU donanım ivmesi ile oluşturuldu.');
      }
    } catch (e) {
      result.diagnostics.push(`Strict WebGL 2 denemesi hata verdi: ${e.message}`);
    }
  }

  // 2. If strict WebGL 2 didn't yield a context, try WebGL 2 without strict caveat check
  if (!gl) {
    try {
      gl = canvas.getContext('webgl2', {
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
        alpha: true,
        antialias: true
      });
      if (gl) {
        contextType = 'webgl2';
        result.hasWebGL2 = true;
        // If it succeeded only without caveat check, it might be software rasterized
        majorCaveatDetected = true;
        result.diagnostics.push('WebGL 2 oluşturuldu fakat donanım ivmesi sınırlandırılmış olabilir (Performance Caveat).');
      }
    } catch (e) {
      result.diagnostics.push(`WebGL 2 fallback denemesi hata verdi: ${e.message}`);
    }
  }

  // 3. If WebGL 2 is not available and not strictly required, try WebGL 1
  if (!gl && !requireWebGL2) {
    if (failIfMajorPerformanceCaveat) {
      try {
        gl = canvas.getContext('webgl', {
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: true,
          alpha: true,
          antialias: true
        });
        if (gl) {
          contextType = 'webgl';
          result.hasWebGL1 = true;
          result.isHardwareAccelerated = true;
          result.diagnostics.push('WebGL 1 context başarıyla GPU donanım ivmesi ile oluşturuldu.');
        }
      } catch (e) {
        result.diagnostics.push(`Strict WebGL 1 denemesi hata verdi: ${e.message}`);
      }
    }

    if (!gl) {
      try {
        gl = canvas.getContext('webgl', {
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
          alpha: true,
          antialias: true
        }) || canvas.getContext('experimental-webgl');
        if (gl) {
          contextType = 'webgl';
          result.hasWebGL1 = true;
          majorCaveatDetected = true;
          result.diagnostics.push('WebGL 1 context yazılımsal veya standart modda oluşturuldu.');
        }
      } catch (e) {
        result.diagnostics.push(`WebGL 1 fallback denemesi hata verdi: ${e.message}`);
      }
    }
  }

  // If no context could be acquired at all
  if (!gl) {
    result.isSupported = false;
    result.isHardwareAccelerated = false;
    result.failureReason = requireWebGL2
      ? 'WebGL 2 tarayıcınızda veya grafik kartınızda desteklenmiyor.'
      : 'Tarayıcınızda WebGL grafik bağlamı başlatılamadı. Donanım hızlandırması kapalı olabilir.';
    result.instructions = getHardwareAccelerationInstructions();
    return result;
  }

  // Context acquired successfully
  result.isSupported = true;
  result.activeContextType = contextType;
  result.isMajorPerformanceCaveat = majorCaveatDetected;

  // Inspect driver and hardware details
  try {
    result.glVersion = gl.getParameter(gl.VERSION) || '';
    result.shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || '';
    result.renderer = gl.getParameter(gl.RENDERER) || 'Generic WebGL';
    result.vendor = gl.getParameter(gl.VENDOR) || 'Generic Vendor';
    result.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      result.unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || result.renderer;
      result.unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || result.vendor;
    } else {
      result.unmaskedRenderer = result.renderer;
      result.unmaskedVendor = result.vendor;
    }

    // Check if the unmasked renderer matches known software renderers
    if (isSoftwareRenderer(result.unmaskedRenderer) || isSoftwareRenderer(result.renderer)) {
      result.isSoftwareEmulated = true;
      result.softwareRendererName = result.unmaskedRenderer || result.renderer;
      result.isHardwareAccelerated = false;
      result.diagnostics.push(`Yazılımsal rasterizer algılandı (${result.softwareRendererName}). Donanım hızlandırması devre dışı.`);
    } else if (!majorCaveatDetected) {
      result.isHardwareAccelerated = true;
      result.diagnostics.push(`Donanım GPU ivmesi onaylandı: ${result.unmaskedRenderer}`);
    } else {
      // Caveat detected without explicit software name
      result.isHardwareAccelerated = false;
      result.diagnostics.push('Tarayıcı donanım hızlandırması uyarısı bildirdi.');
    }

    // Test a basic GPU clear command to verify pipeline is responsive
    gl.clearColor(0.05, 0.05, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const err = gl.getError();
    if (err !== gl.NO_ERROR) {
      result.diagnostics.push(`WebGL clear test hata kodu döndürdü: ${err}`);
    }

    // Safely dispose test context to avoid leaking GPU resources
    const loseExt = gl.getExtension('WEBGL_lose_context');
    if (loseExt && typeof loseExt.loseContext === 'function') {
      loseExt.loseContext();
    }
  } catch (err) {
    result.diagnostics.push(`GPU parametreleri okunurken hata: ${err.message}`);
  }

  if (!result.isHardwareAccelerated) {
    result.instructions = getHardwareAccelerationInstructions();
  }

  return result;
}

/**
 * Asynchronous promise-based wrapper for hardware acceleration checking.
 */
export function verifyHardwareAcceleration(options = {}) {
  return new Promise((resolve) => {
    // Schedule on microtask / next frame to allow DOM ready
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        resolve(checkHardwareAcceleration(options));
      });
    } else {
      setTimeout(() => {
        resolve(checkHardwareAcceleration(options));
      }, 0);
    }
  });
}
