import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PhysicsParams, ShapeType, MovementBehavior, SpawnMode, ViewMode, TelemetryData } from '../types';

interface SimulationLayerProps {
  params: PhysicsParams;
  isPaused: boolean;
  shouldReset: boolean;
  onResetComplete: () => void;
  mouseInteraction: boolean;
  viewMode: ViewMode;
  telemetryRef: React.MutableRefObject<TelemetryData>;
}

const SimulationLayer: React.FC<SimulationLayerProps> = ({ 
  params, 
  isPaused, 
  shouldReset, 
  onResetComplete,
  mouseInteraction,
  viewMode,
  telemetryRef
}) => {
  const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const { camera } = useThree();
  const frameCountRef = useRef(0);
  
  // 1. Stable Topology Structure
  const groupStructure = useMemo(() => {
    let count = 0;
    return params.assetGroups.map((g, index) => {
      const start = count;
      count += g.count;
      return { 
        index, // pointer to params.assetGroups[index]
        id: g.id, 
        start, 
        end: count 
      };
    });
  }, [JSON.stringify(params.assetGroups.map(g => ({ c: g.count, id: g.id })))]);

  const totalParticles = groupStructure.reduce((acc, g) => Math.max(acc, g.end), 0);

  // 2. Topology Hash for Reset Trigger
  const topologyHash = JSON.stringify({
    behavior: params.movementBehavior,
    groups: params.assetGroups.map(g => ({
      count: g.count,
      shape: g.shape,
      spawnMode: g.spawnMode,
      scale: g.scale 
    }))
  });

  // Physics State Buffers
  const positions = useRef(new Float32Array(0));
  const velocities = useRef(new Float32Array(0));
  const rotations = useRef(new Float32Array(0)); 
  const rotVelocities = useRef(new Float32Array(0));
  const initialPositions = useRef(new Float32Array(0)); 
  const meta = useRef(new Float32Array(0)); // phase/meta data
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // --- INITIALIZATION ---
  useEffect(() => {
    // Reset frame count to trigger Warm Start Phase
    frameCountRef.current = 0;

    // Clean up potentially stale references when topology changes
    meshRefs.current = meshRefs.current.slice(0, groupStructure.length);

    // Resize buffers
    if (positions.current.length !== totalParticles * 3) {
      positions.current = new Float32Array(totalParticles * 3);
      velocities.current = new Float32Array(totalParticles * 3);
      rotations.current = new Float32Array(totalParticles * 3);
      rotVelocities.current = new Float32Array(totalParticles * 3);
      initialPositions.current = new Float32Array(totalParticles * 3);
      meta.current = new Float32Array(totalParticles);
    }

    const pos = positions.current;
    const vel = velocities.current;
    const rot = rotations.current;
    const rVel = rotVelocities.current;
    const init = initialPositions.current;
    const m = meta.current;
    
    // Seed particles
    groupStructure.forEach((structure) => {
        const group = params.assetGroups[structure.index];
        const spread = 4;
        const mesh = meshRefs.current[structure.index];
        const baseColor = new THREE.Color(group.color);

        for (let i = structure.start; i < structure.end; i++) {
            const i3 = i * 3;
            let x=0, y=0, z=0;

            // 1. POSITIONING
            switch(group.spawnMode) {
                case SpawnMode.BLAST:
                   const r = Math.cbrt(Math.random()) * spread * 0.5;
                   const theta = Math.random() * Math.PI * 2;
                   const phi = Math.acos(2 * Math.random() - 1);
                   x = r * Math.sin(phi) * Math.cos(theta);
                   y = r * Math.sin(phi) * Math.sin(theta);
                   z = r * Math.cos(phi);
                   break;
                case SpawnMode.JET:
                   x = (Math.random() - 0.5) * spread * 0.2;
                   y = (Math.random() - 0.5) * spread * 0.2;
                   z = (Math.random() - 0.5) * spread * 0.2;
                   break;
                case SpawnMode.GRID:
                   const perRow = Math.ceil(Math.pow(group.count, 1/3));
                   const step = spread * 2 / perRow;
                   const localI = i - structure.start;
                   const ix = localI % perRow;
                   const iy = Math.floor((localI / perRow)) % perRow;
                   const iz = Math.floor(localI / (perRow * perRow));
                   x = (ix - perRow/2) * step;
                   y = (iy - perRow/2) * step;
                   z = (iz - perRow/2) * step;
                   break;
                case SpawnMode.FLOAT:
                   x = (Math.random() - 0.5) * spread * 3;
                   y = (Math.random() - 0.5) * spread * 2 + 5;
                   z = (Math.random() - 0.5) * spread * 3;
                   break;
                case SpawnMode.PILE:
                default:
                   x = (Math.random() - 0.5) * spread;
                   y = (Math.random()) * spread * 2;
                   z = (Math.random() - 0.5) * spread;
                   break;
            }

            pos[i3] = x; pos[i3+1] = y; pos[i3+2] = z;
            init[i3] = x; init[i3+1] = y; init[i3+2] = z;

            // 2. VELOCITY
            if (params.movementBehavior === MovementBehavior.RADIAL_EXPLOSION) {
                const dir = new THREE.Vector3(x, y, z).normalize();
                dir.x += (Math.random() - 0.5) * 0.5;
                dir.y += (Math.random() - 0.5) * 0.5;
                dir.z += (Math.random() - 0.5) * 0.5;
                dir.normalize();
                const force = 10 + Math.random() * 25;
                vel[i3] = dir.x * force;
                vel[i3+1] = Math.abs(dir.y * force) + 5;
                vel[i3+2] = dir.z * force;
            } else if (params.movementBehavior === MovementBehavior.LINEAR_FLOW) {
                vel[i3] = 10; vel[i3+1] = 0; vel[i3+2] = 0;
            } else if (params.movementBehavior === MovementBehavior.SWARM_FLOCK) {
                vel[i3] = (Math.random() - 0.5) * 2;
                vel[i3+1] = (Math.random() - 0.5) * 2;
                vel[i3+2] = (Math.random() - 0.5) * 2;
            } else if (group.spawnMode === SpawnMode.JET) {
                vel[i3] = (Math.random() - 0.5) * 2;
                vel[i3+1] = 20 + Math.random() * 10;
                vel[i3+2] = (Math.random() - 0.5) * 2;
            } else {
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

            m[i] = Math.random(); 

            // Initialize Color - CRITICAL for optimization
            if (mesh) {
                mesh.setColorAt(i - structure.start, baseColor);
            }
        }

        if (mesh) {
            mesh.instanceMatrix.needsUpdate = true;
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }

    });

    // Initial Matrix
    groupStructure.forEach((structure) => {
        const mesh = meshRefs.current[structure.index];
        const group = params.assetGroups[structure.index];
        if (!mesh) return;
        
        for (let i = structure.start; i < structure.end; i++) {
            const i3 = i * 3;
            dummy.position.set(pos[i3], pos[i3+1], pos[i3+2]);
            dummy.rotation.set(rot[i3], rot[i3+1], rot[i3+2]);
            dummy.scale.setScalar(group.scale);
            dummy.updateMatrix();
            mesh.setMatrixAt(i - structure.start, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
    });

    if (shouldReset) onResetComplete();

  }, [topologyHash, shouldReset]); 

  // --- PHYSICS ENGINE LOOP ---
  useFrame((state, delta) => {
    // We update colors every frame to support sensor simulation modes
    const time = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.03); 

    const pos = positions.current;
    const vel = velocities.current;
    const rot = rotations.current;
    const rVel = rotVelocities.current;
    const init = initialPositions.current;
    const m = meta.current;
    const floorY = -5;

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

    // Telemetry Accumulators
    let sysEnergy = 0;
    let sumVel = 0;
    let maxVel = 0;
    let activeParticles = 0;

    // Optimization: Check if we need to update colors this frame
    const isDynamicColorMode = viewMode === ViewMode.DEPTH || viewMode === ViewMode.LIDAR;

    // WARM START LOGIC:
    // To prevent "Contact Manifold" explosions (the "pop" effect) when loading/resetting,
    // we run the first 60 frames (approx 1 sec) with clamped velocities and high damping.
    // This allows interpenetrating objects to settle without violent repulsion.
    // FIX: Only increment warmup frames if physics is NOT paused.
    if (!isPaused) {
        frameCountRef.current += 1;
    }
    const isWarmup = frameCountRef.current < 60;

    groupStructure.forEach((structure) => {
        const group = params.assetGroups[structure.index];
        const mesh = meshRefs.current[structure.index];
        const baseColor = new THREE.Color(group.color);
        const halfScale = group.scale / 2;

        const applyGravity = params.movementBehavior !== MovementBehavior.LINEAR_FLOW 
                             && params.movementBehavior !== MovementBehavior.SWARM_FLOCK
                             && params.movementBehavior !== MovementBehavior.ORBITAL;
        
        const applyFloor = params.movementBehavior !== MovementBehavior.ORBITAL 
                           && params.movementBehavior !== MovementBehavior.SWARM_FLOCK;

        for (let i = structure.start; i < structure.end; i++) {
            const i3 = i * 3;
            activeParticles++;

            if (!isPaused) {
                // ... Physics Integration Logic ...
                if (params.movementBehavior === MovementBehavior.ORBITAL) {
                    const r = Math.sqrt(init[i3]**2 + init[i3+2]**2) + 2;
                    const speed = 0.5 / (r * 0.5);
                    const theta = time * speed + m[i] * 10;
                    pos[i3] = r * Math.cos(theta);
                    pos[i3+2] = r * Math.sin(theta);
                    pos[i3+1] = init[i3+1] + Math.sin(time * 2 + m[i] * 5) * 0.5;
                    
                    // Velocity approximation for orbital (v = r * omega)
                    const vMag = r * speed;
                    sumVel += vMag;
                    maxVel = Math.max(maxVel, vMag);
                    sysEnergy += 0.5 * group.mass * (vMag * vMag);

                    dummy.position.set(pos[i3], pos[i3+1], pos[i3+2]);
                    dummy.lookAt(0,0,0);
                    rot[i3] = dummy.rotation.x; rot[i3+1] = dummy.rotation.y; rot[i3+2] = dummy.rotation.z;
                } else if (params.movementBehavior === MovementBehavior.SINUSOIDAL_WAVE) {
                    pos[i3] = init[i3];
                    const zScroll = (init[i3+2] + time * 5) % 40 - 20;
                    pos[i3+2] = zScroll;
                    pos[i3+1] = init[i3+1] + Math.sin(pos[i3]*0.3 + zScroll*0.2 + time*2) * 2;
                    rot[i3] += dt; rot[i3+2] += dt;
                    
                    const vMag = 2; // Approx constant wave speed
                    sumVel += vMag;
                    sysEnergy += 0.5 * group.mass * (vMag * vMag);

                    dummy.position.set(pos[i3], pos[i3+1], pos[i3+2]);
                    dummy.rotation.set(rot[i3], rot[i3+1], rot[i3+2]);
                } else {
                    let fx = 0, fy = 0, fz = 0;

                    if (applyGravity) fy += params.gravity.y;
                    fx += params.gravity.x + params.wind.x;
                    fz += params.gravity.z + params.wind.z;

                    // Apply increased drag during Warm Start to dampen explosion artifacts
                    const dragCoeff = isWarmup ? 0.5 : (group.drag * 5);
                    fx -= vel[i3] * dragCoeff;
                    fy -= vel[i3+1] * dragCoeff;
                    fz -= vel[i3+2] * dragCoeff;

                    if (params.movementBehavior === MovementBehavior.SWARM_FLOCK) {
                        const centerX = hasTarget ? target.x : 0;
                        const centerY = hasTarget ? target.y : 5;
                        const centerZ = hasTarget ? target.z : 0;
                        fx += (centerX - pos[i3]) * 2.0;
                        fy += (centerY - pos[i3+1]) * 2.0;
                        fz += (centerZ - pos[i3+2]) * 2.0;
                        fx += (Math.random()-0.5) * 5; fy += (Math.random()-0.5) * 5; fz += (Math.random()-0.5) * 5;
                    } else if (params.movementBehavior === MovementBehavior.LINEAR_FLOW) {
                        fx += 5.0; 
                        fy += (init[i3+1] - pos[i3+1]) * 5; 
                        fz += (init[i3+2] - pos[i3+2]) * 5;
                    }

                    const invMass = 1.0 / group.mass;
                    vel[i3] += fx * invMass * dt;
                    vel[i3+1] += fy * invMass * dt;
                    vel[i3+2] += fz * invMass * dt;

                    // Clamp max velocity during Warm Start
                    if (isWarmup) {
                        const maxWarmupVel = 0.5;
                        const currentVel = Math.sqrt(vel[i3]**2 + vel[i3+1]**2 + vel[i3+2]**2);
                        if (currentVel > maxWarmupVel) {
                            const scale = maxWarmupVel / currentVel;
                            vel[i3] *= scale;
                            vel[i3+1] *= scale;
                            vel[i3+2] *= scale;
                        }
                    }

                    pos[i3] += vel[i3] * dt;
                    pos[i3+1] += vel[i3+1] * dt;
                    pos[i3+2] += vel[i3+2] * dt;

                    rot[i3] += rVel[i3] * dt;
                    rot[i3+1] += rVel[i3+1] * dt;
                    rot[i3+2] += rVel[i3+2] * dt;

                    if (applyFloor && pos[i3+1] < floorY + halfScale) {
                        pos[i3+1] = floorY + halfScale;
                        if (vel[i3+1] < 0) {
                            // During Warm Start, restitution is 0 to force settling
                            const effectiveRestitution = isWarmup ? 0.0 : group.restitution;
                            vel[i3+1] = -vel[i3+1] * effectiveRestitution;
                            if (Math.abs(vel[i3+1]) < 0.5) vel[i3+1] = 0;
                        }
                        const f = Math.max(0, 1.0 - (group.friction * dt * 10));
                        vel[i3] *= f; vel[i3+2] *= f;
                        rVel[i3] *= f; rVel[i3+1] *= f; rVel[i3+2] *= f;
                    }

                    if (params.movementBehavior === MovementBehavior.LINEAR_FLOW && pos[i3] > 20) {
                        pos[i3] = -20;
                    }

                    // Metrics Update
                    const vSq = vel[i3]*vel[i3] + vel[i3+1]*vel[i3+1] + vel[i3+2]*vel[i3+2];
                    const vMag = Math.sqrt(vSq);
                    sysEnergy += 0.5 * group.mass * vSq;
                    sumVel += vMag;
                    if (vMag > maxVel) maxVel = vMag;

                    dummy.position.set(pos[i3], pos[i3+1], pos[i3+2]);
                    dummy.rotation.set(rot[i3], rot[i3+1], rot[i3+2]);
                }
            } else {
                 // Even if paused, update dummy for color application and metrics
                 dummy.position.set(pos[i3], pos[i3+1], pos[i3+2]);
                 dummy.rotation.set(rot[i3], rot[i3+1], rot[i3+2]);
            }

            // Update Mesh Matrix
            if (mesh) {
                dummy.scale.setScalar(group.scale);
                dummy.updateMatrix();
                mesh.setMatrixAt(i - structure.start, dummy.matrix);

                // --- SENSOR SIMULATION COLORING ---
                if (isDynamicColorMode) {
                    if (viewMode === ViewMode.DEPTH) {
                        const dist = dummy.position.distanceTo(camera.position);
                        const normDist = Math.min(1.0, Math.max(0, (dist - 5) / 40)); 
                        const val = 1.0 - normDist;
                        tempColor.setRGB(val, val, val);
                        mesh.setColorAt(i - structure.start, tempColor);
                    } else if (viewMode === ViewMode.LIDAR) {
                        const h = Math.min(1.0, Math.max(0, (pos[i3+1] + 5) / 20));
                        tempColor.setHSL(0.6 - (h * 0.6), 1.0, 0.5); 
                        mesh.setColorAt(i - structure.start, tempColor);
                    }
                } else if (frameCountRef.current < 2) { 
                    // Ensure color is set at least once for RGB mode (fixes reset race conditions)
                    mesh.setColorAt(i - structure.start, baseColor);
                }
            }
        }
        
        if (mesh) {
            mesh.instanceMatrix.needsUpdate = true;
            if (isDynamicColorMode || frameCountRef.current < 2) {
                 if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
            }
        }
    });
    
    // --- UPDATE TELEMETRY ---
    // Update only if active or occasionally if paused to keep UI responsive
    if (frameCountRef.current % 5 === 0 || isPaused) { 
        telemetryRef.current = {
            fps: 1 / dt,
            particleCount: activeParticles,
            systemEnergy: sysEnergy,
            avgVelocity: activeParticles > 0 ? sumVel / activeParticles : 0,
            maxVelocity: maxVel,
            simTime: time,
            isWarmup: isWarmup
        };
    }

  });

  return (
    <group>
      {groupStructure.map((structure) => {
          const group = params.assetGroups[structure.index];
          let Geo;
          switch(group.shape) {
             case ShapeType.SPHERE: Geo = <sphereGeometry args={[1, 16, 16]} />; break;
             case ShapeType.CONE: Geo = <coneGeometry args={[1, 2, 16]} />; break;
             case ShapeType.PYRAMID: Geo = <coneGeometry args={[1, 1.5, 4]} />; break;
             case ShapeType.CYLINDER: Geo = <cylinderGeometry args={[0.5, 0.5, 2, 16]} />; break;
             case ShapeType.TORUS: Geo = <torusGeometry args={[1, 0.4, 16, 32]} />; break;
             case ShapeType.ICOSAHEDRON: Geo = <icosahedronGeometry args={[1, 0]} />; break;
             case ShapeType.CAPSULE: Geo = <capsuleGeometry args={[0.5, 1, 4, 16]} />; break;
             case ShapeType.PLATE: Geo = <boxGeometry args={[1, 0.1, 1]} />; break;
             case ShapeType.CUBE: 
             default: Geo = <boxGeometry args={[1, 1, 1]} />; break;
          }

          return (
            <instancedMesh 
                key={group.id} 
                ref={(el) => meshRefs.current[structure.index] = el} 
                args={[undefined, undefined, group.count]} 
                castShadow 
                receiveShadow
            >
              {Geo}
              <meshStandardMaterial 
                color={group.color}
                wireframe={viewMode === ViewMode.WIREFRAME}
                roughness={viewMode === ViewMode.RGB ? 1.0 - group.restitution : 1.0} 
                metalness={viewMode === ViewMode.RGB ? (group.restitution > 0.8 ? 0.1 : 0.6) : 0.0}
                transparent={viewMode === ViewMode.RGB && group.restitution < 0.2} 
                opacity={viewMode === ViewMode.RGB && group.restitution < 0.2 ? 0.8 : 1.0}
                emissive={viewMode === ViewMode.LIDAR ? new THREE.Color(0x222222) : new THREE.Color(0x000000)}
              />
            </instancedMesh>
          );
      })}
    </group>
  );
};

export default SimulationLayer;