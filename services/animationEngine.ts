/**
 * Animation Engine for Robot Training Simulations
 *
 * Provides keyframe animation and scripted behavior sequences for digital twin robotics.
 * Integrates with Rapier physics engine for kinematic control.
 */

import * as THREE from 'three';
import { AnimationClip, BehaviorSequence, Keyframe, Action, ActionType, Vector3Data, AnimationState } from '../types';

export class AnimationEngine {
  private clips: Map<string, AnimationClip> = new Map();
  private behaviors: Map<string, BehaviorSequence> = new Map();
  private state: AnimationState = {
    isPlaying: false,
    currentTime: 0,
    activeClips: [],
    activeBehaviors: [],
    speed: 1.0
  };

  // Behavior execution state
  private behaviorStates: Map<string, {
    currentActionIndex: number;
    actionStartTime: number;
    elapsedTime: number;
  }> = new Map();

  /**
   * Register an animation clip
   */
  registerClip(clip: AnimationClip): void {
    this.clips.set(clip.id, clip);
    console.log(`[AnimationEngine] Registered clip: ${clip.name} (${clip.duration}s)`);
  }

  /**
   * Register a behavior sequence
   */
  registerBehavior(behavior: BehaviorSequence): void {
    this.behaviors.set(behavior.id, behavior);
    console.log(`[AnimationEngine] Registered behavior: ${behavior.name} (${behavior.actions.length} actions)`);
  }

  /**
   * Start playing an animation clip
   */
  playClip(clipId: string): boolean {
    const clip = this.clips.get(clipId);
    if (!clip) {
      console.warn(`[AnimationEngine] Clip not found: ${clipId}`);
      return false;
    }

    if (!this.state.activeClips.includes(clipId)) {
      this.state.activeClips.push(clipId);
    }
    this.state.isPlaying = true;
    console.log(`[AnimationEngine] Playing clip: ${clip.name}`);
    return true;
  }

  /**
   * Start executing a behavior sequence
   */
  startBehavior(behaviorId: string, initialPosition?: Vector3Data): boolean {
    const behavior = this.behaviors.get(behaviorId);
    if (!behavior) {
      console.warn(`[AnimationEngine] Behavior not found: ${behaviorId}`);
      return false;
    }

    if (!this.state.activeBehaviors.includes(behaviorId)) {
      this.state.activeBehaviors.push(behaviorId);
      this.behaviorStates.set(behaviorId, {
        currentActionIndex: 0,
        actionStartTime: 0,
        elapsedTime: 0
      });

      // Store initial position for interpolation
      if (initialPosition) {
        this.behaviorPositions.set(behavior.targetObjectId, initialPosition);
      }
    }
    this.state.isPlaying = true;
    console.log(`[AnimationEngine] Starting behavior: ${behavior.name} with initial pos:`, initialPosition);
    return true;
  }

  /**
   * Stop an animation clip
   */
  stopClip(clipId: string): void {
    this.state.activeClips = this.state.activeClips.filter(id => id !== clipId);
    if (this.state.activeClips.length === 0 && this.state.activeBehaviors.length === 0) {
      this.state.isPlaying = false;
    }
  }

  /**
   * Stop a behavior sequence
   */
  stopBehavior(behaviorId: string): void {
    this.state.activeBehaviors = this.state.activeBehaviors.filter(id => id !== behaviorId);
    this.behaviorStates.delete(behaviorId);
    if (this.state.activeClips.length === 0 && this.state.activeBehaviors.length === 0) {
      this.state.isPlaying = false;
    }
  }

  /**
   * Stop all animations and behaviors
   */
  stopAll(): void {
    this.state.activeClips = [];
    this.state.activeBehaviors = [];
    this.behaviorStates.clear();
    this.state.isPlaying = false;
    this.state.currentTime = 0;
  }

  /**
   * Pause all active animations and behaviors
   */
  pause(): void {
    this.state.isPlaying = false;
    console.log('[AnimationEngine] Paused');
  }

