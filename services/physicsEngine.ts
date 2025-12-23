/**
 * RAPIER PHYSICS ENGINE WRAPPER
 *
 * Replaces the naive Euler integration with a proper rigid body physics engine.
 * Provides scientific accuracy for ML training data generation.
 */

import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { PhysicsParams, AssetGroup, ShapeType, SpawnMode, MovementBehavior, JointConfig, JointType, ObjectState, ObjectStateData, VRHand, Scene } from '../types';
import { VRHandPhysics } from './handPhysics';
import { SceneGraph } from './sceneGraph';

export interface RigidBodyData {
  handle: number;
  groupIndex: number;
  localIndex: number;
  globalIndex: number;  // Global buffer index
  groupId: string;
  shape: ShapeType;
  mass: number;
}

export class PhysicsEngine {
  private world: RAPIER.World | null = null;
  private bodies: Map<number, RigidBodyData> = new Map();
  private accumulator: number = 0;
  private readonly fixedTimeStep: number = 1 / 120; // 120Hz physics
  private frameCount: number = 0;
  private disposed: boolean = false;
  private isUpdating: boolean = false;

  // Collision tracking for ML annotations
  private collisionPairs: Set<string> = new Set();

  // VR Joint/Constraint System
  private joints: Map<string, RAPIER.ImpulseJoint> = new Map();
  private jointConfigs: Map<string, JointConfig> = new Map();

  // VR State Tracking
  private objectStates: Map<string, ObjectStateData> = new Map();

  // VR Hand Physics
  private handPhysics: VRHandPhysics | null = null;

  async initialize() {
    await RAPIER.init();
    const gravity = new RAPIER.Vector3(0, -9.81, 0);
    this.world = new RAPIER.World(gravity);

    // Configure world properties
    this.world.integrationParameters.dt = this.fixedTimeStep;
    this.world.integrationParameters.numSolverIterations = 8; // Higher accuracy
    this.world.integrationParameters.numInternalPgsIterations = 1;

    // Initialize VR hand physics
    this.handPhysics = new VRHandPhysics(this.world);
  }

  /**
   * Normalize PhysicsParams to support hybrid scene architecture
   * Converts Scene objects to AssetGroups for backward compatibility
   */
  static normalizePhysicsParams(params: PhysicsParams): PhysicsParams {
    // If scene is provided, convert it to assetGroups
    if (params.scene && params.scene.objects.length > 0) {
      console.log('[PhysicsEngine] Using Scene architecture - converting to physics format');
      const convertedGroups = SceneGraph.sceneToLegacyFormat(params.scene);

      return {
        ...params,
        assetGroups: convertedGroups,
        // Keep scene reference for metadata
        scene: params.scene
      };
    }

    // No scene provided, use assetGroups as-is
    return params;
  }

