
import { PhysicsParams, SpawnMode, ShapeType, MovementBehavior, MaterialPreset } from './types';

export const DEFAULT_PHYSICS: PhysicsParams = {
  gravity: { x: 0, y: -9.81, z: 0 },
  wind: { x: 0, y: 0, z: 0 },
  movementBehavior: MovementBehavior.PHYSICS_GRAVITY,
  assetGroups: [
    {
      id: 'starter_group',
      name: 'Starter Group',
      count: 0,
      shape: ShapeType.SPHERE,
      color: '#22d3ee',
      spawnMode: SpawnMode.GRID,
      scale: 1.0,
      mass: 1.0,
      restitution: 0.5,
      friction: 0.5,
      drag: 0.05
    }
  ]
};

export const DEFAULT_MATERIAL_PRESETS: MaterialPreset[] = [
  { id: 'preset_rubber', name: 'High Bounce Rubber', restitution: 0.95, friction: 0.9, mass: 2.0, drag: 0.05 },
  { id: 'preset_metal', name: 'Heavy Steel', restitution: 0.2, friction: 0.6, mass: 25.0, drag: 0.01 },
  { id: 'preset_ice', name: 'Slippery Ice', restitution: 0.1, friction: 0.01, mass: 5.0, drag: 0.0 },
  { id: 'preset_wood', name: 'Polished Wood', restitution: 0.4, friction: 0.5, mass: 4.0, drag: 0.05 },
  { id: 'preset_foam', name: 'Styrofoam', restitution: 0.6, friction: 1.0, mass: 0.2, drag: 0.15 },
  { id: 'preset_concrete', name: 'Concrete', restitution: 0.1, friction: 0.9, mass: 10.0, drag: 0.02 },
];

export const SAMPLE_PROMPTS = [
  "Simulate a LIDAR scan of drone debris in zero gravity",
  "Robotic arm collision test with industrial crates",
  "Autonomous vehicle sensor noise with falling rocks",
  "Swarm logic failure causing orbital decay",
  "Warehouse logistics overflow with varying friction"
];