  /**
   * Resume all active animations and behaviors
   */
  resume(): void {
    if (this.state.activeClips.length > 0 || this.state.activeBehaviors.length > 0) {
      this.state.isPlaying = true;
      console.log('[AnimationEngine] Resumed');
    }
  }

  /**
   * Update animations (call every frame)
   * Returns map of object IDs to their target transforms
   */
  update(deltaTime: number): Map<string, { position?: Vector3Data; rotation?: Vector3Data }> {
    if (!this.state.isPlaying) {
      return new Map();
    }

    this.state.currentTime += deltaTime * this.state.speed;

    const transforms = new Map<string, { position?: Vector3Data; rotation?: Vector3Data }>();

    // Update keyframe animations
    for (const clipId of this.state.activeClips) {
      const clip = this.clips.get(clipId);
      if (!clip) continue;

      const transform = this.evaluateClip(clip, this.state.currentTime);
      if (transform) {
        transforms.set(clip.targetObjectId, transform);
      }

      // Handle looping
      if (this.state.currentTime >= clip.duration) {
        if (clip.loop) {
          this.state.currentTime = this.state.currentTime % clip.duration;
        } else {
          this.stopClip(clipId);
        }
      }
    }

    // Update behavior sequences
    for (const behaviorId of [...this.state.activeBehaviors]) {
      const behavior = this.behaviors.get(behaviorId);
      if (!behavior) continue;

      const behaviorState = this.behaviorStates.get(behaviorId);
      if (!behaviorState) continue;

      const transform = this.updateBehavior(behavior, behaviorState, deltaTime);
      if (transform) {
        transforms.set(behavior.targetObjectId, transform);
      }

      // Check if behavior completed
      if (behaviorState.currentActionIndex >= behavior.actions.length) {
        if (behavior.loop) {
          behaviorState.currentActionIndex = 0;
          behaviorState.actionStartTime = this.state.currentTime;
        } else {
          this.stopBehavior(behaviorId);
        }
      }
    }

    return transforms;
  }

  /**
   * Evaluate a keyframe animation at given time
   */
  private evaluateClip(clip: AnimationClip, time: number): { position?: Vector3Data; rotation?: Vector3Data } | null {
    if (clip.keyframes.length === 0) return null;

    // Find surrounding keyframes
    let prevKeyframe: Keyframe | null = null;
    let nextKeyframe: Keyframe | null = null;

    for (let i = 0; i < clip.keyframes.length; i++) {
      const kf = clip.keyframes[i];
      if (kf.time <= time) {
        prevKeyframe = kf;
      }
      if (kf.time > time && !nextKeyframe) {
        nextKeyframe = kf;
        break;
      }
    }

    // If before first keyframe, use first keyframe
    if (!prevKeyframe && nextKeyframe) {
      return {
        position: nextKeyframe.position,
        rotation: nextKeyframe.rotation
      };
    }

    // If after last keyframe, use last keyframe
    if (prevKeyframe && !nextKeyframe) {
      return {
        position: prevKeyframe.position,
        rotation: prevKeyframe.rotation
      };
    }

    // Interpolate between keyframes
    if (prevKeyframe && nextKeyframe) {
      const t = (time - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time);
      const interpolationType = clip.interpolation || 'linear';

      return {
        position: prevKeyframe.position && nextKeyframe.position
          ? this.interpolateVector(prevKeyframe.position, nextKeyframe.position, t, interpolationType)
          : prevKeyframe.position || nextKeyframe.position,
        rotation: prevKeyframe.rotation && nextKeyframe.rotation
          ? this.interpolateVector(prevKeyframe.rotation, nextKeyframe.rotation, t, interpolationType)
          : prevKeyframe.rotation || nextKeyframe.rotation
      };
    }

    return null;
  }

  // Track previous positions for interpolation
  private behaviorPositions: Map<string, Vector3Data> = new Map();

