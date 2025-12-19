/**
 * OPEN-SOURCE 3D MODEL INTEGRATION
 *
 * Uses industry-standard datasets:
 * 1. YCB Object Dataset (robotics benchmark - 80+ objects)
 * 2. Poly Haven (CC0 high-quality assets)
 * 3. Khronos glTF samples (WebGL tested)
 *
 * License: All models are CC0 or CC-BY (attribution in code)
 * Fallback: Domain randomization with geometric primitives if models fail
 */

export interface OpenSourceModel {
  keywords: string[];
  modelUrl: string;
  source: 'YCB' | 'PolyHaven' | 'Khronos' | 'Custom';
  license: 'CC0' | 'CC-BY-4.0' | 'MIT';
  category: 'robotics' | 'surgical' | 'industrial' | 'environment' | 'general';
  description: string;
  scale?: number;
  attribution?: string;
}

/**
 * YCB OBJECT DATASET (Robotics Benchmark Standard)
 * Source: https://www.ycbbenchmarks.com/
 * License: CC BY 4.0
 * AWS S3: http://ycb-benchmarks.s3-website-us-east-1.amazonaws.com/
 *
 * The YCB dataset provides 80+ everyday objects used by ALL major robotics labs.
 * Includes: tools, containers, food items, hardware, kitchen objects.
 */
