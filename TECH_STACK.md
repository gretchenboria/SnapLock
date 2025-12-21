# SnapLock Technical Stack Documentation

## Core Technologies

### Frontend Framework
- **React 18.3.1** - Component-based UI architecture
- **TypeScript 5.6.2** - Static type checking and enhanced code reliability
- **Vite 5.4.2** - Fast build tool with HMR (Hot Module Replacement)

### 3D Rendering & Graphics
- **Three.js r169** - WebGL rendering engine
- **@react-three/fiber 8.17.10** - React renderer for Three.js
- **@react-three/drei 9.114.3** - Helper utilities and abstractions
  - useGLTF: GLB/GLTF model loading
  - OrbitControls: Camera manipulation
  - Environment: HDR environment mapping
  - Stats: Performance monitoring

### Physics Simulation
- **@dimforge/rapier3d-compat 0.14.0** - High-performance physics engine
  - Rigid body dynamics
  - Collision detection (AABB, SAT algorithms)
  - Constraint solving
  - 120Hz fixed timestep simulation
  - WebAssembly-based for performance

### AI & Machine Learning
- **Google Gemini API** - AI-powered scene generation
  - Model: gemini-1.5-pro (reasoning, vision, video)
  - Model: gemini-2.0-flash-exp-image-generation (image generation)
  - Natural language to 3D scene conversion
  - Fallback scene generation on API failures

### UI Components
- **Lucide React 0.454.0** - Icon library
  - 1000+ consistent SVG icons
  - Tree-shakeable for bundle optimization

### Development Tools
- **Blender 4.x** - 3D content creation
  - Python API (bpy) for programmatic scene generation
  - GLB/GLTF export with animations
  - PBR material authoring

## Architecture Overview

### Hybrid Scene Graph System

SnapLock uses a dual-representation architecture combining traditional scene graphs with optimized instanced rendering:

**Scene.objects[]** - Individual tracked objects
- Full physics simulation per object
- Unique transforms and properties
- Used for hero objects and physics-critical entities

**AssetGroups[]** - Batched rendering groups
- Instanced rendering for performance
- Shared geometry and materials
- Spatial positioning system
- Domain randomization support

### Spatial Positioning System

**File**: `services/spatialPositioning.ts`

Automatic surface-aware object placement:
- Raycasting-based collision detection
- Gravity-aligned orientation
- Overlap prevention with AABB testing
- Floor, ceiling, and wall mounting support
- Configurable safety margins

**Integration points**:
- Procedural scene generation
- AI fallback scene generation
- Manual scene composition

### Physics Engine Architecture

**File**: `services/physicsEngineV2.ts`

**Fixed timestep simulation**:
```typescript
timeStep: 1/120 (120Hz)
maxSubsteps: 10
gravity: [0, -9.81, 0]
```

**Rigid body types**:
- Dynamic: Full physics simulation
- Kinematic: Animation-driven, affects others
- Fixed: Static environment objects

**Collision detection**:
- Continuous collision detection (CCD) for fast-moving objects
- Material-based friction and restitution
- Collision groups and masks for selective interaction

### Animation System

**File**: `services/animationEngine.ts`

**Capabilities**:
- Keyframe animation playback
- Behavior-based animation (loop, oneshot, pingpong)
- Blend tree support for smooth transitions
- GLB animation clip integration
- Kinematic physics sync for animated objects

**Animation flow**:
1. Register animation clips from GLB models
2. Register behaviors with start/end frames
3. Update loop applies transforms to physics bodies
4. Physics engine respects kinematic transforms

### Mesh Deformation System

**File**: `services/meshDeformationShaders.ts`

**GPU-accelerated vertex manipulation**:
- Custom GLSL vertex shaders
- Real-time deformation modes:
  - Wave: Sinusoidal surface waves
  - Twist: Helical rotation along axis
  - Bulge: Radial expansion/contraction
  - Ripple: Concentric wave patterns
- Per-vertex attribute manipulation
- Uniform-based parameter control

**Integration**: `components/AssetRenderer.tsx`
- shader.onBeforeCompile injection
- useFrame hook for time-based animation
- Preserved Three.js material properties

## Data Pipeline

