import { AssetGroup, PhysicsParams, ShapeType } from '../types';

/**
 * AI Validation Service - Ensures AI-generated physics configurations match user intent
 *
 * Extracts keywords from user prompts and validates AI responses for:
 * - Shape accuracy (sphere, cube, cylinder, etc.)
 * - Material properties (steel, rubber, wood → restitution/friction/mass)
 * - Count accuracy
 * - Physical behavior (bouncing, heavy, floating, etc.)
 */

export interface ExtractedIntent {
  shapes: string[];
  materials: string[];
  counts: number[];
  behaviors: string[];
  colors: string[];
  rawPrompt: string;
}

export interface ValidationMismatch {
  category: 'shape' | 'material' | 'count' | 'physics' | 'color';
  expected: string;
  received: string;
  severity: 'critical' | 'warning';
  message: string;
}

export interface AIValidationResult {
  isValid: boolean;
  confidence: number;  // 0.0 to 1.0
  mismatches: ValidationMismatch[];
  suggestions: string[];
}

// Keyword mappings
const SHAPE_KEYWORDS: Record<string, ShapeType> = {
  'sphere': ShapeType.SPHERE,
  'ball': ShapeType.SPHERE,
  'orb': ShapeType.SPHERE,
  'cube': ShapeType.CUBE,
  'box': ShapeType.CUBE,
  'block': ShapeType.CUBE,
  'cylinder': ShapeType.CYLINDER,
  'can': ShapeType.CYLINDER,
  'tube': ShapeType.CYLINDER,
  'cone': ShapeType.CONE,
  'pyramid': ShapeType.PYRAMID,
  'capsule': ShapeType.CAPSULE,
  'pill': ShapeType.CAPSULE,
  'torus': ShapeType.TORUS,
  'ring': ShapeType.TORUS,
  'donut': ShapeType.TORUS,
  'icosahedron': ShapeType.ICOSAHEDRON,
  'plate': ShapeType.PLATE,
  'platform': ShapeType.PLATE,
  'floor': ShapeType.PLATE,
  'surface': ShapeType.PLATE,
};

const MATERIAL_PROPERTIES: Record<string, { restitution: number; friction: number; massMultiplier: number }> = {
  'rubber': { restitution: 0.85, friction: 0.9, massMultiplier: 1.0 },
  'bouncy': { restitution: 0.9, friction: 0.9, massMultiplier: 1.0 },
  'elastic': { restitution: 0.85, friction: 0.7, massMultiplier: 1.0 },
  'steel': { restitution: 0.3, friction: 0.6, massMultiplier: 5.0 },
  'metal': { restitution: 0.3, friction: 0.5, massMultiplier: 4.0 },
  'iron': { restitution: 0.25, friction: 0.6, massMultiplier: 5.0 },
  'wood': { restitution: 0.4, friction: 0.7, massMultiplier: 2.0 },
  'wooden': { restitution: 0.4, friction: 0.7, massMultiplier: 2.0 },
  'glass': { restitution: 0.6, friction: 0.1, massMultiplier: 1.5 },
  'ice': { restitution: 0.1, friction: 0.01, massMultiplier: 1.2 },
  'slippery': { restitution: 0.2, friction: 0.05, massMultiplier: 1.0 },
  'plastic': { restitution: 0.5, friction: 0.5, massMultiplier: 0.8 },
  'concrete': { restitution: 0.1, friction: 0.9, massMultiplier: 4.0 },
  'stone': { restitution: 0.15, friction: 0.8, massMultiplier: 4.5 },
};

const BEHAVIOR_PROPERTIES: Record<string, { key: string; value: any }> = {
  'bouncing': { key: 'restitution', value: 0.8 },
  'bounce': { key: 'restitution', value: 0.8 },
  'heavy': { key: 'mass', value: 15 },
  'light': { key: 'mass', value: 1 },
  'floating': { key: 'mass', value: 0.5 },
  'sliding': { key: 'friction', value: 0.1 },
  'sticky': { key: 'friction', value: 0.95 },
};

