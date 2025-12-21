# Scene Graph Architecture Guide

## Overview

SnapLock now supports **hybrid scene architecture** - the industry standard for ML training data generation. This enables realistic, diverse robotics and computer vision scenarios instead of just particle simulations.

## Two Approaches

### 1. Scene Graph (NEW - Recommended for ML)

Individual unique objects with full control over properties, materials, and metadata.

**Perfect for:**
- Robotics manipulation (robot + objects + environment)
- Surgical simulation (instruments + anatomy + robot)
- Warehouse automation (shelves + packages + robot)
- Any scenario needing diverse, realistic objects

**Example:**
```typescript
import { loadExampleScene } from './services/exampleScenes';

const params = {
  gravity: { x: 0, y: -9.81, z: 0 },
  wind: { x: 0, y: 0, z: 0 },
  movementBehavior: MovementBehavior.PHYSICS_GRAVITY,
  assetGroups: [], // Can be empty when using scene
  scene: loadExampleScene('surgical') // Load pre-built scene
};
```

### 2. Instanced Groups (Legacy - For Performance)

Bulk objects with shared properties, rendered via GPU instancing.

**Perfect for:**
- Debris fields
- Particle effects
- Background clutter
- When you need 500+ simple objects

**Example:**
```typescript
const params = {
  gravity: { x: 0, y: -9.81, z: 0 },
  wind: { x: 0, y: 0, z: 0 },
  movementBehavior: MovementBehavior.PHYSICS_GRAVITY,
  assetGroups: [
    {
      id: 'debris',
      name: 'Debris',
      count: 100,
      shape: ShapeType.CUBE,
      // ... other properties
    }
  ]
};
```

### 3. Hybrid (Best of Both)

Combine unique scene objects with instanced background elements.

```typescript
const scene = createRobotScene(); // Unique robot + objects
scene.instancedGroups = [{
  id: 'debris',
  count: 50,
  shape: ShapeType.CUBE,
  // ... creates background clutter
}];

const params = {
  // ... gravity etc
  assetGroups: [],
  scene: scene
};
```

## Creating Custom Scenes

### Method 1: SceneBuilder (Easy)

```typescript
import { SceneBuilder, ShapeType } from './types';

const scene = new SceneBuilder()
  .addTable({ x: 0, y: -1, z: 0 })
  .addRobot({ x: -0.7, y: 0, z: 0 })
  .addGraspableObject(ShapeType.CUBE, { x: 0.2, y: 0.5, z: 0 }, 'target')
  .addDebrisField(30) // Optional background
  .build();
```

### Method 2: Manual Construction (Full Control)

```typescript
import { Scene, SceneObject, RigidBodyType, ShapeType } from './types';

const scene: Scene = {
  objects: [
    {
      id: 'robot_1',
      name: 'Robot Arm',
      type: 'primitive',
      shape: ShapeType.CYLINDER,
      scale: { x: 0.1, y: 0.8, z: 0.1 },
      color: '#4A90E2',
      rigidBodyType: RigidBodyType.KINEMATIC,
      mass: 10,
      restitution: 0.3,
      friction: 0.5,
      drag: 0.05,
      position: { x: -1, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      semanticLabel: 'robot_arm',
      affordances: {
        graspable: false,
        manipulable: false,
        interactive: true
      },
      metadata: {
        manufacturer: 'Universal Robots',
        model: 'UR5'
      }
    },
    {
      id: 'tool_1',
      name: 'Scalpel',
      type: 'primitive',
      shape: ShapeType.CYLINDER,
      scale: { x: 0.01, y: 0.15, z: 0.01 },
      color: '#C0C0C0',
      rigidBodyType: RigidBodyType.DYNAMIC,
      mass: 0.1,
      restitution: 0.3,
      friction: 0.7,
      drag: 0.05,
      position: { x: 0.2, y: 0.5, z: 0.1 },
      semanticLabel: 'surgical_scalpel',
      affordances: {
        graspable: true,
        manipulable: true,
        interactive: false
      }
    }
  ],
  instancedGroups: [] // Optional
};
```

## Pre-Built Example Scenes

```typescript
import { loadExampleScene, EXAMPLE_SCENES } from './services/exampleScenes';

// Available scenes:
const scenes = {
  surgical: loadExampleScene('surgical'),      // Operating room
  warehouse: loadExampleScene('warehouse'),    // Package picking
  assembly: loadExampleScene('assembly'),      // Industrial assembly
  tabletop: loadExampleScene('tabletop'),      // Basic grasping
  clutter: loadExampleScene('clutter')         // Dense clutter
};

// Use in params:
const params = {
  gravity: { x: 0, y: -9.81, z: 0 },
  wind: { x: 0, y: 0, z: 0 },
  movementBehavior: MovementBehavior.PHYSICS_GRAVITY,
  assetGroups: [],
  scene: scenes.surgical
};
```

