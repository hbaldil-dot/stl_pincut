import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * 3D visual plane indicator showing the position, orientation, and boundaries of the active clipping plane.
 */
export function ClippingPlaneHelper({
  plane,
  planeNormal,
  planeOffset,
  planeSize = 80,
  visible = true,
  color = '#0ea5e9',
  interactivePinPlacement = false,
  onPlaneClick = null
}) {
  const planeRef = useRef();

  // Compute transform (position and rotation) from normal and offset
  const { position, quaternion } = useMemo(() => {
    const normal = planeNormal.clone().normalize();
    const pos = normal.clone().multiplyScalar(planeOffset);
    
    // Quaternion to rotate from default Z-up (0, 0, 1) or Y-up (0, 1, 0)
    const defaultPlaneNormal = new THREE.Vector3(0, 0, 1);
    const quat = new THREE.Quaternion().setFromUnitVectors(defaultPlaneNormal, normal);

    return { position: pos, quaternion: quat };
  }, [planeNormal, planeOffset]);

  if (!visible) return null;

  return (
    <group ref={planeRef} position={position} quaternion={quaternion}>
      {/* Semi-transparent Plane Slice Sheet */}
      <mesh
        onClick={(e) => {
          if (!interactivePinPlacement || !onPlaneClick) return;
          e.stopPropagation();
          if (e.uv) {
            const localU = (e.uv.x - 0.5) * planeSize;
            const localV = (e.uv.y - 0.5) * planeSize;
            onPlaneClick(parseFloat(localU.toFixed(1)), parseFloat(localV.toFixed(1)));
          }
        }}
        onPointerOver={() => {
          if (interactivePinPlacement) {
            document.body.style.cursor = 'crosshair';
          }
        }}
        onPointerOut={() => {
          if (interactivePinPlacement) {
            document.body.style.cursor = 'auto';
          }
        }}
      >
        <planeGeometry args={[planeSize, planeSize, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent={true}
          opacity={0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Outer Glow Border Wireframe */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(planeSize, planeSize)]} />
        <lineBasicMaterial color={color} linewidth={2} transparent opacity={0.9} />
      </lineSegments>

      {/* Grid Pattern on Cut Plane */}
      <gridHelper
        args={[planeSize, 12, color, color]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, 0.05]}
      />

      {/* Directional Normal Arrow indicator */}
      <arrowHelper
        args={[
          new THREE.Vector3(0, 0, 1), // Arrow points along plane normal
          new THREE.Vector3(0, 0, 0), // Origin
          planeSize * 0.28,           // Length
          0x38bdf8,                   // Sky blue color
          planeSize * 0.08,           // Head length
          planeSize * 0.05            // Head width
        ]}
      />

      {/* Center Pivot Sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
    </group>
  );
}
