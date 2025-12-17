import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VRHand } from '../types';

interface VRHandRendererProps {
  hands: VRHand[];
  graspedObjects: Map<string, string>; // handId -> objectGroupId
}

export const VRHandRenderer: React.FC<VRHandRendererProps> = ({ hands, graspedObjects }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Hand geometry constants (must match handPhysics.ts)
  const HAND_CAPSULE_LENGTH = 0.2; // 20cm
  const HAND_CAPSULE_RADIUS = 0.08; // 8cm

  // Create geometry once
  const geometry = useMemo(() => {
    return new THREE.CapsuleGeometry(HAND_CAPSULE_RADIUS, HAND_CAPSULE_LENGTH, 8, 16);
  }, []);

  // Create materials for different states
  const materials = useMemo(() => ({
    left: {
      free: new THREE.MeshStandardMaterial({
        color: 0x00d9ff, // Cyan
        emissive: 0x00d9ff,
        emissiveIntensity: 0.3,
        metalness: 0.5,
        roughness: 0.3,
        transparent: true,
        opacity: 0.8
      }),
      grasping: new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 0.7,
        metalness: 0.7,
        roughness: 0.2,
        transparent: true,
        opacity: 1.0
      })
    },
    right: {
      free: new THREE.MeshStandardMaterial({
        color: 0xff8800, // Orange
        emissive: 0xff8800,
        emissiveIntensity: 0.3,
        metalness: 0.5,
        roughness: 0.3,
        transparent: true,
        opacity: 0.8
      }),
      grasping: new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xffaa00,
        emissiveIntensity: 0.7,
        metalness: 0.7,
        roughness: 0.2,
        transparent: true,
        opacity: 1.0
      })
    }
  }), []);

  // Update hand positions and rotations each frame
  useFrame(() => {
    if (!meshRef.current || hands.length === 0) return;

    const tempMatrix = new THREE.Matrix4();
    const tempPosition = new THREE.Vector3();
    const tempQuaternion = new THREE.Quaternion();
    const tempEuler = new THREE.Euler();
    const tempScale = new THREE.Vector3(1, 1, 1);

    hands.forEach((hand, index) => {
      if (index >= 2) return; // Max 2 hands

      // Set position
      tempPosition.set(hand.position.x, hand.position.y, hand.position.z);

      // Convert Euler angles to quaternion
      tempEuler.set(hand.rotation.x, hand.rotation.y, hand.rotation.z, 'XYZ');
      tempQuaternion.setFromEuler(tempEuler);

      // Compose matrix
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);

      // Update instance matrix
      meshRef.current!.setMatrixAt(index, tempMatrix);

      // Update color based on grasp state
      const isGrasping = graspedObjects.has(hand.id);
      const material = hand.side === 'left'
        ? (isGrasping ? materials.left.grasping : materials.left.free)
        : (isGrasping ? materials.right.grasping : materials.right.free);

      meshRef.current!.setColorAt(index, material.color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  if (hands.length === 0) return null;

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[geometry, materials.left.free, Math.min(hands.length, 2)]}
        castShadow
        receiveShadow
      />

      {/* Point lights for hand glow effect */}
      {hands.map((hand, index) => {
        const isGrasping = graspedObjects.has(hand.id);
        const color = hand.side === 'left' ? 0x00d9ff : 0xff8800;
        const intensity = isGrasping ? 2.0 : 0.5;

        return (
          <pointLight
            key={`hand-light-${hand.id}`}
            position={[hand.position.x, hand.position.y, hand.position.z]}
            color={color}
            intensity={intensity}
            distance={1.5}
            decay={2}
          />
        );
      })}
    </>
  );
};