  /**
   * Create rigid bodies for all asset groups
   */
  createBodies(
    params: PhysicsParams,
    groupStructure: Array<{ index: number; id: string; start: number; end: number }>,
    positions: Float32Array,
    velocities: Float32Array,
    rotations: Float32Array
  ): void {
    if (!this.world) throw new Error('Physics engine not initialized');
    if (this.disposed) throw new Error('Physics engine already disposed');
    if (this.isUpdating) {
      console.warn('[PhysicsEngine] Cannot create bodies during physics update');
      return;
    }

    // Handle empty configuration gracefully
    if (groupStructure.length === 0 || params.assetGroups.length === 0) {
      console.log('[PhysicsEngine] Empty configuration detected - creating ground plane only');

      // Clear existing state
      this.bodies.clear();

      // Clean up existing bodies/colliders
      try {
        let cleanupAttempts = 0;
        const maxCleanupAttempts = 1000;
        while (this.world!.bodies.len() > 0 && cleanupAttempts < maxCleanupAttempts) {
          const body = this.world!.bodies.get(0);
          if (body) {
            this.world!.removeRigidBody(body);
          } else {
            break;
          }
          cleanupAttempts++;
        }

        cleanupAttempts = 0;
        while (this.world!.colliders.len() > 0 && cleanupAttempts < maxCleanupAttempts) {
          const collider = this.world!.colliders.get(0);
          if (collider) {
            try {
              this.world!.removeCollider(collider, false);
            } catch (e) {
              break;
            }
          } else {
            break;
          }
          cleanupAttempts++;
        }
      } catch (cleanupError) {
        console.warn('[PhysicsEngine] Cleanup warning (expected on first run):', cleanupError);
      }

      // Update gravity
      this.world!.gravity = new RAPIER.Vector3(params.gravity.x, params.gravity.y, params.gravity.z);

      // Create ground plane
      const groundColliderDesc = RAPIER.ColliderDesc.cuboid(5, 0.05, 5)
        .setTranslation(0, -1.5, 0)
        .setFriction(0.7)
        .setRestitution(0.3);
      this.world!.createCollider(groundColliderDesc);

      this.frameCount = 0;
      console.log('[PhysicsEngine] Ground plane ready - waiting for objects');
      return;
    }

    // Validate input parameters first to prevent WASM corruption
    const validateParams = () => {
      for (let i = 0; i < positions.length; i++) {
        if (!isFinite(positions[i]) || isNaN(positions[i])) {
          throw new Error(`Invalid position at index ${i}: ${positions[i]}`);
        }
        if (!isFinite(velocities[i]) || isNaN(velocities[i])) {
          throw new Error(`Invalid velocity at index ${i}: ${velocities[i]}`);
        }
        if (!isFinite(rotations[i]) || isNaN(rotations[i])) {
          throw new Error(`Invalid rotation at index ${i}: ${rotations[i]}`);
        }
      }

      params.assetGroups.forEach((group, idx) => {
        if (!isFinite(group.scale) || isNaN(group.scale) || group.scale <= 0 || group.scale > 1000) {
          throw new Error(`Invalid scale for group ${idx} (${group.id}): ${group.scale}`);
        }

        // Mass validation: STATIC objects can have mass=0 (mass is ignored for fixed bodies)
        // DYNAMIC and KINEMATIC objects MUST have mass > 0
        if (!isFinite(group.mass) || isNaN(group.mass) || group.mass < 0 || group.mass > 10000) {
          throw new Error(`Invalid mass for group ${idx} (${group.id}): ${group.mass}`);
        }
        if (group.rigidBodyType !== RigidBodyType.STATIC && group.mass === 0) {
          throw new Error(`Invalid mass for group ${idx} (${group.id}): ${group.rigidBodyType} bodies require mass > 0, got ${group.mass}`);
        }
        if (!isFinite(group.restitution) || isNaN(group.restitution)) {
          throw new Error(`Invalid restitution for group ${idx} (${group.id}): ${group.restitution}`);
        }
        if (!isFinite(group.friction) || isNaN(group.friction)) {
          throw new Error(`Invalid friction for group ${idx} (${group.id}): ${group.friction}`);
        }
      });
    };

    // Wrap entire body creation in error recovery function
    const attemptBodyCreation = () => {
      // Validate parameters before touching WASM
      validateParams();

      // Clear existing state
      this.bodies.clear();

      // CRITICAL: Instead of cleaning up, just recreate the entire world
      // Rapier WASM has complex Rust borrowing rules that cause crashes during cleanup
      // Safest approach: abandon old world, create fresh one
      console.log('[PhysicsEngine] Recreating world for new scene (avoiding WASM cleanup issues)');

      // Don't free old world - just let GC handle it
      this.world = null;

      // Create completely fresh world
      const gravity = new RAPIER.Vector3(params.gravity.x, params.gravity.y, params.gravity.z);
      this.world = new RAPIER.World(gravity);
      this.world.integrationParameters.dt = this.fixedTimeStep;
      this.world.integrationParameters.numSolverIterations = 8; // Fixed typo
      this.world.integrationParameters.numInternalPgsIterations = 1;

      // Reinitialize hand physics with new world
      if (this.handPhysics) {
        this.handPhysics = new VRHandPhysics(this.world);
      }

      console.log('[PhysicsEngine] Fresh world created successfully');

      // Update gravity (validate first)
      if (!isFinite(params.gravity.x) || !isFinite(params.gravity.y) || !isFinite(params.gravity.z)) {
        throw new Error(`Invalid gravity vector: ${JSON.stringify(params.gravity)}`);
      }
      this.world!.gravity = new RAPIER.Vector3(params.gravity.x, params.gravity.y, params.gravity.z);

      // Create ground plane (10x10 units, positioned below scene)
      const groundColliderDesc = RAPIER.ColliderDesc.cuboid(5, 0.05, 5)
        .setTranslation(0, -1.5, 0)
        .setFriction(0.7)
        .setRestitution(0.3);
      this.world!.createCollider(groundColliderDesc);

      // Two-pass approach to avoid Rapier borrow conflicts
      // Pass 1: Create all rigid bodies
      const bodyHandles: Array<{ handle: number; group: AssetGroup; structure: any; i: number }> = [];

      groupStructure.forEach((structure) => {
        const group = params.assetGroups[structure.index];

        for (let i = structure.start; i < structure.end; i++) {
          const i3 = i * 3;

          // Determine body type - use individual rigidBodyType if specified, otherwise fall back to global movementBehavior
          let bodyDesc: RAPIER.RigidBodyDesc;
          if (group.rigidBodyType === 'KINEMATIC') {
            bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
            console.log(`[PhysicsEngine] Creating KINEMATIC body for '${group.id}'`);
          } else if (group.rigidBodyType === 'STATIC') {
            bodyDesc = RAPIER.RigidBodyDesc.fixed();
            console.log(`[PhysicsEngine] Creating STATIC body for '${group.id}'`);
          } else if (group.rigidBodyType === 'DYNAMIC') {
            bodyDesc = RAPIER.RigidBodyDesc.dynamic();
            console.log(`[PhysicsEngine] Creating DYNAMIC body for '${group.id}'`);
          } else {
            // Fall back to global movement behavior if rigidBodyType not specified
            const bodyType = this.getBodyType(params.movementBehavior);
            bodyDesc = bodyType === 'dynamic'
              ? RAPIER.RigidBodyDesc.dynamic()
              : RAPIER.RigidBodyDesc.kinematicPositionBased();
            console.log(`[PhysicsEngine] Creating ${bodyType.toUpperCase()} body for '${group.id}' (fallback from movementBehavior)`);
          }

          bodyDesc.setTranslation(positions[i3], positions[i3 + 1], positions[i3 + 2]);
          bodyDesc.setRotation({
            x: 0,
            y: 0,
            z: 0,
            w: 1
          });

          // Only set velocity and damping for dynamic bodies
          if (group.rigidBodyType === 'DYNAMIC' || (!group.rigidBodyType && this.getBodyType(params.movementBehavior) === 'dynamic')) {
            bodyDesc.setLinvel(velocities[i3], velocities[i3 + 1], velocities[i3 + 2]);
            bodyDesc.setLinearDamping(group.drag * 2.0);
            bodyDesc.setAngularDamping(group.drag * 3.0);
          }

          const body = this.world!.createRigidBody(bodyDesc);
          bodyHandles.push({ handle: body.handle, group, structure, i });

          // Store body data
          this.bodies.set(body.handle, {
            handle: body.handle,
            groupIndex: structure.index,
            localIndex: i - structure.start,
            globalIndex: i,
            groupId: group.id,
            shape: group.shape,
            mass: group.mass
          });
        }
      });

      // Pass 2: Create all colliders
      for (const { handle, group } of bodyHandles) {
        const body = this.world!.getRigidBody(handle);
        if (!body) continue;

        const colliderDesc = this.createColliderDesc(group);
        if (colliderDesc) {
          colliderDesc.setMass(group.mass);
          colliderDesc.setRestitution(Math.min(group.restitution, 1.0));
          colliderDesc.setFriction(group.friction);
          this.world!.createCollider(colliderDesc, body);
        }
      }

      this.frameCount = 0;
    };

    // Try body creation with automatic world recovery on WASM errors
    try {
      attemptBodyCreation();
    } catch (error) {
      console.error('[PhysicsEngine] Body creation failed (WASM corruption detected)');
      console.error('[PhysicsEngine] Error details:', error);
      console.log('[PhysicsEngine] Attempting world recovery...');

      // World is corrupted - DO NOT try to free it (causes more WASM errors)
      // Just abandon the corrupted reference and let JS garbage collection handle it
      console.warn('[PhysicsEngine] Abandoning corrupted world (not freeing - WASM unsafe)');
      this.world = null; // Release reference, let GC clean up

      // Create fresh world
      const gravity = new RAPIER.Vector3(params.gravity.x, params.gravity.y, params.gravity.z);
      this.world = new RAPIER.World(gravity);
      this.world.integrationParameters.dt = this.fixedTimeStep;
      this.world.integrationParameters.numSolverIterations = 8; // Fixed typo
      this.world.integrationParameters.numInternalPgsIterations = 1;

      // Reinitialize hand physics with new world
      if (this.handPhysics) {
        this.handPhysics = new VRHandPhysics(this.world);
      }

      // Retry body creation with fresh world
      try {
        attemptBodyCreation();
        console.log('[PhysicsEngine] World recovery successful - simulation restored');
      } catch (retryError) {
        console.error('[PhysicsEngine] World recovery failed - fatal error:', retryError);
        throw retryError;
      }
    }
  }

