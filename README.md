# SnapLock V2.0

**Production-Grade Synthetic Training Data Generator for Computer Vision and Robotics ML**

SnapLock is a physics-accurate simulation platform that generates high-quality synthetic datasets in standard ML formats (COCO, YOLO). Built with Rapier.js rigid body physics for robotics researchers, ML engineers, and computer vision practitioners who need annotated training data at scale.

## Quick Start

### Installation and Running Locally

1. Clone the repository and install dependencies:
```bash
git clone https://github.com/gretchenboria/SnapLock.git
cd SnapLock
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

4. The application starts with a blank slate and auto-spawn enabled
5. Type a physics scenario in the command line (e.g., "Simulate a LIDAR scan of drone debris in zero gravity")
6. Press Enter or click RUN to execute
7. The AI generates the simulation configuration automatically

### Alternative: Production Build

```bash
npm run build
npm run preview
```

Output files are in the `dist` directory. Access at `http://localhost:4173`

### Alternative: Docker

```bash
docker-compose up -d
```

Access at `http://localhost:8080`

## Key Features (V2.0)

### ML-Ready Dataset Export
- **COCO JSON Format**: Object detection with full annotations
- **YOLO Format**: Real-time detection training data
- **Automatic Validation**: Schema checking prevents corrupted exports
- **Camera Matrices**: Complete intrinsics and extrinsics for 3D reconstruction
- **Ground Truth Data**: Exact positions, velocities, collisions, occlusions
- **2D/3D Bounding Boxes**: Pixel-accurate projection from 3D space

### Production Physics Engine
- **Rapier.js Integration**: Industry-standard WASM rigid body dynamics
- **Fixed 120Hz Timestep**: Deterministic simulation
- **Full Collision Detection**: Particle-to-particle and particle-to-ground
- **Energy Conservation**: Scientifically accurate momentum transfer
- **No Warmup Hacks**: Real physics from frame 1

### Intelligent Command Line
- Type natural language descriptions of physics scenarios
- Auto-completion shows suggestions as you type (Tab to accept)
- Command history (Up arrow to navigate)
- AI enhancement button to improve prompts
- Keyboard shortcuts: Ctrl+Space (show all suggestions), Enter (execute), Esc (close)

### Auto-Spawn Mode
- Enabled by default on startup
- Automatically generates and runs new simulations every 15 seconds
- Toggle on/off using the button next to the command line
- Pauses when you focus the command line for manual control

### Physics Simulation
- **Real-time 3D rigid body physics** using Rapier.js
- Supports multiple primitive geometries: sphere, cube, cylinder, cone, torus, icosahedron, capsule, pyramid, plate
- Configurable material properties: restitution (bounce), friction, mass, drag
- Environmental parameters: gravity, wind velocity
- Movement behaviors: physics-based, orbital, swarm flocking, sinusoidal waves, radial explosion, linear flow

### View Modes
- RGB: Standard color rendering
- Depth: Depth map visualization
- LIDAR: Point cloud simulation
- Wireframe: Mesh structure view

### Adversarial Director
- AI system that introduces realistic disruptions during simulation
- Actions include: gravity shifts, wind gusts, friction changes, spawning obstacles
- Helps test robustness of robotics algorithms
- Toggle on/off using the prominent red button in the top right

### Lazarus Debugger
- Comprehensive diagnostic system
- Click the LAZARUS button (next to Director) to run full system diagnostics
- Validates physics configuration, telemetry health, asset groups, performance
- Checks browser environment and WebGL support
- Provides actionable recommendations
- Full diagnostic report in browser console

### Data Export
- **ML Ground Truth Export**: COCO JSON and YOLO formats with validation
- **Recording Mode**: Capture sequences at 30 FPS for training datasets
- **CSV Export**: Legacy format for particle positions, velocities, rotations
- **PDF Audit Reports**: Telemetry and configuration details
- **Photorealistic Images**: AI-generated renders
- **Temporal Video**: AI-powered video synthesis

### Asset Management
- Add multiple asset groups with different properties
- Configure particle count, shape, color, spawn mode per group
- Select groups from the hierarchy panel
- Delete groups individually (except when only one exists)

## Technical Architecture

### Frontend Stack
- React 19.2.1 with TypeScript
- Three.js with React Three Fiber for 3D rendering
- Vite 7.2.6 build system
- Tailwind CSS for UI styling
- Lucide React for icons

