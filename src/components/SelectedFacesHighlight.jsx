import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  createSelectedFacesGeometry,
  createSelectedVerticesGeometry
} from '../utils/lassoSelectionHelper';

/**
 * 3D Component to explicitly highlight selected faces and intersecting vertices in the scene state.
 * Renders on top of the STL model with precise geometric alignment and zero z-fighting.
 */
export function SelectedFacesHighlight({
  model,
  selectedFaceIndices = [],
  selectedVertexIndices = [],
  highlightColor = '#f59e0b',
  wireframeColor = '#fef08a',
  vertexColor = '#38bdf8',
  showWireframe = true,
  showVertices = true,
  opacity = 0.8
}) {
  // Generate geometry of only the selected faces
  const highlightGeometry = useMemo(() => {
    if (!model || !selectedFaceIndices || selectedFaceIndices.length === 0) {
      return null;
    }
    return createSelectedFacesGeometry(model, selectedFaceIndices);
  }, [model, selectedFaceIndices]);

  // Generate point cloud geometry of intersecting vertices
  const verticesGeometry = useMemo(() => {
    if (!model || !selectedVertexIndices || selectedVertexIndices.length === 0 || !showVertices) {
      return null;
    }
    return createSelectedVerticesGeometry(model, selectedVertexIndices);
  }, [model, selectedVertexIndices, showVertices]);

  if (!highlightGeometry || !model) return null;

  return (
    <group
      position={model.position}
      rotation={model.rotation}
      scale={model.scale}
    >
      {/* 1. Translucent Glowing Highlight Fill */}
      <mesh geometry={highlightGeometry} renderOrder={10}>
        <meshStandardMaterial
          color={highlightColor}
          emissive={highlightColor}
          emissiveIntensity={0.35}
          roughness={0.25}
          metalness={0.1}
          side={THREE.DoubleSide}
          transparent={true}
          opacity={opacity}
          depthTest={true}
          depthWrite={false}
          polygonOffset={true}
          polygonOffsetFactor={-2.5}
          polygonOffsetUnits={-2.5}
        />
      </mesh>

      {/* 2. Facet Wireframe Edge Outlines */}
      {showWireframe && (
        <mesh geometry={highlightGeometry} renderOrder={11}>
          <meshBasicMaterial
            color={wireframeColor}
            wireframe={true}
            transparent={true}
            opacity={0.9}
            depthTest={true}
            depthWrite={false}
            polygonOffset={true}
            polygonOffsetFactor={-3.0}
            polygonOffsetUnits={-3.0}
          />
        </mesh>
      )}

      {/* 3. Intersecting Vertices Point Cloud Highlight */}
      {verticesGeometry && (
        <points geometry={verticesGeometry} renderOrder={12}>
          <pointsMaterial
            color={vertexColor}
            size={4.0}
            sizeAttenuation={false}
            transparent={true}
            opacity={0.95}
            depthTest={true}
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
}

export default SelectedFacesHighlight;
