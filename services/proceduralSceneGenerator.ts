import {
  PhysicsParams,
  AssetGroup,
  ShapeType,
  SpawnMode,
  MovementBehavior,
  JointConfig,
  JointType,
  Vector3Data
} from '../types';

export enum SceneTemplate {
  LOUNGE = 'LOUNGE',
  MEETING_ROOM = 'MEETING_ROOM',
  GAMING_ROOM = 'GAMING_ROOM',
  CREATIVE_STUDIO = 'CREATIVE_STUDIO',
  OPEN_WORLD = 'OPEN_WORLD'
}

export interface SceneGenerationConfig {
  template: SceneTemplate;
  roomSize?: 'small' | 'medium' | 'large';
  objectDensity?: 'sparse' | 'medium' | 'dense';
  colorTheme?: 'vibrant' | 'pastel' | 'neon' | 'natural';
  randomSeed?: number;
}

export class ProceduralSceneGenerator {
  private static generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  private static getColorFromTheme(theme: string, variant: 'primary' | 'secondary' | 'accent'): string {
    const themes: Record<string, Record<string, string>> = {
      vibrant: {
        primary: '#FF6B6B',
        secondary: '#4ECDC4',
        accent: '#FFE66D'
      },
      pastel: {
        primary: '#FFB3BA',
        secondary: '#BAE1FF',
        accent: '#FFFFBA'
      },
      neon: {
        primary: '#FF10F0',
        secondary: '#00FFD4',
        accent: '#FFFF00'
      },
      natural: {
        primary: '#8B4513',
        secondary: '#228B22',
        accent: '#87CEEB'
      }
    };

    return themes[theme]?.[variant] || themes.vibrant[variant];
  }

  private static getRoomDimensions(size: string): { width: number; depth: number; height: number } {
    const dimensions: Record<string, { width: number; depth: number; height: number }> = {
      small: { width: 4, depth: 4, height: 3 },
      medium: { width: 6, depth: 6, height: 3.5 },
      large: { width: 10, depth: 10, height: 4 }
    };

    return dimensions[size] || dimensions.medium;
  }

  /**
   * Generate a complete scene based on template
   */
  static generateScene(config: SceneGenerationConfig): PhysicsParams {
    const { template, roomSize = 'medium', objectDensity = 'medium', colorTheme = 'vibrant' } = config;

    let assetGroups: AssetGroup[] = [];
    let joints: JointConfig[] = [];

    switch (template) {
      case SceneTemplate.LOUNGE:
        ({ assetGroups, joints } = this.generateLounge(roomSize, objectDensity, colorTheme));
        break;
      case SceneTemplate.MEETING_ROOM:
        ({ assetGroups, joints } = this.generateMeetingRoom(roomSize, objectDensity, colorTheme));
        break;
      case SceneTemplate.GAMING_ROOM:
        ({ assetGroups, joints } = this.generateGamingRoom(roomSize, objectDensity, colorTheme));
        break;
      case SceneTemplate.CREATIVE_STUDIO:
        ({ assetGroups, joints } = this.generateCreativeStudio(roomSize, objectDensity, colorTheme));
        break;
      case SceneTemplate.OPEN_WORLD:
        ({ assetGroups, joints } = this.generateOpenWorld(roomSize, objectDensity, colorTheme));
        break;
      default:
        ({ assetGroups, joints } = this.generateLounge(roomSize, objectDensity, colorTheme));
    }

    return {
      gravity: { x: 0, y: -9.81, z: 0 },
      wind: { x: 0, y: 0, z: 0 },
      movementBehavior: MovementBehavior.PHYSICS_GRAVITY,
      assetGroups,
      joints
    };
  }

