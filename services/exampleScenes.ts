/**
 * Example Scenes for ML Training Data Generation
 *
 * Pre-built realistic robotics and computer vision scenarios
 * demonstrating the hybrid scene graph architecture.
 */

import { Scene, SceneObject, RigidBodyType, ShapeType, SpawnMode } from '../types';
import { SceneBuilder } from './sceneGraph';

/**
 * Surgical Robotics Scene
 * Use case: Train surgical robots for tool manipulation
 */
export function createSurgicalScene(): Scene {
  const scene: Scene = { objects: [], instancedGroups: [] };

  // Operating table (static)
  scene.objects.push({
    id: 'operating_table',
    name: 'Operating Table',
    type: 'primitive',
    shape: ShapeType.CUBE,
    scale: { x: 1.5, y: 0.1, z: 1 },
    color: '#C0C0C0',
    rigidBodyType: RigidBodyType.STATIC,
    mass: 100,
    restitution: 0.2,
    friction: 0.8,
    drag: 0.05,
    position: { x: 0, y: -0.5, z: 0 },
    semanticLabel: 'operating_table',
    affordances: { graspable: false, manipulable: false, interactive: false }
  });

  // Surgical robot arm (kinematic)
  scene.objects.push({
    id: 'surgical_robot_arm',
    name: 'Surgical Robot Arm',
    type: 'primitive',
    shape: ShapeType.CYLINDER,
    scale: { x: 0.05, y: 0.6, z: 0.05 },
    color: '#4A90E2',
    rigidBodyType: RigidBodyType.KINEMATIC,
    mass: 5,
    restitution: 0.3,
    friction: 0.5,
    drag: 0.05,
    position: { x: -0.8, y: 0.3, z: -0.4 },
    rotation: { x: 0, y: 0, z: Math.PI / 6 },
    semanticLabel: 'surgical_robot',
    affordances: { graspable: false, manipulable: false, interactive: true }
  });

  // Surgical instruments (graspable, dynamic)
  const instruments = [
    { name: 'Scalpel', pos: { x: 0.2, y: -0.4, z: 0.1 }, color: '#B0B0B0' },
    { name: 'Forceps', pos: { x: 0.3, y: -0.4, z: 0.15 }, color: '#A0A0A0' },
    { name: 'Clamp', pos: { x: 0.4, y: -0.4, z: 0.05 }, color: '#909090' }
  ];

  instruments.forEach((inst, i) => {
    scene.objects.push({
      id: `instrument_${i}`,
      name: inst.name,
      type: 'primitive',
      shape: ShapeType.CYLINDER,
      scale: { x: 0.01, y: 0.15, z: 0.01 },
      color: inst.color,
      rigidBodyType: RigidBodyType.DYNAMIC,
      mass: 0.1,
      restitution: 0.3,
      friction: 0.7,
      drag: 0.05,
      position: inst.pos,
      rotation: { x: 0, y: 0, z: Math.PI / 2 },
      semanticLabel: `surgical_${inst.name.toLowerCase()}`,
      affordances: { graspable: true, manipulable: true, interactive: false }
    });
  });

  return scene;
}

/**
 * Warehouse Picking Scene
 * Use case: Train robots for package manipulation in warehouses
 */
