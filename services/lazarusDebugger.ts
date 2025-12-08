/**
 * LAZARUS DEBUGGER
 *
 * Comprehensive debugging and diagnostics system for SnapLock.
 * Performs deep analysis of application state, validates integrity,
 * and provides actionable debugging information.
 *
 * Created for shaunbeach (collaborator)
 */

import { PhysicsParams, TelemetryData, LogEntry, AssetGroup } from '../types';
import { ValidationOntology, ValidationResult } from './validationService';

export interface DiagnosticReport {
  timestamp: string;
  overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'ERROR';
  summary: string;
  sections: DiagnosticSection[];
  recommendations: string[];
  errors: string[];
  warnings: string[];
}

export interface DiagnosticSection {
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  details: string[];
  metrics?: Record<string, any>;
}

export class LazarusDebugger {

  /**
   * Run comprehensive diagnostics on the application state
   */
  static async runDiagnostics(
    params: PhysicsParams,
    telemetry: TelemetryData,
    logs: LogEntry[],
    additionalContext?: {
      prompt?: string;
      isAutoSpawn?: boolean;
      isPaused?: boolean;
      isAnalyzing?: boolean;
      isChaosActive?: boolean;
    }
  ): Promise<DiagnosticReport> {

    const report: DiagnosticReport = {
      timestamp: new Date().toISOString(),
      overallStatus: 'HEALTHY',
      summary: '',
      sections: [],
      recommendations: [],
      errors: [],
      warnings: []
    };

    // Run all diagnostic sections
    report.sections.push(this.checkPhysicsConfiguration(params, report));
    report.sections.push(this.checkTelemetryHealth(telemetry, report));
    report.sections.push(this.checkAssetGroups(params.assetGroups, report));
    report.sections.push(this.checkPerformance(telemetry, report));
    report.sections.push(this.checkLogHistory(logs, report));

    if (additionalContext) {
      report.sections.push(this.checkApplicationState(additionalContext, report));
    }

    // Browser environment checks
    report.sections.push(this.checkBrowserEnvironment(report));

    // Determine overall status
    const hasErrors = report.sections.some(s => s.status === 'FAIL');
    const hasWarnings = report.sections.some(s => s.status === 'WARN');

    if (hasErrors) {
      report.overallStatus = 'CRITICAL';
      report.summary = `Critical issues detected: ${report.errors.length} errors, ${report.warnings.length} warnings`;
    } else if (hasWarnings) {
      report.overallStatus = 'WARNING';
      report.summary = `Application operational with warnings: ${report.warnings.length} warnings`;
    } else {
      report.overallStatus = 'HEALTHY';
      report.summary = 'All systems operational';
    }

    // Generate recommendations
    this.generateRecommendations(report);

    return report;
  }

  /**
   * Check physics configuration validity
   */
  private static checkPhysicsConfiguration(params: PhysicsParams, report: DiagnosticReport): DiagnosticSection {
    const section: DiagnosticSection = {
      name: 'Physics Configuration',
      status: 'PASS',
      details: [],
      metrics: {}
    };

    // Validate physics params
    const validation = ValidationOntology.validatePhysicsParams(params);

    if (!validation.valid) {
      section.status = 'FAIL';
      section.details.push(...validation.errors);
      report.errors.push(...validation.errors);
    }

    if (validation.warnings.length > 0) {
      if (section.status === 'PASS') section.status = 'WARN';
      section.details.push(...validation.warnings);
      report.warnings.push(...validation.warnings);
    }

    // Check gravity
    const gravityMag = Math.sqrt(
      params.gravity.x ** 2 + params.gravity.y ** 2 + params.gravity.z ** 2
    );
    if (section.metrics) section.metrics.gravityMagnitude = gravityMag.toFixed(2);

    if (gravityMag === 0) {
      section.details.push('Zero gravity detected - objects will float indefinitely');
      if (section.status === 'PASS') section.status = 'WARN';
      report.warnings.push('Zero gravity configuration');
    }

    // Check wind
    const windMag = Math.sqrt(
      params.wind.x ** 2 + params.wind.y ** 2 + params.wind.z ** 2
    );
    if (section.metrics) section.metrics.windMagnitude = windMag.toFixed(2);

    // Check movement behavior
    if (section.metrics) section.metrics.movementBehavior = params.movementBehavior;
    section.details.push(`Movement behavior: ${params.movementBehavior}`);

    // Asset groups count
    if (section.metrics) section.metrics.assetGroupCount = params.assetGroups.length;

    if (params.assetGroups.length === 0) {
      section.details.push('No asset groups configured - scene is empty');
      if (section.status === 'PASS') section.status = 'WARN';
      report.warnings.push('Empty scene configuration');
    }

    return section;
  }

