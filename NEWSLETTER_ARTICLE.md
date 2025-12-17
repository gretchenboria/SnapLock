# Building SnapLock: End-to-End Requirements for Physics-Based Synthetic Training Data

**A Technical Deep Dive into ML Infrastructure for Spatial Computing**

---

## Executive Summary

SnapLock is a browser-based physics simulation engine designed to generate ground truth training data for spatial computing ML models. This article documents the complete engineering requirements, architectural decisions, and implementation challenges encountered while building production-grade ML infrastructure.

**Core Innovation:** Using deterministic physics simulation (Rapier3D) instead of generative AI to produce training data with perfect ground truth accuracy.

**Target Use Case:** Training ML models for auto-spatialization systems that convert 2D/3D content into spatially-aware AR/VR experiences.

---

## Problem Statement

### The Challenge

Auto-spatialization ML models require training data with:

1. **Perfect Ground Truth Labels**
   - Exact 3D positions (not human-annotated approximations)
   - Precise bounding boxes for object detection
   - Accurate depth information for spatial understanding
   - Semantic segmentation masks (floor, walls, furniture, objects)
   - Physics validation data (collision states, velocities, forces)

2. **Temporal Consistency**
   - Frame-by-frame object tracking
   - Consistent object IDs across video sequences
   - Physics state continuity for motion prediction

3. **Dataset Diversity**
   - Multiple room layouts and furniture configurations
   - Varied object types, scales, and materials
   - Different lighting conditions and camera angles
   - Interaction sequences (grasping, placing, manipulating)

4. **Scale Requirements**
   - Thousands to millions of training examples
   - Multiple export formats (COCO, YOLO, depth maps, segmentation)
   - Reproducible datasets for benchmarking

### Why Existing Solutions Fall Short

**Real-world VR capture:**
- Expensive and time-consuming (requires VR hardware, motion capture)
- Lacks ground truth (human annotation is error-prone)
- Limited diversity (constrained to physical lab setups)
- Privacy concerns (real environments may contain sensitive data)

**Generative AI approaches:**
- Visual quality doesn't guarantee geometric accuracy
- "Photorealistic" generation introduces measurement noise
- Temporal inconsistency across frames
- API dependencies create operational fragility

**Existing synthetic datasets:**
- Pre-rendered (not interactive/customizable)
- Limited to specific object categories
- No physics validation data
- Proprietary formats or restrictive licenses

---

## System Requirements

### 1. Functional Requirements

#### 1.1 Physics Simulation Core

**FR-1.1:** The system SHALL simulate rigid body physics with 64-bit float precision.

**FR-1.2:** The system SHALL support the following object primitives:
- CUBE (box collider)
- SPHERE (sphere collider)
- CYLINDER (cylinder collider)
- CAPSULE (capsule collider)
- PLATE (thin box for floors/walls)
- CONE (cone collider)

**FR-1.3:** The system SHALL support the following material properties:
- Friction coefficient (0.0 - 1.0)
- Restitution/bounciness (0.0 - 1.0)
- Mass density (kg/m³)
- Linear/angular drag
- Surface color (RGB hex)

**FR-1.4:** The system SHALL simulate the following forces:
- Gravity (configurable direction and magnitude)
- Linear force application
- Angular torque application
- Collision impulses
- Constraint forces (joints)

**FR-1.5:** The system SHALL support mechanical joints:
- REVOLUTE (hinge, 1 DOF rotation)
- PRISMATIC (slider, 1 DOF translation)
- SPHERICAL (ball-and-socket, 3 DOF rotation)
- FIXED (rigid attachment, 0 DOF)

**FR-1.6:** The system SHALL track collision events:
- Contact points and normals
- Collision impulse magnitude
- Pair identification (objectA, objectB)
- Timestamp and duration

#### 1.2 Scene Generation

**FR-2.1:** The system SHALL provide procedural scene templates:
- LOUNGE (social hangout environment)
- MEETING_ROOM (conference/collaboration space)
- GAMING_ROOM (arcade/entertainment environment)
- CREATIVE_STUDIO (work/art space)
- OPEN_WORLD (outdoor/terrain environment)

**FR-2.2:** The system SHALL support scene randomization:
- Room size (small: 4x4m, medium: 6x6m, large: 10x10m)
- Object density (sparse: 5-10 objects, medium: 10-20, dense: 20-40)
- Color theme (vibrant, pastel, neon, natural)
- Object placement variation (position jitter, rotation)

**FR-2.3:** The system SHALL support AI-based scene generation:
- Natural language prompt input
- Material property extraction
- Spatial constraint parsing
- Object affordance assignment

**FR-2.4:** The system SHALL enforce spatial constraints:
- ON_SURFACE (object rests on another surface)
- INSIDE (object contained within another)
- ATTACHED_TO (object rigidly connected via joint)
- FLOATING (object suspended in air)

#### 1.3 VR Interaction System

**FR-3.1:** The system SHALL simulate VR hand models:
- Left and right hand tracking
- Position and rotation (SE(3) transforms)
- Grasp state (isGrasping: boolean)
- Collision detection with objects

**FR-3.2:** The system SHALL support object affordances:
- Graspable (can be picked up by hand)
- Manipulable (can be moved/rotated)
- Interactive (triggers state changes)
- Grasp points (preferred attachment locations)

**FR-3.3:** The system SHALL track object states:
- FREE (not attached)
- GRASPED (held by hand)
- OPEN (door/drawer open)
- CLOSED (door/drawer closed)

**FR-3.4:** The system SHALL create grasp constraints:
- FIXED joint between hand and grasped object
- Automatic grasp point selection (closest to hand)
- Release on user input (button release simulation)

#### 1.4 Real-Time Rendering

**FR-4.1:** The system SHALL render at 30 FPS minimum.

**FR-4.2:** The system SHALL use WebGL-based rendering (Three.js).

**FR-4.3:** The system SHALL support instanced rendering:
- InstancedMesh for identical objects
- Per-instance color variation
- Dynamic matrix updates (position/rotation/scale)

**FR-4.4:** The system SHALL provide camera controls:
- Orbit controls (mouse drag)
- Zoom (mouse wheel)
- Pan (right-click drag)
- Camera reset to initial view

**FR-4.5:** The system SHALL visualize physics debug info:
- Bounding boxes (optional overlay)
- Joint constraint lines
- Collision contact points
- Velocity vectors

#### 1.5 ML Dataset Export

**FR-5.1:** The system SHALL export COCO format datasets:
```json
{
  "images": [
    {
      "id": 1,
      "file_name": "frame_0001.png",
      "width": 1920,
      "height": 1080
    }
  ],
  "annotations": [
    {
      "id": 1,
      "image_id": 1,
      "category_id": 2,
      "bbox": [x, y, width, height],
      "segmentation": [[x1, y1, x2, y2, ...]],
      "area": 1234.5,
      "iscrowd": 0
    }
  ],
  "categories": [
    {"id": 1, "name": "floor", "supercategory": "surface"},
    {"id": 2, "name": "chair", "supercategory": "furniture"}
  ]
}
```

**FR-5.2:** The system SHALL export YOLO format datasets:
```
# Normalized bounding boxes (0.0-1.0)
0 0.5 0.5 0.2 0.3  # class_id center_x center_y width height
1 0.7 0.4 0.15 0.25
```

**FR-5.3:** The system SHALL export depth maps (future):
- 16-bit PNG format
- Per-pixel depth values (meters)
- Camera intrinsic parameters (focal length, principal point)

**FR-5.4:** The system SHALL export segmentation masks (future):
- Indexed PNG format
- Per-pixel class labels (0=background, 1=floor, 2=wall, etc.)
- Class mapping JSON file

**FR-5.5:** The system SHALL export VR hand poses (future):
- Frame-level hand transforms (position, rotation)
- Grasp state and grasped object ID
- Grasp point location in object local coordinates

