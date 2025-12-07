import React, { useState, useRef, useCallback } from 'react';
import { DEFAULT_PHYSICS, SAMPLE_PROMPTS } from './constants';
import { PhysicsParams, LogEntry, SimulationMode, SpawnMode, ShapeType } from './types';
import ControlPanel from './components/ControlPanel';
import PhysicsScene from './components/PhysicsScene';
import { analyzePhysicsPrompt, generateRealityImage } from './services/geminiService';
import { X } from 'lucide-react';
import { OrbitControls } from '@react-three/drei';

const App: React.FC = () => {
  // State
  const [prompt, setPrompt] = useState(SAMPLE_PROMPTS[0]);
  const [params, setParams] = useState<PhysicsParams>(DEFAULT_PHYSICS);
  const [isPaused, setIsPaused] = useState(false);
  const [shouldReset, setShouldReset] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbitRef = useRef<any>(null); // To reset camera

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
    if (orbitRef.current) {
        orbitRef.current.reset();
    }
  };

  const handleAnalyze = async () => {
    if (!prompt.trim()) return;
    setIsAnalyzing(true);
    addLog(`Configuring simulation for: "${prompt}"...`);

    try {
      const result = await analyzePhysicsPrompt(prompt);
      
      // Update Physics State
      setParams(prev => ({
        ...prev,
        gravity: result.gravity,
        wind: result.wind,
        particleCount: Math.min(result.particleCount, 1200), // Cap for performance with N^2 collision
        spawnMode: result.spawnMode,
        shape: result.shape,
        movementBehavior: result.movementBehavior,
        color: result.color,
        restitution: result.restitution ?? prev.restitution, // Use AI restitution or default
        friction: result.friction ?? prev.friction,
        mass: result.mass ?? prev.mass,
      }));

      // AUTO SPAWN SEQUENCE
      setShouldReset(true); // Trigger respawn
      setIsPaused(false);   // Ensure physics are running
      
      addLog(`Simulation Configured: ${result.explanation}`, 'success');

    } catch (error) {
      addLog(`Configuration Failed: ${(error as Error).message}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSnap = async () => {
    if (!canvasRef.current) {
      addLog('Canvas reference missing. Cannot capture.', 'error');
      return;
    }
    
    setIsSnapping(true);
    const wasPaused = isPaused;
    setIsPaused(true); // Pause for stable capture

    try {
      addLog('Capturing Geometric Ground Truth...', 'info');
      
      // Get Data URL from Canvas
      const dataUrl = canvasRef.current.toDataURL('image/png');
      
      addLog('Generating Photorealistic Skin...', 'info');
      const resultImage = await generateRealityImage(dataUrl, prompt);
      
      setGeneratedImage(resultImage);
      addLog('Reality Snapped Successfully.', 'success');

    } catch (error) {
      addLog(`Generation Failed: ${(error as Error).message}`, 'error');
    } finally {
      setIsSnapping(false);
      if (!wasPaused) setIsPaused(false);
    }
  };

  return (
    <div className="relative h-screen w-screen bg-slate-900 text-white overflow-hidden">
      
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <PhysicsScene 
          ref={canvasRef}
          params={params}
          isPaused={isPaused}
          shouldReset={shouldReset}
          onResetComplete={() => setShouldReset(false)}
          mouseInteraction={!isPaused}
        />
      </div>

      {/* UI Overlay Layer */}
      <ControlPanel 
        prompt={prompt}
        setPrompt={setPrompt}
        onAnalyze={handleAnalyze}
        onSnap={handleSnap}
        params={params}
        setParams={setParams}
        isPaused={isPaused}
        togglePause={() => setIsPaused(!isPaused)}
        onReset={handleReset}
        logs={logs}
        isAnalyzing={isAnalyzing}
        isSnapping={isSnapping}
        resetCamera={handleResetCamera}
      />

      {/* Generated Result Modal */}
      {generatedImage && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300">
           <div className="relative bg-scifi-900 border border-scifi-accent p-1 shadow-[0_0_100px_rgba(244,114,182,0.3)] max-w-6xl w-full h-[80vh] flex flex-col rounded-lg">
              <div className="flex justify-between items-center p-4 bg-scifi-800/50 border-b border-scifi-700 mb-1">
                 <div className="flex items-center gap-4">
                     <h2 className="font-mono text-scifi-accent font-bold tracking-widest text-lg">SNAPLOCK_RENDER_OUTPUT</h2>
                     <span className="text-xs bg-scifi-accent/20 text-scifi-accent px-2 py-1 rounded">GEMINI-3-PRO</span>
                 </div>
                 <button onClick={() => setGeneratedImage(null)} className="hover:text-white text-gray-400 transition-colors">
                   <X className="w-8 h-8"/>
                 </button>
              </div>
              <div className="relative flex-1 overflow-hidden bg-black flex items-center justify-center">
                 <img src={generatedImage} alt="Generated Reality" className="max-w-full max-h-full object-contain shadow-2xl" />
              </div>
              <div className="p-4 bg-scifi-800 text-xs text-gray-400 font-mono border-t border-scifi-700 flex justify-between">
                 <span>GEOMETRY: LOCKED</span>
                 <span>PHYSICS: VERLET_INTEGRATION</span>
                 <span>RENDER: PHOTOREALISTIC</span>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;