# SnapLock: Complete Requirements Specification

## Executive Summary

SnapLock is a physics-accurate simulation platform that generates high-quality synthetic datasets for computer vision and robotics machine learning. The application combines real-time 3D rendering, deterministic physics simulation, and ML-ready dataset export in standard formats (COCO, YOLO).

**Core Purpose:** Generate production-grade synthetic training data with accurate physics, ground truth annotations, and complete metadata for CV/robotics ML pipelines.

---

## 1. System Architecture

### 1.1 Technology Stack

**Frontend Framework:**
- React 18+ with TypeScript (strict mode)
- Vite 7.x for build tooling and dev server
- TSConfig: strict type checking, ES2020+ target

**3D Rendering:**
- Three.js r170+ (WebGL renderer)
- React Three Fiber (R3F) 8.x for React integration
- @react-three/drei for utilities (useGLTF, OrbitControls, etc.)

**Physics Simulation:**
- Rapier.js 0.11+ (WebAssembly physics engine)
- Fixed timestep: 120Hz (8.333ms per step)
- Deterministic simulation for reproducible datasets

**State Management:**
- React hooks (useState, useRef, useMemo, useCallback)
- useImperativeHandle for component API exposure
- No global state management library (Redux/Zustand) - local state only

**AI Integration:**
- Google Gemini 2.0 Flash Experimental API
- Natural language prompt → physics scene generation
- Structured JSON output with Zod validation

**Build & Deployment:**
- npm/pnpm package manager
- GitHub repository with GitHub Actions CI
- Static site deployment (dist/ folder)

### 1.2 Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│  (Main container, scene management, AI prompt handling)      │
└──────────────┬──────────────────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼───────────┐  ┌──────▼──────────────┐
│ ControlPanel  │  │  SimulationLayerV2  │
│  (UI/Params)  │  │  (Physics + Render) │
└───────────────┘  └──────┬──────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
    ┌─────────▼─────────┐   ┌────────▼─────────┐
    │  PhysicsEngine    │   │  AssetRenderer   │
    │  (Rapier.js)      │   │  (Three.js)      │
    └───────────────────┘   └──────────────────┘
```

**Data Flow:**
1. User enters natural language prompt
2. GeminiService generates PhysicsParams (validated JSON)
3. SimulationLayerV2 initializes physics bodies + meshes
4. useFrame loop: physics step → update positions → render
5. User exports ML dataset (COCO/YOLO format)

---

## 2. Core Features

### 2.1 Natural Language Scene Generation

**Requirements:**
- User enters text prompt describing physics scene
- AI generates complete scene specification including:
  - Asset groups (objects with physics properties)
  - Scene environment (floor, walls, lighting)
  - Behaviors (animations, movements)
  - Spatial relationships (object placement)

**AI Model:**
- Google Gemini 2.0 Flash Experimental
- Structured output with JSON schema enforcement
- Retry logic with exponential backoff
- Fallback scenes for API failures

**Prompt Examples:**
- "Quadcopter hovering in warehouse"
- "Robot arm picking up wooden blocks"
- "Balls bouncing on trampoline"
- "Surgical tools on metal tray"

**AI Output Schema:**
```typescript
interface AISceneResponse {
  title: string;
  description: string;
  sceneType: string;
  assetGroups: AssetGroup[];
  scene: Scene;
}
```

### 2.2 Physics Simulation

**Physics Engine:** Rapier.js (Rust-based WASM physics)

**Requirements:**
- Deterministic simulation (fixed 120Hz timestep)
- Rigid body dynamics with 6DOF (position + quaternion rotation)
- Collision detection and response
- Material properties (friction, restitution, mass, drag)
- Three body types:
  - DYNAMIC: Full physics simulation
  - KINEMATIC: Animated motion, no forces
  - STATIC: Immovable (floors, walls)

**Physics Parameters:**
- Gravity: { x: 0, y: -9.81, z: 0 } (default)
- Integration: Semi-implicit Euler
- Collision detection: Continuous CCD for fast objects
- Solver: Iterative constraint solver

**Performance Targets:**
- 60 FPS for up to 500 particles
- 30 FPS for up to 1000 particles
- Deterministic behavior (same seed = same results)

### 2.3 3D Rendering

**Renderer:** Three.js WebGLRenderer with React Three Fiber

**Requirements:**
- Real-time 3D rendering at 60 FPS
- Instanced mesh rendering for performance
- PBR materials (Physically Based Rendering)
- Shadow mapping (soft shadows)
- HDR environment lighting
- Camera controls (OrbitControls)

**View Modes:**
1. **RGB:** Full PBR rendering with materials
2. **Depth:** Grayscale depth buffer visualization
3. **LiDAR:** Point cloud simulation style
4. **Wireframe:** Geometry edges only

**Lighting:**
- Ambient light (low intensity)
- Directional light (sun simulation, shadows)
- Environment map (HDR for reflections)

**Camera:**
- Perspective camera (default FOV: 50°)
- Position: (10, 8, 10) looking at origin
- Near plane: 0.1, Far plane: 1000

### 2.4 Asset System

**Asset Types:**

**Primitives (Built-in Geometry):**
- CUBE, SPHERE, CYLINDER, CONE, PYRAMID
- TORUS, ICOSAHEDRON, CAPSULE, PLATE

**3D Models (GLB/GLTF):**
- External GLB files loaded via useGLTF
- Model library with pre-configured assets
- Automatic fallback to primitives if model fails
- Error boundaries for model loading failures

**Model Requirements:**
- Format: GLB (binary GLTF)
- Coordinate system: Y-up, right-handed
- Units: Meters
- Optimization: Draco compression recommended

**Asset Properties:**
```typescript
interface AssetGroup {
  id: string;
  name: string;
  count: number;           // Instances to spawn
  shape: ShapeType;
  modelUrl?: string;       // GLB path for MODEL type
  color: string;           // Hex color
  scale: number;           // Uniform scale factor

