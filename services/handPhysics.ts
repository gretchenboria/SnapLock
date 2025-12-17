import RAPIER from '@dimforge/rapier3d-compat';
import { VRHand, AssetGroup, Vector3Data, ObjectState } from '../types';

export interface HandCollisionInfo {
  handId: string;
  objectGroupId: string;
  distance: number;
  closestGraspPoint?: Vector3Data;
}

export class VRHandPhysics {
  private world: RAPIER.World | null = null;
  private handBodies: Map<string, RAPIER.RigidBody> = new Map();
  private graspConstraints: Map<string, RAPIER.ImpulseJoint> = new Map();
  private graspedObjects: Map<string, string> = new Map(); // handId -> objectGroupId

  // Hand geometry constants
  private readonly HAND_CAPSULE_LENGTH = 0.2; // 20cm
  private readonly HAND_CAPSULE_RADIUS = 0.08; // 8cm
  private readonly GRASP_DISTANCE_THRESHOLD = 0.15; // 15cm
  private readonly GRASP_VELOCITY_THRESHOLD = 0.5; // 0.5 m/s

  constructor(world: RAPIER.World) {
    this.world = world;
  }

  createHandBody(hand: VRHand): RAPIER.RigidBody | null {
    if (!this.world) return null;

    // Create kinematic rigid body (position-controlled, not affected by forces)
    const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(hand.position.x, hand.position.y, hand.position.z);

    const body = this.world.createRigidBody(rigidBodyDesc);

    // Create capsule collider for hand
    const colliderDesc = RAPIER.ColliderDesc.capsule(
      this.HAND_CAPSULE_LENGTH / 2,
      this.HAND_CAPSULE_RADIUS
    )
      .setSensor(true) // Sensor collider for detection only (no physical response)
      .setCollisionGroups(0x00020002); // Group 2, interacts with group 2

    this.world.createCollider(colliderDesc, body);

    this.handBodies.set(hand.id, body);

    return body;
  }

  updateHandPosition(hand: VRHand): void {
    const body = this.handBodies.get(hand.id);
    if (!body) return;

    // Update kinematic body position
    body.setNextKinematicTranslation(
      new RAPIER.Vector3(hand.position.x, hand.position.y, hand.position.z)
    );

    // Update rotation (convert euler angles to quaternion)
    const euler = hand.rotation;
    const q = this.eulerToQuaternion(euler.x, euler.y, euler.z);
    body.setNextKinematicRotation(q);
  }

  detectGraspableObjects(
    hand: VRHand,
    allGroups: AssetGroup[],
    particlePositions: Float32Array
  ): HandCollisionInfo[] {
    const handBody = this.handBodies.get(hand.id);
    if (!handBody) return [];

    const collisions: HandCollisionInfo[] = [];
    const handPos = hand.position;

    // Check each asset group for graspable objects
    allGroups.forEach((group, groupIndex) => {
      if (!group.affordances?.graspable) return;

      // Check distance to objects in this group
      // For simplicity, check distance to group center
      // In production, would check individual particle positions
      let minDistance = Infinity;
      let closestGraspPoint: Vector3Data | undefined;

      // If group has defined grasp points, check those
      if (group.affordances.graspPoints && group.affordances.graspPoints.length > 0) {
        group.affordances.graspPoints.forEach((graspPoint) => {
          const distance = this.distance3D(handPos, graspPoint);
          if (distance < minDistance) {
            minDistance = distance;
            closestGraspPoint = graspPoint;
          }
        });
      } else {
        // Otherwise, check distance to first particle of group
        // This is a simplified approach
        minDistance = 1.0; // Default to 1m if no grasp points defined
      }

      if (minDistance < this.GRASP_DISTANCE_THRESHOLD) {
        collisions.push({
          handId: hand.id,
          objectGroupId: group.id,
          distance: minDistance,
          closestGraspPoint
        });
      }
    });

    // Sort by distance (closest first)
    collisions.sort((a, b) => a.distance - b.distance);

    return collisions;
  }

  attemptGrasp(
    hand: VRHand,
    targetGroupId: string,
    targetBody: RAPIER.RigidBody
  ): boolean {
    if (!this.world) return false;

    const handBody = this.handBodies.get(hand.id);
    if (!handBody) return false;

    // Check if hand already grasping
    if (this.graspConstraints.has(hand.id)) {
      return false;
    }

    // Create FIXED joint between hand and object
    const jointParams = RAPIER.JointData.fixed(
      new RAPIER.Vector3(0, 0, 0), // Hand anchor at center
      { w: 1, x: 0, y: 0, z: 0 },  // Hand anchor rotation
      new RAPIER.Vector3(0, 0, 0), // Object anchor at center
      { w: 1, x: 0, y: 0, z: 0 }   // Object anchor rotation
    );

    const joint = this.world.createImpulseJoint(jointParams, handBody, targetBody, true);

    this.graspConstraints.set(hand.id, joint);
    this.graspedObjects.set(hand.id, targetGroupId);

    return true;
  }

  releaseGrasp(hand: VRHand): string | null {
    if (!this.world) return null;

    const joint = this.graspConstraints.get(hand.id);
    const objectId = this.graspedObjects.get(hand.id);

    if (joint && objectId) {
      this.world.removeImpulseJoint(joint, true);
      this.graspConstraints.delete(hand.id);
      this.graspedObjects.delete(hand.id);
      return objectId;
    }

    return null;
  }

  getGraspConstraint(handId: string): RAPIER.ImpulseJoint | null {
    return this.graspConstraints.get(handId) || null;
  }

  getGraspedObjectId(handId: string): string | null {
    return this.graspedObjects.get(handId) || null;
  }

  isHandGrasping(handId: string): boolean {
    return this.graspConstraints.has(handId);
  }

  removeHandBody(handId: string): void {
    if (!this.world) return;

    // Release any active grasp
    const body = this.handBodies.get(handId);
    if (body) {
      this.world.removeRigidBody(body);
      this.handBodies.delete(handId);
    }

    // Clean up grasp constraint if exists
    const joint = this.graspConstraints.get(handId);
    if (joint) {
      this.world.removeImpulseJoint(joint, true);
      this.graspConstraints.delete(handId);
    }

    this.graspedObjects.delete(handId);
  }

  // Utility methods

  private distance3D(a: Vector3Data, b: Vector3Data): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private eulerToQuaternion(x: number, y: number, z: number): { w: number; x: number; y: number; z: number } {
    // Convert Euler angles (in radians) to quaternion
    const c1 = Math.cos(x / 2);
    const c2 = Math.cos(y / 2);
    const c3 = Math.cos(z / 2);
    const s1 = Math.sin(x / 2);
    const s2 = Math.sin(y / 2);
    const s3 = Math.sin(z / 2);

    return {
      w: c1 * c2 * c3 - s1 * s2 * s3,
      x: s1 * c2 * c3 + c1 * s2 * s3,
      y: c1 * s2 * c3 - s1 * c2 * s3,
      z: c1 * c2 * s3 + s1 * s2 * c3
    };
  }
}
