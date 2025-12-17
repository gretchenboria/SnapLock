import * as THREE from 'three';
import { PhysicsParams, ShapeType } from '../types';

/**
 * SpatialPlacementEngine - Calculates positioning for spatialized images
 *
 * Provides multiple placement strategies:
 * - above_center: Position above the center of mass of all physics objects
 * - behind_camera: Position behind the default camera view
 * - on_surface: Position on top of PLATE objects (tables, floors)
 * - floating: Float at a fixed world position
 */

export type PlacementMode = 'above_center' | 'behind_camera' | 'on_surface' | 'floating';

export interface PlacementOptions {
  mode: PlacementMode;
  offset?: THREE.Vector3;
  rotation?: THREE.Euler;
}

export class SpatialPlacementEngine {
  /**
   * Calculate position for spatialized image
   */
  static getPosition(
    params: PhysicsParams,
    mode: PlacementMode = 'above_center',
    customOffset?: THREE.Vector3
  ): THREE.Vector3 {
    switch (mode) {
      case 'above_center':
        return this.getAboveCenterPosition(params, customOffset);

      case 'behind_camera':
        return this.getBehindCameraPosition(customOffset);

      case 'on_surface':
        return this.getOnSurfacePosition(params, customOffset);

      case 'floating':
        return this.getFloatingPosition(customOffset);

      default:
        return new THREE.Vector3(0, 5, 0);
    }
  }

  /**
   * Position above the center of mass of all objects
   */
  private static getAboveCenterPosition(params: PhysicsParams, offset?: THREE.Vector3): THREE.Vector3 {
    // If no objects, use default height
    if (params.assetGroups.length === 0) {
      return new THREE.Vector3(0, 5, 0);
    }

    // Calculate total particle count for weighted average (simplified)
    const totalParticles = params.assetGroups.reduce((sum, g) => sum + g.count, 0);

    if (totalParticles === 0) {
      return new THREE.Vector3(0, 5, 0);
    }

    // Estimate center height based on typical spawn patterns
    // PILE and GRID modes center around y=0, so objects are roughly at scale/2
    const avgScale = params.assetGroups.reduce((sum, g) => sum + g.scale, 0) / params.assetGroups.length;
    const estimatedHeight = avgScale * 1.5; // Objects typically at scale/2 + some margin

    // Place image 3 units above estimated center
    const basePosition = new THREE.Vector3(0, estimatedHeight + 3, 0);

    // Apply custom offset if provided
    if (offset) {
      basePosition.add(offset);
    }

    return basePosition;
  }

  /**
   * Position behind the default camera view
   */
  private static getBehindCameraPosition(offset?: THREE.Vector3): THREE.Vector3 {
    // Default camera typically at (0, 5, 10) looking at origin
    // Place image behind camera at Z=-10
    const basePosition = new THREE.Vector3(0, 5, -10);

    if (offset) {
      basePosition.add(offset);
    }

    return basePosition;
  }

  /**
   * Position on top of a PLATE object (table, floor)
   */
  private static getOnSurfacePosition(params: PhysicsParams, offset?: THREE.Vector3): THREE.Vector3 {
    // Find the largest PLATE object (likely the primary surface)
    const plateGroup = params.assetGroups
      .filter(g => g.shape === ShapeType.PLATE)
      .sort((a, b) => b.scale - a.scale)[0]; // Largest plate

    if (plateGroup) {
      // Place slightly above the plate surface
      const plateHeight = plateGroup.scale * 0.05; // Plates are 5% of scale in height
      const basePosition = new THREE.Vector3(0, plateHeight + 0.1, 0);

      if (offset) {
        basePosition.add(offset);
      }

      return basePosition;
    }

    // Fallback to above_center if no plate found
    return this.getAboveCenterPosition(params, offset);
  }

  /**
   * Floating position at fixed world coordinates
   */
  private static getFloatingPosition(offset?: THREE.Vector3): THREE.Vector3 {
    const basePosition = new THREE.Vector3(0, 5, 0);

    if (offset) {
      basePosition.add(offset);
    }

    return basePosition;
  }

  /**
   * Calculate scale from texture dimensions
   * Maintains aspect ratio while respecting max dimension
   */
  static calculateScale(
    texture: THREE.Texture,
    maxDimension: number = 5
  ): [number, number] {
    const img = texture.image as HTMLImageElement | HTMLCanvasElement;

    if (!img || !img.width || !img.height) {
      console.warn('Invalid texture image dimensions, using default scale');
      return [maxDimension, maxDimension];
    }

    const aspectRatio = img.width / img.height;

    if (aspectRatio > 1) {
      // Wider than tall
      return [maxDimension, maxDimension / aspectRatio];
    } else {
      // Taller than wide
      return [maxDimension * aspectRatio, maxDimension];
    }
  }

  /**
   * Calculate rotation to face camera
   * Useful for billboard-style images
   */
  static calculateBillboardRotation(cameraPosition: THREE.Vector3, targetPosition: THREE.Vector3): THREE.Euler {
    const direction = new THREE.Vector3().subVectors(cameraPosition, targetPosition);
    direction.y = 0; // Keep upright
    direction.normalize();

    const angle = Math.atan2(direction.x, direction.z);
    return new THREE.Euler(0, angle, 0);
  }

  /**
   * Get default placement options based on scene context
   */
  static getDefaultPlacement(params: PhysicsParams): PlacementOptions {
    // If there are PLATE objects, place on surface
    const hasPlates = params.assetGroups.some(g => g.shape === ShapeType.PLATE);
    if (hasPlates) {
      return { mode: 'on_surface' };
    }

    // Otherwise, place above center
    return { mode: 'above_center' };
  }

  /**
   * Validate placement position (ensure it's not underground or too far)
   */
  static validatePosition(position: THREE.Vector3): boolean {
    // Check if position is underground
    if (position.y < -10) {
      console.warn('Placement position is underground:', position.y);
      return false;
    }

    // Check if position is too far from origin
    const distance = position.length();
    if (distance > 1000) {
      console.warn('Placement position is too far from origin:', distance);
      return false;
    }

    return true;
  }

  /**
   * Generate random offset for variety
   */
  static getRandomOffset(range: number = 2): THREE.Vector3 {
    return new THREE.Vector3(
      (Math.random() - 0.5) * range,
      (Math.random() - 0.5) * range * 0.5, // Less vertical variation
      (Math.random() - 0.5) * range
    );
  }
}