  /**
   * Check telemetry data health
   */
  private static checkTelemetryHealth(telemetry: TelemetryData, report: DiagnosticReport): DiagnosticSection {
    const section: DiagnosticSection = {
      name: 'Telemetry Health',
      status: 'PASS',
      details: [],
      metrics: {
        fps: telemetry.fps.toFixed(1),
        particleCount: telemetry.particleCount,
        systemEnergy: (telemetry.systemEnergy / 1000).toFixed(2) + ' kJ',
        avgVelocity: telemetry.avgVelocity.toFixed(2) + ' m/s',
        stabilityScore: telemetry.stabilityScore.toFixed(3),
        simTime: telemetry.simTime.toFixed(1) + ' s',
        isWarmup: telemetry.isWarmup
      }
    };

    const validation = ValidationOntology.validateTelemetryData(telemetry);

    if (!validation.valid) {
      section.status = 'FAIL';
      section.details.push(...validation.errors);
      report.errors.push(...validation.errors);
    }

    if (validation.warnings.length > 0) {
      if (section.status === 'PASS') section.status = 'WARN';
      section.details.push(...validation.warnings);
      report.warnings.push(...validation.warnings);
    }

    // FPS Analysis
    if (telemetry.fps < 20) {
      section.status = 'FAIL';
      section.details.push(`Critical: Low FPS detected (${telemetry.fps.toFixed(1)})`);
      report.errors.push('Low frame rate impacting user experience');
    } else if (telemetry.fps < 30) {
      if (section.status === 'PASS') section.status = 'WARN';
      section.details.push(`Warning: FPS below optimal (${telemetry.fps.toFixed(1)})`);
      report.warnings.push('Frame rate below target');
    }

    // Energy analysis
    if (telemetry.systemEnergy === 0 && telemetry.particleCount > 0) {
      section.details.push('System has zero energy - particles may be at rest');
    }

    if (telemetry.systemEnergy > 1000000) { // > 1000 kJ
      if (section.status === 'PASS') section.status = 'WARN';
      section.details.push('Very high system energy - potential stability issues');
      report.warnings.push('High system energy detected');
    }

    // Stability analysis
    if (telemetry.stabilityScore > 5.0) {
      if (section.status === 'PASS') section.status = 'WARN';
      section.details.push('High instability score - chaotic simulation');
      report.warnings.push('Simulation instability detected');
    }

    return section;
  }

  /**
   * Check asset groups configuration
   */
  private static checkAssetGroups(assetGroups: AssetGroup[], report: DiagnosticReport): DiagnosticSection {
    const section: DiagnosticSection = {
      name: 'Asset Groups',
      status: 'PASS',
      details: [],
      metrics: {
        groupCount: assetGroups.length,
        totalParticles: assetGroups.reduce((sum, g) => sum + g.count, 0)
      }
    };

    if (assetGroups.length === 0) {
      section.details.push('No asset groups defined');
      return section;
    }

    // Check each asset group
    assetGroups.forEach((group, index) => {
      const validation = ValidationOntology.validateAssetGroup(group);

      if (!validation.valid) {
        section.status = 'FAIL';
        section.details.push(`Group ${index} (${group.name}): ${validation.errors.join(', ')}`);
        report.errors.push(...validation.errors);
      }

      if (validation.warnings.length > 0) {
        if (section.status === 'PASS') section.status = 'WARN';
        section.details.push(`Group ${index} (${group.name}): ${validation.warnings.join(', ')}`);
        report.warnings.push(...validation.warnings);
      }
    });

    // Check for duplicate IDs
    const ids = assetGroups.map(g => g.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      section.status = 'FAIL';
      section.details.push(`Duplicate asset group IDs: ${duplicates.join(', ')}`);
      report.errors.push('Duplicate asset group IDs detected');
    }

    // Total particle count check
    const totalParticles = assetGroups.reduce((sum, g) => sum + g.count, 0);
    if (totalParticles > 2000) {
      if (section.status === 'PASS') section.status = 'WARN';
      section.details.push(`High particle count (${totalParticles}) may impact performance`);
      report.warnings.push('High total particle count');
    }

    return section;
  }

