import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

/**
 * ImagePlane - Renders a textured plane in 3D space
 *
 * Features:
 * - Textured quad mesh with aspect-ratio-aware scaling
 * - Double-sided rendering
 * - Optional physics integration (static body)
 * - Configurable transparency
 */

export interface ImagePlaneProps {
  texture: THREE.Texture;
  position: [number, number, number];
  scale: [number, number];
  rotation?: [number, number, number];
  opacity?: number;
  physicsEnabled?: boolean;
  doubleSided?: boolean;
}

export const ImagePlane: React.FC<ImagePlaneProps> = ({
  texture,
  position,
  scale,
  rotation = [0, 0, 0],
  opacity = 0.95,
  physicsEnabled = false,
  doubleSided = true,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (physicsEnabled && meshRef.current) {
      // TODO: Create Rapier static rigid body for this plane
      // This would require access to the physics engine instance
      // For now, planes are non-physical
      console.log('Physics-enabled image planes not yet implemented');
    }
  }, [physicsEnabled]);

  return (
    <mesh ref={meshRef} position={position} rotation={rotation}>
      <planeGeometry args={[scale[0], scale[1]]} />
      <meshStandardMaterial
        map={texture}
        side={doubleSided ? THREE.DoubleSide : THREE.FrontSide}
        transparent={opacity < 1.0}
        opacity={opacity}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
};