  /**
   * Create joints/constraints for VR interactive objects
   */
  createJoints(params: PhysicsParams): void {
    if (!this.world || !params.joints) return;

    // Clear existing joints
    this.joints.forEach((joint) => {
      this.world!.removeImpulseJoint(joint, true);
    });
    this.joints.clear();
    this.jointConfigs.clear();
    this.objectStates.clear();

    params.joints.forEach((jointConfig) => {
      // Find parent and child bodies
      const parentBody = this.findBodyByGroupId(jointConfig.parentGroupId);
      const childBody = this.findBodyByGroupId(jointConfig.childGroupId);

      if (!parentBody || !childBody) {
        console.warn(`[PhysicsEngine] Joint ${jointConfig.id}: Could not find parent or child body`);
        return;
      }

      // Create joint based on type
      let joint: RAPIER.ImpulseJoint | null = null;

      switch (jointConfig.type) {
        case JointType.REVOLUTE: {
          // Hinge joint for doors, wheels
          const params = RAPIER.JointData.revolute(
            new RAPIER.Vector3(jointConfig.parentAnchor.x, jointConfig.parentAnchor.y, jointConfig.parentAnchor.z),
            new RAPIER.Vector3(jointConfig.childAnchor.x, jointConfig.childAnchor.y, jointConfig.childAnchor.z),
            new RAPIER.Vector3(jointConfig.axis.x, jointConfig.axis.y, jointConfig.axis.z)
          );

          // Set limits if provided
          if (jointConfig.limits) {
            params.limitsEnabled = true;
            params.limits = [jointConfig.limits.min, jointConfig.limits.max];
          }

          joint = this.world!.createImpulseJoint(params, parentBody, childBody, true);

          // Note: Motor configuration requires specific Rapier API calls
          // Can be added in future versions with proper motor setup
          break;
        }

        case JointType.PRISMATIC: {
          // Sliding joint for drawers, sliders
          const params = RAPIER.JointData.prismatic(
            new RAPIER.Vector3(jointConfig.parentAnchor.x, jointConfig.parentAnchor.y, jointConfig.parentAnchor.z),
            new RAPIER.Vector3(jointConfig.childAnchor.x, jointConfig.childAnchor.y, jointConfig.childAnchor.z),
            new RAPIER.Vector3(jointConfig.axis.x, jointConfig.axis.y, jointConfig.axis.z)
          );

          // Set limits if provided
          if (jointConfig.limits) {
            params.limitsEnabled = true;
            params.limits = [jointConfig.limits.min, jointConfig.limits.max];
          }

          joint = this.world!.createImpulseJoint(params, parentBody, childBody, true);

          // Note: Motor configuration requires specific Rapier API calls
          // Can be added in future versions with proper motor setup
          break;
        }

        case JointType.FIXED: {
          // Rigid attachment (handle to door)
          const params = RAPIER.JointData.fixed(
            new RAPIER.Vector3(jointConfig.parentAnchor.x, jointConfig.parentAnchor.y, jointConfig.parentAnchor.z),
            { w: 1, x: 0, y: 0, z: 0 },
            new RAPIER.Vector3(jointConfig.childAnchor.x, jointConfig.childAnchor.y, jointConfig.childAnchor.z),
            { w: 1, x: 0, y: 0, z: 0 }
          );

          joint = this.world!.createImpulseJoint(params, parentBody, childBody, true);
          break;
        }

        case JointType.SPHERICAL: {
          // Ball joint for articulated bodies
          const params = RAPIER.JointData.spherical(
            new RAPIER.Vector3(jointConfig.parentAnchor.x, jointConfig.parentAnchor.y, jointConfig.parentAnchor.z),
            new RAPIER.Vector3(jointConfig.childAnchor.x, jointConfig.childAnchor.y, jointConfig.childAnchor.z)
          );

          joint = this.world!.createImpulseJoint(params, parentBody, childBody, true);
          break;
        }
      }

      if (joint) {
        this.joints.set(jointConfig.id, joint);
        this.jointConfigs.set(jointConfig.id, jointConfig);

        // Initialize object state tracking
        const initialState: ObjectState = jointConfig.type === JointType.REVOLUTE || jointConfig.type === JointType.PRISMATIC
          ? ObjectState.CLOSED
          : ObjectState.FREE;

        this.objectStates.set(jointConfig.childGroupId, {
          objectId: jointConfig.childGroupId,
          groupId: jointConfig.childGroupId,
          state: initialState,
          jointAngle: jointConfig.initialState || 0,
          timeInState: 0,
          lastTransition: performance.now()
        });

        console.log(`[PhysicsEngine] Created ${jointConfig.type} joint: ${jointConfig.id}`);
      }
    });
  }