  /**
   * Check performance metrics
   */
  private static checkPerformance(telemetry: TelemetryData, report: DiagnosticReport): DiagnosticSection {
    const section: DiagnosticSection = {
      name: 'Performance Analysis',
      status: 'PASS',
      details: [],
      metrics: {}
    };

    // FPS performance targets
    const targetFPS = 60;
    const minAcceptableFPS = 30;
    const fpsRatio = (telemetry.fps / targetFPS) * 100;

    if (section.metrics) section.metrics.fpsPerformance = `${fpsRatio.toFixed(1)}% of target`;

    if (telemetry.fps < minAcceptableFPS) {
      section.status = 'FAIL';
      section.details.push(`Performance critical: ${telemetry.fps.toFixed(1)} FPS`);
      report.errors.push('Frame rate below minimum acceptable threshold');
    } else if (telemetry.fps < targetFPS) {
      if (section.status === 'PASS') section.status = 'WARN';
      section.details.push(`Performance below target: ${telemetry.fps.toFixed(1)} FPS`);
    }

    // Particles per frame ratio
    if (telemetry.particleCount > 0 && telemetry.fps > 0) {
      const particlesPerFrame = telemetry.particleCount / telemetry.fps;
      if (section.metrics) section.metrics.particlesPerFrame = particlesPerFrame.toFixed(1);

      if (particlesPerFrame > 50) {
        if (section.status === 'PASS') section.status = 'WARN';
        section.details.push('High particle-to-FPS ratio may indicate bottleneck');
        report.warnings.push('Potential performance bottleneck detected');
      }
    }

    // Velocity analysis
    if (telemetry.maxVelocity > 100) {
      if (section.status === 'PASS') section.status = 'WARN';
      section.details.push(`Very high velocities detected (${telemetry.maxVelocity.toFixed(2)} m/s)`);
      report.warnings.push('Extreme velocities may cause instability');
    }

    return section;
  }

  /**
   * Check log history for errors
   */
  private static checkLogHistory(logs: LogEntry[], report: DiagnosticReport): DiagnosticSection {
    const section: DiagnosticSection = {
      name: 'Log History Analysis',
      status: 'PASS',
      details: [],
      metrics: {
        totalLogs: logs.length,
        errors: logs.filter(l => l.type === 'error').length,
        warnings: logs.filter(l => l.type === 'warning').length,
        chaosActions: logs.filter(l => l.type === 'chaos').length
      }
    };

    const recentLogs = logs.slice(-20); // Last 20 logs
    const errorLogs = recentLogs.filter(l => l.type === 'error');
    const warningLogs = recentLogs.filter(l => l.type === 'warning');

    if (errorLogs.length > 0) {
      section.status = 'FAIL';
      section.details.push(`${errorLogs.length} errors in recent logs:`);
      errorLogs.forEach(log => {
        section.details.push(`  - ${log.timestamp}: ${log.message}`);
      });
      report.errors.push(`${errorLogs.length} errors in log history`);
    }

    if (warningLogs.length > 3) {
      if (section.status === 'PASS') section.status = 'WARN';
      section.details.push(`${warningLogs.length} warnings in recent logs`);
      report.warnings.push('Multiple warnings in log history');
    }

    return section;
  }

  /**
   * Check application state
   */
  private static checkApplicationState(
    context: {
      prompt?: string;
      isAutoSpawn?: boolean;
      isPaused?: boolean;
      isAnalyzing?: boolean;
      isChaosActive?: boolean;
    },
    report: DiagnosticReport
  ): DiagnosticSection {
    const section: DiagnosticSection = {
      name: 'Application State',
      status: 'PASS',
      details: [],
      metrics: {
        autoSpawnEnabled: context.isAutoSpawn ?? 'unknown',
        simulationPaused: context.isPaused ?? 'unknown',
        analyzing: context.isAnalyzing ?? 'unknown',
        chaosActive: context.isChaosActive ?? 'unknown',
        promptLength: context.prompt?.length ?? 0
      }
    };

    // Check for potential issues
    if (context.isAnalyzing && context.isAutoSpawn) {
      section.details.push('Analysis in progress with auto-spawn enabled - may cause conflicts');
    }

    if (context.isAutoSpawn && !context.prompt) {
      section.details.push('Auto-spawn enabled with empty prompt - waiting for AI generation');
    }

    if (context.prompt && context.prompt.length > 1000) {
      if (section.status === 'PASS') section.status = 'WARN';
      section.details.push('Very long prompt may impact AI processing');
      report.warnings.push('Prompt length exceeds recommended limit');
    }

    return section;
  }

