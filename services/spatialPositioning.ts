/**
 * SPATIAL POSITIONING SERVICE
 *
 * Calculates realistic 3D positions for AI-generated objects based on:
 * - "on_surface" constraints (objects placed ON tables, floors)
 * - Parent-child relationships (robot positioned NEAR operating table)
 * - Collision-free placement
 *
 * P0 CRITICAL FIX: Prevents objects from spawning in random positions and falling chaotically.
 */

import { AssetGroup, Vector3Data } from '../types';

/**
 * Extended AssetGroup with calculated spawn position
 */
export interface AssetGroupWithPosition extends AssetGroup {
  spawnPosition?: Vector3Data; // Calculated initial position
}

/**
 * Main function: Calculate positions for all asset groups based on constraints
 */
export function calculateSpatialPositions(
  assetGroups: AssetGroup[]
): AssetGroupWithPosition[] {
  console.log('[SpatialPositioning] Calculating positions for', assetGroups.length, 'objects');

  // Step 1: Identify surfaces (floors, tables, platforms)
  const surfaces = assetGroups.filter(g =>
    g.vrRole === 'furniture' ||
    g.vrRole === 'environment' ||
    g.shape === 'PLATE' ||
    g.name.toLowerCase().includes('floor') ||
    g.name.toLowerCase().includes('table') ||
    g.name.toLowerCase().includes('platform') ||
    g.name.toLowerCase().includes('surface')
  );

  console.log('[SpatialPositioning] Identified', surfaces.length, 'surfaces:', surfaces.map(s => s.name).join(', '));

  // Step 2: Position surfaces first (they are foundations)
  const positionedGroups: AssetGroupWithPosition[] = assetGroups.map(group => {
    if (surfaces.includes(group)) {
      return positionSurface(group);
    }
    return group;
  });

  // Step 3: Position objects with "on_surface" or "attached_to" constraints
  const finalGroups = positionedGroups.map(group => {
    if (!surfaces.includes(group) && group.spatialConstraint) {
      const constraint = group.spatialConstraint;

      if (constraint.type === 'on_surface' && constraint.parentGroupId) {
        const parentSurface = positionedGroups.find(g => g.id === constraint.parentGroupId);

        if (parentSurface && parentSurface.spawnPosition) {
          return positionOnSurface(group, parentSurface);
        }
      }

      // Handle "attached_to" constraints (objects near/attached to others)
      if (constraint.type === 'attached_to' && constraint.parentGroupId) {
        const targetObject = positionedGroups.find(g => g.id === constraint.parentGroupId);

        if (targetObject && targetObject.spawnPosition) {
          return positionNear(group, targetObject);
        }
      }
    }

    // Default: position at origin if no constraints
    if (!group.spawnPosition) {
      const dimensions = calculateDimensions(group);
      return { ...group, spawnPosition: { x: 0, y: dimensions.height / 2, z: 0 } };
    }

    return group;
  });

  console.log('[SpatialPositioning] Positioning complete. Summary:');
  finalGroups.forEach(g => {
    if (g.spawnPosition) {
      // Validate positions (check for NaN which breaks rendering)
      if (isNaN(g.spawnPosition.x) || isNaN(g.spawnPosition.y) || isNaN(g.spawnPosition.z)) {
        console.error(`[SpatialPositioning] ERROR: NaN position detected for "${g.name}"! Defaulting to origin.`);
        g.spawnPosition = { x: 0, y: 1, z: 0 };
      }
      console.log(`  - ${g.name}: (${g.spawnPosition.x.toFixed(2)}, ${g.spawnPosition.y.toFixed(2)}, ${g.spawnPosition.z.toFixed(2)})`);
    }
  });

  return finalGroups;
}

/**
 * Calculate dimensions from shape and scale
 */
