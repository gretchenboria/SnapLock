import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import SimulationLayer from './SimulationLayer';
import { PhysicsParams, ViewMode, TelemetryData } from '../types';

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
  const orbitRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      if (orbitRef.current) {
        orbitRef.current.reset();
      }
    }
  }));

  return (
    <div className="w-full h-full bg-slate-900 relative">
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: [10, 8, 10], fov: 40 }}
        shadows
        dpr={[1, 2]} 
      >
        <color attach="background" args={[viewMode === ViewMode.LIDAR ? '#000000' : '#050810']} />
        
        {/* Cinematic Lighting - Only active in RGB mode */}
        {viewMode === ViewMode.RGB && (
          <>
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 20, 10]} intensity={1.5} castShadow />
            <pointLight position={[-10, 5, -10]} intensity={0.8} color="#22d3ee" />
            <spotLight position={[0, 15, 0]} angle={0.5} penumbra={1} intensity={2} castShadow color="#f472b6" />
            <Environment preset="night" blur={0.8} />
          </>
        )}

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
        
        {/* Core Simulation */}
        <SimulationLayer 
          params={params} 
          isPaused={isPaused} 
          shouldReset={shouldReset}
          onResetComplete={onResetComplete}
          mouseInteraction={mouseInteraction}
          viewMode={viewMode}
          telemetryRef={telemetryRef}
        />

        <OrbitControls ref={orbitRef} makeDefault maxPolarAngle={Math.PI / 1.8} />
      </Canvas>
    </div>
  );
});

PhysicsScene.displayName = 'PhysicsScene';
export default PhysicsScene;