# SnapLock UI/UX Redesign - Architecture Document

## Problem Statement

**Current Issues:**
- ❌ Confusing buttons (AUTO SPAWN, RUN, ENHANCE) - unclear purpose
- ❌ No clear workflow - should user click shapes or type prompts?
- ❌ Complex setup (SD server) that doesn't work reliably
- ❌ Poor visual quality - geometric shapes look unfinished
- ❌ No feedback on what's happening

**User Frustration:**
> "I just want to type a prompt and see a 3D world!"

## New Architecture

### Core Principle: **ONE CLEAR PATH**

```
User types: "conference room with laptops"
         ↓
      Click GENERATE
         ↓
    2-3 second wait
         ↓
  COMPLETE 3D SCENE appears
  (proper lighting, materials, environment)
```

### UI Simplification

#### BEFORE (Confusing):
```
[Input Box] [ENHANCE] [RUN] [AUTO SPAWN: ON/OFF]
[CHAOS] [LAZARUS] [API] [Rooms] [Export]
[Side Panel: Geometry primitives]
[Side Panel: Spawn topology]
[Side Panel: Instance configuration]
```

#### AFTER (Simple):
```
╔════════════════════════════════════════╗
║  What scene do you want?               ║
║  ┌──────────────────────────────────┐ ║
║  │ conference room with laptops     │ ║  ← ONE input box
║  └──────────────────────────────────┘ ║
║                                        ║
║        [  GENERATE SCENE  ]            ║  ← ONE button
║                                        ║
║  ☐ Auto-regenerate every 15s          ║  ← Simple checkbox
╚════════════════════════════════════════╝

Right sidebar:
- Scene hierarchy (read-only)
- Telemetry
- Export button
```

### Simplified Features

**KEEP:**
- ✅ Prompt input
- ✅ Single generate button
- ✅ Auto-regenerate toggle
- ✅ Scene hierarchy view
- ✅ Export dataset

**REMOVE:**
- ❌ ENHANCE button (confusing)
- ❌ RUN button (redundant)
- ❌ Manual shape selection (too complex)
- ❌ Spawn topology controls (automatic)
- ❌ CHAOS mode (advanced, hide)
- ❌ LAZARUS diagnostics (automatic)
- ❌ API config button (automatic detection)

**MOVE TO ADVANCED MENU:**
- ⚙️ Physics settings
- ⚙️ Camera controls
- ⚙️ View modes
- ⚙️ Room templates

## Technical Improvements

### 1. Enhanced Geometric Rendering
Instead of photorealistic overlay, make geometric render look GOOD:

**Current:** Flat colored shapes
**New:**
- ✅ Environment maps (reflections)
- ✅ Better materials (PBR with environment lighting)
- ✅ Ambient occlusion
- ✅ Better lighting (3-point setup)
- ✅ Subtle textures
- ✅ Post-processing (SSAO, bloom)

### 2. Reliable Scene Generation
**Current:** Depends on external APIs, fails silently
**New:**
- ✅ Always works (fallback to procedural)
- ✅ Fast (<2 seconds)
- ✅ Complete scenes (not just objects)
- ✅ Proper spatial layout

### 3. Clear Feedback
**Current:** Silent failures, unclear state
**New:**
```
[Generating scene...] ━━━━━━━━ 60%
↓
[✓ Scene generated: Conference room with 3 laptops, 1 table, 1 floor]
↓
[Physics simulation running - 120 FPS]
```

## User Workflows

### Primary Workflow (95% of users):
1. Open SnapLock
2. See large prompt box with placeholder: "Describe your scene..."
3. Type: "office with laptop and coffee"
4. Click "GENERATE SCENE"
5. Wait 2 seconds
6. See complete 3D office scene with proper lighting
7. (Optional) Toggle "Auto-regenerate" for variations
8. Click "EXPORT DATASET" when satisfied

### Advanced Workflow (5% of users):
1. Click ⚙️ icon (top-right)
2. Advanced menu appears:
   - Manual object placement
   - Physics controls
   - Camera settings
   - Custom materials
3. Make changes
4. Click "GENERATE SCENE"

## Implementation Plan

### Phase 1: UI Simplification (2 hours)
- [ ] Remove confusing buttons
- [ ] Simplify to one input + one button
- [ ] Clean up layout
- [ ] Add clear status messages

### Phase 2: Enhanced Rendering (3 hours)
- [ ] Add environment maps
- [ ] Improve materials with proper PBR
- [ ] Better lighting setup
- [ ] Post-processing effects
- [ ] Test and refine

### Phase 3: Polish (1 hour)
- [ ] Loading animations
- [ ] Error messages
- [ ] Tooltips
- [ ] Empty states
- [ ] Success feedback

## Success Metrics

**Before:**
- User confusion: "What button do I click?"
- Setup required: SD server installation
- Success rate: ~30% (many failures)
- Time to first scene: Unknown (confusing)

**After:**
- User clarity: "Type prompt, click generate"
- Setup required: NONE
- Success rate: 100% (always works)
- Time to first scene: <5 seconds

## Design Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  SNAPLOCK                                            ⚙️  ?  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    GENERATE YOUR SCENE                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │  conference room with laptops and coffee on table      ││
│  └────────────────────────────────────────────────────────┘│
│                                                              │
│               [     GENERATE SCENE     ]                     │
│                                                              │
│              ☐ Auto-regenerate every 15 seconds              │
│                                                              │
│  ┌──────────────────────────────────────────────────────── │
│  │                                                          ││
│  │              [3D SCENE RENDERS HERE]                    ││
│  │                                                          ││
│  │         Beautiful geometric render with                 ││
│  │         proper lighting and materials                   ││
│  │                                                          ││
│  └────────────────────────────────────────────────────────┘│
│                                                              │
│  Status: ✓ Scene generated (12 objects, 120 FPS)           │
│                                                              │
│  [  EXPORT DATASET  ]           [  RESET CAMERA  ]          │
└─────────────────────────────────────────────────────────────┘

Right Sidebar (collapsible):
┌──────────────────┐
│ SCENE HIERARCHY  │
├──────────────────┤
│ ▼ Floor (1)      │
│ ▼ Table (1)      │
│ ▼ Laptop (3)     │
│ ▼ Coffee cup (2) │
├──────────────────┤
│ TELEMETRY        │
│ FPS: 120         │
│ Objects: 7       │
│ Energy: 2.3 kJ   │
└──────────────────┘
```

## Conclusion

This redesign focuses on **simplicity and reliability** over complexity:
- One clear workflow
- Always works
- No external dependencies
- Better visual quality
- Clear feedback

Users should be able to go from "I have an idea" to "I have a 3D dataset" in under 30 seconds.