  /**
   * Find a rigid body by group ID (returns first instance)
   */
  private findBodyByGroupId(groupId: string): RAPIER.RigidBody | null {
    for (const [handle, bodyData] of this.bodies.entries()) {
      if (bodyData.groupId === groupId) {
        return this.world!.getRigidBody(handle);
      }
    }
    return null;
  }

  /**
   * Update joint states and track object states for VR training
   * Note: In current Rapier version, joint angle tracking requires calculating from body positions
   */
  private updateJointStates(time: number): void {
    if (!this.world) return;

    this.jointConfigs.forEach((config, jointId) => {
      const joint = this.joints.get(jointId);
      if (!joint) return;

      // Update object state tracking based on physics simulation
      const stateData = this.objectStates.get(config.childGroupId);
      if (!stateData) return;

      // For now, track basic state transitions based on time in simulation
      // Advanced joint angle tracking can be added when accessing body transforms
      const childBody = this.findBodyByGroupId(config.childGroupId);
      if (childBody) {
        const velocity = childBody.linvel();
        const isMoving = Math.abs(velocity.x) > 0.01 || Math.abs(velocity.y) > 0.01 || Math.abs(velocity.z) > 0.01;

        // Simple state machine: if moving, transitioning; if still, settled
        let newState = stateData.state;
        if (isMoving && stateData.state === ObjectState.CLOSED) {
          newState = ObjectState.OPEN;
        } else if (!isMoving && stateData.state === ObjectState.OPEN) {
          // Check if settled in open or closed position based on position
          // This is simplified - real implementation would calculate joint angle
          newState = ObjectState.OPEN;
        }

        // Track state transitions
        if (newState !== stateData.state) {
          stateData.lastTransition = time;
          stateData.timeInState = 0;
          stateData.state = newState;
        } else {
          stateData.timeInState = time - stateData.lastTransition;
        }
      }
    });
  }

