import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PhysicsParams, ShapeType, MovementBehavior, SpawnMode } from '../types';

interface SimulationLayerProps {
  params: PhysicsParams;
  isPaused: boolean;
  shouldReset: boolean;
  onResetComplete: () => void;
  mouseInteraction: boolean;
}

const SimulationLayer: React.FC<SimulationLayerProps> = ({ 
  params, 
  isPaused, 
  shouldReset, 
  onResetComplete,
  mouseInteraction
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();
  
  // Physics State Buffers
  const positions = useRef(new Float32Array(params.particleCount * 3));
  const velocities = useRef(new Float32Array(params.particleCount * 3));
  const rotations = useRef(new Float32Array(params.particleCount * 3)); 
  const rotVelocities = useRef(new Float32Array(params.particleCount * 3));
  
  // Initial state for resets
  const initialPositions = useRef(new Float32Array(params.particleCount * 3)); 
  const meta = useRef(new Float32Array(params.particleCount)); 
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const baseColor = useMemo(() => new THREE.Color(params.color), [params.color]);

  // --- INITIALIZATION & AUTO-SPAWN ---
  useEffect(() => {
    if (!meshRef.current) return;

    // Resize buffers if count changed
    if (positions.current.length !== params.particleCount * 3) {
      positions.current = new Float32Array(params.particleCount * 3);
      velocities.current = new Float32Array(params.particleCount * 3);
      rotations.current = new Float32Array(params.particleCount * 3);
      rotVelocities.current = new Float32Array(params.particleCount * 3);
      initialPositions.current = new Float32Array(params.particleCount * 3);
      meta.current = new Float32Array(params.particleCount);
    }

    const pos = positions.current;
    const vel = velocities.current;
    const rot = rotations.current;
    const rVel = rotVelocities.current;
    const init = initialPositions.current;
    const m = meta.current;
    
    // Seed Generation
    for (let i = 0; i < params.particleCount; i++) {
      const i3 = i * 3;
      
      // 1. POSITIONING ALGORITHM (Based on SPAWN MODE)
      let x=0, y=0, z=0;
      const s = params.spread;

      switch(params.spawnMode) {
        case SpawnMode.BLAST: // Radial point source
           const r = Math.cbrt(Math.random()) * s * 0.5;
           const theta = Math.random() * Math.PI * 2;
           const phi = Math.acos(2 * Math.random() - 1);
           x = r * Math.sin(phi) * Math.cos(theta);
           y = r * Math.sin(phi) * Math.sin(theta);
           z = r * Math.cos(phi);
           break;
        case SpawnMode.JET: // Directional stream
           x = (Math.random() - 0.5) * s * 0.2;
           y = (Math.random() - 0.5) * s * 0.2;
           z = (Math.random() - 0.5) * s * 0.2;
           break;
        case SpawnMode.GRID: // Structured Layout
           const perRow = Math.ceil(Math.pow(params.particleCount, 1/3));
           const step = s * 2 / perRow;
           const ix = i % perRow;
           const iy = Math.floor((i / perRow)) % perRow;
           const iz = Math.floor(i / (perRow * perRow));
           x = (ix - perRow/2) * step;
           y = (iy - perRow/2) * step;
           z = (iz - perRow/2) * step;
           break;
        case SpawnMode.FLOAT: // Wide area distribution
           x = (Math.random() - 0.5) * s * 3;
           y = (Math.random() - 0.5) * s * 2 + s; // Higher up
           z = (Math.random() - 0.5) * s * 3;
           break;
        case SpawnMode.PILE: // Vertical column
        default:
           x = (Math.random() - 0.5) * s;
           y = (Math.random()) * s * 2;
           z = (Math.random() - 0.5) * s;
           break;
      }

      pos[i3] = x; pos[i3+1] = y; pos[i3+2] = z;
      init[i3] = x; init[i3+1] = y; init[i3+2] = z;

      // 2. VELOCITY INJECTION (Based on BEHAVIOR)
      if (params.movementBehavior === MovementBehavior.RADIAL_EXPLOSION) {
          const dir = new THREE.Vector3(x, y, z).normalize();
          // Add some chaos to the normal vector
          dir.x += (Math.random() - 0.5) * 0.5;
          dir.y += (Math.random() - 0.5) * 0.5;
          dir.z += (Math.random() - 0.5) * 0.5;
          dir.normalize();
          
          const force = 15 + Math.random() * 35; // Significant explosion force
          vel[i3] = dir.x * force;
          vel[i3+1] = Math.abs(dir.y * force) + 5; // Upward bias
          vel[i3+2] = dir.z * force;
      } else if (params.movementBehavior === MovementBehavior.LINEAR_FLOW) {
          vel[i3] = 10; // Positive X flow
          vel[i3+1] = 0; 
          vel[i3+2] = 0;
      } else if (params.movementBehavior === MovementBehavior.SWARM_FLOCK) {
          vel[i3] = (Math.random() - 0.5) * 2;
          vel[i3+1] = (Math.random() - 0.5) * 2;
          vel[i3+2] = (Math.random() - 0.5) * 2;
      } else if (params.spawnMode === SpawnMode.JET) {
          vel[i3] = (Math.random() - 0.5) * 2;
          vel[i3+1] = 20 + Math.random() * 10; // Shoot up
          vel[i3+2] = (Math.random() - 0.5) * 2;
      } else {
          // Standard randomness
          vel[i3] = (Math.random() - 0.5);
          vel[i3+1] = (Math.random() - 0.5);
          vel[i3+2] = (Math.random() - 0.5);
      }

      // 3. ROTATION
      rot[i3] = Math.random() * Math.PI * 2;
      rot[i3+1] = Math.random() * Math.PI * 2;
      rot[i3+2] = Math.random() * Math.PI * 2;

      rVel[i3] = (Math.random() - 0.5) * 5;
      rVel[i3+1] = (Math.random() - 0.5) * 5;
      rVel[i3+2] = (Math.random() - 0.5) * 5;

      m[i] = Math.random(); // Phase offset for waves
      
      // Initial Matrix Update
      updateInstance(i, pos[i3], pos[i3+1], pos[i3+2], rot[i3], rot[i3+1], rot[i3+2]);
      meshRef.current.setColorAt(i, baseColor);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    
    if (shouldReset) onResetComplete();

  }, [params.particleCount, params.spread, params.shape, params.spawnMode, params.movementBehavior, shouldReset, baseColor, params.particleSize]);


  // --- PHYSICS ENGINE LOOP (VERLET INTEGRATION) ---
  useFrame((state, delta) => {
    if (isPaused || !meshRef.current) return;

    const dt = Math.min(delta, 0.03); 
    const time = state.clock.elapsedTime;
    
    const count = params.particleCount;
    const pos = positions.current;
    const vel = velocities.current;
    const rot = rotations.current;
    const rVel = rotVelocities.current;
    const init = initialPositions.current;
    const m = meta.current;
    const floorY = -5;

    // Interaction Target (Mouse)
    let target = new THREE.Vector3();
    let hasTarget = false;
    if (mouseInteraction) {
       const v = new THREE.Vector3(state.mouse.x, state.mouse.y, 0.5);
       v.unproject(camera);
       const dir = v.sub(camera.position).normalize();
       const dist = -camera.position.z / dir.z;
       target.copy(camera.position).add(dir.multiplyScalar(dist));
       hasTarget = true;
    }

    // --- BEHAVIOR MASKS ---
    // Determine which forces apply based on Behavior
    const applyGravity = params.movementBehavior !== MovementBehavior.LINEAR_FLOW 
                         && params.movementBehavior !== MovementBehavior.SWARM_FLOCK
                         && params.movementBehavior !== MovementBehavior.ORBITAL;
    
    const applyFloor = params.movementBehavior !== MovementBehavior.ORBITAL 
                       && params.movementBehavior !== MovementBehavior.SWARM_FLOCK;

    for (let i = 0; i < count; i++) {
       const i3 = i * 3;

       // 1. NON-PHYSICS OVERRIDES
       // Orbital and Wave are kinematic animations, not physics simulations
       if (params.movementBehavior === MovementBehavior.ORBITAL) {
          const r = Math.sqrt(init[i3]**2 + init[i3+2]**2) + 2;
          const speed = 0.5 / (r * 0.5); // Kepler-ish
          const theta = time * speed + m[i] * 10;
          
          pos[i3] = r * Math.cos(theta);
          pos[i3+2] = r * Math.sin(theta);
          pos[i3+1] = init[i3+1] + Math.sin(time * 2 + m[i] * 5) * 0.5; // Bobbing
          
          dummy.position.set(pos[i3], pos[i3+1], pos[i3+2]);
          dummy.lookAt(0,0,0); // Face center
          rot[i3] = dummy.rotation.x; rot[i3+1] = dummy.rotation.y; rot[i3+2] = dummy.rotation.z;
          
          updateInstance(i, pos[i3], pos[i3+1], pos[i3+2], rot[i3], rot[i3+1], rot[i3+2]);
          continue; 
       }
       
       if (params.movementBehavior === MovementBehavior.SINUSOIDAL_WAVE) {
           pos[i3] = init[i3];
           // Scroll Z
           const zScroll = (init[i3+2] + time * 5) % 40 - 20;
           pos[i3+2] = zScroll;
           // Sine Y
           pos[i3+1] = init[i3+1] + Math.sin(pos[i3]*0.3 + zScroll*0.2 + time*2) * 2;
           
           rot[i3] += dt; rot[i3+2] += dt;
           updateInstance(i, pos[i3], pos[i3+1], pos[i3+2], rot[i3], rot[i3+1], rot[i3+2]);
           continue;
       }

       // 2. FORCE ACCUMULATION (F = ma)
       let fx = 0, fy = 0, fz = 0;

       // Environment Forces
       if (applyGravity) fy += params.gravity.y;
       fx += params.gravity.x + params.wind.x;
       fz += params.gravity.z + params.wind.z;

       // Drag
       const dragCoeff = params.drag * 5;
       fx -= vel[i3] * dragCoeff;
       fy -= vel[i3+1] * dragCoeff;
       fz -= vel[i3+2] * dragCoeff;

       // Behavior Specific Forces
       if (params.movementBehavior === MovementBehavior.SWARM_FLOCK) {
           // Hover / Center attraction
           const centerX = hasTarget ? target.x : 0;
           const centerY = hasTarget ? target.y : 5; // Hover at 5 if no target
           const centerZ = hasTarget ? target.z : 0;

           const dx = centerX - pos[i3];
           const dy = centerY - pos[i3+1];
           const dz = centerZ - pos[i3+2];
           
           fx += dx * 2.0; // Spring strength
           fy += dy * 2.0;
           fz += dz * 2.0;
           
           // Noise/Wander
           fx += (Math.random()-0.5) * 5;
           fy += (Math.random()-0.5) * 5;
           fz += (Math.random()-0.5) * 5;
       } 
       else if (params.movementBehavior === MovementBehavior.LINEAR_FLOW) {
           // Artificial propulsion to counteract drag
           fx += 5.0; // Push Right
           // Center centering spring for Y and Z to keep on "belt"
           fy += (init[i3+1] - pos[i3+1]) * 5; 
           fz += (init[i3+2] - pos[i3+2]) * 5;
       }

       // Integration (Explicit Euler for speed)
       const invMass = 1.0 / params.mass;
       vel[i3] += fx * invMass * dt;
       vel[i3+1] += fy * invMass * dt;
       vel[i3+2] += fz * invMass * dt;

       pos[i3] += vel[i3] * dt;
       pos[i3+1] += vel[i3+1] * dt;
       pos[i3+2] += vel[i3+2] * dt;

       rot[i3] += rVel[i3] * dt;
       rot[i3+1] += rVel[i3+1] * dt;
       rot[i3+2] += rVel[i3+2] * dt;

       // 3. COLLISION RESOLUTION
       if (applyFloor && pos[i3+1] < floorY + params.particleSize/2) {
           pos[i3+1] = floorY + params.particleSize/2;
           
           if (vel[i3+1] < 0) {
               // Restitution
               vel[i3+1] = -vel[i3+1] * params.restitution;
               // Threshold
               if (Math.abs(vel[i3+1]) < 0.5) vel[i3+1] = 0;
           }

           // Friction
           const f = Math.max(0, 1.0 - (params.friction * dt * 10));
           vel[i3] *= f;
           vel[i3+2] *= f;
           rVel[i3] *= f; rVel[i3+1] *= f; rVel[i3+2] *= f;
       }

       // Reset if Linear Flow goes too far
       if (params.movementBehavior === MovementBehavior.LINEAR_FLOW && pos[i3] > 20) {
           pos[i3] = -20;
       }

       updateInstance(i, pos[i3], pos[i3+1], pos[i3+2], rot[i3], rot[i3+1], rot[i3+2]);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const updateInstance = (index: number, x: number, y: number, z: number, rx: number, ry: number, rz: number) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(rx, ry, rz);
      dummy.scale.setScalar(params.particleSize);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(index, dummy.matrix);
  };

  const Geometry = useMemo(() => {
     switch(params.shape) {
         case ShapeType.SPHERE: return <sphereGeometry args={[1, 16, 16]} />;
         case ShapeType.CONE: return <coneGeometry args={[1, 2, 16]} />;
         case ShapeType.PYRAMID: return <coneGeometry args={[1, 1.5, 4]} />;
         case ShapeType.CYLINDER: return <cylinderGeometry args={[0.5, 0.5, 2, 16]} />;
         case ShapeType.TORUS: return <torusGeometry args={[1, 0.4, 16, 32]} />;
         case ShapeType.ICOSAHEDRON: return <icosahedronGeometry args={[1, 0]} />;
         case ShapeType.CAPSULE: return <capsuleGeometry args={[0.5, 1, 4, 16]} />;
         case ShapeType.CUBE: 
         default: return <boxGeometry args={[1, 1, 1]} />;
     }
  }, [params.shape]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, params.particleCount]} castShadow receiveShadow>
      {Geometry}
      <meshStandardMaterial 
        color={params.color} 
        roughness={1.0 - params.restitution} 
        metalness={params.restitution > 0.8 ? 0.1 : 0.6}
        transparent={params.restitution < 0.2} 
        opacity={params.restitution < 0.2 ? 0.8 : 1.0}
      />
    </instancedMesh>
  );
};

export default SimulationLayer;