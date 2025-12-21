import React, { forwardRef, useImperativeHandle, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import SimulationLayerV2 from './SimulationLayerV2';
import { PhysicsParams, ViewMode, TelemetryData, SimulationLayerHandle, ParticleSnapshot, MLGroundTruthFrame } from '../types';

interface PhysicsSceneProps {
  params: PhysicsParams;
  isPaused: boolean;
  shouldReset: boolean;
  onResetComplete: () => void;
  mouseInteraction: boolean;
  viewMode: ViewMode;
  telemetryRef: React.MutableRefObject<TelemetryData>;
}

export interface PhysicsSceneHandle {
  resetCamera: () => void;
  captureSnapshot: () => ParticleSnapshot[];
  captureMLGroundTruth: () => MLGroundTruthFrame;
  // Animation controls
  pauseAnimations: () => void;
  resumeAnimations: () => void;
  stopAllAnimations: () => void;
  isAnimationPlaying: () => boolean;
}

const PhysicsScene = forwardRef<PhysicsSceneHandle, PhysicsSceneProps>(({
  params,
  isPaused,
  shouldReset,
  onResetComplete,
  mouseInteraction,
  viewMode,
  telemetryRef
}, ref) => {
  // Fixed: Properly typed OrbitControls ref instead of 'any'
  const orbitRef = useRef<OrbitControlsImpl | null>(null);
  const simLayerRef = useRef<SimulationLayerHandle>(null);

  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      try {
        if (orbitRef.current && typeof orbitRef.current.reset === 'function') {
          orbitRef.current.reset();
        }
      } catch (error) {
        console.warn('[PhysicsScene] Camera reset failed:', error);
      }
    },
    captureSnapshot: () => {
      if (simLayerRef.current) {
        return simLayerRef.current.captureSnapshot();
      }
      return [];
    },
    captureMLGroundTruth: () => {
      if (simLayerRef.current) {
        return simLayerRef.current.captureMLGroundTruth();
      }
      throw new Error('Simulation layer not initialized');
    },
    // Animation controls
    pauseAnimations: () => {
      if (simLayerRef.current) {
        simLayerRef.current.pauseAnimations();
      }
    },
    resumeAnimations: () => {
      if (simLayerRef.current) {
        simLayerRef.current.resumeAnimations();
      }
    },
    stopAllAnimations: () => {
      if (simLayerRef.current) {
        simLayerRef.current.stopAllAnimations();
      }
    },
    isAnimationPlaying: () => {
      return simLayerRef.current?.isAnimationPlaying() || false;
    }
  }));

  // WebGL Context Loss Recovery
  const [contextLost, setContextLost] = React.useState(false);

  React.useEffect(() => {
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.error('[PhysicsScene] WebGL context lost!');
      setContextLost(true);
    };

    const handleContextRestored = () => {
      console.log('[PhysicsScene] WebGL context restored');
      setContextLost(false);
      // Force full reset
      window.location.reload();
    };

    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('webglcontextlost', handleContextLost);
      canvas.addEventListener('webglcontextrestored', handleContextRestored);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      }
    };
  }, []);

  if (contextLost) {
    return (
      <div className="w-full h-full bg-red-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">WebGL Context Lost</h2>
          <p className="mb-4">Your GPU stopped responding. This usually happens due to:</p>
          <ul className="list-disc list-inside mb-4 text-left max-w-md mx-auto">
            <li>Too many particles/objects</li>
            <li>GPU driver crash</li>
            <li>Browser tab running too long</li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded font-bold"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-slate-900 relative">
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: [15, 10, 15], fov: 50, near: 0.1, far: 1000 }}
        shadows
        dpr={[1, 2]}
        onCreated={(state) => {
          console.log('[PhysicsScene] ✅ Canvas created successfully');
          console.log('[PhysicsScene] Camera position:', state.camera.position);
          console.log('[PhysicsScene] Camera looking at:', state.camera.rotation);
          console.log('[PhysicsScene] WebGL Renderer:', state.gl.info.render);
          state.camera.lookAt(0, 0, 0); // Ensure camera looks at origin
        }}
      >
        <color attach="background" args={[viewMode === ViewMode.LIDAR ? '#000000' : '#0a0e1a']} />
        
        {/* Dynamic Environment Lighting */}
        {viewMode === ViewMode.RGB && (
          <>
             {/* Custom environment if specified (for Chaos mode) */}
             {params.environmentUrl && (
               <Suspense fallback={null}>
                 <Environment files={params.environmentUrl} background blur={0.2} />
               </Suspense>
             )}

            {/* Standard scene lighting (no CDN dependencies) */}
            <ambientLight intensity={1.0} />
            <directionalLight position={[10, 20, 10]} intensity={2.5} castShadow color="#ffffff" />
            <directionalLight position={[-10, 20, -10]} intensity={1.5} color="#ffffff" />
            <pointLight position={[-10, 10, -10]} intensity={2.0} color="#67e8f9" />
            <pointLight position={[5, 5, 5]} intensity={1.8} color="#ffffff" />
            <hemisphereLight groundColor="#334155" intensity={0.8} />
          </>
        )}

        {/* Realistic Lighting Setup for Photorealistic Rendering */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <hemisphereLight
          args={['#ffffff', '#444444', 0.6]}
        />
        <spotLight
          position={[-5, 10, 5]}
          angle={0.3}
          penumbra={0.5}
          intensity={0.8}
          castShadow
        />

        {/* HDR Environment removed - standard lighting is sufficient */}
        {/* Scene has 6 configured lights: ambient, 2x directional, 2x point, hemisphere */}

        {/* Technical Grid Environment */}
        <Grid
          infiniteGrid
          fadeDistance={50}
          sectionColor={viewMode === ViewMode.LIDAR ? "#111111" : "#22d3ee"}
          cellColor={viewMode === ViewMode.LIDAR ? "#050505" : "#1e293b"}
          position={[0, -5, 0]}
          sectionSize={5}
          cellSize={1}
          sectionThickness={1.5}
          cellThickness={0.5}
        />

        {/* Core Simulation with Suspense for GLTF Loading */}
        {/* Using SimulationLayerV2 with Rapier physics engine */}
        <Suspense fallback={null}>
            <SimulationLayerV2
            ref={simLayerRef}
            params={params}
            isPaused={isPaused}
            shouldReset={shouldReset}
            onResetComplete={onResetComplete}
            mouseInteraction={mouseInteraction}
            viewMode={viewMode}
            telemetryRef={telemetryRef}
            />
        </Suspense>

        <OrbitControls ref={orbitRef} makeDefault maxPolarAngle={Math.PI / 1.8} enableDamping={true} />
      </Canvas>
    </div>
  );
});

PhysicsScene.displayName = 'PhysicsScene';
export default PhysicsScene;