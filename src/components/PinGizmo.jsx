import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { calculateBestFitPlane, createPinGeometry, createCapGeometry } from '../utils/meshSlicer';

/**
 * 3D Interactive Gizmo rendering the Cut Plane Surface, Alignment Pins, and Cylindrical Hole Cavity Previews.
 */
export function PinGizmo({ loopPoints, pinConfig, onPinConfigChange }) {
  const { center, normal } = useMemo(() => {
    return calculateBestFitPlane(loopPoints);
  }, [loopPoints]);

  const mode = pinConfig?.mode || 'pin_and_hole';
  const diameter = pinConfig?.diameter || pinConfig?.size || 8;
  const depth = pinConfig?.depth || pinConfig?.height || 10;
  const clearance = typeof pinConfig?.clearance === 'number' ? pinConfig.clearance : 0.2;

  // Cap Surface Polygon Geometry
  const capGeom = useMemo(() => {
    return createCapGeometry(loopPoints, center, normal);
  }, [loopPoints, center, normal]);

  // Male Pin Geometry (if applicable)
  const { pinGeom, effNormal, pinPos } = useMemo(() => {
    if (mode === 'holes_both' || mode === 'hole_only' || mode === 'flat') {
      return { pinGeom: null, effNormal: normal.clone(), pinPos: center.clone() };
    }
    return createPinGeometry(pinConfig, center, normal);
  }, [pinConfig, center, normal, mode]);

  // Cylindrical Hole Preview Geometry (Socket Cavity)
  const holePreviewGeom = useMemo(() => {
    if (mode === 'pin_only' || mode === 'flat') return null;

    const holeDiam = mode === 'pin_and_hole' ? diameter + clearance * 2 : diameter;
    const holeDepth = mode === 'pin_and_hole' ? depth + clearance : depth;
    const radius = holeDiam * 0.5;

    // Create cylinder for hole cavity preview
    const geom = new THREE.CylinderGeometry(radius, radius, holeDepth, 24);
    // Align with normal vector pointing into the socket side (opposite of pin or along normal)
    const socketNormal = normal.clone();
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(defaultUp, socketNormal);
    geom.applyQuaternion(quat);

    // Position cavity recessed into cut plane
    const offset = socketNormal.clone().multiplyScalar(holeDepth * 0.5);
    const holePos = center.clone().add(offset);
    geom.translate(holePos.x, holePos.y, holePos.z);
    geom.computeVertexNormals();

    return geom;
  }, [center, normal, mode, diameter, depth, clearance]);

  // Secondary Hole Preview for 'holes_both' mode
  const holePreviewGeomA = useMemo(() => {
    if (mode !== 'holes_both') return null;

    const radius = diameter * 0.5;
    const geom = new THREE.CylinderGeometry(radius, radius, depth, 24);
    const socketNormal = normal.clone().negate();
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(defaultUp, socketNormal);
    geom.applyQuaternion(quat);

    const offset = socketNormal.clone().multiplyScalar(depth * 0.5);
    const holePos = center.clone().add(offset);
    geom.translate(holePos.x, holePos.y, holePos.z);
    geom.computeVertexNormals();

    return geom;
  }, [center, normal, mode, diameter, depth]);

  // Dashed Axis Line along Pin/Hole Normal Vector
  const axisLinePoints = useMemo(() => {
    const lineLen = depth * 2.5 + 15;
    const start = center.clone().add(effNormal.clone().multiplyScalar(-lineLen * 0.45));
    const end = center.clone().add(effNormal.clone().multiplyScalar(lineLen * 0.75));
    return [
      [start.x, start.y, start.z],
      [end.x, end.y, end.z]
    ];
  }, [center, effNormal, depth]);

  // Neon Green Loop Outline Points
  const greenBorderPoints = useMemo(() => {
    if (!loopPoints || loopPoints.length === 0) return [];
    return [...loopPoints.map(p => [p.x, p.y, p.z]), [loopPoints[0].x, loopPoints[0].y, loopPoints[0].z]];
  }, [loopPoints]);

  return (
    <group>
      {/* 1. Neon Green Cut Cap Surface */}
      {capGeom && (
        <mesh geometry={capGeom}>
          <meshBasicMaterial
            color="#22c55e"
            transparent={true}
            opacity={0.65}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 2. Neon Green Boundary Line around cut loop */}
      {greenBorderPoints.length > 1 && (
        <Line
          points={greenBorderPoints}
          color="#4ade80"
          lineWidth={3.5}
        />
      )}

      {/* 3. Translucent Orange Pin Solid */}
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

      {/* 4. Translucent Cyan Cylindrical Hole Cavity Preview */}
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

      {/* 5. Opposite Hole Preview (for 'holes_both' mode) */}
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

      {/* 6. Dashed Direction Axis Line */}
      <Line
        points={axisLinePoints}
        color="#38bdf8"
        lineWidth={2.5}
        dashed={true}
        dashScale={2}
        dashSize={1.5}
        gapSize={1.2}
      />

      {/* Pin & Hole Center Anchor Point */}
      <mesh position={[center.x, center.y, center.z]}>
        <sphereGeometry args={[1.0, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}