### Physics Engine
- Custom Verlet integration solver
- Collision detection and response system
- Warm-start protocol for stability (60-step warmup phase)
- 60Hz simulation loop
- Supports 1000+ particle instances efficiently
- Runtime validation with object-based ontologies

### Validation System
- Comprehensive ValidationOntology service
- Runtime type checking for all entities
- Validates vectors, material presets, asset groups, physics parameters
- Automatic sanitization of out-of-range values
- Error and warning reporting
- Prevents invalid configurations from reaching physics engine

### AI Integration
- Natural language prompt processing
- Generates physics configurations from text descriptions
- Adversarial director for robustness testing
- Prompt enhancement system
- Auto-spawn creative prompt generation

## Configuration

### Physics Parameters

Default configuration is in `constants.ts`:

```typescript
export const DEFAULT_PHYSICS: PhysicsParams = {
  gravity: { x: 0, y: -9.81, z: 0 },
  wind: { x: 0, y: 0, z: 0 },
  movementBehavior: MovementBehavior.PHYSICS_GRAVITY,
  assetGroups: [] // Blank slate - populated via AI or manual configuration
};
```

### Material Presets

Pre-configured material presets available in the PHYSICS tab:
- High Bounce Rubber: restitution 0.95, friction 0.9, mass 2.0
- Heavy Steel: restitution 0.2, friction 0.6, mass 25.0
- Slippery Ice: restitution 0.1, friction 0.01, mass 5.0
- Polished Wood: restitution 0.4, friction 0.5, mass 4.0
- Styrofoam: restitution 0.6, friction 1.0, mass 0.2
- Concrete: restitution 0.1, friction 0.9, mass 10.0

Create custom presets and save them for reuse.

### Environment Variables

Create a `.env` file in the project root:

```
VITE_GEMINI_API_KEY=your_api_key_here
```

This enables AI features. Without an API key, manual configuration still works.

## Using the Application

### Basic Workflow (Auto-Spawn)

1. Application starts with auto-spawn enabled
2. First simulation generates immediately
3. New simulations generate every 15 seconds automatically
4. Click the prompt field to disable auto-spawn and take manual control
5. Toggle auto-spawn back on anytime with the AUTO button

### Manual Workflow

1. Disable auto-spawn
2. Type a physics scenario description
3. Press Enter or click RUN
4. AI analyzes and configures the simulation
5. Simulation resets and runs with new configuration
6. Adjust parameters in left panel if needed
7. Use playback controls: Play/Pause, Reset, Reset Camera

### Manual Configuration Workflow

1. Disable auto-spawn
2. Click "ADD LAYER" in the hierarchy panel (right side)
3. Select the new asset group
4. Configure geometry, particle count, material properties
5. Adjust environmental parameters in the ENV tab
6. Click Reset to apply changes
7. Simulation runs with your custom configuration

### Generating ML Training Datasets (V2.0 Feature)

**Complete Workflow:**
1. Create or run a simulation
2. Navigate to **DATASET** tab
3. Click **START RECORDING** (captures at 30 FPS)
4. Wait 3-5 seconds (90-150 frames recommended)
5. Click **STOP RECORDING**
6. Click **EXPORT COCO DATASET** (object detection)
   - Or **EXPORT YOLO DATASET** (YOLO training)
7. Check console for validation results
8. Download includes:
   - Frame annotations with 2D/3D bounding boxes
   - Camera intrinsics and extrinsics
   - Velocity vectors and physics metadata
   - Occlusion and distance data

**Single Frame Capture:**
1. Pause at desired frame
2. Click **CAPTURE SINGLE FRAME**
3. Frame added to buffer
4. Export when ready

### Capturing Other Data

**Photorealistic Images:**
1. Pause simulation at desired frame
2. Click IMAGE button
3. AI-generated photorealistic image displays
4. Close modal to continue

**Temporal Videos:**
1. Set up simulation
2. Click VIDEO button
3. AI-powered temporal video generates from current state
4. Video player displays with controls

**CSV Data (Legacy):**
1. Navigate to DATASET tab
2. Click "DOWNLOAD DATASET (CSV)"
3. CSV file downloads with particle data and metadata

**PDF Reports:**
1. Navigate to DATASET tab
2. Click "GENERATE AUDIT REPORT (PDF)"
3. Print dialog opens with formatted report

### Debugging Issues