  /**
   * LOUNGE: Casual hangout space with seating, decorations (Slack-style chill room)
   */
  private static generateLounge(
    roomSize: string,
    density: string,
    theme: string
  ): { assetGroups: AssetGroup[]; joints: JointConfig[] } {
    const dim = this.getRoomDimensions(roomSize);
    const assetGroups: AssetGroup[] = [];
    const joints: JointConfig[] = [];

    const primaryColor = this.getColorFromTheme(theme, 'primary');
    const secondaryColor = this.getColorFromTheme(theme, 'secondary');
    const accentColor = this.getColorFromTheme(theme, 'accent');

    // Floor
    assetGroups.push({
      id: this.generateId('floor'),
      name: 'Floor',
      count: 1,
      shape: ShapeType.PLATE,
      color: '#A0A0A0',
      spawnMode: SpawnMode.GRID,
      scale: dim.width,
      restitution: 0.3,
      friction: 0.7,
      mass: 1000,
      drag: 0.1,
      spatialConstraint: { type: 'none' },
      semanticLabel: 'floor',
      vrRole: 'environment'
    });

    // Couch/Seating (Roblox-style blocky furniture)
    const couchCount = density === 'sparse' ? 1 : density === 'medium' ? 2 : 3;
    assetGroups.push({
      id: this.generateId('couch'),
      name: 'Couch',
      count: couchCount,
      shape: ShapeType.CUBE,
      color: primaryColor,
      spawnMode: SpawnMode.GRID,
      scale: 2.0,
      restitution: 0.2,
      friction: 0.8,
      mass: 50,
      drag: 0.3,
      spatialConstraint: { type: 'on_surface', parentGroupId: 'floor', maintainOrientation: true },
      affordances: {
        graspable: false,
        manipulable: false,
        interactive: false
      },
      semanticLabel: 'couch',
      vrRole: 'furniture'
    });

    // Coffee Table
    assetGroups.push({
      id: this.generateId('table'),
      name: 'Coffee Table',
      count: 1,
      shape: ShapeType.PLATE,
      color: secondaryColor,
      spawnMode: SpawnMode.GRID,
      scale: 1.5,
      restitution: 0.4,
      friction: 0.6,
      mass: 30,
      drag: 0.2,
      spatialConstraint: { type: 'on_surface', parentGroupId: 'floor', maintainOrientation: true },
      affordances: {
        graspable: false,
        manipulable: false,
        interactive: false
      },
      semanticLabel: 'table',
      vrRole: 'furniture'
    });

    // Decorative Spheres (floating orbs, Roblox aesthetic)
    const orbCount = density === 'sparse' ? 3 : density === 'medium' ? 6 : 10;
    assetGroups.push({
      id: this.generateId('orbs'),
      name: 'Floating Orbs',
      count: orbCount,
      shape: ShapeType.SPHERE,
      color: accentColor,
      spawnMode: SpawnMode.FLOAT,
      scale: 0.3,
      restitution: 0.8,
      friction: 0.2,
      mass: 0.5,
      drag: 0.1,
      affordances: {
        graspable: true,
        manipulable: true,
        interactive: false,
        graspPoints: [{ x: 0, y: 0, z: 0 }]
      },
      semanticLabel: 'decorative_orb',
      vrRole: 'target'
    });

    // Graspable Cubes (interactive objects)
    const cubeCount = density === 'sparse' ? 5 : density === 'medium' ? 10 : 15;
    assetGroups.push({
      id: this.generateId('cubes'),
      name: 'Interactive Cubes',
      count: cubeCount,
      shape: ShapeType.CUBE,
      color: primaryColor,
      spawnMode: SpawnMode.PILE,
      scale: 0.5,
      restitution: 0.5,
      friction: 0.5,
      mass: 2,
      drag: 0.05,
      spatialConstraint: { type: 'on_surface', parentGroupId: 'table' },
      affordances: {
        graspable: true,
        manipulable: true,
        interactive: false,
        graspPoints: [
          { x: 0, y: 0.25, z: 0 },
          { x: 0, y: -0.25, z: 0 }
        ]
      },
      semanticLabel: 'interactive_cube',
      vrRole: 'target'
    });

    return { assetGroups, joints };
  }