  // Physics
  rigidBodyType: 'DYNAMIC' | 'KINEMATIC' | 'STATIC';
  mass: number;            // kg
  friction: number;        // 0-1
  restitution: number;     // 0-1 (bounciness)
  drag: number;            // Linear damping

  // Spawning
  spawnMode: 'GRID' | 'RANDOM' | 'CIRCLE' | 'FLOAT';
  spawnPosition?: Vector3Data;
  rotation?: Vector3Data;  // Euler angles (radians)

  // Advanced
  deformation?: MeshDeformation;
  spatialConstraint?: SpatialConstraint;
  visible?: boolean;
}
```

### 2.5 Animation & Behaviors

**Animation Engine:**
- Custom AnimationEngine class
- Keyframe-based animation system
- Behavior composition (sequences of actions)
- Looping and chaining support

**Action Types:**
```typescript
enum ActionType {
  MOVE_TO = 'move_to',           // Linear interpolation to position
  ROTATE_TO = 'rotate_to',       // Rotation interpolation
  WAIT = 'wait',                 // Pause
  PICK_UP = 'pick_up',           // Attach object (constraint)
  PLACE_DOWN = 'place_down'      // Release object
}
```

**Behavior System:**
```typescript
interface Behavior {
  id: string;
  name: string;
  description: string;
  targetObjectId: string;        // Which object to animate
  loop: boolean;
  actions: Action[];
}
```

**Requirements:**
- Target KINEMATIC bodies only (not DYNAMIC)
- Smooth interpolation between keyframes
- Physics-aware (no clipping through objects)
- Real-time updates (no lag)

### 2.6 ML Dataset Export

**Export Formats:**

**1. COCO Format (JSON + Images):**
```json
{
  "info": {
    "year": 2025,
    "version": "1.0",
    "description": "SnapLock synthetic dataset",
    "contributor": "SnapLock Physics Simulator",
    "date_created": "2025-12-22T19:42:00Z"
  },
  "images": [
    {
      "id": 1,
      "file_name": "frame_0001.png",
      "width": 1920,
      "height": 1080,
      "date_captured": "2025-12-22T19:42:00Z"
    }
  ],
  "annotations": [
    {
      "id": 1,
      "image_id": 1,
      "category_id": 1,
      "bbox": [x, y, width, height],
      "area": 12345.67,
      "segmentation": [],
      "iscrowd": 0
    }
  ],
  "categories": [
    {
      "id": 1,
      "name": "quadcopter_drone",
      "supercategory": "vehicle"
    }
  ]
}
```

**2. YOLO Format (Text + Images):**
```
# One .txt file per image (same filename)
# Format: <class_id> <x_center> <y_center> <width> <height>
# All coordinates normalized to [0, 1]