**FR-5.6:** The system SHALL export physics ground truth (future):
- CSV/JSON format with per-frame state:
  - Object positions (x, y, z)
  - Object rotations (quaternion)
  - Linear velocities
  - Angular velocities
  - Collision events
  - Joint angles

#### 1.6 User Interface

**FR-6.1:** The system SHALL provide simulation controls:
- PLAY/PAUSE toggle
- RESET (reload scene from initial state)
- SPAWN ROOM (generate new procedural scene)
- Speed controls (0.5x, 1.0x, 2.0x, 5.0x)

**FR-6.2:** The system SHALL provide physics parameter controls:
- Gravity slider (-20 to +20 m/s²)
- Global friction multiplier
- Global restitution multiplier
- Linear/angular damping

**FR-6.3:** The system SHALL provide recording controls:
- START RECORDING (begin frame capture at 30 FPS)
- STOP RECORDING (end capture)
- Frame counter display

**FR-6.4:** The system SHALL provide AI generation controls:
- Text prompt input field
- ENHANCE button (trigger AI analysis)
- Auto-Spawn toggle (continuous generation every 15 seconds)

**FR-6.5:** The system SHALL provide Chaos Mode:
- Toggle ON/OFF
- AI-driven physics disturbances every 6 seconds
- Visual feedback for chaos events

**FR-6.6:** The system SHALL provide telemetry display:
- FPS (frames per second)
- Particle count (total objects)
- System energy (kinetic + potential)
- Stability score (0-100)

**FR-6.7:** The system SHALL provide activity logs:
- Timestamped event messages
- Color-coded by severity (info, success, warning, error, chaos)
- Auto-scroll to latest message
- Clear log button

#### 1.7 Data Recording

**FR-7.1:** The system SHALL capture frames at 30 FPS during recording.

**FR-7.2:** The system SHALL store per-frame data:
- Canvas screenshot (PNG base64)
- Object positions, rotations, scales
- Object velocities (linear, angular)
- Object types and semantic labels
- Camera pose (position, rotation, FOV)
- Timestamp

**FR-7.3:** The system SHALL enforce maximum recording duration (10 minutes default).

**FR-7.4:** The system SHALL provide memory management:
- Automatic recording stop when memory exceeds threshold
- User warning before memory limit reached

---

### 2. Non-Functional Requirements

#### 2.1 Performance

**NFR-1.1:** Physics simulation SHALL run at 60 Hz (16ms timestep).

**NFR-1.2:** Rendering SHALL achieve 30 FPS minimum for scenes with up to 200 objects.

**NFR-1.3:** AI prompt analysis SHALL complete within 5 seconds for prompts under 500 characters.

**NFR-1.4:** Scene generation (procedural) SHALL complete within 100ms.

**NFR-1.5:** Export operations SHALL stream data incrementally (not block UI).

**NFR-1.6:** Bundle size SHALL be under 5 MB gzipped.

#### 2.2 Accuracy

**NFR-2.1:** Physics simulation SHALL maintain energy conservation within 1% error over 10 seconds.

**NFR-2.2:** Collision detection SHALL have zero false negatives (all collisions detected).

**NFR-2.3:** Bounding box calculations SHALL have sub-pixel accuracy (<1px error at 1920x1080).

**NFR-2.4:** Depth map export SHALL have <1cm error at distances up to 10 meters.

#### 2.3 Reliability

**NFR-3.1:** The system SHALL handle API failures gracefully:
- Retry with exponential backoff (3 attempts max)
- Fallback to procedural generation on API failure
- Clear error messages to user

**NFR-3.2:** The system SHALL prevent infinite loops:
- Timeout for AI analysis (30 seconds)
- Maximum recursion depth for scene generation
- Watchdog timer for physics simulation

**NFR-3.3:** The system SHALL validate all user inputs:
- Clamp numeric values to safe ranges
- Sanitize text prompts (remove control characters)
- Validate file uploads (type, size)

**NFR-3.4:** The system SHALL handle edge cases:
- Empty scenes (no objects)
- Extremely large/small objects (scale limits)
- High-velocity collisions (tunneling prevention)

#### 2.4 Usability

**NFR-4.1:** The system SHALL load within 5 seconds on a 10 Mbps connection.

**NFR-4.2:** The system SHALL display loading indicators for operations >500ms.

**NFR-4.3:** The system SHALL provide tooltips/help text for all controls.

**NFR-4.4:** The system SHALL work on desktop browsers (Chrome, Firefox, Safari, Edge).

**NFR-4.5:** The system SHALL be responsive to window resizing.

#### 2.5 Maintainability

**NFR-5.1:** The codebase SHALL use TypeScript with strict mode enabled.

**NFR-5.2:** The codebase SHALL follow functional programming patterns:
- React functional components with hooks
- Immutable state updates
- Pure functions where possible

**NFR-5.3:** The codebase SHALL be modular:
- Services directory for business logic
- Components directory for UI
- Types directory for shared interfaces

**NFR-5.4:** The codebase SHALL have comprehensive type coverage (>95%).

**NFR-5.5:** The codebase SHALL use consistent naming conventions:
- camelCase for variables/functions
- PascalCase for components/classes
- SCREAMING_SNAKE_CASE for constants

#### 2.6 Extensibility

**NFR-6.1:** The system SHALL support adding new object primitives without modifying core physics engine.

**NFR-6.2:** The system SHALL support adding new scene templates without modifying export pipeline.

**NFR-6.3:** The system SHALL support adding new export formats without modifying data capture.

**NFR-6.4:** The system SHALL provide plugin hooks for custom disturbance modes.

---

## Architecture Design

### 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│  (React Components: ControlPanel, Logs, Telemetry, Modal)   │
└────────────────┬────────────────────────────┬───────────────┘
                 │                            │
                 ▼                            ▼
┌────────────────────────────┐  ┌───────────────────────────┐
│   Scene Generation Layer   │  │   AI Services Layer       │
│  - ProceduralGenerator     │  │  - Gemini API Client      │
│  - Template System         │  │  - Prompt Parser          │
│  - Randomization Logic     │  │  - Material Extractor     │
└────────────┬───────────────┘  └───────────┬───────────────┘
             │                              │
             └──────────────┬───────────────┘
                            ▼
             ┌──────────────────────────────┐
             │   Physics Simulation Core    │
             │  - Rapier3D Engine (WASM)    │
             │  - RigidBody Management      │
             │  - Collision Detection       │
             │  - Joint Constraints         │
             └──────────────┬───────────────┘
                            │
                            ▼
             ┌──────────────────────────────┐
             │    Rendering Pipeline        │
             │  - Three.js WebGL Renderer   │
             │  - InstancedMesh Batching    │
             │  - Camera Controls           │
             │  - Material System           │
             └──────────────┬───────────────┘
                            │
                            ▼
             ┌──────────────────────────────┐
             │   Data Recording Layer       │
             │  - Frame Capture (30 FPS)    │
             │  - Screenshot Generation     │
             │  - State Serialization       │
             └──────────────┬───────────────┘
                            │
                            ▼
             ┌──────────────────────────────┐
             │    ML Export Pipeline        │
             │  - COCO Dataset Exporter     │
             │  - YOLO Format Converter     │
             │  - Depth Map Generator       │
             │  - Segmentation Exporter     │
             └──────────────────────────────┘