  /**
   * Update a behavior sequence
   */
  private updateBehavior(
    behavior: BehaviorSequence,
    state: { currentActionIndex: number; actionStartTime: number; elapsedTime: number },
    deltaTime: number
  ): { position?: Vector3Data; rotation?: Vector3Data } | null {
    if (state.currentActionIndex >= behavior.actions.length) {
      return null;
    }

    const action = behavior.actions[state.currentActionIndex];
    state.elapsedTime += deltaTime;

    // Check if action completed
    if (state.elapsedTime >= action.duration) {
      // Store final position before moving to next action
      if (action.type === ActionType.MOVE_TO && action.position) {
        this.behaviorPositions.set(behavior.targetObjectId, action.position);
      }

      state.currentActionIndex++;
      state.elapsedTime = 0;
      state.actionStartTime = this.state.currentTime;

      // Move to next action
      if (state.currentActionIndex < behavior.actions.length) {
        return this.updateBehavior(behavior, state, 0);
      }
      return null;
    }

    // Execute current action
    const progress = state.elapsedTime / action.duration;
    return this.executeAction(behavior.targetObjectId, action, progress);
  }

  /**
   * Execute a single action at given progress (0-1)
   */
  private executeAction(objectId: string, action: Action, progress: number): { position?: Vector3Data; rotation?: Vector3Data } | null {
    switch (action.type) {
      case ActionType.MOVE_TO:
        if (action.position) {
          // Get starting position (previous action's end position or initial position)
          const startPos = this.behaviorPositions.get(objectId) || action.position;

          // Interpolate from start to target
          const currentPos = this.interpolateVector(startPos, action.position, progress, 'cubic');

          if (progress < 0.05) {
            console.log(`[AnimationEngine] MOVE_TO ${objectId}: progress=${progress.toFixed(3)}, from=(${startPos.x.toFixed(2)}, ${startPos.y.toFixed(2)}, ${startPos.z.toFixed(2)}) to=(${action.position.x.toFixed(2)}, ${action.position.y.toFixed(2)}, ${action.position.z.toFixed(2)})`);
          }

          return { position: currentPos };
        }
        return null;

      case ActionType.ROTATE_TO:
        return action.rotation ? { rotation: action.rotation } : null;

      case ActionType.FOLLOW_PATH:
        if (action.path && action.path.length > 1) {
          const segmentIndex = Math.floor(progress * (action.path.length - 1));
          const nextIndex = Math.min(segmentIndex + 1, action.path.length - 1);
          const segmentProgress = (progress * (action.path.length - 1)) - segmentIndex;

          return {
            position: this.interpolateVector(action.path[segmentIndex], action.path[nextIndex], segmentProgress, 'linear')
          };
        }
        return null;

      case ActionType.WAIT:
        // No transform change during wait
        return null;

      case ActionType.GRASP:
      case ActionType.RELEASE:
        // These would trigger physics interactions, not transforms
        // Handle in physics integration layer
        return null;

      default:
        return null;
    }
  }

  /**
   * Interpolate between two vectors
   */
  private interpolateVector(a: Vector3Data, b: Vector3Data, t: number, type: 'linear' | 'cubic' | 'step'): Vector3Data {
    if (type === 'step') {
      return t < 0.5 ? a : b;
    }

    if (type === 'cubic') {
      // Smooth cubic easing
      t = t * t * (3 - 2 * t);
    }

    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t
    };
  }

  /**
   * Get current animation state
   */
  getState(): AnimationState {
    return { ...this.state };
  }

  /**
   * Set playback speed
   */
  setSpeed(speed: number): void {
    this.state.speed = Math.max(0.1, Math.min(5.0, speed));
  }

  /**
   * Check if animations are playing
   */
  isPlaying(): boolean {
    return this.state.isPlaying;
  }

  /**
   * Get all registered clips
   */
  getClips(): AnimationClip[] {
    return Array.from(this.clips.values());
  }

  /**
   * Get all registered behaviors
   */
  getBehaviors(): BehaviorSequence[] {
    return Array.from(this.behaviors.values());
  }
}