0 0.5234 0.3456 0.1234 0.0987
1 0.7891 0.6543 0.0876 0.1123
```

**3. Ground Truth Metadata (JSON):**
```json
{
  "frame": 1,
  "timestamp": 0.0166,
  "objects": [
    {
      "id": "quadcopter_drone",
      "category": "vehicle",
      "position_3d": [0.0, 1.5, 0.0],
      "rotation_quaternion": [0.0, 0.0, 0.0, 1.0],
      "velocity_3d": [0.0, 0.0, 0.0],
      "bbox_2d": [100, 200, 150, 120],
      "visible": true,
      "occluded": false,
      "truncated": false
    }
  ],
  "camera": {
    "position": [10, 8, 10],
    "rotation": [0, 0, 0],
    "fov": 50,
    "intrinsics": {
      "fx": 1920.0,
      "fy": 1920.0,
      "cx": 960.0,
      "cy": 540.0
    },
    "extrinsics": {
      "view_matrix": [...],
      "projection_matrix": [...]
    }
  }
}
```

**Export Requirements:**
- Accurate 2D bounding boxes from 3D→2D projection
- Camera intrinsics and extrinsics matrices
- Occlusion detection (objects behind others)
- Truncation detection (objects outside frame)
- Physics metadata (velocity, collision state)
- Frame-by-frame sequential export
- Batch download (ZIP archive)

### 2.7 User Interface

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  SnapLock Header │ 🔧 ⏸️ 🔄 ⏺️ 📸 ⬇️                    │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  Left Panel  │         3D Viewport                      │
│              │                                          │
│  - Assets    │                                          │
│  - Physics   │                                          │
│  - Env       │                                          │
│  - Data      │                                          │
│  - Settings  │                                          │
│              │                                          │
│              │                                          │
├──────────────┴──────────────────────────────────────────┤
│  Control Panel: FPS, Particle Count, System Energy...   │
└─────────────────────────────────────────────────────────┘
```

**Components:**

**1. Header Bar:**
- SnapLock logo + title
- Toolbar buttons:
  - Settings (⚙️)
  - Play/Pause simulation (▶️/⏸️)
  - Reset scene (🔄)
  - Record (⏺️)
  - Screenshot (📸)
  - Download dataset (⬇️)
- View mode selector (RGB/Depth/LiDAR/Wireframe)
- Camera controls
- Performance icons

**2. Left Sidebar (Tabbed):**

**Assets Tab:**
- Search bar for filtering assets
- Category filter chips (ALL, WAREHOUSE, [IND] INDUSTRIAL)
- Asset grid with icons
- Asset properties (name, category, tag)
- "Assemble Scene" button (adds all assets)

**Physics Tab:**
- Gravity controls (X/Y/Z sliders)
- Global physics parameters
- Timestep setting (fixed 120Hz)
- Collision detection mode

**Environment Tab:**
- Lighting controls (ambient, directional)
- Background color/environment
- Shadow settings
- Fog/atmosphere

**Data Tab:**
- Export format selection (COCO/YOLO)
- Frame range selector
- Resolution settings
- Annotation options

**Settings Tab:**
- API key configuration (Gemini)
- Performance settings
- Debug options
- About/version info

**3. 3D Viewport:**
- Full WebGL canvas
- OrbitControls (mouse drag to rotate)
- Grid floor (optional)
- Axis helper (optional)
- Stats overlay (FPS, memory)

**4. Control Panel (Bottom):**
- Real-time telemetry display:
  - FPS (frames per second)
  - Particle count (active objects)
  - System energy (kinetic + potential)
  - Stability score (0-100)
  - Physics steps
  - Collisions per frame
- Sample object telemetry:
  - 3D Position (X/Y/Z)
  - Quaternion rotation (X/Y/Z/W)
  - Velocity (X/Y/Z)
  - Angular velocity

**5. Scene Layers Panel (Right):**
- Scene hierarchy
- Layer visibility toggles
- Object selection
- Layer locking
- Add layer button

**6. AI Prompt Modal:**
- Large text input area
- Example prompts
- "Generate Scene" button
- Loading spinner during generation
- Error messages for failures

### 2.8 Performance Requirements

**Rendering Performance:**
- 60 FPS @ 1920x1080 with 500 objects
- 30 FPS @ 1920x1080 with 1000 objects
- Instanced mesh rendering (batch rendering)
- Frustum culling (off-screen objects)
- LOD (Level of Detail) for distant objects

**Memory Management:**
- Max 2GB RAM usage
- Proper disposal of Three.js resources
- No memory leaks (buffer cleanup)
- Garbage collection friendly

**Physics Performance:**
- Fixed 120Hz timestep (deterministic)
- Multi-threading via WASM (Rapier.js)
- Spatial partitioning (broad-phase optimization)
- Island-based solving (connected bodies)

**Load Times:**
- Initial app load: <3 seconds
- Model loading: <1 second per model
- Scene generation (AI): <5 seconds
- Scene reset: <500ms

---

## 3. Technical Implementation Details

### 3.1 File Structure

