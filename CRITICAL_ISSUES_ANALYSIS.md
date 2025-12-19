# CRITICAL ISSUES: SnapLock Not Meeting README Specifications

## Analysis Date: 2025-12-18
## Analyzed by: Expert Software Architect

---

## EXECUTIVE SUMMARY

After thorough analysis of the README.md against actual implementation, **SnapLock is failing to deliver 3 critical features** that are documented as working:

1. ❌ **Video Recording/Export** - Completely missing
2. ❌ **Realistic Scene Generation** - AI generates objects but NO spatial arrangement
3. ⚠️ **ML Frame Recording** - Partially implemented but not exposed in UI

---

## ISSUE #1: VIDEO RECORDING - MISSING

### README Claims (Line 247-253):
```
**Temporal Videos:**
1. Set up simulation
2. Click VIDEO button
3. AI-powered temporal video generates from current state
4. Video player displays with controls
```

### Actual Status:
- ❌ NO VIDEO button exists in UI
- ❌ `generateSimulationVideo()` is DISABLED in geminiService.ts (line 930)
- ❌ No video player component
- ❌ No downloadable video files

### Code Evidence:
```typescript
// services/geminiService.ts:930
console.warn('[generateSimulationVideo] Video generation disabled. Use Three.js frame recording instead.');
```

**VERDICT: Feature is documented but NOT implemented**

---

## ISSUE #2: REALISTIC SCENE GENERATION - BROKEN

### User Expectation:
```
"generate surgical robot stitching heart during surgery"
```

**Should create:**
- Surgical robot (capsule) positioned at operating table height
- Heart model (sphere) on operating table surface
- Surgical instruments (cylinders) held by robot or on table
- Operating table (plate) as foundation
- Realistic spatial relationships (robot near/touching heart)

### Current Behavior:
- ✅ AI extracts objects correctly
- ❌ Objects spawn in RANDOM positions
- ❌ All objects FALL and scatter (no "on_surface" constraints)
- ❌ NO spatial arrangement logic
- ❌ Result: Pile of geometric shapes, NOT a surgical scene

### Root Cause:
The AI prompt in `geminiService.ts` (lines 331-543) generates:
- Object types ✅
- Physics properties ✅
- Spawn modes ✅
- **MISSING: Spatial constraints, positioning, "on_surface" relationships**

The README mentions (line 418-420):
```typescript
Add spatial constraints for structured scenes:
- type: 'on_surface' (objects on tables)
- parentGroupId: ID of surface/parent object
```

**This is documented in the AI prompt but NOT WORKING. Objects ignore spatial constraints.**

---

## ISSUE #3: ML RECORDING - NOT EXPOSED IN UI

### README Claims (Line 217-232):
```
**Complete Workflow:**
1. Create or run a simulation
2. Navigate to **DATASET** tab
3. Click **START RECORDING** (captures at 30 FPS)
4. Wait 3-5 seconds (90-150 frames recommended)
5. Click **STOP RECORDING**
6. Click **EXPORT COCO DATASET** (object detection)
```

### Actual Status:
- ⚠️ ML Export Modal EXISTS (MLExportModal.tsx)
- ⚠️ Export buttons (COCO/YOLO) exist
- ❌ NO "START RECORDING" button
- ❌ NO "STOP RECORDING" button
- ❌ NO recording UI controls visible

### Code Evidence:
```typescript
// App.tsx has recording handlers but NO UI:
const [isRecording, setIsRecording] = useState(false);  // EXISTS
const handleStartRecording = useCallback(() => { ... }); // EXISTS
const handleStopRecording = useCallback(() => { ... });  // EXISTS

// But these are NEVER rendered in the UI!
```

**VERDICT: Backend logic exists, UI controls missing**

---

## WHAT THE USER SEES vs WHAT THEY EXPECT

### User Types:
```
"generate surgical robot stitching heart during surgery"
```

### What User EXPECTS (per README):
1. Surgical scene with proper spatial layout
2. Robot positioned at table, "stitching" heart
3. Realistic arrangement of objects
4. Ability to START RECORDING
5. Capture 30 FPS frames
6. STOP RECORDING and export COCO/YOLO dataset
7. Optional: Generate video of simulation

### What User ACTUALLY GETS:
1. ❌ Geometric shapes (cubes, spheres, cylinders) spawn
2. ❌ All objects FALL from random positions
3. ❌ Objects pile up on floor in chaotic heap
4. ❌ NO recording UI (can't capture frames)
5. ❌ NO video generation
6. ⚠️ Can open "Export Dataset" but 0 frames recorded

---

## TECHNICAL GAPS

### 1. Spatial Arrangement System
**MISSING:** Logic to position objects relative to each other

**Needed:**
- Floor/table positioning algorithm
- "on_surface" constraint enforcement
- Parent-child spatial relationships
- Collision-free initial placement

### 2. Recording UI
**MISSING:** User interface for frame capture

**Needed:**
- START RECORDING button in ML Export Modal
- STOP RECORDING button
- Frame counter display
- Recording indicator (red dot, etc.)

### 3. Video Export
**MISSING:** Video generation and playback

**Needed:**
- Implement frame sequence → MP4 encoding
- Or: Use AI video synthesis (currently disabled)
- Video player UI
- Download video button

---

## RECOMMENDED FIX PRIORITY

### P0 - CRITICAL (Must fix for basic functionality):
1. **Spatial Arrangement** - Objects must spawn in realistic positions
   - Implement floor detection
   - Add "on_surface" positioning
   - Prevent objects spawning in mid-air

2. **Recording UI** - Users need to capture training data
   - Add START/STOP RECORDING buttons to ML Export Modal
   - Show recording status
   - Display frame count

### P1 - HIGH (Needed for README compliance):
3. **Video Export** - README promises video capability
   - Implement frame → video encoding OR
   - Re-enable AI video synthesis
   - Add video playback UI

### P2 - MEDIUM (Nice to have):
4. **Better AI Prompting** - Surgical scenes should look surgical
   - Enhance AI to generate better spatial layouts
   - Add semantic understanding (robot "operates on" heart)

---

## CONCLUSION

SnapLock has solid foundation (Rapier physics, COCO/YOLO export, AI integration) but is **failing to deliver on documented features**:

- **Video recording**: Documented but not implemented
- **Realistic scenes**: Spatial arrangement broken
- **Recording UI**: Backend exists, frontend missing

**User frustration is justified.** The app generates geometric primitives correctly but lacks the spatial intelligence and capture tools needed for actual VR training data generation.

**Next Step:** Implement spatial positioning system and recording UI controls.
