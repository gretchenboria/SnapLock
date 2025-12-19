/**
 * SIMULATION LAYER V2 - With Rapier Physics Engine
 *
 * Replaces naive Euler integration with proper rigid body physics.
 * Provides scientific accuracy for ML training data generation.
 */

import React, { useRef, useMemo, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PhysicsParams, ShapeType, MovementBehavior, SpawnMode, ViewMode, TelemetryData, SimulationLayerHandle, ParticleSnapshot, MLGroundTruthFrame, BoundingBox2D, BoundingBox3D, CameraIntrinsics, CameraExtrinsics, Vector3Data, VRHand, RigidBodyType } from '../types';
import { AssetRenderer } from './AssetRenderer';
import { PhysicsEngine } from '../services/physicsEngine';
import { VRHandRenderer } from './VRHandRenderer';

interface SimulationLayerProps {
  params: PhysicsParams;
  isPaused: boolean;
  shouldReset: boolean;
  onResetComplete: () => void;
  mouseInteraction: boolean;
  viewMode: ViewMode;
  telemetryRef: React.MutableRefObject<TelemetryData>;
}

const SimulationLayerV2 = forwardRef<SimulationLayerHandle, SimulationLayerProps>(({
  params,
  isPaused,
  shouldReset,
  onResetComplete,
  mouseInteraction,
  viewMode,
  telemetryRef
}, ref) => {
  const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const { camera, gl } = useThree();
  const frameCountRef = useRef(0);

  // Physics engine instance
  const physicsEngineRef = useRef<PhysicsEngine | null>(null);
  const [physicsReady, setPhysicsReady] = useState(false);

  // VR Hand state tracking
  const [graspedObjects, setGraspedObjects] = useState<Map<string, string>>(new Map());

  // History buffer for stability calculation
  const velocityHistoryRef = useRef<number[]>([]);

  // Simulation ID for ML ground truth
  const simulationIdRef = useRef(`sim_${Date.now()}`);

  // 1. Stable Topology Structure (only include visible groups)
  const groupStructure = useMemo(() => {
    let count = 0;
    // Filter to only visible groups (visible defaults to true)
    const visibleGroups = params.assetGroups.filter(g => g.visible !== false);
    return visibleGroups.map((g, index) => {
      const start = count;
      count += g.count;
      return {
        index,
        id: g.id,
        group: g, // Store the actual group reference
        start,
        end: count
      };
    });
  }, [JSON.stringify(params.assetGroups.map(g => ({ c: g.count, id: g.id, m: g.modelUrl, v: g.visible })))]);

  const totalParticles = groupStructure.reduce((acc, g) => Math.max(acc, g.end), 0);

  // 2. Topology Hash for Reset Trigger
  const topologyHash = JSON.stringify({
    behavior: params.movementBehavior,
    groups: params.assetGroups.map(g => ({
      count: g.count,
      shape: g.shape,
      spawnMode: g.spawnMode,
      scale: g.scale,
      model: g.modelUrl
    }))
  });

  // Physics State Buffers
  const positions = useRef(new Float32Array(0));
  const velocities = useRef(new Float32Array(0));
  const rotations = useRef(new Float32Array(0));
  const angularVelocities = useRef(new Float32Array(0));
  const initialPositions = useRef(new Float32Array(0));
  const meta = useRef(new Float32Array(0));
  const bodyTypes = useRef(new Uint8Array(0)); // 0=DYNAMIC, 1=KINEMATIC, 2=STATIC

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // --- INITIALIZE PHYSICS ENGINE ---
  useEffect(() => {
    const initPhysics = async () => {
      if (!physicsEngineRef.current) {
        physicsEngineRef.current = new PhysicsEngine();
        await physicsEngineRef.current.initialize();
        setPhysicsReady(true);
      }
    };

    initPhysics();

    return () => {
      if (physicsEngineRef.current) {
        physicsEngineRef.current.dispose();
        physicsEngineRef.current = null;
      }
    };
  }, []);

  // --- CAMERA INTRINSICS/EXTRINSICS EXTRACTION ---
  const getCameraIntrinsics = (): CameraIntrinsics => {
    const canvas = gl.domElement;
    const perspCamera = camera as THREE.PerspectiveCamera;

    const fov = perspCamera.fov * (Math.PI / 180); // Convert to radians
    const height = canvas.height;
    const width = canvas.width;
    const focalLength = height / (2 * Math.tan(fov / 2)); // In pixels

    return {
      focalLength,
      principalPoint: {
        x: width / 2,
        y: height / 2
      },
      aspectRatio: width / height,
      fov: perspCamera.fov,
      resolution: { width, height }
    };
  };

  const getCameraExtrinsics = (): CameraExtrinsics => {
    const position = camera.position;
    const quaternion = camera.quaternion;
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    // Calculate look-at vector
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const lookAt = position.clone().add(direction);

    return {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: euler.x, y: euler.y, z: euler.z },
      quaternion: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
      lookAt: { x: lookAt.x, y: lookAt.y, z: lookAt.z }
    };
  };

  // --- CALCULATE 2D BOUNDING BOX FROM 3D ---
  const calculate2DBoundingBox = (
    position: THREE.Vector3,
    scale: number,
    shape: ShapeType,
    camera: THREE.Camera
  ): BoundingBox2D | null => {
    const canvas = gl.domElement;
    const width = canvas.width;
    const height = canvas.height;

    // Create bounding box corners in 3D
    const halfSize = scale / 2;
    const corners = [
      new THREE.Vector3(-halfSize, -halfSize, -halfSize),
      new THREE.Vector3(halfSize, -halfSize, -halfSize),
      new THREE.Vector3(-halfSize, halfSize, -halfSize),
      new THREE.Vector3(halfSize, halfSize, -halfSize),
      new THREE.Vector3(-halfSize, -halfSize, halfSize),
      new THREE.Vector3(halfSize, -halfSize, halfSize),
      new THREE.Vector3(-halfSize, halfSize, halfSize),
      new THREE.Vector3(halfSize, halfSize, halfSize),
    ];

    // Project to screen space
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    let allBehindCamera = true;

    corners.forEach(corner => {
      const worldPos = corner.clone().add(position);
      worldPos.project(camera);

      // Check if in front of camera
      if (worldPos.z < 1) {
        allBehindCamera = false;
        const x = (worldPos.x + 1) * width / 2;
        const y = (-worldPos.y + 1) * height / 2;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    });

    if (allBehindCamera) return null;

    // Clamp to viewport
    minX = Math.max(0, Math.min(width, minX));
    minY = Math.max(0, Math.min(height, minY));
    maxX = Math.max(0, Math.min(width, maxX));
    maxY = Math.max(0, Math.min(height, maxY));

    // Check if actually visible
    if (maxX <= minX || maxY <= minY) return null;

    return {
      xMin: minX,
      yMin: minY,
      xMax: maxX,
      yMax: maxY,
      confidence: 1.0 // Perfect confidence in synthetic data
    };
  };

  // --- DATA EXPORT INTERFACE ---
  useImperativeHandle(ref, () => ({
    captureSnapshot: (): ParticleSnapshot[] => {
      const snapshot: ParticleSnapshot[] = [];
      const pos = positions.current;
      const vel = velocities.current;
      const rot = rotations.current;
      const angVel = angularVelocities.current;

      groupStructure.forEach((structure) => {
        const group = structure.group;
        for (let i = structure.start; i < structure.end; i++) {
          const i3 = i * 3;

          const position = { x: pos[i3], y: pos[i3+1], z: pos[i3+2] };
          const halfScale = group.scale / 2;

          snapshot.push({
            id: i,
            groupId: group.id,
            shape: group.shape,
            mass: group.mass,
            position,
            velocity: { x: vel[i3], y: vel[i3+1], z: vel[i3+2] },
            rotation: { x: rot[i3], y: rot[i3+1], z: rot[i3+2] },
            angularVelocity: { x: angVel[i3], y: angVel[i3+1], z: angVel[i3+2] },
            boundingBox: {
              center: position,
              size: { x: group.scale, y: group.scale, z: group.scale },
              rotation: { x: rot[i3], y: rot[i3+1], z: rot[i3+2] }
            }
          });
        }
      });
      return snapshot;
    },

    captureMLGroundTruth: (): MLGroundTruthFrame => {
      const pos = positions.current;
      const vel = velocities.current;
      const rot = rotations.current;
      const angVel = angularVelocities.current;

      const intrinsics = getCameraIntrinsics();
      const extrinsics = getCameraExtrinsics();

      const objects: Array<{
        id: number;
        groupId: string;
        class: string;
        pose3D: any;
        boundingBox2D: BoundingBox2D;
        boundingBox3D: BoundingBox3D;
        velocity: Vector3Data;
        angularVelocity: Vector3Data;
        inFrustum: boolean;
        occlusionLevel: number;
        distanceFromCamera: number;
      }> = [];

      groupStructure.forEach((structure) => {
        const group = structure.group;

        for (let i = structure.start; i < structure.end; i++) {
          const i3 = i * 3;

          const position = new THREE.Vector3(pos[i3], pos[i3+1], pos[i3+2]);
          const rotation = new THREE.Euler(rot[i3], rot[i3+1], rot[i3+2]);
          const quaternion = new THREE.Quaternion().setFromEuler(rotation);

          // Calculate 2D bounding box
          const bbox2D = calculate2DBoundingBox(position, group.scale, group.shape, camera);
          const inFrustum = bbox2D !== null;

          // Calculate distance from camera
          const distanceFromCamera = position.distanceTo(camera.position);

          // Simple occlusion estimation (more sophisticated methods possible)
          const occlusionLevel = inFrustum ? 0.0 : 1.0;

          objects.push({
            id: i,
            groupId: group.id,
            class: group.shape,
            pose3D: {
              position: { x: position.x, y: position.y, z: position.z },
              rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
              quaternion: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w }
            },
            boundingBox2D: bbox2D || { xMin: 0, yMin: 0, xMax: 0, yMax: 0, confidence: 0 },
            boundingBox3D: {
              center: { x: position.x, y: position.y, z: position.z },
              size: { x: group.scale, y: group.scale, z: group.scale },
              rotation: { x: rotation.x, y: rotation.y, z: rotation.z }
            },
            velocity: { x: vel[i3], y: vel[i3+1], z: vel[i3+2] },
            angularVelocity: { x: angVel[i3], y: angVel[i3+1], z: angVel[i3+2] },
            inFrustum,
            occlusionLevel,
            distanceFromCamera
          });
        }
      });

      const physicsStats = physicsEngineRef.current?.getStatistics();

      return {
        timestamp: Date.now(),
        frameNumber: frameCountRef.current,
        camera: {
          intrinsics,
          extrinsics
        },
        objects,
        physics: {
          gravity: params.gravity,
          wind: params.wind,
          activeCollisions: physicsStats?.activeCollisions || 0,
          systemEnergy: telemetryRef.current.systemEnergy
        },
        metadata: {
          simulationId: simulationIdRef.current,
          configHash: topologyHash,
          engineVersion: 'SnapLock-v2.0-Rapier'
        }
      };
    }
  }));

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!physicsReady) return;

    // Reset frame count
    frameCountRef.current = 0;
    velocityHistoryRef.current = [];
    simulationIdRef.current = `sim_${Date.now()}`;

    // Clean up mesh refs
    meshRefs.current = meshRefs.current.slice(0, groupStructure.length);

    // Resize buffers
    if (positions.current.length !== totalParticles * 3) {
      positions.current = new Float32Array(totalParticles * 3);
      velocities.current = new Float32Array(totalParticles * 3);
      rotations.current = new Float32Array(totalParticles * 3);
      angularVelocities.current = new Float32Array(totalParticles * 3);
      initialPositions.current = new Float32Array(totalParticles * 3);
      meta.current = new Float32Array(totalParticles);
      bodyTypes.current = new Uint8Array(totalParticles);
    }

    const pos = positions.current;
    const vel = velocities.current;
    const rot = rotations.current;
    const init = initialPositions.current;
    const m = meta.current;
    const bodyType = bodyTypes.current;

    // Seed particles
    groupStructure.forEach((structure) => {
        const group = params.assetGroups[structure.index];
        const spread = 4;
        const mesh = meshRefs.current[structure.index];
        const baseColor = new THREE.Color(group.color);

        for (let i = structure.start; i < structure.end; i++) {
            const i3 = i * 3;
            let x=0, y=0, z=0;

            // P0 CRITICAL FIX: Use spawnPosition from spatial positioning service if available
            const hasSpawnPosition = group.spawnPosition &&
                                    typeof group.spawnPosition.x === 'number' &&
                                    typeof group.spawnPosition.y === 'number' &&
                                    typeof group.spawnPosition.z === 'number';

            if (hasSpawnPosition) {
                // Use calculated position as base (for "on_surface" constraints, etc.)
                x = group.spawnPosition!.x;
                y = group.spawnPosition!.y;
                z = group.spawnPosition!.z;

                // For multiple objects in same group, add small offsets to prevent overlapping
                if (group.count > 1) {
                    const localI = i - structure.start;
                    const offset = 0.3; // Small spacing between objects
                    const perRow = Math.ceil(Math.sqrt(group.count));
                    const row = Math.floor(localI / perRow);
                    const col = localI % perRow;
                    x += (col - perRow/2) * offset;
                    z += (row - perRow/2) * offset;
                }
            } else {
                // Fallback to original spawn mode logic
                // Positioning based on spawn mode
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
            } // End of spawnPosition check

            pos[i3] = x; pos[i3+1] = y; pos[i3+2] = z;
            init[i3] = x; init[i3+1] = y; init[i3+2] = z;

            // Set rigid body type FIRST (CRITICAL for surgical/industrial simulations)
            let bodyTypeValue = 0; // Default to DYNAMIC
            if (group.rigidBodyType === RigidBodyType.STATIC) {
                bodyTypeValue = 2; // STATIC: Don't move at all
            } else if (group.rigidBodyType === RigidBodyType.KINEMATIC) {
                bodyTypeValue = 1; // KINEMATIC: Programmed motion, ignore forces
            }

            // Initial velocity based on rigid body type and movement behavior
            // STATIC and KINEMATIC bodies always start with zero velocity
            if (bodyTypeValue === 2 || bodyTypeValue === 1) {
                // STATIC or KINEMATIC: Zero velocity
                vel[i3] = 0;
                vel[i3+1] = 0;
                vel[i3+2] = 0;
            } else if (params.movementBehavior === MovementBehavior.ORBITAL ||
                params.movementBehavior === MovementBehavior.SINUSOIDAL_WAVE ||
                params.movementBehavior === MovementBehavior.LINEAR_FLOW) {
                // Zero velocity for kinematic-driven behaviors
                vel[i3] = 0;
                vel[i3+1] = 0;
                vel[i3+2] = 0;
            } else if (params.movementBehavior === MovementBehavior.RADIAL_EXPLOSION) {
                // Radial explosion: blast outward from origin
                const dir = new THREE.Vector3(x, y, z).normalize();
                dir.x += (Math.random() - 0.5) * 0.5;
                dir.y += (Math.random() - 0.5) * 0.5;
                dir.z += (Math.random() - 0.5) * 0.5;
                dir.normalize();
                const force = 10 + Math.random() * 25;
                vel[i3] = dir.x * force;
                vel[i3+1] = Math.abs(dir.y * force) + 5;
                vel[i3+2] = dir.z * force;
            } else if (group.spawnMode === SpawnMode.JET) {
                // Jet: shoot upward with force
                vel[i3] = (Math.random() - 0.5) * 2;
                vel[i3+1] = 20 + Math.random() * 10;
                vel[i3+2] = (Math.random() - 0.5) * 2;
            } else if (group.spawnMode === SpawnMode.FLOAT) {
                // Float: gentle upward drift to counter gravity
                vel[i3] = (Math.random() - 0.5) * 0.5;
                vel[i3+1] = 2 + Math.random() * 3; // Upward velocity to float
                vel[i3+2] = (Math.random() - 0.5) * 0.5;
            } else if (group.spawnMode === SpawnMode.BLAST) {
                // Blast: random explosion-like velocities
                const blastDir = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    Math.random(), // Bias upward
                    (Math.random() - 0.5) * 2
                ).normalize();
                const blastForce = 5 + Math.random() * 10;
                vel[i3] = blastDir.x * blastForce;
                vel[i3+1] = Math.abs(blastDir.y * blastForce) + 2;
                vel[i3+2] = blastDir.z * blastForce;
            } else if (group.spawnMode === SpawnMode.GRID) {
                // Grid: minimal velocity (stay in formation)
                vel[i3] = (Math.random() - 0.5) * 0.1;
                vel[i3+1] = (Math.random() - 0.5) * 0.1;
                vel[i3+2] = (Math.random() - 0.5) * 0.1;
            } else {
                // PILE or default: small random velocities
                vel[i3] = (Math.random() - 0.5) * 2;
                vel[i3+1] = (Math.random() - 0.5) * 2;
                vel[i3+2] = (Math.random() - 0.5) * 2;
            }

            // Rotation
            rot[i3] = Math.random() * Math.PI * 2;
            rot[i3+1] = Math.random() * Math.PI * 2;
            rot[i3+2] = Math.random() * Math.PI * 2;

            m[i] = Math.random();

            // Store rigid body type in buffer (already calculated above)
            bodyType[i] = bodyTypeValue;

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

    // Initialize physics bodies
    if (physicsEngineRef.current) {
      physicsEngineRef.current.createBodies(params, groupStructure, pos, vel, rot);
      // Create joints for VR interactive objects
      physicsEngineRef.current.createJoints(params);
      // Create VR hand bodies if present
      if (params.vrHands && params.vrHands.length > 0) {
        physicsEngineRef.current.createHandBodies(params.vrHands);
      }
    }

    // Initial matrix update
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

  }, [topologyHash, shouldReset, physicsReady]);

  // --- PHYSICS ENGINE LOOP ---
  useFrame((state, delta) => {
    if (!physicsReady || !physicsEngineRef.current) return;

    const time = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.1);

    const pos = positions.current;
    const vel = velocities.current;
    const rot = rotations.current;
    const angVel = angularVelocities.current;
    const init = initialPositions.current;
    const m = meta.current;

    // Telemetry Accumulators
    let sysEnergy = 0;
    let sumVel = 0;
    let maxVel = 0;
    let activeParticles = 0;

    const isDynamicColorMode = viewMode === ViewMode.DEPTH || viewMode === ViewMode.LIDAR;

    if (!isPaused) {
        frameCountRef.current += 1;

        // Update VR hand positions before physics step
        if (params.vrHands && params.vrHands.length > 0) {
          physicsEngineRef.current.updateHandPositions(params.vrHands);

          // Handle grasp/release for each hand
          params.vrHands.forEach((hand) => {
            const isCurrentlyGrasping = physicsEngineRef.current!.isHandGrasping(hand.id);

            if (hand.isGrasping && !isCurrentlyGrasping) {
              // Attempt to grasp nearby object
              const nearbyObjects = physicsEngineRef.current!.detectHandObjectCollisions(
                hand.id,
                hand,
                params,
                pos
              );

              if (nearbyObjects.length > 0) {
                const success = physicsEngineRef.current!.createGraspConstraint(
                  hand.id,
                  hand,
                  nearbyObjects[0]
                );

                if (success) {
                  setGraspedObjects(prev => {
                    const newMap = new Map(prev);
                    newMap.set(hand.id, nearbyObjects[0]);
                    return newMap;
                  });
                }
              }
            } else if (!hand.isGrasping && isCurrentlyGrasping) {
              // Release grasp
              const released = physicsEngineRef.current!.releaseGraspConstraint(hand.id, hand);

              if (released) {
                setGraspedObjects(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(hand.id);
                  return newMap;
                });
              }
            }
          });
        }

        // Step physics engine with fixed timestep
        physicsEngineRef.current.step(dt, params, pos, vel, rot, init, m, time);

        // CRITICAL: Apply rigid body type constraints AFTER physics step
        // This ensures STATIC/KINEMATIC bodies behave correctly for surgical/industrial sims
        const bodyType = bodyTypes.current;
        for (let i = 0; i < bodyType.length; i++) {
          const i3 = i * 3;

          if (bodyType[i] === 2) {
            // STATIC: Reset to initial position, zero velocity (organs, tables stay fixed)
            pos[i3] = init[i3];
            pos[i3+1] = init[i3+1];
            pos[i3+2] = init[i3+2];
            vel[i3] = 0;
            vel[i3+1] = 0;
            vel[i3+2] = 0;
          } else if (bodyType[i] === 1) {
            // KINEMATIC: Zero velocity (robot arms follow programmed paths, not forces)
            // Position can be updated externally, but physics forces are ignored
            vel[i3] = 0;
            vel[i3+1] = 0;
            vel[i3+2] = 0;
          }
          // DYNAMIC (0): Normal physics, do nothing
        }
    }

    // Update rendering and telemetry
    groupStructure.forEach((structure) => {
        const group = params.assetGroups[structure.index];
        const mesh = meshRefs.current[structure.index];

        for (let i = structure.start; i < structure.end; i++) {
            const i3 = i * 3;
            activeParticles++;

            // Calculate telemetry
            const vSq = vel[i3]*vel[i3] + vel[i3+1]*vel[i3+1] + vel[i3+2]*vel[i3+2];
            const vMag = Math.sqrt(vSq);
            sysEnergy += 0.5 * group.mass * vSq;
            sumVel += vMag;
            if (vMag > maxVel) maxVel = vMag;

            // Update matrices
            if (mesh) {
                dummy.position.set(pos[i3], pos[i3+1], pos[i3+2]);
                dummy.rotation.set(rot[i3], rot[i3+1], rot[i3+2]);
                dummy.scale.setScalar(group.scale);
                dummy.updateMatrix();
                mesh.setMatrixAt(i - structure.start, dummy.matrix);

                // Dynamic colors for depth/LIDAR modes
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

    // Update telemetry
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

        const physicsStats = physicsEngineRef.current.getStatistics();

        telemetryRef.current = {
            fps: 1 / dt,
            particleCount: activeParticles,
            systemEnergy: sysEnergy,
            avgVelocity: avgVel,
            maxVelocity: maxVel,
            stabilityScore: stabilityScore,
            simTime: time,
            isWarmup: false, // NO MORE WARMUP HACK!
            activeCollisions: physicsStats?.activeCollisions || 0,
            physicsSteps: physicsStats?.frameCount || 0
        };
    }
  });

  return (
    <group>
      {groupStructure.map((structure) => {
          const group = structure.group;
          return (
              <AssetRenderer
                 key={group.id}
                 group={group}
                 meshRef={(el: any) => meshRefs.current[structure.index] = el}
                 viewMode={viewMode}
              />
          );
      })}

      {/* VR Hand Rendering */}
      {params.vrHands && params.vrHands.length > 0 && (
        <VRHandRenderer hands={params.vrHands} graspedObjects={graspedObjects} />
      )}
    </group>
  );
});

SimulationLayerV2.displayName = 'SimulationLayerV2';
export default SimulationLayerV2;