export class AIValidationService {
  /**
   * Extract user intent from natural language prompt
   */
  static extractIntent(prompt: string): ExtractedIntent {
    const lowerPrompt = prompt.toLowerCase();
    const intent: ExtractedIntent = {
      shapes: [],
      materials: [],
      counts: [],
      behaviors: [],
      colors: [],
      rawPrompt: prompt,
    };

    // Extract shapes
    Object.keys(SHAPE_KEYWORDS).forEach(keyword => {
      if (lowerPrompt.includes(keyword)) {
        intent.shapes.push(keyword);
      }
    });

    // Extract materials
    Object.keys(MATERIAL_PROPERTIES).forEach(material => {
      if (lowerPrompt.includes(material)) {
        intent.materials.push(material);
      }
    });

    // Extract counts (numbers)
    const numberMatches = prompt.match(/\b(\d+)\b/g);
    if (numberMatches) {
      intent.counts = numberMatches.map(n => parseInt(n, 10));
    }

    // Extract behaviors
    Object.keys(BEHAVIOR_PROPERTIES).forEach(behavior => {
      if (lowerPrompt.includes(behavior)) {
        intent.behaviors.push(behavior);
      }
    });

    // Extract colors (basic set)
    const colorKeywords = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black', 'gray', 'brown', 'cyan', 'magenta'];
    colorKeywords.forEach(color => {
      if (lowerPrompt.includes(color)) {
        intent.colors.push(color);
      }
    });

    return intent;
  }

  /**
   * Validate AI response against extracted user intent
   */
  static validateAIResponse(
    prompt: string,
    aiResponse: PhysicsParams
  ): AIValidationResult {
    const intent = this.extractIntent(prompt);
    const mismatches: ValidationMismatch[] = [];
    let confidenceScore = 1.0;

    // Validate shapes
    if (intent.shapes.length > 0) {
      const expectedShapes = intent.shapes.map(s => SHAPE_KEYWORDS[s]);
      const receivedShapes = aiResponse.assetGroups.map(g => g.shape);

      expectedShapes.forEach(expectedShape => {
        if (!receivedShapes.includes(expectedShape)) {
          mismatches.push({
            category: 'shape',
            expected: expectedShape,
            received: receivedShapes.join(', ') || 'none',
            severity: 'critical',
            message: `Expected shape "${expectedShape}" not found in AI response`,
          });
          confidenceScore -= 0.3;
        }
      });
    }

    // Validate materials
    if (intent.materials.length > 0) {
      const expectedMaterial = intent.materials[0]; // Use first material mentioned
      const expectedProps = MATERIAL_PROPERTIES[expectedMaterial];

      if (expectedProps) {
        aiResponse.assetGroups.forEach((group, idx) => {
          // Check restitution
          const restitutionDiff = Math.abs(group.restitution - expectedProps.restitution);
          if (restitutionDiff > 0.3) {
            mismatches.push({
              category: 'material',
              expected: `${expectedMaterial} (restitution ~${expectedProps.restitution})`,
              received: `restitution ${group.restitution}`,
              severity: 'warning',
              message: `Group ${idx}: Restitution mismatch for material "${expectedMaterial}"`,
            });
            confidenceScore -= 0.1;
          }

          // Check friction
          const frictionDiff = Math.abs(group.friction - expectedProps.friction);
          if (frictionDiff > 0.3) {
            mismatches.push({
              category: 'material',
              expected: `${expectedMaterial} (friction ~${expectedProps.friction})`,
              received: `friction ${group.friction}`,
              severity: 'warning',
              message: `Group ${idx}: Friction mismatch for material "${expectedMaterial}"`,
            });
            confidenceScore -= 0.1;
          }

          // Check mass (rough check based on multiplier)
          const expectedMassRange = [expectedProps.massMultiplier * 2, expectedProps.massMultiplier * 10];
          if (group.mass < expectedMassRange[0] || group.mass > expectedMassRange[1]) {
            mismatches.push({
              category: 'material',
              expected: `${expectedMaterial} (mass ${expectedMassRange[0]}-${expectedMassRange[1]})`,
              received: `mass ${group.mass}`,
              severity: 'warning',
              message: `Group ${idx}: Mass out of expected range for "${expectedMaterial}"`,
            });
            confidenceScore -= 0.05;
          }
        });
      }
    }

    // Validate counts
    if (intent.counts.length > 0) {
      const totalCount = aiResponse.assetGroups.reduce((sum, g) => sum + g.count, 0);
      const expectedTotal = intent.counts.reduce((sum, c) => sum + c, 0);

      const countDiffPercent = Math.abs(totalCount - expectedTotal) / expectedTotal;
      if (countDiffPercent > 0.5) {
        mismatches.push({
          category: 'count',
          expected: `${expectedTotal} objects`,
          received: `${totalCount} objects`,
          severity: countDiffPercent > 0.8 ? 'critical' : 'warning',
          message: `Object count mismatch: expected ~${expectedTotal}, got ${totalCount}`,
        });
        confidenceScore -= countDiffPercent > 0.8 ? 0.3 : 0.15;
      }
    }

    // Validate behaviors
    if (intent.behaviors.length > 0) {
      intent.behaviors.forEach(behavior => {
        const expectedProp = BEHAVIOR_PROPERTIES[behavior];
        if (expectedProp) {
          const key = expectedProp.key as keyof AssetGroup;
          const expectedValue = expectedProp.value;

          aiResponse.assetGroups.forEach((group, idx) => {
            const actualValue = group[key];
            if (typeof actualValue === 'number' && typeof expectedValue === 'number') {
              const diff = Math.abs(actualValue - expectedValue);
              const threshold = expectedValue * 0.4; // 40% tolerance

              if (diff > threshold) {
                mismatches.push({
                  category: 'physics',
                  expected: `${behavior} (${key}~${expectedValue})`,
                  received: `${key}=${actualValue}`,
                  severity: 'warning',
                  message: `Group ${idx}: Physics property "${key}" doesn't match behavior "${behavior}"`,
                });
                confidenceScore -= 0.08;
              }
            }
          });
        }
      });
    }

    // Generate suggestions
    const suggestions: string[] = [];
    if (mismatches.some(m => m.category === 'shape' && m.severity === 'critical')) {
      suggestions.push('AI generated wrong shapes. Retry with explicit shape specification.');
    }
    if (mismatches.some(m => m.category === 'material')) {
      suggestions.push('Material properties mismatch. Consider retraining or using material presets.');
    }
    if (mismatches.some(m => m.category === 'count' && m.severity === 'critical')) {
      suggestions.push('Object count significantly different from user request.');
    }

    // Clamp confidence score
    confidenceScore = Math.max(0, Math.min(1, confidenceScore));

    return {
      isValid: confidenceScore >= 0.7 && mismatches.filter(m => m.severity === 'critical').length === 0,
      confidence: confidenceScore,
      mismatches,
      suggestions,
    };
  }

