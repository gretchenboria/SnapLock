# SnapLock Testing Guide

## Test Environment

- Node: 18+
- Browser: Chrome/Firefox (latest)
- Servers: Frontend (5173), Backend (3001)

## Pre-Test Checklist

1. Backend server running on port 3001
2. Frontend server running on port 5173
3. Gemini API key configured in .env
4. Browser console open (F12) for error monitoring

## Critical Path Tests

### 1. Auto-Spawn Functionality

**Test ID:** AUTO-001
**Priority:** CRITICAL
**Steps:**
1. Load http://localhost:5173/
2. Verify Auto-Spawn toggle is ON (default)
3. Wait 5 seconds
4. Verify: 3D objects appear in viewport
5. Verify: Objects have physics (falling/rotating)
6. Verify: Logs show "Spawned N groups" message
7. Wait 15 seconds
8. Verify: New objects spawn automatically
9. Verify: Prompt input updates with new prompt

**Expected:**
Objects visible and physics-simulated within 5 seconds.

**Failure Modes:**
- No objects: Check Gemini API key
- Objects not visible: Check AssetRenderer/SimulationLayerV2
- No auto-spawn: Check interval timer in App.tsx:519

---

### 2. Manual Prompt Input

**Test ID:** PROMPT-001
**Priority:** CRITICAL
**Steps:**
1. Toggle Auto-Spawn OFF
2. Enter: "Zero-G collision of gold sphere vs 200 steel cubes"
3. Press Enter or click Analyze
4. Verify: Loading indicator appears
5. Verify: Objects spawn within 3 seconds
6. Verify: Objects match prompt (gold sphere, steel cubes)
7. Verify: Zero gravity (objects float, no falling)

**Expected:**
Prompt analysis creates matching objects with correct physics.

**Failure Modes:**
- Analysis hangs: Check backend /api/analyze-physics
- Wrong objects: Check geminiService.ts model configuration
- Physics wrong: Check PhysicsEngine gravity parameters

---

### 3. Floating Characters UI

**Test ID:** CHAR-001
**Priority:** HIGH
**Steps:**
1. Verify 3 floating characters visible:
   - Lazarus Bug (top-left, green glow)
   - Chaos Skull (top-right, red glow, only if Chaos active)
   - Snappy Eyes (bottom-right, cyan glow)
2. Verify gentle floating animation (translateY oscillation)
3. Click Lazarus
4. Verify: Logs show "Lazarus: Running diagnostics..."
5. Verify: Auto-fix attempts if issues detected
6. Click Snappy
7. Verify: Chat window opens bottom-left
8. Enter "What is SnapLock?"
9. Verify: AI response received

**Expected:**
All characters functional, animations smooth, click handlers work.

**Failure Modes:**
- Characters missing: Check FloatingCharacters import in App.tsx
- No animation: Check CSS @keyframes float
- Click no-op: Check handler bindings

---

### 4. Physics Simulation

**Test ID:** PHYS-001
**Priority:** CRITICAL
**Steps:**
1. Spawn objects with "Avalanche of 100 cubes"
2. Verify: Cubes fall due to gravity
3. Verify: Cubes collide with ground plane
4. Verify: Cubes bounce (restitution > 0)
5. Check telemetry panel:
   - FPS > 50
   - Particle Count = 100
   - System Energy decreases over time
   - Stability Score increases as settled
6. Verify: No objects pass through ground

**Expected:**
Accurate rigid body physics with collision detection.

**Failure Modes:**
- Objects static: Check Rapier initialization
- Pass through ground: Check PhysicsEngine ground plane
- Low FPS: Check particle count, reduce complexity

---

### 5. Control Panel Buttons

**Test ID:** UI-001
**Priority:** HIGH
**Steps:**

Test each button:

| Button | Expected Behavior |
|--------|-------------------|
| Analyze | Analyzes prompt, spawns objects |
| Pause/Play | Freezes/resumes simulation |
| Reset | Clears scene, respawns at initial positions |
| Reset Camera | Returns camera to default position |
| Snap Reality | Generates photorealistic image from wireframe |
| Generate Video | Creates video using Veo 3.1 |
| Download CSV | Exports physics data as CSV |
| Generate Report | Creates HTML technical report |
| Auto-Spawn Toggle | Enables/disables automatic spawning |
| Chaos Mode Toggle | Activates adversarial director |

**Expected:**
All buttons functional, no console errors.

**Failure Modes:**
- Button no-op: Check handler bindings in ControlPanel
- Error on click: Check service methods (geminiService, mlExportService)

---

### 6. View Modes

