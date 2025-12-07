import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { AssetGroup, ViewMode, ShapeType } from '../types';

interface AssetRendererProps {
    group: AssetGroup;
    meshRef: React.Ref<THREE.InstancedMesh>;
    viewMode: ViewMode;
}

export const AssetRenderer: React.FC<AssetRendererProps> = ({ group, meshRef, viewMode }) => {
    
    // --- GEOMETRY SELECTION ---
    let Geometry: React.ReactNode;
    let gltfGeometry: THREE.BufferGeometry | null = null;
    let error = false;

    // Load Model if needed
    if (group.shape === ShapeType.MODEL && group.modelUrl) {
        try {
            // Safe fetch
            const { nodes } = useGLTF(group.modelUrl);
            // Naive finder: Find first mesh in GLB
            const firstMesh = Object.values(nodes).find((n: any) => n.isMesh) as THREE.Mesh;
            if (firstMesh) {
                gltfGeometry = firstMesh.geometry;
            }
        } catch (e) {
            console.warn(`Failed to load model: ${group.modelUrl}`, e);
            error = true;
        }
    }

    // Fallback if model fails or standard primitive
    if (!gltfGeometry || error) {
        switch(group.shape) {
            case ShapeType.SPHERE: Geometry = <sphereGeometry args={[1, 16, 16]} />; break;
            case ShapeType.CONE: Geometry = <coneGeometry args={[1, 2, 16]} />; break;
            case ShapeType.PYRAMID: Geometry = <coneGeometry args={[1, 1.5, 4]} />; break;
            case ShapeType.CYLINDER: Geometry = <cylinderGeometry args={[0.5, 0.5, 2, 16]} />; break;
            case ShapeType.TORUS: Geometry = <torusGeometry args={[1, 0.4, 16, 32]} />; break;
            case ShapeType.ICOSAHEDRON: Geometry = <icosahedronGeometry args={[1, 0]} />; break;
            case ShapeType.CAPSULE: Geometry = <capsuleGeometry args={[0.5, 1, 4, 16]} />; break;
            case ShapeType.PLATE: Geometry = <boxGeometry args={[1, 0.1, 1]} />; break;
            case ShapeType.CUBE: 
            default: Geometry = <boxGeometry args={[1, 1, 1]} />; break;
        }
    }

    return (
        <instancedMesh 
            key={group.id} 
            ref={meshRef} 
            args={[gltfGeometry || undefined, undefined, group.count]} 
            castShadow 
            receiveShadow
        >
            {/* If we have gltfGeometry, we pass it in args, otherwise render the JSX primitive */}
            {!gltfGeometry && Geometry}
            
            <meshStandardMaterial 
                color={group.color}
                wireframe={viewMode === ViewMode.WIREFRAME}
                roughness={viewMode === ViewMode.RGB ? 1.0 - group.restitution : 1.0} 
                metalness={viewMode === ViewMode.RGB ? (group.restitution > 0.8 ? 0.1 : 0.6) : 0.0}
                transparent={viewMode === ViewMode.RGB && group.restitution < 0.2} 
                opacity={viewMode === ViewMode.RGB && group.restitution < 0.2 ? 0.8 : 1.0}
                emissive={viewMode === ViewMode.LIDAR ? new THREE.Color(0x222222) : new THREE.Color(0x000000)}
            />
        </instancedMesh>
    );
};
