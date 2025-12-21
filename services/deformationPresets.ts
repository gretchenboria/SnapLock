/**
 * Mesh Deformation Presets for Data Augmentation
 *
 * Pre-configured deformation strategies for generating training data diversity.
 * All presets keep deformation intensity < 20% to maintain acceptable physics approximation.
 */

import { MeshDeformation } from '../types';

/**
 * Predefined deformation presets for common augmentation scenarios
 */
export const DEFORMATION_PRESETS: Record<string, MeshDeformation> = {
  /**
   * Subtle Variation - Minimal deformation for near-identical objects
   * Use case: Generating slight manufacturing variations
   */
  subtle_variation: {
    type: 'noise',
    intensity: 0.02,  // 2% deformation
    frequency: 0.5,
    seed: Math.random() * 1000
  },

  /**
   * Organic Deform - Natural organic variation
   * Use case: Soft materials, biological objects, worn items
   */
  organic_deform: {
    type: 'noise',
    intensity: 0.1,   // 10% deformation
    frequency: 1.0,
    seed: Math.random() * 1000
  },

  /**
   * Damaged/Worn - Simulating wear and tear
   * Use case: Training models to recognize damaged objects
   */
  damaged: {
    type: 'noise',
    intensity: 0.15,  // 15% deformation
    frequency: 2.0,
    seed: Math.random() * 1000
  },

  /**
   * Wave - Sinusoidal deformation (animated)
   * Use case: Cloth, water, flexible materials
   */
  wave: {
    type: 'wave',
    intensity: 0.08,  // 8% deformation
    frequency: 1.5,
    axis: 'y',
    seed: Math.random() * 1000
  },

  /**
   * Bulge - Radial expansion/contraction
   * Use case: Inflated objects, pressure deformation
   */
  bulge: {
    type: 'bulge',
    intensity: 0.12,  // 12% deformation
    frequency: 1.0,
    seed: Math.random() * 1000
  },

  /**
   * Twist - Rotational deformation along axis
   * Use case: Cables, ropes, twisted objects
   */
  twist: {
    type: 'twist',
    intensity: 0.1,   // 10% twist
    frequency: 0.8,
    axis: 'y',
    seed: Math.random() * 1000
  },

  /**
   * None - No deformation (baseline)
   */
  none: {
    type: 'noise',
    intensity: 0,
    frequency: 1.0,
    seed: 0
  }
};

/**
 * Generate random deformation based on object type and intensity
 */
export function generateRandomDeformation(
  objectType: string,
  intensity: number = 0.5
): MeshDeformation {
  // Clamp intensity to maintain physics accuracy (< 20%)
  const clampedIntensity = Math.min(0.19, Math.max(0, intensity * 0.2));

  // Choose deformation type based on object characteristics
  const deformationType = selectDeformationType(objectType);

  return {
    type: deformationType,
    intensity: clampedIntensity,
    frequency: 0.5 + Math.random() * 2.0, // 0.5 to 2.5
    seed: Math.random() * 10000,
    axis: ['x', 'y', 'z'][Math.floor(Math.random() * 3)] as 'x' | 'y' | 'z'
  };
}

/**
 * Select appropriate deformation type based on object semantic label
 */
function selectDeformationType(objectType: string): 'noise' | 'wave' | 'bulge' | 'twist' {
  const type = objectType.toLowerCase();

  // Soft/flexible materials → wave
  if (type.includes('cloth') || type.includes('fabric') || type.includes('soft')) {
    return 'wave';
  }

  // Cylindrical objects → twist
  if (type.includes('cable') || type.includes('rope') || type.includes('cylinder')) {
    return 'twist';
  }

  // Inflatable/pressure objects → bulge
  if (type.includes('ball') || type.includes('sphere') || type.includes('inflat')) {
    return 'bulge';
  }

  // Default: noise (works for most objects)
  return 'noise';
}

/**
 * Generate batch of deformations for dataset augmentation
 * Returns N variations of the same object with different deformations
 */
export function generateDeformationBatch(
  baseObject: string,
  count: number = 10,
  intensityRange: [number, number] = [0.02, 0.15]
): MeshDeformation[] {
  const deformations: MeshDeformation[] = [];
  const [minIntensity, maxIntensity] = intensityRange;

  for (let i = 0; i < count; i++) {
    const intensity = minIntensity + (maxIntensity - minIntensity) * (i / (count - 1));
    const seed = i * 1000; // Deterministic seeds for reproducibility

    deformations.push({
      type: 'noise',
      intensity,
      frequency: 0.8 + Math.random() * 1.5,
      seed
    });
  }

  return deformations;
}

/**
 * Get deformation preset by name (safe accessor)
 */
export function getPreset(presetName: string): MeshDeformation | null {
  return DEFORMATION_PRESETS[presetName] || null;
}

/**
 * List all available preset names
 */
export function listPresets(): string[] {
  return Object.keys(DEFORMATION_PRESETS);
}

/**
 * Validate deformation parameters for physics compliance
 * Returns true if deformation is safe (< 20% intensity)
 */
export function validateDeformation(deformation: MeshDeformation): boolean {
  // Physics accuracy constraint: keep deformation < 20%
  if (deformation.intensity > 0.2) {
    console.warn(`[DeformationPresets] Intensity ${deformation.intensity} exceeds recommended 0.2 limit`);
    return false;
  }

  return true;
}

/**
 * Create custom deformation with automatic intensity clamping
 */
export function createSafeDeformation(
  type: 'noise' | 'wave' | 'bulge' | 'twist',
  intensity: number,
  frequency?: number,
  seed?: number,
  axis?: 'x' | 'y' | 'z'
): MeshDeformation {
  return {
    type,
    intensity: Math.min(0.19, Math.max(0, intensity)), // Clamp to safe range
    frequency: frequency ?? 1.0,
    seed: seed ?? Math.random() * 10000,
    axis
  };
}
