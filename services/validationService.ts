/**
 * VALIDATION SERVICE - Object-Based Ontology System
 *
 * Provides runtime validation and type safety for all simulation entities.
 * Ensures data integrity throughout the application lifecycle.
 */

import {
  PhysicsParams,
  AssetGroup,
  Vector3Data,
  MovementBehavior,
  ShapeType,
  SpawnMode,
  MaterialPreset,
  TelemetryData
} from '../types';

/**
 * Validation Result Object
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validation Rules Ontology
 */
export class ValidationOntology {

  /**
   * Validate Vector3D data structure
   */
  static validateVector3(vec: Vector3Data, name: string = 'Vector3'): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof vec.x !== 'number' || !isFinite(vec.x)) {
      errors.push(`${name}.x must be a finite number`);
    }
    if (typeof vec.y !== 'number' || !isFinite(vec.y)) {
      errors.push(`${name}.y must be a finite number`);
    }
    if (typeof vec.z !== 'number' || !isFinite(vec.z)) {
      errors.push(`${name}.z must be a finite number`);
    }

    // Reasonable bounds warning
    const magnitude = Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2);
    if (magnitude > 1000) {
      warnings.push(`${name} magnitude (${magnitude.toFixed(2)}) is very large, may cause instability`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate Material Preset
   */
  static validateMaterialPreset(preset: MaterialPreset): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!preset.id || typeof preset.id !== 'string') {
      errors.push('MaterialPreset.id is required and must be a string');
    }
    if (!preset.name || typeof preset.name !== 'string') {
      errors.push('MaterialPreset.name is required and must be a string');
    }

    // Physics bounds
    if (preset.restitution < 0 || preset.restitution > 2) {
      errors.push(`Restitution must be between 0 and 2, got ${preset.restitution}`);
    }
    if (preset.friction < 0 || preset.friction > 2) {
      errors.push(`Friction must be between 0 and 2, got ${preset.friction}`);
    }
    if (preset.mass <= 0 || preset.mass > 1000) {
      errors.push(`Mass must be between 0 and 1000, got ${preset.mass}`);
    }
    if (preset.drag < 0 || preset.drag > 1) {
      errors.push(`Drag must be between 0 and 1, got ${preset.drag}`);
    }

    if (preset.restitution > 1.2) {
      warnings.push(`High restitution (${preset.restitution}) may cause energy gain`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate Asset Group
   */
  static validateAssetGroup(group: AssetGroup): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!group.id || typeof group.id !== 'string') {
      errors.push('AssetGroup.id is required and must be a string');
    }
    if (!group.name || typeof group.name !== 'string') {
      errors.push('AssetGroup.name is required and must be a string');
    }

    // Enum validations
    if (!Object.values(ShapeType).includes(group.shape)) {
      errors.push(`Invalid ShapeType: ${group.shape}`);
    }
    if (!Object.values(SpawnMode).includes(group.spawnMode)) {
      errors.push(`Invalid SpawnMode: ${group.spawnMode}`);
    }

    // Numeric bounds
    if (!Number.isInteger(group.count) || group.count < 0) {
      errors.push(`Count must be a non-negative integer, got ${group.count}`);
    }
    if (group.count > 2000) {
      warnings.push(`Particle count (${group.count}) exceeds recommended limit of 2000, may impact performance`);
    }
    if (group.count === 0) {
      warnings.push(`Asset group "${group.name}" has zero particles`);
    }

    if (group.scale <= 0 || group.scale > 10) {
      errors.push(`Scale must be between 0 and 10, got ${group.scale}`);
    }

    // Physics material validation
    const materialResult = this.validateMaterialPreset({
      id: group.id,
      name: group.name,
      restitution: group.restitution,
      friction: group.friction,
      mass: group.mass,
      drag: group.drag
    });
    errors.push(...materialResult.errors);
    warnings.push(...materialResult.warnings);

    // Color validation
    if (!/^#[0-9A-Fa-f]{6}$/.test(group.color)) {
      errors.push(`Invalid color format: ${group.color}, must be hex format #RRGGBB`);
    }

    // Model URL validation
    if (group.shape === ShapeType.MODEL && !group.modelUrl) {
      errors.push('MODEL shape requires modelUrl to be specified');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate Physics Parameters
   */
  static validatePhysicsParams(params: PhysicsParams): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate gravity
    const gravityResult = this.validateVector3(params.gravity, 'Gravity');
    errors.push(...gravityResult.errors);
    warnings.push(...gravityResult.warnings);

    // Validate wind
    const windResult = this.validateVector3(params.wind, 'Wind');
    errors.push(...windResult.errors);
    warnings.push(...windResult.warnings);

    // Validate movement behavior
    if (!Object.values(MovementBehavior).includes(params.movementBehavior)) {
      errors.push(`Invalid MovementBehavior: ${params.movementBehavior}`);
    }

    // Validate asset groups
    if (!Array.isArray(params.assetGroups)) {
      errors.push('assetGroups must be an array');
    } else {
      // Allow empty array for blank slate
      if (params.assetGroups.length === 0) {
        warnings.push('No asset groups defined - simulation will be empty');
      }

      params.assetGroups.forEach((group, index) => {
        const groupResult = this.validateAssetGroup(group);
        errors.push(...groupResult.errors.map(e => `AssetGroup[${index}]: ${e}`));
        warnings.push(...groupResult.warnings.map(w => `AssetGroup[${index}]: ${w}`));
      });

      // Check for duplicate IDs
      const ids = params.assetGroups.map(g => g.id);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicates.length > 0) {
        errors.push(`Duplicate asset group IDs found: ${duplicates.join(', ')}`);
      }

      // Total particle count warning
      const totalParticles = params.assetGroups.reduce((sum, g) => sum + g.count, 0);
      if (totalParticles > 3000) {
        warnings.push(`Total particle count (${totalParticles}) may cause severe performance issues`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate Telemetry Data
   */
  static validateTelemetryData(data: TelemetryData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (data.fps < 0 || !isFinite(data.fps)) {
      errors.push('FPS must be a non-negative finite number');
    }
    if (data.fps < 20) {
      warnings.push(`Low FPS detected: ${data.fps.toFixed(1)}`);
    }

    if (data.particleCount < 0 || !Number.isInteger(data.particleCount)) {
      errors.push('Particle count must be a non-negative integer');
    }

    if (data.systemEnergy < 0 || !isFinite(data.systemEnergy)) {
      errors.push('System energy must be a non-negative finite number');
    }

    if (data.avgVelocity < 0 || !isFinite(data.avgVelocity)) {
      errors.push('Average velocity must be a non-negative finite number');
    }

    if (data.avgVelocity > 100) {
      warnings.push(`Very high average velocity: ${data.avgVelocity.toFixed(2)} m/s`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Sanitize and clamp values to safe ranges
   */
  static sanitizePhysicsParams(params: PhysicsParams): PhysicsParams {
    return {
      ...params,
      gravity: {
        x: this.clamp(params.gravity.x, -100, 100),
        y: this.clamp(params.gravity.y, -100, 100),
        z: this.clamp(params.gravity.z, -100, 100)
      },
      wind: {
        x: this.clamp(params.wind.x, -50, 50),
        y: this.clamp(params.wind.y, -50, 50),
        z: this.clamp(params.wind.z, -50, 50)
      },
      assetGroups: params.assetGroups.map(group => ({
        ...group,
        count: Math.max(0, Math.min(2000, Math.floor(group.count))),
        scale: this.clamp(group.scale, 0.1, 10),
        mass: this.clamp(group.mass, 0.1, 1000),
        restitution: this.clamp(group.restitution, 0, 2),
        friction: this.clamp(group.friction, 0, 2),
        drag: this.clamp(group.drag, 0, 1)
      }))
    };
  }

  /**
   * Utility: Clamp number to range
   */
  private static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Create a valid blank slate PhysicsParams
   */
  static createBlankSlate(): PhysicsParams {
    return {
      gravity: { x: 0, y: -9.81, z: 0 },
      wind: { x: 0, y: 0, z: 0 },
      movementBehavior: MovementBehavior.PHYSICS_GRAVITY,
      assetGroups: [] // Empty - true blank slate
    };
  }

  /**
   * Create a default AssetGroup with safe values
   */
  static createDefaultAssetGroup(id?: string, name?: string): AssetGroup {
    return {
      id: id || `group_${Date.now()}`,
      name: name || 'New Group',
      count: 50,
      shape: ShapeType.SPHERE,
      color: '#22d3ee',
      spawnMode: SpawnMode.PILE,
      scale: 1.0,
      mass: 1.0,
      restitution: 0.5,
      friction: 0.5,
      drag: 0.05
    };
  }
}

/**
 * Global validation function - throws on error
 */
export function validateOrThrow(params: PhysicsParams): void {
  const result = ValidationOntology.validatePhysicsParams(params);

  if (!result.valid) {
    throw new Error(`Validation failed:\n${result.errors.join('\n')}`);
  }

  // Log warnings to console
  if (result.warnings.length > 0) {
    console.warn('Validation warnings:', result.warnings);
  }
}

/**
 * Safe validation - returns sanitized params
 */
export function validateAndSanitize(params: PhysicsParams): PhysicsParams {
  const result = ValidationOntology.validatePhysicsParams(params);

  // Log errors and warnings
  if (result.errors.length > 0) {
    console.error('Validation errors detected, sanitizing:', result.errors);
  }
  if (result.warnings.length > 0) {
    console.warn('Validation warnings:', result.warnings);
  }

  return ValidationOntology.sanitizePhysicsParams(params);
}