## SceneObject Properties

### Required Properties
- `id`: Unique identifier
- `name`: Human-readable name
- `type`: 'mesh' or 'primitive'
- `rigidBodyType`: STATIC, KINEMATIC, or DYNAMIC
- `mass`, `restitution`, `friction`, `drag`: Physics properties
- `position`: { x, y, z } world position
- `semanticLabel`: ML category label

### Optional Properties
- `shape`: For primitives (CUBE, SPHERE, CYLINDER, etc)
- `modelUrl`: For 3D meshes (GLB/GLTF files)
- `scale`: Uniform number or per-axis { x, y, z }
- `rotation`: Euler angles { x, y, z } in radians
- `velocity`: Initial velocity { x, y, z }
- `color`: Hex color string
- `material`: { metalness, roughness, emissive, opacity }
- `affordances`: { graspable, manipulable, interactive }
- `parentId`: Parent object for hierarchies
- `spatialConstraint`: { type, offset }
- `visible`: true/false
- `metadata`: Custom key-value data

## Rigid Body Types

### STATIC
- Fixed in place, never moves
- Use for: tables, walls, floors, environments
- Zero computational cost

### KINEMATIC
- Controlled motion, not affected by physics
- Use for: robot arms, actuators, scripted objects
- Can be moved programmatically

### DYNAMIC
- Affected by forces, gravity, collisions
- Use for: graspable objects, tools, parts
- Full physics simulation

## Semantic Labels

Use standard labels for ML annotations:

**Robots:** `robot_arm`, `robot_base`, `robot_gripper`
**Furniture:** `table`, `shelf`, `workbench`, `chair`
**Tools:** `scalpel`, `forceps`, `wrench`, `screwdriver`
**Objects:** `cube`, `sphere`, `cylinder`, `package`, `part`
**Environment:** `wall`, `floor`, `obstacle`

## Affordances

Mark object capabilities for ML training:

```typescript
affordances: {
  graspable: true,    // Can be picked up
  manipulable: true,  // Can be moved/rotated
  interactive: true,  // Has interactive components
  graspPoints: [      // Optimal grasp positions (optional)
    { x: 0, y: 0.1, z: 0 }
  ]
}
```

## ML Ground Truth Export

Scene objects provide rich metadata for COCO/YOLO export:

- **Per-object bounding boxes** (not group averages)
- **Semantic labels** for each object
- **Affordance metadata** in annotations
- **Individual object tracking** across frames
- **Custom metadata** preserved in export

## Migration from AssetGroups

### Old Approach (Particles)
```typescript
assetGroups: [
  {
    id: 'cubes',
    count: 10,  // 10 identical cubes
    shape: ShapeType.CUBE,
    // ... all cubes share same properties
  }
]
```

### New Approach (Scene Graph)
```typescript
scene: {
  objects: [
    {
      id: 'cube_1',
      name: 'Red Cube',
      shape: ShapeType.CUBE,
      color: '#FF0000',
      semanticLabel: 'obstacle',
      // ... unique properties
    },
    {
      id: 'cube_2',
      name: 'Blue Cube',
      shape: ShapeType.CUBE,
      color: '#0000FF',
      semanticLabel: 'target',
      // ... different properties
    }
    // Each object is unique and individually controllable
  ]
}
```

## Performance Considerations

- **Scene objects:** ~500 unique objects max (plenty for realistic scenes)
- **Instanced groups:** 1000+ objects (use for background/effects)
- **Hybrid:** Best of both worlds
- **GPU instancing** still available via `scene.instancedGroups`

## Validation

```typescript
import { SceneGraph } from './services/sceneGraph';

const result = SceneGraph.validateScene(scene);
if (!result.valid) {
  console.error('Scene errors:', result.errors);
}
```

## Best Practices

1. **Use Scene Graph for hero objects** (robot, tools, furniture)
2. **Use Instanced Groups for background** (debris, particles)
3. **Add semantic labels** to all objects for ML
4. **Mark affordances** correctly for manipulation training
5. **Use realistic physics properties** (mass, friction)
6. **Position objects naturally** (on surfaces, not floating)
7. **Validate scenes before use**
8. **Export individual object metadata** for rich ML annotations

## Examples in Code

See `services/exampleScenes.ts` for complete working examples of:
- Surgical robotics scenes
- Warehouse picking scenarios
- Industrial assembly workstations
- Tabletop manipulation setups
- Dense clutter environments

Each demonstrates best practices for professional ML training data generation.
