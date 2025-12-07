import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DEFAULT_PHYSICS, SAMPLE_PROMPTS } from './constants';
import { PhysicsParams, LogEntry, ViewMode, TelemetryData } from './types';
import ControlPanel from './components/ControlPanel';
import PhysicsScene, { PhysicsSceneHandle } from './components/PhysicsScene';
import { analyzePhysicsPrompt, generateRealityImage, analyzeSceneStability, generateSimulationVideo, generateCreativePrompt } from './services/geminiService';
import { AdversarialDirector } from './services/adversarialDirector';
import { X } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.RGB);
  
  // Auto Spawn State
  const [isAutoSpawn, setIsAutoSpawn] = useState(false);
  const isAutoSpawnRef = useRef(false); // Ref to track state inside async closures
  const autoSpawnTimerRef = useRef<number | null>(null);
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  
  // Adversarial Director State
  const [isDirectorActive, setIsDirectorActive] = useState(false);
  const directorIntervalRef = useRef<number | null>(null);

  // Refs
  const sceneRef = useRef<PhysicsSceneHandle>(null);
  const canvasRef = useRef<HTMLDivElement>(null); // To capture the container for screenshots
  
  const telemetryRef = useRef<TelemetryData>({
     fps: 0,
     particleCount: 0,
     systemEnergy: 0,
     avgVelocity: 0,
     maxVelocity: 0,
     simTime: 0,
     isWarmup: false
  });

  // Sync ref with state
  useEffect(() => {
    isAutoSpawnRef.current = isAutoSpawn;
  }, [isAutoSpawn]);

  // Clean up Blob URLs to prevent memory leaks
  useEffect(() => {
      return () => {
          if (generatedVideo) URL.revokeObjectURL(generatedVideo);
      };
  }, [generatedVideo]);

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

  const executeAnalysis = async (inputPrompt: string) => {
    if (!inputPrompt.trim()) return;
    setIsAnalyzing(true);
    addLog(`Configuring simulation for: "${inputPrompt}"...`);

    try {
      const result = await analyzePhysicsPrompt(inputPrompt);
      
      // Safety check: if auto-spawn was disabled during the request, don't apply changes
      // unless it was a manual request (we assume manual requests override this)
      if (isAutoSpawnRef.current || !isAutoSpawnRef.current) { // Logic simplified: manual always applies, auto logic handled in loop
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
      }

    } catch (error) {
      addLog(`Configuration Failed: ${(error as Error).message}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = () => executeAnalysis(prompt);

  const handleSnap = async () => {
    const canvas = document.querySelector('canvas');
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
      
      setGeneratedImage(resultImage);
      if (generatedVideo) {
          URL.revokeObjectURL(generatedVideo);
          setGeneratedVideo(null); 
      }
      addLog('Reality Snapped Successfully.', 'success');

    } catch (error) {
      addLog(`Generation Failed: ${(error as Error).message}`, 'error');
    } finally {
      setIsSnapping(false);
      if (!wasPaused) setIsPaused(false);
    }
  };

  const handleGenerateVideo = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    setIsGeneratingVideo(true);
    const wasPaused = isPaused;
    setIsPaused(true); 
    addLog('Initializing Temporal Video Engine...', 'info');

    try {
        const dataUrl = canvas.toDataURL('image/png');
        addLog('Video Engine: Generating stream from simulation state...', 'info');
        
        const videoUrl = await generateSimulationVideo(dataUrl, prompt);
        
        if (generatedVideo) URL.revokeObjectURL(generatedVideo); // Cleanup old
        setGeneratedVideo(videoUrl);
        setGeneratedImage(null); 
        addLog('Video Engine: Render Complete.', 'success');
    } catch (error) {
        addLog(`Video Engine Error: ${(error as Error).message}`, 'error');
    } finally {
        setIsGeneratingVideo(false);
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
            // Check ref to ensure we are still in auto mode when callback fires
            if (!isAutoSpawnRef.current) return;
            if (isAnalyzing) return;
            
            const creativePrompt = await generateCreativePrompt();
            setPrompt(creativePrompt);
            await executeAnalysis(creativePrompt);
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
  }, [isAutoSpawn]); // Intentionally don't dep isAnalyzing to avoid restarting timer

  // --- ADVERSARIAL DIRECTOR LOOP ---
  useEffect(() => {
    let isProcessing = false;

    if (isDirectorActive) {
      addLog('Adversarial Director: Online (Scanning every 6s)', 'director');
      
      const runDirectorCycle = async () => {
         const canvas = document.querySelector('canvas');
         if (!canvas) return;
         if (isPaused) return; 
         if (isProcessing) return; // Prevent Overlap

         isProcessing = true;
         
         // 1. Capture Snapshot
         // Use lower quality (0.5) to reduce payload size and latency
         const dataUrl = canvas.toDataURL('image/png', 0.5); 
         
         // 2. Analyze (VLM)
         try {
             const instruction = await analyzeSceneStability(dataUrl);
             
             if (instruction.action !== 'NONE') {
                addLog(`DIRECTOR: ${instruction.action} (${instruction.reasoning})`, 'director');
                
                // 3. Modify Physics
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

      {/* UI Overlay Layer */}
      <ControlPanel 
        prompt={prompt}
        setPrompt={setPrompt}
        onAnalyze={handleAnalyze}
        onSnap={handleSnap}
        onGenerateVideo={handleGenerateVideo}
        params={params}
        setParams={setParams}
        isPaused={isPaused}
        togglePause={() => setIsPaused(!isPaused)}
        onReset={handleReset}
        logs={logs}
        isAnalyzing={isAnalyzing}
        isSnapping={isSnapping}
        isGeneratingVideo={isGeneratingVideo}
        resetCamera={handleResetCamera}
        isDirectorActive={isDirectorActive}
        toggleDirector={() => setIsDirectorActive(!isDirectorActive)}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isAutoSpawn={isAutoSpawn}
        toggleAutoSpawn={() => setIsAutoSpawn(!isAutoSpawn)}
        telemetryRef={telemetryRef}
      />

      {/* Generated Result Modal */}
      {(generatedImage || generatedVideo) && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300">
           <div className="relative bg-scifi-900 border border-scifi-accent p-1 shadow-[0_0_100px_rgba(244,114,182,0.3)] max-w-6xl w-full h-[80vh] flex flex-col rounded-lg">
              <div className="flex justify-between items-center p-4 bg-scifi-800/50 border-b border-scifi-700 mb-1">
                 <div className="flex items-center gap-4">
                     <h2 className="font-mono text-scifi-accent font-bold tracking-widest text-lg">RENDER OUTPUT</h2>
                     <span className="text-xs bg-scifi-accent/20 text-scifi-accent px-2 py-1 rounded">
                         {generatedVideo ? 'TEMPORAL SYNTHESIS (VEO 3.1)' : 'PHOTOREALISTIC GENERATION (GEMINI 3 PRO IMAGE)'}
                     </span>
                 </div>
                 <button onClick={() => { setGeneratedImage(null); if (generatedVideo) { URL.revokeObjectURL(generatedVideo); setGeneratedVideo(null); } }} className="hover:text-white text-gray-400 transition-colors">
                   <X className="w-8 h-8"/>
                 </button>
              </div>
              <div className="relative flex-1 overflow-hidden bg-black flex items-center justify-center">
                 {generatedVideo ? (
                    <video src={generatedVideo} controls autoPlay loop className="max-w-full max-h-full object-contain shadow-2xl" />
                 ) : (
                    <img src={generatedImage!} alt="Generated Reality" className="max-w-full max-h-full object-contain shadow-2xl" />
                 )}
              </div>
              <div className="p-4 bg-scifi-800 text-xs text-gray-400 font-mono border-t border-scifi-700 flex justify-between">
                 <span>GEOMETRY: LOCKED</span>
                 <span>PHYSICS: VERLET_INTEGRATION</span>
                 <span>RENDER: {generatedVideo ? 'TEMPORAL_SYNTHESIS' : 'PHOTOREALISTIC'}</span>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;