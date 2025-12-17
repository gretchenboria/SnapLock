# Critical Issues Analysis - SnapLock Auto-Spawn & 3D Generation

## Date: December 16, 2025
## Issues: Auto-spawn nonsense, photorealistic 3D generation failures

---

## Problem 1: Auto-Spawn Generating Irrelevant/Nonsensical Content

### Root Causes

**File: `services/geminiService.ts:740-789`**

1. **Generic Fallback Prompts** (lines 87-96)
```typescript
const FALLBACK_PROMPTS = [
    "Zero-G collision of a heavy gold sphere against a cloud of 200 steel cubes",
    "Avalanche of red pyramids crashing into a static wall of blue plates",
    "LIDAR calibration test with floating polyhedrons and a rotating sensor",
    "Swarm of micro-drones navigating through a debris field",
    ...
];
```
**Issue**: These are highly technical, robotics-focused scenarios that may not match user intent. When the API fails or quota is exceeded, the system falls back to these hardcoded prompts.

2. **Creative Prompt Generation Too Generic** (lines 770-778)
```typescript
contents: `Generate a single, short, creative, and scientifically interesting prompt
for a physics simulation engine called SnapLock.
The engine handles robotics, rigid body dynamics, zero-g, and multiple interacting asset layers.

Examples:
- "Zero-G collision of a heavy gold sphere against a cloud of 200 steel cubes"
- "Avalanche of red pyramids crashing into a static wall of blue plates"
- "LIDAR calibration test with floating polyhedrons and a rotating sensor"

OUTPUT: Just the prompt text string. No quotes, no markdown.`
```
**Issue**: The examples bias the AI toward generating similar technical/robotics scenarios. No guidance on user preferences, scene types, or context.

3. **Overly Complex Physics Prompt** (lines 331-660+)
The physics analysis prompt is **500+ lines long** with extreme detail about:
- Material physics (8 material types with exact coefficients)
- Drag coefficients
- Gravity modes
- VR affordances
- Joint systems
- Spatial constraints

**Issue**: Such an extensive prompt can cause:
- AI hallucination (inventing details not in user input)
- Overfitting to example scenarios
- Ignoring actual user intent in favor of technical specifications
- Generating overly complex scenes when simple ones are requested

---

## Problem 2: Photorealistic 3D Scene Generation Failures

### Root Causes

**File: `services/geminiService.ts:791-870`**

1. **Model Availability Issue** (line 839)
```typescript
model: "gemini-3-pro-image-preview",
```
**Issue**: This model may not exist, may be deprecated, or may not be available in your region/API tier. Google's image generation models have been:
- Imagen 3 (current)
- Veo 3.1 (video)
- gemini-pro-vision (older, deprecated)

The model name `gemini-3-pro-image-preview` doesn't match any documented Google GenAI model.

2. **Unrealistic Expectations** (lines 803-835)
The prompt asks for:
```
"EXACT GEOMETRIC FIDELITY"
"Preserve EXACT positions, orientations, and scales from input wireframe"
"Photorealistic render suitable as ML training ground truth with pixel-perfect geometry"
```

**Issue**: The input is a wireframe/screenshot of a 3D scene with:
- Three.js InstancedMesh rendering
- Simple geometric shapes (cubes, spheres, cylinders)
- Basic lighting and colors

The AI is being asked to convert this into a "photorealistic render" while maintaining "pixel-perfect geometry matching" - this is technically impossible because:
- The AI doesn't have access to 3D scene data (only a 2D screenshot)
- "Photorealistic" implies adding textures, materials, lighting that aren't in the source
- Adding realism necessarily changes the appearance

3. **Workflow Mismatch**
```
User Types Prompt → AI Generates Physics Params → 3D Engine Renders Wireframe →
Screenshot Taken → AI Tries to Make "Photorealistic" → ???
```

**Issue**: This workflow assumes the AI can:
- Understand 3D geometry from a 2D image
- Add photorealistic materials while preserving exact positions
- Generate ML-quality ground truth from a stylized render

This is fundamentally incompatible with how image generation models work.

---

## Problem 3: Video Generation Issues

**File: `services/geminiService.ts:872-915`**

1. **Model Usage** (line 884)
```typescript
model: 'veo-3.1-generate-preview',
```
**Status**: Veo 3.1 is Google's latest video model, but:
- Requires specific input formats
- Has very long generation times (minutes)
- Limited to specific use cases
- May not be available in all API tiers

2. **Physics Simulation Expectations**
The prompt asks the video model to:
```
"Realistic object motion following Newtonian mechanics"
"Physics-based animation"
"Collision dynamics, gravity effects"
```