```
SnapLock/
├── public/
│   ├── models/               # 3D model assets (GLB)
│   │   ├── drone_quadcopter.glb
│   │   ├── robot_arm.glb
│   │   └── ...
│   └── index.html
├── src/
│   ├── components/
│   │   ├── App.tsx                    # Main app container
│   │   ├── ControlPanel.tsx           # Bottom telemetry panel
│   │   ├── SimulationLayerV2.tsx      # Physics + rendering layer
│   │   ├── AssetRenderer.tsx          # 3D model/primitive renderer
│   │   ├── SceneLayersPanel.tsx       # Right sidebar (layers)
│   │   └── ...
│   ├── services/
│   │   ├── geminiService.ts           # AI scene generation
│   │   ├── physicsEngine.ts           # Rapier.js wrapper
│   │   ├── animationEngine.ts         # Behavior/animation system
│   │   ├── modelLibrary.ts            # Asset catalog
│   │   ├── mlExportService.ts         # COCO/YOLO export
│   │   ├── spatialPositioning.ts      # Object placement
│   │   └── meshDeformationShaders.ts  # GPU deformation
│   ├── types.ts                       # TypeScript interfaces
│   ├── main.tsx                       # React entry point
│   └── index.css                      # Global styles
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── REQUIREMENTS.md                    # This file
└── CLAUDE.md                          # Development guidelines
```

### 3.2 Type Definitions

**Core Types:**

```typescript
// Physics simulation parameters
interface PhysicsParams {
  assetGroups: AssetGroup[];
  gravity: Vector3Data;
  movementBehavior?: 'throw' | 'drop' | 'shoot' | 'explode';
  scene?: Scene;
  joints?: Joint[];
  vrHands?: VRHand[];
}

// 3D vector (position, velocity, rotation)
interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

// Quaternion rotation (4-component)
interface QuaternionData {
  x: number;
  y: number;
  z: number;
  w: number;
}

// Asset group (instanced objects)
interface AssetGroup {
  id: string;
  name: string;
  count: number;
  shape: ShapeType;
  modelUrl?: string;
  color: string;
  spawnMode: SpawnMode;
  scale: number;

  rigidBodyType: RigidBodyType;
  mass: number;
  friction: number;
  restitution: number;
  drag: number;

  spawnPosition?: Vector3Data;
  rotation?: Vector3Data;
  deformation?: MeshDeformation;
  spatialConstraint?: SpatialConstraint;
  visible?: boolean;
}

// Scene definition (structured scenes)
interface Scene {
  id: string;
  name: string;
  description: string;
  environment: Environment;
  objects: SceneObject[];
  behaviors?: Behavior[];
  animations?: AnimationClip[];
}

// Enums
enum ShapeType {
  CUBE = 'CUBE',
  SPHERE = 'SPHERE',
  CYLINDER = 'CYLINDER',
  CONE = 'CONE',
  PYRAMID = 'PYRAMID',
  TORUS = 'TORUS',
  ICOSAHEDRON = 'ICOSAHEDRON',
  CAPSULE = 'CAPSULE',
  PLATE = 'PLATE',
  MODEL = 'MODEL'  // External GLB
}

enum SpawnMode {
  GRID = 'GRID',      // Regular grid pattern
  RANDOM = 'RANDOM',  // Random positions
  CIRCLE = 'CIRCLE',  // Circular arrangement
  FLOAT = 'FLOAT'     // Floating in air
}

enum RigidBodyType {
  DYNAMIC = 'DYNAMIC',      // Full physics
  KINEMATIC = 'KINEMATIC',  // Animated, no forces
  STATIC = 'STATIC'         // Immovable
}

enum ViewMode {
  RGB = 'RGB',           // Full color PBR
  DEPTH = 'DEPTH',       // Depth buffer
  LIDAR = 'LIDAR',       // Point cloud style
  WIREFRAME = 'WIREFRAME' // Edges only
}
```

### 3.3 Physics Engine API

**PhysicsEngine Class:**

```typescript
class PhysicsEngine {
  private world: RAPIER.World;
  private bodies: Map<number, BodyData>;

  constructor(gravity: Vector3Data) {
    // Initialize Rapier.js world
  }

  createBodies(
    params: PhysicsParams,
    groupStructure: GroupStructure[],
    positions: Float32Array,
    velocities: Float32Array,
    rotations: Float32Array
  ): void {
    // Create rigid bodies and colliders
  }

  step(
    dt: number,
    positions: Float32Array,
    velocities: Float32Array,
    rotations: Float32Array
  ): PhysicsStats {
    // Advance simulation by dt seconds
    // Update output buffers (positions, velocities, rotations)
    // Return statistics
  }

  applyForce(handle: number, force: Vector3Data): void {
    // Apply force to specific body
  }

  setPosition(handle: number, pos: Vector3Data): void {
    // Teleport body (kinematic)
  }

  setRotation(handle: number, quat: QuaternionData): void {
    // Set rotation (kinematic)
  }

  dispose(): void {
    // Clean up resources
  }
}
```

