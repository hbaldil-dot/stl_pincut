import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { calculateBestFitPlane, createPinGeometry, createCapGeometry } from '../utils/meshSlicer';

/**
 * 3D Interactive Gizmo rendering the Cut Plane Surface, Alignment Pins, and Cylindrical Hole Cavity Previews
 * with active surface-normal & centroid snapping guides for guaranteed flush-fitting between cut sections.
 */
export function PinGizmo({
  loopPoints,
  planeNormal,
  planeCenter,
  pinConfig,
  onPinConfigChange,
  showSnappingGuide = true
}) {
  // 1. Calculate raw geometric center and normal vector from either Lasso loop or Clipping Plane
  const { rawCenter, rawNormal } = useMemo(() => {
    if (planeNormal && planeCenter) {
      return {
        rawCenter: planeCenter.clone(),
        rawNormal: planeNormal.clone().normalize()
      };
    }
    if (loopPoints && loopPoints.length >= 3) {
      const planeInfo = calculateBestFitPlane(loopPoints);
      return {
        rawCenter: planeInfo.center.clone(),
        rawNormal: planeInfo.normal.clone().normalize()
      };
    }
    return {
      rawCenter: new THREE.Vector3(0, 0, 0),
      rawNormal: new THREE.Vector3(0, 1, 0)
    };
  }, [planeNormal, planeCenter, loopPoints]);

  const mode = pinConfig?.mode || 'pin_and_hole';
  const diameter = pinConfig?.diameter || pinConfig?.size || 8;
  const depth = pinConfig?.depth || pinConfig?.height || 10;
  const clearance = typeof pinConfig?.clearance === 'number' ? pinConfig.clearance : 0.2;
  const snapToNormal = pinConfig?.snapToNormal !== false;
  const snapToCenter = pinConfig?.snapToCenter !== false;
  const flushFit = pinConfig?.flushFit !== false;
  const depthRelief = flushFit ? 0.5 : 0;

  // 2. Compute orthonormal in-plane coordinate basis (u, v) on the cut plane
  const { normal, u, v, quatToNormal } = useMemo(() => {
    const norm = rawNormal.clone().normalize();
    const uVec = new THREE.Vector3();
    if (Math.abs(norm.x) < 0.9) {
      uVec.crossVectors(norm, new THREE.Vector3(1, 0, 0)).normalize();
    } else {
      uVec.crossVectors(norm, new THREE.Vector3(0, 1, 0)).normalize();
    }
    const vVec = new THREE.Vector3().crossVectors(norm, uVec).normalize();

    const defaultUp = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(defaultUp, norm);

    return { normal: norm, u: uVec, v: vVec, quatToNormal: quat };
  }, [rawNormal]);

  // 3. Resolve Effective Pin Center: either locked to geometric centroid or tangent offset
  const { center, isNearCenter, isSnapped } = useMemo(() => {
    const rawOffU = pinConfig?.offsetU || 0;
    const rawOffV = pinConfig?.offsetV || 0;
    const magThresh = pinConfig?.magneticThreshold || 3.0;
    const distToCenter = Math.hypot(rawOffU, rawOffV);

    let pt = rawCenter.clone();
    let snapped = snapToCenter || distToCenter < 0.05;

    if (!snapToCenter) {
      if (distToCenter >= magThresh) {
        pt.add(u.clone().multiplyScalar(rawOffU));
        pt.add(v.clone().multiplyScalar(rawOffV));
      } else {
        snapped = true;
      }
    }

    return {
      center: pt,
      isNearCenter: distToCenter < magThresh,
      isSnapped: snapped && snapToNormal
    };
  }, [rawCenter, snapToCenter, snapToNormal, pinConfig?.offsetU, pinConfig?.offsetV, pinConfig?.magneticThreshold, u, v]);

  // 4. Cap Surface Polygon Geometry (only in Lasso mode)
  const capGeom = useMemo(() => {
    if (!loopPoints || loopPoints.length < 3) return null;
    return createCapGeometry(loopPoints, center, normal);
  }, [loopPoints, center, normal]);

  // 5. Male Pin Geometry (oriented strictly along surface normal)
  const { pinGeom, effNormal, pinPos } = useMemo(() => {
    if (mode === 'holes_both' || mode === 'hole_only' || mode === 'flat') {
      return { pinGeom: null, effNormal: normal.clone(), pinPos: center.clone() };
    }
    const payload = {
      ...pinConfig,
      diameter,
      depth,
      type: pinConfig?.type || 'cylinder',
      taper: pinConfig?.taper || 0.85
    };
    return createPinGeometry(payload, center, normal);
  }, [pinConfig, center, normal, mode, diameter, depth]);

  // 6. Cylindrical Hole Preview Geometry (Socket Cavity with flush relief)
  const holePreviewGeom = useMemo(() => {
    if (mode === 'pin_only' || mode === 'flat') return null;

    const holeDiam = mode === 'pin_and_hole' ? diameter + clearance * 2 : diameter;
    const holeDepth = (mode === 'pin_and_hole' ? depth + clearance : depth) + depthRelief;
    const radius = holeDiam * 0.5;

    const geom = new THREE.CylinderGeometry(radius, radius, holeDepth, 28);
    const socketNormal = normal.clone();
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(defaultUp, socketNormal);
    geom.applyQuaternion(quat);

    const offset = socketNormal.clone().multiplyScalar(holeDepth * 0.5);
    const holePos = center.clone().add(offset);
    geom.translate(holePos.x, holePos.y, holePos.z);
    geom.computeVertexNormals();

    return geom;
  }, [center, normal, mode, diameter, depth, clearance, depthRelief]);

  // 7. Secondary Hole Preview for 'holes_both' mode
  const holePreviewGeomA = useMemo(() => {
    if (mode !== 'holes_both') return null;

    const radius = diameter * 0.5;
    const safeDepth = depth + depthRelief;
    const geom = new THREE.CylinderGeometry(radius, radius, safeDepth, 28);
    const socketNormal = normal.clone().negate();
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(defaultUp, socketNormal);
    geom.applyQuaternion(quat);

    const offset = socketNormal.clone().multiplyScalar(safeDepth * 0.5);
    const holePos = center.clone().add(offset);
    geom.translate(holePos.x, holePos.y, holePos.z);
    geom.computeVertexNormals();

    return geom;
  }, [center, normal, mode, diameter, depth, depthRelief]);

  // 8. Normal Axis Vector Ray Points
  const normalAxisLine = useMemo(() => {
    const lineLen = depth * 2.8 + 20;
    const start = center.clone().add(effNormal.clone().multiplyScalar(-lineLen * 0.45));
    const end = center.clone().add(effNormal.clone().multiplyScalar(lineLen * 0.85));
    return [
      [start.x, start.y, start.z],
      [end.x, end.y, end.z]
    ];
  }, [center, effNormal, depth]);

  // 9. Tether Line from Geometric Centroid to Offset Pin Position
  const tetherLine = useMemo(() => {
    if (snapToCenter || rawCenter.distanceTo(center) < 0.1) return null;
    return [
      [rawCenter.x, rawCenter.y, rawCenter.z],
      [center.x, center.y, center.z]
    ];
  }, [snapToCenter, rawCenter, center]);

  // 10. In-Plane Reticle Crosshair Points
  const crosshairPoints = useMemo(() => {
    const armLen = Math.max(diameter * 1.5, 12);
    const uArm1 = center.clone().add(u.clone().multiplyScalar(-armLen));
    const uArm2 = center.clone().add(u.clone().multiplyScalar(armLen));
    const vArm1 = center.clone().add(v.clone().multiplyScalar(-armLen));
    const vArm2 = center.clone().add(v.clone().multiplyScalar(armLen));

    return {
      uLine: [[uArm1.x, uArm1.y, uArm1.z], [uArm2.x, uArm2.y, uArm2.z]],
      vLine: [[vArm1.x, vArm1.y, vArm1.z], [vArm2.x, vArm2.y, vArm2.z]]
    };
  }, [center, u, v, diameter]);

  // 11. Circular Snapping Ring Vertices lying directly on the cut plane
  const snappingRingPoints = useMemo(() => {
    const ringRadius = diameter * 0.85;
    const pts = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const pt = center.clone()
        .add(u.clone().multiplyScalar(Math.cos(theta) * ringRadius))
        .add(v.clone().multiplyScalar(Math.sin(theta) * ringRadius));
      pts.push([pt.x, pt.y, pt.z]);
    }
    return pts;
  }, [center, u, v, diameter]);

  // 12. Outer Snapping Target Ring Points
  const outerTargetRingPoints = useMemo(() => {
    const targetRadius = Math.max(diameter * 1.4, 14);
    const pts = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const pt = center.clone()
        .add(u.clone().multiplyScalar(Math.cos(theta) * targetRadius))
        .add(v.clone().multiplyScalar(Math.sin(theta) * targetRadius));
      pts.push([pt.x, pt.y, pt.z]);
    }
    return pts;
  }, [center, u, v, diameter]);

  // 13. Neon Green Loop Outline Points (for Lasso)
  const greenBorderPoints = useMemo(() => {
    if (!loopPoints || loopPoints.length === 0) return [];
    return [...loopPoints.map(p => [p.x, p.y, p.z]), [loopPoints[0].x, loopPoints[0].y, loopPoints[0].z]];
  }, [loopPoints]);

  return (
    <group>
      {/* 1. Neon Green Cut Cap Surface (Lasso Mode) */}
      {capGeom && (
        <mesh geometry={capGeom}>
          <meshBasicMaterial
            color="#22c55e"
            transparent={true}
            opacity={0.55}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 2. Neon Green Boundary Line around cut loop (Lasso Mode) */}
      {greenBorderPoints.length > 1 && (
        <Line
          points={greenBorderPoints}
          color="#4ade80"
          lineWidth={3.5}
        />
      )}

      {/* 3. Surface Normal Alignment Guide & Snapping Reticle */}
      {showSnappingGuide && (
        <group>
          {/* Surface Normal Direction Axis Line */}
          <Line
            points={normalAxisLine}
            color={isSnapped ? '#10b981' : '#38bdf8'}
            lineWidth={3.0}
            dashed={true}
            dashScale={2}
            dashSize={1.8}
            gapSize={1.2}
          />

          {/* In-Plane Crosshairs (Tangent Space U & V axes) */}
          <Line
            points={crosshairPoints.uLine}
            color={isSnapped ? '#34d399' : '#0ea5e9'}
            lineWidth={1.5}
            transparent={true}
            opacity={0.7}
          />
          <Line
            points={crosshairPoints.vLine}
            color={isSnapped ? '#34d399' : '#0ea5e9'}
            lineWidth={1.5}
            transparent={true}
            opacity={0.7}
          />

          {/* Concentric Inner Snapping Target Ring */}
          <Line
            points={snappingRingPoints}
            color={isSnapped ? '#10b981' : '#0284c7'}
            lineWidth={2.2}
          />

          {/* Outer Dashed Target Disc Boundary */}
          <Line
            points={outerTargetRingPoints}
            color={isSnapped ? '#059669' : '#38bdf8'}
            lineWidth={1.5}
            dashed={true}
            dashScale={1}
            dashSize={1.5}
            gapSize={1.0}
          />

          {/* Tether Line to Raw Geometric Centroid when manually offset */}
          {tetherLine && (
            <Line
              points={tetherLine}
              color="#f59e0b"
              lineWidth={2}
              dashed={true}
              dashScale={1}
              dashSize={1.0}
              gapSize={1.0}
            />
          )}

          {/* Centroid Anchor Indicator (at raw cross-section center) */}
          <mesh position={[rawCenter.x, rawCenter.y, rawCenter.z]}>
            <sphereGeometry args={[0.9, 16, 16]} />
            <meshBasicMaterial color={isSnapped ? '#10b981' : '#f59e0b'} />
          </mesh>

          {/* Snapped Pin Anchor Dot (at effective pin center) */}
          {(!snapToCenter || !isSnapped) && (
            <mesh position={[center.x, center.y, center.z]}>
              <sphereGeometry args={[1.1, 16, 16]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          )}
        </group>
      )}

      {/* 4. Translucent Orange Pin Solid */}
      {pinGeom && (
        <group>
          <mesh geometry={pinGeom}>
            <meshStandardMaterial
              color="#f97316"
              emissive="#ea580c"
              emissiveIntensity={0.35}
              roughness={0.2}
              metalness={0.1}
              transparent={true}
              opacity={0.88}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh geometry={pinGeom}>
            <meshBasicMaterial color="#fed7aa" wireframe={true} />
          </mesh>
        </group>
      )}

      {/* 5. Translucent Cyan Cylindrical Hole Cavity Preview */}
      {holePreviewGeom && (
        <group>
          <mesh geometry={holePreviewGeom}>
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#0891b2"
              emissiveIntensity={0.4}
              roughness={0.15}
              metalness={0.1}
              transparent={true}
              opacity={0.65}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh geometry={holePreviewGeom}>
            <meshBasicMaterial color="#a5f3fc" wireframe={true} />
          </mesh>
        </group>
      )}

      {/* 6. Opposite Hole Preview (for 'holes_both' mode) */}
      {holePreviewGeomA && (
        <group>
          <mesh geometry={holePreviewGeomA}>
            <meshStandardMaterial
              color="#3b82f6"
              emissive="#2563eb"
              emissiveIntensity={0.4}
              roughness={0.15}
              metalness={0.1}
              transparent={true}
              opacity={0.65}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh geometry={holePreviewGeomA}>
            <meshBasicMaterial color="#93c5fd" wireframe={true} />
          </mesh>
        </group>
      )}
    </group>
  );
}
