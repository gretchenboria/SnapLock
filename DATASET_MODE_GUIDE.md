# Dataset Mode - Synthetic Training Data Generation

**The Core Feature of SnapLock**

---

## Purpose

SnapLock exists to generate **hundreds/thousands of scene variations** for training computer vision and robotics ML models. Dataset Mode automates this process.

---

## How It Works (Step-by-Step)

### 1. Define What You Want
```
Type your prompt: "surgical robot with instruments on operating table"
```

### 2. Generate Initial Scene
```
Click GENERATE button
↓
AI analyzes your prompt
↓
Scene renders with your objects + physics
```

### 3. Enable Dataset Mode
```
Click "DATASET MODE" button (turns GREEN when active)
↓
System auto-generates variations every 15 seconds
↓
Each variation has:
  - Different object positions
  - Different rotations
  - Different spatial arrangements
  - SAME objects (from your prompt)
  - SAME physics (from your prompt)
```

### 4. Let It Run
```
Variation 1 generates → 15s later → Variation 2 generates → 15s later → Variation 3...
```

### 5. Record & Export
```
While Dataset Mode runs:
- Go to DATASET tab
- Click START RECORDING
- Let it capture 50-100 frames
- Click STOP RECORDING
- Export as COCO JSON or YOLO format
```

---

## Visual Indicator

When **DATASET MODE** is active:
- Button is **GREEN** (not gray)
- **Database icon pulses** (animated)
- **Progress bar** shows 15s countdown
- **Logs show**: "Dataset Mode: Generating variation X of 'your prompt'"

---

## Safety Requirements

Dataset Mode **REQUIRES a prompt**. You cannot enable it without typing something.

❌ **Won't Work:**
```
1. Open app
2. Click DATASET MODE
→ Button is GRAYED OUT (disabled)
→ Message: "Enter a prompt first to enable Dataset Mode"
```

✅ **Will Work:**
```
1. Type: "wooden table with metal tools"
2. Click GENERATE
3. Click DATASET MODE
→ Button turns GREEN
→ Starts generating variations
```

---

## What Gets Generated

### Your Prompt:
```
"conference room with laptops and coffee cups"
```

### Variation #1:
```
- Floor at y=0
- Conference table at (0, 0.4, 0)
- 4 chairs around table
- 3 laptops on table (random positions within table bounds)
- 2 coffee cups on table (random positions)
- Earth gravity (-9.81 m/s²)
```

### Variation #2 (15 seconds later):
```
- Floor at y=0
- Conference table at (0, 0.4, 0)
- 4 chairs around table (DIFFERENT positions)
- 3 laptops on table (DIFFERENT positions)
- 2 coffee cups on table (DIFFERENT positions)
- Earth gravity (-9.81 m/s²) ← SAME physics
```

### Variation #3 (15 seconds later):
```
- Floor at y=0
- Conference table at (0, 0.4, 0)
- 4 chairs around table (DIFFERENT positions again)
- 3 laptops on table (DIFFERENT positions again)
- 2 coffee cups on table (DIFFERENT positions again)
- Earth gravity (-9.81 m/s²) ← SAME physics
```

**Result:** 100+ training images of the SAME scene with different object arrangements

---

## Why This Matters for ML

### Problem: Overfitting
```
Train model on 10 identical images
↓
Model memorizes ONE specific arrangement
↓
Fails on new arrangements
```

### Solution: Dataset Mode
```
Generate 1000 variations of same scene
↓
Model learns to recognize objects in ANY arrangement
↓
Generalizes to real-world scenarios
```

### Use Cases:
1. **Object Detection**: Train YOLOv8 on 500 variations of "warehouse with boxes"
2. **Pose Estimation**: Train on 300 variations of "surgical robot arm positions"
3. **Grasp Planning**: Train on 400 variations of "tools on workbench"
4. **Scene Understanding**: Train on 600 variations of "meeting room layouts"

---

## Stopping Dataset Mode

To stop auto-generation:
```
Click DATASET MODE button again
↓
Button turns GRAY
↓
Auto-generation stops
↓
Current scene remains visible
```

---

## Integration with Recording

### Workflow for Building a Dataset:

```
Step 1: Define Scene
  Type: "surgical robot with instruments"
  Click: GENERATE

Step 2: Enable Dataset Mode
  Click: DATASET MODE (turns green)

Step 3: Start Recording
  Switch to DATASET tab
  Click: START RECORDING

Step 4: Let It Run (5-10 minutes)
  System auto-generates variations
  Recorder captures every frame
  Each frame has:
    - RGB image
    - 2D bounding boxes (pixel-accurate)
    - 3D poses
    - Camera matrices
    - Velocity vectors
    - Ground truth labels

Step 5: Stop & Export
  Click: STOP RECORDING
  Click: EXPORT COCO JSON

Result:
  - coco_dataset.json (1000+ annotated frames)
  - Ready to train YOLOv8, Detectron2, etc.
```