  /**
   * Get all object states (for VR training data export)
   */
  getObjectStates(): Map<string, ObjectStateData> {
    return this.objectStates;
  }

  /**
   * VR HAND PHYSICS METHODS
   */

  /**
   * Create hand bodies for VR hands
   */
  createHandBodies(hands: VRHand[]): void {
    if (!this.handPhysics) return;

    hands.forEach((hand) => {
      this.handPhysics!.createHandBody(hand);
      console.log(`[PhysicsEngine] Created hand body: ${hand.id} (${hand.side})`);
    });
  }

  /**
   * Update hand positions each frame
   */
  updateHandPositions(hands: VRHand[]): void {
    if (!this.handPhysics) return;

    hands.forEach((hand) => {
      this.handPhysics!.updateHandPosition(hand);
    });
  }

  /**
   * Detect collisions between hand and graspable objects
   */
  detectHandObjectCollisions(
    handId: string,
    hand: VRHand,
    params: PhysicsParams,
    positions: Float32Array
  ): string[] {
    if (!this.handPhysics) return [];

    const collisions = this.handPhysics.detectGraspableObjects(
      hand,
      params.assetGroups,
      positions
    );

    return collisions.map((collision) => collision.objectGroupId);
  }

  /**
   * Create grasp constraint between hand and object
   */
  createGraspConstraint(handId: string, hand: VRHand, objectGroupId: string): boolean {
    if (!this.handPhysics) return false;

    const targetBody = this.findBodyByGroupId(objectGroupId);
    if (!targetBody) {
      console.warn(`[PhysicsEngine] Cannot grasp: object ${objectGroupId} not found`);
      return false;
    }

    const success = this.handPhysics.attemptGrasp(hand, objectGroupId, targetBody);

    if (success) {
      // Update object state to GRASPED
      const stateData = this.objectStates.get(objectGroupId) || {
        objectId: objectGroupId,
        groupId: objectGroupId,
        state: ObjectState.FREE,
        timeInState: 0,
        lastTransition: performance.now()
      };

      stateData.state = ObjectState.GRASPED;
      stateData.lastTransition = performance.now();
      stateData.timeInState = 0;
      this.objectStates.set(objectGroupId, stateData);

      console.log(`[PhysicsEngine] Hand ${handId} grasped object ${objectGroupId}`);
    }

    return success;
  }

  /**
   * Release grasp constraint
   */
  releaseGraspConstraint(handId: string, hand: VRHand): boolean {
    if (!this.handPhysics) return false;

    const objectId = this.handPhysics.releaseGrasp(hand);

    if (objectId) {
      // Update object state back to FREE
      const stateData = this.objectStates.get(objectId);
      if (stateData) {
        stateData.state = ObjectState.FREE;
        stateData.lastTransition = performance.now();
        stateData.timeInState = 0;
      }

      console.log(`[PhysicsEngine] Hand ${handId} released object ${objectId}`);
      return true;
    }

    return false;
  }

  /**
   * Check if hand is currently grasping
   */
  isHandGrasping(handId: string): boolean {
    if (!this.handPhysics) return false;
    return this.handPhysics.isHandGrasping(handId);
  }

  /**
   * Get the object ID being grasped by a hand
   */
  getGraspedObjectId(handId: string): string | null {
    if (!this.handPhysics) return null;
    return this.handPhysics.getGraspedObjectId(handId);
  }

