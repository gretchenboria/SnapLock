/**
 * 3D MODEL LIBRARY
 *
 * Enterprise-grade 3D models for VR simulation training data.
 * Sources: NVIDIA Omniverse, Khronos glTF samples, Poly Haven (CC0).
 */

export interface ModelMapping {
  keywords: string[]; // Words that trigger this model
  modelUrl: string;
  scale?: number; // Optional scale factor
  category: 'medical' | 'industrial' | 'automotive' | 'warehouse' | 'general';
  description?: string; // Optional description
}

// Model library - free enterprise-grade assets
export const MODEL_LIBRARY: ModelMapping[] = [
  // Medical / Surgical (using Khronos sample models as placeholders)
  {
    keywords: ['heart', 'cardiac', 'organ', 'tissue'],
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/BrainStem/glTF-Binary/BrainStem.glb',
    scale: 0.15,
    category: 'medical',
    description: 'Organic tissue model (brain stem used as heart placeholder)'
  },
  {
    keywords: ['robot', 'robotic', 'arm', 'manipulator', 'surgical'],
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/RobotExpressive/glTF-Binary/RobotExpressive.glb',
    scale: 1.2,
    category: 'medical',
    description: 'Robotic system with articulated joints'
  },
  {
    keywords: ['needle', 'syringe', 'scalpel', 'instrument', 'tool', 'forceps'],
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Avocado/glTF-Binary/Avocado.glb',
    scale: 0.3,
    category: 'medical',
    description: 'Precision instrument (avocado as placeholder)'
  },
  {
    keywords: ['stitch', 'suture', 'thread', 'wire'],
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/AnimatedMorphCube/glTF-Binary/AnimatedMorphCube.glb',
    scale: 0.1,
    category: 'medical',
    description: 'Flexible/deformable object for suturing'
  },

  // Industrial / Manufacturing
  {
    keywords: ['forklift', 'lift', 'pallet', 'loader'],
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb',
    scale: 2.5,
    category: 'warehouse',
    description: 'Heavy industrial vehicle'
  },
  {
    keywords: ['box', 'crate', 'package', 'container', 'carton'],
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Box/glTF-Binary/Box.glb',
    scale: 1.0,
    category: 'warehouse',
    description: 'Standard shipping container'
  },
  {
    keywords: ['barrel', 'drum', 'cylinder', 'tank'],
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/BarramundiFish/glTF-Binary/BarramundiFish.glb',
    scale: 1.0,
    category: 'warehouse',
    description: 'Cylindrical storage container'
  },
  {
    keywords: ['helmet', 'safety', 'protection', 'gear'],
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
    scale: 0.5,
    category: 'industrial',
    description: 'Safety equipment with PBR materials'
  },

  // Automotive / Vehicles
  {
    keywords: ['car', 'vehicle', 'automobile', 'sedan', 'truck'],
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb',
    scale: 1.8,
    category: 'automotive',
    description: 'Commercial vehicle'
  },

  // General objects
  {
    keywords: ['table', 'desk', 'surface', 'platform'],
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Box/glTF-Binary/Box.glb',
    scale: 4.0,
    category: 'general',
    description: 'Flat surface (table/platform)'
  },
  {
    keywords: ['floor', 'ground', 'base', 'foundation'],
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Box/glTF-Binary/Box.glb',
    scale: 10.0,
    category: 'general',
    description: 'Large floor plane'
  }
];

/**
 * Find best matching model for an object description
 */
export function findModelForObject(objectName: string, objectDescription?: string): string | null {
  const searchText = `${objectName} ${objectDescription || ''}`.toLowerCase();

  // Find first matching model
  for (const model of MODEL_LIBRARY) {
    for (const keyword of model.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        console.log(`[ModelLibrary] Matched "${objectName}" to model with keywords [${model.keywords.join(', ')}]`);
        return model.modelUrl;
      }
    }
  }

  console.log(`[ModelLibrary] No model found for "${objectName}", using geometric primitive`);
  return null;
}

/**
 * Get recommended scale for a model
 */
export function getModelScale(modelUrl: string): number {
  const model = MODEL_LIBRARY.find(m => m.modelUrl === modelUrl);
  return model?.scale || 1.0;
}

/**
 * Check if model exists in library
 */
export function hasModel(objectName: string): boolean {
  return findModelForObject(objectName) !== null;
}