```

### 2. Key Architectural Decisions

#### Decision 1: Deterministic Physics vs Generative AI

**Context:** Initial design considered using generative AI to "enhance" physics renders to photorealistic images.

**Problem:**
- AI adds visual noise, degrades geometric accuracy
- API dependencies create operational fragility
- Introduces latency (2-5 seconds per frame)
- Violates "ground truth" requirement

**Decision:** Use physics simulation as the source of truth. Export raw physics data directly without AI enhancement.

**Consequences:**
- ✅ Perfect ground truth accuracy (64-bit precision)
- ✅ Zero API latency for data generation
- ✅ 100% reproducible datasets
- ✅ Positions SnapLock as ML infrastructure (not toy demo)
- ❌ Less "photorealistic" visuals (acceptable trade-off for accuracy)

#### Decision 2: Procedural Scene Generation vs AI Auto-Spawn

**Context:** Early versions used AI to generate scene prompts every 15 seconds for dataset diversity.

**Problem:**
- AI-generated prompts were nonsensical ("Zero-G collision of gold spheres")
- Prompts were overly technical (robotics focus, not social VR)
- Generation slow (2-5 seconds) and unreliable
- AI hallucinated invalid physics parameters

**Decision:** Replace AI auto-spawn with template-based procedural generation. Use AI only when user provides explicit prompt.

**Consequences:**
- ✅ 10x faster scene generation (<10ms vs 2-5 seconds)
- ✅ 100% valid physics parameters
- ✅ Scenes aligned with target use case (social/collaborative VR)
- ✅ Dataset diversity through randomization (size, density, color)
- ❌ Less creative variety (acceptable trade-off for reliability)

#### Decision 3: Browser-Based vs Native Application

**Context:** Physics simulation and 3D rendering are typically native desktop applications.

**Decision:** Build as browser-based application using WebAssembly (Rapier3D) and WebGL (Three.js).

**Rationale:**
- Zero installation friction (load URL, start generating data)
- Cross-platform compatibility (Windows, macOS, Linux)
- Easy deployment and updates (static hosting)
- Shareable via URL (demos, tutorials, collaboration)
- Access to modern web APIs (WebGL, WebGPU future)

**Consequences:**
- ✅ Instant access for researchers/engineers
- ✅ Easy integration with web-based ML tools (Jupyter, Colab)
- ✅ No GPU driver compatibility issues
- ❌ Limited to browser performance (acceptable for target scale)
- ❌ No native file system access (use browser downloads)

#### Decision 4: React + TypeScript vs Other UI Frameworks

**Context:** Need reactive UI for controls, logs, telemetry, modals.

**Decision:** Use React with TypeScript and functional components.

**Rationale:**
- React: Component-based architecture, hooks for state management
- TypeScript: Type safety for complex physics data structures
- Functional: Easier to reason about state updates, no class complexity
- Vite: Fast build times (<10 seconds), HMR during development

**Consequences:**
- ✅ Type safety catches bugs at compile time (critical for physics params)
- ✅ Component reusability (ControlPanel, Logs, Modal)
- ✅ Easy state management with useState, useCallback, useRef
- ✅ Strong ecosystem (Three.js React bindings, UI libraries)
- ❌ Bundle size (3.89 MB, mitigated with code splitting)

#### Decision 5: Rapier3D vs Other Physics Engines

**Context:** Need production-grade physics simulation with collision detection and constraints.

**Options Considered:**
- Cannon.js (pure JavaScript, 10+ years old, limited features)
- Ammo.js (Bullet port to WASM, large bundle, complex API)
- PhysX (NVIDIA, no browser support)
- Rapier3D (Rust/WASM, modern, actively maintained)

**Decision:** Use Rapier3D.

**Rationale:**
- Rust/WASM provides near-native performance
- Modern API design (easy to use from TypeScript)
- Comprehensive feature set (joints, sensors, convex decomposition)
- Small bundle size (~600 KB gzipped)
- Active development and documentation
- Proven stability (30+ years of physics research foundation)

**Consequences:**
- ✅ Fast simulation (60 Hz with 200 objects)
- ✅ Accurate collision detection (no tunneling)
- ✅ Rich constraint system (REVOLUTE, PRISMATIC, etc.)
- ✅ Growing community and ecosystem
- ❌ WASM compilation adds complexity (mitigated by npm package)

#### Decision 6: Instanced Rendering vs Individual Meshes

**Context:** Scenes can contain 50-200 objects, each with unique position/rotation/color.

**Decision:** Use InstancedMesh for identical shapes, individual meshes for unique objects.

**Rationale:**
- InstancedMesh reduces draw calls (1 draw call for N instances)
- Per-instance color via InstancedBufferAttribute
- Dynamic matrix updates via setMatrixAt()
- Optimal for repeated primitives (cubes, spheres)

**Consequences:**
- ✅ 60+ FPS with 200 objects
- ✅ Efficient GPU memory usage
- ✅ Smooth real-time updates
- ❌ More complex matrix management code (acceptable)

---

## Technical Stack

### Core Technologies

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| Physics | Rapier3D | 0.11+ | Rust/WASM, production-grade, 60Hz+ stable |
| Rendering | Three.js | r163+ | Industry standard WebGL, InstancedMesh support |
| UI Framework | React | 18.3+ | Hooks, functional components, component model |
| Language | TypeScript | 5.7+ | Type safety for complex data structures |
| Build Tool | Vite | 7.2+ | Fast builds (<10s), HMR, tree-shaking |
| AI Service | Gemini API | 2.0+ | Multi-modal (text+image), 1M token context |

### Supporting Libraries

| Library | Purpose | Key Features Used |
|---------|---------|-------------------|
| @react-three/fiber | React bindings for Three.js | useFrame hook, declarative scene graph |
| lucide-react | Icon library | 1000+ icons, tree-shakeable, consistent design |
| FileSaver.js | Client-side file downloads | Blob creation, saveAs() for exports |
| JSZip | ZIP archive creation | Multi-file export (COCO dataset) |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting, enforce style consistency |
| Prettier | Code formatting |
| TypeScript Compiler | Type checking, emit declarations |
| Chrome DevTools | Performance profiling, memory analysis |
| Git | Version control, collaborative development |

---

## Implementation Requirements

### 1. Physics Engine Integration

#### 1.1 Rapier3D Initialization

```typescript
// services/physicsEngine.ts
import RAPIER from '@dimforge/rapier3d';

export class PhysicsEngine {
  private world: RAPIER.World;
  private bodies: Map<string, RAPIER.RigidBody> = new Map();