**Data Buffers:**
- Positions: Float32Array (length = particleCount * 3)
- Velocities: Float32Array (length = particleCount * 3)
- Rotations: Float32Array (length = particleCount * 4) // Quaternions
- Meta: Float32Array (collision flags, energy, etc.)

### 3.4 AI Integration (Gemini)

**GeminiService API:**

```typescript
async function analyzePhysicsPrompt(
  prompt: string
): Promise<PhysicsParams> {
  // 1. Call Gemini API with structured output schema
  // 2. Parse and validate JSON response
  // 3. Run post-processing validation
  // 4. Return PhysicsParams or fallback scene
}
```

**Gemini Configuration:**
- Model: `gemini-2.0-flash-exp`
- Temperature: 0.7 (creative but consistent)
- Max tokens: 8000
- Response MIME type: `application/json`
- JSON schema enforcement (Zod)

**Prompt Engineering:**
```typescript
const systemPrompt = `
You are a physics simulation scene generator. Generate realistic
physics scenes from natural language descriptions.

Output requirements:
- Include asset groups with accurate physics properties
- Set appropriate rigid body types (DYNAMIC/KINEMATIC/STATIC)
- Position objects logically (no floating, no clipping)
- Add behaviors for animated objects
- Include environment (floor, walls, lighting)

Physics accuracy is critical. Objects must obey laws of physics.
`;
```

**Post-Processing Validation:**
1. Check for invalid physics parameters (NaN, Infinity)
2. Enforce minimum mass (>0.1kg)
3. Detect primitive shapes when 3D model expected (auto-fix)
4. Add missing floor if needed
5. Validate behavior target IDs exist
6. Remove duplicate object IDs
7. Normalize colors to hex format

**Fallback Scenes:**
- Predefined scenes for common prompts
- Triggered on API failure or invalid response
- Examples: warehouse with pallets, surgical tools on tray

### 3.5 ML Export Implementation

**MLExportService:**

```typescript
class MLExportService {
  static async exportCOCO(
    frames: CapturedFrame[],
    metadata: ExportMetadata
  ): Promise<COCODataset> {
    // Generate COCO JSON
    // Project 3D bounding boxes to 2D
    // Calculate areas, occlusions
    // Package with images
  }

  static async exportYOLO(
    frames: CapturedFrame[],
    metadata: ExportMetadata
  ): Promise<YOLODataset> {
    // Generate one .txt per image
    // Normalize coordinates [0, 1]
    // Create classes.txt
    // Package with images
  }

  static project3DTo2D(
    position3D: Vector3Data,
    size3D: Vector3Data,
    viewMatrix: Matrix4,
    projectionMatrix: Matrix4,
    viewport: { width: number; height: number }
  ): BBox2D {
    // World space → Camera space → Clip space → Screen space
    // Return 2D bounding box [x, y, width, height]
  }

  static detectOcclusion(
    objectA: SceneObject,
    objectB: SceneObject,
    cameraPos: Vector3Data
  ): boolean {
    // Ray casting from camera to object
    // Check if other objects block view
  }
}
```

**Frame Capture:**
```typescript
interface CapturedFrame {
  frameNumber: number;
  timestamp: number;
  image: ImageData | Blob;
  objects: ObjectSnapshot[];
  camera: CameraSnapshot;
  physics: PhysicsSnapshot;
}

interface ObjectSnapshot {
  id: string;
  category: string;
  position3D: Vector3Data;
  rotation: QuaternionData;
  velocity: Vector3Data;
  bbox2D?: BBox2D;
  visible: boolean;
  occluded: boolean;
  truncated: boolean;
}
```

**Export Pipeline:**
1. User clicks "Export Dataset"
2. Modal shows format selection (COCO/YOLO)
3. User specifies frame range (start, end, step)
4. Background process:
   - Capture frame (canvas.toBlob)
   - Extract object positions from physics buffers
   - Project 3D→2D bounding boxes
   - Detect occlusions (Z-buffer check)
   - Generate annotations
5. Package all files (images + JSON/TXT)
6. Trigger browser download (ZIP or individual files)

### 3.6 Rendering Pipeline

**SimulationLayerV2 (Main Render Loop):**