1. Click the LAZARUS button in the top right
2. Diagnostic report generates
3. Alert shows summary (status, errors, warnings)
4. Full report available in browser console (F12)
5. Follow recommendations to resolve issues

## Project Structure

```
SnapLock/
├── components/
│   ├── ControlPanel.tsx      # Main UI controls and panels
│   ├── PhysicsScene.tsx       # 3D rendering and physics simulation
│   └── TestDashboard.tsx      # Testing interface
├── services/
│   ├── geminiService.ts       # AI API integration
│   ├── adversarialDirector.ts # Adversarial disruptions
│   ├── validationService.ts   # Runtime validation ontology
│   └── lazarusDebugger.ts     # Comprehensive diagnostics
├── types.ts                   # TypeScript type definitions
├── constants.ts               # Default configurations
├── App.tsx                    # Main application component
├── index.tsx                  # Entry point
├── index.html                 # HTML template
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── Dockerfile                # Docker build configuration
├── docker-compose.yml        # Docker Compose setup
├── netlify.toml              # Netlify deployment configuration
├── TEST_PLAN.md              # Comprehensive test plan
└── README.md                 # This file
```

## Testing

### Manual Testing

Run the development server and test different scenarios:

```bash
npm run dev
```

Test cases:
- Empty prompt submission (should not execute)
- Very long prompts (should handle gracefully)
- Rapid consecutive executions (should prevent conflicts)
- Auto-spawn toggle during execution (should abort cleanly)
- Multiple asset groups with different properties
- Extreme physics values (should clamp to safe ranges)

### Diagnostic Testing

Use the Lazarus debugger:

1. Click LAZARUS button
2. Review diagnostic report
3. Check for HEALTHY, WARNING, or CRITICAL status
4. Address any errors or warnings reported
5. Re-run diagnostics to confirm fixes

### Test Mode

Append `?test=true` to the URL for advanced testing:

```
http://localhost:5173/?test=true
```

This exposes internal test hooks via `window.snaplock` and disables auto-spawn.

### Comprehensive Test Plan

See `TEST_PLAN.md` for:
- Edge case coverage
- Unit test specifications
- Integration test scenarios
- Performance benchmarks
- Browser compatibility matrix
- Accessibility requirements

## Browser Compatibility

**Supported Browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Requirements:**
- WebGL support (required)
- JavaScript enabled (required)
- Hardware acceleration enabled (recommended)
- 1920x1080 minimum resolution (recommended)

**Not Supported:**
- Internet Explorer
- Mobile browsers (limited performance)

## Performance Considerations

### Particle Count Guidelines

- 0-100 particles: 60 FPS (optimal)
- 100-500 particles: 45+ FPS (good)
- 500-1000 particles: 30+ FPS (acceptable)
- 1000-2000 particles: 24+ FPS (minimum, shows warnings)
- 2000+ particles: Performance degrades significantly, validation warnings issued

### Optimization Tips

1. Reduce particle count for better performance
2. Simplify geometry (spheres render faster than complex shapes)
3. Disable adversarial director during performance-critical tasks
4. Use lower quality view modes if needed
5. Close other browser tabs to free resources
6. Enable hardware acceleration in browser settings

### Memory Management

- Three.js resources cleaned up automatically
- Blob URLs revoked when no longer needed
- No memory leaks during normal operation
- Long-running sessions (hours) maintain stable memory usage

## Deployment

### Netlify Deployment

1. Connect GitHub repository to Netlify
2. Netlify automatically detects `netlify.toml` configuration
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Deployments trigger on push to main branch

Configuration in `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"
  [build.environment]
    NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Docker Deployment

**Build and run:**
```bash
docker build -t snaplock:latest .
docker run -d -p 8080:80 snaplock:latest
```

**Or use Docker Compose:**
```bash
docker-compose up -d
```

**Image details:**
- Multi-stage build (Node.js 20-alpine for build, nginx-alpine for serving)
- Final image size: approximately 50MB
- Includes gzip compression
- Health checks every 30 seconds
- Security headers configured
- SPA routing enabled

### Self-Hosting

Build for production:
```bash
npm run build
```

Serve the `dist` directory with any static file server:

```bash
# Using Python
python -m http.server 8080 -d dist

# Using Node.js http-server
npx http-server dist -p 8080

