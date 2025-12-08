

import React, { useState, useEffect, useRef } from 'react';
import { ChaosMode } from '../services/chaosMode';
import { DisturbanceType, MovementBehavior, ShapeType } from '../types';
import { Play, RotateCcw, CheckCircle2, XCircle, AlertTriangle, Terminal } from 'lucide-react';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'pass' | 'fail';
  message: string;
  duration?: number;
}

const TESTS: Array<{ id: string, name: string, fn: (hooks: any) => Promise<void> }> = [
  {
    id: 'unit_adversarial',
    name: 'Unit: Adversarial Logic Range',
    fn: async () => {
       const mockParams: any = { gravity: {x:0,y:0,z:0}, assetGroups: [] };
       const result = ChaosMode.applyDisturbance(mockParams, {
           detectedState: "STABLE",
           action: DisturbanceType.WIND_GUST,
           intensity: 1.0,
           reasoning: "Test"
       });
       if (result.wind.x === 0 && result.wind.z === 0) throw new Error("Wind gust failed to apply vector");
       if (Math.abs(result.wind.x) > 100) throw new Error("Wind gust exceeded safe limits");
    }
  },
  {
      id: 'unit_physics_constants',
      name: 'Unit: Physics Config Validation',
      fn: async (hooks) => {
          const params = hooks.getParams();
          if (!params.gravity) throw new Error("Gravity vector missing");
          if (params.assetGroups.length === 0) throw new Error("Default asset groups missing");
          if (params.movementBehavior !== MovementBehavior.PHYSICS_GRAVITY) throw new Error("Default behavior incorrect");
      }
  },
  {
    id: 'int_warm_start',
    name: 'Integration: Warm Start Protocol',
    fn: async (hooks) => {
        hooks.resetSim();
        await new Promise(r => setTimeout(r, 100)); // Wait for reset
        
        // Frame 0-60 should be warmup
        const telemStart = hooks.telemetryRef.current;
        if (!telemStart.isWarmup) throw new Error("Sim failed to enter Warmup state on reset");
        
        hooks.togglePause(); // Unpause
        await new Promise(r => setTimeout(r, 1500)); // Wait >1s (approx 60 frames)
        
        const telemEnd = hooks.telemetryRef.current;
        if (telemEnd.isWarmup) throw new Error("Sim failed to exit Warmup state after 1s");
        hooks.togglePause(); // Repause
    }
  },
  {
    id: 'int_analysis_flow',
    name: 'Integration: AI Config Injection',
    fn: async (hooks) => {
        const startParams = JSON.stringify(hooks.getParams());
        hooks.setPrompt("TEST PROMPT");
        hooks.clickAnalyze();
        
        // Poll for change
        let attempts = 0;
        while(attempts < 20) {
            await new Promise(r => setTimeout(r, 200));
            const currentParams = JSON.stringify(hooks.getParams());
            if (currentParams !== startParams) {
                // Verify mock data injection
                const p = hooks.getParams();
                if (p.assetGroups.some((g: any) => g.id === 'mock_group_1')) return;
            }
            attempts++;
        }
        throw new Error("Analysis failed to update physics parameters");
    }
  },
  {
      id: 'reg_canvas_integrity',
      name: 'Regression: Renderer Integrity',
      fn: async (hooks) => {
          const canvas = document.querySelector('canvas') as HTMLCanvasElement;
          if (!canvas) throw new Error("Canvas element not found in DOM");
          if (canvas.width === 0 || canvas.height === 0) throw new Error("Canvas has 0 dimensions");
          
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (!gl) throw new Error("WebGL Context lost or not initialized");
      }
  }
];