**Test ID:** VIEW-001
**Priority:** MEDIUM
**Steps:**
1. Spawn objects
2. Switch to each view mode:
   - RGB: Full color, lighting, shadows
   - DEPTH: Grayscale depth visualization
   - LIDAR: Point cloud with emissive materials
   - WIREFRAME: Wireframe overlay
3. Verify: Each mode renders correctly
4. Verify: No performance degradation

**Expected:**
All view modes functional, real-time switching.

**Failure Modes:**
- Mode not switching: Check viewMode state in PhysicsScene
- Rendering errors: Check material configuration per mode

---

### 7. ML Export Functions

**Test ID:** EXPORT-001
**Priority:** MEDIUM
**Steps:**

**CSV Export:**
1. Spawn objects, wait 3 seconds
2. Click "Download CSV"
3. Verify: File downloads
4. Open file: Check header, data rows, metadata

**COCO Export:**
1. Click "Record ML" (5 seconds)
2. Click "Export COCO"
3. Verify: ZIP file downloads
4. Extract: Check coco_annotations.json structure
5. Verify: Valid COCO format (images, annotations, categories arrays)

**YOLO Export:**
1. Record ML data
2. Click "Export YOLO"
3. Verify: ZIP file downloads
4. Extract: Check .txt files per frame, classes.txt
5. Verify: Normalized bounding boxes (0-1 range)

**Expected:**
All export formats valid and complete.

**Failure Modes:**
- Export fails: Check MLExportService validation
- Invalid format: Check COCO/YOLO format generators
- Empty data: Check ground truth capture

---

### 8. Chaos Mode

**Test ID:** CHAOS-001
**Priority:** MEDIUM
**Steps:**
1. Spawn objects
2. Enable Chaos Mode
3. Verify: Chaos Skull appears (floating, red glow)
4. Wait 6 seconds
5. Verify: Logs show "CHAOS: [ACTION]"
6. Verify: Physics parameters change (gravity shift, wind, etc.)
7. Verify: Scene becomes unstable
8. Disable Chaos Mode
9. Verify: Skull disappears
10. Verify: Scene returns to normal

**Expected:**
Adversarial director actively disrupts simulation.

**Failure Modes:**
- No disruptions: Check analyzeSceneStability API call
- Skull not visible: Check FloatingCharacters conditional render
- No vision analysis: Check Gemini 3 Pro vision model

---

### 9. Lazarus Auto-Fix

**Test ID:** DEBUG-001
**Priority:** HIGH
**Steps:**

**Empty Scene Fix:**
1. Disable Auto-Spawn
2. Click Reset (clear scene)
3. Click Lazarus Bug
4. Verify: Logs show diagnostics
5. Verify: Scene populates if Auto-Spawn available

**Paused Simulation Fix:**
1. Spawn objects
2. Pause simulation
3. Click Lazarus
4. Verify: Simulation unpauses

**Health Check:**
1. Normal operation (objects simulating)
2. Click Lazarus
3. Verify: "All systems healthy" message

**Expected:**
Lazarus detects and fixes common issues automatically.

**Failure Modes:**
- No diagnostics: Check LazarusDebugger.runDiagnostics
- No fixes applied: Check handleLazarusClick in App.tsx
- False positives: Review diagnostic thresholds

---

## Performance Benchmarks

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| FPS | > 50 | < 30 |
| Particle Count | 500 | 1000 |
| System Energy Calc | < 5ms | > 10ms |
| Auto-Spawn Interval | 15s | N/A |
| Chaos Cycle Interval | 6s | N/A |

## Error Monitoring

Monitor browser console for:
- Rapier initialization failures
- Gemini API errors (401, 429, 503)
- Physics engine crashes
- Memory leaks (increasing heap size)
- WebGL context loss

## Regression Tests

Run after any code changes:
1. AUTO-001 (Auto-Spawn)
2. PROMPT-001 (Manual Prompt)
3. PHYS-001 (Physics)
4. UI-001 (All Buttons)

## Known Issues

None currently documented.

## Test Report Template

```
Test Session: [DATE] [TIME]
Tester: [NAME]
Branch: [GIT BRANCH]
Commit: [GIT HASH]

Test Results:
- AUTO-001: [PASS/FAIL]
- PROMPT-001: [PASS/FAIL]
- CHAR-001: [PASS/FAIL]
- PHYS-001: [PASS/FAIL]
- UI-001: [PASS/FAIL]
- VIEW-001: [PASS/FAIL]
- EXPORT-001: [PASS/FAIL]
- CHAOS-001: [PASS/FAIL]
- DEBUG-001: [PASS/FAIL]

Failures:
[List any failed tests with details]

Console Errors:
[Paste any error messages]

Performance:
- FPS: [VALUE]
- Max Particles Tested: [VALUE]

Notes:
[Additional observations]
```
