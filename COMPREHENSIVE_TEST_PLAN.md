# SnapLock Comprehensive Test Plan

## Test Coverage Overview

This document provides a complete testing strategy for SnapLock, including edge cases, regression tests, and validation procedures.

---

## 1. Core Functionality Tests

### 1.1 Prompt Analysis & Scene Generation

#### Test Cases:
| Test ID | Description | Input | Expected Output | Status |
|---------|-------------|-------|-----------------|--------|
| CORE-001 | Simple object prompt | "metal sphere on table" | Scene with sphere + table, metal properties | ✅ |
| CORE-002 | Complex scene prompt | "surgical robot manipulating tissue on operating table" | Multi-object scene with correct rigid body types | ✅ |
| CORE-003 | Zero-gravity prompt | "astronaut floating in space station" | Gravity = 0, FLOAT spawn mode | ✅ |
| CORE-004 | High object count | "1000 marbles in pile" | Performance test, 1000 objects rendered | ⚠️ |
| CORE-005 | Empty prompt | "" (empty string) | Error message or fallback scene | ✅ |
| CORE-006 | Special characters | "object@#$%^&*()!?" | Sanitized, valid scene generation | ✅ |
| CORE-007 | Extremely long prompt | 500+ character prompt | Truncated or processed correctly | ✅ |
| CORE-008 | Non-English prompt | "机器人" (Chinese for robot) | English fallback or translation | ⚠️ |

**Edge Cases:**
- ❌ **EDGE-001**: Prompt with only whitespace → Should show validation error
- ❌ **EDGE-002**: Prompt with SQL injection attempt → Should sanitize input
- ❌ **EDGE-003**: Prompt requesting impossible physics → Should clamp to valid ranges
- ❌ **EDGE-004**: Conflicting materials ("metal glass sphere") → Should pick primary material

### 1.2 Physics Simulation

#### Test Cases:
| Test ID | Description | Test Procedure | Expected Result | Status |
|---------|-------------|----------------|-----------------|--------|
| PHYS-001 | Energy conservation | Drop object from height, measure KE at bottom | Matches PE at top (±5%) | ✅ |
| PHYS-002 | Collision response | Two objects collide head-on | Momentum conserved | ✅ |
| PHYS-003 | Friction accuracy | Slide object on surface | Stops in realistic time | ✅ |
| PHYS-004 | Restitution (bounce) | Drop ball on floor | Bounces to correct height | ✅ |
| PHYS-005 | Rigid body types | STATIC objects don't move when hit | STATIC stays put, DYNAMIC moves | ✅ |
| PHYS-006 | KINEMATIC motion | Robotic arm moves without physics forces | Follows path, ignores collisions | ✅ |
| PHYS-007 | High-speed collision | Objects at 100 m/s collide | No NaN, no tunneling | ⚠️ |
| PHYS-008 | Zero mass object | Create object with mass = 0 | Should default to minimum mass | ❌ |
| PHYS-009 | Negative restitution | Set restitution = -0.5 | Should clamp to [0, 1] | ✅ |
| PHYS-010 | Extreme gravity | Set gravity = -1000 m/s² | Objects accelerate correctly | ⚠️ |

**Edge Cases:**
- ❌ **EDGE-005**: NaN values in physics parameters → Should reject/sanitize
- ❌ **EDGE-006**: Infinite mass collision → Should handle gracefully
- ❌ **EDGE-007**: Simulation at 1 FPS → Should maintain determinism
- ❌ **EDGE-008**: 10,000 simultaneous collisions → Should not crash

### 1.3 Rigid Body Type Assignment

#### Test Cases:
| Test ID | Object Type | Expected Rigid Body Type | Rationale | Status |
|---------|-------------|-------------------------|-----------|--------|
| RB-001 | "operating table" | STATIC | Fixed surgical surface | ✅ |
| RB-002 | "heart model" | STATIC | Tissue being operated on | ✅ |
| RB-003 | "da vinci robot" | KINEMATIC | Controlled robotic motion | ✅ |
| RB-004 | "surgical needle" | DYNAMIC | Physics-driven tool | ✅ |
| RB-005 | "floor" / "ground" | STATIC | Environment | ✅ |
| RB-006 | "robotic arm" | KINEMATIC | Programmed motion | ✅ |
| RB-007 | "assembly part" | DYNAMIC | Free-moving object | ✅ |