  /**
   * MEETING_ROOM: Conference/collaboration space
   */
  private static generateMeetingRoom(
    roomSize: string,
    density: string,
    theme: string
  ): { assetGroups: AssetGroup[]; joints: JointConfig[] } {
    const dim = this.getRoomDimensions(roomSize);
    const assetGroups: AssetGroup[] = [];
    const joints: JointConfig[] = [];

    const primaryColor = this.getColorFromTheme(theme, 'primary');
    const secondaryColor = this.getColorFromTheme(theme, 'secondary');

    // Floor
    assetGroups.push({
      id: this.generateId('floor'),
      name: 'Floor',
      count: 1,
      shape: ShapeType.PLATE,
      color: '#CCCCCC',
      spawnMode: SpawnMode.GRID,
      scale: dim.width,
      restitution: 0.3,
      friction: 0.7,
      mass: 1000,
      drag: 0.1,
      semanticLabel: 'floor',
      vrRole: 'environment'
    });

    // Conference Table
    assetGroups.push({
      id: this.generateId('conference_table'),
      name: 'Conference Table',
      count: 1,
      shape: ShapeType.PLATE,
      color: secondaryColor,
      spawnMode: SpawnMode.GRID,
      scale: 2.5,
      restitution: 0.4,
      friction: 0.6,
      mass: 100,
      drag: 0.2,
      spatialConstraint: { type: 'on_surface', parentGroupId: 'floor', maintainOrientation: true },
      semanticLabel: 'conference_table',
      vrRole: 'furniture'
    });

    // Chairs
    const chairCount = density === 'sparse' ? 4 : density === 'medium' ? 8 : 12;
    assetGroups.push({
      id: this.generateId('chairs'),
      name: 'Chairs',
      count: chairCount,
      shape: ShapeType.CUBE,
      color: primaryColor,
      spawnMode: SpawnMode.GRID,
      scale: 0.8,
      restitution: 0.3,
      friction: 0.7,
      mass: 10,
      drag: 0.2,
      spatialConstraint: { type: 'on_surface', parentGroupId: 'floor' },
      semanticLabel: 'chair',
      vrRole: 'furniture'
    });

    // Whiteboard Markers (graspable)
    assetGroups.push({
      id: this.generateId('markers'),
      name: 'Markers',
      count: 6,
      shape: ShapeType.CYLINDER,
      color: '#000000',
      spawnMode: SpawnMode.PILE,
      scale: 0.2,
      restitution: 0.4,
      friction: 0.5,
      mass: 0.3,
      drag: 0.05,
      spatialConstraint: { type: 'on_surface', parentGroupId: 'conference_table' },
      affordances: {
        graspable: true,
        manipulable: true,
        interactive: false,
        graspPoints: [{ x: 0, y: 0, z: 0 }]
      },
      semanticLabel: 'marker',
      vrRole: 'tool'
    });

    return { assetGroups, joints };
  }