### ML Dataset Export

**File**: `services/mlExportService.ts`

**Supported formats**:
- **COCO JSON** - Industry standard for object detection
  - Bounding boxes
  - Segmentation masks
  - Category annotations
  - Image metadata

- **YOLO TXT** - Ultralytics YOLOv5/v8 format
  - Normalized coordinates
  - Class-based organization
  - Train/val split support

**Export configuration**:
- 30 FPS frame capture
- Camera intrinsics preservation
- Automatic annotation from physics state
- Domain randomization metadata

### Domain Randomization

**Purpose**: Synthetic training data diversity

**Randomization parameters**:
- Material colors (HSV jitter)
- Lighting conditions (intensity, color temperature)
- Object positions and rotations
- Camera viewpoints
- Background variations
- Texture application

**Benefits**:
- Sim-to-real transfer learning
- Reduced overfitting to synthetic data
- Robust model training

## 3D Asset Pipeline

### Model Format: GLB/GLTF 2.0

**Why GLB**:
- Binary format (smaller file size)
- Self-contained (embedded textures/animations)
- PBR material support
- Animation and skinning support
- Industry standard (Khronos Group)

### Model Sources

**Official CDN repositories**:
- Three.js examples: `mrdoob/three.js/dev/examples/models/gltf/`
- Khronos glTF samples: `KhronosGroup/glTF-Sample-Models/master/2.0/`

**See**: `FREE_3D_MODELS_LIBRARY.md` for complete catalog

### Blender Integration

**Programmatic scene generation**:

**Scripts**:
- `create_robotic_arm.py` - 6-axis industrial robot
- `create_surgical_robot.py` - Da Vinci dual-arm system
- `create_autonomous_vehicle.py` - Self-driving car with sensors
- `create_drone.py` - Quadcopter with flight path

**Export settings**:
```python
bpy.ops.export_scene.gltf(
    export_format='GLB',
    export_animations=True,
    export_yup=True  # Three.js coordinate system
)
```

**Capabilities**:
- Hierarchical parent-child relationships
- Keyframe animation authoring
- Material and lighting setup
- Camera positioning
- Batch generation via `RUN_ALL_SCRIPTS.sh`

## Scene Generation Systems

### Procedural Generation

**File**: `services/proceduralSceneGenerator.ts`

**Scene types**:
- VR Lounge - Social VR environment with furniture
- Meeting Room - Conference table, chairs, whiteboards
- Gaming Room - Entertainment setup with screens
- Open World - Large-scale outdoor environment

**Generation process**:
1. Define scene template with spawn zones
2. Instantiate asset groups based on density parameter
3. Apply spatial positioning for surface placement
4. Configure physics bodies (dynamic/fixed)
5. Add domain randomization if enabled

**Density modes**:
- Sparse: 15-30 objects
- Medium: 30-60 objects
- Dense: 50-100 objects

### AI-Powered Generation

**File**: `services/geminiService.ts`

**Flow**:
1. User natural language prompt
2. Gemini API call with scene schema
3. JSON parsing and validation
4. Scene construction from AI response
5. Fallback to procedural on failure

**Prompt engineering**:
- Schema-guided generation
- Few-shot examples
- Constraint specification (physics, spatial)

## Rendering Pipeline

### Material System

**PBR (Physically-Based Rendering)**:
- Metalness workflow
- Roughness maps
- Normal mapping
- Ambient occlusion
- Environment mapping (HDR)

**Material types**:
- MeshStandardMaterial - General purpose PBR
- MeshPhysicalMaterial - Advanced glass/clearcoat
- MeshBasicMaterial - Unlit primitives
- ShaderMaterial - Custom GLSL shaders

### Lighting

**Environment lighting**:
- HDRI environment maps
- Image-based lighting (IBL)
- Physically-accurate light probes

**Direct lighting**:
- Area lights for soft shadows
- Sun lights for outdoor scenes
- Point/spot lights for focused illumination

### Performance Optimizations

**Instanced rendering**:
- Single draw call for repeated geometry
- Shared materials reduce state changes
- Matrix-based transforms (GPU-side)

**Level of detail (LOD)**:
- Distance-based geometry simplification
- Automatic mesh decimation
- Texture mipmap generation