# Using nginx
# Copy dist/* to nginx html directory
```

## Troubleshooting

### Application won't start

**Symptom:** Blank screen or error on startup

**Solutions:**
1. Clear browser cache and reload
2. Check browser console (F12) for errors
3. Verify Node.js version: `node --version` (should be 20+)
4. Delete node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
5. Check for port conflicts (default: 5173)

### Build fails

**Symptom:** `npm run build` exits with errors

**Solutions:**
1. Check TypeScript errors: `npx tsc --noEmit`
2. Clear build cache:
   ```bash
   rm -rf dist node_modules/.vite
   npm install
   npm run build
   ```
3. Verify all dependencies installed correctly
4. Check Node.js version compatibility

### WebGL not working

**Symptom:** Black screen, "WebGL not supported" error

**Solutions:**
1. Verify WebGL support: visit `https://get.webgl.org/`
2. Enable hardware acceleration in browser:
   - Chrome: Settings > System > Use hardware acceleration
   - Firefox: Preferences > General > Performance > Use hardware acceleration
   - Safari: Develop > Experimental Features > WebGL
3. Update graphics drivers
4. Try a different browser
5. Check if browser extensions are blocking WebGL

### Low frame rate / poor performance

**Symptom:** Stuttering, low FPS counter, unresponsive

**Solutions:**
1. Run Lazarus diagnostics (click LAZARUS button)
2. Reduce particle count in asset groups
3. Disable adversarial director
4. Close other browser tabs and applications
5. Switch to simpler geometry (spheres instead of complex shapes)
6. Check if running on integrated vs dedicated GPU
7. Lower screen resolution
8. Enable hardware acceleration (see WebGL troubleshooting)

### Auto-spawn not working

**Symptom:** No automatic simulations generated

**Solutions:**
1. Verify auto-spawn is enabled (AUTO button should be highlighted)
2. Check browser console for API errors
3. Verify VITE_GEMINI_API_KEY is set if using AI features
4. Check network connectivity
5. Disable then re-enable auto-spawn
6. Reload the page

### Prompt not executing

**Symptom:** Clicking RUN does nothing, no simulation changes

