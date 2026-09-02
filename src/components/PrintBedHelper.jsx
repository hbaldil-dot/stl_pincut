import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * 3D Visual Print Bed & Layer Growth Orientation Arrow Helper
 */
export function PrintBedHelper({
  printDirection = new THREE.Vector3(0, 1, 0),
  modelInfo,
  visible = true,
  plateSize = 80
}) {
  const normDir = useMemo(() => {
    return printDirection.clone().normalize();
  }, [printDirection]);

  // Compute orientation quaternion to align a default +Y plane to normDir
  const { quaternion, bedPosition, arrowLength } = useMemo(() => {
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(defaultUp, normDir);

    const radius = modelInfo?.boundingSphereRadius || 30;
    const center = modelInfo?.boundingSphereCenter || new THREE.Vector3(0, 0, 0);

    // Position the bed just underneath the model in the opposite direction of printing
    const bedPos = center.clone().addScaledVector(normDir, -(radius + 4));
    const len = Math.max(25, radius * 0.85);

    return {
      quaternion: quat,
      bedPosition: bedPos,
      arrowLength: len
    };
  }, [normDir, modelInfo]);

  if (!visible) return null;

  return (
    <group position={[bedPosition.x, bedPosition.y, bedPosition.z]} quaternion={quaternion}>
      {/* Semi-transparent Build Plate Surface */}
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[plateSize, plateSize]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.8}
          metalness={0.2}
          transparent={true}
          opacity={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Grid Lines on Build Plate */}
      <gridHelper
        args={[plateSize, 20, '#06b6d4', '#334155']}
        position={[0, 0, 0]}
      />

      {/* Bed Outer Border Frame */}
      <lineSegments rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(plateSize, plateSize)]} />
        <lineBasicMaterial color="#06b6d4" linewidth={2} />
      </lineSegments>

      {/* Build Direction Arrow (Layers Growth) */}
      <group position={[0, 0.5, 0]}>
        {/* Shaft */}
        <mesh position={[0, arrowLength * 0.4, 0]}>
          <cylinderGeometry args={[0.7, 0.7, arrowLength * 0.8, 16]} />
          <meshBasicMaterial color="#06b6d4" />
        </mesh>
        {/* Head */}
        <mesh position={[0, arrowLength * 0.85, 0]}>
          <coneGeometry args={[2.2, arrowLength * 0.25, 16]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      </group>
    </group>
  );
}