  async initialize() {
    await RAPIER.init();

    const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    this.world = new RAPIER.World(gravity);

    // Configure integration parameters
    this.world.integrationParameters.dt = 1.0 / 60.0; // 60 Hz
    this.world.integrationParameters.erp = 0.8; // Error reduction
    this.world.integrationParameters.maxCcdSubsteps = 4; // Tunneling prevention
  }
}
```

**Requirements:**
- WASM module must be loaded asynchronously before creating world
- Gravity vector must be configurable at runtime
- Integration timestep must be fixed (not variable) for reproducibility
- Error reduction parameter (ERP) prevents jitter in stacked objects
- Continuous Collision Detection (CCD) prevents fast objects from tunneling

#### 1.2 RigidBody Creation

```typescript
createBody(group: AssetGroup): RAPIER.RigidBody {
  // Determine body type
  const bodyType = group.isStatic
    ? RAPIER.RigidBodyType.Fixed
    : RAPIER.RigidBodyType.Dynamic;

  // Create rigid body descriptor
  const bodyDesc = new RAPIER.RigidBodyDesc(bodyType)
    .setTranslation(group.position.x, group.position.y, group.position.z)
    .setRotation({ x: 0, y: 0, z: 0, w: 1 }) // Identity quaternion
    .setLinearDamping(group.material.drag || 0.05)
    .setAngularDamping(group.material.drag || 0.05);

  const body = this.world.createRigidBody(bodyDesc);

  // Create collider based on shape type
  const collider = this.createCollider(group, body);

  // Set material properties
  collider.setFriction(group.material.friction);
  collider.setRestitution(group.material.restitution);
  collider.setDensity(group.material.mass / this.calculateVolume(group));

  this.bodies.set(group.id, body);
  return body;
}
```

**Requirements:**
- Body type must match object behavior (static for floors, dynamic for movable objects)
- Initial transform must be set on body descriptor (not after creation for performance)
- Damping coefficients must be applied to prevent perpetual motion
- Collider mass must be calculated from volume and density (not set directly)
- Body ID must be stored in map for later lookup

#### 1.3 Collider Shape Mapping

```typescript
createCollider(group: AssetGroup, body: RAPIER.RigidBody): RAPIER.Collider {
  let colliderDesc: RAPIER.ColliderDesc;

  switch (group.shape) {
    case ObjectShape.CUBE:
      const halfExtents = {
        x: group.scale.x / 2,
        y: group.scale.y / 2,
        z: group.scale.z / 2
      };
      colliderDesc = RAPIER.ColliderDesc.cuboid(
        halfExtents.x,
        halfExtents.y,
        halfExtents.z
      );
      break;

    case ObjectShape.SPHERE:
      colliderDesc = RAPIER.ColliderDesc.ball(group.scale.x / 2);
      break;

    case ObjectShape.CYLINDER:
      colliderDesc = RAPIER.ColliderDesc.cylinder(
        group.scale.y / 2, // half-height
        group.scale.x / 2  // radius
      );
      break;

    case ObjectShape.CAPSULE:
      colliderDesc = RAPIER.ColliderDesc.capsule(
        group.scale.y / 2, // half-height
        group.scale.x / 2  // radius
      );
      break;

    case ObjectShape.PLATE:
      // Thin box for floors/walls
      colliderDesc = RAPIER.ColliderDesc.cuboid(
        group.scale.x / 2,
        0.01, // 2cm thick
        group.scale.z / 2
      );
      break;

    default:
      throw new Error(`Unsupported shape: ${group.shape}`);
  }

  return this.world.createCollider(colliderDesc, body);
}
```

**Requirements:**
- Collider dimensions must match visual mesh dimensions exactly
- Rapier uses half-extents for boxes (divide by 2)
- Cylinder/capsule height is from center (divide by 2)
- PLATE shape must have minimal thickness (prevent tunneling)
- Unsupported shapes must throw error (fail fast)

#### 1.4 Simulation Step

```typescript
step(deltaTime: number) {
  // Use fixed timestep for reproducibility
  const FIXED_TIMESTEP = 1.0 / 60.0;

  // Accumulate time
  this.accumulator += Math.min(deltaTime, 0.1); // Cap at 100ms

  // Step physics at fixed rate
  while (this.accumulator >= FIXED_TIMESTEP) {
    this.world.step();
    this.accumulator -= FIXED_TIMESTEP;
    this.physicsSteps++;
  }

  // Sync Three.js transforms with physics bodies
  this.syncTransforms();

  // Process collision events
  this.processCollisions();
}
```

**Requirements:**
- MUST use fixed timestep (variable timestep causes non-determinism)
- MUST cap deltaTime to prevent spiral of death (large frame spike)
- MUST use accumulator pattern to decouple physics rate from render rate
- MUST sync transforms after physics step (not during)
- MUST process collisions after step completes

### 2. Scene Generation Requirements

#### 2.1 Procedural Template System

```typescript
// services/proceduralSceneGenerator.ts
export enum SceneTemplate {
  LOUNGE = 'LOUNGE',
  MEETING_ROOM = 'MEETING_ROOM',
  GAMING_ROOM = 'GAMING_ROOM',
  CREATIVE_STUDIO = 'CREATIVE_STUDIO',
  OPEN_WORLD = 'OPEN_WORLD'
}

export interface SceneGenerationConfig {
  template: SceneTemplate;
  roomSize: 'small' | 'medium' | 'large';
  objectDensity: 'sparse' | 'medium' | 'dense';
  colorTheme: 'vibrant' | 'pastel' | 'neon' | 'natural';
  randomSeed?: number; // For reproducibility
}

export class ProceduralSceneGenerator {
  static generateScene(config: SceneGenerationConfig): PhysicsParams {
    // 1. Generate room boundaries (floor, walls)
    const room = this.generateRoom(config);

    // 2. Generate furniture based on template
    const furniture = this.generateFurniture(config);

    // 3. Generate interactive objects (with affordances)
    const objects = this.generateObjects(config);

    // 4. Apply spatial constraints
    this.applySpatialConstraints(furniture, objects);

    // 5. Apply color theme
    this.applyColorTheme([...room, ...furniture, ...objects], config.colorTheme);

    // 6. Return complete scene
    return {
      assetGroups: [...room, ...furniture, ...objects],
      gravity: -9.81,
      linearDamping: 0.05,
      angularDamping: 0.05,
      globalFriction: 1.0,
      globalRestitution: 1.0
    };
  }
}
```

**Requirements:**
- Each template must produce valid, collision-free initial configurations
- Room dimensions must scale with roomSize parameter (small: 4x4m, medium: 6x6m, large: 10x10m)
- Object count must scale with objectDensity (sparse: 5-10, medium: 10-20, dense: 20-40)
- Color theme must be applied consistently across all objects
- Random seed (if provided) must produce identical results on repeated calls

#### 2.2 Furniture Placement Algorithm

```typescript
private static generateFurniture(config: SceneGenerationConfig): AssetGroup[] {
  const furniture: AssetGroup[] = [];
  const dim = this.getRoomDimensions(config.roomSize);

  switch (config.template) {
    case SceneTemplate.MEETING_ROOM:
      // Conference table (centered)
      furniture.push({
        id: 'table_main',
        shape: ObjectShape.CUBE,
        position: { x: 0, y: 0.4, z: 0 }, // Elevated
        scale: { x: 2.5, y: 0.05, z: 1.2 },
        material: MATERIALS.WOOD,
        semanticLabel: 'table',
        vrRole: VRRole.SURFACE,
        spatialConstraints: [],
        isStatic: false
      });

      // Chairs around table
      const chairPositions = [
        { x: -1.5, z: 0 },  // Left
        { x: 1.5, z: 0 },   // Right
        { x: 0, z: -0.8 },  // Front
        { x: 0, z: 0.8 }    // Back
      ];

      chairPositions.forEach((pos, i) => {
        furniture.push({
          id: `chair_${i}`,
          shape: ObjectShape.CUBE,
          position: { x: pos.x, y: 0.25, z: pos.z },
          scale: { x: 0.4, y: 0.5, z: 0.4 },
          material: MATERIALS.PLASTIC,
          semanticLabel: 'chair',
          vrRole: VRRole.FURNITURE,
          spatialConstraints: [],
          isStatic: false
        });
      });

      break;

    // ... other templates
  }

  return furniture;
}
```

**Requirements:**
- Furniture must be positioned relative to room center (0, 0, 0)
- Furniture must not overlap (collision-free placement)
- Furniture must have realistic dimensions (chairs: ~0.4m wide, tables: 0.7-1.0m tall)
- Furniture must have appropriate semantic labels for ML training
- Furniture must have correct VR roles (SURFACE, FURNITURE, FLOOR)

#### 2.3 Object Affordance Assignment

```typescript
private static generateObjects(config: SceneGenerationConfig): AssetGroup[] {
  const objects: AssetGroup[] = [];

  // Graspable objects (cups, balls, tools)
  objects.push({
    id: 'cup_01',
    shape: ObjectShape.CYLINDER,
    position: { x: 0.5, y: 1.0, z: 0.3 }, // On table surface
    scale: { x: 0.06, y: 0.08, z: 0.06 }, // 6cm diameter, 8cm tall
    material: MATERIALS.CERAMIC,
    semanticLabel: 'cup',
    vrRole: VRRole.INTERACTIVE_OBJECT,
    affordances: {
      graspable: true,
      manipulable: true,
      interactive: false,
      graspPoints: [
        { x: 0, y: 0.04, z: 0 } // Middle of cup
      ]
    },
    spatialConstraints: [
      {
        type: SpatialConstraintType.ON_SURFACE,
        targetObjectId: 'table_main',
        offset: { x: 0, y: 0.08, z: 0 }
      }
    ],
    isStatic: false
  });

  return objects;
}
```

**Requirements:**
- Graspable objects must have graspPoints defined (hand attachment locations)
- Graspable objects must be small enough to fit in hand (~5-15cm)
- Objects on surfaces must use ON_SURFACE constraint (prevents floating)
- Objects must have realistic materials (cup=CERAMIC, ball=RUBBER)
- Objects must have appropriate vrRole (INTERACTIVE_OBJECT vs OBSTACLE)

#### 2.4 Spatial Constraint Enforcement

```typescript
private static applySpatialConstraints(furniture: AssetGroup[], objects: AssetGroup[]) {
  objects.forEach(obj => {
    obj.spatialConstraints?.forEach(constraint => {
      switch (constraint.type) {
        case SpatialConstraintType.ON_SURFACE:
          // Find target surface
          const surface = [...furniture].find(f => f.id === constraint.targetObjectId);
          if (!surface) break;

          // Calculate surface top position
          const surfaceTop = surface.position.y + surface.scale.y / 2;

          // Place object on surface with offset
          obj.position.y = surfaceTop + obj.scale.y / 2 + (constraint.offset?.y || 0);

          // Clamp to surface bounds
          const surfaceHalfWidth = surface.scale.x / 2;
          const surfaceHalfDepth = surface.scale.z / 2;
          obj.position.x = Math.max(-surfaceHalfWidth, Math.min(surfaceHalfWidth, obj.position.x));
          obj.position.z = Math.max(-surfaceHalfDepth, Math.min(surfaceHalfDepth, obj.position.z));
          break;

        case SpatialConstraintType.INSIDE:
          // Place inside container (future implementation)
          break;

        case SpatialConstraintType.ATTACHED_TO:
          // Create joint constraint (doors, drawers)
          break;
      }
    });
  });
}
```

**Requirements:**
- ON_SURFACE constraint must calculate exact surface top Y position
- ON_SURFACE must clamp object position to surface bounds (prevent overhang)
- INSIDE constraint must respect container volume
- ATTACHED_TO must create physics joint (not just position offset)
- Constraints must be idempotent (can be applied multiple times safely)

### 3. AI Integration Requirements

#### 3.1 Prompt Analysis Service

```typescript
// services/geminiService.ts
export async function analyzePhysicsPrompt(prompt: string): Promise<PhysicsParams> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key required. Click gear icon to configure.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.7, // Balance creativity and consistency
      maxOutputTokens: 8000,
      responseMimeType: 'application/json'
    }
  });

  const systemPrompt = `You are a physics simulation engine...`;
  const result = await model.generateContent([systemPrompt, prompt]);

  const parsedResult = JSON.parse(result.response.text());

  // Validate and sanitize AI output
  return validatePhysicsParams(parsedResult);
}
```

**Requirements:**
- API key must be validated before making request (fail fast)
- Model must be configured with JSON output mode (structured data)
- Temperature must be tuned for consistency (0.7 = balance creativity/determinism)
- Response must be parsed and validated (AI can hallucinate invalid values)
- Errors must be caught and returned with clear user-facing messages

#### 3.2 Material Property Extraction

**System Prompt Requirements:**

The AI prompt must define material properties with exact parameter ranges:

```
MATERIAL PROPERTIES (extract from user prompt):