**Solutions:**
1. Check if a prompt is entered (empty prompts don't execute)
2. Wait for previous analysis to complete (RUN button shows "RUNNING")
3. Check browser console for errors
4. Verify API connectivity if using AI features
5. Try manual configuration instead (add asset groups directly)

### Cannot add asset groups

**Symptom:** "ADD LAYER" button doesn't work, no groups appear

**Solutions:**
1. Check if maximum group limit reached (unlikely, limit is high)
2. Verify not in auto-spawn mode (disable auto-spawn first)
3. Check browser console for validation errors
4. Reload the page and try again

### Simulation appears frozen

**Symptom:** Particles not moving, time not advancing

**Solutions:**
1. Check if simulation is paused (click Play button)
2. Verify particle count > 0 in asset groups
3. Check if gravity and forces are set to zero (objects float in place)
4. Run Lazarus diagnostics to check telemetry
5. Click Reset to restart simulation
6. Check FPS counter - if 0, WebGL may have crashed

### Images/videos not generating

**Symptom:** IMAGE or VIDEO buttons don't work, errors shown

**Solutions:**
1. Verify API key is configured if using AI features
2. Check network connectivity
3. Check browser console for specific error messages
4. Try capturing after simulation has run for a few seconds
5. Verify canvas is rendering (not blank screen)
6. Check API rate limits haven't been exceeded

### Director causing crashes

**Symptom:** Application freezes or crashes when director is active

**Solutions:**
1. Disable adversarial director immediately
2. Reduce particle count before enabling director
3. Check Lazarus diagnostics for specific issues
4. Verify simulation is stable before enabling director
5. Use director only with simple simulations initially

### Deployment issues

**Symptom:** Works locally but not after deployment

**Solutions:**
1. Verify all environment variables are set in deployment platform
2. Check build logs for errors
3. Verify `netlify.toml` or deployment configuration is correct
4. Ensure `index.html` includes script tag: `<script type="module" src="/index.tsx"></script>`
5. Check that `dist` directory contains all necessary files
6. Verify SPA routing is configured (redirects /* to /index.html)
7. Clear deployment cache and rebuild

### Docker container not starting

**Symptom:** Docker run fails or container exits immediately

**Solutions:**
1. Check Docker logs: `docker logs snaplock`
2. Verify port 8080 is not in use: `lsof -i :8080`
3. Rebuild image: `docker-compose build --no-cache`
4. Check Dockerfile for errors
5. Verify .dockerignore doesn't exclude necessary files

### Memory leaks or high memory usage

**Symptom:** Browser becomes slow over time, memory usage increases

**Solutions:**
1. Reload the page periodically for long sessions
2. Close generated image/video modals when done
3. Reduce particle count
4. Disable auto-spawn when not needed
5. Monitor browser task manager for memory usage
6. Check for browser extensions consuming memory

### Validation errors in console

**Symptom:** Console shows validation warnings or errors

**Solutions:**
1. Run Lazarus diagnostics for detailed analysis
2. Review physics parameters for out-of-range values
3. Check asset group configurations
4. Verify no duplicate asset group IDs exist
5. Values are automatically sanitized, but warnings indicate potential issues
6. Adjust configurations based on validation messages

## Known Limitations

### ML Export
- **Occlusion Detection**: Binary (visible/hidden), not percentage-based raycasting
- **Segmentation Masks**: Not implemented (empty arrays in COCO export)
- **Temporal Tracking**: Object IDs not persistent across frames
- **Multi-Camera**: Single camera per simulation
- **YOLO Export**: Individual file downloads (ZIP not implemented yet)

### Physics & Performance
- Physics simulation is deterministic but may vary slightly across different hardware due to floating-point precision
- Large numbers of simultaneous collisions can impact frame rate
- Very high particle counts (2000+) not recommended for real-time interaction
- Safari has occasional rendering differences compared to Chrome/Firefox

### AI Features
- API rate limits may affect auto-spawn frequency and adversarial director
- Temporal video generation requires stable network connection and may take several seconds

### Platform Support
- Mobile device support is limited due to WebGL performance constraints and touch interface complexity

See [UAT_REPORT.md](UAT_REPORT.md) for detailed quality assessment and improvement roadmap.

## Development Workflow

### Local Development

```bash
# Start development server with hot reload
npm run dev

# TypeScript type checking
npx tsc --noEmit

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for complex functions
- Keep components focused and single-purpose
- Use functional components with hooks
- Avoid inline styles, use Tailwind CSS classes

### Adding New Features

1. Define types in `types.ts`
2. Add validation in `validationService.ts` if needed
3. Implement feature in appropriate component or service
4. Update tests in `TEST_PLAN.md`
5. Update README with feature documentation
6. Test thoroughly before committing

## Security Considerations

- Never commit API keys to version control
- Use environment variables for sensitive configuration
- Validate all user inputs
- Sanitize physics parameters to prevent crashes
- WebGL context validated before use
- No eval() or dynamic code execution
- Dependencies regularly updated for security patches

## License

Dual licensing model:

**Open Source (AGPLv3):**
For non-commercial, educational, or open-source projects. Source code disclosure required if deployed publicly.

**Commercial:**
For proprietary use without source disclosure obligations. Contact repository owner for commercial licensing.

## Contributing

Contributions welcome. Please ensure:
- Code passes TypeScript compilation
- Features include appropriate validation
- Tests updated in TEST_PLAN.md
- Documentation updated in README.md
- Code follows existing style conventions
- No breaking changes to public API without discussion

## Support

For issues and questions:
1. Check this README and troubleshooting section
2. Run Lazarus diagnostics for application issues
3. Review browser console for error messages
4. Check TEST_PLAN.md for testing guidance
5. Open GitHub issue with diagnostic report if problem persists

## Documentation

### V2.0 Technical Documentation
- **[UAT Report](UAT_REPORT.md)**: Comprehensive quality assessment, data quality grades, findings
- **[Implementation Status](IMPLEMENTATION_STATUS.md)**: Detailed technical status and change log
- **[V2 Upgrade Summary](V2_UPGRADE_SUMMARY.md)**: Summary of V1 → V2 changes
- **[Integration Guide](INTEGRATION_COMPLETE.md)**: Testing and deployment instructions
- **[Backend Guide](backend/README.md)**: API proxy deployment guide

### Getting Started
- This README for installation and usage
- See [Quick Start](#quick-start) section above
- [Generating ML Training Datasets](#generating-ml-training-datasets-v20-feature) for ML workflows

## Version Information

**Current Version**: V2.0 (Rapier Physics + ML Export)

**Dependencies**:
- React 19.2.1
- Vite 7.2.6
- Three.js 0.160.0
- TypeScript 5.2.2
- Rapier.js (@dimforge/rapier3d-compat) 0.11.0
- Node.js 20+ required

Check `package.json` for complete dependency list.