export function createWarehouseScene(): Scene {
  const scene: Scene = { objects: [], instancedGroups: [] };

  // Warehouse shelf (static)
  scene.objects.push({
    id: 'warehouse_shelf',
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

  // Robot manipulator (kinematic)
  scene.objects.push({
    id: 'warehouse_robot',
    name: 'Warehouse Robot',
    type: 'primitive',
    shape: ShapeType.CUBE,
    scale: { x: 0.3, y: 0.4, z: 0.3 },
    color: '#FF6B1A',
    rigidBodyType: RigidBodyType.KINEMATIC,
    mass: 50,
    restitution: 0.3,
    friction: 0.5,
    drag: 0.05,
    position: { x: 0, y: -0.3, z: 0.5 },
    semanticLabel: 'warehouse_robot',
    affordances: { graspable: false, manipulable: false, interactive: true }
  });

  // Packages (graspable, dynamic)
  const packages = [
    { size: 0.2, pos: { x: -0.5, y: 0.5, z: -0.9 }, color: '#8B4513' },
    { size: 0.15, pos: { x: 0, y: 0.5, z: -0.9 }, color: '#CD853F' },
    { size: 0.18, pos: { x: 0.5, y: 0.5, z: -0.9 }, color: '#D2691E' },
    { size: 0.16, pos: { x: -0.3, y: 0.8, z: -0.9 }, color: '#A0522D' }
  ];

  packages.forEach((pkg, i) => {
    scene.objects.push({
      id: `package_${i}`,
      name: `Package ${i + 1}`,
      type: 'primitive',
      shape: ShapeType.CUBE,
      scale: pkg.size,
      color: pkg.color,
      rigidBodyType: RigidBodyType.DYNAMIC,
      mass: 0.5,
      restitution: 0.3,
      friction: 0.6,
      drag: 0.05,
      position: pkg.pos,
      semanticLabel: 'package',
      affordances: { graspable: true, manipulable: true, interactive: false }
    });
  });

  return scene;
}

/**
 * Industrial Assembly Scene
 * Use case: Train robots for precision assembly tasks
 */
export function createAssemblyScene(): Scene {
  const scene: Scene = { objects: [], instancedGroups: [] };

  // Assembly workbench (static)
  scene.objects.push({
    id: 'workbench',
    name: 'Assembly Workbench',
    type: 'primitive',
    shape: ShapeType.CUBE,
    scale: { x: 1.5, y: 0.1, z: 1 },
    color: '#696969',
    rigidBodyType: RigidBodyType.STATIC,
    mass: 150,
    restitution: 0.2,
    friction: 0.8,
    drag: 0.05,
    position: { x: 0, y: -0.6, z: 0 },
    semanticLabel: 'workbench',
    affordances: { graspable: false, manipulable: false, interactive: false }
  });

  // Industrial robot arm (kinematic)
  scene.objects.push({
    id: 'industrial_robot',
    name: 'Industrial Robot Arm',
    type: 'primitive',
    shape: ShapeType.CYLINDER,
    scale: { x: 0.08, y: 0.8, z: 0.08 },
    color: '#FFD700',
    rigidBodyType: RigidBodyType.KINEMATIC,
    mass: 15,
    restitution: 0.3,
    friction: 0.5,
    drag: 0.05,
    position: { x: -0.6, y: 0.1, z: -0.3 },
    semanticLabel: 'industrial_robot',
    affordances: { graspable: false, manipulable: false, interactive: true }
  });

  // Assembly parts (various shapes, dynamic)
  const parts = [
    { shape: ShapeType.CUBE, size: 0.1, pos: { x: 0.2, y: -0.5, z: 0.1 }, label: 'base_plate', color: '#4169E1' },
    { shape: ShapeType.CYLINDER, size: 0.08, pos: { x: 0.3, y: -0.5, z: 0.15 }, label: 'shaft', color: '#C0C0C0' },
    { shape: ShapeType.SPHERE, size: 0.06, pos: { x: 0.4, y: -0.5, z: 0.05 }, label: 'bearing', color: '#808080' },
    { shape: ShapeType.CUBE, size: 0.12, pos: { x: 0.15, y: -0.5, z: -0.1 }, label: 'housing', color: '#2F4F4F' }
  ];

  parts.forEach((part, i) => {
    scene.objects.push({
      id: `part_${i}`,
      name: part.label,
      type: 'primitive',
      shape: part.shape,
      scale: part.size,
      color: part.color,
      rigidBodyType: RigidBodyType.DYNAMIC,
      mass: 0.3,
      restitution: 0.4,
      friction: 0.6,
      drag: 0.05,
      position: part.pos,
      semanticLabel: part.label,
      affordances: { graspable: true, manipulable: true, interactive: false }
    });
  });

  return scene;
}

/**
 * Tabletop Manipulation Scene
 * Use case: General-purpose grasping and manipulation training
 */
export function createTabletopScene(): Scene {
  return new SceneBuilder()
    .addTable({ x: 0, y: -0.6, z: 0 })
    .addRobot({ x: -0.7, y: 0, z: 0 })
    .addGraspableObject(ShapeType.CUBE, { x: 0.2, y: -0.5, z: 0.1 }, 'cube')
    .addGraspableObject(ShapeType.SPHERE, { x: 0.3, y: -0.5, z: 0.15 }, 'sphere')
    .addGraspableObject(ShapeType.CYLINDER, { x: 0.4, y: -0.5, z: 0.05 }, 'cylinder')
    .addGraspableObject(ShapeType.CONE, { x: 0.15, y: -0.5, z: -0.1 }, 'cone')
    .build();
}

/**
 * Dense Clutter Scene
 * Use case: Train perception and grasping in cluttered environments
 */
export function createClutterScene(): Scene {
  const scene = new SceneBuilder()
    .addTable({ x: 0, y: -0.6, z: 0 })
    .addRobot({ x: -0.8, y: 0, z: 0 })
    .build();

  // Add many small objects in a pile
  const shapes = [ShapeType.CUBE, ShapeType.SPHERE, ShapeType.CYLINDER, ShapeType.CONE];
  for (let i = 0; i < 15; i++) {
    const angle = (i / 15) * Math.PI * 2;
    const radius = 0.3 + Math.random() * 0.2;
    scene.objects.push({
      id: `clutter_${i}`,
      name: `Object ${i}`,
      type: 'primitive',
      shape: shapes[i % shapes.length],
      scale: 0.08 + Math.random() * 0.05,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      rigidBodyType: RigidBodyType.DYNAMIC,
      mass: 0.2,
      restitution: 0.4,
      friction: 0.6,
      drag: 0.05,
      position: {
        x: Math.cos(angle) * radius,
        y: -0.5 + i * 0.15,
        z: Math.sin(angle) * radius
      },
      semanticLabel: shapes[i % shapes.length].toLowerCase(),
      affordances: { graspable: true, manipulable: true, interactive: false }
    });
  }

  return scene;
}

/**
 * Get all example scenes
 */
export const EXAMPLE_SCENES = {
  surgical: {
    name: 'Surgical Robotics',
    description: 'Operating room with surgical robot and instruments',
    create: createSurgicalScene
  },
  warehouse: {
    name: 'Warehouse Picking',
    description: 'Warehouse shelf with packages for robot picking',
    create: createWarehouseScene
  },
  assembly: {
    name: 'Industrial Assembly',
    description: 'Assembly workbench with robot and parts',
    create: createAssemblyScene
  },
  tabletop: {
    name: 'Tabletop Manipulation',
    description: 'Simple grasping scene with various objects',
    create: createTabletopScene
  },
  clutter: {
    name: 'Dense Clutter',
    description: 'Cluttered scene for perception training',
    create: createClutterScene
  }
};

/**
 * Load an example scene by key
 */
export function loadExampleScene(key: keyof typeof EXAMPLE_SCENES): Scene {
  return EXAMPLE_SCENES[key].create();
}
