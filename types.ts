export enum SimulationMode {
  GENERAL = 'GENERAL',
  ROBOTICS = 'ROBOTICS',
  LIDAR = 'LIDAR',
  VR = 'VR'
}

export enum SpawnMode {
  PILE = 'PILE',
  BLAST = 'BLAST',
  JET = 'JET',
  FLOAT = 'FLOAT',
  GRID = 'GRID'
}

export enum MovementBehavior {
  PHYSICS_GRAVITY = 'PHYSICS_GRAVITY', // Standard Newtonian
  ORBITAL = 'ORBITAL',                 // Satellites, Atoms
  SWARM_FLOCK = 'SWARM_FLOCK',         // Birds, Drones
  SINUSOIDAL_WAVE = 'SINUSOIDAL_WAVE', // Water, Data streams
  RADIAL_EXPLOSION = 'RADIAL_EXPLOSION', // Debris
  LINEAR_FLOW = 'LINEAR_FLOW'          // Conveyor belts, Traffic
}

export enum ShapeType {
  CUBE = 'CUBE',
  SPHERE = 'SPHERE',
  CYLINDER = 'CYLINDER',
  CONE = 'CONE',
  TORUS = 'TORUS',
  ICOSAHEDRON = 'ICOSAHEDRON',
  CAPSULE = 'CAPSULE',
  PYRAMID = 'PYRAMID'
}

export interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

export interface PhysicsParams {
  gravity: Vector3Data;
  wind: Vector3Data;
  particleCount: number;
  particleSize: number;
  
  // Material Physics
  restitution: number; // Bounciness (0-1)
  friction: number;    // Slide resistance (0-1)
  mass: number;        // Kg approx
  drag: number;        // Air resistance

  spawnMode: SpawnMode;
  shape: ShapeType;
  movementBehavior: MovementBehavior;
  color: string;
  spread: number; 
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface AnalysisResponse {
  simulationMode: SimulationMode;
  spawnMode: SpawnMode;
  shape: ShapeType;
  movementBehavior: MovementBehavior;
  gravity: Vector3Data;
  wind: Vector3Data;
  particleCount: number;
  color: string;
  restitution: number;
  friction: number;
  mass: number;
  explanation: string;
}