  /**
   * Generate enhanced prompt for retry
   */
  static generateEnhancedPrompt(originalPrompt: string, intent: ExtractedIntent): string {
    const clarifications: string[] = [];

    if (intent.shapes.length > 0) {
      clarifications.push(`SHAPES: Exactly ${intent.shapes.join(', ')}`);
    }

    if (intent.materials.length > 0) {
      const material = intent.materials[0];
      const props = MATERIAL_PROPERTIES[material];
      if (props) {
        clarifications.push(
          `MATERIAL: ${material.toUpperCase()} (restitution=${props.restitution}, friction=${props.friction}, mass multiplier=${props.massMultiplier}x)`
        );
      }
    }

    if (intent.counts.length > 0) {
      clarifications.push(`COUNT: Exactly ${intent.counts.join(' + ')} objects total`);
    }

    if (intent.behaviors.length > 0) {
      clarifications.push(`BEHAVIOR: ${intent.behaviors.join(', ')}`);
    }

    const enhancedPrompt = `USER EXPLICITLY REQUESTED: ${clarifications.join(' | ')}\n\nOriginal prompt: "${originalPrompt}"\n\nSTRICTLY adhere to user specifications above.`;

    return enhancedPrompt;
  }

  /**
   * Log validation results to console
   */
  static logValidationResults(result: AIValidationResult, prompt: string): void {
    console.group(`🔍 AI Validation Results for: "${prompt}"`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`Valid: ${result.isValid ? '✅' : '❌'}`);

    if (result.mismatches.length > 0) {
      console.group(`Mismatches (${result.mismatches.length})`);
      result.mismatches.forEach(mismatch => {
        const icon = mismatch.severity === 'critical' ? '🚨' : '⚠️';
        console.log(`${icon} [${mismatch.category}] ${mismatch.message}`);
        console.log(`   Expected: ${mismatch.expected}`);
        console.log(`   Received: ${mismatch.received}`);
      });
      console.groupEnd();
    }

    if (result.suggestions.length > 0) {
      console.group('Suggestions');
      result.suggestions.forEach(suggestion => console.log(`💡 ${suggestion}`));
      console.groupEnd();
    }

    console.groupEnd();
  }
}