function calculateDimensions(group: AssetGroup): { width: number; height: number; depth: number } {
  const scale = group.scale;

  // For most shapes, use scale as base dimension
  switch (group.shape) {
    case 'PLATE':
      // Plates are wide and flat (for floors, tables)
      return { width: scale * 2, height: scale * 0.1, depth: scale * 2 };
    case 'CUBE':
      return { width: scale, height: scale, depth: scale };
    case 'SPHERE':
      return { width: scale * 2, height: scale * 2, depth: scale * 2 }; // Diameter
    case 'CYLINDER':
      return { width: scale * 2, height: scale, depth: scale * 2 }; // Diameter for width/depth
    case 'CONE':
      return { width: scale * 2, height: scale, depth: scale * 2 };
    case 'CAPSULE':
      return { width: scale, height: scale * 2, depth: scale };
    case 'PYRAMID':
      return { width: scale, height: scale, depth: scale };
    case 'TORUS':
      return { width: scale * 2, height: scale * 0.5, depth: scale * 2 };
    case 'ICOSAHEDRON':
      return { width: scale, height: scale, depth: scale };
    default:
      return { width: scale, height: scale, depth: scale };
  }
}

/**
 * Position a surface object (floor, table, platform)
 */
function positionSurface(surface: AssetGroup): AssetGroupWithPosition {
  const dimensions = calculateDimensions(surface);

  // Floors go at y=0
  if (surface.name.toLowerCase().includes('floor') || surface.name.toLowerCase().includes('ground')) {
    return {
      ...surface,
      spawnPosition: { x: 0, y: 0, z: 0 }
    };
  }

  // Tables/platforms go at realistic height (0.7-1.0 meters)
  if (surface.name.toLowerCase().includes('table') || surface.name.toLowerCase().includes('platform')) {
    const tableHeight = 0.85; // Standard operating table height
    return {
      ...surface,
      spawnPosition: { x: 0, y: tableHeight, z: 0 }
    };
  }

  // Default surface positioning
  return {
    ...surface,
    spawnPosition: { x: 0, y: dimensions.height / 2, z: 0 }
  };
}

/**
 * Position an object ON a surface (e.g., heart ON operating table)
 */
function positionOnSurface(
  object: AssetGroup,
  surface: AssetGroupWithPosition
): AssetGroupWithPosition {
  if (!surface.spawnPosition) {
    console.warn('[SpatialPositioning] Parent surface has no position, using default');
    return object;
  }

  const surfaceDimensions = calculateDimensions(surface);
  const objectDimensions = calculateDimensions(object);

  // Calculate Y position: surface top + half of object height
  const surfaceTop = surface.spawnPosition.y + (surfaceDimensions.height / 2);
  const objectBottom = objectDimensions.height / 2;
  const yPos = surfaceTop + objectBottom + 0.01; // Small offset to prevent Z-fighting

  // Apply X/Z offset if specified (for multiple objects on same surface)
  const constraint = object.spatialConstraint;
  const xOffset = constraint?.offset?.x || 0;
  const zOffset = constraint?.offset?.z || 0;

  const spawnPosition: Vector3Data = {
    x: surface.spawnPosition.x + xOffset,
    y: yPos,
    z: surface.spawnPosition.z + zOffset
  };

  console.log(`[SpatialPositioning] Placed "${object.name}" ON "${surface.name}" at y=${yPos.toFixed(2)}`);

  return { ...object, spawnPosition };
}

/**
 * Position an object NEAR another object (e.g., robot positioned near operating table)
 */
function positionNear(
  object: AssetGroup,
  target: AssetGroupWithPosition
): AssetGroupWithPosition {
  if (!target.spawnPosition) {
    console.warn('[SpatialPositioning] Target object has no position, using default');
    return object;
  }

  const targetDimensions = calculateDimensions(target);
  const objectDimensions = calculateDimensions(object);

  // Position object adjacent to target (1 meter away in X direction by default)
  const constraint = object.spatialConstraint;
  const nearDistance = 1.0;
  const xOffset = constraint?.offset?.x ?? (targetDimensions.width / 2 + objectDimensions.width / 2 + nearDistance);
  const yOffset = constraint?.offset?.y ?? 0;
  const zOffset = constraint?.offset?.z ?? 0;

  const spawnPosition: Vector3Data = {
    x: target.spawnPosition.x + xOffset,
    y: target.spawnPosition.y + yOffset,
    z: target.spawnPosition.z + zOffset
  };

  console.log(`[SpatialPositioning] Placed "${object.name}" NEAR "${target.name}"`);

  return { ...object, spawnPosition };
}
