# SnapLock Regression Test Script

**Purpose**: Quick manual testing script to verify core functionality after deployments

**Time Required**: ~10 minutes

**Frequency**: Run before every production deployment and after major changes

---

## Pre-Test Setup

- [ ] Clear browser cache and cookies
- [ ] Use Chrome/Firefox latest version
- [ ] Have valid Gemini API key ready
- [ ] Open DevTools console for error monitoring
- [ ] Navigate to: https://snaplock.netlify.app

---

## Critical Path Tests (Must Pass)

### TEST 1: Application Loads
**Steps:**
1. Open https://snaplock.netlify.app
2. Wait for page to load

**Expected Result:**
- ✅ Page loads within 3 seconds
- ✅ No console errors
- ✅ UI visible (command line, buttons, 3D canvas)
- ✅ No blue screen / blank page

**Status:** ⬜ PASS / ⬜ FAIL

**Notes:**
```
_______________________
```

---

### TEST 2: API Configuration
**Steps:**
1. Click "API" button (top right)
2. Enter valid Gemini API key
3. Click "Save"
4. Refresh page

**Expected Result:**
- ✅ Modal opens when clicking API button
- ✅ Key saves successfully
- ✅ Key persists after refresh
- ✅ Success message appears

**Status:** ⬜ PASS / ⬜ FAIL

**Notes:**
```
_______________________
```

---

### TEST 3: Basic Scene Generation
**Steps:**
1. Type in command line: `metal sphere on wooden table`
2. Press Enter or click "GENERATE 3D TWIN"
3. Wait for generation

**Expected Result:**
- ✅ Loading indicator appears
- ✅ Scene generates within 10 seconds
- ✅ Console shows AI logs
- ✅ 3D objects appear (sphere + table)
- ✅ Objects have correct materials (metal=shiny, wood=matte)
- ✅ Physics runs (objects fall/settle)
- ✅ No "I.refCleanup" error
- ✅ No crash or blue screen

**Status:** ⬜ PASS / ⬜ FAIL

**Console Errors (if any):**
```
_______________________
```

---

### TEST 4: Physics Simulation
**Steps:**
1. Observe objects in scene from TEST 3
2. Watch for 10 seconds