```typescript
useFrame((state, delta) => {
  if (!physicsReady) return;

  const time = state.clock.elapsedTime;
  const dt = Math.min(delta, 0.1);

  // 1. Update animations (kinematic bodies)
  if (animationEngineRef.current) {
    const updates = animationEngineRef.current.update(dt);
    updates.forEach(({ objectId, position, rotation }) => {
      physicsEngineRef.current.setPosition(handle, position);
      physicsEngineRef.current.setRotation(handle, rotation);
    });
  }

  // 2. Step physics simulation (fixed timestep)
  const stats = physicsEngineRef.current.step(
    FIXED_TIMESTEP,
    positions,
    velocities,
    rotations
  );

  // 3. Update instanced mesh matrices
  groupStructure.forEach((structure) => {
    const mesh = meshRefs.current[structure.index];
    for (let i = structure.start; i < structure.end; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      dummy.position.set(pos[i3], pos[i3+1], pos[i3+2]);
      dummy.quaternion.set(rot[i4], rot[i4+1], rot[i4+2], rot[i4+3]);
      dummy.scale.setScalar(group.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i - structure.start, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  // 4. Update telemetry
  telemetryRef.current = {
    fps: 1 / dt,
    particleCount: activeParticles,
    systemEnergy: stats.totalEnergy,
    samplePosition: { x: pos[0], y: pos[1], z: pos[2] },
    sampleQuaternion: { x: rot[0], y: rot[1], z: rot[2], w: rot[3] },
    sampleVelocity: { x: vel[0], y: vel[1], z: vel[2] }
  };
});
```

**AssetRenderer (Per-Object Rendering):**

```typescript
export const AssetRenderer: React.FC<AssetRendererProps> = (props) => {
  // Force 3D model for drones (override primitives)
  if (props.group.name.includes('drone')) {
    return <ModelAsset {...props} />;
  }

  // Load 3D model if specified
  if (props.group.shape === ShapeType.MODEL && props.group.modelUrl) {
    return <ModelAsset {...props} />;
  }

  // Fallback to primitive geometry
  return <PrimitiveAsset {...props} />;
};
```

**Material System (Domain Randomization):**

```typescript
const Material = ({ group, viewMode }) => {
  // PBR material with randomized properties
  const baseColor = new THREE.Color(group.color);

  // Hue variation (±10%)
  const randomizedColor = baseColor.clone();
  randomizedColor.offsetHSL(
    (Math.random() - 0.5) * 0.2,
    (Math.random() - 0.5) * 0.1,
    (Math.random() - 0.5) * 0.1
  );

  // Physics-based PBR properties
  const roughness = 1.0 - group.restitution + (Math.random() - 0.5) * 0.3;
  const metalness = (1.0 - group.friction) * 0.8 + (Math.random() - 0.5) * 0.2;

  return (
    <meshStandardMaterial
      color={randomizedColor}
      roughness={roughness}
      metalness={metalness}
      envMapIntensity={1.0 + Math.random()}
    />
  );
};
```

---

## 4. Configuration & Setup

### 4.1 Dependencies (package.json)

```json
{
  "name": "snaplock",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "three": "^0.170.0",
    "@react-three/fiber": "^8.17.10",
    "@react-three/drei": "^9.117.3",
    "@dimforge/rapier3d-compat": "^0.11.2",
    "@google/generative-ai": "^0.21.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/three": "^0.170.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^7.2.6"
  }
}
```

### 4.2 TypeScript Configuration

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

### 4.3 Vite Configuration

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat']
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          react: ['react', 'react-dom'],
          rapier: ['@dimforge/rapier3d-compat']
        }
      }
    }
  }
});
```

### 4.4 Environment Variables

**.env:**
```
VITE_GEMINI_API_KEY=your_api_key_here
VITE_ENABLE_DEBUG=false
VITE_MAX_PARTICLES=1000
```

**Access in code:**
```typescript
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
```

---

## 5. Testing Requirements

### 5.1 Unit Tests

**Required Test Coverage:**
- PhysicsEngine: body creation, stepping, force application
- AnimationEngine: keyframe interpolation, behavior execution
- MLExportService: 3D→2D projection, COCO/YOLO formatting
- GeminiService: prompt parsing, validation, fallbacks

**Test Framework:**
- Vitest or Jest
- React Testing Library for components
- Mock Rapier.js and Three.js

### 5.2 Integration Tests

**Scenarios:**
1. Full scene generation from prompt
2. Physics simulation → dataset export
3. Model loading → rendering → collision
4. Animation playback → position updates

### 5.3 Performance Tests

**Benchmarks:**
- 500 particles @ 60 FPS (must pass)
- 1000 particles @ 30 FPS (must pass)
- Memory leak test (10 minute simulation)
- Export performance (1000 frames in <5 minutes)

### 5.4 Manual QA Checklist

- [ ] AI generates valid scene from 10 different prompts
- [ ] Physics behaves realistically (gravity, collisions, friction)
- [ ] 3D models load without errors
- [ ] Animations play smoothly without jitter
- [ ] COCO export opens in CVAT/Roboflow
- [ ] YOLO export trains in YOLOv8
- [ ] All view modes render correctly
- [ ] No console errors during normal operation
- [ ] Scene reset clears all state properly
- [ ] Camera controls work (orbit, pan, zoom)

---

## 6. Deployment

### 6.1 Build Process

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

**Build Output:**
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── models/ (copied from public/)
└── ...
```