  /**
   * Get joint angle by joint ID (approximation based on child body position)
   * Note: Accurate joint angle tracking requires additional calculations
   */
  getJointAngle(jointId: string): number | null {
    const config = this.jointConfigs.get(jointId);
    if (!config) return null;

    const childBody = this.findBodyByGroupId(config.childGroupId);
    const parentBody = this.findBodyByGroupId(config.parentGroupId);
    if (!childBody || !parentBody) return null;

    // Simplified: return distance/angle approximation
    // Real implementation would calculate based on joint type and axes
    const childPos = childBody.translation();
    const parentPos = parentBody.translation();

    if (config.type === JointType.PRISMATIC) {
      // Distance along axis for prismatic joints
      const dx = childPos.x - parentPos.x;
      const dy = childPos.y - parentPos.y;
      const dz = childPos.z - parentPos.z;
      return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }

    // For revolute joints, would need to calculate angle from rotation
    return 0;
  }

  /**
   * Create collider descriptor based on shape type
   */
  private createColliderDesc(group: AssetGroup): RAPIER.ColliderDesc | null {
    const scale = group.scale;
    const halfScale = scale / 2;

    switch (group.shape) {
      case ShapeType.SPHERE:
        return RAPIER.ColliderDesc.ball(halfScale);

      case ShapeType.CUBE:
        return RAPIER.ColliderDesc.cuboid(halfScale, halfScale, halfScale);

      case ShapeType.CYLINDER:
        return RAPIER.ColliderDesc.cylinder(halfScale, halfScale * 0.5);

      case ShapeType.CONE:
        return RAPIER.ColliderDesc.cone(halfScale, halfScale * 0.5);

      case ShapeType.CAPSULE:
        return RAPIER.ColliderDesc.capsule(halfScale, halfScale * 0.3);

      case ShapeType.PYRAMID:
        // Pyramid approximated as cone
        return RAPIER.ColliderDesc.cone(halfScale, halfScale * 0.5);

      case ShapeType.ICOSAHEDRON:
        // Icosahedron approximated as ball (90% accurate, minimal performance cost)
        return RAPIER.ColliderDesc.ball(halfScale * 0.9);

      case ShapeType.TORUS:
        // Torus approximated as cylinder (hollow not supported by Rapier)
        return RAPIER.ColliderDesc.cylinder(halfScale * 0.4, halfScale);

      case ShapeType.PLATE:
        // Plate as very thin cuboid (5% height)
        return RAPIER.ColliderDesc.cuboid(halfScale, halfScale * 0.05, halfScale);

      default:
        return RAPIER.ColliderDesc.ball(halfScale);
    }
  }

  /**
   * Determine body type from movement behavior
   */
  private getBodyType(behavior: MovementBehavior): 'dynamic' | 'kinematic' {
    switch (behavior) {
      case MovementBehavior.ORBITAL:
      case MovementBehavior.SWARM_FLOCK:
      case MovementBehavior.SINUSOIDAL_WAVE:
      case MovementBehavior.LINEAR_FLOW:
        return 'kinematic'; // Scripted motion

      case MovementBehavior.PHYSICS_GRAVITY:
      case MovementBehavior.RADIAL_EXPLOSION:
      default:
        return 'dynamic'; // Physics-driven
    }
  }

