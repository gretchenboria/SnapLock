# SnapLock User Guide

**Version**: 1.0
**Last Updated**: 2024-12-18

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Features](#core-features)
   - [1. Generate 3D Scene](#1-generate-3d-scene)
   - [2. Dataset Mode (Auto-Spawn)](#2-dataset-mode-auto-spawn)
   - [3. Video Recording & Download](#3-video-recording--download)
   - [4. Synthetic Data Report & Export](#4-synthetic-data-report--export)
3. [Advanced Features](#advanced-features)
4. [Troubleshooting](#troubleshooting)
5. [FAQ](#faq)

---

## Getting Started

### Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- WebGL 2.0 support
- Google Gemini API key
- Internet connection (for AI scene generation)

### Initial Setup

1. **Open SnapLock**: Navigate to https://snaplock.netlify.app
2. **Configure API Key**:
   - Click "API" button (top right corner)
   - Enter your Google Gemini API key
   - Click "Save"
   - Key is saved to browser local storage

3. **Verify Setup**:
   - Type a simple prompt: `metal sphere on table`
   - Click "GENERATE 3D TWIN"
   - If scene appears, you're ready!

---

## Core Features

## 1. Generate 3D Scene

### Purpose
Create physics-accurate 3D digital twins from natural language descriptions.

### How To Use

**Step 1**: Enter Prompt
- Click in the command line (top center)
- Type your scene description
- Examples:
  - `surgical robot manipulating tissue on operating table`
  - `robotic arm assembling metal parts on workbench`
  - `astronaut floating in zero gravity with tools`

**Step 2**: Generate Scene
- Click **"GENERATE 3D TWIN"** button (cyan, top right)
- OR press Enter key
- Wait 3-10 seconds for AI to process

**Step 3**: Observe Simulation
- Scene renders with photorealistic materials
- Physics simulation starts automatically
- Objects fall, collide, settle realistically

### Scene Generation Tips

**Good Prompts:**
- ✅ Be specific: "da vinci surgical robot" not just "robot"
- ✅ Include context: "on operating table" / "in space station"
- ✅ Specify materials: "metal sphere" / "wooden table"
- ✅ Mention physics: "falling", "floating", "stacked"

**What Gets Generated:**
- **STATIC** objects: floors, tables, fixed surfaces (don't move)
- **KINEMATIC** objects: robotic arms, controlled devices (programmed motion)
- **DYNAMIC** objects: tools, parts, items (physics-driven)

**Example Scenes:**
```
Surgical Simulation:
"da vinci surgical robot manipulating heart tissue on operating table with surgical instruments"

Industrial Robotics:
"kuka robotic arm assembling engine parts on assembly line workstation"

Zero-G Environment:
"astronaut in space station manipulating floating tools and equipment"

Medical Training:
"medical robot performing laparoscopic surgery with forceps and needle on tissue model"
```

---

## 2. Dataset Mode (Auto-Spawn)

### Purpose
Automatically generate hundreds/thousands of scene variations for machine learning training data.

### How To Use

**Step 1**: Generate Base Scene
- Enter your prompt and generate a scene first
- Let it settle (2-3 seconds)

**Step 2**: Enable Dataset Mode
- Click **"DATASET MODE"** button (large green button, top center)
- Button turns green with pulsing animation
- "RECORDING" badge appears
- Progress bar shows 15-second cycle

**Step 3**: Variations Generate Automatically
- Every 15 seconds, a NEW variation generates
- Same objects, same layout
- **Materials randomized**: colors, roughness, metalness vary ±20%
- **Lighting randomized**: environment intensity varies
- **Physics variations**: friction, restitution vary ±20%

**Step 4**: Let It Run
- Leave running for hours/days
- Generates 4 variations per minute
- 240 variations per hour
- 5,760 variations per day

**Step 5**: Stop Dataset Mode
- Click "DATASET MODE" button again to disable
- Or edit the prompt (auto-disables)

### What Gets Randomized

| Property | Base Value | Randomized Range |
|----------|-----------|------------------|
| Material Color | Original | ±10% hue shift |
| Roughness | From restitution | ±15% variation |
| Metalness | From friction | ±10% variation |
| Lighting | 1.0 | 1.0 - 2.0 random |
| Friction | AI-assigned | ±20% variation |
| Restitution | AI-assigned | ±20% variation |

### Why Use Dataset Mode?

**Machine Learning Training:**
- Generate diverse training data for CV models
- Each variation teaches model to generalize
- Prevents overfitting to one specific appearance
- Industry-standard approach (NVIDIA Isaac Sim)

**Simulation Testing:**
- Test algorithms across material variations
- Validate physics under different conditions
- Generate edge cases automatically

---

## 3. Video Recording & Download

### Purpose
Record simulation as video file with synchronized frame capture.

### How To Use

**Step 1**: Start Recording
- Click **"START RECORDING"** button (large red button, top center)
- Button changes to "STOP • X FRAMES" with pulse animation
- Frame counter increases in real-time
- Video recording begins from WebGL canvas

**Step 2**: Run Simulation
- Let physics simulation run
- Frames captured at 30 FPS
- All view modes supported (RGB, DEPTH, LIDAR, WIREFRAME)
- Can enable/disable Chaos Mode during recording

**Step 3**: Stop Recording
- Click **"STOP • X FRAMES"** button
- Recording stops immediately
- Frame count frozen

**Step 4**: Download Video
- Open DATA tab (right sidebar)
- Click "Download Recorded Video" button
- Video saves as `.webm` file
- Filename: `snaplock_recording_[timestamp].webm`

### Recording Tips

**Best Practices:**
- ✅ Start recording AFTER scene settles (avoid falling phase)
- ✅ Record 5-10 seconds minimum for smooth playback
- ✅ Use RGB view for presentations
- ✅ Use DEPTH/LIDAR view for CV training data
- ✅ Stop recording before generating new scene

**Performance:**
- 30 FPS capture rate
- WebM format (H.264 codec)
- File size: ~1-2 MB per 10 seconds
- Real-time encoding (no post-processing delay)

**What's Recorded:**
- ✅ Full WebGL canvas output
- ✅ All view modes (RGB, DEPTH, LIDAR, WIREFRAME)
- ✅ Physics simulation motion
- ✅ Material properties and lighting
- ❌ UI elements not included (clean video)

---

## 4. Synthetic Data Report & Export

### Purpose
Export complete simulation data with quaternion rotations, velocities, and physics ground truth for ML/CV pipelines.

### Available Export Formats

#### A. CSV Export (Physics Data)

**What's Included:**
```csv
# Metadata header with scene configuration
# Gravity, wind, behavior, asset groups

frame_id, particle_id, group_id, shape, mass,
pos_x, pos_y, pos_z,           # 3D position (meters)
vel_x, vel_y, vel_z,           # 3D velocity (m/s)
rot_x, rot_y, rot_z            # Euler rotation (radians)
```

**How To Export:**
1. Pause simulation (optional, for snapshot)
2. Open DATA tab (right sidebar)
3. Click "Download CSV" button
4. File saves as `snaplock_sim_data_[timestamp].csv`

**Use Cases:**
- Physics validation against real-world data
- Training data for motion prediction models
- Robotics path planning datasets
- Collision detection training

#### B. Simulation Report (Comprehensive PDF)

**What's Included:**
- **Scene Configuration**: All asset groups, physics parameters
- **Telemetry Data**: FPS, particle count, energy, velocity stats
- **Quaternion Data**: Sample object quaternion {x, y, z, w}
- **Physics Metrics**: Stability score, collision count, physics steps
- **Material Properties**: Friction, restitution, mass for each group
- **Visual Summary**: Snapshot of current simulation state

**How To Generate:**
1. Let simulation run for 10+ seconds (collect data)
2. Open DATA tab (right sidebar)
3. Click "Generate Report" button
4. Report opens in new window
5. Use browser Print → Save as PDF

**Use Cases:**
- Documenting simulation configurations
- Validating physics accuracy
- Sharing simulation parameters with team
- Academic research documentation

#### C. COCO JSON Export (Computer Vision)

**What's Included:**
```json
{
  "images": [...],              # Image metadata
  "annotations": [...],         # 2D bounding boxes
  "categories": [...],          # Object classes
  "camera_intrinsics": {...},   # Camera matrix
  "ground_truth": {             # Physics data
    "positions": [...],         # 3D positions
    "quaternions": [...],       # Rotations
    "velocities": [...],        # Linear velocities
    "occlusions": [...]         # Visibility flags
  }
}
```

**How To Export:**
1. Record simulation (START RECORDING → STOP)
2. Open DATA tab
3. Click "Export ML Ground Truth (COCO)"
4. Configure export options in modal
5. Click "Export COCO JSON"
6. File saves with images + annotations

**Use Cases:**
- Training YOLOv8, Detectron2, Mask R-CNN
- Object detection datasets
- Pose estimation training
- Occlusion handling research

#### D. YOLO Format Export

**What's Included:**
```
images/
  frame_000001.png
  frame_000002.png
  ...
labels/
  frame_000001.txt    # Normalized bounding boxes
  frame_000002.txt
  ...
```

**YOLO Label Format:**
```
class_id center_x center_y width height
0 0.5234 0.6123 0.1234 0.0987
```

**How To Export:**
1. Record simulation first
2. Open DATA tab
3. Click "Export YOLO Format"
4. Download ZIP file with images + labels

**Use Cases:**
- Training YOLOv5, YOLOv8, YOLO-NAS
- Real-time object detection
- Edge device deployment (lightweight models)

---

## Advanced Features

### View Modes

Switch camera views for different sensor simulations:

**RGB View** (Eye Icon)
- Photorealistic color rendering
- PBR materials (metalness, roughness)
- Realistic lighting and shadows
- Use for: Presentations, visual demos, training photorealistic models

**DEPTH View** (Grid Icon)
- Grayscale depth map
- Closer objects = darker
- Use for: Depth estimation models, spatial reasoning

**LiDAR View** (Scan Icon)
- Point cloud simulation
- Sensor ray visualization
- Use for: Robotics perception, autonomous vehicles

**WIREFRAME View** (Box Icon)
- Geometry edges only
- Debug mesh structure
- Use for: Physics debugging, collision visualization

### Chaos Mode

**Purpose**: Stress-test algorithms with random forces

**How To Use:**
1. Click "CHAOS" button (skull icon, top right)
2. Random forces applied every frame
3. Objects move erratically
4. Test robustness of CV/robotics algorithms

### Camera Controls

- **Orbit**: Left-click + drag
- **Zoom**: Mouse scroll wheel
- **Pan**: Right-click + drag
- **Reset**: Click "Reset Camera" button

### Physics Controls

**Play/Pause**: Toggle simulation (spacebar)
**Reset**: Reset to initial state (R key)
**Speed**: Adjust physics time step (advanced settings)

---

## Troubleshooting

### Scene Won't Generate

**Problem**: Click GENERATE, nothing happens

**Solutions:**
1. Check API key is configured (API button → verify key)
2. Check console for errors (F12 → Console tab)
3. Try simpler prompt: "metal sphere"
4. Check network connection
5. Verify API quota not exceeded

### Simulation Crashes

**Problem**: "Simulation Crashed" error screen

**Solutions:**
1. Click "Try Again" button
2. Reduce object count (< 500 objects)
3. Disable Chaos Mode if active
4. Refresh page (Ctrl+R / Cmd+R)
5. Clear cache: Settings → Clear browser cache

### Recording Not Working

**Problem**: Click START RECORDING, no frame count

**Solutions:**
1. Generate scene first (can't record empty canvas)
2. Check browser permissions for media recording
3. Try different browser (Chrome recommended)
4. Ensure WebGL canvas is visible

### Video Download Fails

**Problem**: Click Download Video, nothing happens

**Solutions:**
1. Check browser download settings (allow pop-ups)
2. Verify recording was stopped (not still recording)
3. Check disk space available
4. Try downloading again

### Poor Performance / Low FPS

**Problem**: Simulation runs slowly (<30 FPS)

**Solutions:**
1. Reduce object count in prompt
2. Close other browser tabs
3. Use discrete GPU if available
4. Disable Chaos Mode
5. Lower graphics quality (advanced settings)

---

## FAQ

### Q: How many objects can I simulate?
**A**: Recommended maximum:
- 500 objects: Smooth 60 FPS
- 1000 objects: 40-50 FPS
- 5000+ objects: May slow down, test your hardware

### Q: Can I use custom 3D models?
**A**: Currently uses geometric primitives with domain randomization (NVIDIA approach). Custom glTF model loading planned for future release.

### Q: What physics engine does SnapLock use?
**A**: Rapier.js - production-grade rigid body physics at 120Hz fixed timestep.

### Q: Is my data stored on servers?
**A**: No. All data stays local in browser. API key stored in localStorage. Export files saved to your computer.

### Q: Can I run offline?
**A**: Scene generation requires internet (AI API). Physics simulation runs offline once scene is generated.

### Q: What file formats are supported for export?
**A**: CSV (physics data), JSON (COCO format), YOLO TXT (labels), WebM (video), PDF (reports).

### Q: How do I get quaternion data?
**A**:
1. Let simulation run
2. Download CSV (has Euler angles)
3. Generate Report (has quaternion in telemetry section)
4. Export COCO JSON (has quaternions in ground_truth)

### Q: Can I automate dataset generation?
**A**: Yes! Enable Dataset Mode and let run for hours/days. Generates 4 variations per minute automatically.

### Q: What license is SnapLock?
**A**: Check LICENSE file in repository. Training data you generate is yours to use.

### Q: Can I contribute features?
**A**: Yes! Repository: https://github.com/gretchenboria/SnapLock

### Q: How do I report bugs?
**A**: Open issue on GitHub or contact support.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Enter | Generate scene |
| Spacebar | Play/Pause |
| R | Reset simulation |
| Tab | Cycle suggestions |
| Esc | Close suggestions |
| ↑/↓ | Navigate suggestions |

---

## Getting Help

**Documentation**: Read this guide thoroughly
**GitHub Issues**: https://github.com/gretchenboria/SnapLock/issues
**Console Logs**: F12 → Console tab shows detailed errors
**Support**: Check GitHub repository for contact info

---

## Credits

**Physics Engine**: Rapier.js
**3D Rendering**: Three.js + React-Three-Fiber
**AI Generation**: Google Gemini API
**Datasets**: YCB (robotics benchmark), domain randomization techniques

---

## Changelog

**v1.0 (2024-12-18)**
- Initial release
- Core features: Scene generation, Dataset Mode, Video recording, Data export
- View modes: RGB, DEPTH, LIDAR, WIREFRAME
- Export formats: CSV, COCO JSON, YOLO, Video, PDF reports

---

**End of User Guide**