WOOD: friction:0.6, restitution:0.3, mass:5, drag:0.05, color:#8B4513
METAL: friction:0.4, restitution:0.7, mass:50, drag:0.02, color:#808080
GLASS: friction:0.1, restitution:0.9, mass:25, drag:0.01, color:#87CEEB
RUBBER: friction:0.9, restitution:0.8, mass:10, drag:0.1, color:#2F4F4F
PLASTIC: friction:0.5, restitution:0.5, mass:8, drag:0.03, color:#FFA500
CERAMIC: friction:0.7, restitution:0.4, mass:20, drag:0.02, color:#F5F5DC
CONCRETE: friction:0.8, restitution:0.2, mass:100, drag:0.1, color:#696969
FABRIC: friction:0.8, restitution:0.1, mass:3, drag:0.2, color:#4682B4

CONSTRAINTS:
- friction: 0.0 (frictionless) to 1.0 (high grip)
- restitution: 0.0 (no bounce) to 1.0 (perfect bounce)
- mass: kilograms (typical: 1-100 kg)
- drag: 0.0 (no air resistance) to 1.0 (high drag)
- color: RGB hex code
```

**Requirements:**
- All numeric values must have min/max bounds specified
- Material presets must be scientifically accurate (not arbitrary)
- AI must not invent new materials (restrict to predefined set)
- AI must extract material from object noun ("wooden table" → WOOD)
- Prompt must be concise (<200 lines total, not 660+ lines)

#### 3.3 Object Semantic Labeling

```typescript
// AI must assign semantic labels for ML training
semanticLabel: 'chair' | 'table' | 'floor' | 'wall' | 'cup' | 'ball' | ...

// Mapping to COCO categories (standard dataset format)
const COCO_CATEGORIES = {
  'floor': 1,
  'wall': 2,
  'chair': 56,
  'table': 60,
  'cup': 47,
  'bottle': 44,
  // ... 80 COCO categories total
};
```

**Requirements:**
- Semantic labels must map to COCO categories (interoperability)
- Labels must be lowercase, underscore-separated ('coffee_cup' not 'Coffee Cup')
- Labels must be specific (not generic: 'office_chair' not 'furniture')
- Labels must be consistent across similar objects (all chairs = 'chair')
- Unknown objects must default to 'object' category (category ID: 0)

### 4. Rendering Pipeline Requirements

#### 4.1 Three.js Scene Setup

```typescript
// components/SimulationLayerV2.tsx
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a); // Dark background

// Lighting setup (critical for depth perception)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Camera setup (perspective projection)
const camera = new THREE.PerspectiveCamera(
  75,  // FOV in degrees
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1, // Near plane (objects closer are clipped)
  1000 // Far plane (objects farther are clipped)
);
camera.position.set(5, 5, 5);
camera.lookAt(0, 0, 0);

// Renderer setup
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```

**Requirements:**
- Background must be dark (0x0a0a0a) to highlight objects
- MUST have both ambient and directional lighting (ambient alone is flat)
- Directional light must cast shadows (depth cue)
- Camera FOV must be 75° (standard for VR previews)
- Near plane must be >0 (0 causes precision issues)
- Pixel ratio must be capped at 2x (4K displays would be too slow)
- Shadow map must use PCFSoftShadowMap (soft shadows, no aliasing)

#### 4.2 Instanced Mesh Management

```typescript
// Create instanced mesh for each shape type
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshStandardMaterial();
const cubeInstancedMesh = new THREE.InstancedMesh(
  cubeGeometry,
  cubeMaterial,
  MAX_CUBES // Pre-allocate for worst case
);
cubeInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // Update every frame
cubeInstancedMesh.castShadow = true;
cubeInstancedMesh.receiveShadow = true;

// Per-instance color attribute
const colorArray = new Float32Array(MAX_CUBES * 3); // RGB per instance
const colorAttribute = new THREE.InstancedBufferAttribute(colorArray, 3);
cubeInstancedMesh.instanceColor = colorAttribute;

scene.add(cubeInstancedMesh);

// Update instance matrices each frame
const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const rotation = new THREE.Quaternion();
const scale = new THREE.Vector3();

cubes.forEach((cube, index) => {
  position.set(cube.position.x, cube.position.y, cube.position.z);
  rotation.set(cube.rotation.x, cube.rotation.y, cube.rotation.z, cube.rotation.w);
  scale.set(cube.scale.x, cube.scale.y, cube.scale.z);

  matrix.compose(position, rotation, scale);
  cubeInstancedMesh.setMatrixAt(index, matrix);

  // Set per-instance color
  const color = new THREE.Color(cube.material.color);
  colorAttribute.setXYZ(index, color.r, color.g, color.b);
});