export const TestDashboard: React.FC = () => {
    const [results, setResults] = useState<TestResult[]>(TESTS.map(t => ({ id: t.id, name: t.name, status: 'pending', message: 'Waiting...' })));
    const [isRunning, setIsRunning] = useState(false);
    const [overallStatus, setOverallStatus] = useState<'IDLE' | 'RUNNING' | 'PASS' | 'FAIL'>('IDLE');

    const runTests = async () => {
        const hooks = window.snaplock;
        if (!hooks) {
            alert("Test hooks not initialized. Ensure ?test=true is in URL.");
            return;
        }

        setIsRunning(true);
        setOverallStatus('RUNNING');
        let failCount = 0;

        // Reset All
        setResults(TESTS.map(t => ({ id: t.id, name: t.name, status: 'pending', message: 'Waiting...' })));

        for (const test of TESTS) {
            setResults(prev => prev.map(r => r.id === test.id ? { ...r, status: 'running', message: 'Executing...' } : r));
            
            const start = performance.now();
            try {
                await test.fn(hooks);
                const duration = performance.now() - start;
                setResults(prev => prev.map(r => r.id === test.id ? { ...r, status: 'pass', message: 'OK', duration } : r));
            } catch (e: any) {
                failCount++;
                const duration = performance.now() - start;
                setResults(prev => prev.map(r => r.id === test.id ? { ...r, status: 'fail', message: e.message, duration } : r));
            }
            
            // Short cool-down between tests
            await new Promise(r => setTimeout(r, 500));
        }

        setIsRunning(false);
        setOverallStatus(failCount === 0 ? 'PASS' : 'FAIL');
    };

    return (
        <div className="fixed top-16 right-4 w-96 bg-slate-900 border border-slate-700 shadow-2xl rounded-lg overflow-hidden z-[9999] font-mono text-xs">
            <div className="bg-slate-800 p-3 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2 text-white">
                    <Terminal size={14} className="text-yellow-500" />
                    <span className="font-bold tracking-wider">SYSTEM DIAGNOSTICS</span>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    overallStatus === 'IDLE' ? 'bg-slate-700 text-slate-400' :
                    overallStatus === 'RUNNING' ? 'bg-blue-900 text-blue-200 animate-pulse' :
                    overallStatus === 'PASS' ? 'bg-green-900 text-green-200' :
                    'bg-red-900 text-red-200'
                }`}>
                    {overallStatus}
                </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1 bg-black/50">
                {results.map((res) => (
                    <div key={res.id} className={`p-2 rounded border flex items-start gap-3 ${
                        res.status === 'running' ? 'bg-blue-950/30 border-blue-800' :
                        res.status === 'pass' ? 'bg-green-950/30 border-green-900/50' :
                        res.status === 'fail' ? 'bg-red-950/30 border-red-900/50' :
                        'bg-slate-900/50 border-slate-800'
                    }`}>
                        <div className="mt-0.5">
                            {res.status === 'pending' && <div className="w-3 h-3 rounded-full border border-slate-600" />}
                            {res.status === 'running' && <div className="w-3 h-3 rounded-full border-t-2 border-blue-500 animate-spin" />}
                            {res.status === 'pass' && <CheckCircle2 size={12} className="text-green-500" />}
                            {res.status === 'fail' && <XCircle size={12} className="text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={`font-bold ${
                                res.status === 'fail' ? 'text-red-300' : 
                                res.status === 'pass' ? 'text-green-300' : 'text-slate-300'
                            }`}>
                                {res.name}
                            </div>
                            <div className="text-slate-500 truncate mt-0.5">{res.message}</div>
                        </div>
                        {res.duration && (
                            <div className="text-[9px] text-slate-600">{res.duration.toFixed(0)}ms</div>
                        )}
                    </div>
                ))}
            </div>

            <div className="p-3 bg-slate-800 border-t border-slate-700">
                <button 
                    onClick={runTests}
                    disabled={isRunning}
                    className={`w-full py-2 rounded font-bold flex items-center justify-center gap-2 transition-all ${
                        isRunning 
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                        : 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg shadow-yellow-900/20'
                    }`}
                >
                    {isRunning ? <RotateCcw className="animate-spin" size={14} /> : <Play size={14} />}
                    RUN REGRESSION SUITE
                </button>
            </div>
        </div>
    );
};