# Asset Library Scene Assembly

Instead of generating random primitives from AI prompts, SnapLock now auto-assembles scenes from your Asset Library models.

## Concept

You have **real 3D models** (purchased, designed, or owned):
- Surgical instruments
- Warehouse packages
- Industrial parts
- Robot models
- Furniture
- Any GLB/GLTF file

Instead of generating primitives, the system **loads your models** and **auto-arranges** them in physics-accurate scenes.

## How It Works

```typescript
import { SceneAssembler } from './services/sceneAssembler';
import { AssetLibraryService } from './services/assetLibraryService';

// 1. Get assets from library
const assets = AssetLibraryService.getAssetsByCategory('surgical');

// 2. Auto-assemble scene
const scene = SceneAssembler.quickAssemble(assets, 'surgical_table');

// 3. Use in simulation
const params = {
  gravity: { x: 0, y: -9.81, z: 0 },
  wind: { x: 0, y: 0, z: 0 },
  movementBehavior: MovementBehavior.PHYSICS_GRAVITY,
  assetGroups: [],  // Empty - using scene instead
  scene: scene      // Scene with your real models
};
```

## Available Layouts

### Tabletop (Default)
Objects arranged on a table surface. Best for grasping and manipulation training.
```typescript
SceneAssembler.quickAssemble(assets, 'tabletop');
```

### Warehouse Shelf
Multi-level shelf with objects on each level. For warehouse picking scenarios.
```typescript
SceneAssembler.quickAssemble(assets, 'warehouse_shelf');
```

### Surgical Table
Medical instruments organized in rows. For surgical robotics training.
```typescript
SceneAssembler.quickAssemble(assets, 'surgical_table');
```

### Grid
Regular grid pattern. General-purpose organized layout.
```typescript
SceneAssembler.quickAssemble(assets, 'grid');
```

### Pile
Stacked and scattered objects. For cluttered environment and perception training.
```typescript
SceneAssembler.quickAssemble(assets, 'pile');
```

## Advanced Configuration

```typescript
const scene = SceneAssembler.assembleFromAssets({
  assets: myAssets,
  layout: 'tabletop',
  includeGround: true,     // Add ground plane
  includeRobot: true,      // Add robot arm
  spacing: 0.4             // Distance between objects
});
```

## Asset Metadata

Assets can include physics metadata for accurate simulation:

```typescript
const asset = {
  id: 'scalpel_01',
  name: 'Surgical Scalpel',
  url: '/models/scalpel.glb',
  category: 'surgical',
  metadata: {
    scale: 0.1,              // Size multiplier
    mass: 0.05,              // kg
    restitution: 0.3,        // Bounciness (0-1)
    friction: 0.7,           // Surface friction (0-1)
    graspable: true,         // Can be grasped by robot
    manipulable: true,       // Can be moved/rotated
    semanticLabel: 'scalpel' // ML annotation label
  }
};
```

## Benefits

1. **Real Models**: Use actual product models, not primitives
2. **No WASM Crashes**: Validated asset data prevents corruption
3. **Accurate Physics**: Proper mass, friction, collision shapes
4. **ML-Ready**: Semantic labels and affordances built-in
5. **Matches Use Case**: Simulate what you actually need

## Integration Points

### From Asset Library UI
Add a button to asset library:
```typescript
<button onClick={() => {
  const selected = getSelectedAssets();
  const scene = SceneAssembler.quickAssemble(selected, 'tabletop');
  onSceneGenerated(scene);
}}>
  Assemble Scene
</button>
```

### Replace AI Generation
Instead of:
```typescript
// OLD: Generate random primitives from prompt
geminiService.generateScene(prompt)
```

Use:
```typescript
// NEW: Assemble from asset library
const assets = AssetLibraryService.getAllAssets();
const scene = SceneAssembler.quickAssemble(assets, 'tabletop');
```

## Next Steps

1. Add UI button to Asset Library panel: "Assemble Scene"
2. Add layout selector dropdown
3. Remove or deprecate AI primitive generation
4. Focus on asset library as primary content source

This architecture matches the actual use case: you have specific models you want to simulate, not random generated shapes.