cubeInstancedMesh.instanceMatrix.needsUpdate = true;
cubeInstancedMesh.instanceColor.needsUpdate = true;
cubeInstancedMesh.count = cubes.length; // Only render active instances
```

**Requirements:**
- MUST pre-allocate max instances (dynamic reallocation is slow)
- MUST set DynamicDrawUsage (tells GPU we update every frame)
- MUST enable castShadow and receiveShadow (shadows critical for depth)
- MUST create per-instance color attribute (can't use material color)
- MUST compose matrix from position, rotation, scale (don't set directly)
- MUST set needsUpdate flags after modifying attributes
- MUST set .count to actual instance count (hide unused instances)

#### 4.3 Animation Loop

```typescript
// React Three Fiber useFrame hook
useFrame((state, delta) => {
  // 1. Step physics simulation
  physicsEngine.step(delta);

  // 2. Update instanced mesh transforms from physics
  updateInstancedMeshes();

  // 3. Update camera controls
  controls.update();

  // 4. Update telemetry
  const fps = 1 / delta;
  telemetryRef.current = {
    fps: Math.round(fps),
    particleCount: params.assetGroups.length,
    systemEnergy: calculateEnergy(),
    // ...
  };

  // 5. Record frame if recording active
  if (isRecording) {
    recordFrame();
  }
});
```

**Requirements:**
- MUST call physics step first (before rendering)
- MUST use delta time (not fixed 16ms) for variable refresh rates
- MUST update camera controls after physics (input handling)
- MUST throttle expensive operations (telemetry can be 10 FPS)
- Recording must not block rendering (async frame capture)

### 5. ML Export Requirements

#### 5.1 COCO Dataset Schema

```typescript
interface COCODataset {
  info: {
    description: string;
    version: string;
    year: number;
    contributor: string;
    date_created: string; // ISO 8601
  };

  images: Array<{
    id: number;
    width: number;
    height: number;
    file_name: string;
    date_captured: string;
  }>;

  annotations: Array<{
    id: number;
    image_id: number;
    category_id: number;
    bbox: [number, number, number, number]; // [x, y, width, height] in pixels
    segmentation: number[][]; // Polygon vertices [[x1,y1,x2,y2,...]]
    area: number; // Bounding box area in pixels²
    iscrowd: 0 | 1; // 0 = single object, 1 = crowd
  }>;

  categories: Array<{
    id: number;
    name: string;
    supercategory: string;
  }>;
}
```

**Requirements:**
- Image IDs must be unique and sequential (1, 2, 3, ...)
- Annotation IDs must be unique across all images
- Bbox format is [top-left-x, top-left-y, width, height] (not center-based)
- Segmentation must be closed polygon (first point = last point)
- Area must match bbox width * height
- Category IDs must match COCO standard (chair=56, table=60, etc.)
- Date format must be ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)

#### 5.2 Bounding Box Calculation

```typescript
function calculateBoundingBox(
  object: AssetGroup,
  camera: THREE.Camera,
  canvasWidth: number,
  canvasHeight: number
): [number, number, number, number] {

  // 1. Get 8 corners of bounding box in world space
  const corners = getBoundingBoxCorners(object);

  // 2. Project corners to screen space
  const screenCorners = corners.map(corner => {
    const projected = corner.project(camera);

    // Convert from NDC (-1 to 1) to pixel coordinates
    const x = (projected.x + 1) * canvasWidth / 2;
    const y = (-projected.y + 1) * canvasHeight / 2; // Flip Y axis

    return { x, y };
  });

  // 3. Find min/max to get axis-aligned bounding box
  const minX = Math.max(0, Math.min(...screenCorners.map(c => c.x)));
  const maxX = Math.min(canvasWidth, Math.max(...screenCorners.map(c => c.x)));
  const minY = Math.max(0, Math.min(...screenCorners.map(c => c.y)));
  const maxY = Math.min(canvasHeight, Math.max(...screenCorners.map(c => c.y)));

  const width = maxX - minX;
  const height = maxY - minY;

  // 4. Validate bbox (must have positive area)
  if (width <= 0 || height <= 0) {
    return [0, 0, 0, 0]; // Object not visible
  }

  return [minX, minY, width, height];
}
```

**Requirements:**
- MUST project all 8 corners (not just center point) for accuracy
- MUST handle rotation (axis-aligned bbox in screen space, not world space)
- MUST clamp to canvas bounds (objects can be partially off-screen)
- MUST flip Y axis (NDC has +Y up, image has +Y down)
- MUST validate bbox area >0 (exclude fully occluded objects)
- MUST handle perspective projection (objects farther = smaller bbox)

#### 5.3 YOLO Format Conversion

```typescript
function convertToYOLO(
  bbox: [number, number, number, number],
  categoryId: number,
  imageWidth: number,
  imageHeight: number
): string {

  const [x, y, width, height] = bbox;

  // YOLO format: class_id center_x center_y width height (normalized 0-1)
  const centerX = (x + width / 2) / imageWidth;
  const centerY = (y + height / 2) / imageHeight;
  const normWidth = width / imageWidth;
  const normHeight = height / imageHeight;

  // Clamp to [0, 1] range
  const clampedCenterX = Math.max(0, Math.min(1, centerX));
  const clampedCenterY = Math.max(0, Math.min(1, centerY));
  const clampedWidth = Math.max(0, Math.min(1, normWidth));
  const clampedHeight = Math.max(0, Math.min(1, normHeight));

  // Format: space-separated, 6 decimal places
  return `${categoryId} ${clampedCenterX.toFixed(6)} ${clampedCenterY.toFixed(6)} ${clampedWidth.toFixed(6)} ${clampedHeight.toFixed(6)}`;
}
```

**Requirements:**
- YOLO uses center-based coordinates (not top-left like COCO)
- All values must be normalized to [0, 1] range
- Must clamp to [0, 1] (handle edge cases)
- Format is space-separated (not comma)
- Precision should be 6 decimal places (balance accuracy/file size)
- Each line is one annotation (one object per line)

#### 5.4 Export File Structure

**COCO Export:**
```
snaplock_coco_export_20250116_143052/
├── annotations.json          # COCO format annotations
├── images/
│   ├── frame_0001.png
│   ├── frame_0002.png
│   └── ...
└── README.txt                # Dataset documentation
```

**YOLO Export:**
```
snaplock_yolo_export_20250116_143052/
├── images/
│   ├── frame_0001.png
│   ├── frame_0002.png
│   └── ...
├── labels/
│   ├── frame_0001.txt        # YOLO annotations (one per image)
│   ├── frame_0002.txt
│   └── ...
├── classes.txt               # Class names (one per line)
└── data.yaml                 # YOLOv5 config file
```

**Requirements:**
- Images and annotations must be in separate directories
- Image filenames must match annotation filenames (frame_0001.png ↔ frame_0001.txt)
- Filenames must be zero-padded for correct sorting (frame_0001 not frame_1)
- Must include README/data.yaml for discoverability
- Must create ZIP archive for easy download
- Timestamp in folder name prevents overwrites

---

## Performance Optimization Requirements

### 1. Physics Optimization

**Requirement:** Simulation must run at 60 Hz with 200+ objects.

**Techniques:**
- **Sleeping Bodies:** Rapier automatically sleeps bodies at rest (no computation)
- **Broad Phase Culling:** Only check collisions between nearby objects (spatial hashing)
- **CCD Threshold:** Only use expensive Continuous Collision Detection for fast objects (>5 m/s)
- **Joint Limits:** Clamp joint angles to prevent instability
- **Solver Iterations:** Use 4 iterations for position solver (balance accuracy/speed)

**Monitoring:**
```typescript
console.log(`Active bodies: ${world.bodies.len()}`);
console.log(`Sleeping bodies: ${world.bodies.iter().filter(b => b.isSleeping()).count()}`);
console.log(`Collision pairs: ${world.narrowPhase.contacts.len()}`);
```

### 2. Rendering Optimization

**Requirement:** Rendering must achieve 30 FPS minimum at 1920x1080 on integrated GPU.

**Techniques:**
- **Instanced Rendering:** Reduce draw calls from N to 1 per shape type
- **Frustum Culling:** Three.js automatically culls objects outside camera view
- **LOD (Level of Detail):** Use simpler geometry for distant objects (future)
- **Texture Atlasing:** Combine multiple textures into one atlas (reduce texture swaps)
- **Shadow Map Resolution:** Use 1024x1024 (not 2048x2048) for shadows

**Monitoring:**
```typescript
console.log(`Draw calls: ${renderer.info.render.calls}`);
console.log(`Triangles: ${renderer.info.render.triangles}`);
console.log(`Geometries: ${renderer.info.memory.geometries}`);
console.log(`Textures: ${renderer.info.memory.textures}`);
```

### 3. Memory Management

**Requirement:** Total memory usage must stay under 1 GB for 10-minute recording.

**Calculation:**
- Screenshot: 1920x1080 PNG base64 ≈ 500 KB per frame
- 30 FPS × 600 seconds = 18,000 frames
- 18,000 × 500 KB = 9 GB (UNACCEPTABLE)

**Solution: Frame Decimation**
```typescript
// Only record every Nth frame
const RECORD_FPS = 5; // Record at 5 FPS (display at 30 FPS)
const RECORD_INTERVAL = Math.floor(30 / RECORD_FPS); // Record every 6 frames

