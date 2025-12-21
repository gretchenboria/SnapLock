/**
 * SceneGraph Service
 *
 * Manages hybrid scene architecture for ML training data generation.
 * Supports both individual scene objects and instanced groups.
 *
 * Architecture:
 * - SceneObject: Unique objects with full control (robots, tools, furniture)
 * - InstancedGroup: Bulk objects for performance (debris, particles)
 * - Scene: Container holding both types
 */

import { Scene, SceneObject, InstancedGroup, AssetGroup, RigidBodyType, ShapeType, SpawnMode, Vector3Data } from '../types';

export class SceneGraph {
  private scene: Scene;

  constructor(scene?: Scene) {
    this.scene = scene || { objects: [], instancedGroups: [] };
  }

  /**
   * Add a unique object to the scene
   */
  addObject(object: SceneObject): void {
    this.scene.objects.push(object);
  }

  /**
   * Add an instanced group for bulk rendering
   */
  addInstancedGroup(group: InstancedGroup): void {
    if (!this.scene.instancedGroups) {
      this.scene.instancedGroups = [];
    }
    this.scene.instancedGroups.push(group);
  }

  /**
   * Get object by ID
   */
  getObject(id: string): SceneObject | undefined {
    return this.scene.objects.find(obj => obj.id === id);
  }

  /**
   * Get all objects
   */
  getAllObjects(): SceneObject[] {
    return this.scene.objects;
  }

  /**
   * Get scene
   */
  getScene(): Scene {
    return this.scene;
  }

  /**
   * Get total object count (including instanced)
   */
  getTotalObjectCount(): number {
    const uniqueCount = this.scene.objects.length;
    const instancedCount = (this.scene.instancedGroups || []).reduce((sum, group) => sum + group.count, 0);
    return uniqueCount + instancedCount;
  }

  /**
   * Convert Scene to legacy AssetGroup[] format for backward compatibility
   * This allows the new scene system to work with existing rendering/physics code
   */
  static sceneToLegacyFormat(scene: Scene): AssetGroup[] {
    const groups: AssetGroup[] = [];

    // Convert individual scene objects to single-count asset groups
    scene.objects.forEach((obj, index) => {
      const scale = typeof obj.scale === 'number' ? obj.scale :
                    (obj.scale.x + obj.scale.y + obj.scale.z) / 3; // Average scale

      groups.push({
        id: obj.id,
        name: obj.name,
        count: 1, // Each scene object is unique
        shape: obj.modelUrl ? ShapeType.MODEL : (obj.shape || ShapeType.CUBE), // AUTO-INFER: modelUrl → MODEL shape
        modelUrl: obj.modelUrl,
        color: obj.color || '#808080',
        spawnMode: SpawnMode.GRID, // Single object, position is fixed
        scale: scale,
        rigidBodyType: obj.rigidBodyType,
        restitution: obj.restitution,
        friction: obj.friction,
        mass: obj.mass,
        drag: obj.drag,
        visible: obj.visible !== false,
        spawnPosition: obj.position, // Use exact position from scene object
        semanticLabel: obj.semanticLabel,
        affordances: obj.affordances,
        deformation: obj.deformation, // Pass through mesh deformation for data augmentation
        spatialConstraint: obj.spatialConstraint ? {
          type: obj.spatialConstraint.type,
          parentGroupId: obj.parentId,
          offset: obj.spatialConstraint.offset
        } : undefined
      });
    });

    // Add instanced groups as-is
    if (scene.instancedGroups) {
      groups.push(...scene.instancedGroups);
    }

    return groups;
  }

  /**
   * Create a simple scene with common objects
   */
  static createSimpleScene(config: {
    includeRobot?: boolean;
    includeTable?: boolean;
    includeObjects?: number;
  }): Scene {
    const scene: Scene = { objects: [], instancedGroups: [] };

    // Add table (static surface)
    if (config.includeTable) {
      scene.objects.push({
        id: 'table_1',
        name: 'Table',
        type: 'primitive',
        shape: ShapeType.CUBE,
        scale: { x: 2, y: 0.1, z: 1.5 },
        color: '#8B4513',
        rigidBodyType: RigidBodyType.STATIC,
        mass: 50,
        restitution: 0.3,
        friction: 0.7,
        drag: 0.05,
        position: { x: 0, y: -1, z: 0 },
        semanticLabel: 'table',
        affordances: {
          graspable: false,
          manipulable: false,
          interactive: false
        }
      });
    }

    // Add robot arm (kinematic)
    if (config.includeRobot) {
      scene.objects.push({
        id: 'robot_1',
        name: 'Robot Arm',
        type: 'primitive',
        shape: ShapeType.CYLINDER,
        scale: { x: 0.1, y: 0.8, z: 0.1 },
        color: '#4A90E2',
        rigidBodyType: RigidBodyType.KINEMATIC,
        mass: 10,
        restitution: 0.3,
        friction: 0.5,
        drag: 0.05,
        position: { x: -1, y: 0, z: 0 },
        semanticLabel: 'robot_arm',
        affordances: {
          graspable: false,
          manipulable: false,
          interactive: true
        }
      });
    }

    // Add graspable objects
    if (config.includeObjects && config.includeObjects > 0) {
      const objects = ['cube', 'sphere', 'cylinder'];
      for (let i = 0; i < config.includeObjects; i++) {
        const objType = objects[i % objects.length];
        const shapeMap: Record<string, ShapeType> = {
          cube: ShapeType.CUBE,
          sphere: ShapeType.SPHERE,
          cylinder: ShapeType.CYLINDER
        };

        scene.objects.push({
          id: `object_${i + 1}`,
          name: `${objType}_${i + 1}`,
          type: 'primitive',
          shape: shapeMap[objType],
          scale: 0.15,
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          rigidBodyType: RigidBodyType.DYNAMIC,
          mass: 0.5,
          restitution: 0.5,
          friction: 0.6,
          drag: 0.05,
          position: {
            x: (Math.random() - 0.5) * 1.5,
            y: 2 + i * 0.3,
            z: (Math.random() - 0.5) * 1.5
          },
          semanticLabel: objType,
          affordances: {
            graspable: true,
            manipulable: true,
            interactive: false
          }
        });
      }
    }

    return scene;
  }

