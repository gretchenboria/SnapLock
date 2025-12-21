/**
 * Scene Assembler
 * 
 * Auto-assembles physics scenes from Asset Library models
 * instead of generating primitives from AI prompts.
 */

import { Scene, SceneObject, RigidBodyType, ShapeType, Vector3Data } from '../types';
import { Asset } from './assetLibraryService';

export interface SceneAssemblyConfig {
  assets: Asset[];
  layout?: 'tabletop' | 'warehouse_shelf' | 'surgical_table' | 'grid' | 'pile';
  includeGround?: boolean;
  includeRobot?: boolean;
  spacing?: number;
}

export class SceneAssembler {
  /**
   * Assemble a scene from asset library models
   */
  static assembleFromAssets(config: SceneAssemblyConfig): Scene {
    const scene: Scene = { objects: [], instancedGroups: [] };
    const { assets, layout = 'tabletop', includeGround = true, includeRobot = false, spacing = 0.3 } = config;

    // Add ground surface
    if (includeGround) {
      scene.objects.push(this.createGroundPlane());
    }

    // Add robot if requested
    if (includeRobot) {
      scene.objects.push(this.createRobotArm({ x: -1, y: 0, z: 0 }));
    }

    // Arrange assets based on layout
    switch (layout) {
      case 'tabletop':
        this.arrangeTabletop(scene, assets, spacing);
        break;
      case 'warehouse_shelf':
        this.arrangeWarehouseShelf(scene, assets, spacing);
        break;
      case 'surgical_table':
        this.arrangeSurgicalTable(scene, assets, spacing);
        break;
      case 'grid':
        this.arrangeGrid(scene, assets, spacing);
        break;
      case 'pile':
        this.arrangePile(scene, assets, spacing);
        break;
    }

    return scene;
  }

  /**
   * Create ground plane (small - physics engine has its own)
   */
  private static createGroundPlane(): SceneObject {
    return {
      id: 'ground_plane',
      name: 'Ground Plane',
      type: 'primitive',
      shape: ShapeType.CUBE,
      scale: { x: 8, y: 0.05, z: 8 },
      color: '#505050',
      rigidBodyType: RigidBodyType.STATIC,
      mass: 1000,
      restitution: 0.3,
      friction: 0.8,
      drag: 0.05,
      position: { x: 0, y: -1.2, z: 0 },
      semanticLabel: 'ground',
      affordances: { graspable: false, manipulable: false, interactive: false }
    };
  }

  /**
   * Create robot arm
   */
  private static createRobotArm(position: Vector3Data): SceneObject {
    return {
      id: 'robot_arm',
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
      position,
      semanticLabel: 'robot_arm',
      affordances: { graspable: false, manipulable: false, interactive: true }
    };
  }

  /**
   * Convert asset to scene object
   */
  private static assetToSceneObject(
    asset: Asset,
    position: Vector3Data,
    index: number
  ): SceneObject {
    // Determine if object is graspable based on asset metadata
    const isGraspable = asset.metadata?.graspable !== false;
    const isManipulable = asset.metadata?.manipulable !== false;

    return {
      id: `${asset.id}_${index}`,
      name: asset.name,
      type: 'mesh',
      modelUrl: asset.url,
      scale: asset.metadata?.scale || 1.0,
      color: asset.metadata?.color || '#FFFFFF',
      rigidBodyType: RigidBodyType.DYNAMIC,
      mass: asset.metadata?.mass || 0.5,
      restitution: asset.metadata?.restitution || 0.4,
      friction: asset.metadata?.friction || 0.6,
      drag: 0.05,
      position,
      rotation: { x: 0, y: 0, z: 0 },
      semanticLabel: asset.metadata?.semanticLabel || asset.category || 'object',
      affordances: {
        graspable: isGraspable,
        manipulable: isManipulable,
        interactive: false
      },
      metadata: {
        assetId: asset.id,
        assetCategory: asset.category,
        sourceLibrary: true
      }
    };
  }

  /**
   * Tabletop layout: Objects arranged on a table surface
   */
  private static arrangeTabletop(scene: Scene, assets: Asset[], spacing: number): void {
    // Add table
    scene.objects.push({
      id: 'table',
      name: 'Table',
      type: 'primitive',
      shape: ShapeType.CUBE,
      scale: { x: 2, y: 0.1, z: 1.5 },
      color: '#8B4513',
      rigidBodyType: RigidBodyType.STATIC,
      mass: 100,
      restitution: 0.3,
      friction: 0.7,
      drag: 0.05,
      position: { x: 0, y: -0.6, z: 0 },
      semanticLabel: 'table',
      affordances: { graspable: false, manipulable: false, interactive: false }
    });

    // Arrange assets on table in rows
    const tableHeight = -0.5;
    const rowLength = 4;
    
    assets.forEach((asset, i) => {
      const row = Math.floor(i / rowLength);
      const col = i % rowLength;
      const x = (col - rowLength / 2) * spacing;
      const z = row * spacing;
      
      scene.objects.push(
        this.assetToSceneObject(asset, { x, y: tableHeight, z }, i)
      );
    });
  }

