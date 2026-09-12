import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Constants for unit conversions
 */
export const MM_PER_INCH = 25.4;
export const INCHES_PER_MM = 1 / 25.4;
export const CM3_PER_IN3 = 16.387064;
export const IN3_PER_CM3 = 1 / 16.387064;

export const UNIT_METRIC = 'mm';
export const UNIT_IMPERIAL = 'in';

const LOCAL_STORAGE_KEY = 'stl_pincut_unit_mode';

const UnitContext = createContext(null);

/**
 * Global Unit Provider
 */
export function UnitProvider({ children, initialUnit = null }) {
  const [unit, setUnitState] = useState(() => {
    if (initialUnit) return initialUnit;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved === UNIT_IMPERIAL || saved === UNIT_METRIC) {
          return saved;
        }
      }
    } catch (e) {
      console.warn('[UnitContext] Failed to read unit preference from localStorage:', e);
    }
    return UNIT_METRIC;
  });

  const setUnit = useCallback((newUnit) => {
    const validated = newUnit === UNIT_IMPERIAL ? UNIT_IMPERIAL : UNIT_METRIC;
    setUnitState(validated);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, validated);
      }
    } catch (e) {
      console.warn('[UnitContext] Failed to persist unit preference to localStorage:', e);
    }
  }, []);

  const toggleUnit = useCallback(() => {
    setUnitState((prev) => {
      const next = prev === UNIT_METRIC ? UNIT_IMPERIAL : UNIT_METRIC;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(LOCAL_STORAGE_KEY, next);
        }
      } catch (e) {
        // ignore
      }
      return next;
    });
  }, []);

  const isImperial = unit === UNIT_IMPERIAL;

  /**
   * Converts a value in millimeters to the current active unit (number)
   */
  const convertFromMm = useCallback(
    (mmVal) => {
      if (mmVal === null || mmVal === undefined || isNaN(mmVal)) return 0;
      return isImperial ? mmVal * INCHES_PER_MM : Number(mmVal);
    },
    [isImperial]
  );

  /**
   * Converts a value in the current active unit back to millimeters (number)
   */
  const convertToMm = useCallback(
    (val) => {
      if (val === null || val === undefined || isNaN(val)) return 0;
      return isImperial ? val * MM_PER_INCH : Number(val);
    },
    [isImperial]
  );

  /**
   * Formats a millimeter value as a number string in current unit
   */
  const formatValue = useCallback(
    (mmVal, decimals = null) => {
      if (mmVal === null || mmVal === undefined || isNaN(mmVal)) return '0';
      const converted = convertFromMm(mmVal);
      const dec = decimals !== null ? decimals : (isImperial ? 3 : 2);
      return converted.toFixed(dec);
    },
    [convertFromMm, isImperial]
  );

  /**
   * Formats a millimeter value with the current unit suffix (e.g., "12.50 mm" or "0.492 in")
   */
  const formatLength = useCallback(
    (mmVal, decimals = null) => {
      if (mmVal === null || mmVal === undefined || isNaN(mmVal)) return `0 ${unit}`;
      return `${formatValue(mmVal, decimals)} ${unit}`;
    },
    [formatValue, unit]
  );

  /**
   * Formats 3D spatial dimensions (X × Y × Z) from millimeter vector/object
   */
  const formatDimensions = useCallback(
    (dimObj, decimals = null) => {
      if (!dimObj) return `0 × 0 × 0 ${unit}`;
      const x = formatValue(dimObj.x || 0, decimals);
      const y = formatValue(dimObj.y || 0, decimals);
      const z = formatValue(dimObj.z || 0, decimals);
      return `${x} × ${y} × ${z} ${unit}`;
    },
    [formatValue, unit]
  );

  /**
   * Formats volume (takes cm³ as baseline, converts to in³ if imperial)
   */
  const formatVolume = useCallback(
    (cm3Val, decimals = 2) => {
      if (cm3Val === null || cm3Val === undefined || isNaN(cm3Val)) return isImperial ? '0.00 in³' : '0.00 cm³';
      if (isImperial) {
        const in3 = cm3Val * IN3_PER_CM3;
        return `${in3.toFixed(decimals)} in³`;
      }
      return `${Number(cm3Val).toFixed(decimals)} cm³`;
    },
    [isImperial]
  );

  const contextValue = useMemo(
    () => ({
      unit,
      isImperial,
      unitSymbol: unit,
      setUnit,
      toggleUnit,
      convertFromMm,
      convertToMm,
      formatValue,
      formatLength,
      formatDimensions,
      formatVolume
    }),
    [
      unit,
      isImperial,
      setUnit,
      toggleUnit,
      convertFromMm,
      convertToMm,
      formatValue,
      formatLength,
      formatDimensions,
      formatVolume
    ]
  );

  return <UnitContext.Provider value={contextValue}>{children}</UnitContext.Provider>;
}

/**
 * Hook to access unit context
 */
export function useUnit() {
  const context = useContext(UnitContext);
  if (!context) {
    // Graceful fallback if rendered outside UnitProvider
    return {
      unit: UNIT_METRIC,
      isImperial: false,
      unitSymbol: UNIT_METRIC,
      setUnit: () => {},
      toggleUnit: () => {},
      convertFromMm: (v) => Number(v || 0),
      convertToMm: (v) => Number(v || 0),
      formatValue: (v, dec = 2) => Number(v || 0).toFixed(dec),
      formatLength: (v, dec = 2) => `${Number(v || 0).toFixed(dec)} mm`,
      formatDimensions: (d, dec = 1) => `${(d?.x || 0).toFixed(dec)} × ${(d?.y || 0).toFixed(dec)} × ${(d?.z || 0).toFixed(dec)} mm`,
      formatVolume: (v, dec = 2) => `${Number(v || 0).toFixed(dec)} cm³`
    };
  }
  return context;
}

/**
 * Sleek, reusable Segmented Unit Toggle Button (mm / in)
 */
export function UnitToggle({ size = 'sm', className = '', showLabel = false }) {
  const { unit, setUnit } = useUnit();

  const isSmall = size === 'xs' || size === 'sm';

  return (
    <div
      className={`inline-flex items-center bg-gray-900/90 backdrop-blur-md border border-gray-700/80 rounded-full p-0.5 shadow-lg select-none ${className}`}
      title="Birim Değiştir: Milimetre (mm) / İnç (in)"
    >
      {showLabel && (
        <span className="text-[10px] text-gray-400 font-semibold px-2">Birim:</span>
      )}
      <button
        type="button"
        onClick={() => setUnit(UNIT_METRIC)}
        className={`${
          isSmall ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
        } font-mono font-bold rounded-full transition-all duration-150 cursor-pointer ${
          unit === UNIT_METRIC
            ? 'bg-cyan-500 text-gray-950 shadow-sm shadow-cyan-500/40'
            : 'text-gray-400 hover:text-gray-200'
        }`}
        title="Metrik Ölçü Birimi (Milimetre - mm)"
      >
        mm
      </button>
      <button
        type="button"
        onClick={() => setUnit(UNIT_IMPERIAL)}
        className={`${
          isSmall ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
        } font-mono font-bold rounded-full transition-all duration-150 cursor-pointer ${
          unit === UNIT_IMPERIAL
            ? 'bg-cyan-500 text-gray-950 shadow-sm shadow-cyan-500/40'
            : 'text-gray-400 hover:text-gray-200'
        }`}
        title="İnç Ölçü Birimi (Imperial - in)"
      >
        in
      </button>
    </div>
  );
}
