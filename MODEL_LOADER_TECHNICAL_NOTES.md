# Model Loader Technical Notes

## Root Cause Analysis: I.refCleanup Crash

### The Problem

**Error**: `TypeError: I.refCleanup is not a function`

**Stack Trace Location**: React-Three-Fiber reconciler during `commitUpdate`

**Root Cause**: Format incompatibility between YCB dataset and React-Three-Fiber loader

### Technical Details

#### YCB Dataset Format
```
YCB URLs: http://ycb-benchmarks.s3.amazonaws.com/data/objects/048_hammer/google_16k/textured.obj
Format: Wavefront OBJ (.obj) + MTL material files
```

#### Current Loader
```typescript
import { useGLTF } from '@react-three/drei';
const gltf = useGLTF(url); // ❌ ONLY supports glTF/GLB format
```

**Result**: `useGLTF` attempts to parse OBJ file as glTF, fails during Three.js scene graph reconciliation, crashes renderer with cryptic "refCleanup" error.

---

## Solution Options

### Option 1: Implement OBJLoader (Recommended for YCB)

Use Three.js OBJLoader for proper OBJ file handling:

```typescript
import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

const ModelAssetOBJ: React.FC<AssetRendererProps> = ({ group, meshRef, viewMode }) => {
  // Extract base path and filename
  const objUrl = group.modelUrl!;
  const mtlUrl = objUrl.replace('textured.obj', 'textured.mtl');

  // Load materials first
  const materials = useLoader(MTLLoader, mtlUrl);

  // Load OBJ with materials
  const obj = useLoader(OBJLoader, objUrl, (loader) => {
    loader.setMaterials(materials);
  });

  // Extract geometry from loaded OBJ
  let geometry: THREE.BufferGeometry | null = null;
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      geometry = child.geometry;
    }
  });

  if (!geometry) {
    return <PrimitiveAsset {...props} />;
  }

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, group.count]}>
      <Material group={group} viewMode={viewMode} />
    </instancedMesh>
  );
};
```

**Pros**:
- Works directly with YCB dataset URLs
- No conversion pipeline needed
- Materials loaded from .mtl files

**Cons**:
- OBJ format is less efficient than glTF
- No PBR materials (YCB uses Phong shading)
- Larger file sizes

---

### Option 2: Use Pre-Converted glTF Models

Find or create glTF versions of YCB models:

**Sources**:
1. Check YCB mirrors for glTF versions
2. Use automated conversion tools:
   ```bash
   # Install obj2gltf
   npm install -g obj2gltf

   # Convert YCB models
   obj2gltf -i textured.obj -o model.gltf
   ```
3. Host converted models on own CDN/S3

**Update model URLs**:
```typescript
const YCB_MODELS: OpenSourceModel[] = [
  {
    keywords: ['hammer', 'tool'],
    modelUrl: 'https://your-cdn.com/ycb-gltf/048_hammer/model.glb',
    source: 'YCB',
    // ...
  }
];
```

**Pros**:
- Works with existing `useGLTF` hook
- glTF is industry standard for WebGL
- PBR materials supported
- Smaller file sizes with Draco compression

**Cons**:
- Requires conversion pipeline
- Need to host converted files
- Maintenance overhead

---

### Option 3: Multi-Format Loader with Auto-Detection

Smart loader that detects format and uses appropriate loader:

```typescript
const SmartModelLoader: React.FC<AssetRendererProps> = (props) => {
  const url = props.group.modelUrl!;
  const format = url.split('.').pop()?.toLowerCase();

  switch (format) {
    case 'glb':
    case 'gltf':
      return <ModelAssetGLTF {...props} />;
    case 'obj':
      return <ModelAssetOBJ {...props} />;
    default:
      console.warn(`Unsupported format: ${format}`);
      return <PrimitiveAsset {...props} />;
  }
};
```

**Pros**:
- Supports multiple formats
- Flexible for different datasets
- Future-proof

**Cons**:
- More complex implementation
- Need to maintain multiple loaders

---

## Recommendation

### Immediate Action: ✅ DONE
Use pure domain randomization (NVIDIA approach) - **currently implemented**
- Zero model loading = zero crashes
- High-quality training data
- Works for any prompt

### Short-Term (Next Implementation):
**Option 2**: Convert YCB models to glTF format
- Best balance of quality and simplicity
- Use existing `useGLTF` hook
- Can batch-convert all YCB models
- Host on GitHub Pages or Netlify CDN (free)

**Implementation Steps**:
```bash
# 1. Download YCB dataset
wget http://ycb-benchmarks.s3-website-us-east-1.amazonaws.com/

# 2. Batch convert to glTF
for obj in $(find . -name "textured.obj"); do
  obj2gltf -i "$obj" -o "${obj%.obj}.glb"
done

# 3. Upload to CDN
# Use GitHub repo or Netlify deployment

# 4. Update model URLs in openSourceModels.ts
# Point to your CDN URLs
```

### Long-Term:
**Option 3**: Multi-format loader
- Support YCB (OBJ), Poly Haven (glTF), Khronos (glTF)
- Graceful fallback for any format
- Maximum flexibility

---

## Why Domain Randomization is Still Valid

Even with 3D models working, domain randomization remains valuable:

### NVIDIA Isaac Sim Approach:
> "Domain randomization techniques augment the process by allowing manipulation of numerous parameters such as lighting, background, color, location, and environment."

### Benefits:
1. **Generalization**: Models learn features, not specific appearances
2. **Robustness**: Works on ANY object, not just those with CAD models
3. **Simplicity**: No model library maintenance
4. **Stability**: Never fails due to model loading issues

### Hybrid Approach (Ideal):
- Use real models when available (photorealism)
- Use domain randomization always (diversity)
- Fall back to primitives on failure (stability)

**Result**: Best of both worlds for synthetic training data.

---

## References

### Three.js Loaders:
- [OBJLoader Documentation](https://threejs.org/docs/#examples/en/loaders/OBJLoader)
- [GLTFLoader Documentation](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
- [MTLLoader Documentation](https://threejs.org/docs/#examples/en/loaders/MTLLoader)

### Conversion Tools:
- [obj2gltf](https://github.com/CesiumGS/obj2gltf) - Wavefront OBJ to glTF converter
- [gltf-pipeline](https://github.com/CesiumGS/gltf-pipeline) - glTF optimization
- [Blender](https://www.blender.org/) - Manual conversion with quality control

### Domain Randomization Research:
- [NVIDIA Isaac Sim](https://developer.nvidia.com/isaac/sim)
- [Training Deep Networks with Synthetic Data](https://www.researchgate.net/publication/324600517)
- [Synthetic Dataset Generation for Robotics](https://pmc.ncbi.nlm.nih.gov/articles/PMC7924434/)

---

## Summary

**Current Status**: Using pure domain randomization (stable, high-quality)

**Next Step**: Convert YCB models to glTF format for hybrid approach

**Goal**: Models (realism) + Domain Randomization (diversity) = Best training data
