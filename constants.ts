import { PhysicsParams, SimulationMode, SpawnMode, ShapeType, MovementBehavior } from './types';

export const DEFAULT_PHYSICS: PhysicsParams = {
  gravity: { x: 0, y: -9.81, z: 0 },
  wind: { x: 0, y: 0, z: 0 },
  particleCount: 500,
  particleSize: 0.25,
  
  // Standard Concrete/Plastic values
  restitution: 0.5, 
  friction: 0.5,
  mass: 1.0,
  drag: 0.01,

  spawnMode: SpawnMode.PILE,
  shape: ShapeType.CUBE,
  movementBehavior: MovementBehavior.PHYSICS_GRAVITY,
  color: '#22d3ee',
  spread: 4,
};

export const SAMPLE_PROMPTS = [
  "A glass jar exploding into shards",
  "A swarm of drones orbiting a central tower",
  "Heavy concrete blocks falling on ice",
  "Rubber balls bouncing in a wind tunnel",
  "Floating data packets in a sine wave"
];