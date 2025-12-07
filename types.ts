
export enum ViewMode {
  RGB = 'RGB',
  DEPTH = 'DEPTH',
  LIDAR = 'LIDAR',
  WIREFRAME = 'WIREFRAME'
}

export enum SpawnMode {
  PILE = 'PILE',
  BLAST = 'BLAST',
  JET = 'JET',
  FLOAT = 'FLOAT',
  GRID = 'GRID'
}

export enum MovementBehavior {
  PHYSICS_GRAVITY = 'PHYSICS_GRAVITY',
  ORBITAL = 'ORBITAL',
  SWARM_FLOCK = 'SWARM_FLOCK',
  SINUSOIDAL_WAVE = 'SINUSOIDAL_WAVE',
  RADIAL_EXPLOSION = 'RADIAL_EXPLOSION',
  LINEAR_FLOW = 'LINEAR_FLOW'
}

export enum ShapeType {
  CUBE = 'CUBE',
  SPHERE = 'SPHERE',
  CYLINDER = 'CYLINDER',
  CONE = 'CONE',
  TORUS = 'TORUS',
  ICOSAHEDRON = 'ICOSAHEDRON',
  CAPSULE = 'CAPSULE',
  PYRAMID = 'PYRAMID',
  PLATE = 'PLATE'
}

export interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

export interface AssetGroup {
  id: string;
  name: string;
  count: number;
  shape: ShapeType;
  color: string;
  spawnMode: SpawnMode;
  scale: number;
  
  // Physics Material
  restitution: number;
  friction: number;
  mass: number;
  drag: number;
}

export interface PhysicsParams {
  gravity: Vector3Data;
  wind: Vector3Data;
  movementBehavior: MovementBehavior;
  assetGroups: AssetGroup[];
}

export interface TelemetryData {
  fps: number;
  particleCount: number;
  systemEnergy: number; // Kinetic Energy in Joules (approx)
  avgVelocity: number; // m/s
  maxVelocity: number;
  simTime: number;
  isWarmup: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'director';
}

export interface AnalysisResponse {
  movementBehavior: MovementBehavior;
  gravity: Vector3Data;
  wind: Vector3Data;
  assetGroups: AssetGroup[];
  explanation: string;
}

// --- ADVERSARIAL DIRECTOR TYPES ---

export enum DisturbanceType {
  GRAVITY_SHIFT = 'GRAVITY_SHIFT',
  WIND_GUST = 'WIND_GUST',
  FRICTION_FLUX = 'FRICTION_FLUX',
  ENTROPY_BURST = 'ENTROPY_BURST',
  SPAWN_OBSTACLE = 'SPAWN_OBSTACLE',
  SENSOR_NOISE = 'SENSOR_NOISE',
  CALIBRATION_DRIFT = 'CALIBRATION_DRIFT',
  SOLVER_FLUSH = 'SOLVER_FLUSH',
  NONE = 'NONE'
}

export interface AdversarialAction {
  detectedState: string;
  action: DisturbanceType;
  intensity: number; // 0.0 to 1.0
  reasoning: string;
}