### 6.2 Hosting Requirements

**Static Site Hosting:**
- GitHub Pages, Netlify, Vercel, or Cloudflare Pages
- Serve `dist/` folder as static files
- HTTPS required (for WebGL and API calls)

**CORS Configuration:**
- Models must be served with CORS headers
- GLB files: `Access-Control-Allow-Origin: *`

**Headers:**
```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

### 6.3 CDN & Optimization

- Enable Gzip/Brotli compression
- Cache static assets (models, images)
- CDN for fast global delivery
- Lazy load models (load on demand)

---

## 7. Error Handling

### 7.1 Physics Engine Errors

**Invalid Parameters:**
- Check for NaN, Infinity in positions/velocities
- Enforce minimum mass (0.1 kg)
- Clamp friction/restitution to [0, 1]

**Collision Explosion:**
- Detect high velocities (>100 m/s)
- Reset scene if objects escape bounds (|pos| > 1000)

**Memory Overflow:**
- Limit max particles to 1000
- Show warning if approaching limit

### 7.2 Model Loading Errors

**Error Boundaries:**
```typescript
<ModelErrorBoundary fallback={<PrimitiveAsset />}>
  <React.Suspense fallback={<PrimitiveAsset />}>
    <ModelAssetInner {...props} />
  </React.Suspense>
</ModelErrorBoundary>
```

**Fallback Strategy:**
1. Try loading GLB model
2. If fails, log warning and use primitive geometry
3. Continue simulation (non-blocking)

### 7.3 AI Generation Errors

**API Failures:**
- Retry with exponential backoff (3 attempts)
- Fall back to predefined scene for common prompts
- Show user-friendly error message

**Invalid JSON:**
- Validate with Zod schema
- Log detailed error for debugging
- Use fallback scene

**Rate Limiting:**
- Detect 429 errors
- Show cooldown message to user
- Retry after delay

### 7.4 Export Errors

**Canvas Access:**
- Check canvas.toBlob support
- Handle security errors (CORS tainted)

**File Size:**
- Warn if export >100MB
- Offer to reduce resolution or frame count

**Browser Compatibility:**
- Check File API support
- Fallback to base64 download if needed

---

## 8. Browser Compatibility

### 8.1 Minimum Requirements

- Chrome 90+ (recommended)
- Firefox 88+
- Safari 15+
- Edge 90+

**Required Features:**
- WebGL 2.0
- WebAssembly (for Rapier.js)
- ES2020 JavaScript
- File API (for downloads)
- Canvas.toBlob()

### 8.2 Mobile Support

**Not Supported:**
- Performance too low for physics simulation
- Touch controls not optimized
- Show warning on mobile devices

---

## 9. Security Considerations

### 9.1 API Key Protection

- Store Gemini API key in environment variables
- Never commit .env to git
- Rate limit AI requests (client-side)

### 9.2 User Input Validation

- Sanitize prompt text (no XSS)
- Validate all numeric inputs (NaN check)
- Limit prompt length (max 1000 chars)

### 9.3 Resource Limits

- Max 1000 particles (prevent memory exhaustion)
- Max 10MB per GLB model
- Timeout AI requests after 30 seconds

---

## 10. Maintenance & Monitoring

### 10.1 Logging

**Console Logging Levels:**
- `console.log`: Info messages (feature usage)
- `console.warn`: Warnings (fallbacks, non-critical errors)
- `console.error`: Errors (failures, exceptions)

**Key Log Points:**
- Scene generation (AI response)
- Physics initialization
- Model loading (success/failure)
- Animation registration
- Export completion

### 10.2 Analytics (Optional)

**Track:**
- Scene generation frequency
- Most common prompts
- Export format usage (COCO vs YOLO)
- Average session duration
- Error rates by type

### 10.3 Version Management

**Semantic Versioning:**
- MAJOR: Breaking changes to API/data formats
- MINOR: New features (backwards compatible)
- PATCH: Bug fixes

**Changelog:**
- Document all changes in CHANGELOG.md
- Include migration guides for breaking changes

---

## 11. Future Enhancements (Optional)

### 11.1 Advanced Physics

- Soft body dynamics (cloth, fluids)
- Articulated bodies (robot joints)
- Breakable objects (fracture simulation)
- Particle systems (smoke, fire, water)

### 11.2 Advanced Rendering

- Ray tracing (realistic reflections)
- Volumetric lighting (god rays)
- Post-processing effects (bloom, DOF)
- Deferred rendering pipeline

### 11.3 ML Features

- Semantic segmentation masks
- Instance segmentation
- Keypoint annotations (for pose estimation)
- Depth maps (stereo pair generation)

### 11.4 Collaboration

- Cloud scene storage
- Share scene URLs
- Multi-user editing (WebRTC)
- Asset marketplace

### 11.5 VR/AR Support

- WebXR integration
- Hand tracking
- Room-scale physics
- Passthrough AR

---

## 12. Known Limitations

1. **Mobile Performance:** Not optimized for mobile devices
2. **Physics Scale:** Best for 1-1000 objects (not millions)
3. **Model Formats:** Only GLB/GLTF supported (no FBX, OBJ)
4. **AI Reliability:** Gemini API may return invalid scenes
5. **Browser Compatibility:** Requires modern browser with WebGL 2.0
6. **Export Speed:** Large datasets (>1000 frames) take time
7. **Memory:** Large scenes (>1000 objects) may run out of memory

---

## 13. Success Criteria

### 13.1 Functional Requirements

- ✅ Generate scene from natural language prompt
- ✅ Realistic physics simulation (gravity, collisions, friction)
- ✅ 3D model loading and rendering
- ✅ Animation/behavior system
- ✅ COCO and YOLO dataset export
- ✅ Real-time telemetry display
- ✅ Multiple view modes (RGB, Depth, LiDAR, Wireframe)

### 13.2 Performance Requirements

- ✅ 60 FPS with 500 objects
- ✅ 30 FPS with 1000 objects
- ✅ Scene generation in <5 seconds
- ✅ Export 1000 frames in <5 minutes

### 13.3 Quality Requirements

- ✅ Accurate 2D bounding boxes (IoU >0.95)
- ✅ Correct camera matrices (verify with 3D→2D→3D roundtrip)
- ✅ Physics stability (no explosions, no clipping)
- ✅ Zero memory leaks (10+ minute test)
- ✅ Production-ready code (TypeScript strict mode, error handling)

---

## Appendix A: Physics Constants

```typescript
// Universal constants
const GRAVITY = { x: 0, y: -9.81, z: 0 }; // m/s²
const FIXED_TIMESTEP = 1 / 120;           // 8.333ms

