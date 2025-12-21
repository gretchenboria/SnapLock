import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { AssetGroup, ViewMode, ShapeType } from '../types';
import { MeshDeformationShaders } from '../services/meshDeformationShaders';

interface AssetRendererProps {
    group: AssetGroup;
    meshRef: React.Ref<THREE.InstancedMesh>;
    viewMode: ViewMode;
}

// Error Boundary for Model Loading
class ModelErrorBoundary extends React.Component<
    { children: React.ReactNode; fallback: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.warn('[AssetRenderer] Model loading failed, using fallback:', error.message);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

// Component for rendering 3D Models with Error Handling
const ModelAssetInner: React.FC<AssetRendererProps> = ({ group, meshRef, viewMode }) => {
    const url = group.modelUrl!;
    const gltf = useGLTF(url);

    const { nodes } = gltf;

    let gltfGeometry: THREE.BufferGeometry | null = null;
    const firstMesh = Object.values(nodes).find((n: any) => n.isMesh) as THREE.Mesh;
    if (firstMesh) {
        gltfGeometry = firstMesh.geometry;
    }

    // Fallback if geometry extraction failed
    if (!gltfGeometry) {
        console.warn(`[AssetRenderer] No geometry found in model, using primitive for "${group.name}"`);
        return <PrimitiveAsset group={group} meshRef={meshRef} viewMode={viewMode} />;
    }

    console.log(`[AssetRenderer] [OK] Successfully loaded 3D model for "${group.name}"`);

    return (
        <instancedMesh
            ref={meshRef}
            args={[gltfGeometry, undefined, group.count]}
            castShadow
            receiveShadow
        >
            <Material group={group} viewMode={viewMode} />
        </instancedMesh>
    );
};

// Wrapper with error boundary
const ModelAsset: React.FC<AssetRendererProps> = (props) => {
    const fallback = <PrimitiveAsset {...props} />;
    return (
        <ModelErrorBoundary fallback={fallback}>
            <React.Suspense fallback={fallback}>
                <ModelAssetInner {...props} />
            </React.Suspense>
        </ModelErrorBoundary>
    );
};

// Component for rendering Standard Primitives
const PrimitiveAsset: React.FC<AssetRendererProps> = ({ group, meshRef, viewMode }) => {
    let Geometry: React.ReactNode;

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

    return (
        <instancedMesh 
            ref={meshRef} 
            args={[undefined, undefined, group.count]} 
            castShadow 
            receiveShadow
        >
            {Geometry}
            <Material group={group} viewMode={viewMode} />
        </instancedMesh>
    );
};

// DOMAIN RANDOMIZATION Material Logic (NVIDIA Isaac Sim Approach)
// Generates photorealistic PBR materials with randomized properties
// This creates training data diversity without needing 3D models
const Material = ({ group, viewMode }: { group: AssetGroup, viewMode: ViewMode }) => {
    const baseColor = new THREE.Color(group.color);

    // Domain Randomization: Add controlled color variation (±10% hue shift)
    // Keeps material identity while adding diversity for training data
    const hueVariation = (Math.random() - 0.5) * 0.2; // -0.1 to +0.1
    const randomizedColor = baseColor.clone();
    const hsl = { h: 0, s: 0, l: 0 };
    randomizedColor.getHSL(hsl);
    randomizedColor.setHSL(
        (hsl.h + hueVariation + 1) % 1, // Wrap around
        Math.min(1, hsl.s + (Math.random() - 0.5) * 0.1), // Slight saturation variation
        Math.min(1, hsl.l + (Math.random() - 0.5) * 0.1)  // Slight lightness variation
    );

    // PBR properties from physics parameters + randomization
    // Base roughness from restitution, then add variation (±0.15)
    const baseRoughness = 1.0 - group.restitution;
    const roughness = viewMode === ViewMode.RGB
        ? Math.max(0.05, Math.min(0.95, baseRoughness + (Math.random() - 0.5) * 0.3))
        : 1.0;

    // Base metalness from friction, then add variation (±0.1)
    const baseMetalness = (1.0 - group.friction) * 0.8;
    const metalness = viewMode === ViewMode.RGB
        ? Math.max(0, Math.min(0.95, baseMetalness + (Math.random() - 0.5) * 0.2))
        : 0.0;

    // Emissive properties for better visibility
    const emissive = viewMode === ViewMode.LIDAR
        ? new THREE.Color(0x222222)
        : randomizedColor.clone().multiplyScalar(0.05);

    const emissiveIntensity = viewMode === ViewMode.RGB ? 0.1 : 0.0;

    // Glass-like materials (low friction, high restitution)
    const isGlassLike = group.friction < 0.3 && group.restitution > 0.6;
    const transparent = viewMode === ViewMode.RGB && isGlassLike;
    const opacity = transparent ? 0.7 : 1.0;

    // Environment map intensity randomization (lighting variation)
    const envMapIntensity = 1.0 + Math.random() * 1.0; // 1.0 to 2.0

    // GPU Shader-Based Mesh Deformation for Data Augmentation
    // Generate custom vertex shader if deformation is specified
    const customShader = useMemo(() => {
        if (!group.deformation) return null;

        return {
            vertexShader: MeshDeformationShaders.generateVertexShader(group.deformation),
            uniforms: MeshDeformationShaders.getUniforms(group.deformation)
        };
    }, [group.deformation]);

    // Update time uniform for animated deformations (wave, etc.)
    useFrame((state) => {
        if (customShader?.uniforms.time) {
            customShader.uniforms.time.value = state.clock.elapsedTime;
        }
    });

    // Standard material without deformation
    if (!customShader) {
        return (
            <meshStandardMaterial
                color={randomizedColor}
                wireframe={viewMode === ViewMode.WIREFRAME}
                roughness={roughness}
                metalness={metalness}
                transparent={transparent}
                opacity={opacity}
                emissive={emissive}
                emissiveIntensity={emissiveIntensity}
                envMapIntensity={envMapIntensity}
                flatShading={false}
            />
        );
    }

    // Custom material with GPU shader deformation
    return (
        <meshStandardMaterial
            color={randomizedColor}
            wireframe={viewMode === ViewMode.WIREFRAME}
            roughness={roughness}
            metalness={metalness}
            transparent={transparent}
            opacity={opacity}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            envMapIntensity={envMapIntensity}
            flatShading={false}
            onBeforeCompile={(shader) => {
                // Inject custom vertex shader for deformation
                shader.vertexShader = customShader.vertexShader;

                // Add deformation uniforms
                Object.assign(shader.uniforms, customShader.uniforms);
            }}
        />
    );
};

export const AssetRenderer: React.FC<AssetRendererProps> = (props) => {
    // Conditional Rendering: Only mount ModelAsset if modelUrl is present.
    // This ensures useGLTF inside ModelAsset is always called with a valid URL.
    if (props.group.shape === ShapeType.MODEL && props.group.modelUrl) {
        return <ModelAsset {...props} />;
    }
    return <PrimitiveAsset {...props} />;
};