  /**
   * Step physics simulation with fixed timestep and interpolation
   */
  step(
    deltaTime: number,
    params: PhysicsParams,
    positions: Float32Array,
    velocities: Float32Array,
    rotations: Float32Array,
    initialPositions: Float32Array,
    meta: Float32Array,
    elapsedTime: number
  ): void {
    if (!this.world) return;

    const clampedDelta = Math.min(deltaTime, 0.1); // Prevent spiral of death
    this.accumulator += clampedDelta;

    // Fixed timestep loop
    let stepsThisFrame = 0;
    const maxStepsPerFrame = 5;

    this.isUpdating = true;
    try {
      while (this.accumulator >= this.fixedTimeStep && stepsThisFrame < maxStepsPerFrame) {
        // Update gravity
        this.world.gravity = new RAPIER.Vector3(
          params.gravity.x,
          params.gravity.y,
          params.gravity.z
        );

        // Apply wind forces
        if (params.wind.x !== 0 || params.wind.y !== 0 || params.wind.z !== 0) {
          this.bodies.forEach((bodyData) => {
            const body = this.world!.getRigidBody(bodyData.handle);
            if (body && body.bodyType() === RAPIER.RigidBodyType.Dynamic) {
              body.addForce(new RAPIER.Vector3(params.wind.x, params.wind.y, params.wind.z), true);
            }
          });
        }

        // Update kinematic bodies (scripted motion)
        // CRITICAL: Only use procedural movements if no Scene behaviors exist
        // Scene behaviors take precedence over global movement patterns
        const hasSceneBehaviors = params.scene?.behaviors && params.scene.behaviors.length > 0;
        if (params.movementBehavior !== MovementBehavior.PHYSICS_GRAVITY && !hasSceneBehaviors) {
          this.updateKinematicBodies(params, initialPositions, meta, elapsedTime);
        } else if (hasSceneBehaviors && this.frameCount % 120 === 0) {
          console.log(`[PhysicsEngine] Skipping updateKinematicBodies - using Scene behaviors instead`);
        }

        // Step the simulation with WASM error protection
        try {
          this.world.step();
          this.frameCount++;
        } catch (error) {
          console.error('[PhysicsEngine] Simulation step failed (WASM error):', error);
          console.log('[PhysicsEngine] Stopping simulation. Reset/regenerate to recover.');
          // Break out of simulation loop - world is corrupted
          // Next reset will recreate world via createBodies error recovery
          break;
        }

        // Update joint states for VR training
        this.updateJointStates(elapsedTime);

        this.accumulator -= this.fixedTimeStep;
        stepsThisFrame++;
      }

      // Read back state from physics engine with error protection
      try {
        this.syncStateFromPhysics(positions, velocities, rotations);
      } catch (error) {
        console.error('[PhysicsEngine] State sync failed (WASM error):', error);
        // Continue - positions may be stale but simulation can recover
      }

      // Track collisions for ML annotations
      try {
        this.updateCollisionTracking();
      } catch (error) {
        console.error('[PhysicsEngine] Collision tracking failed (WASM error):', error);
        // Continue - collision data may be stale but simulation can recover
      }
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Update kinematic bodies with scripted motion
   */
  private updateKinematicBodies(
    params: PhysicsParams,
    initialPositions: Float32Array,
    meta: Float32Array,
    time: number
  ): void {
    if (!this.world) return;

    this.bodies.forEach((bodyData, handle) => {
      const body = this.world!.getRigidBody(handle);
      if (!body || body.bodyType() !== RAPIER.RigidBodyType.KinematicPositionBased) return;

      const group = params.assetGroups[bodyData.groupIndex];
      const globalIndex = bodyData.globalIndex;
      const i3 = globalIndex * 3;

      let x = initialPositions[i3];
      let y = initialPositions[i3 + 1];
      let z = initialPositions[i3 + 2];
      const phase = meta[globalIndex];

      // Apply movement behavior
      switch (params.movementBehavior) {
        case MovementBehavior.ORBITAL:
          const r = Math.sqrt(x * x + z * z) + 2;
          const speed = 0.5 / (r * 0.5);
          const theta = time * speed + phase * 10;
          x = r * Math.cos(theta);
          z = r * Math.sin(theta);
          y = y + Math.sin(time * 2 + phase * 5) * 0.5;
          break;

        case MovementBehavior.SINUSOIDAL_WAVE:
          const zScroll = (initialPositions[i3 + 2] + time * 5) % 40 - 20;
          z = zScroll;
          y = initialPositions[i3 + 1] + Math.sin(x * 0.3 + zScroll * 0.2 + time * 2) * 2;
          break;

        case MovementBehavior.LINEAR_FLOW:
          x = (initialPositions[i3] + time * 10) % 40 - 20;
          break;

        case MovementBehavior.SWARM_FLOCK:
          // Swarm behavior handled by forces in dynamic mode
          break;
      }

      body.setNextKinematicTranslation(new RAPIER.Vector3(x, y, z));
    });
  }

  /**
   * Sync state from physics engine back to buffers
   */
  private syncStateFromPhysics(
    positions: Float32Array,
    velocities: Float32Array,
    rotations: Float32Array
  ): void {
    if (!this.world) return;

    this.bodies.forEach((bodyData, handle) => {
      const body = this.world!.getRigidBody(handle);
      if (!body) return;

      // Calculate global buffer index
      const globalIndex = this.calculateGlobalIndex(bodyData);
      const i3 = globalIndex * 3;

      // Read position
      const translation = body.translation();
      positions[i3] = translation.x;
      positions[i3 + 1] = translation.y;
      positions[i3 + 2] = translation.z;

      // Read velocity
      const linvel = body.linvel();
      velocities[i3] = linvel.x;
      velocities[i3 + 1] = linvel.y;
      velocities[i3 + 2] = linvel.z;

      // Read rotation
      const rotation = body.rotation();
      const euler = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w)
      );
      rotations[i3] = euler.x;
      rotations[i3 + 1] = euler.y;
      rotations[i3 + 2] = euler.z;
    });
  }