  /**
   * GAMING_ROOM: Arcade/gaming lounge
   */
  private static generateGamingRoom(
    roomSize: string,
    density: string,
    theme: string
  ): { assetGroups: AssetGroup[]; joints: JointConfig[] } {
    const dim = this.getRoomDimensions(roomSize);
    const assetGroups: AssetGroup[] = [];
    const joints: JointConfig[] = [];

    const neonColors = ['#FF10F0', '#00FFD4', '#FFFF00', '#FF0080', '#00FF00'];

    // Floor (dark)
    assetGroups.push({
      id: this.generateId('floor'),
      name: 'Floor',
      count: 1,
      shape: ShapeType.PLATE,
      color: '#202020',
      spawnMode: SpawnMode.GRID,
      scale: dim.width,
      restitution: 0.3,
      friction: 0.7,
      mass: 1000,
      drag: 0.1,
      semanticLabel: 'floor',
      vrRole: 'environment'
    });

    // Arcade Cabinets (blocky Roblox style)
    const arcadeCount = density === 'sparse' ? 2 : density === 'medium' ? 4 : 6;
    assetGroups.push({
      id: this.generateId('arcade'),
      name: 'Arcade Cabinets',
      count: arcadeCount,
      shape: ShapeType.CUBE,
      color: neonColors[0],
      spawnMode: SpawnMode.GRID,
      scale: 1.5,
      restitution: 0.2,
      friction: 0.8,
      mass: 80,
      drag: 0.3,
      spatialConstraint: { type: 'on_surface', parentGroupId: 'floor' },
      semanticLabel: 'arcade_cabinet',
      vrRole: 'furniture'
    });

    // Neon Spheres (bouncing balls)
    const ballCount = density === 'sparse' ? 10 : density === 'medium' ? 20 : 30;
    assetGroups.push({
      id: this.generateId('neon_balls'),
      name: 'Neon Balls',
      count: ballCount,
      shape: ShapeType.SPHERE,
      color: neonColors[1],
      spawnMode: SpawnMode.BLAST,
      scale: 0.4,
      restitution: 0.9,
      friction: 0.1,
      mass: 1,
      drag: 0.02,
      affordances: {
        graspable: true,
        manipulable: true,
        interactive: false,
        graspPoints: [{ x: 0, y: 0, z: 0 }]
      },
      semanticLabel: 'neon_ball',
      vrRole: 'target'
    });

    // Gaming Seats
    assetGroups.push({
      id: this.generateId('gaming_seats'),
      name: 'Gaming Seats',
      count: arcadeCount,
      shape: ShapeType.CYLINDER,
      color: neonColors[2],
      spawnMode: SpawnMode.GRID,
      scale: 0.8,
      restitution: 0.3,
      friction: 0.7,
      mass: 15,
      drag: 0.2,
      spatialConstraint: { type: 'on_surface', parentGroupId: 'floor' },
      semanticLabel: 'gaming_seat',
      vrRole: 'furniture'
    });

    return { assetGroups, joints };
  }

  /**
   * CREATIVE_STUDIO: Art/maker space
   */
  private static generateCreativeStudio(
    roomSize: string,
    density: string,
    theme: string
  ): { assetGroups: AssetGroup[]; joints: JointConfig[] } {
    const dim = this.getRoomDimensions(roomSize);
    const assetGroups: AssetGroup[] = [];
    const joints: JointConfig[] = [];

    const pastelColors = ['#FFB3BA', '#BAE1FF', '#FFFFBA', '#BAFFC9', '#FFD4BA'];

    // Floor
    assetGroups.push({
      id: this.generateId('floor'),
      name: 'Floor',
      count: 1,
      shape: ShapeType.PLATE,
      color: '#F0F0F0',
      spawnMode: SpawnMode.GRID,
      scale: dim.width,
      restitution: 0.3,
      friction: 0.7,
      mass: 1000,
      drag: 0.1,
      semanticLabel: 'floor',
      vrRole: 'environment'
    });

    // Work Tables
    const tableCount = density === 'sparse' ? 2 : density === 'medium' ? 4 : 6;
    assetGroups.push({
      id: this.generateId('work_tables'),
      name: 'Work Tables',
      count: tableCount,
      shape: ShapeType.PLATE,
      color: pastelColors[1],
      spawnMode: SpawnMode.GRID,
      scale: 2.0,
      restitution: 0.4,
      friction: 0.6,
      mass: 40,
      drag: 0.2,
      spatialConstraint: { type: 'on_surface', parentGroupId: 'floor' },
      semanticLabel: 'work_table',
      vrRole: 'furniture'
    });

    // Art Supplies (graspable objects)
    const supplyCount = density === 'sparse' ? 15 : density === 'medium' ? 30 : 50;
    assetGroups.push({
      id: this.generateId('art_supplies'),
      name: 'Art Supplies',
      count: supplyCount,
      shape: ShapeType.CYLINDER,
      color: pastelColors[0],
      spawnMode: SpawnMode.PILE,
      scale: 0.3,
      restitution: 0.5,
      friction: 0.5,
      mass: 0.5,
      drag: 0.05,
      spatialConstraint: { type: 'on_surface', parentGroupId: 'work_tables' },
      affordances: {
        graspable: true,
        manipulable: true,
        interactive: false,
        graspPoints: [{ x: 0, y: 0.15, z: 0 }]
      },
      semanticLabel: 'art_supply',
      vrRole: 'tool'
    });

    // Colorful Blocks (Minecraft-style building blocks)
    const blockCount = density === 'sparse' ? 20 : density === 'medium' ? 40 : 60;
    pastelColors.forEach((color, idx) => {
      assetGroups.push({
        id: this.generateId(`blocks_${idx}`),
        name: `Building Blocks ${idx}`,
        count: Math.floor(blockCount / pastelColors.length),
        shape: ShapeType.CUBE,
        color: color,
        spawnMode: SpawnMode.GRID,
        scale: 0.5,
        restitution: 0.4,
        friction: 0.6,
        mass: 1.5,
        drag: 0.05,
        spatialConstraint: { type: 'on_surface', parentGroupId: 'work_tables' },
        affordances: {
          graspable: true,
          manipulable: true,
          interactive: false,
          graspPoints: [
            { x: 0, y: 0.25, z: 0 },
            { x: 0, y: -0.25, z: 0 }
          ]
        },
        semanticLabel: 'building_block',
        vrRole: 'target'
      });
    });

    return { assetGroups, joints };
  }