  /**
   * Check browser environment
   */
  private static checkBrowserEnvironment(report: DiagnosticReport): DiagnosticSection {
    const section: DiagnosticSection = {
      name: 'Browser Environment',
      status: 'PASS',
      details: [],
      metrics: {}
    };

    // Check WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

      if (!gl) {
        section.status = 'FAIL';
        section.details.push('WebGL not supported or disabled');
        report.errors.push('WebGL unavailable');
      } else {
        section.details.push('WebGL supported');
        // @ts-ignore
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo && section.metrics) {
          // @ts-ignore
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          section.metrics.gpuRenderer = renderer;
        }
      }
    } catch (e) {
      section.status = 'FAIL';
      section.details.push('WebGL check failed: ' + (e as Error).message);
      report.errors.push('WebGL check failed');
    }

    // Check performance API
    if (typeof performance !== 'undefined' && section.metrics) {
      section.metrics.performanceMemory = (performance as any).memory ? 'available' : 'not available';
    }

    // User agent
    if (section.metrics) section.metrics.userAgent = navigator.userAgent;

    // Check for known issues
    if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
      section.details.push('Safari browser detected - some features may behave differently');
    }

    return section;
  }

  /**
   * Generate actionable recommendations
   */
  private static generateRecommendations(report: DiagnosticReport): void {
    // Performance recommendations
    const perfSection = report.sections.find(s => s.name === 'Performance Analysis');
    if (perfSection && perfSection.status !== 'PASS') {
      report.recommendations.push('Reduce particle count or simplify physics to improve performance');
      report.recommendations.push('Consider lowering simulation quality settings');
    }

    // Asset group recommendations
    const assetSection = report.sections.find(s => s.name === 'Asset Groups');
    if (assetSection && assetSection.metrics?.totalParticles > 1000) {
      report.recommendations.push('Consider splitting large asset groups into smaller ones');
    }

    // Telemetry recommendations
    const telemetrySection = report.sections.find(s => s.name === 'Telemetry Health');
    if (telemetrySection && telemetrySection.status === 'FAIL') {
      report.recommendations.push('Reset simulation to restore stability');
      report.recommendations.push('Check browser console for additional error details');
    }

    // General recommendations
    if (report.errors.length > 0) {
      report.recommendations.push('Review error details and address critical issues first');
    }

    if (report.warnings.length > 5) {
      report.recommendations.push('Multiple warnings detected - review configuration settings');
    }
  }

  /**
   * Generate formatted diagnostic report for display
   */
  static formatReport(report: DiagnosticReport): string {
    let output = '='.repeat(80) + '\n';
    output += 'LAZARUS DIAGNOSTIC REPORT\n';
    output += '='.repeat(80) + '\n';
    output += `Timestamp: ${report.timestamp}\n`;
    output += `Overall Status: ${report.overallStatus}\n`;
    output += `Summary: ${report.summary}\n`;
    output += '='.repeat(80) + '\n\n';

    report.sections.forEach(section => {
      output += `[${section.status}] ${section.name}\n`;
      output += '-'.repeat(80) + '\n';

      if (section.metrics && Object.keys(section.metrics).length > 0) {
        output += 'Metrics:\n';
        Object.entries(section.metrics).forEach(([key, value]) => {
          output += `  ${key}: ${value}\n`;
        });
      }

      if (section.details.length > 0) {
        output += 'Details:\n';
        section.details.forEach(detail => {
          output += `  - ${detail}\n`;
        });
      }

      output += '\n';
    });

    if (report.errors.length > 0) {
      output += 'ERRORS:\n';
      output += '-'.repeat(80) + '\n';
      report.errors.forEach(error => {
        output += `  [!] ${error}\n`;
      });
      output += '\n';
    }

    if (report.warnings.length > 0) {
      output += 'WARNINGS:\n';
      output += '-'.repeat(80) + '\n';
      report.warnings.forEach(warning => {
        output += `  [~] ${warning}\n`;
      });
      output += '\n';
    }

    if (report.recommendations.length > 0) {
      output += 'RECOMMENDATIONS:\n';
      output += '-'.repeat(80) + '\n';
      report.recommendations.forEach((rec, index) => {
        output += `  ${index + 1}. ${rec}\n`;
      });
      output += '\n';
    }

    output += '='.repeat(80) + '\n';
    output += 'End of diagnostic report\n';
    output += '='.repeat(80) + '\n';

    return output;
  }
}
