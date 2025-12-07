
import { PhysicsParams, SpawnMode, ShapeType, MovementBehavior } from './types';

export const DEFAULT_PHYSICS: PhysicsParams = {
  gravity: { x: 0, y: -9.81, z: 0 },
  wind: { x: 0, y: 0, z: 0 },
  movementBehavior: MovementBehavior.PHYSICS_GRAVITY,
  assetGroups: [
    {
      id: 'default_1',
      name: 'Calibration Debris',
      count: 200,
      shape: ShapeType.CUBE,
      color: '#22d3ee',
      spawnMode: SpawnMode.PILE,
      scale: 0.25,
      mass: 1.0,
      restitution: 0.5,
      friction: 0.5,
      drag: 0.01
    }
  ]
};

export const SAMPLE_PROMPTS = [
  "Simulate a LIDAR scan of drone debris in zero gravity",
  "Robotic arm collision test with industrial crates",
  "Autonomous vehicle sensor noise with falling rocks",
  "Swarm logic failure causing orbital decay",
  "Warehouse logistics overflow with varying friction"
];