  /**
   * Warehouse shelf layout: Objects on shelves
   */
  private static arrangeWarehouseShelf(scene: Scene, assets: Asset[], spacing: number): void {
    // Add shelf structure
    scene.objects.push({
      id: 'shelf',
      name: 'Warehouse Shelf',
      type: 'primitive',
      shape: ShapeType.CUBE,
      scale: { x: 2, y: 1.5, z: 0.3 },
      color: '#8B4513',
      rigidBodyType: RigidBodyType.STATIC,
      mass: 200,
      restitution: 0.2,
      friction: 0.8,
      drag: 0.05,
      position: { x: 0, y: 0.2, z: -1 },
      semanticLabel: 'shelf',
      affordances: { graspable: false, manipulable: false, interactive: false }
    });

    // Place assets on shelf levels
    const shelfLevels = [0.3, 0.7, 1.1];
    const itemsPerLevel = Math.ceil(assets.length / shelfLevels.length);
    
    assets.forEach((asset, i) => {
      const level = Math.floor(i / itemsPerLevel);
      const posInLevel = i % itemsPerLevel;
      const x = (posInLevel - itemsPerLevel / 2) * spacing;
      const y = shelfLevels[level] || shelfLevels[0];
      const z = -0.9;
      
      scene.objects.push(
        this.assetToSceneObject(asset, { x, y, z }, i)
      );
    });
  }

  /**
   * Surgical table layout: Medical instruments arranged
   */
  private static arrangeSurgicalTable(scene: Scene, assets: Asset[], spacing: number): void {
    // Add operating table
    scene.objects.push({
      id: 'operating_table',
      name: 'Operating Table',
      type: 'primitive',
      shape: ShapeType.CUBE,
      scale: { x: 1.5, y: 0.1, z: 1 },
      color: '#C0C0C0',
      rigidBodyType: RigidBodyType.STATIC,
      mass: 150,
      restitution: 0.2,
      friction: 0.8,
      drag: 0.05,
      position: { x: 0, y: -0.5, z: 0 },
      semanticLabel: 'operating_table',
      affordances: { graspable: false, manipulable: false, interactive: false }
    });

    // Arrange instruments in organized rows
    const tableHeight = -0.4;
    assets.forEach((asset, i) => {
      const x = (i % 3 - 1) * spacing;
      const z = Math.floor(i / 3) * spacing * 0.5;
      
      scene.objects.push(
        this.assetToSceneObject(asset, { x, y: tableHeight, z }, i)
      );
    });
  }

  /**
   * Grid layout: Objects in a regular grid
   */
  private static arrangeGrid(scene: Scene, assets: Asset[], spacing: number): void {
    const gridSize = Math.ceil(Math.sqrt(assets.length));
    const startY = 0.5; // Start slightly above ground
    
    assets.forEach((asset, i) => {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      const x = (col - gridSize / 2) * spacing;
      const z = (row - gridSize / 2) * spacing;
      
      scene.objects.push(
        this.assetToSceneObject(asset, { x, y: startY, z }, i)
      );
    });
  }

  /**
   * Pile layout: Objects stacked and scattered (for clutter training)
   */
  private static arrangePile(scene: Scene, assets: Asset[], spacing: number): void {
    const radius = 1.0;
    
    assets.forEach((asset, i) => {
      const angle = (i / assets.length) * Math.PI * 2;
      const r = radius * (0.5 + Math.random() * 0.5);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = 0.5 + i * 0.2; // Stack vertically
      
      scene.objects.push(
        this.assetToSceneObject(asset, { x, y, z }, i)
      );
    });
  }

  /**
   * Quick assembly: Create scene from current asset library selection
   */
  static quickAssemble(assets: Asset[], layout: SceneAssemblyConfig['layout'] = 'tabletop'): Scene {
    if (assets.length === 0) {
      throw new Error('No assets provided for scene assembly');
    }

    return this.assembleFromAssets({
      assets,
      layout,
      includeGround: true,
      includeRobot: false,
      spacing: 0.3
    });
  }
}