**Edge Cases:**
- ❌ **EDGE-009**: Ambiguous object ("robot part") → Should default to DYNAMIC
- ❌ **EDGE-010**: Conflicting modifiers ("moving floor") → Should prioritize context

---

## 2. Dataset Mode (Auto-Spawn) Tests

### 2.1 Functional Tests

| Test ID | Description | Test Procedure | Expected Result | Status |
|---------|-------------|----------------|-----------------|--------|
| DS-001 | Enable without prompt | Enable Dataset Mode with empty prompt | Should disable and show warning | ✅ |
| DS-002 | 15-second cycle | Enable Dataset Mode, wait 15s | New variation generated | ✅ |
| DS-003 | Variation diversity | Generate 10 variations, compare | Material properties vary ±20% | ⚠️ |
| DS-004 | Consistent geometry | Generate 10 variations | Same shapes/layout | ✅ |
| DS-005 | Stop dataset mode | Click button while running | Stops generating | ✅ |
| DS-006 | Edit prompt during | Change prompt while Dataset Mode active | Should disable mode | ✅ |
| DS-007 | Dataset + recording | Enable both simultaneously | Both work together | ❌ |
| DS-008 | 1000 variations | Run for 4+ hours | Memory stable, no leaks | ❌ |

**Edge Cases:**
- ❌ **EDGE-011**: Browser tab backgrounded during Dataset Mode → Should continue or pause gracefully
- ❌ **EDGE-012**: Dataset Mode + Chaos Mode together → Should handle both
- ❌ **EDGE-013**: Rapid enable/disable toggling → Should debounce

---

## 3. Video Recording & ML Export Tests

### 3.1 Video Recording

| Test ID | Description | Test Procedure | Expected Result | Status |
|---------|-------------|----------------|-----------------|--------|
| VID-001 | Start recording | Click START RECORDING | Red dot appears, frame count increases | ⚠️ |
| VID-002 | Stop recording | Click STOP after 100 frames | Recording stops, data captured | ⚠️ |
| VID-003 | Single frame snap | Click SNAP button | Single frame captured | ⚠️ |
| VID-004 | Recording + simulation | Record while physics running | Frames captured at correct rate | ⚠️ |
| VID-005 | Recording during pause | Pause simulation, continue recording | Should handle gracefully | ❌ |
| VID-006 | Long recording | Record 10,000+ frames | Memory stable, no slowdown | ❌ |
| VID-007 | Export to MP4 | Generate video file from frames | Valid MP4 output | ❌ |

### 3.2 ML Ground Truth Export

| Test ID | Description | Test Procedure | Expected Result | Status |
|---------|-------------|----------------|-----------------|--------|
| ML-001 | COCO JSON export | Export after recording | Valid COCO format JSON | ⚠️ |
| ML-002 | YOLO export | Export YOLO annotations | Correct normalized coords | ⚠️ |
| ML-003 | Bounding box accuracy | Compare 2D boxes to 3D projections | Pixel-perfect accuracy | ❌ |
| ML-004 | Occlusion detection | Export scene with overlapping objects | Occluded objects marked | ❌ |
| ML-005 | Camera intrinsics | Verify camera matrix in export | Mathematically correct | ⚠️ |
| ML-006 | Multiple objects | Scene with 50+ objects | All annotated correctly | ❌ |

**Edge Cases:**
- ❌ **EDGE-014**: Export with 0 frames captured → Should show error
- ❌ **EDGE-015**: Export during active recording → Should disable or handle
- ❌ **EDGE-016**: Objects moving faster than camera FPS → Motion blur / interpolation

---

## 4. Renderer & Graphics Tests

### 4.1 View Modes

| Test ID | Description | Test Procedure | Expected Result | Status |
|---------|-------------|----------------|-----------------|--------|
| REND-001 | RGB view | Switch to RGB | Photorealistic PBR rendering | ✅ |
| REND-002 | Depth view | Switch to DEPTH | Grayscale depth map | ✅ |
| REND-003 | LiDAR view | Switch to LIDAR | Point cloud simulation | ✅ |
| REND-004 | Wireframe view | Switch to WIREFRAME | Geometry edges visible | ✅ |
| REND-005 | Switch during sim | Change view while physics running | Smooth transition | ✅ |
| REND-006 | Performance | Run each view for 60s | Stable 60 FPS | ⚠️ |