const YCB_MODELS: OpenSourceModel[] = [
  // Tools & Hardware
  {
    keywords: ['hammer', 'tool', 'mallet'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/048_hammer/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Hammer',
    attribution: 'YCB Object and Model Set (Yale-CMU-Berkeley)'
  },
  {
    keywords: ['drill', 'power drill', 'tool'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/035_power_drill/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Power Drill',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['wrench', 'spanner', 'tool', 'adjustable'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/042_adjustable_wrench/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Adjustable Wrench',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['screwdriver', 'phillips', 'tool', 'driver'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/043_phillips_screwdriver/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Phillips Screwdriver',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['scissors', 'tool', 'cutting'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/037_scissors/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Scissors',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['marker', 'pen', 'writing'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/040_large_marker/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Large Marker',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['clamp', 'tool', 'grip'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/051_large_clamp/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Large Clamp',
    attribution: 'YCB Object and Model Set'
  },

  // Containers & Kitchen Items
  {
    keywords: ['can', 'master chef', 'coffee'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/002_master_chef_can/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Master Chef Can',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['soup', 'tomato', 'tin', 'cylinder'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/005_tomato_soup_can/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Tomato Soup Can',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['mustard', 'bottle', 'container'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/006_mustard_bottle/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Mustard Bottle',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['tuna', 'fish', 'can'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/007_tuna_fish_can/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Tuna Fish Can',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['mug', 'cup', 'vessel'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/025_mug/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Mug',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['bowl', 'container', 'dish'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/024_bowl/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Bowl',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['pitcher', 'jug', 'container'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/019_pitcher_base/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Pitcher Base',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['bleach', 'cleanser', 'bottle'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/021_bleach_cleanser/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Bleach Cleanser',
    attribution: 'YCB Object and Model Set'
  },

  // Food Items (grasping practice)
  {
    keywords: ['banana', 'fruit', 'food'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/011_banana/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Banana',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['apple', 'fruit', 'food'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/013_apple/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Apple',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['lemon', 'fruit', 'food'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/014_lemon/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Lemon',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['peach', 'fruit', 'food'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/015_peach/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Peach',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['pear', 'fruit', 'food'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/016_pear/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Pear',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['orange', 'fruit', 'food'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/017_orange/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Orange',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['plum', 'fruit', 'food'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/018_plum/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Plum',
    attribution: 'YCB Object and Model Set'
  },

  // Boxes & Packages
  {
    keywords: ['cracker', 'box', 'package', 'carton'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/003_cracker_box/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Cracker Box',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['sugar', 'box', 'package'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/004_sugar_box/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Sugar Box',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['pudding', 'box', 'gelatin'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/008_pudding_box/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Pudding Box',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['gelatin', 'jello', 'box'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/009_gelatin_box/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Gelatin Box',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['meat', 'potted', 'can'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/010_potted_meat_can/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Potted Meat Can',
    attribution: 'YCB Object and Model Set'
  },

  // Manipulation Objects & Sports
  {
    keywords: ['softball', 'ball', 'sphere'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/054_softball/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Softball',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['baseball', 'ball', 'sphere'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/055_baseball/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Baseball',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['soccer', 'ball', 'football'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/053_mini_soccer_ball/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Mini Soccer Ball',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['tennis', 'ball', 'sphere'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/056_tennis_ball/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Tennis Ball',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['racquetball', 'ball', 'sphere'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/057_racquetball/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Racquetball',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['golf', 'ball', 'sphere'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/058_golf_ball/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Golf Ball',
    attribution: 'YCB Object and Model Set'
  },

  // Building Blocks & Toys
  {
    keywords: ['foam', 'brick', 'block'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/061_foam_brick/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Foam Brick',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['wood', 'block', 'cube'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/036_wood_block/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Wood Block',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['dice', 'die', 'cube', 'game'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/062_dice/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Dice',
    attribution: 'YCB Object and Model Set'
  },
  {
    keywords: ['rubik', 'cube', 'puzzle'],
    modelUrl: 'http://ycb-benchmarks.s3.amazonaws.com/data/objects/077_rubiks_cube/google_16k/textured.obj',
    source: 'YCB',
    license: 'CC-BY-4.0',
    category: 'robotics',
    scale: 1.0,
    description: 'YCB Rubiks Cube',
    attribution: 'YCB Object and Model Set'
  }
];

/**
 * POLY HAVEN MODELS (High-Quality CC0 Assets)
 * Source: https://polyhaven.com/
 * License: CC0 (Public Domain)
 *
 * Professional-quality glTF models with PBR materials.
 * Perfect for environments, furniture, and general objects.
 */
const POLY_HAVEN_MODELS: OpenSourceModel[] = [
  // NOTE: Poly Haven has an API. We can dynamically query for models.
  // For now, using placeholders. Will implement dynamic API calls.
  {
    keywords: ['floor', 'ground', 'surface', 'platform', 'base'],
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Box/glTF-Binary/Box.glb',
    source: 'Khronos',
    license: 'CC0',
    category: 'environment',
    scale: 10.0,
    description: 'Floor/Ground plane (Khronos sample)',
    attribution: 'Khronos glTF Sample Models'
  },
  {
    keywords: ['table', 'desk', 'workbench', 'surface'],
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Box/glTF-Binary/Box.glb',
    source: 'Khronos',
    license: 'CC0',
    category: 'environment',
    scale: 3.0,
    description: 'Table surface (Khronos sample)',
    attribution: 'Khronos glTF Sample Models'
  }
];

/**
 * KHRONOS GLTF SAMPLE MODELS (WebGL Tested)
 * Source: https://github.com/KhronosGroup/glTF-Sample-Models
 * License: Various (mostly CC0)
 *
 * These are guaranteed to work in WebGL. Used as reliable fallbacks.
 */
const KHRONOS_SAFE_MODELS: OpenSourceModel[] = [
  {
    keywords: ['helmet', 'protection', 'safety', 'gear'],
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
    source: 'Khronos',
    license: 'CC0',
    category: 'industrial',
    scale: 0.5,
    description: 'Safety Helmet (PBR example)',
    attribution: 'Khronos glTF Sample Models'
  },
  {
    keywords: ['vehicle', 'car', 'truck', 'automobile'],
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb',
    source: 'Khronos',
    license: 'CC0',
    category: 'general',
    scale: 2.0,
    description: 'Industrial Vehicle',
    attribution: 'Khronos glTF Sample Models'
  }
];

/**
 * COMBINED MODEL LIBRARY
 * Priority: YCB (robotics standard) > Poly Haven (quality) > Khronos (safe fallback)
 */
export const OPEN_SOURCE_MODEL_LIBRARY: OpenSourceModel[] = [
  ...YCB_MODELS,
  ...POLY_HAVEN_MODELS,
  ...KHRONOS_SAFE_MODELS
];

/**
 * Find best matching open-source model for object description
 * @param objectName - Name of the object
 * @param semanticLabel - Optional semantic label
 * @returns Model URL or null (falls back to domain randomization)
 */
export function findOpenSourceModel(objectName: string, semanticLabel?: string): {
  modelUrl: string | null;
  source: string | null;
  attribution: string | null;
} {
  const searchText = `${objectName} ${semanticLabel || ''}`.toLowerCase();

  // Search through model library
  for (const model of OPEN_SOURCE_MODEL_LIBRARY) {
    for (const keyword of model.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        console.log(`[OpenSourceModels] Matched "${objectName}" to ${model.source} model: ${model.description}`);
        return {
          modelUrl: model.modelUrl,
          source: model.source,
          attribution: model.attribution || null
        };
      }
    }
  }

  // No model found - will use domain randomization
  console.log(`[OpenSourceModels] No model found for "${objectName}", using domain randomization with geometric primitives`);
  return {
    modelUrl: null,
    source: null,
    attribution: null
  };
}

/**
 * Get YCB object by index
 * YCB has 80+ objects numbered 001-080+
 * Full list: http://ycb-benchmarks.s3-website-us-east-1.amazonaws.com/
 */
export function getYCBObject(index: number): string {
  const paddedIndex = index.toString().padStart(3, '0');
  return `http://ycb-benchmarks.s3.amazonaws.com/data/objects/${paddedIndex}_*/google_16k/textured.obj`;
}

/**
 * Query Poly Haven API for models (future enhancement)
 * API: https://api.polyhaven.com/assets?t=models
 */
export async function queryPolyHavenModels(searchTerm: string): Promise<string | null> {
  // TODO: Implement Poly Haven API integration
  // For now, return null (uses domain randomization)
  return null;
}

/**
 * Validate model URL accessibility
 * Checks if model can be loaded before rendering
 */
export async function validateModelUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.warn(`[OpenSourceModels] Model validation failed for ${url}:`, error);
    return false;
  }
}

/**
 * Get attribution text for credits
 */
export function getAttributionText(): string {
  return `
3D Models from open-source datasets:
- YCB Object and Model Set (CC BY 4.0) - https://www.ycbbenchmarks.com/
- Poly Haven (CC0) - https://polyhaven.com/
- Khronos glTF Sample Models (CC0) - https://github.com/KhronosGroup/glTF-Sample-Models

If models fail to load, domain randomization with geometric primitives is used (NVIDIA Isaac Sim approach).
  `.trim();
}
