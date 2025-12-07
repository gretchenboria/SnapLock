


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
  PLATE = 'PLATE',
  MODEL = 'MODEL' // New type for GLB assets
}

export interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

export interface MaterialPreset {
  id: string;
  name: string;
  restitution: number;
  friction: number;
  mass: number;
  drag: number;
}

export interface AssetGroup {
  id: string;
  name: string;
  count: number;
  shape: ShapeType;
  modelUrl?: string; // Optional URL for external GLB
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
  environmentUrl?: string; // Optional URL for HDRI
  assetGroups: AssetGroup[];
}

export interface TelemetryData {
  fps: number;
  particleCount: number;
  systemEnergy: number; // Kinetic Energy in Joules (approx)
  avgVelocity: number; // m/s
  maxVelocity: number;
  stabilityScore: number; // Standard Deviation of Velocity (Lower is more stable)
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
  ENTROPY_BURST = 'SPAWN_OBSTACLE', 
  SPAWN_OBSTACLE = 'SPAWN_OBSTACLE',
  SENSOR_NOISE = 'SENSOR_NOISE',
  CALIBRATION_DRIFT = 'CALIBRATION_DRIFT',
  SOLVER_FLUSH = 'SOLVER_FLUSH',
  HARSH_LIGHTING = 'HARSH_LIGHTING', // New type
  NONE = 'NONE'
}

export interface AdversarialAction {
  detectedState: string;
  action: DisturbanceType;
  intensity: number; // 0.0 to 1.0
  reasoning: string;
}

// --- DATA EXPORT TYPES ---

export interface ParticleSnapshot {
  id: number;
  groupId: string;
  shape: string;
  mass: number;
  position: Vector3Data;
  velocity: Vector3Data;
  rotation: Vector3Data;
}

export interface SimulationLayerHandle {
  captureSnapshot: () => ParticleSnapshot[];
}

// --- TESTING INTERFACES ---

export interface TestHooks {
  sceneRef: React.MutableRefObject<any> | React.RefObject<any>;
  telemetryRef: React.MutableRefObject<TelemetryData> | React.RefObject<TelemetryData>;
  setParams: (p: PhysicsParams) => void;
  getParams: () => PhysicsParams;
  resetSim: () => void;
  togglePause: () => void;
  setPrompt: (s: string) => void;
  clickAnalyze: () => void;
}

declare global {
  interface Window {
    snaplock?: TestHooks;
  }
}