### 4.2 Domain Randomization

| Test ID | Description | Test Procedure | Expected Result | Status |
|---------|-------------|----------------|-----------------|--------|
| DR-001 | Color variation | Generate 10 scenes, compare colors | Hue varies ±10% | ✅ |
| DR-002 | Roughness variation | Compare material roughness | Varies ±15% | ✅ |
| DR-003 | Metalness variation | Compare metalness values | Varies ±10% | ✅ |
| DR-004 | Lighting variation | Check envMapIntensity | Random 1.0-2.0 | ✅ |
| DR-005 | Consistent primitives | Same prompt → same shapes | Geometry consistent | ✅ |

**Edge Cases:**
- ❌ **EDGE-017**: Extreme material values (roughness > 1.0) → Should clamp
- ❌ **EDGE-018**: Color randomization on grayscale prompt → Should preserve intent

---

## 5. Error Handling & Stability Tests

### 5.1 API & Network Errors

| Test ID | Description | Test Procedure | Expected Result | Status |
|---------|-------------|----------------|-----------------|--------|
| ERR-001 | No API key | Remove API key, try generation | Clear error message | ✅ |
| ERR-002 | Invalid API key | Use wrong key | Authentication error shown | ✅ |
| ERR-003 | API quota exceeded | Trigger rate limit | Fallback scene generation | ✅ |
| ERR-004 | Network offline | Disconnect network | Offline error message | ⚠️ |
| ERR-005 | API timeout | Slow network, 30s timeout | Retry with backoff | ✅ |
| ERR-006 | Malformed API response | Invalid JSON from API | Graceful error handling | ⚠️ |

### 5.2 Renderer Crashes

| Test ID | Description | Test Procedure | Expected Result | Status |
|---------|-------------|----------------|-----------------|--------|
| CRASH-001 | WebGL context loss | Simulate GPU crash | Error boundary catches | ✅ |
| CRASH-002 | OBJ model load fail | Try loading .obj file | Falls back to primitive | ✅ |
| CRASH-003 | Out of memory | Create 50,000 objects | Graceful degradation | ❌ |
| CRASH-004 | Invalid geometry | NaN in vertex positions | Error caught, no crash | ❌ |

### 5.3 User Input Validation

| Test ID | Description | Input | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| VAL-001 | Negative object count | count: -10 | Clamp to minimum (1) | ✅ |
| VAL-002 | Zero scale | scale: 0 | Clamp to minimum (0.1) | ⚠️ |
| VAL-003 | Extreme mass | mass: 1000000 kg | Allow or warn | ⚠️ |
| VAL-004 | Invalid color | color: "notacolor" | Default to fallback | ✅ |
| VAL-005 | NaN in vector | position: {x: NaN, y: 0, z: 0} | Reject or default | ❌ |

**Edge Cases:**
- ❌ **EDGE-019**: Infinity in physics parameters → Should sanitize
- ❌ **EDGE-020**: Empty asset group array → Should generate default scene
- ❌ **EDGE-021**: Circular joint constraints → Should detect and reject

---

## 6. Performance & Stress Tests

### 6.1 Object Count Scaling

| Objects | Target FPS | Actual FPS | Memory Usage | Status |
|---------|-----------|------------|--------------|--------|
| 10 | 60 | TBD | TBD | ⏳ |
| 50 | 60 | TBD | TBD | ⏳ |
| 100 | 60 | TBD | TBD | ⏳ |
| 500 | 60 | TBD | TBD | ⏳ |
| 1000 | 45+ | TBD | TBD | ⏳ |
| 5000 | 30+ | TBD | TBD | ⏳ |

### 6.2 Long-Running Stability

| Test ID | Description | Duration | Expected Result | Status |
|---------|-------------|----------|-----------------|--------|
| PERF-001 | 1-hour simulation | 60 minutes | No memory leaks, stable FPS | ⏳ |
| PERF-002 | 24-hour dataset generation | 24 hours | Generates 5760 variations | ⏳ |
| PERF-003 | Repeated resets | 1000 reset cycles | No degradation | ⏳ |