---

## Comparison: Old vs New

### OLD (Confusing):
```
❌ "AUTO SPAWN" button
❌ Sometimes uses prompt, sometimes random
❌ Unclear what it does
❌ "RUN" button meaning unclear
```

### NEW (Clear):
```
✅ "DATASET MODE" button (clear name)
✅ ALWAYS uses your prompt, NEVER random
✅ Clear purpose: Generate training data
✅ "GENERATE" button (clear action)
✅ Requires prompt (safety check)
✅ Visual feedback (green, pulsing)
```

---

## Order of Operations

```
┌─────────────────────────────────────────────────┐
│  1. YOU TYPE:                                    │
│     "surgical robot with instruments"            │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  2. YOU CLICK:                                   │
│     GENERATE button                              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  3. AI THINKS (3-5s):                            │
│     - Extracts objects                           │
│     - Determines physics                         │
│     - Assigns materials                          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  4. SCENE RENDERS:                               │
│     Initial variation appears                    │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  5. YOU ENABLE DATASET MODE:                     │
│     Click DATASET MODE button                    │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  6. AUTO-GENERATION LOOP:                        │
│     Every 15s → New variation of YOUR scene      │
│     Objects rearrange → Physics stays same       │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  7. YOU RECORD & EXPORT:                         │
│     Capture 100+ frames → Export COCO/YOLO       │
└─────────────────────────────────────────────────┘
```

---

## FAQ

### Q: How many variations can it generate?
**A:** Unlimited. It runs until you stop it. Common usage: 50-1000 variations per scene.

### Q: Does it change my prompt?
**A:** No. It uses YOUR prompt every time. Only spatial arrangements change.

### Q: Can I use it without a prompt?
**A:** No. Button is disabled until you type a prompt (safety feature).

### Q: What if I change my prompt while Dataset Mode is running?
**A:** It will use the NEW prompt for next generation (after current 15s cycle).

### Q: Can I manually tweak physics while it's running?
**A:** Yes! Adjust gravity, friction, etc. in PHYSICS tab. Next variation uses new settings.

### Q: Does it work offline?
**A:** If you have no API key, it uses fallback keyword parsing (less smart but still works).

### Q: How is this different from just clicking GENERATE 100 times?
**A:** Same result, but Dataset Mode automates it. Click once, walk away, come back to 100+ variations.

---

## Technical Details

### Generation Algorithm:
```typescript
// Every 15 seconds:
1. Parse user's prompt with Gemini AI
2. Extract physics parameters (gravity, wind, etc.)
3. Extract object list with materials
4. Generate RANDOM spatial positions (within bounds)
5. Initialize Rapier physics engine
6. Spawn objects at new positions
7. Run simulation for 120 timesteps (1 second at 120Hz)
8. Render final frame
9. If recording: Capture frame + annotations
10. Wait 15s → Repeat
```

### Variation Sources:
- **Position**: Objects spawn in random (but valid) locations
- **Rotation**: Random initial orientations
- **Spawn mode**: GRID/PILE/FLOAT chosen based on prompt
- **Physics randomness**: Collisions cause different outcomes
- **Lighting**: Environment map may vary

### Determinism:
- Each variation is reproducible IF you set a random seed
- Without seed: Natural variation from physics interactions
- Both approaches valid for ML training

---

## Best Practices

### 1. Start Simple
```
Good first prompt: "table with ball"
Generate 10 variations
Verify dataset quality
Then scale up
```

### 2. Use Specific Prompts
```
❌ Bad: "stuff on table"
✅ Good: "wooden table with 3 metal tools and 2 rubber balls"
```

### 3. Match Your Use Case
```
If training surgical robot:
  → "surgical instruments on sterile tray"

If training warehouse robot:
  → "cardboard boxes stacked on pallet"

If training inspection drone:
  → "industrial equipment with rust and damage"
```

### 4. Record Smart
```
Don't record ALL variations
↓
Generate 100, record every 5th (20 recordings)
↓
Saves disk space, still gets diversity
```

### 5. Validate Exports
```
After exporting COCO JSON:
- Open in CVAT or LabelImg
- Verify bounding boxes are accurate
- Check that classes match
- Ensure no corrupted annotations
```

---

## Status After This Fix

✅ **Dataset Mode RESTORED**
✅ **Requires prompt (no random)**
✅ **Clear visual feedback**
✅ **Proper documentation**
✅ **Aligned with app purpose**

**Ready for synthetic data generation at scale.**

---

**Push Status**: Deployed to https://snaplock.netlify.app

**Test it:**
1. Type: "wooden table with metal tools"
2. Click: GENERATE
3. Click: DATASET MODE
4. Watch: Variations generate every 15s
5. Record: Go to DATASET tab, capture frames
6. Export: COCO JSON for training