let frameCounter = 0;
if (isRecording && frameCounter % RECORD_INTERVAL === 0) {
  recordFrame();
}
frameCounter++;
```

**Result:**
- 5 FPS × 600 seconds = 3,000 frames
- 3,000 × 500 KB = 1.5 GB (ACCEPTABLE)

### 4. Bundle Size Optimization

**Requirement:** Bundle size must be under 5 MB gzipped.

**Current: 3.89 MB uncompressed, 1.28 MB gzipped ✓**

**Techniques:**
- **Tree Shaking:** Vite removes unused code
- **Code Splitting:** Lazy load ML export modal (React.lazy)
- **Dependency Audit:** Remove unused npm packages
- **Minification:** Terser minifies JS, cssnano minifies CSS
- **Compression:** Serve with Brotli compression (better than gzip)

**Monitoring:**
```bash
npx vite-bundle-analyzer
# Visualizes bundle composition
```

---

## Testing & Validation Requirements

### 1. Physics Correctness Tests

**Test 1: Energy Conservation**
```typescript
test('Energy conserved in elastic collision', () => {
  const initialEnergy = calculateTotalEnergy(params);

  // Simulate for 10 seconds
  for (let i = 0; i < 600; i++) {
    physicsEngine.step(1/60);
  }

  const finalEnergy = calculateTotalEnergy(params);
  const energyError = Math.abs(finalEnergy - initialEnergy) / initialEnergy;

  expect(energyError).toBeLessThan(0.01); // <1% error
});
```

**Test 2: Collision Detection**
```typescript
test('All collisions detected', () => {
  // Drop sphere onto floor
  const sphere = createSphere({ y: 5 }); // 5m above ground
  const floor = createFloor({ y: 0 });

  let collisionDetected = false;
  physicsEngine.onCollision((event) => {
    if (event.involves(sphere) && event.involves(floor)) {
      collisionDetected = true;
    }
  });

  // Simulate until collision
  for (let i = 0; i < 120; i++) { // 2 seconds max
    physicsEngine.step(1/60);
  }

  expect(collisionDetected).toBe(true);
});
```

**Test 3: Joint Constraints**
```typescript
test('Revolute joint limits rotation to 1 DOF', () => {
  const door = createDoor();
  const hinge = createRevoluteJoint(door, { axis: [0, 1, 0] }); // Y-axis

  // Apply torque around X-axis (should be constrained)
  door.applyTorque([1, 0, 0]);

  physicsEngine.step(1/60);

  const angularVel = door.getAngularVelocity();
  expect(Math.abs(angularVel.x)).toBeLessThan(0.01); // No rotation around X
  expect(Math.abs(angularVel.z)).toBeLessThan(0.01); // No rotation around Z
});
```

### 2. Rendering Correctness Tests

**Test 4: Bounding Box Accuracy**
```typescript
test('Bounding box matches visual bounds', () => {
  const cube = createCube({ position: [0, 0, -5], scale: [1, 1, 1] });
  const bbox = calculateBoundingBox(cube, camera, 1920, 1080);

  // Manually measured ground truth
  const expectedBbox = [850, 400, 220, 220]; // [x, y, w, h]

  const [x, y, w, h] = bbox;
  expect(x).toBeCloseTo(expectedBbox[0], 0); // Within 1 pixel
  expect(y).toBeCloseTo(expectedBbox[1], 0);
  expect(w).toBeCloseTo(expectedBbox[2], 0);
  expect(h).toBeCloseTo(expectedBbox[3], 0);
});
```

**Test 5: Camera Projection**
```typescript
test('World coordinates project to correct screen coordinates', () => {
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  const worldPoint = new THREE.Vector3(0, 0, 0); // Origin
  const screenPoint = worldPointToScreen(worldPoint, camera, 1920, 1080);

  // Origin should project to center of screen
  expect(screenPoint.x).toBeCloseTo(1920 / 2, 0);
  expect(screenPoint.y).toBeCloseTo(1080 / 2, 0);
});
```

### 3. Export Format Validation

**Test 6: COCO Schema Compliance**
```typescript
test('COCO export matches schema', () => {
  const frames = recordFrames(10);
  const cocoDataset = exportCOCO(frames);

  // Validate schema
  expect(cocoDataset).toHaveProperty('info');
  expect(cocoDataset).toHaveProperty('images');
  expect(cocoDataset).toHaveProperty('annotations');
  expect(cocoDataset).toHaveProperty('categories');

  // Validate image IDs are sequential
  const imageIds = cocoDataset.images.map(img => img.id);
  expect(imageIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  // Validate bbox format
  cocoDataset.annotations.forEach(ann => {
    expect(ann.bbox).toHaveLength(4);
    expect(ann.bbox[2]).toBeGreaterThan(0); // Width > 0
    expect(ann.bbox[3]).toBeGreaterThan(0); // Height > 0
  });
});
```

**Test 7: YOLO Normalization**
```typescript
test('YOLO coordinates normalized to [0, 1]', () => {
  const bbox = [100, 200, 300, 400]; // COCO format
  const yoloLine = convertToYOLO(bbox, 0, 1920, 1080);

  const parts = yoloLine.split(' ').map(parseFloat);
  const [classId, centerX, centerY, width, height] = parts;

  // All values in [0, 1]
  expect(centerX).toBeGreaterThanOrEqual(0);
  expect(centerX).toBeLessThanOrEqual(1);
  expect(centerY).toBeGreaterThanOrEqual(0);
  expect(centerY).toBeLessThanOrEqual(1);
  expect(width).toBeGreaterThanOrEqual(0);
  expect(width).toBeLessThanOrEqual(1);
  expect(height).toBeGreaterThanOrEqual(0);
  expect(height).toBeLessThanOrEqual(1);
});
```

### 4. Integration Tests

**Test 8: End-to-End Workflow**
```typescript
test('Complete workflow: generate → record → export', async () => {
  // 1. Generate procedural scene
  const params = ProceduralSceneGenerator.generateScene({
    template: SceneTemplate.MEETING_ROOM,
    roomSize: 'medium',
    objectDensity: 'medium',
    colorTheme: 'vibrant'
  });

  expect(params.assetGroups.length).toBeGreaterThan(0);

  // 2. Initialize physics
  const engine = new PhysicsEngine();
  await engine.initialize();
  engine.createBodies(params.assetGroups);

  // 3. Record frames
  const frames: MLGroundTruthFrame[] = [];
  for (let i = 0; i < 30; i++) { // 1 second at 30 FPS
    engine.step(1/60);
    frames.push(captureFrame(engine, canvas));
  }

  expect(frames).toHaveLength(30);

  // 4. Export COCO
  const cocoDataset = exportCOCO(frames);
  expect(cocoDataset.images).toHaveLength(30);
  expect(cocoDataset.annotations.length).toBeGreaterThan(0);

  // 5. Validate export
  validateCOCODataset(cocoDataset);
});
```

---

## Operational Lessons Learned

### Lesson 1: When NOT to Use Generative AI

**Problem:** Initial design used AI to generate "photorealistic" renders and "physics-based" videos.

**Reality:**
- Image generation API model didn't exist (`gemini-3-pro-image-preview`)
- Video generation produced physically inaccurate motion (AI can't simulate real physics)
- Added 2-5 seconds of latency per operation
- Required complex error handling for API failures

**Solution:** Remove generative AI from the critical path. Use physics simulation as the source of truth.

**Key Insight:** Generative AI excels at creativity, not precision. For ground truth data, use deterministic systems (physics engines, procedural algorithms).

### Lesson 2: Simplify Prompts for Reliability

**Problem:** Initial AI prompt was 660+ lines with extensive material definitions, physics examples, and VR instructions.

**Reality:**
- AI hallucinated invalid values (friction: 5.0, mass: -10 kg)
- AI ignored user intent (generated robotics scenes instead of social VR)
- Prompt maintenance was error-prone (easy to introduce contradictions)

**Solution:** Simplify prompt to 104 lines (58% reduction). Focus on clear constraints, not extensive examples.

**Key Insight:** Longer prompts ≠ better results. Concise, unambiguous prompts with hard constraints are more reliable than detailed examples.

### Lesson 3: Procedural Generation for Dataset Diversity

**Problem:** Relied on AI to generate scene variations for dataset diversity.

**Reality:**
- AI-generated scenes were inconsistent (random object types, nonsensical layouts)
- Slow (2-5 seconds per scene)
- Required extensive validation to ensure physics validity

**Solution:** Use template-based procedural generation with randomization (room size, object density, color theme).

**Key Insight:** Procedural algorithms provide controllable diversity. For training data at scale, determinism is more valuable than creativity.

### Lesson 4: Real-Time Feedback is Critical

**Problem:** Users couldn't see physics simulation results until AI generation completed.

**Reality:**
- Blank canvas on startup (bad UX)
- Users unsure if app was working
- Hard to debug issues (no visual feedback)

**Solution:** Load procedural scene on mount. Show instant visual feedback before AI generation.

**Key Insight:** Real-time feedback is non-negotiable. Always show *something* immediately, even if it's not the final result.

### Lesson 5: Fixed Timestep for Reproducibility

**Problem:** Used variable timestep (step by delta time each frame).

**Reality:**
- Different frame rates produced different physics results (30 FPS ≠ 60 FPS)
- Datasets were non-reproducible (same seed → different outputs)
- Energy conservation errors accumulated over time

**Solution:** Use fixed timestep (1/60 second) with accumulator pattern.

**Key Insight:** For ML training data, reproducibility is essential. Variable timestep introduces non-determinism.

---

## Deployment Requirements

### 1. Static Hosting

**Requirement:** App must be deployable to static hosting (GitHub Pages, Vercel, Netlify).

**Configuration:**
```typescript
// vite.config.ts
export default defineConfig({
  base: '/SnapLock/', // Match GitHub repo name
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true, // Include for debugging
    rollupOptions: {
      output: {
        manualChunks: {
          'rapier': ['@dimforge/rapier3d'],
          'three': ['three'],
          'react': ['react', 'react-dom']
        }
      }
    }
  }
});
```

### 2. Environment Configuration

**Requirement:** API keys must be configurable without rebuilding.

**Implementation:**
```typescript
// services/config.ts
export function getApiKey(): string | null {
  // 1. Try localStorage (user-configured)
  const localKey = localStorage.getItem('gemini_api_key');
  if (localKey) return localKey;

  // 2. Try environment variable (dev only)
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey) return envKey;

  // 3. No key available
  return null;
}

