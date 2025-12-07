# SnapLock

A web-based physics simulation platform for robotics and computer vision applications.

## Overview

SnapLock is a real-time rigid body physics engine that generates synthetic training data and tests sensor configurations. The platform simulates physical interactions using Verlet integration and renders results through WebGL.

## Core Features

- Natural language prompt interface for defining physics scenarios
- Real-time 3D visualization with configurable viewmodes
- Verlet integration physics solver with warm-start protocol
- Multi-primitive geometry support (spheres, cubes, cylinders, capsules, pyramids)
- Configurable material properties (restitution, friction, mass, drag)
- Environmental parameters (gravity, wind, spawn topology)
- Built-in regression test suite

## Technical Architecture

### Frontend Stack
- React 19
- Three.js with React Three Fiber
- TypeScript
- Vite build system
- Tailwind CSS

### Physics Engine
- Custom Verlet integrator
- Collision detection and response
- Warm-start solver stabilization
- 60Hz simulation loop
- Support for 1000+ particle instances

### Solver Stabilization

The warm-start protocol prevents the "pop effect" common in physics engines when simulations are paused or loaded. During the 60-step warmup phase:

- Velocity clamping prevents divergence
- Increased drag and zero restitution allow interpenetrating geometries to settle
- Contact manifolds stabilize before full physics integration resumes

## Installation

### Prerequisites
- Node.js 20 or higher
- npm or yarn

### Local Development

```bash
git clone https://github.com/gretchenboria/SnapLock.git
cd SnapLock
npm install
npm run dev
```

Access the application at http://localhost:5173

### Production Build

```bash
npm run build
npm run preview
```

Output files are generated in the `dist` directory.

## Docker Deployment

### Using Docker Compose

```bash
docker-compose up -d
```

Access at http://localhost:8080

### Using Docker CLI

```bash
docker build -t snaplock:latest .
docker run -d -p 8080:80 --name snaplock snaplock:latest
```

Stop and remove:

```bash
docker stop snaplock
docker rm snaplock
```

### Image Specifications
- Base: Node.js 20-alpine (build), nginx-alpine (production)
- Size: ~50MB
- Health checks: 30-second intervals
- Includes gzip compression and security headers

## Netlify Deployment

The repository includes `netlify.toml` configuration for automated deployment:

- Build command: `npm run build`
- Publish directory: `dist`
- SPA routing enabled
- Node.js 20 build environment

Connect your GitHub repository to Netlify for automatic deployments on push.

## Configuration

### Physics Parameters

Edit `constants.ts` to modify default physics configuration:

```typescript
export const DEFAULT_PHYSICS: PhysicsParams = {
  assetGroups: [...],
  movementBehavior: MovementBehavior.PHYSICS_VERLET,
  gravity: { x: 0, y: -9.81, z: 0 },
  wind: { x: 0, y: 0, z: 0 }
};
```

### Environment Variables

API keys can be configured via environment variables. Create a `.env` file:

```
VITE_GEMINI_API_KEY=your_api_key_here
```

## Testing

### Manual Testing

Run the development server and use the prompt interface to test different scenarios.

### Regression Suite

Append `?test=true` to the URL to access the system diagnostics panel:

```
http://localhost:5173/?test=true
```

Available tests:
- Unit: Adversarial logic validation
- Unit: Physics config integrity
- Integration: Warm start protocol
- Integration: AI config injection
- Regression: Renderer integrity

### Comprehensive Test Plan

See `TEST_PLAN.md` for detailed edge case coverage and testing recommendations including:

- Prompt input validation
- API error handling
- Physics parameter validation
- State management
- Performance benchmarks
- Accessibility compliance

## API Integration

The platform integrates with AI services for natural language processing. Configure API endpoints in `services/geminiService.ts`.

## Project Structure

```
SnapLock/
├── components/          # React components
│   ├── PhysicsScene.tsx
│   ├── ControlPanel.tsx
│   └── TestDashboard.tsx
├── services/           # External service integrations
│   ├── geminiService.ts
│   └── adversarialDirector.ts
├── types.ts            # TypeScript type definitions
├── constants.ts        # Default configurations
├── App.tsx             # Main application
└── index.tsx           # Entry point
```

## Performance Considerations

- The physics engine maintains 60fps with default particle counts
- Large particle counts (>1000) may impact performance on low-end devices
- WebGL context loss is handled gracefully with automatic recovery
- Memory is managed through proper cleanup of Three.js resources

## Browser Compatibility

- Modern browsers with WebGL support
- Tested on Chrome, Firefox, Safari, Edge
- Requires JavaScript enabled
- Recommended: Hardware acceleration enabled

## License

Dual licensing model:

### Open Source (AGPLv3)
For non-commercial, educational, or open-source projects. Source code disclosure required if deployed.

### Commercial
For proprietary use without source disclosure. Contact the author for licensing details.

## Development Workflow

### Building
```bash
npm run build
```

### Type Checking
```bash
tsc --noEmit
```

### Linting
Linting configuration can be added to the project as needed.

## Known Limitations

- Physics simulation is deterministic but may vary across different hardware
- Large numbers of collisions can impact frame rate
- API rate limits may affect auto-spawn and adversarial director features
- Mobile device support is limited due to WebGL performance constraints

## Troubleshooting

### Blank screen on deployment
Ensure `index.html` includes the entry point script tag and `netlify.toml` is configured correctly.

### Build errors
Clear `node_modules` and `dist`, then reinstall dependencies:
```bash
rm -rf node_modules dist
npm install
npm run build
```

### WebGL context loss
Check browser console for errors. Ensure hardware acceleration is enabled in browser settings.

## Contributing

Contributions should include:
- TypeScript type safety
- Test coverage for new features
- Documentation updates
- Adherence to existing code style
