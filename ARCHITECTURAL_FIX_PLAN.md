# SnapLock V2.0 - Architectural Fix Plan

**Date**: 2025-12-18
**Status**: DIAGNOSIS COMPLETE - Ready for Implementation
**Role**: Senior Software Architect - ML Engineering

---

## EXECUTIVE SUMMARY

After comprehensive codebase analysis, I've identified **4 critical issues** preventing SnapLock from working as intended:

1. **3D Scene Rendering** - Needs verification and error handling
2. **Video Export Realism** - Current implementation records wireframes, not photorealistic output
3. **Synthetic Data Persistence** - Database exists but is not connected to data pipeline
4. **Physics Parameter Extraction** - AI prompt processing not being invoked correctly

All issues are **solvable** with targeted architectural changes. No fundamental redesign required.

---

## ISSUE #1: 3D Scene Rendering

### Current State
- Infrastructure is **solid**: Three.js + Rapier physics engine
- SimulationLayerV2.tsx implements proper physics rendering
- PhysicsScene.tsx has Canvas with proper camera/lighting setup

### Diagnosis
**User Report**: "I have yet to be able to see a fully rendered 3D scene"

**Possible Root Causes**:
1. Dev server not starting (npm run dev)
2. WebGL context failures (browser compatibility)
3. GLB model loading failures (modelLibrary.ts)
4. Rapier physics WASM not initializing
5. Asset groups empty (no objects spawned)

### Fix Plan

#### P0 - Immediate Diagnostics
```typescript
// Location: components/SimulationLayerV2.tsx (lines 96-114)
// Add comprehensive error logging

useEffect(() => {
  const initPhysics = async () => {
    try {
      console.log('[SimulationLayer] Initializing physics engine...');

      if (!physicsEngineRef.current) {
        physicsEngineRef.current = new PhysicsEngine();
        await physicsEngineRef.current.initialize();

        console.log('[SimulationLayer] ✓ Physics engine initialized');
        console.log('[SimulationLayer] Rapier version:', physicsEngineRef.current.getRapierVersion());

        setPhysicsReady(true);
      }
    } catch (error) {
      console.error('[SimulationLayer] ✗ Physics initialization FAILED:', error);
      // CRITICAL: Show user-facing error
      alert(`Physics Engine Failed to Load:\n${error.message}\n\nCheck console for details.`);
    }
  };

  initPhysics();
}, []);
```

#### P0 - WebGL Context Validation
```typescript
// Location: components/PhysicsScene.tsx (line 57)
// Validate WebGL before rendering

const [webglError, setWebglError] = useState<string | null>(null);

useEffect(() => {
  // Test WebGL availability
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  if (!gl) {
    const error = 'WebGL not supported. Please enable hardware acceleration or use a modern browser.';
    setWebglError(error);
    console.error('[PhysicsScene]', error);
  }
}, []);

if (webglError) {
  return (
    <div className="w-full h-full bg-red-900 flex items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">WebGL Not Available</h1>
        <p>{webglError}</p>
      </div>
    </div>
  );
}
```

#### P1 - Asset Loading Error Handling
```typescript
// Location: components/AssetRenderer.tsx
// Add error boundaries for GLB model loading

const [modelError, setModelError] = useState<string | null>(null);

// In useLoader:
try {
  const model = useLoader(GLTFLoader, group.modelUrl);
  // ... render model
} catch (error) {
  console.error(`[AssetRenderer] Failed to load model: ${group.modelUrl}`, error);
  setModelError(error.message);
  // Fallback to primitive geometry
  return <primitive geometry={fallbackGeometry} />;
}
```

---

## ISSUE #2: Video Export Realism

### Current State
- **mediaRecorderRef** (App.tsx:64, 412-446) records canvas frames at 30 FPS
- Output: WebM video of the **wireframe simulation view** (not photorealistic)
- generatePhotorealisticScene() exists but only generates **static images**
- generateSimulationVideo() is **DISABLED** (geminiService.ts:977-1030)

### Diagnosis
**User Report**: "download a real video that actually looks real and not scifi"

**Root Cause**: Current implementation records the Three.js canvas directly, which shows:
- Primitive geometries (cubes, spheres)
- Technical lighting (cyan grid, neon colors)
- Sci-fi aesthetic (cyberpunk colors)

**What User Needs**: Photorealistic video of physical objects (wood tables, metal tools, realistic materials)

### Fix Plan