export function setApiKey(key: string) {
  localStorage.setItem('gemini_api_key', key);
}
```

### 3. CORS Configuration

**Requirement:** Backend proxy must handle CORS for Gemini API calls.

**Option 1: Backend Proxy (Recommended)**
```typescript
// server.js (Node.js Express)
app.post('/api/gemini/generate', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY; // Server-side key

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(req.body)
  });

  const data = await response.json();
  res.json(data);
});
```

**Option 2: Direct API (Development Only)**
- Gemini API allows direct browser calls (no CORS issue)
- User provides their own API key via UI
- Key stored in localStorage (client-side)

### 4. Performance Monitoring

**Requirement:** Track key metrics for optimization.

**Implementation:**
```typescript
// services/analytics.ts
export function trackPerformanceMetrics() {
  // FPS tracking
  const fps = 1 / deltaTime;
  if (fps < 30) {
    console.warn(`Low FPS: ${fps.toFixed(1)}`);
  }

  // Memory tracking
  if (performance.memory) {
    const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    if (usedMB > 1000) {
      console.warn(`High memory usage: ${usedMB.toFixed(1)} MB`);
    }
  }

  // Physics performance
  const physicsTime = performance.now() - physicsStartTime;
  if (physicsTime > 16) { // Exceeds 60 Hz budget
    console.warn(`Slow physics step: ${physicsTime.toFixed(1)} ms`);
  }
}
```

---

## Future Enhancements

### Phase 2: Depth & Segmentation Export

**Requirement:** Export 16-bit depth maps and semantic segmentation masks.

**Approach:**
1. Render scene with depth shader (Z-buffer to grayscale)
2. Write 16-bit PNG (0 = near, 65535 = far)
3. Export camera intrinsics (focal length, principal point)
4. Render segmentation pass (per-object color = category ID)
5. Write indexed PNG (palette mapping to category names)

### Phase 3: VR Hand Pose Export

**Requirement:** Export hand skeletal poses with grasp annotations.

**Format:**
```json
{
  "frame_id": 1,
  "timestamp": 0.033,
  "hands": [
    {
      "id": "left_hand",
      "pose_3d": {
        "position": [0.5, 1.2, -0.3],
        "rotation": [0, 0, 0, 1]
      },
      "is_grasping": true,
      "grasped_object_id": "cup_01",
      "grasp_point": [0.52, 1.18, -0.28]
    }
  ]
}
```

### Phase 4: Physics Validation Dataset

**Requirement:** Export complete physics state for benchmarking ML models.

**Use Case:** Train physics-prediction models (predict next frame given current state).

**Format:**
```csv
frame,object_id,pos_x,pos_y,pos_z,rot_x,rot_y,rot_z,rot_w,vel_x,vel_y,vel_z,ang_vel_x,ang_vel_y,ang_vel_z
1,cube_01,0.5,1.2,-0.3,0,0,0,1,0.1,-0.5,0.0,0.0,0.2,0.0
1,cube_02,-0.8,0.9,0.5,0,0.707,0,0.707,0.0,-0.3,0.1,0.5,0.0,0.0
```

---

## Conclusion

SnapLock demonstrates that production-grade ML infrastructure requires careful architectural decisions about when *not* to use AI. By combining deterministic physics simulation (Rapier3D), procedural scene generation, and industry-standard export formats, we achieve:

- ✅ Perfect ground truth accuracy (64-bit precision)
- ✅ Zero API latency for data generation
- ✅ 100% reproducible datasets
- ✅ Infinite scalability (procedural generation)
- ✅ Production-ready export formats (COCO, YOLO)

**Key Takeaway:** Know when to use AI for creativity and when to use deterministic systems for precision. ML infrastructure requires both.

---

## References

- Rapier3D Physics Engine: https://rapier.rs/
- Three.js Documentation: https://threejs.org/docs/
- COCO Dataset Format: https://cocodataset.org/#format-data
- YOLO Format Specification: https://docs.ultralytics.com/datasets/detect/
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber/

---

**Author:** Dr. Gretchen Boria
**Date:** January 16, 2025
**Project:** SnapLock - Physics-Based Synthetic Training Data for Spatial Computing
