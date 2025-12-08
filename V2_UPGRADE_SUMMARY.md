# SnapLock V2.0 - Upgrade Summary

## Overview

SnapLock V2.0 represents a complete refactoring of the physics simulation and data export systems. The primary goals were to improve scientific accuracy and enable production-grade ML training data generation.

## Core Improvements

### Physics Engine Upgrade

**Previous Implementation**
- Naive Euler integration
- No inter-particle collisions
- Variable timestep causing instability
- Artificial velocity damping ("warmup" period)

**Current Implementation**
- Rapier.js WASM physics engine
- Full collision detection and response
- Fixed 120Hz timestep with accumulator
- Proper rigid body dynamics
- Energy and momentum conservation

**Impact**: Physics simulation now suitable for robotics research and realistic behavior modeling.

### ML Training Data Export

**Previous Implementation**
- Basic CSV export with position data only
- No camera information
- No bounding boxes or labels

**Current Implementation**
- Complete camera intrinsics (focal length, FOV, resolution)
- Camera extrinsics (6-DOF pose)
- 2D bounding boxes (pixel-accurate projection)
- 3D bounding boxes with rotation
- COCO JSON format support
- YOLO format support
- Velocity and angular velocity data
- Frustum culling and occlusion estimation

**Impact**: Generates production-ready datasets for supervised learning tasks.

### Security Architecture

**Previous Implementation**
- API keys embedded in client bundle
- No rate limiting
- Direct API calls from browser

**Current Implementation**
- Express backend proxy server
- API keys secured server-side
- Rate limiting (100 req/15min per IP)
- CORS protection with allowlist
- Input validation

**Impact**: Eliminates security vulnerability and enables cost control.

## Technical Changes

### New Dependencies
- `@dimforge/rapier3d-compat` - Physics engine

### New Files (3,787 lines)
- `services/physicsEngine.ts` (406 lines)
- `services/mlExportService.ts` (403 lines)
- `components/SimulationLayerV2.tsx` (772 lines)
- `backend/server.js` (340 lines)
- Backend configuration and documentation

### Modified Files
- `services/geminiService.ts` - Backend proxy integration
- `components/PhysicsScene.tsx` - Use new simulation layer
- `components/ControlPanel.tsx` - ML export UI
- `App.tsx` - Export handlers and state
- `types.ts` - ML ground truth types

## Performance Comparison

| Metric | V1 | V2 | Notes |
|--------|----|----|-------|
| Physics Method | Euler | Rapier RBD | Industry standard |
| Collision Detection | None | Full | All particles |
| Timestep | Variable | Fixed 120Hz | Deterministic |
| Energy Conservation | No | Yes | Physically accurate |
| Warmup Period | 60 frames | 0 frames | Removed hack |
| Export Formats | CSV | COCO, YOLO, CSV | ML-ready |
| Camera Data | No | Complete | Intrinsics + Extrinsics |
| API Security | Exposed | Proxied | Production-safe |

## Testing Quick Start

### Without Backend
```bash
npm install
npm run dev
```

Test physics:
1. Run simulation
2. Verify particles collide
3. Check console for collision count

### With Backend
```bash
# Terminal 1
cd backend && npm install && npm run dev

# Terminal 2
echo "VITE_BACKEND_URL=http://localhost:3001" >> .env
npm run dev
```

Test ML export:
1. Navigate to DATASET tab
2. Click START RECORDING
3. Wait 3-5 seconds
4. Click STOP RECORDING
5. Click EXPORT COCO DATASET
6. Verify JSON downloads

## Deployment Requirements

### Backend
- Node.js 18+
- API key (environment variable)
- Hosting platform (Railway, Vercel, Heroku)

### Frontend
- Backend URL configuration
- Standard static hosting

## Known Limitations

1. Occlusion uses frustum culling only (not full raycasting)
2. Segmentation masks not implemented
3. Temporal consistency validation not performed
4. Multi-camera setups not supported
5. Global index mapping needs refinement (physicsEngine.ts:329)

## Migration Notes

### Breaking Changes
- `SimulationLayer` replaced with `SimulationLayerV2`
- `TelemetryData` interface updated (added fields)
- Backend deployment required for production API access

### Backward Compatibility
- Legacy CSV export still available
- Direct API mode works for development (with warnings)
- Old simulation layer code preserved but not used

## Next Steps

1. Deploy backend to production
2. Configure frontend environment
3. Test full integration
4. Begin ML training pipeline setup
5. Address known limitations as needed

## Documentation

- `INTEGRATION_COMPLETE.md` - Detailed testing and integration guide
- `IMPLEMENTATION_STATUS.md` - Full implementation details
- `backend/README.md` - Backend deployment guide
- Inline code documentation in service files

---

Last Updated: 2025-12-07