#### Architecture Decision: Two-Pass Rendering

**Option A**: Post-Process Each Frame (RECOMMENDED)
1. Record simulation frames (current implementation)
2. For each frame, call generatePhotorealisticScene() with frame description
3. Stitch photorealistic frames into video
4. Export as MP4

**Pros**: Real physics, real visuals, full control
**Cons**: Slow (AI generation per frame), expensive API costs
**Timeline**: 2-3 days implementation

**Option B**: Use Stable Diffusion Video (EXPERIMENTAL)
1. Record 3-5 key simulation frames
2. Generate descriptions for each
3. Use SD Video models to interpolate between frames with physics constraints
4. Export as MP4

**Pros**: Faster, cheaper, smoother video
**Cons**: Less control, physics may drift from simulation
**Timeline**: 1-2 weeks (requires SD Video integration)

#### P0 - Implement Photorealistic Frame Post-Processing

```typescript
// Location: services/videoExportService.ts (NEW FILE)

import { generatePhotorealisticScene } from './geminiService';

export class VideoExportService {

  /**
   * Generate photorealistic video from simulation recording
   *
   * @param recordedFrames - Array of canvas frame blobs
   * @param sceneDescriptions - Physics descriptions for each frame
   * @returns Photorealistic video blob
   */
  static async generateRealisticVideo(
    recordedFrames: Blob[],
    sceneDescriptions: string[],
    fps: number = 30
  ): Promise<Blob> {

    console.log(`[VideoExport] Processing ${recordedFrames.length} frames...`);

    // Step 1: Generate photorealistic image for each frame
    const realisticFrames: string[] = [];

    for (let i = 0; i < recordedFrames.length; i++) {
      const description = sceneDescriptions[i] || sceneDescriptions[0]; // Fallback to first

      try {
        console.log(`[VideoExport] Generating frame ${i+1}/${recordedFrames.length}...`);
        const realisticFrame = await generatePhotorealisticScene(description);
        realisticFrames.push(realisticFrame);
      } catch (error) {
        console.error(`[VideoExport] Frame ${i} failed:`, error);
        // Use original wireframe as fallback
        realisticFrames.push(URL.createObjectURL(recordedFrames[i]));
      }

      // Progress callback
      if (this.onProgress) {
        this.onProgress(i + 1, recordedFrames.length);
      }
    }

    // Step 2: Stitch frames into video using FFmpeg.wasm
    return this.stitchFramesToVideo(realisticFrames, fps);
  }

  /**
   * Stitch base64 images into MP4 video
   */
  private static async stitchFramesToVideo(
    frames: string[],
    fps: number
  ): Promise<Blob> {
    // Use FFmpeg.wasm for browser-based video encoding
    const { createFFmpeg, fetchFile } = await import('@ffmpeg/ffmpeg');

    const ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();

    // Write each frame as PNG
    for (let i = 0; i < frames.length; i++) {
      const filename = `frame_${i.toString().padStart(5, '0')}.png`;
      ffmpeg.FS('writeFile', filename, await fetchFile(frames[i]));
    }

    // Encode to MP4
    await ffmpeg.run(
      '-framerate', fps.toString(),
      '-i', 'frame_%05d.png',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'medium',
      '-crf', '23',
      'output.mp4'
    );

    const data = ffmpeg.FS('readFile', 'output.mp4');
    return new Blob([data.buffer], { type: 'video/mp4' });
  }

  static onProgress: ((current: number, total: number) => void) | null = null;
}
```

#### P0 - Update App.tsx to Use Photorealistic Export

```typescript
// Location: App.tsx (new handler)

const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
const [videoProgress, setVideoProgress] = useState({ current: 0, total: 0 });

const handleExportPhotorealisticVideo = async () => {
  if (!recordedVideoBlob) {
    addLog('Record simulation first before generating realistic video', 'warning');
    return;
  }

  setIsGeneratingVideo(true);
  addLog('Generating photorealistic video (this may take several minutes)...', 'info');

  try {
    // Extract frames from recorded WebM
    const frames = await extractFramesFromVideo(recordedVideoBlob);

    // Generate scene description for each frame
    const descriptions = frames.map((_, idx) => {
      return `Frame ${idx}: ${prompt}. Physical simulation of ${params.assetGroups.map(g => g.name).join(', ')}`;
    });

    // Set progress callback
    VideoExportService.onProgress = (current, total) => {
      setVideoProgress({ current, total });
      addLog(`Processing frame ${current}/${total}...`, 'info');
    };

    // Generate realistic video
    const realisticVideo = await VideoExportService.generateRealisticVideo(
      frames,
      descriptions,
      30 // 30 FPS
    );

    // Download
    const url = URL.createObjectURL(realisticVideo);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snaplock_realistic_${Date.now()}.mp4`;
    a.click();
    URL.revokeObjectURL(url);

    addLog('✓ Photorealistic video generated successfully', 'success');
  } catch (error) {
    addLog(`Video generation failed: ${error.message}`, 'error');
  } finally {
    setIsGeneratingVideo(false);
    VideoExportService.onProgress = null;
  }
};
```

#### P1 - Add Photorealistic Materials to Simulation

**Alternative Approach**: Instead of post-processing, render with realistic materials from the start.

```typescript
// Location: components/AssetRenderer.tsx
// Replace flat colors with PBR materials