  /**
   * OPEN_WORLD: Minecraft-style open terrain
   */
  private static generateOpenWorld(
    roomSize: string,
    density: string,
    theme: string
  ): { assetGroups: AssetGroup[]; joints: JointConfig[] } {
    const dim = this.getRoomDimensions(roomSize);
    const assetGroups: AssetGroup[] = [];
    const joints: JointConfig[] = [];

    // Grass Floor (large)
    assetGroups.push({
      id: this.generateId('grass'),
      name: 'Grass Floor',
      count: 1,
      shape: ShapeType.PLATE,
      color: '#228B22',
      spawnMode: SpawnMode.GRID,
      scale: dim.width * 1.5,
      restitution: 0.3,
      friction: 0.7,
      mass: 2000,
      drag: 0.1,
      semanticLabel: 'grass',
      vrRole: 'environment'
    });

    // Trees (Minecraft blocky style)
    const treeCount = density === 'sparse' ? 5 : density === 'medium' ? 10 : 15;
    assetGroups.push({
      id: this.generateId('trees'),
      name: 'Trees',
      count: treeCount,
      shape: ShapeType.CYLINDER,
      color: '#8B4513',
      spawnMode: SpawnMode.GRID,
      scale: 1.5,
      restitution: 0.2,
      friction: 0.9,
      mass: 100,
      drag: 0.3,
      spatialConstraint: { type: 'on_surface', parentGroupId: 'grass' },
      semanticLabel: 'tree',
      vrRole: 'obstacle'
    });

    // Rocks (graspable)
    const rockCount = density === 'sparse' ? 10 : density === 'medium' ? 20 : 30;
    assetGroups.push({
      id: this.generateId('rocks'),
      name: 'Rocks',
      count: rockCount,
      shape: ShapeType.ICOSAHEDRON,
      color: '#808080',
      spawnMode: SpawnMode.PILE,
      scale: 0.6,
      restitution: 0.6,
      friction: 0.7,
      mass: 5,
      drag: 0.05,
      spatialConstraint: { type: 'on_surface', parentGroupId: 'grass' },
      affordances: {
        graspable: true,
        manipulable: true,
        interactive: false,
        graspPoints: [{ x: 0, y: 0, z: 0 }]
      },
      semanticLabel: 'rock',
      vrRole: 'target'
    });

    // Crystals (collectibles)
    const crystalCount = density === 'sparse' ? 8 : density === 'medium' ? 15 : 25;
    assetGroups.push({
      id: this.generateId('crystals'),
      name: 'Crystals',
      count: crystalCount,
      shape: ShapeType.PYRAMID,
      color: '#00FFFF',
      spawnMode: SpawnMode.FLOAT,
      scale: 0.4,
      restitution: 0.8,
      friction: 0.2,
      mass: 0.8,
      drag: 0.03,
      affordances: {
        graspable: true,
        manipulable: true,
        interactive: false,
        graspPoints: [{ x: 0, y: 0, z: 0 }]
      },
      semanticLabel: 'crystal',
      vrRole: 'target'
    });

    return { assetGroups, joints };
  }
}