**Edge Cases:**
- ❌ **EDGE-022**: Browser tab switching during stress test → Should pause physics
- ❌ **EDGE-023**: Low-end GPU (integrated graphics) → Should detect and optimize

---

## 7. Regression Tests (Core Features)

### Must-Work Features (Critical Path):

| Feature | Test | Regression Check | Status |
|---------|------|------------------|--------|
| Prompt → Scene | Type prompt, click GENERATE | Scene appears with correct objects | ✅ |
| Play/Pause | Click pause/play buttons | Simulation stops/starts | ✅ |
| Reset | Click reset button | Scene resets to initial state | ✅ |
| Dataset Mode | Enable Dataset Mode | Variations generate every 15s | ✅ |
| View Modes | Switch between RGB/DEPTH/LIDAR/WIREFRAME | Views render correctly | ✅ |
| Camera Controls | Orbit with mouse | Camera moves smoothly | ✅ |
| Video Recording | START → STOP → Export | Frames captured and exported | ⚠️ |
| API Configuration | Set API key in settings | Key persists, API works | ✅ |

### Previously Broken Features (Watch For Regressions):

| Issue | Previous Behavior | Fix Applied | Regression Test | Status |
|-------|-------------------|-------------|-----------------|--------|
| I.refCleanup crash | App crashed on model load | Disabled OBJ loading | Try loading scene → no crash | ✅ |
| Empty blue screen | Error with no message | Added ErrorBoundary | Trigger error → see message | ✅ |
| Hidden Dataset Mode | Button was small/unclear | Made prominent | Button visible at top | ✅ |
| Missing video controls | Recording buried in DATA tab | Moved to top row | Recording buttons obvious | ✅ |

---

## 8. Browser Compatibility Tests

### Supported Browsers:

| Browser | Version | Desktop | Mobile | WebGL Support | Status |
|---------|---------|---------|--------|---------------|--------|
| Chrome | Latest | ✅ | ✅ | WebGL 2.0 | ⏳ |
| Firefox | Latest | ✅ | ⚠️ | WebGL 2.0 | ⏳ |
| Safari | Latest | ✅ | ⚠️ | WebGL 2.0 | ⏳ |
| Edge | Latest | ✅ | ✅ | WebGL 2.0 | ⏳ |
| Opera | Latest | ✅ | ❌ | WebGL 2.0 | ⏳ |

**Edge Cases:**
- ❌ **EDGE-024**: Browser without WebGL support → Should show compatibility error
- ❌ **EDGE-025**: Mobile Safari (iOS) → Physics may run slower, should warn

---

## 9. Accessibility Tests

| Test ID | Description | Expected Result | Status |
|---------|-------------|-----------------|--------|
| A11Y-001 | Keyboard navigation | All controls accessible via Tab | ⏳ |
| A11Y-002 | Screen reader | ARIA labels on all buttons | ⏳ |
| A11Y-003 | High contrast mode | UI visible in high contrast | ⏳ |
| A11Y-004 | Color blindness | Color not sole indicator | ⏳ |

---

## 10. Security Tests

| Test ID | Description | Test Procedure | Expected Result | Status |
|---------|-------------|----------------|-----------------|--------|
| SEC-001 | XSS in prompt | Inject `<script>alert(1)</script>` | Sanitized, no execution | ⏳ |
| SEC-002 | API key exposure | Check network requests | Key not in clear text | ⏳ |
| SEC-003 | Local storage | Check stored data | Only non-sensitive data | ⏳ |
| SEC-004 | CORS bypass attempt | Try loading external resources | Blocked by policy | ⏳ |

---

## Test Execution Legend:

- ✅ **PASS**: Test passed, feature works as expected
- ⚠️ **PARTIAL**: Feature works but with limitations/warnings
- ❌ **FAIL**: Test failed, bug identified
- ⏳ **PENDING**: Test not yet executed

---

## Next Steps:

1. Execute all PENDING tests (⏳)
2. Fix all FAIL cases (❌)
3. Investigate PARTIAL warnings (⚠️)
4. Add automated test suite for critical path
5. Set up CI/CD regression testing

---

**Test Plan Version**: 1.0
**Last Updated**: 2024-12-18
**Target Coverage**: 95% of user workflows
