import * as THREE from 'three';

/**
 * Creates a clean serializable snapshot of the 3D workspace state.
 */
export function createWorkspaceSnapshot({
  description = 'İşlem',
  type = 'GENERAL',
  splitResult = null,
  pinConfig = {},
  clippingConfig = {},
  modelRotation = { x: 0, y: 0, z: 0 },
  drawnPoints = [],
  isLoopClosed = false,
  loopPoints = [],
  measurePointA = null,
  measurePointB = null,
  isMeasureActive = false,
  activeMode = 'plane',
  explodedDistance = 15
}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    type,
    description,
    timestamp: Date.now(),
    state: {
      splitResult: splitResult ? cloneSplitResult(splitResult) : null,
      pinConfig: { ...pinConfig },
      modelRotation: {
        x: modelRotation?.x ?? 0,
        y: modelRotation?.y ?? 0,
        z: modelRotation?.z ?? 0
      },
      clippingConfig: {
        ...clippingConfig,
        normal: clippingConfig.normal
          ? {
              x: clippingConfig.normal.x,
              y: clippingConfig.normal.y,
              z: clippingConfig.normal.z
            }
          : { x: 0, y: 1, z: 0 }
      },
      drawnPoints: (drawnPoints || []).map((p) => ({
        x: p.x,
        y: p.y,
        z: p.z
      })),
      isLoopClosed: !!isLoopClosed,
      loopPoints: (loopPoints || []).map((p) => ({
        x: p.x,
        y: p.y,
        z: p.z
      })),
      measurePointA: measurePointA
        ? { x: measurePointA.x, y: measurePointA.y, z: measurePointA.z }
        : null,
      measurePointB: measurePointB
        ? { x: measurePointB.x, y: measurePointB.y, z: measurePointB.z }
        : null,
      isMeasureActive: !!isMeasureActive,
      activeMode,
      explodedDistance
    }
  };
}

/**
 * Safely clones split result objects while preserving Three.js mesh geometries
 */
function cloneSplitResult(splitResult) {
  if (!splitResult) return null;
  return {
    ...splitResult,
    partA: splitResult.partA ? splitResult.partA : null,
    partB: splitResult.partB ? splitResult.partB : null,
    dowelPinGeometry: splitResult.dowelPinGeometry || null,
    dowelSpecs: splitResult.dowelSpecs ? { ...splitResult.dowelSpecs } : null,
    pinConfig: splitResult.pinConfig ? { ...splitResult.pinConfig } : null
  };
}

/**
 * Reconstitutes full Three.js Vector3 and object instances from a serialized snapshot
 */
export function restoreWorkspaceSnapshot(snapshot) {
  if (!snapshot || !snapshot.state) return null;
  const s = snapshot.state;

  return {
    splitResult: s.splitResult,
    pinConfig: { ...s.pinConfig },
    modelRotation: s.modelRotation ? { ...s.modelRotation } : { x: 0, y: 0, z: 0 },
    clippingConfig: {
      ...s.clippingConfig,
      normal: new THREE.Vector3(
        s.clippingConfig.normal?.x ?? 0,
        s.clippingConfig.normal?.y ?? 1,
        s.clippingConfig.normal?.z ?? 0
      )
    },
    drawnPoints: (s.drawnPoints || []).map((p) => new THREE.Vector3(p.x, p.y, p.z)),
    isLoopClosed: s.isLoopClosed,
    loopPoints: (s.loopPoints || []).map((p) => new THREE.Vector3(p.x, p.y, p.z)),
    measurePointA: s.measurePointA
      ? new THREE.Vector3(s.measurePointA.x, s.measurePointA.y, s.measurePointA.z)
      : null,
    measurePointB: s.measurePointB
      ? new THREE.Vector3(s.measurePointB.x, s.measurePointB.y, s.measurePointB.z)
      : null,
    isMeasureActive: s.isMeasureActive,
    activeMode: s.activeMode || 'plane',
    explodedDistance: s.explodedDistance ?? 15
  };
}
