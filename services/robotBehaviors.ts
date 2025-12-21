/**
 * Pre-defined Robot Behavior Sequences
 *
 * Common robotics actions for training data generation
 */

import { BehaviorSequence, AnimationClip, ActionType, RigidBodyType } from '../types';

/**
 * Surgical Robot: Pick up scalpel sequence
 */
export function createPickupScalpelBehavior(robotId: string, scalpelId: string): BehaviorSequence {
  return {
    id: 'surgical_pickup_scalpel',
    name: 'Pick Up Scalpel',
    description: 'Surgical robot moves to scalpel, grasps it, and lifts',
    targetObjectId: robotId,
    loop: false,
    actions: [
      {
        type: ActionType.MOVE_TO,
        duration: 2.0,
        position: { x: 0.2, y: -0.2, z: 0.1 }, // Move above scalpel
        params: { smooth: true }
      },
      {
        type: ActionType.MOVE_TO,
        duration: 1.0,
        position: { x: 0.2, y: -0.4, z: 0.1 }, // Lower to scalpel
      },
      {
        type: ActionType.GRASP,
        duration: 0.5,
        target: scalpelId,
        params: { force: 'gentle' }
      },
      {
        type: ActionType.MOVE_TO,
        duration: 1.5,
        position: { x: 0, y: 0.5, z: 0 }, // Lift scalpel
      },
      {
        type: ActionType.WAIT,
        duration: 0.5
      }
    ]
  };
}

/**
 * Surgical Robot: Suturing motion
 */
export function createSuturingBehavior(robotId: string): BehaviorSequence {
  return {
    id: 'surgical_suturing',
    name: 'Suturing Motion',
    description: 'Repetitive stitching motion for surgical training',
    targetObjectId: robotId,
    loop: true, // Repeat for training data
    actions: [
      {
        type: ActionType.MOVE_TO,
        duration: 1.0,
        position: { x: -0.3, y: 0, z: 0.2 },
        rotation: { x: 0, y: 0, z: 0 }
      },
      {
        type: ActionType.MOVE_TO,
        duration: 0.8,
        position: { x: -0.3, y: -0.3, z: 0.2 }, // Push needle through
      },
      {
        type: ActionType.ROTATE_TO,
        duration: 0.5,
        rotation: { x: 0, y: Math.PI / 4, z: 0 } // Rotate wrist
      },
      {
        type: ActionType.MOVE_TO,
        duration: 0.8,
        position: { x: -0.2, y: -0.2, z: 0.3 }, // Pull through
      },
      {
        type: ActionType.MOVE_TO,
        duration: 1.0,
        position: { x: -0.1, y: 0, z: 0.2 }, // Next stitch position
      },
      {
        type: ActionType.WAIT,
        duration: 0.3
      }
    ]
  };
}

/**
 * Warehouse Robot: Pick and place sequence
 */
export function createPickAndPlaceBehavior(robotId: string, packageId: string): BehaviorSequence {
  return {
    id: 'warehouse_pick_place',
    name: 'Pick and Place Package',
    description: 'Warehouse robot picks package from shelf and places in bin',
    targetObjectId: robotId,
    loop: false,
    actions: [
      {
        type: ActionType.MOVE_TO,
        duration: 2.0,
        position: { x: 0, y: 0.5, z: -0.8 }, // Approach shelf
      },
      {
        type: ActionType.MOVE_TO,
        duration: 1.0,
        position: { x: 0, y: 0.5, z: -1.2 }, // Reach into shelf
      },
      {
        type: ActionType.GRASP,
        duration: 0.5,
        target: packageId
      },
      {
        type: ActionType.MOVE_TO,
        duration: 1.5,
        position: { x: 0, y: 0.5, z: -0.8 }, // Pull out
      },
      {
        type: ActionType.ROTATE_TO,
        duration: 1.0,
        rotation: { x: 0, y: Math.PI / 2, z: 0 } // Turn toward bin
      },
      {
        type: ActionType.FOLLOW_PATH,
        duration: 3.0,
        path: [
          { x: 0, y: 0.5, z: -0.8 },
          { x: 0.5, y: 0.5, z: -0.5 },
          { x: 1.0, y: 0.5, z: 0 },
          { x: 1.5, y: 0.3, z: 0.5 } // Above bin
        ]
      },
      {
        type: ActionType.RELEASE,
        duration: 0.5,
        target: packageId
      },
      {
        type: ActionType.MOVE_TO,
        duration: 2.0,
        position: { x: 0, y: 0.5, z: 0 }, // Return to home
      }
    ]
  };
}