**Culling**:
- Frustum culling (automatic in Three.js)
- Occlusion culling for complex scenes
- Bounding sphere optimizations

## State Management

### React State Architecture

**Global state** (App.tsx):
- Scene configuration
- Physics parameters
- ML export settings
- Recording state
- UI visibility toggles

**Component state**:
- SimulationLayerV2: Physics world, bodies, animations
- ControlPanel: UI form values, validation
- VideoPlayer: Playback state, frame seeking

**State flow**:
```
User Input -> App State Update -> Props to Components -> Effect Hooks -> Re-render
```

### Physics Synchronization

**React to Physics**:
- useEffect hooks watch state changes
- Rebuild physics world on scene change
- Apply parameter updates to existing bodies

**Physics to React**:
- useFrame hook reads physics state
- Transform updates propagate to Three.js
- Collision events trigger UI updates

## Performance Characteristics

### Target Metrics

- **Physics simulation**: 120 Hz (8.33ms per step)
- **Rendering**: 60 FPS (16.67ms per frame)
- **Animation update**: 30-60 FPS
- **ML export**: 30 FPS frame capture

### Bottlenecks

**Physics-bound scenarios**:
- High object counts (>500 rigid bodies)
- Complex collision geometries (concave meshes)
- Tight constraint networks

**Render-bound scenarios**:
- High polygon counts (>1M triangles)
- Many draw calls (>1000 objects)
- Complex shader effects

**Mitigation strategies**:
- Physics level of detail (sleeping bodies)
- Render batching (instanced rendering)
- Spatial partitioning (octree, BVH)

## Development Workflow

### Build System

**Vite configuration**:
- ESNext target for modern browsers
- Code splitting for lazy loading
- Asset optimization (images, models)
- Development server with HMR

### Type Safety

**TypeScript benefits**:
- Interface definitions for scenes, objects, physics
- Type-checked API responses
- Compile-time error detection
- Enhanced IDE autocomplete

### Testing Strategy

**Manual testing focus**:
- Physics simulation accuracy
- Visual rendering quality
- Performance profiling
- Cross-browser compatibility

## Deployment Considerations

### Browser Requirements

**WebGL 2.0 support required**:
- Chrome 56+
- Firefox 51+
- Safari 15+
- Edge 79+

**WebAssembly support required**:
- All modern browsers (2017+)

### Asset Hosting

**Static assets**:
- GLB models in `public/models/`
- Served directly via Vite dev server
- Production: CDN deployment recommended

**External assets**:
- Three.js/Khronos official CDNs
- Fallback to local copies on 404

## Security Considerations

**API key management**:
- Environment variables for Gemini API key
- Never commit keys to version control
- Rate limiting on AI generation endpoints

**Content validation**:
- Sanitize user prompts before AI submission
- JSON schema validation on AI responses
- Bounds checking on numeric parameters

## Future Extensibility

### Plugin Architecture Potential

- Custom physics behaviors
- Material shader library
- Scene template marketplace
- Animation blending presets

### WebXR Integration

- VR headset support (Meta Quest, PSVR2)
- AR passthrough mode
- Hand tracking input
- Spatial anchors

### Multiplayer Networking

- WebRTC peer-to-peer
- Authoritative server architecture
- State synchronization protocols
- Latency compensation techniques

## References

### Documentation Links

- Three.js: https://threejs.org/docs/
- Rapier.js: https://rapier.rs/docs/
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber/
- Gemini API: https://ai.google.dev/docs
- glTF Specification: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- Blender Python API: https://docs.blender.org/api/current/

### License Information

**SnapLock Project**: All rights reserved by repository owner

**Third-party dependencies**: See package.json for individual library licenses
- Three.js: MIT License
- React: MIT License
- Rapier.js: Apache 2.0
- GLB models: CC0, CC-BY 4.0 (see FREE_3D_MODELS_LIBRARY.md)

---

This technical stack enables SnapLock to provide high-performance 3D physics simulation, AI-powered scene generation, and ML training data export in a browser-based environment. The architecture prioritizes extensibility, performance, and developer experience while maintaining code quality through TypeScript and modern React patterns.