  /**
   * Update kinematic object transforms from animation system
   * Call this BEFORE step() to apply animation targets
   *
   * IMPORTANT: This sets the next kinematic translation for behavior-driven objects.
   * The step() function will skip procedural movements (updateKinematicBodies) when
   * Scene behaviors are active to prevent conflicts.
   */
  updateKinematicFromAnimation(
    objectId: string,
    transform: { position?: { x: number; y: number; z: number }; rotation?: { x: number; y: number; z: number } }
  ): void {
    if (!this.world) return;

    // Find rigid body for this object ID
    // Object IDs map to groupIds in our system
    let targetBody: RAPIER.RigidBody | null = null;
    let targetHandle: number | null = null;

    this.bodies.forEach((bodyData, handle) => {
      if (bodyData.groupId === objectId) {
        targetBody = this.world!.getRigidBody(handle);
        targetHandle = handle;
      }
    });

    if (!targetBody || targetHandle === null) {
      // Debug: Log what we're looking for vs what exists
      if (Math.random() < 0.01) { // Log occasionally to avoid spam
        const existingIds = Array.from(this.bodies.values()).map(b => b.groupId);
        console.warn(`[PhysicsEngine] Animation target '${objectId}' not found. Existing bodies:`, existingIds);
      }
      return;
    }

    // TypeScript needs help with control flow after forEach
    const body = targetBody as RAPIER.RigidBody;

    // Only update kinematic bodies
    if (!body.isKinematic()) {
      if (Math.random() < 0.01) {
        console.warn(`[PhysicsEngine] Body '${objectId}' is not kinematic, cannot animate`);
      }
      return;
    }

    // Update position if provided
    if (transform.position) {
      const newPos = new RAPIER.Vector3(
        transform.position.x,
        transform.position.y,
        transform.position.z
      );
      body.setNextKinematicTranslation(newPos);

      // Debug log successful update
      if (Math.random() < 0.02) {
        console.log(`[PhysicsEngine] ✅ Updated kinematic '${objectId}' position to:`, transform.position);
      }
    }

    // Update rotation if provided
    if (transform.rotation) {
      const quat = new THREE.Quaternion();
      const euler = new THREE.Euler(
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z
      );
      quat.setFromEuler(euler);

      const rapierQuat = new RAPIER.Quaternion(quat.x, quat.y, quat.z, quat.w);
      body.setNextKinematicRotation(rapierQuat);
    }
  }

  /**
   * Calculate global buffer index from body data
   */
  private calculateGlobalIndex(bodyData: RigidBodyData): number {
    // Return stored global index (calculated at creation time)
    return bodyData.globalIndex;
  }

  /**
   * Track collision pairs for ML annotations
   */
  private updateCollisionTracking(): void {
    if (!this.world) return;

    this.collisionPairs.clear();

    // Iterate through all colliders and check for contacts
    // Rapier 0.19.x API: use world.contactPairs() or contactsWith()
    const numColliders = this.world.colliders.len();

    for (let i = 0; i < numColliders; i++) {
      const collider = this.world.colliders.get(i);
      if (!collider) continue;

      // Check contacts with this collider
      this.world.contactPairsWith(collider, (otherCollider) => {
        if (!otherCollider) return;

        // Get rigid body handles
        const handle1 = collider.parent()?.handle;
        const handle2 = otherCollider.parent()?.handle;

        if (handle1 !== undefined && handle2 !== undefined) {
          const body1 = this.bodies.get(handle1);
          const body2 = this.bodies.get(handle2);

          if (body1 && body2) {
            // Create unique collision pair ID (sorted to avoid duplicates)
            const pairId = [body1.groupId, body2.groupId].sort().join('_');
            this.collisionPairs.add(pairId);
          }
        }
      });
    }
  }

  /**
   * Get collision count for telemetry
   */
  getCollisionCount(): number {
    return this.collisionPairs.size;
  }

  /**
   * Get physics statistics
   */
  getStatistics() {
    if (!this.world) return null;

    return {
      bodyCount: this.world.bodies.len(),
      colliderCount: this.world.colliders.len(),
      activeCollisions: this.collisionPairs.size,
      frameCount: this.frameCount
    };
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.disposed) {
      return; // Already disposed, prevent double-free
    }

    this.disposed = true;

    if (this.world) {
      try {
        // Collect handles first to avoid iterator invalidation
        const bodyHandles: number[] = [];
        for (let i = 0; i < this.world.bodies.len(); i++) {
          const body = this.world.bodies.get(i);
          if (body) bodyHandles.push(body.handle);
        }

        const colliderHandles: number[] = [];
        for (let i = 0; i < this.world.colliders.len(); i++) {
          const collider = this.world.colliders.get(i);
          if (collider) colliderHandles.push(collider.handle);
        }

        // Remove all bodies
        for (const handle of bodyHandles) {
          const body = this.world.getRigidBody(handle);
          if (body) this.world.removeRigidBody(body);
        }

        // Remove all colliders
        for (const handle of colliderHandles) {
          const collider = this.world.getCollider(handle);
          if (collider) this.world.removeCollider(collider, true);
        }

        // Now safe to free the world
        this.world.free();
      } catch (error) {
        console.warn('[PhysicsEngine] Error during disposal:', error);
      } finally {
        this.world = null;
      }
    }
    this.bodies.clear();
    this.collisionPairs.clear();
    this.joints.clear();
    this.jointConfigs.clear();
    this.objectStates.clear();
  }
}