/**
 * Assembly Robot: Part insertion
 */
export function createAssemblyBehavior(robotId: string, partId: string): BehaviorSequence {
  return {
    id: 'assembly_insert_part',
    name: 'Insert Assembly Part',
    description: 'Precisely insert part into assembly fixture',
    targetObjectId: robotId,
    loop: false,
    actions: [
      {
        type: ActionType.MOVE_TO,
        duration: 1.5,
        position: { x: 0.5, y: 0.2, z: 0.3 }, // Approach part
      },
      {
        type: ActionType.GRASP,
        duration: 0.5,
        target: partId,
        params: { force: 'precise' }
      },
      {
        type: ActionType.MOVE_TO,
        duration: 2.0,
        position: { x: 0, y: 0.4, z: 0 }, // Lift and position
      },
      {
        type: ActionType.ROTATE_TO,
        duration: 1.0,
        rotation: { x: 0, y: 0, z: Math.PI / 6 }, // Orient for insertion
      },
      {
        type: ActionType.MOVE_TO,
        duration: 1.5,
        position: { x: 0, y: -0.2, z: 0 }, // Lower into fixture (slow precise movement)
        params: { speed: 'slow' }
      },
      {
        type: ActionType.RELEASE,
        duration: 0.3,
        target: partId
      },
      {
        type: ActionType.MOVE_TO,
        duration: 1.0,
        position: { x: -0.5, y: 0.5, z: 0 }, // Retract
      }
    ]
  };
}

/**
 * Create smooth animation clip for robot arm arc motion
 */
export function createRobotArcAnimation(robotId: string, startPos: { x: number; y: number; z: number }, endPos: { x: number; y: number; z: number }): AnimationClip {
  // Create arc motion (more natural than straight line)
  const midX = (startPos.x + endPos.x) / 2;
  const midY = Math.max(startPos.y, endPos.y) + 0.5; // Lift up during motion
  const midZ = (startPos.z + endPos.z) / 2;

  return {
    id: `arc_${robotId}_${Date.now()}`,
    name: 'Robot Arc Motion',
    duration: 3.0,
    loop: false,
    targetObjectId: robotId,
    interpolation: 'cubic', // Smooth acceleration/deceleration
    keyframes: [
      {
        time: 0,
        position: startPos,
        rotation: { x: 0, y: 0, z: 0 }
      },
      {
        time: 1.5,
        position: { x: midX, y: midY, z: midZ },
        rotation: { x: 0, y: Math.PI / 8, z: 0 } // Slight rotation during motion
      },
      {
        time: 3.0,
        position: endPos,
        rotation: { x: 0, y: Math.PI / 4, z: 0 }
      }
    ]
  };
}

/**
 * Continuous scanning motion (for LIDAR/camera robots)
 */
export function createScanningBehavior(robotId: string): BehaviorSequence {
  return {
    id: 'scanning_sweep',
    name: 'Environment Scanning',
    description: 'Continuous sweeping motion for sensor data collection',
    targetObjectId: robotId,
    loop: true,
    actions: [
      {
        type: ActionType.ROTATE_TO,
        duration: 2.0,
        rotation: { x: 0, y: -Math.PI / 3, z: 0 }
      },
      {
        type: ActionType.ROTATE_TO,
        duration: 4.0,
        rotation: { x: 0, y: Math.PI / 3, z: 0 }
      },
      {
        type: ActionType.ROTATE_TO,
        duration: 2.0,
        rotation: { x: 0, y: 0, z: 0 }
      },
      {
        type: ActionType.WAIT,
        duration: 0.5
      }
    ]
  };
}
