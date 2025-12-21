/**
 * Scene Assembler
 * 
 * Auto-assembles physics scenes from Asset Library models
 * instead of generating primitives from AI prompts.
 */

import { Scene, SceneObject, RigidBodyType, ShapeType, Vector3Data } from '../types';

export interface Asset {
  id: string;
  name: string;
  path?: string;
  url?: string;  // URL to 3D model (GLB/GLTF)
  geometry?: string;  // For procedural primitives
  category: string;
  physics_enabled?: boolean;
  mass?: number;
  friction?: number;
  restitution?: number;
  thumbnail?: string;
  tags?: string[];
  metadata?: {
    scale?: number;
    color?: string;
    graspable?: boolean;
    manipulable?: boolean;
    semanticLabel?: string;
    [key: string]: any;
  };
}

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

    // Validate assets
    if (!assets || assets.length === 0) {
      console.warn('[SceneAssembler] No assets provided');
      return scene;
    }

    console.log(`[SceneAssembler] Assembling scene with ${assets.length} assets in ${layout} layout`);

    // Add ground surface
    if (includeGround) {
      scene.objects.push(this.createGroundPlane());
    }

    // Add robot if requested
    if (includeRobot) {
      scene.objects.push(this.createRobotArm({ x: -1, y: 0, z: 0 }));
    }

    // Arrange assets based on layout
    try {
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

      console.log(`[SceneAssembler] Created scene with ${scene.objects.length} objects`);
    } catch (error) {
      console.error('[SceneAssembler] Error arranging assets:', error);
      throw new Error(`Scene assembly failed: ${(error as Error).message}`);
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
   * Convert asset to scene object with safe defaults
   */
  private static assetToSceneObject(
    asset: Asset,
    position: Vector3Data,
    index: number
  ): SceneObject {
    // Validate and sanitize asset data
    const safeMass = this.validateNumber(asset.mass || asset.metadata?.mass, 0.1, 100, 0.5);
    const safeRestitution = this.validateNumber(asset.restitution || asset.metadata?.restitution, 0, 1, 0.4);
    const safeFriction = this.validateNumber(asset.friction || asset.metadata?.friction, 0, 1, 0.6);
    const safeScale = this.validateNumber(asset.metadata?.scale, 0.01, 10, 0.15);

    // Determine if object is graspable based on asset metadata
    const isGraspable = asset.metadata?.graspable !== false;
    const isManipulable = asset.metadata?.manipulable !== false;

    // For now, always use primitives since mesh loading might not be set up
    // Use geometry if specified, otherwise default to cube
    const shape = this.getShapeFromGeometry(asset.geometry);

    return {
      id: `asset_${asset.id}_${index}`,
      name: asset.name || 'Unknown Asset',
      type: 'primitive',  // Use primitives for now to avoid mesh loading issues
      shape: shape,
      scale: safeScale,
      color: asset.metadata?.color || this.getRandomColor(),
      rigidBodyType: RigidBodyType.DYNAMIC,
      mass: safeMass,
      restitution: safeRestitution,
      friction: safeFriction,
      drag: 0.05,
      position: { ...position },  // Clone to avoid reference issues
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
   * Validate numeric value with safe bounds
   */
  private static validateNumber(value: any, min: number, max: number, defaultValue: number): number {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num) || !isFinite(num)) return defaultValue;
    return Math.max(min, Math.min(max, num));
  }

  /**
   * Map geometry string to ShapeType safely
   */
  private static getShapeFromGeometry(geometry: string | undefined): ShapeType {
    if (!geometry || typeof geometry !== 'string') {
      return ShapeType.CUBE;  // Safe default
    }

    const geometryMap: Record<string, ShapeType> = {
      'sphere': ShapeType.SPHERE,
      'ball': ShapeType.SPHERE,
      'box': ShapeType.CUBE,
      'cube': ShapeType.CUBE,
      'cylinder': ShapeType.CYLINDER,
      'cone': ShapeType.CONE,
      'capsule': ShapeType.CAPSULE,
      'pyramid': ShapeType.PYRAMID
    };

    const normalized = geometry.toLowerCase().trim();
    return geometryMap[normalized] || ShapeType.CUBE;
  }

  /**
   * Generate random color for variety
   */
  private static getRandomColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    return colors[Math.floor(Math.random() * colors.length)];
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
