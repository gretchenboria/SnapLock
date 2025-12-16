


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

  // Visibility (non-destructive layer toggle)
  visible?: boolean; // Defaults to true if not specified
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
  isWarmup: boolean; // DEPRECATED - will be removed
  activeCollisions: number; // Number of collision pairs
  physicsSteps: number; // Actual physics steps taken
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'chaos';
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
  HARSH_LIGHTING = 'HARSH_LIGHTING',
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
  angularVelocity?: Vector3Data;
  boundingBox?: BoundingBox3D;
}

// --- ML GROUND TRUTH TYPES ---

export interface BoundingBox2D {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  confidence: number;
}

export interface BoundingBox3D {
  center: Vector3Data;
  size: Vector3Data; // width, height, depth
  rotation: Vector3Data; // euler angles
}

export interface CameraIntrinsics {
  focalLength: number; // in pixels
  principalPoint: { x: number; y: number }; // in pixels
  aspectRatio: number;
  fov: number; // field of view in degrees
  resolution: { width: number; height: number };
}

export interface CameraExtrinsics {
  position: Vector3Data;
  rotation: Vector3Data; // euler angles
  quaternion: { x: number; y: number; z: number; w: number };
  lookAt: Vector3Data;
}

export interface MLGroundTruthFrame {
  timestamp: number;
  frameNumber: number;
  camera: {
    intrinsics: CameraIntrinsics;
    extrinsics: CameraExtrinsics;
  };
  objects: Array<{
    id: number;
    groupId: string;
    class: string; // shape type
    pose3D: {
      position: Vector3Data;
      rotation: Vector3Data;
      quaternion: { x: number; y: number; z: number; w: number };
    };
    boundingBox2D: BoundingBox2D;
    boundingBox3D: BoundingBox3D;
    velocity: Vector3Data;
    angularVelocity: Vector3Data;
    inFrustum: boolean;
    occlusionLevel: number; // 0.0 (fully visible) to 1.0 (fully occluded)
    distanceFromCamera: number;
  }>;
  physics: {
    gravity: Vector3Data;
    wind: Vector3Data;
    activeCollisions: number;
    systemEnergy: number;
  };
  metadata: {
    simulationId: string;
    configHash: string;
    engineVersion: string;
  };
}

export interface SimulationLayerHandle {
  captureSnapshot: () => ParticleSnapshot[];
  captureMLGroundTruth: () => MLGroundTruthFrame;
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