**Issue**: Video generation models:
- Create videos based on visual patterns, NOT physics simulation
- Cannot accurately simulate Newtonian mechanics
- Will produce motion that "looks" physics-like but isn't physically accurate
- Are trained on real-world video, not physics simulations

**Result**: The generated videos will show objects moving in ways that look plausible but don't match actual physics, creating a "nonsense" appearance.

---

## Problem 4: Disconnect Between Use Cases

### What SnapLock Actually Is:
- Physics engine using Rapier3D
- Rigid body dynamics simulation
- VR training data generator
- Procedural scene generator

### What the Auto-Spawn/Image Gen Is Trying To Do:
- Generate "photorealistic" renders of physics simulations
- Create ML training ground truth
- Produce computer vision datasets
- Generate physics-accurate videos

### The Mismatch:
**SnapLock already produces accurate physics simulations.** The attempt to make them "photorealistic" via AI is:
1. Adding a layer of inaccuracy (AI interpretation)
2. Losing the precision of the physics engine
3. Creating visual "nonsense" when AI tries to reconcile wireframe with realism

---

## Recommended Fixes

### Fix 1: Simplify Auto-Spawn Prompts
```typescript
// BEFORE
const FALLBACK_PROMPTS = [
    "Zero-G collision of a heavy gold sphere against a cloud of 200 steel cubes",
    ...
];

// AFTER
const FALLBACK_PROMPTS = [
    "Social room with floating objects",
    "Gaming lounge with bouncing balls",
    "Creative workspace with colorful blocks",
    "Meeting space with interactive furniture",
    "Open world with trees and rocks"
];
```

### Fix 2: Align Creative Prompts with Procedural Rooms
```typescript
// BEFORE: Generic physics scenarios
// AFTER: Match the 5 room templates you just created
contents: `Generate a creative scene prompt for a social VR space.
Template options:
- LOUNGE: Casual hangout with couches and decorative objects
- MEETING_ROOM: Conference table with chairs and tools
- GAMING_ROOM: Arcade cabinets with interactive elements
- CREATIVE_STUDIO: Work tables with art supplies
- OPEN_WORLD: Minecraft-style terrain with natural objects

OUTPUT: A single sentence describing a specific scenario.`
```

### Fix 3: Remove Photorealistic Image Generation (or Fix Model)
**Option A: Remove Entirely**
- SnapLock's 3D renders ARE the ground truth
- No need for AI to "enhance" them
- Export screenshots directly from Three.js

**Option B: Fix Model Name**
```typescript
// Check available models
model: "imagen-3.0" // OR
model: "gemini-2.0-flash-thinking-exp-01-21" // With vision
```

### Fix 4: Use Procedural Scene Generator Instead of AI
```typescript
// IN App.tsx auto-spawn logic:
// BEFORE: generateCreativePrompt() → analyzePhysicsPrompt() → complex AI parsing
// AFTER: ProceduralSceneGenerator.generateScene() → instant, accurate scenes

const autoSpawnInterval = setInterval(async () => {
  const templates = Object.values(SceneTemplate);
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

  const scene = ProceduralSceneGenerator.generateScene({
    template: randomTemplate,
    roomSize: 'medium',
    objectDensity: 'medium',
    colorTheme: 'vibrant'
  });

  setParams(scene);
  setShouldReset(true);
}, 15000); // Every 15 seconds
```

### Fix 5: Simplify Physics Prompt (Reduce from 660+ lines)
Keep only:
- Basic object extraction (50 lines)
- Material properties (100 lines)
- Spawn modes (50 lines)
- Remove: VR affordances (use ProceduralSceneGenerator for VR)
- Remove: Extensive examples (causing AI to copy them)

---

## Impact Summary

**Current Issues:**
- Auto-spawn generates irrelevant technical scenarios
- Photorealistic rendering fails or produces nonsense
- Video generation doesn't match physics
- 500+ line prompts cause AI to hallucinate

**After Fixes:**
- Auto-spawn generates social/collaborative rooms (matches user intent)
- Remove photorealistic step (3D renders are already accurate)
- Procedural generation replaces AI guessing
- Simpler prompts = more predictable AI behavior

---

## Immediate Actions

1. **Test Procedural Scene Generator** - It's already implemented and working
2. **Disable Image/Video Generation** - Until model names are verified
3. **Simplify Auto-Spawn** - Use ProceduralSceneGenerator instead of AI
4. **Verify API Quota** - Check if quota exhaustion is causing fallbacks

---

## Technical Debt

- 500+ line physics prompt needs to be split into smaller prompts
- Fallback prompts hardcoded and out of sync with actual use cases
- Image/video generation models may not exist or may be deprecated
- No error handling for model unavailability
- Auto-spawn doesn't respect user preferences or scene context