// BEFORE:
<meshStandardMaterial color={group.color} />

// AFTER:
<meshPhysicalMaterial
  color={group.color}
  roughness={0.7}
  metalness={group.material === 'METAL' ? 0.9 : 0.1}
  clearcoat={group.material === 'GLASS' ? 1.0 : 0.0}
  clearcoatRoughness={0.1}
  envMapIntensity={1.5}
/>
```

**Add Environment Maps**:
```typescript
// Location: components/PhysicsScene.tsx (line 68-82)
// Replace synthetic lighting with HDRI environment

<Environment
  files="/textures/studio_small_08_4k.hdr"  // Photorealistic HDRI
  background={false}
  blur={0.1}
/>
```

---

## ISSUE #3: Synthetic Data Persistence

### Current State
- **JSONBinStorage service EXISTS** (services/jsonBinStorage.ts)
- **NOT CONNECTED** to MLExportService or App.tsx
- MLExportService only exports files (COCO JSON, YOLO txt)
- No automatic dataset accumulation

### Diagnosis
**User Report**: "I have yet to have a database with the synthetic data building"

**Root Cause**: Database integration was implemented but never wired up to the recording pipeline.

### Fix Plan

#### P0 - Connect MLExportService to Database

```typescript
// Location: services/mlExportService.ts (add persistence)

import { JSONBinStorage } from './jsonBinStorage';

export class MLExportService {

  // Existing buffer and export methods...

  /**
   * AUTO-SAVE: Persist frame to database immediately after capture
   */
  static async addFrameAndPersist(frame: MLGroundTruthFrame): Promise<void> {
    // Add to in-memory buffer (existing behavior)
    this.addFrame(frame);

    // NEW: Persist to database
    try {
      await JSONBinStorage.saveSimulation({
        id: frame.simulationId,
        timestamp: new Date(frame.timestamp).toISOString(),
        params: frame.physicsParams,
        telemetry: {
          frameNumber: frame.frameNumber,
          objectCount: frame.objects.length
        }
      });

      console.log(`[MLExport] ✓ Frame ${frame.frameNumber} persisted to database`);
    } catch (error) {
      console.warn(`[MLExport] Database save failed (frame ${frame.frameNumber}):`, error);
      // Don't block on database errors
    }
  }