// Material presets
const MATERIALS = {
  rubber: { friction: 0.9, restitution: 0.85, density: 1100 },
  wood: { friction: 0.6, restitution: 0.3, density: 600 },
  metal: { friction: 0.4, restitution: 0.5, density: 7850 },
  glass: { friction: 0.2, restitution: 0.7, density: 2500 },
  plastic: { friction: 0.5, restitution: 0.4, density: 1200 }
};

// Collision groups (bitmask)
const COLLISION_GROUPS = {
  STATIC: 0b0001,    // Floor, walls
  DYNAMIC: 0b0010,   // Moving objects
  KINEMATIC: 0b0100, // Animated objects
  VR_HAND: 0b1000    // VR controllers
};
```

---

## Appendix B: Example Prompts

**Simple Physics:**
- "Drop 10 red balls"
- "Stack wooden cubes"
- "Roll spheres down ramp"

**Robotics:**
- "Robot arm picking up blocks"
- "Quadcopter hovering in warehouse"
- "Surgical robot with instruments on tray"

**Industrial:**
- "Forklift moving pallets in warehouse"
- "Conveyor belt sorting packages"
- "Assembly line with parts"

**Training Scenarios:**
- "Medical instruments on sterile tray"
- "Tools scattered on workbench"
- "Drone navigating obstacle course"

---

## Appendix C: Gemini API Schema

**Zod Validation Schema:**

```typescript
const AssetGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number().min(1).max(100),
  shape: z.enum(['CUBE', 'SPHERE', 'CYLINDER', 'MODEL', ...]),
  modelUrl: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  spawnMode: z.enum(['GRID', 'RANDOM', 'CIRCLE', 'FLOAT']),
  scale: z.number().positive(),
  rigidBodyType: z.enum(['DYNAMIC', 'KINEMATIC', 'STATIC']),
  mass: z.number().positive(),
  friction: z.number().min(0).max(1),
  restitution: z.number().min(0).max(1),
  drag: z.number().nonnegative()
});

const PhysicsParamsSchema = z.object({
  assetGroups: z.array(AssetGroupSchema),
  gravity: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number()
  }),
  scene: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    environment: z.object({
      floor: z.object({
        size: z.number().positive(),
        color: z.string(),
        material: z.string()
      }),
      lighting: z.object({
        ambient: z.number().min(0).max(1),
        directional: z.number().min(0).max(1)
      })
    }),
    objects: z.array(z.any()),
    behaviors: z.array(z.any()).optional()
  })
});
```

---

**End of Requirements Document**

Total Pages: ~35
Word Count: ~10,000
Version: 1.0.0
Last Updated: 2025-12-22
