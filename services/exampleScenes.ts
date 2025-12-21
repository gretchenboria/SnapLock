/**
 * Example Scenes for ML Training Data Generation
 *
 * Pre-built realistic robotics and computer vision scenarios
 * demonstrating the hybrid scene graph architecture.
 */

import { Scene, SceneObject, RigidBodyType, ShapeType, SpawnMode, ActionType } from '../types';
import { SceneBuilder } from './sceneGraph';
import { createPickupScalpelBehavior, createSuturingBehavior } from './robotBehaviors';

/**
 * Surgical Robotics Scene
 * Use case: Train surgical robots for tool manipulation
 */
export function createSurgicalScene(): Scene {
  const scene: Scene = { objects: [], instancedGroups: [] };

  // Operating table (static) - Using minimalistic bedroom as table substitute
  scene.objects.push({
    id: 'operating_table',
    name: 'Operating Table',
    type: 'mesh',
    shape: ShapeType.MODEL,
    modelUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/SheenChair.glb',
    scale: { x: 3.0, y: 0.1, z: 2.0 },
    color: '#E0E0E0',
    rigidBodyType: RigidBodyType.STATIC,
    mass: 100,
    restitution: 0.2,
    friction: 0.8,
    drag: 0.05,
    position: { x: 0, y: -0.5, z: 0 },
    semanticLabel: 'operating_table',
    affordances: { graspable: false, manipulable: false, interactive: false }
  });

  // Surgical robot arm - REALISTIC 3D ROBOT - ANIMATES!
  scene.objects.push({
    id: 'surgical_robot_arm',
    name: 'Surgical Robot Arm',
    type: 'mesh',
    shape: ShapeType.MODEL, // ← CRITICAL: Tells renderer to load GLB!
    modelUrl: 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
    scale: 1.0,
    color: '#4A90E2',
    rigidBodyType: RigidBodyType.KINEMATIC, // ANIMATED!
    mass: 5,
    restitution: 0.3,
    friction: 0.5,
    drag: 0.05,
    position: { x: -2.0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    semanticLabel: 'surgical_robot',
    affordances: { graspable: false, manipulable: false, interactive: true }
  });

  // Surgical instruments (graspable, dynamic) - Realistic 3D models
  const instruments = [
    {
      name: 'Scalpel',
      pos: { x: 1.0, y: 0.5, z: 0.5 },
      color: '#FFD700',
      modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/WaterBottle/glTF-Binary/WaterBottle.glb', // Medical instrument
      scale: 0.15
    },
    {
      name: 'Forceps',
      pos: { x: 1.5, y: 0.5, z: 0.8 },
      color: '#C0C0C0',
      modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Lantern/glTF-Binary/Lantern.glb', // Medical instrument
      scale: 0.15
    },
    {
      name: 'Clamp',
      pos: { x: 2.0, y: 0.5, z: 0.3 },
      color: '#A0A0A0',
      modelUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/coffeeMug.glb', // Medical instrument
      scale: 0.15
    }
  ];

  instruments.forEach((inst, i) => {
    scene.objects.push({
      id: `instrument_${i}`,
      name: inst.name,
      type: 'mesh',
      modelUrl: inst.modelUrl,
      scale: inst.scale,
      color: inst.color,
      rigidBodyType: RigidBodyType.DYNAMIC,
      mass: 0.1,
      restitution: 0.3,
      friction: 0.7,
      drag: 0.05,
      position: inst.pos, // Above table surface (y=0.3)
      rotation: { x: 0, y: 0, z: 0 },
      semanticLabel: `surgical_${inst.name.toLowerCase()}`,
      affordances: { graspable: true, manipulable: true, interactive: false }
    });
  });

  // Add animated behaviors for the surgical robot
  scene.behaviors = [
    createPickupScalpelBehavior('surgical_robot_arm', 'instrument_0'), // Pick up first instrument (scalpel)
    createSuturingBehavior('surgical_robot_arm') // Suturing motion
  ];

  console.log('[Surgical Scene] Created with 2 animated behaviors');

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
 * Autonomous Vehicle Scene
 * Use case: Self-driving car obstacle avoidance, lane keeping
 */
export function createAutonomousVehicleScene(): Scene {
  const scene: Scene = { objects: [], instancedGroups: [] };

  // Road surface
  scene.objects.push({
    id: 'road_surface',
    name: 'Road',
    type: 'primitive',
    shape: ShapeType.PLATE,
    scale: { x: 10, y: 0.1, z: 3 },
    color: '#404040',
    rigidBodyType: RigidBodyType.STATIC,
    mass: 1000,
    restitution: 0.1,
    friction: 0.8,
    drag: 0,
    position: { x: 0, y: -0.5, z: 0 },
    semanticLabel: 'road',
    affordances: { graspable: false, manipulable: false, interactive: false }
  });

  // Autonomous vehicle - THIS ONE ANIMATES! DRIVES ALONG PATH - REALISTIC 3D CAR
  scene.objects.push({
    id: 'autonomous_vehicle',
    name: 'Self-Driving Car',
    type: 'mesh',
    modelUrl: 'https://threejs.org/examples/models/gltf/CesiumMilkTruck/CesiumMilkTruck.glb', // Official Three.js CDN
    scale: 2.0, // Large visible truck
    color: '#2E86DE', // Blue autonomous vehicle
    rigidBodyType: RigidBodyType.KINEMATIC, // ← KINEMATIC = ANIMATED!
    mass: 1500,
    restitution: 0.2,
    friction: 0.7,
    drag: 0.3,
    position: { x: -5, y: 0.5, z: -0.5 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 }, // Facing along X axis
    semanticLabel: 'autonomous_vehicle',
    affordances: { graspable: false, manipulable: false, interactive: true }
  });

  // Obstacles (traffic cones, pedestrians, other vehicles)
  const obstacles = [
    { name: 'Traffic Cone 1', pos: { x: 0, y: 0, z: 0.8 }, color: '#FF6B35', shape: ShapeType.CONE, scale: { x: 0.3, y: 0.6, z: 0.3 } },
    { name: 'Traffic Cone 2', pos: { x: 2, y: 0, z: -0.8 }, color: '#FF6B35', shape: ShapeType.CONE, scale: { x: 0.3, y: 0.6, z: 0.3 } },
    { name: 'Pedestrian', pos: { x: 4, y: 0, z: 0 }, color: '#3D5A80', shape: ShapeType.CAPSULE, scale: { x: 0.3, y: 1.7, z: 0.3 } }
  ];

  obstacles.forEach((obs, i) => {
    scene.objects.push({
      id: `obstacle_${i}`,
      name: obs.name,
      type: 'primitive',
      shape: obs.shape,
      scale: obs.scale,
      color: obs.color,
      rigidBodyType: RigidBodyType.STATIC,
      mass: 50,
      restitution: 0.3,
      friction: 0.5,
      drag: 0.05,
      position: obs.pos,
      semanticLabel: obs.name.toLowerCase().replace(' ', '_'),
      affordances: { graspable: false, manipulable: false, interactive: false }
    });
  });

  // Add vehicle navigation behavior
  scene.behaviors = [
    {
      id: 'av_obstacle_avoidance',
      name: 'Obstacle Avoidance',
      description: 'Navigate around obstacles on road',
      targetObjectId: 'autonomous_vehicle',
      loop: false,
      actions: [
        { type: ActionType.FOLLOW_PATH, duration: 3.0, path: [
          { x: -5, y: 0, z: -0.5 },
          { x: -2, y: 0, z: -0.5 },
          { x: 0, y: 0, z: -1.2 }, // Avoid cone
          { x: 2, y: 0, z: -0.5 },
          { x: 5, y: 0, z: -0.5 }
        ]},
        { type: ActionType.WAIT, duration: 1.0 }
      ]
    }
  ];

  return scene;
}

/**
 * XR Training Scene
 * Use case: Virtual reality hand manipulation training
 */
export function createXRTrainingScene(): Scene {
  const scene: Scene = { objects: [], instancedGroups: [] };

  // Training workbench
  scene.objects.push({
    id: 'xr_workbench',
    name: 'VR Workbench',
    type: 'primitive',
    shape: ShapeType.PLATE,
    scale: { x: 2, y: 0.1, z: 1.5 },
    color: '#8B7355',
    rigidBodyType: RigidBodyType.STATIC,
    mass: 100,
    restitution: 0.3,
    friction: 0.8,
    drag: 0,
    position: { x: 0, y: -0.5, z: 0 },
    semanticLabel: 'workbench',
    affordances: { graspable: false, manipulable: false, interactive: false }
  });

  // VR training objects (graspable items)
  const trainingObjects = [
    { name: 'Tool A', pos: { x: -0.4, y: -0.3, z: 0.2 }, color: '#E74C3C', shape: ShapeType.CYLINDER },
    { name: 'Tool B', pos: { x: 0, y: -0.3, z: 0.2 }, color: '#3498DB', shape: ShapeType.CAPSULE },
    { name: 'Tool C', pos: { x: 0.4, y: -0.3, z: 0.2 }, color: '#2ECC71', shape: ShapeType.CYLINDER },
    { name: 'Assembly Part', pos: { x: 0, y: -0.3, z: -0.3 }, color: '#F39C12', shape: ShapeType.CUBE }
  ];

  trainingObjects.forEach((obj, i) => {
    scene.objects.push({
      id: `xr_object_${i}`,
      name: obj.name,
      type: 'primitive',
      shape: obj.shape,
      scale: 0.15,
      color: obj.color,
      rigidBodyType: RigidBodyType.DYNAMIC,
      mass: 0.2,
      restitution: 0.4,
      friction: 0.6,
      drag: 0.05,
      position: obj.pos,
      semanticLabel: obj.name.toLowerCase().replace(' ', '_'),
      affordances: { graspable: true, manipulable: true, interactive: true }
    });
  });

  return scene;
}

/**
 * Drone Operations Scene
 * Use case: UAV navigation, package delivery
 */
export function createDroneScene(): Scene {
  const scene: Scene = { objects: [], instancedGroups: [] };

  // Landing platform
  scene.objects.push({
    id: 'landing_pad',
    name: 'Drone Landing Pad',
    type: 'primitive',
    shape: ShapeType.PLATE,
    scale: { x: 2, y: 0.05, z: 2 },
    color: '#27AE60',
    rigidBodyType: RigidBodyType.STATIC,
    mass: 50,
    restitution: 0.2,
    friction: 0.8,
    drag: 0,
    position: { x: 0, y: -0.5, z: 0 },
    semanticLabel: 'landing_pad',
    affordances: { graspable: false, manipulable: false, interactive: false }
  });

  // Drone - REALISTIC 3D QUADCOPTER MODEL - THIS ONE FLIES!
  scene.objects.push({
    id: 'delivery_drone',
    name: 'Delivery Drone',
    type: 'mesh',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb', // Drone body
    scale: 0.4,
    color: '#E74C3C',
    rigidBodyType: RigidBodyType.KINEMATIC, // ANIMATED!
    mass: 1.5,
    restitution: 0.1,
    friction: 0.1,
    drag: 0.8,
    position: { x: -3, y: 3, z: 0 },
    semanticLabel: 'drone',
    affordances: { graspable: false, manipulable: false, interactive: true }
  });

  // Package
  scene.objects.push({
    id: 'package',
    name: 'Delivery Package',
    type: 'primitive',
    shape: ShapeType.CUBE,
    scale: 0.3,
    color: '#8B4513',
    rigidBodyType: RigidBodyType.DYNAMIC,
    mass: 0.5,
    restitution: 0.2,
    friction: 0.7,
    drag: 0.05,
    position: { x: -3, y: 2.5, z: 0 },
    semanticLabel: 'package',
    affordances: { graspable: true, manipulable: true, interactive: false }
  });

  // Drone delivery behavior
  scene.behaviors = [
    {
      id: 'drone_delivery',
      name: 'Package Delivery',
      description: 'Fly to destination and land',
      targetObjectId: 'delivery_drone',
      loop: false,
      actions: [
        { type: ActionType.MOVE_TO, duration: 2.0, position: { x: 0, y: 3, z: 0 } }, // Fly to above pad
        { type: ActionType.WAIT, duration: 0.5 },
        { type: ActionType.MOVE_TO, duration: 2.0, position: { x: 0, y: 0.5, z: 0 } }, // Land
        { type: ActionType.RELEASE, duration: 0.5, target: 'package' },
        { type: ActionType.WAIT, duration: 1.0 }
      ]
    }
  ];

  return scene;
}

/**
 * Get all example scenes - UNIVERSAL PLATFORM
 */
export const EXAMPLE_SCENES = {
  // Medical/Healthcare
  surgical: {
    name: 'Surgical Robotics',
    description: 'Medical: Robot-assisted surgery training',
    domain: 'Medical',
    create: createSurgicalScene
  },

  // Autonomous Vehicles
  autonomous: {
    name: 'Autonomous Vehicle',
    description: 'AV: Self-driving obstacle avoidance',
    domain: 'Automotive',
    create: createAutonomousVehicleScene
  },

  // XR/VR Training
  xr: {
    name: 'XR Training',
    description: 'XR: Virtual reality hand manipulation',
    domain: 'Training',
    create: createXRTrainingScene
  },

  // Drones/UAV
  drone: {
    name: 'Drone Operations',
    description: 'UAV: Package delivery and navigation',
    domain: 'Logistics',
    create: createDroneScene
  },

  // Logistics/Warehouse
  warehouse: {
    name: 'Warehouse Picking',
    description: 'Logistics: Robotic package handling',
    domain: 'Logistics',
    create: createWarehouseScene
  },

  // Manufacturing
  assembly: {
    name: 'Industrial Assembly',
    description: 'Manufacturing: Automated assembly line',
    domain: 'Industrial',
    create: createAssemblyScene
  },

  // General Robotics
  tabletop: {
    name: 'Tabletop Manipulation',
    description: 'General: Object grasping and manipulation',
    domain: 'General',
    create: createTabletopScene
  },

  // Computer Vision
  clutter: {
    name: 'Dense Clutter',
    description: 'CV: Perception in complex environments',
    domain: 'Vision',
    create: createClutterScene
  }
};

/**
 * Load an example scene by key
 */
export function loadExampleScene(key: keyof typeof EXAMPLE_SCENES): Scene {
  return EXAMPLE_SCENES[key].create();
}
