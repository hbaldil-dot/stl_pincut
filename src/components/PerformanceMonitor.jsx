import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * PerformanceMonitor runs inside the R3F Canvas and monitors:
 * - Real-time rendering FPS and frame latency (ms)
 * - Three.js WebGLRenderer draw calls and rendered triangle count
 * - Model and sliced parts geometry triangle and vertex counts
 *
 * It throttles updates to ~4Hz (every 250ms) to maintain maximum 3D rendering efficiency.
 */
export function PerformanceMonitor({
  model,
  splitResult,
  onUpdateStats
}) {
  const { gl } = useThree();
  const lastSampleTimeRef = useRef(performance.now());
  const framesCountRef = useRef(0);
  const sparklineHistoryRef = useRef([60, 60, 60, 60, 60]);
  const smoothFpsRef = useRef(60);
  const minFpsRef = useRef(60);
  const maxFpsRef = useRef(60);
  const sampleCounterRef = useRef(0);

  useFrame((_, delta) => {
    framesCountRef.current += 1;
    const now = performance.now();

    // Instantaneous FPS from delta
    const instantFps = delta > 0 ? Math.min(240, Math.max(1, Math.round(1 / delta))) : 60;
    smoothFpsRef.current = Math.round(smoothFpsRef.current * 0.82 + instantFps * 0.18);

    // Track min/max with periodic decay towards current
    sampleCounterRef.current += 1;
    if (sampleCounterRef.current % 120 === 0) {
      minFpsRef.current = smoothFpsRef.current;
      maxFpsRef.current = smoothFpsRef.current;
    } else {
      if (smoothFpsRef.current < minFpsRef.current) minFpsRef.current = smoothFpsRef.current;
      if (smoothFpsRef.current > maxFpsRef.current) maxFpsRef.current = smoothFpsRef.current;
    }

    // Keep ring buffer of last 24 frames for sparkline
    sparklineHistoryRef.current.push(smoothFpsRef.current);
    if (sparklineHistoryRef.current.length > 24) {
      sparklineHistoryRef.current.shift();
    }

    // Throttle React updates to every 250ms
    const elapsed = now - lastSampleTimeRef.current;
    if (elapsed >= 250) {
      // 1. WebGL Renderer real-time stats
      const renderedTriangles = gl?.info?.render?.triangles || 0;
      const drawCalls = gl?.info?.render?.calls || 0;
      const geometriesInMemory = gl?.info?.memory?.geometries || 0;
      const texturesInMemory = gl?.info?.memory?.textures || 0;

      // 2. Compute exact model triangle and vertex counts
      let modelTriangles = 0;
      let modelVertices = 0;
      let partATriangles = 0;
      let partBTriangles = 0;
      let pinTriangles = 0;
      let hasSplit = false;

      if (splitResult) {
        hasSplit = true;
        if (splitResult.triangleCountA) {
          partATriangles = splitResult.triangleCountA;
        } else if (splitResult.partA?.geometry) {
          const gA = splitResult.partA.geometry;
          partATriangles = gA.index
            ? Math.floor(gA.index.count / 3)
            : (gA.attributes?.position?.count ? Math.floor(gA.attributes.position.count / 3) : 0);
        }

        if (splitResult.triangleCountB) {
          partBTriangles = splitResult.triangleCountB;
        } else if (splitResult.partB?.geometry) {
          const gB = splitResult.partB.geometry;
          partBTriangles = gB.index
            ? Math.floor(gB.index.count / 3)
            : (gB.attributes?.position?.count ? Math.floor(gB.attributes.position.count / 3) : 0);
        }

        if (splitResult.dowelPinGeometry) {
          const gP = splitResult.dowelPinGeometry;
          pinTriangles = gP.index
            ? Math.floor(gP.index.count / 3)
            : (gP.attributes?.position?.count ? Math.floor(gP.attributes.position.count / 3) : 0);
        }

        modelTriangles = partATriangles + partBTriangles + pinTriangles;

        const vA = splitResult.partA?.geometry?.attributes?.position?.count || 0;
        const vB = splitResult.partB?.geometry?.attributes?.position?.count || 0;
        const vP = splitResult.dowelPinGeometry?.attributes?.position?.count || 0;
        modelVertices = vA + vB + vP;
      } else if (model?.geometry) {
        const geom = model.geometry;
        modelTriangles = geom.index
          ? Math.floor(geom.index.count / 3)
          : (geom.attributes?.position?.count ? Math.floor(geom.attributes.position.count / 3) : 0);
        modelVertices = geom.attributes?.position?.count || 0;
      }

      const frameTimeMs = (delta * 1000).toFixed(1);

      if (onUpdateStats) {
        onUpdateStats({
          fps: smoothFpsRef.current,
          instantFps,
          minFps: minFpsRef.current,
          maxFps: maxFpsRef.current,
          frameTimeMs,
          renderedTriangles,
          modelTriangles,
          modelVertices,
          drawCalls,
          geometriesInMemory,
          texturesInMemory,
          hasSplit,
          partATriangles,
          partBTriangles,
          pinTriangles,
          history: [...sparklineHistoryRef.current]
        });
      }

      lastSampleTimeRef.current = now;
      framesCountRef.current = 0;
    }
  });

  return null;
}