**Expected Result:**
- ✅ Sphere falls onto table
- ✅ Table stays static (doesn't fall)
- ✅ Sphere stops moving (settles)
- ✅ No objects flying off to infinity
- ✅ No NaN values in console
- ✅ FPS counter shows 50-60 FPS

**Status:** ⬜ PASS / ⬜ FAIL

**Notes:**
```
_______________________
```

---

### TEST 5: Play/Pause/Reset Controls
**Steps:**
1. Click PAUSE button
2. Wait 2 seconds
3. Click PLAY button
4. Wait 2 seconds
5. Click RESET button

**Expected Result:**
- ✅ PAUSE: Simulation freezes, objects stop moving
- ✅ PLAY: Simulation resumes from paused state
- ✅ RESET: Scene resets to initial configuration
- ✅ No console errors during state transitions

**Status:** ⬜ PASS / ⬜ FAIL

**Notes:**
```
_______________________
```

---

### TEST 6: View Modes
**Steps:**
1. Click RGB view button (eye icon)
2. Click DEPTH view button (grid icon)
3. Click LIDAR view button (scan icon)
4. Click WIREFRAME view button (box icon)

**Expected Result:**
- ✅ RGB: Colored, textured objects
- ✅ DEPTH: Grayscale depth map
- ✅ LIDAR: Points or depth visualization
- ✅ WIREFRAME: Black edges, no fills
- ✅ Each view renders without errors
- ✅ Performance remains stable

**Status:** ⬜ PASS / ⬜ FAIL

**Notes:**
```
_______________________
```

---

### TEST 7: Dataset Mode
**Steps:**
1. Type prompt: `robotic arm with blocks`
2. Click "GENERATE 3D TWIN"
3. Wait for scene to load
4. Click "DATASET MODE" button (large green button)
5. Wait 15 seconds
6. Observe scene

**Expected Result:**
- ✅ Button changes to active state (green glow, "RECORDING" badge)
- ✅ Progress bar animates (15s cycle)
- ✅ After 15s, scene regenerates with variation
- ✅ Objects are same shapes, but materials vary slightly
- ✅ Can click button again to disable

**Status:** ⬜ PASS / ⬜ FAIL

**Variations Generated:** _____ (count)

**Notes:**
```
_______________________
```

---

### TEST 8: Video Recording Controls
**Steps:**
1. From previous scene, click "START RECORDING" button (red)
2. Wait 5 seconds (let simulation run)
3. Click "STOP • X FRAMES" button

**Expected Result:**
- ✅ START RECORDING button is visible at top
- ✅ Button changes to "STOP • X FRAMES" (animated, pulsing)
- ✅ Frame counter increases each frame
- ✅ Stop button ends recording
- ✅ Frame count displays correctly

**Status:** ⬜ PASS / ⬜ FAIL

**Frames Captured:** _____ frames

**Notes:**
```
_______________________
```

---

### TEST 9: Camera Controls
**Steps:**
1. Click and drag in 3D viewport
2. Scroll mouse wheel
3. Right-click and drag

**Expected Result:**
- ✅ Left drag: Orbits camera around scene
- ✅ Scroll: Zooms in/out smoothly
- ✅ Right drag: Pans camera
- ✅ Camera doesn't clip through objects
- ✅ Reset camera button works

**Status:** ⬜ PASS / ⬜ FAIL

**Notes:**
```
_______________________
```

---

### TEST 10: Error Handling
**Steps:**
1. Type prompt: `<script>alert(1)</script>`
2. Click GENERATE
3. Observe result

**Expected Result:**
- ✅ XSS attempt is sanitized (no alert popup)
- ✅ Scene generates (AI interprets as text)
- ✅ No security vulnerability
- ✅ Console may show sanitization log

**Status:** ⬜ PASS / ⬜ FAIL

**Notes:**
```
_______________________
```

---

## Secondary Tests (Important But Not Blocking)

### TEST 11: Complex Scene
**Steps:**
1. Type: `surgical robot da vinci manipulating heart tissue on operating table`
2. Generate scene

**Expected:**
- ✅ Multiple objects created
- ✅ Correct rigid body types (table=STATIC, robot=KINEMATIC, tissue=STATIC)
- ✅ Realistic layout
- ✅ No crashes

**Status:** ⬜ PASS / ⬜ FAIL

---

### TEST 12: Chaos Mode
**Steps:**
1. Create any scene
2. Click "CHAOS" button (skull icon)
3. Observe for 10 seconds

**Expected:**
- ✅ Random forces applied
- ✅ Objects move erratically
- ✅ FPS remains stable
- ✅ Can disable Chaos Mode

**Status:** ⬜ PASS / ⬜ FAIL

---

### TEST 13: Edge Case - Empty Prompt
**Steps:**
1. Clear prompt (empty string)
2. Try clicking GENERATE

**Expected:**
- ✅ Button is disabled (grayed out)
- ✅ No generation occurs
- ✅ No error thrown

**Status:** ⬜ PASS / ⬜ FAIL

---

### TEST 14: Edge Case - Very Long Prompt
**Steps:**
1. Type 500+ character prompt
2. Generate scene

**Expected:**
- ✅ Prompt is truncated or fully processed
- ✅ Scene generates correctly
- ✅ No timeout errors

**Status:** ⬜ PASS / ⬜ FAIL

---

### TEST 15: Edge Case - Special Characters
**Steps:**
1. Type: `robot @#$%^&*() tool`
2. Generate scene

**Expected:**
- ✅ Special chars ignored or sanitized
- ✅ Scene with robot and tool created
- ✅ No parsing errors

**Status:** ⬜ PASS / ⬜ FAIL

---

## Performance Tests

### TEST 16: FPS Stability
**Steps:**
1. Create scene with 100+ objects: `pile of 100 metal balls`
2. Let simulation run for 60 seconds
3. Monitor FPS counter

**Expected:**
- ✅ Initial FPS: 45-60
- ✅ After 60s: Still 40-60 (no degradation)
- ✅ No memory leaks visible in DevTools

**Status:** ⬜ PASS / ⬜ FAIL

**FPS (initial):** _____ | **FPS (after 60s):** _____

---

### TEST 17: Multiple Resets
**Steps:**
1. Create any scene
2. Click RESET 10 times rapidly
3. Observe stability

**Expected:**
- ✅ App handles rapid resets without crashing
- ✅ Scene resets correctly each time
- ✅ No memory spikes

**Status:** ⬜ PASS / ⬜ FAIL

---

## Browser Compatibility

### TEST 18: Chrome
**Browser:** Chrome (version: _____)
**Status:** ⬜ PASS / ⬜ FAIL
**Issues:**
```
_______________________
```

### TEST 19: Firefox
**Browser:** Firefox (version: _____)
**Status:** ⬜ PASS / ⬜ FAIL
**Issues:**
```
_______________________
```

### TEST 20: Safari
**Browser:** Safari (version: _____)
**Status:** ⬜ PASS / ⬜ FAIL
**Issues:**
```
_______________________
```

---

## Test Summary

**Date Tested:** _______________
**Tested By:** _______________
**Build/Commit:** _______________

### Results:
- Critical Path Tests (1-10): _____ / 10 PASS
- Secondary Tests (11-15): _____ / 5 PASS
- Performance Tests (16-17): _____ / 2 PASS
- Browser Tests (18-20): _____ / 3 PASS

**Overall Status:** ⬜ APPROVED FOR DEPLOYMENT / ⬜ ISSUES FOUND

### Critical Blockers (Must Fix Before Deploy):
```
1. ___________________________
2. ___________________________
3. ___________________________
```

### Non-Critical Issues (Can Deploy, Fix Later):
```
1. ___________________________
2. ___________________________
3. ___________________________
```

### Recommendations:
```
___________________________________
___________________________________
___________________________________
```

---

## Quick Smoke Test (2 Minutes)

If time-constrained, run this minimal test:

1. ✅ Page loads without errors
2. ✅ Enter prompt → Generate scene → Objects appear
3. ✅ Physics runs (objects fall/collide)
4. ✅ PAUSE/PLAY/RESET work
5. ✅ No crashes or console errors

**Smoke Test Status:** ⬜ PASS / ⬜ FAIL

---

**Script Version:** 1.0
**Last Updated:** 2024-12-18