  /**
   * Validate scene for physics simulation
   */
  static validateScene(scene: Scene): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for duplicate IDs
    const ids = new Set<string>();
    scene.objects.forEach(obj => {
      if (ids.has(obj.id)) {
        errors.push(`Duplicate object ID: ${obj.id}`);
      }
      ids.add(obj.id);
    });

    (scene.instancedGroups || []).forEach(group => {
      if (ids.has(group.id)) {
        errors.push(`Duplicate group ID: ${group.id}`);
      }
      ids.add(group.id);
    });

    // Check for invalid parent references
    scene.objects.forEach(obj => {
      if (obj.parentId && !ids.has(obj.parentId)) {
        errors.push(`Object ${obj.id} references non-existent parent: ${obj.parentId}`);
      }
    });

    // Check for physics property validity
    scene.objects.forEach(obj => {
      if (obj.mass <= 0) {
        errors.push(`Object ${obj.id} has invalid mass: ${obj.mass}`);
      }
      if (obj.restitution < 0 || obj.restitution > 1) {
        errors.push(`Object ${obj.id} has invalid restitution: ${obj.restitution}`);
      }
      if (obj.friction < 0 || obj.friction > 1) {
        errors.push(`Object ${obj.id} has invalid friction: ${obj.friction}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Scene Builder: Fluent API for constructing scenes
 */
export class SceneBuilder {
  private scene: Scene = { objects: [], instancedGroups: [] };

  addTable(position: Vector3Data = { x: 0, y: -1, z: 0 }): this {
    this.scene.objects.push({
      id: `table_${this.scene.objects.length}`,
      name: 'Table',
      type: 'primitive',
      shape: ShapeType.CUBE,
      scale: { x: 2, y: 0.1, z: 1.5 },
      color: '#8B4513',
      rigidBodyType: RigidBodyType.STATIC,
      mass: 50,
      restitution: 0.3,
      friction: 0.7,
      drag: 0.05,
      position,
      semanticLabel: 'table',
      affordances: { graspable: false, manipulable: false, interactive: false }
    });
    return this;
  }

  addRobot(position: Vector3Data = { x: -1, y: 0, z: 0 }): this {
    this.scene.objects.push({
      id: `robot_${this.scene.objects.length}`,
      name: 'Robot',
      type: 'primitive',
      shape: ShapeType.CYLINDER,
      scale: { x: 0.1, y: 0.8, z: 0.1 },
      color: '#4A90E2',
      rigidBodyType: RigidBodyType.KINEMATIC,
      mass: 10,
      restitution: 0.3,
      friction: 0.5,
      drag: 0.05,
      position,
      semanticLabel: 'robot',
      affordances: { graspable: false, manipulable: false, interactive: true }
    });
    return this;
  }

  addGraspableObject(
    shape: ShapeType,
    position: Vector3Data,
    label: string = 'object'
  ): this {
    this.scene.objects.push({
      id: `${label}_${this.scene.objects.length}`,
      name: label,
      type: 'primitive',
      shape,
      scale: 0.15,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      rigidBodyType: RigidBodyType.DYNAMIC,
      mass: 0.5,
      restitution: 0.5,
      friction: 0.6,
      drag: 0.05,
      position,
      semanticLabel: label,
      affordances: { graspable: true, manipulable: true, interactive: false }
    });
    return this;
  }

  addDebrisField(count: number = 50): this {
    if (!this.scene.instancedGroups) {
      this.scene.instancedGroups = [];
    }
    this.scene.instancedGroups.push({
      id: `debris_${this.scene.instancedGroups.length}`,
      name: 'Debris',
      count,
      shape: ShapeType.CUBE,
      color: '#777777',
      spawnMode: SpawnMode.BLAST,
      scale: 0.1,
      rigidBodyType: RigidBodyType.DYNAMIC,
      restitution: 0.4,
      friction: 0.5,
      mass: 0.2,
      drag: 0.05
    });
    return this;
  }

  build(): Scene {
    return this.scene;
  }
}