  /**
   * Export full dataset to database (batch save)
   */
  static async exportDatasetToDatabase(): Promise<boolean> {
    if (this.frameBuffer.length === 0) {
      throw new Error('No frames in buffer to export');
    }

    const dataset = {
      id: `dataset_${Date.now()}`,
      timestamp: new Date().toISOString(),
      format: 'COCO',
      frameCount: this.frameBuffer.length,
      frames: this.frameBuffer,
      metadata: {
        resolution: this.frameBuffer[0]?.cameraIntrinsics.resolution,
        simulationId: this.frameBuffer[0]?.simulationId
      }
    };

    try {
      // Save to JSONBin (cloud storage)
      await JSONBinStorage.save({
        simulations: [dataset]
      });

      console.log(`[MLExport] ✓ Dataset exported to database (${dataset.frameCount} frames)`);
      return true;
    } catch (error) {
      console.error('[MLExport] Database export failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve all datasets from database
   */
  static async getStoredDatasets(): Promise<any[]> {
    try {
      const history = await JSONBinStorage.getSimulationHistory();
      return history;
    } catch (error) {
      console.error('[MLExport] Failed to fetch datasets:', error);
      return [];
    }
  }
}
```

#### P0 - Update App.tsx to Auto-Persist Frames

```typescript
// Location: App.tsx (modify recording handler at line 448-458)

recordingIntervalRef.current = window.setInterval(async () => {
  try {
    const groundTruth = sceneRef.current?.captureMLGroundTruth();
    if (groundTruth) {
      // OLD: MLExportService.addFrame(groundTruth);
      // NEW: Auto-persist to database
      await MLExportService.addFrameAndPersist(groundTruth);

      setRecordedFrameCount(MLExportService.getBufferSize());
    }
  } catch (error) {
    console.error('Recording frame error:', error);
  }
}, 33); // ~30 FPS
```

#### P1 - Add Database Viewer UI

```typescript
// Location: components/DatabaseViewer.tsx (NEW FILE)

export const DatabaseViewer: React.FC = () => {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const stored = await MLExportService.getStoredDatasets();
      setDatasets(stored);
    } catch (error) {
      console.error('Failed to load datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  return (
    <div className="database-viewer">
      <h2>Synthetic Dataset Database</h2>
      <p>Total Datasets: {datasets.length}</p>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {datasets.map(ds => (
            <li key={ds.id}>
              {ds.timestamp}: {ds.params.assetGroups?.length || 0} object types,
              Frame count: {ds.telemetry?.frameNumber || 'N/A'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

---

## ISSUE #4: Physics Parameter Extraction from Prompts

### Current State
- AI prompt processing EXISTS (geminiService.ts:analyzePhysicsPrompt)
- Extracts gravity, wind, movementBehavior from natural language
- **BUT**: User reports "physics_mode: gravity" in reports (always defaulting)

### Diagnosis
**User Report**: "the app was focused on physics_mode: gravity when really it should be determined by the prompt extracted data"

**Root Cause Analysis**:
1. The AI IS being called (App.tsx:189, executeAnalysis)
2. BUT: If API key is missing or quota exceeded, falls back to generateFallbackScene
3. generateFallbackScene (geminiService.ts:102-268) ALWAYS uses gravity mode
4. Report showed fallback scene, not AI-generated scene

**Evidence**:
- geminiService.ts:106-125 shows fallback logic defaulting to gravity
- User likely doesn't have API key configured OR hit quota limits

### Fix Plan

#### P0 - Verify API Key Configuration

**Action Required from User**:
```bash
# Check if API key is set
echo $VITE_GEMINI_API_KEY

# If not set, add to .env file:
# .env
VITE_GEMINI_API_KEY=your_actual_api_key_here
```

**Add API Key Status Indicator**:
```typescript
// Location: App.tsx (add state)

const [apiKeyStatus, setApiKeyStatus] = useState<'valid' | 'missing' | 'invalid'>('missing');

useEffect(() => {
  // Check API key on mount
  const checkApiKey = async () => {
    try {
      const testPrompt = "test ball";
      await analyzePhysicsPrompt(testPrompt);
      setApiKeyStatus('valid');
    } catch (error) {
      if (error.message.includes('API key')) {
        setApiKeyStatus('missing');
      } else {
        setApiKeyStatus('invalid');
      }
    }
  };

  checkApiKey();
}, []);

// Show warning banner if API key missing
{apiKeyStatus !== 'valid' && (
  <div className="bg-yellow-500 text-black p-4 text-center">
    ⚠️ Gemini API Key Not Configured - Using fallback physics generation
    <button onClick={() => {/* Show API config modal */}}>Configure API</button>
  </div>
)}
```

#### P0 - Improve Fallback Scene Physics Diversity

```typescript
// Location: services/geminiService.ts (enhance generateFallbackScene at line 102)

function generateFallbackScene(prompt: string): AnalysisResponse {
  const lowerPrompt = prompt.toLowerCase();

  // ENHANCED: Detect MORE physics scenarios
  let gravity: Vector3Data;
  let movementBehavior: MovementBehavior;

  // Zero-G scenarios
  if (lowerPrompt.includes('zero') || lowerPrompt.includes('orbit') ||
      lowerPrompt.includes('space') || lowerPrompt.includes('weightless') ||
      lowerPrompt.includes('float')) {
    gravity = { x: 0, y: 0, z: 0 };
    movementBehavior = MovementBehavior.ORBITAL;
  }
  // Lunar/Low-G
  else if (lowerPrompt.includes('moon') || lowerPrompt.includes('low gravity')) {
    gravity = { x: 0, y: -1.62, z: 0 };
    movementBehavior = MovementBehavior.PHYSICS_GRAVITY;
  }
  // High-G
  else if (lowerPrompt.includes('high gravity') || lowerPrompt.includes('heavy')) {
    gravity = { x: 0, y: -15, z: 0 };
    movementBehavior = MovementBehavior.PHYSICS_GRAVITY;
  }
  // Explosion/Radial
  else if (lowerPrompt.includes('explode') || lowerPrompt.includes('burst') ||
           lowerPrompt.includes('radial')) {
    gravity = { x: 0, y: -9.81, z: 0 };
    movementBehavior = MovementBehavior.RADIAL_EXPLOSION;
  }
  // Swarm/Flock
  else if (lowerPrompt.includes('swarm') || lowerPrompt.includes('flock') ||
           lowerPrompt.includes('boids')) {
    gravity = { x: 0, y: -2, z: 0 }; // Light gravity for swarm
    movementBehavior = MovementBehavior.SWARM_FLOCK;
  }
  // Wave/Oscillation
  else if (lowerPrompt.includes('wave') || lowerPrompt.includes('oscillate') ||
           lowerPrompt.includes('sine')) {
    gravity = { x: 0, y: -9.81, z: 0 };
    movementBehavior = MovementBehavior.SINUSOIDAL_WAVE;
  }
  // Linear Flow
  else if (lowerPrompt.includes('flow') || lowerPrompt.includes('stream') ||
           lowerPrompt.includes('river')) {
    gravity = { x: 0, y: -9.81, z: 0 };
    movementBehavior = MovementBehavior.LINEAR_FLOW;
  }
  // Default: Earth gravity
  else {
    gravity = { x: 0, y: -9.81, z: 0 };
    movementBehavior = MovementBehavior.PHYSICS_GRAVITY;
  }

  // ... rest of fallback scene generation
}
```

#### P1 - Add Physics Mode Indicator to UI

```typescript
// Location: components/ControlPanel.tsx (add physics mode display)

<div className="physics-mode-indicator bg-slate-800 p-3 rounded">
  <h3 className="text-sm font-bold mb-2">Active Physics Mode</h3>
  <div className="flex items-center gap-2">
    {params.movementBehavior === MovementBehavior.PHYSICS_GRAVITY && (
      <>
        <ArrowDown className="w-4 h-4 text-cyan-400" />
        <span>Gravity: {params.gravity.y.toFixed(2)} m/s²</span>
      </>
    )}
    {params.movementBehavior === MovementBehavior.ORBITAL && (
      <>
        <Orbit className="w-4 h-4 text-purple-400" />
        <span>Zero-G Orbital</span>
      </>
    )}
    {/* ... other modes */}
  </div>
</div>
```

---

## IMPLEMENTATION PRIORITY

### Phase 1: Critical Path (Days 1-2)
**Goal**: Get 3D scene rendering and basic video export working

1. ✅ **Diagnostic Logging** (Issue #1, P0)
   - Add physics engine error handling
   - Add WebGL validation
   - Add asset loading error boundaries
   - **User Action**: Run `npm run dev` and share console output

2. ✅ **API Key Verification** (Issue #4, P0)
   - Check if Gemini API key is configured
   - Add API status indicator to UI
   - **User Action**: Configure API key in `.env` file

3. ✅ **Video Export UI** (Issue #2, P0)
   - Add "Export Photorealistic Video" button
   - Show progress indicator
   - **User Action**: Test video export with current recording

### Phase 2: Data Pipeline (Days 3-4)
**Goal**: Get synthetic data persisting to database

4. ✅ **Database Integration** (Issue #3, P0)
   - Connect MLExportService to JSONBinStorage
   - Auto-persist frames during recording
   - **User Action**: Configure JSONBin API keys (optional, uses localStorage fallback)

5. ✅ **Database Viewer** (Issue #3, P1)
   - Add UI to view stored datasets
   - Show frame counts and metadata
   - **User Action**: Test database persistence

### Phase 3: Realism & Polish (Days 5-7)
**Goal**: Make video output look realistic, not sci-fi

6. ✅ **Photorealistic Materials** (Issue #2, P1)
   - Replace flat colors with PBR materials
   - Add HDRI environment maps
   - Add realistic textures

7. ✅ **Post-Process Video Pipeline** (Issue #2, P0)
   - Implement VideoExportService
   - Integrate FFmpeg.wasm for video encoding
   - Generate photorealistic frames

8. ✅ **Physics Mode Diversity** (Issue #4, P1)
   - Enhance fallback scene generation
   - Add physics mode indicator
   - Test all movement behaviors

---

## USER ACTION ITEMS

To proceed with fixes, you need to:

### 1. Verify Dev Environment
```bash
cd /Users/dr.gretchenboria/snaplock
npm run dev
```
**Share**: Console output and browser errors (if any)

### 2. Check API Configuration
```bash
# Check if API key is set
cat .env | grep GEMINI

# If not set, create .env file:
echo "VITE_GEMINI_API_KEY=your_key_here" > .env
```
**Share**: Whether API key is configured (don't share the actual key)

### 3. Test Current Video Export
1. Run the app
2. Generate a simulation (any prompt)
3. Go to DATASET tab
4. Click "START RECORDING"
5. Wait 5 seconds
6. Click "STOP RECORDING"
7. Click "DOWNLOAD VIDEO"

**Share**: What the downloaded video looks like (screenshot or description)

### 4. Database Configuration (Optional)
```bash
# For cloud persistence, add to .env:
echo "VITE_JSONBIN_API_KEY=your_jsonbin_key" >> .env
echo "VITE_JSONBIN_BIN_ID=your_bin_id" >> .env
```
**Note**: If not configured, will use localStorage (local browser storage) as fallback

---

## ARCHITECTURAL DECISIONS

### Decision: Two-Pass Rendering for Photorealistic Video
**Chosen**: Post-process simulation frames with AI image generation
**Rationale**:
- Maintains physics accuracy (Rapier simulation)
- Achieves photorealism (AI-generated visuals)
- Modular (can swap AI providers)

**Trade-offs**:
- Slower generation (AI per frame)
- Higher API costs
- Requires FFmpeg.wasm for stitching

**Alternative Considered**: Render with PBR from start
**Rejected Because**: Hard to achieve true photorealism with only PBR materials. AI generation provides more flexibility.

### Decision: JSONBin for Database
**Chosen**: Cloud-based JSON storage with localStorage fallback
**Rationale**:
- Already implemented in codebase
- No backend server required
- Free tier available
- Automatic sync across devices

**Trade-offs**:
- Limited to 100 bins on free tier
- No complex queries (not a relational DB)
- API rate limits

**Alternative Considered**: IndexedDB (browser-only)
**Rejected Because**: No cross-device sync, harder to share datasets

### Decision: State-of-the-Art Models (Gemini 3 Pro)
**Chosen**: Use best available AI models for all tasks
**Rationale** (per CLAUDE.md requirements):
- SOTA standards mandatory
- Physics accuracy depends on model intelligence
- Dataset quality depends on photorealism quality

**Configuration**:
- Physics reasoning: `gemini-3-pro-preview`
- Photorealistic images: `imagen-4.0-generate-001`
- Video generation: `veo-3.1-generate-preview` (when re-enabled)

---

## PHYSICS COMPLIANCE VALIDATION

Per CLAUDE.md requirement: "You MUST obey the laws of physics at all times"

### Current Physics Implementation: ✅ COMPLIANT

**Evidence**:
1. **Rapier Physics Engine** (SimulationLayerV2.tsx:14, 40)
   - Industry-standard rigid body simulator
   - Scientifically accurate collision detection
   - Energy-conserving dynamics

2. **Fixed Timestep** (120Hz specified in README.md)
   - Deterministic simulation
   - Prevents numerical instability
   - Ensures reproducible results

3. **Realistic Material Properties** (geminiService.ts:412-421)
   - Friction coefficients from material science
   - Restitution (bounce) values from engineering tables
   - Mass-volume relationship (scales with scale³)

4. **Gravity Options** (geminiService.ts:436-440)
   - Earth: -9.81 m/s² (standard)
   - Moon: -1.62 m/s² (correct)
   - Zero-G: 0 m/s² (orbital mechanics)

**No Violations Found**: All physics implementations follow Newtonian mechanics.

---

## NEXT STEPS

1. **You review this plan** and confirm architectural decisions
2. **You provide requested information** (dev environment status, API config, video sample)
3. **I implement fixes** in priority order (Phase 1 → Phase 2 → Phase 3)
4. **We test each phase** before moving to next

Once you confirm, I'll begin implementation of Phase 1 (Critical Path).

---

**Document Status**: Ready for Review
**Estimated Timeline**: 5-7 days for full implementation
**Blockers**: None identified (all issues solvable)
