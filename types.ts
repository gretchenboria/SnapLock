


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

/**
 * Rigid Body Type for Synthetic Data Generation
 * CRITICAL for surgical simulations and robotics training data
 */
export enum RigidBodyType {
  DYNAMIC = 'DYNAMIC',       // Affected by forces (instruments, tools, objects)
  KINEMATIC = 'KINEMATIC',   // Controlled motion, not affected by physics (robot arms)
  STATIC = 'STATIC'          // Fixed in place (heart, organs, operating table)
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

  // Physics Body Type - CRITICAL for synthetic data generation
  rigidBodyType?: RigidBodyType; // Defaults to DYNAMIC if not specified

  // Physics Material
  restitution: number;
  friction: number;
  mass: number;
  drag: number;

  // Visibility (non-destructive layer toggle)
  visible?: boolean; // Defaults to true if not specified

  // VR Training Data: Object Affordances & Interaction Properties
  affordances?: {
    graspable: boolean;           // Can be picked up by VR hand
    manipulable: boolean;         // Can be moved/rotated after grasping
    interactive: boolean;         // Has interactive components (buttons, levers)
    graspPoints?: Vector3Data[];  // Optimal grasp positions in local space
    interactionType?: 'static' | 'door' | 'drawer' | 'button' | 'lever' | 'articulated';
  };

  // Spatial Relationships for Structured Scenes
  spatialConstraint?: {
    type: 'on_surface' | 'attached_to' | 'inside' | 'none';
    parentGroupId?: string;       // Which object this is constrained to
    offset?: Vector3Data;         // Position offset from parent
    maintainOrientation?: boolean; // Keep upright relative to parent
  };

  // Semantic Properties for VR Training
  semanticLabel?: string;         // Human-readable category (e.g., "coffee_mug", "door", "table")
  vrRole?: 'target' | 'obstacle' | 'tool' | 'furniture' | 'environment';

  // P0 CRITICAL FIX: Calculated spawn position from spatial positioning service
  spawnPosition?: Vector3Data;    // Initial position calculated from spatial constraints
}

// --- VR JOINT & CONSTRAINT SYSTEM ---

export enum JointType {
  REVOLUTE = 'REVOLUTE',      // Hinge joint (doors, wheels)
  PRISMATIC = 'PRISMATIC',    // Sliding joint (drawers, sliders)
  FIXED = 'FIXED',            // Rigid attachment (handle to door)
  SPHERICAL = 'SPHERICAL'     // Ball joint (shoulder, articulated)
}

export interface JointLimits {
  min: number;                // Minimum angle/distance
  max: number;                // Maximum angle/distance
  stiffness?: number;         // Spring stiffness at limits
  damping?: number;           // Damping at limits
}

export interface JointMotor {
  enabled: boolean;
  targetVelocity: number;     // Target velocity (rad/s or m/s)
  maxForce: number;           // Maximum force/torque
}

export interface JointConfig {
  id: string;
  type: JointType;
  parentGroupId: string;      // ID of parent object
  childGroupId: string;       // ID of child object
  parentAnchor: Vector3Data;  // Anchor point on parent (local space)
  childAnchor: Vector3Data;   // Anchor point on child (local space)
  axis: Vector3Data;          // Axis of rotation/translation
  limits?: JointLimits;       // Joint limits (optional)
  motor?: JointMotor;         // Motor control (optional)
  initialState?: number;      // Initial angle/position
}

// --- VR STATE TRACKING ---

export enum ObjectState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  PRESSED = 'PRESSED',
  RELEASED = 'RELEASED',
  GRASPED = 'GRASPED',
  FREE = 'FREE'
}

export interface ObjectStateData {
  objectId: string;
  groupId: string;
  state: ObjectState;
  jointAngle?: number;        // For doors/drawers (radians or meters)
  timeInState: number;        // How long in this state (seconds)
  lastTransition: number;     // Timestamp of last state change
}

// --- VR HAND SIMULATION ---

export interface VRHand {
  id: string;
  side: 'left' | 'right';
  position: Vector3Data;
  rotation: Vector3Data;
  isGrasping: boolean;
  graspedObjectId?: string;
  fingerPositions?: number[]; // 0-1 values for each finger joint
}

export interface GraspEvent {
  timestamp: number;
  handId: string;
  objectId: string;
  graspPoint: Vector3Data;
  graspForce: number;
  success: boolean;
}

// --- INTERACTION SEQUENCE RECORDING ---

export interface InteractionStep {
  timestamp: number;
  frameNumber: number;
  actionType: 'grasp' | 'release' | 'move' | 'rotate' | 'activate';
  handId?: string;
  objectId: string;
  objectState: ObjectState;
  handPose?: {
    position: Vector3Data;
    rotation: Vector3Data;
  };
  objectPose: {
    position: Vector3Data;
    rotation: Vector3Data;
  };
  jointState?: number;        // Joint angle if applicable
}

export interface InteractionSequence {
  sequenceId: string;
  taskDescription: string;
  startTime: number;
  endTime: number;
  steps: InteractionStep[];
  success: boolean;
  metadata: {
    scenarioType: string;
    difficulty: string;
    environmentId: string;
  };
}

export interface PhysicsParams {
  gravity: Vector3Data;
  wind: Vector3Data;
  movementBehavior: MovementBehavior;
  environmentUrl?: string; // Optional URL for HDRI
  assetGroups: AssetGroup[];
  joints?: JointConfig[];     // VR: Joint constraints for interactive objects
  vrHands?: VRHand[];         // VR: Virtual hand models
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

  // Sample object transform (first object in scene)
  samplePosition?: Vector3Data; // Position of first object
  sampleQuaternion?: { x: number; y: number; z: number; w: number }; // Full quaternion with W
  sampleVelocity?: Vector3Data; // Velocity of first object
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