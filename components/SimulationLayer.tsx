
import React, { useRef, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PhysicsParams, ShapeType, MovementBehavior, SpawnMode, ViewMode, TelemetryData, SimulationLayerHandle, ParticleSnapshot } from '../types';
import { AssetRenderer } from './AssetRenderer';

interface SimulationLayerProps {
  params: PhysicsParams;
  isPaused: boolean;
  shouldReset: boolean;
  onResetComplete: () => void;
  mouseInteraction: boolean;
  viewMode: ViewMode;
  telemetryRef: React.MutableRefObject<TelemetryData>;
}

const SimulationLayer = forwardRef<SimulationLayerHandle, SimulationLayerProps>(({ 
  params, 
  isPaused, 
  shouldReset, 
  onResetComplete,
  mouseInteraction,
  viewMode,
  telemetryRef
}, ref) => {
  const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const { camera } = useThree();
  const frameCountRef = useRef(0);
  
  // History buffer for stability calculation (last 60 frames avg velocity)
  const velocityHistoryRef = useRef<number[]>([]);
  
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
  }, [JSON.stringify(params.assetGroups.map(g => ({ c: g.count, id: g.id, m: g.modelUrl })))]);

  const totalParticles = groupStructure.reduce((acc, g) => Math.max(acc, g.end), 0);

  // 2. Topology Hash for Reset Trigger
  const topologyHash = JSON.stringify({
    behavior: params.movementBehavior,
    groups: params.assetGroups.map(g => ({
      count: g.count,
      shape: g.shape,
      spawnMode: g.spawnMode,
      scale: g.scale,
      model: g.modelUrl // Include model in hash
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

  // --- DATA EXPORT INTERFACE ---
  useImperativeHandle(ref, () => ({
    captureSnapshot: () => {
      const snapshot: ParticleSnapshot[] = [];
      const pos = positions.current;
      const vel = velocities.current;
      const rot = rotations.current;

      groupStructure.forEach((structure) => {
        const group = params.assetGroups[structure.index];
        for (let i = structure.start; i < structure.end; i++) {
          const i3 = i * 3;
          snapshot.push({
            id: i,
            groupId: group.id,
            shape: group.shape,
            mass: group.mass,
            position: { x: pos[i3], y: pos[i3+1], z: pos[i3+2] },
            velocity: { x: vel[i3], y: vel[i3+1], z: vel[i3+2] },
            rotation: { x: rot[i3], y: rot[i3+1], z: rot[i3+2] }
          });
        }
      });
      return snapshot;
    },
    captureMLGroundTruth: () => {
      // Legacy SimulationLayer does not support ML ground truth export
      throw new Error('ML ground truth export not available in legacy SimulationLayer. Use SimulationLayerV2.');
    }
  }));

  // --- INITIALIZATION ---
  useEffect(() => {
    // Reset frame count to trigger Warm Start Phase
    frameCountRef.current = 0;
    velocityHistoryRef.current = [];

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
                   const step = perRow > 1 ? (spread * 2 / perRow) : 0;
                   const axisOffset = (perRow - 1) / 2;
                   
                   const localI = i - structure.start;
                   const ix = localI % perRow;
                   const iy = Math.floor((localI / perRow)) % perRow;
                   const iz = Math.floor(localI / (perRow * perRow));
                   
                   x = (ix - axisOffset) * step;
                   y = (iy - axisOffset) * step + 5; 
                   z = (iz - axisOffset) * step;
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

            // Initialize Color
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

    const isDynamicColorMode = viewMode === ViewMode.DEPTH || viewMode === ViewMode.LIDAR;

    if (!isPaused) {
        frameCountRef.current += 1;
    }
    const isWarmup = frameCountRef.current < 60;

    groupStructure.forEach((structure) => {
        const group = params.assetGroups[structure.index];
        const mesh = meshRefs.current[structure.index];
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
                    
                    const vMag = 2; 
                    sumVel += vMag;
                    sysEnergy += 0.5 * group.mass * (vMag * vMag);

                    dummy.position.set(pos[i3], pos[i3+1], pos[i3+2]);
                    dummy.rotation.set(rot[i3], rot[i3+1], rot[i3+2]);
                } else {
                    let fx = 0, fy = 0, fz = 0;

                    if (applyGravity) fy += params.gravity.y;
                    fx += params.gravity.x + params.wind.x;
                    fz += params.gravity.z + params.wind.z;

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

                    const vSq = vel[i3]*vel[i3] + vel[i3+1]*vel[i3+1] + vel[i3+2]*vel[i3+2];
                    const vMag = Math.sqrt(vSq);
                    sysEnergy += 0.5 * group.mass * vSq;
                    sumVel += vMag;
                    if (vMag > maxVel) maxVel = vMag;

                    dummy.position.set(pos[i3], pos[i3+1], pos[i3+2]);
                    dummy.rotation.set(rot[i3], rot[i3+1], rot[i3+2]);
                }
            } else {
                 dummy.position.set(pos[i3], pos[i3+1], pos[i3+2]);
                 dummy.rotation.set(rot[i3], rot[i3+1], rot[i3+2]);
            }

            if (mesh) {
                dummy.scale.setScalar(group.scale);
                dummy.updateMatrix();
                mesh.setMatrixAt(i - structure.start, dummy.matrix);

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
                    mesh.setColorAt(i - structure.start, new THREE.Color(group.color));
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
    
    if (frameCountRef.current % 5 === 0 || isPaused) {
        const avgVel = activeParticles > 0 ? sumVel / activeParticles : 0;
        
        if (!isPaused) {
            velocityHistoryRef.current.push(avgVel);
            if (velocityHistoryRef.current.length > 60) velocityHistoryRef.current.shift();
        }
        
        let stabilityScore = 0;
        if (velocityHistoryRef.current.length > 5) {
            const mean = velocityHistoryRef.current.reduce((a, b) => a + b, 0) / velocityHistoryRef.current.length;
            const variance = velocityHistoryRef.current.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / velocityHistoryRef.current.length;
            stabilityScore = Math.sqrt(variance);
        }

        telemetryRef.current = {
            fps: 1 / dt,
            particleCount: activeParticles,
            systemEnergy: sysEnergy,
            avgVelocity: avgVel,
            maxVelocity: maxVel,
            stabilityScore: stabilityScore,
            simTime: time,
            isWarmup: isWarmup,
            activeCollisions: 0,  // Legacy layer doesn't track collisions
            physicsSteps: frameCountRef.current
        };
    }

  });

  return (
    <group>
      {groupStructure.map((structure) => {
          const group = params.assetGroups[structure.index];
          return (
              <AssetRenderer
                 key={group.id}
                 group={group}
                 meshRef={(el: any) => meshRefs.current[structure.index] = el}
                 viewMode={viewMode}
              />
          );
      })}
    </group>
  );
});

SimulationLayer.displayName = 'SimulationLayer';
export default SimulationLayer;
