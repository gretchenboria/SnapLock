

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DEFAULT_PHYSICS, SAMPLE_PROMPTS } from './constants';
import { PhysicsParams, LogEntry, ViewMode, TelemetryData } from './types';
import PhysicsScene, { PhysicsSceneHandle } from './components/PhysicsScene';
import { analyzePhysicsPrompt, generateRealityImage, analyzeSceneStability, generateSimulationVideo, generateCreativePrompt, generateSimulationReport } from './services/geminiService';
import { AdversarialDirector } from './services/adversarialDirector';
import { TestDashboard } from './components/TestDashboard';

const App: React.FC = () => {
  // State
  const [prompt, setPrompt] = useState(SAMPLE_PROMPTS[0]);
  const [params, setParams] = useState<PhysicsParams>(DEFAULT_PHYSICS);
  const [isPaused, setIsPaused] = useState(false);
  const [shouldReset, setShouldReset] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.RGB);
  
  // Auto Spawn State
  const [isAutoSpawn, setIsAutoSpawn] = useState(false);
  const isAutoSpawnRef = useRef(false); // Ref to track state inside async closures
  const autoSpawnTimerRef = useRef<number | null>(null);

  // Adversarial Director State
  const [isDirectorActive, setIsDirectorActive] = useState(false);
  const directorIntervalRef = useRef<number | null>(null);

  // Refs
  const sceneRef = useRef<PhysicsSceneHandle>(null);
  const canvasRef = useRef<HTMLDivElement>(null); // To capture the container for screenshots
  
  // Test Mode Detection
  const [isTestMode, setIsTestMode] = useState(false);
  
  const telemetryRef = useRef<TelemetryData>({
     fps: 0,
     particleCount: 0,
     systemEnergy: 0,
     avgVelocity: 0,
     maxVelocity: 0,
     stabilityScore: 0,
     simTime: 0,
     isWarmup: false
  });

  // Sync ref with state
  useEffect(() => {
    isAutoSpawnRef.current = isAutoSpawn;
  }, [isAutoSpawn]);
  
  // Initialize Test Mode & Hooks
  useEffect(() => {
      const isTesting = new URLSearchParams(window.location.search).get('test') === 'true';
      setIsTestMode(isTesting);
      
      if (isTesting) {
          // Disable Auto Spawn in Test Mode to prevent interference
          setIsAutoSpawn(false);
          isAutoSpawnRef.current = false;
      }
  }, []);

  // Update Test Hooks continuously as state changes
  useEffect(() => {
      if (isTestMode) {
          window.snaplock = {
              sceneRef,
              telemetryRef,
              setParams: (p) => setParams(p),
              getParams: () => params,
              resetSim: () => setShouldReset(true),
              togglePause: () => setIsPaused(prev => !prev),
              setPrompt: (s) => setPrompt(s),
              clickAnalyze: () => handleAnalyze()
          };
      }
  }, [isTestMode, params, isPaused, prompt]); // Re-bind when crucial state changes

  // Helpers
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [...prev, entry]);
  }, []);

  const handleReset = () => {
    setShouldReset(true);
  };
  
  const handleResetCamera = () => {
    if (sceneRef.current) {
        sceneRef.current.resetCamera();
    }
  };

  const executeAnalysis = async (inputPrompt: string, source: 'MANUAL' | 'AUTO' = 'MANUAL') => {
    if (!inputPrompt.trim()) return;
    
    // SAFETY CHECK: If this is an auto-spawn request, but the user has turned off auto-spawn
    // since the request started, we MUST ABORT to prevent overwriting user input/state.
    if (source === 'AUTO' && !isAutoSpawnRef.current) {
        return;
    }

    setIsAnalyzing(true);
    addLog(`Configuring simulation for: "${inputPrompt}"...`);

    try {
      const result = await analyzePhysicsPrompt(inputPrompt);
      
      // DOUBLE CHECK: Re-verify state after the async operation returns
      if (source === 'AUTO' && !isAutoSpawnRef.current) {
          console.log("Auto-spawn aborted due to user interruption.");
          return;
      }

      // Update Physics State
      setParams(prev => ({
        ...prev,
        gravity: result.gravity,
        wind: result.wind,
        movementBehavior: result.movementBehavior,
        assetGroups: result.assetGroups.map(g => ({
            ...g,
            // Ensure logic bounds
            count: Math.min(g.count, 1000), 
            scale: Math.max(0.1, Math.min(g.scale, 5.0))
        }))
      }));

      // Reset triggers
      setShouldReset(true); 
      setIsPaused(false);   
      
      addLog(`Simulation Configured: ${result.explanation}`, 'success');

    } catch (error) {
      addLog(`Configuration Failed: ${(error as Error).message}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = () => executeAnalysis(prompt, 'MANUAL');

  const handleSnap = async () => {
    // Explicit Cast for TypeScript Build
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) {
      addLog('Canvas reference missing. Cannot capture.', 'error');
      return;
    }
    
    setIsSnapping(true);
    const wasPaused = isPaused;
    setIsPaused(true); // Pause for stable capture

    try {
      addLog('Capturing Geometric Ground Truth...', 'info');
      
      // Get Data URL from Canvas
      const dataUrl = canvas.toDataURL('image/png');
      
      addLog('Generating Photorealistic Skin...', 'info');
      const resultImage = await generateRealityImage(dataUrl, prompt);

      addLog('Reality Snapped Successfully.', 'success');
      // Image generation complete but not displayed in simplified UI

    } catch (error) {
      addLog(`Generation Failed: ${(error as Error).message}`, 'error');
    } finally {
      setIsSnapping(false);
      if (!wasPaused) setIsPaused(false);
    }
  };

  const handleGenerateVideo = async () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    setIsGeneratingVideo(true);
    const wasPaused = isPaused;
    setIsPaused(true); 
    addLog('Initializing Temporal Video Engine...', 'info');

    try {
        const dataUrl = canvas.toDataURL('image/png');
        addLog('Video Engine: Generating stream from simulation state...', 'info');

        const videoUrl = await generateSimulationVideo(dataUrl, prompt);

        addLog('Video Engine: Render Complete.', 'success');
        // Video generation complete but not displayed in simplified UI
        URL.revokeObjectURL(videoUrl); // Cleanup immediately
    } catch (error) {
        addLog(`Video Engine Error: ${(error as Error).message}`, 'error');
    } finally {
        setIsGeneratingVideo(false);
        if (!wasPaused) setIsPaused(false);
    }
  };

  const handleDownloadCSV = useCallback(() => {
    if (!sceneRef.current) return;
    
    // 1. Capture Data
    const particles = sceneRef.current.captureSnapshot();
    if (particles.length === 0) {
        addLog('No simulation data available to export.', 'warning');
        return;
    }

    // 2. Format Metadata Header (Physics Config)
    const metadata = [
        `# SNAPLOCK SYNTHETIC DATA EXPORT`,
        `# Timestamp: ${new Date().toISOString()}`,
        `# Gravity: [${params.gravity.x}, ${params.gravity.y}, ${params.gravity.z}]`,
        `# Wind: [${params.wind.x}, ${params.wind.y}, ${params.wind.z}]`,
        `# Behavior: ${params.movementBehavior}`,
        `# Asset Groups: ${params.assetGroups.length}`
    ].join('\n');

    // 3. Format CSV Columns
    const headers = ['frame_id', 'particle_id', 'group_id', 'shape', 'mass', 'pos_x', 'pos_y', 'pos_z', 'vel_x', 'vel_y', 'vel_z', 'rot_x', 'rot_y', 'rot_z'];
    
    // Simple placeholder frame_id = 0 for single snapshot
    const rows = particles.map(p => [
        0,
        p.id, p.groupId, p.shape, p.mass,
        p.position.x.toFixed(4), p.position.y.toFixed(4), p.position.z.toFixed(4),
        p.velocity.x.toFixed(4), p.velocity.y.toFixed(4), p.velocity.z.toFixed(4),
        p.rotation.x.toFixed(4), p.rotation.y.toFixed(4), p.rotation.z.toFixed(4)
    ].join(','));

    const csvContent = `${metadata}\n${headers.join(',')}\n${rows.join('\n')}`;
    
    // 4. Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `snaplock_sim_data_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog(`Exported ${particles.length} particle records to CSV.`, 'success');

  }, [addLog, params]);

  const handleGenerateReport = async () => {
      setIsGeneratingReport(true);
      const wasPaused = isPaused;
      setIsPaused(true);

      try {
          addLog("Compiling Simulation Audit Report...", "info");
          const htmlContent = await generateSimulationReport(params, telemetryRef.current);
          
          const printWindow = window.open('', '_blank');
          if (printWindow) {
              printWindow.document.write(htmlContent);
              printWindow.document.close();
              printWindow.focus();
              setTimeout(() => {
                  printWindow.print();
                  printWindow.close();
              }, 500);
          }
          addLog("Report Generated.", "success");
      } catch (e) {
          addLog("Failed to generate report.", "error");
      } finally {
          setIsGeneratingReport(false);
          if (!wasPaused) setIsPaused(false);
      }
  };

  // --- AUTO SPAWN LOOP ---
  useEffect(() => {
    if (isAutoSpawn) {
        if (!autoSpawnTimerRef.current) {
            addLog("Auto Spawn: Active (15s Cycle)", "info");
        }
        
        const spawnCycle = async () => {
            if (!isAutoSpawnRef.current) return;
            if (isAnalyzing) return;
            
            const creativePrompt = await generateCreativePrompt();
            
            // Check again before executing
            if (!isAutoSpawnRef.current) return; 
            
            setPrompt(creativePrompt);
            await executeAnalysis(creativePrompt, 'AUTO');
        };

        // Initial run if not already running
        if (!autoSpawnTimerRef.current) {
             spawnCycle(); 
        }

        autoSpawnTimerRef.current = window.setInterval(spawnCycle, 15000) as unknown as number;
    } else {
        if (autoSpawnTimerRef.current) {
            window.clearInterval(autoSpawnTimerRef.current);
            autoSpawnTimerRef.current = null;
            addLog("Auto Spawn: Disabled", "info");
        }
    }
    return () => {
        if (autoSpawnTimerRef.current) window.clearInterval(autoSpawnTimerRef.current);
    }
  }, [isAutoSpawn]); 

  // --- ADVERSARIAL DIRECTOR LOOP ---
  useEffect(() => {
    let isProcessing = false;

    if (isDirectorActive) {
      addLog('Adversarial Director: Online (Scanning every 6s)', 'director');
      
      const runDirectorCycle = async () => {
         const canvas = document.querySelector('canvas') as HTMLCanvasElement;
         if (!canvas) return;
         if (isPaused) return; 
         if (isProcessing) return; 

         isProcessing = true;
         
         const dataUrl = canvas.toDataURL('image/png', 0.5); 
         
         try {
             const instruction = await analyzeSceneStability(dataUrl);
             
             if (instruction.action !== 'NONE') {
                addLog(`DIRECTOR: ${instruction.action} (${instruction.reasoning})`, 'director');
                setParams(current => AdversarialDirector.applyDisturbance(current, instruction));
             }
         } catch (e) {
             console.error("Director cycle failed", e);
             addLog(`DIRECTOR ERROR: ${(e as Error).message}`, 'error');
         } finally {
             isProcessing = false;
         }
      };

      directorIntervalRef.current = window.setInterval(runDirectorCycle, 6000) as unknown as number;
    } else {
      if (directorIntervalRef.current !== null) {
        window.clearInterval(directorIntervalRef.current);
        directorIntervalRef.current = null;
        addLog('Adversarial Director: Offline', 'info');
      }
    }

    return () => {
      if (directorIntervalRef.current !== null) window.clearInterval(directorIntervalRef.current);
    };
  }, [isDirectorActive, addLog, isPaused]);

  return (
    <div ref={canvasRef} className="relative h-screen w-screen bg-slate-900 text-white overflow-hidden">

      {/* Test Dashboard Overlay */}
      {isTestMode && <TestDashboard />}

      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <PhysicsScene
          ref={sceneRef}
          params={params}
          isPaused={isPaused}
          shouldReset={shouldReset}
          onResetComplete={() => setShouldReset(false)}
          mouseInteraction={!isPaused}
          viewMode={viewMode}
          telemetryRef={telemetryRef}
        />
      </div>

      {/* Simplified Prompt Input - Bottom Center */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-4xl px-4">
        <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl">
          <div className="flex gap-2 p-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isAnalyzing) {
                  handleAnalyze();
                }
              }}
              placeholder="Describe physics scenario..."
              className="flex-1 bg-transparent border-none text-white placeholder-gray-500 focus:outline-none text-lg px-2"
              disabled={isAnalyzing}
            />
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded font-medium transition-colors"
            >
              {isAnalyzing ? 'Processing...' : 'Execute'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;