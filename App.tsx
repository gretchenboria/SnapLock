

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DEFAULT_PHYSICS } from './constants';
import { PhysicsParams, LogEntry, ViewMode, TelemetryData, VRHand } from './types';
import ControlPanel from './components/ControlPanel';
import PhysicsScene, { PhysicsSceneHandle } from './components/PhysicsScene';
import { analyzePhysicsPrompt, analyzeSceneStability, generateCreativePrompt, generateSimulationReport, generatePhotorealisticScene } from './services/geminiService';
import { ChaosMode } from './services/chaosMode';
import { validateAndSanitize, ValidationOntology } from './services/validationService';
import { LazarusDebugger } from './services/lazarusDebugger';
import { MLExportService } from './services/mlExportService';
import { askSnappy } from './services/snappyChatbot';
import { ProceduralSceneGenerator, SceneTemplate } from './services/proceduralSceneGenerator';
import { X, Home, Users, Gamepad2, Palette, Globe } from 'lucide-react';
import { MLExportModal } from './components/MLExportModal';
import { TestDashboard } from './components/TestDashboard';
import { GuidedTour } from './components/GuidedTour';
import { FloatingCharacters } from './components/FloatingCharacters';
import { SnappyChatbot } from './components/SnappyChatbot';
import { ChaosActivityPanel } from './components/ChaosActivityPanel';

const App: React.FC = () => {
  // State
  const [prompt, setPrompt] = useState('');
  const [params, setParams] = useState<PhysicsParams>(DEFAULT_PHYSICS);

  // Guided Tour State
  const [showGuidedTour, setShowGuidedTour] = useState(() => {
    return !localStorage.getItem('snaplock_tour_completed');
  });
  const [isPaused, setIsPaused] = useState(false);
  const [shouldReset, setShouldReset] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.RGB);
  
  // Auto Spawn State - DEFAULT ON for blank slate workflow
  const [isAutoSpawn, setIsAutoSpawn] = useState(true);
  const isAutoSpawnRef = useRef(true); // Ref to track state inside async closures
  const autoSpawnTimerRef = useRef<number | null>(null);
  const isAnalyzingRef = useRef(false); // Ref to avoid stale closure in intervals

  // Chaos Mode State
  const [isChaosActive, setIsChaosActive] = useState(false);
  const [chaosActivity, setChaosActivity] = useState<string>('');
  const chaosIntervalRef = useRef<number | null>(null);

  // Lazarus Diagnostics State
  const [lazarusStatus, setLazarusStatus] = useState<'HEALTHY' | 'WARNING' | 'CRITICAL' | 'ERROR'>('HEALTHY');
  const [lazarusSummary, setLazarusSummary] = useState<string>('All systems operational');

  // Snappy Assistant State
  const [isSnappyEnabled, setIsSnappyEnabled] = useState(false);

  // ML Export State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedFrameCount, setRecordedFrameCount] = useState(0);
  const recordingIntervalRef = useRef<number | null>(null);

  // Procedural Scene Generator State
  const [showRoomSelector, setShowRoomSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SceneTemplate>(SceneTemplate.LOUNGE);
  const [roomSize, setRoomSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [objectDensity, setObjectDensity] = useState<'sparse' | 'medium' | 'dense'>('medium');
  const [colorTheme, setColorTheme] = useState<'vibrant' | 'pastel' | 'neon' | 'natural'>('vibrant');

  // VR Hands State (keyboard-controlled for testing)
  const [vrHands, setVRHands] = useState<VRHand[]>([]);

  // ML Export Modal State
  const [showMLExportModal, setShowMLExportModal] = useState(false);

  // Photorealistic Rendering State
  const [photorealisticImage, setPhotorealisticImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showPhotorealistic, setShowPhotorealistic] = useState(true);

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
     isWarmup: false,
     activeCollisions: 0,
     physicsSteps: 0
  });

  // Sync refs with state
  useEffect(() => {
    isAutoSpawnRef.current = isAutoSpawn;
  }, [isAutoSpawn]);

  useEffect(() => {
    isAnalyzingRef.current = isAnalyzing;
  }, [isAnalyzing]);
  
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

  // Load Initial Scene on Mount (prevent blank canvas on startup)
  useEffect(() => {
      // Generate initial procedural scene so users see something immediately
      const templates = Object.values(SceneTemplate);
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      const roomSizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
      const densities: Array<'sparse' | 'medium' | 'dense'> = ['sparse', 'medium', 'dense'];
      const themes: Array<'vibrant' | 'pastel' | 'neon' | 'natural'> = ['vibrant', 'pastel', 'neon', 'natural'];

      const initialParams = ProceduralSceneGenerator.generateScene({
          template: randomTemplate,
          roomSize: roomSizes[Math.floor(Math.random() * roomSizes.length)],
          objectDensity: densities[Math.floor(Math.random() * densities.length)],
          colorTheme: themes[Math.floor(Math.random() * themes.length)]
      });

      setParams(initialParams);
      setShouldReset(true);
      console.log(`[SnapLock] Initial scene loaded: ${randomTemplate}`);
  }, []); // Empty dependency array - run once on mount

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
    // Clear all asset groups to completely empty the scene
    setParams(prev => ({
      ...prev,
      assetGroups: []
    }));
    setShouldReset(true);
    addLog('Scene cleared - all objects removed', 'info');
  };
  
  const handleResetCamera = () => {
    if (sceneRef.current) {
        sceneRef.current.resetCamera();
    }
  };

  const executeAnalysis = useCallback(async (inputPrompt: string, source: 'MANUAL' | 'AUTO' = 'MANUAL') => {
    if (!inputPrompt.trim()) return;

    // SAFETY CHECK: If this is an auto-spawn request, but the user has turned off auto-spawn
    // since the request started, we MUST ABORT to prevent overwriting user input/state.
    if (source === 'AUTO' && !isAutoSpawnRef.current) {
        return;
    }

    setIsAnalyzing(true);
    addLog(`Configuring simulation for: "${inputPrompt}"...`);

    try {
      addLog('Analyzing prompt with AI...', 'info');
      const result = await analyzePhysicsPrompt(inputPrompt);

      console.log('[SPAWN DEBUG] AI Result:', result);
      addLog(`AI extracted ${result.assetGroups.length} object groups`, 'info');

      // DOUBLE CHECK: Re-verify state after the async operation returns
      if (source === 'AUTO' && !isAutoSpawnRef.current) {
          return;
      }

      // Construct new params from AI result
      const newParams: PhysicsParams = {
        gravity: result.gravity,
        wind: result.wind,
        movementBehavior: result.movementBehavior,
        assetGroups: result.assetGroups
      };

      console.log('[SPAWN DEBUG] New Params:', newParams);

      // VALIDATION & SANITIZATION - Ensure data integrity
      const validatedParams = validateAndSanitize(newParams);

      console.log('[SPAWN DEBUG] Validated Params:', validatedParams);

      // Update Physics State with validated params
      setParams(validatedParams);

      // Reset triggers
      setShouldReset(true);
      setIsPaused(false);

      addLog(`✓ Spawned ${validatedParams.assetGroups.length} groups - ${result.explanation}`, 'success');

      // Generate photorealistic image
      if (showPhotorealistic) {
        setIsGeneratingImage(true);
        addLog('🎨 Generating photorealistic render...', 'info');
        try {
          const realisticImage = await generatePhotorealisticScene(result.explanation);
          setPhotorealisticImage(realisticImage);
          addLog('✓ Photorealistic render complete', 'success');
        } catch (imageError) {
          console.error('[PHOTOREALISTIC ERROR]', imageError);
          addLog('⚠️ Photorealistic rendering unavailable (using geometric render)', 'warning');
          setPhotorealisticImage(null);
        } finally {
          setIsGeneratingImage(false);
        }
      }

    } catch (error) {
      const errorMsg = (error as Error).message;
      console.error('[SPAWN ERROR]', error);

      // Provide helpful error messages for common issues
      if (errorMsg.includes('API') || errorMsg.includes('key') || errorMsg.includes('401') || errorMsg.includes('403')) {
        addLog(`❌ SPAWN FAILED: Missing API key`, 'error');
        addLog(`Click API button (top-right) to configure your Gemini API key`, 'warning');
      } else if (errorMsg.includes('backend') || errorMsg.includes('network') || errorMsg.includes('fetch')) {
        addLog(`❌ SPAWN FAILED: Backend unavailable`, 'error');
        addLog(`Check network connection or configure API key directly`, 'warning');
      } else {
        addLog(`❌ SPAWN FAILED: ${errorMsg}`, 'error');
        console.error('[SPAWN ERROR DETAILS]', error);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [addLog]);

  const handleAnalyze = useCallback(() => executeAnalysis(prompt, 'MANUAL'), [prompt, executeAnalysis]);

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
  }, [isTestMode, params, isPaused, prompt, handleAnalyze]);

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

  const handleRunDiagnostics = async () => {
      addLog("Running Lazarus Diagnostics...", "info");

      try {
          const report = await LazarusDebugger.runDiagnostics(
              params,
              telemetryRef.current,
              logs,
              {
                  prompt,
                  isAutoSpawn,
                  isPaused,
                  isAnalyzing,
                  isChaosActive
              }
          );

          // Format and log report
          const formattedReport = LazarusDebugger.formatReport(report);
          console.log(formattedReport);

          // Add summary to logs
          addLog(`Diagnostics Complete: ${report.overallStatus}`,
                 report.overallStatus === 'HEALTHY' ? 'success' :
                 report.overallStatus === 'CRITICAL' ? 'error' : 'warning');

          if (report.errors.length > 0) {
              addLog(`Found ${report.errors.length} errors - see console for details`, 'error');
          }

          if (report.warnings.length > 0) {
              addLog(`Found ${report.warnings.length} warnings - see console for details`, 'warning');
          }

          // Show alert with summary
          alert(`LAZARUS DIAGNOSTIC REPORT\n\nStatus: ${report.overallStatus}\n${report.summary}\n\nErrors: ${report.errors.length}\nWarnings: ${report.warnings.length}\n\nFull report available in browser console.`);

      } catch (error) {
          addLog(`Diagnostics failed: ${(error as Error).message}`, 'error');
          console.error('Lazarus diagnostics error:', error);
      }
  };

  // --- ML GROUND TRUTH EXPORT HANDLERS ---
  const handleCaptureMLFrame = useCallback(() => {
      if (!sceneRef.current?.captureMLGroundTruth) {
          addLog('ML ground truth capture not available (using old SimulationLayer?)', 'error');
          return;
      }

      try {
          const groundTruth = sceneRef.current.captureMLGroundTruth();
          MLExportService.addFrame(groundTruth);
          setRecordedFrameCount(MLExportService.getBufferSize());
          addLog(`ML frame captured (${MLExportService.getBufferSize()} total)`, 'success');
      } catch (error) {
          addLog(`Failed to capture ML frame: ${(error as Error).message}`, 'error');
      }
  }, []);

  const handleStartRecording = useCallback(() => {
      if (!sceneRef.current?.captureMLGroundTruth) {
          addLog('ML ground truth capture not available', 'error');
          return;
      }

      setIsRecording(true);
      MLExportService.clearBuffer();
      setRecordedFrameCount(0);
      addLog('Started ML sequence recording (30 FPS)', 'info');

      // Record at 30 FPS (every ~33ms)
      recordingIntervalRef.current = window.setInterval(() => {
          try {
              const groundTruth = sceneRef.current?.captureMLGroundTruth();
              if (groundTruth) {
                  MLExportService.addFrame(groundTruth);
                  setRecordedFrameCount(MLExportService.getBufferSize());
              }
          } catch (error) {
              console.error('Recording frame error:', error);
          }
      }, 33); // ~30 FPS
  }, []);

  const handleStopRecording = useCallback(() => {
      if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
      }
      setIsRecording(false);
      const frameCount = MLExportService.getBufferSize();
      addLog(`Stopped recording. ${frameCount} frames captured.`, 'success');
  }, []);

  const handleExportCOCO = useCallback(() => {
      try {
          // Validate before export
          const validation = MLExportService.validateCurrentBuffer();

          if (!validation.coco.valid) {
              addLog(`COCO validation failed: ${validation.coco.errors.join(', ')}`, 'error');
              console.error('[COCO Validation]', validation.coco);
              return;
          }

          if (validation.coco.warnings.length > 0) {
              addLog(`COCO warnings: ${validation.coco.warnings.join(', ')}`, 'warning');
          }

          const dataset = MLExportService.exportSequenceCOCO();
          const json = JSON.stringify(dataset, null, 2);
          MLExportService.downloadFile(
              `snaplock_coco_${Date.now()}.json`,
              json,
              'application/json'
          );
          addLog(`COCO dataset exported (${dataset.images.length} images, ${dataset.annotations.length} annotations) - VALIDATED`, 'success');
      } catch (error) {
          addLog(`COCO export failed: ${(error as Error).message}`, 'error');
      }
  }, [addLog]);

  const handleExportYOLO = useCallback(() => {
      try {
          // Validate before export
          const validation = MLExportService.validateCurrentBuffer();

          if (!validation.yolo.valid) {
              addLog(`YOLO validation failed: ${validation.yolo.errors.join(', ')}`, 'error');
              console.error('[YOLO Validation]', validation.yolo);
              return;
          }

          if (validation.yolo.warnings.length > 0) {
              addLog(`YOLO warnings: ${validation.yolo.warnings.join(', ')}`, 'warning');
          }

          const files = MLExportService.exportSequenceYOLO();
          addLog(`Exporting ${files.size} YOLO files...`, 'info');

          // Download each file
          files.forEach((content, filename) => {
              MLExportService.downloadFile(filename, content, 'text/plain');
          });

          addLog(`YOLO dataset exported (${files.size} files) - VALIDATED`, 'success');
      } catch (error) {
          addLog(`YOLO export failed: ${(error as Error).message}`, 'error');
      }
  }, [addLog]);

  const handleExportDepth = useCallback(() => {
      addLog('Depth map export coming soon - will generate 16-bit PNG depth maps for spatial understanding', 'info');
  }, [addLog]);

  const handleExportSegmentation = useCallback(() => {
      addLog('Segmentation mask export coming soon - will generate semantic masks (floor, walls, furniture, objects)', 'info');
  }, [addLog]);

  const handleExportVRPoses = useCallback(() => {
      addLog('VR hand pose export coming soon - will export industry-standard hand poses with grasp annotations', 'info');
  }, [addLog]);

  const handleExportPhysics = useCallback(() => {
      addLog('Physics ground truth export coming soon - will export complete physics state for validation', 'info');
  }, [addLog]);

  const handleOpenMLExportModal = useCallback(() => {
      setShowMLExportModal(true);
  }, []);

  // Cleanup recording on unmount
  useEffect(() => {
      return () => {
          if (recordingIntervalRef.current) {
              clearInterval(recordingIntervalRef.current);
          }
      };
  }, []);

  // --- AUTO SPAWN LOOP ---
  // Auto-spawn generates scene variations from the SAME prompt for synthetic dataset generation
  // It does NOT change the prompt - that stays fixed until user changes it manually
  useEffect(() => {
    if (isAutoSpawn) {
        if (!autoSpawnTimerRef.current) {
            addLog("Auto Spawn: Active - generating procedural room variations for dataset", "info");
        }

        const spawnCycle = () => {
            if (!isAutoSpawnRef.current) return;

            // If user has entered a prompt, use AI to generate objects from that prompt
            // Otherwise, use random procedural generation
            if (prompt.trim()) {
                // AI generation from user's prompt
                addLog(`Auto Spawn: Generating from prompt "${prompt}"`, 'info');
                executeAnalysis(prompt, 'AUTO');
            } else {
                // Random procedural room generation
                const templates = Object.values(SceneTemplate);
                const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

                const roomSizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
                const densities: Array<'sparse' | 'medium' | 'dense'> = ['sparse', 'medium', 'dense'];
                const themes: Array<'vibrant' | 'pastel' | 'neon' | 'natural'> = ['vibrant', 'pastel', 'neon', 'natural'];

                const randomRoomSize = roomSizes[Math.floor(Math.random() * roomSizes.length)];
                const randomDensity = densities[Math.floor(Math.random() * densities.length)];
                const randomTheme = themes[Math.floor(Math.random() * themes.length)];

                try {
                    const generatedParams = ProceduralSceneGenerator.generateScene({
                        template: randomTemplate,
                        roomSize: randomRoomSize,
                        objectDensity: randomDensity,
                        colorTheme: randomTheme
                    });

                    // Add VR hands if they exist
                    generatedParams.vrHands = vrHands.length > 0 ? vrHands : undefined;

                    setParams(generatedParams);
                    setShouldReset(true);

                    addLog(`Auto Spawn: ${randomTemplate} (${randomRoomSize}, ${randomDensity}, ${randomTheme})`, 'success');
                } catch (error) {
                    addLog(`Auto Spawn failed: ${(error as Error).message}`, 'error');
                }
            }
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
  }, [isAutoSpawn, vrHands, addLog, prompt, executeAnalysis]); 

  // --- CHAOS MODE LOOP ---
  useEffect(() => {
    let isProcessing = false;

    if (isChaosActive) {
      addLog('Chaos Mode: Active (Scanning every 6s)', 'chaos');

      const runChaosCycle = async () => {
         const canvas = document.querySelector('canvas') as HTMLCanvasElement;
         if (!canvas) return;
         if (isPaused) return; 
         if (isProcessing) return; 

         isProcessing = true;
         
         const dataUrl = canvas.toDataURL('image/png', 0.5); 
         
         try {
             const instruction = await analyzeSceneStability(dataUrl);

             if (instruction.action !== 'NONE') {
                addLog(`CHAOS: ${instruction.action} (${instruction.reasoning})`, 'chaos');
                setChaosActivity(`${instruction.action}: ${instruction.reasoning}`);
                setParams(current => ChaosMode.applyDisturbance(current, instruction));
             } else {
                setChaosActivity('Monitoring scene...');
             }
         } catch (e) {
             console.error("Chaos cycle failed", e);
             addLog(`CHAOS ERROR: ${(e as Error).message}`, 'error');
             setChaosActivity('Error analyzing scene');
         } finally {
             isProcessing = false;
         }
      };

      chaosIntervalRef.current = window.setInterval(runChaosCycle, 6000) as unknown as number;
    } else {
      if (chaosIntervalRef.current !== null) {
        window.clearInterval(chaosIntervalRef.current);
        chaosIntervalRef.current = null;
        setChaosActivity('');
        addLog('Chaos Mode: Inactive', 'info');
      }
    }

    return () => {
      if (chaosIntervalRef.current !== null) window.clearInterval(chaosIntervalRef.current);
    };
  }, [isChaosActive, addLog, isPaused]);

  // --- LAZARUS DIAGNOSTICS LOOP ---
  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        const report = await LazarusDebugger.runDiagnostics(
          params,
          telemetryRef.current,
          logs,
          {
            prompt,
            isAutoSpawn,
            isPaused,
            isAnalyzing,
            isChaosActive
          }
        );

        setLazarusStatus(report.overallStatus);
        setLazarusSummary(report.summary);
      } catch (error) {
        console.error('[Lazarus] Diagnostics failed:', error);
        setLazarusStatus('ERROR');
        setLazarusSummary('Diagnostics error');
      }
    };

    // Run diagnostics every 10 seconds
    const interval = window.setInterval(runDiagnostics, 10000);
    runDiagnostics(); // Run immediately

    return () => window.clearInterval(interval);
  }, [params, logs, prompt, isAutoSpawn, isPaused, isAnalyzing, isChaosActive]);

  // --- SNAPPY CHATBOT HANDLER ---
  const handleSnappyMessage = useCallback(async (message: string): Promise<string> => {
    try {
      const response = await askSnappy(message, []);
      return response;
    } catch (error) {
      console.error('[Snappy] Chat error:', error);
      throw error;
    }
  }, []);

  // --- LAZARUS AUTO-FIX HANDLER ---
  const handleLazarusClick = useCallback(async () => {
    addLog('🐛 Lazarus: Running diagnostics...', 'info');

    try {
      const report = await LazarusDebugger.runDiagnostics(
        params,
        telemetryRef.current,
        logs,
        {
          prompt,
          isAutoSpawn,
          isPaused,
          isAnalyzing,
          isChaosActive
        }
      );

      // Log diagnosis
      addLog(`🐛 Lazarus: ${report.summary}`, report.overallStatus === 'HEALTHY' ? 'success' : 'warning');

      // Auto-fix common issues
      if (report.errors.length > 0 || report.warnings.length > 0) {
        // Fix empty asset groups
        if (params.assetGroups.length === 0) {
          addLog('🐛 Lazarus: Fixing empty scene...', 'info');
          if (isAutoSpawn) {
            const creativePrompt = await generateCreativePrompt();
            setPrompt(creativePrompt);
            await executeAnalysis(creativePrompt, 'MANUAL');
            addLog('🐛 Lazarus: Scene populated!', 'success');
          } else {
            addLog('🐛 Lazarus: Enable Auto-Spawn or enter a prompt to populate scene', 'warning');
          }
        }

        // Fix paused simulation with no reason
        if (isPaused && params.assetGroups.length > 0) {
          addLog('🐛 Lazarus: Unpausing simulation...', 'info');
          setIsPaused(false);
        }

        // Recommend fixes for other issues
        if (report.recommendations.length > 0) {
          report.recommendations.forEach(rec => {
            addLog(`🐛 Lazarus suggests: ${rec}`, 'info');
          });
        }
      } else {
        addLog('🐛 Lazarus: All systems healthy! No fixes needed.', 'success');
      }
    } catch (error) {
      addLog(`🐛 Lazarus: Diagnostics failed - ${(error as Error).message}`, 'error');
    }
  }, [params, logs, prompt, isAutoSpawn, isPaused, isAnalyzing, isChaosActive, addLog, executeAnalysis]);

  // --- PROCEDURAL ROOM GENERATION ---
  const handleGenerateRoom = useCallback(() => {
    try {
      const generatedParams = ProceduralSceneGenerator.generateScene({
        template: selectedTemplate,
        roomSize,
        objectDensity,
        colorTheme
      });

      // Add VR hands to the generated params
      generatedParams.vrHands = vrHands.length > 0 ? vrHands : undefined;

      setParams(generatedParams);
      setShouldReset(true);
      setShowRoomSelector(false);

      addLog(`Generated ${selectedTemplate} room (${roomSize}, ${objectDensity} density, ${colorTheme} theme)`, 'success');
    } catch (error) {
      addLog(`Failed to generate room: ${(error as Error).message}`, 'error');
    }
  }, [selectedTemplate, roomSize, objectDensity, colorTheme, vrHands, addLog]);

  // --- VR HAND KEYBOARD CONTROLS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process if we have VR hands active
      if (vrHands.length === 0) return;

      const moveSpeed = 0.5;

      switch (e.key.toLowerCase()) {
        case 'w':
          setVRHands(hands => hands.map(h => ({
            ...h,
            position: { ...h.position, z: h.position.z - moveSpeed }
          })));
          break;
        case 's':
          setVRHands(hands => hands.map(h => ({
            ...h,
            position: { ...h.position, z: h.position.z + moveSpeed }
          })));
          break;
        case 'a':
          setVRHands(hands => hands.map(h => ({
            ...h,
            position: { ...h.position, x: h.position.x - moveSpeed }
          })));
          break;
        case 'd':
          setVRHands(hands => hands.map(h => ({
            ...h,
            position: { ...h.position, x: h.position.x + moveSpeed }
          })));
          break;
        case 'q':
          setVRHands(hands => hands.map(h => ({
            ...h,
            position: { ...h.position, y: h.position.y - moveSpeed }
          })));
          break;
        case 'e':
          setVRHands(hands => hands.map(h => ({
            ...h,
            position: { ...h.position, y: h.position.y + moveSpeed }
          })));
          break;
        case 'g':
          setVRHands(hands => hands.map(h => ({ ...h, isGrasping: true })));
          break;
        case 'r':
          setVRHands(hands => hands.map(h => ({ ...h, isGrasping: false })));
          break;
        case 'h':
          // Toggle VR hands visibility
          if (vrHands.length === 0) {
            setVRHands([{
              id: 'left_hand',
              side: 'left',
              position: { x: -1, y: 2, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              isGrasping: false
            }]);
            addLog('VR Hand spawned! Controls: WASD=move, Q/E=up/down, G=grasp, R=release, H=toggle', 'info');
          } else {
            setVRHands([]);
            addLog('VR Hand removed', 'info');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [vrHands, addLog]);

  // Update params when VR hands change
  useEffect(() => {
    if (vrHands.length > 0 || params.vrHands) {
      setParams(prev => ({
        ...prev,
        vrHands: vrHands.length > 0 ? vrHands : undefined
      }));
    }
  }, [vrHands]);

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

      {/* Photorealistic Image Overlay */}
      {showPhotorealistic && photorealisticImage && (
        <div className="absolute inset-0 z-5 pointer-events-none">
          <img
            src={photorealisticImage}
            alt="Photorealistic render"
            className="w-full h-full object-cover opacity-90"
            style={{ mixBlendMode: 'normal' }}
          />
          <div className="absolute top-4 left-4 bg-black/70 text-cyan-400 px-3 py-1 rounded text-xs font-mono">
            🎨 AI RENDER
          </div>
          <button
            onClick={() => setShowPhotorealistic(false)}
            className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white px-3 py-1 rounded text-xs pointer-events-auto"
          >
            Show Geometric
          </button>
        </div>
      )}

      {/* Loading Indicator for Photorealistic Generation */}
      {isGeneratingImage && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 text-white px-6 py-4 rounded-lg flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-cyan-400 border-t-transparent rounded-full" />
            <span className="font-mono text-sm">Generating photorealistic render...</span>
          </div>
        </div>
      )}

      {/* Toggle button when photorealistic is hidden */}
      {!showPhotorealistic && (
        <button
          onClick={() => setShowPhotorealistic(true)}
          className="absolute top-4 right-4 z-10 bg-cyan-600/90 hover:bg-cyan-500 text-white px-4 py-2 rounded text-sm font-medium"
        >
          🎨 Show AI Render
        </button>
      )}

      {/* UI Overlay Layer */}
      <ControlPanel
        prompt={prompt}
        setPrompt={setPrompt}
        onAnalyze={handleAnalyze}
        params={params}
        setParams={setParams}
        isPaused={isPaused}
        togglePause={() => setIsPaused(!isPaused)}
        onReset={handleReset}
        logs={logs}
        isAnalyzing={isAnalyzing}
        resetCamera={handleResetCamera}
        isChaosActive={isChaosActive}
        toggleChaos={() => setIsChaosActive(!isChaosActive)}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isAutoSpawn={isAutoSpawn}
        toggleAutoSpawn={() => setIsAutoSpawn(!isAutoSpawn)}
        telemetryRef={telemetryRef}
        onDownloadCSV={handleDownloadCSV}
        onGenerateReport={handleGenerateReport}
        isGeneratingReport={isGeneratingReport}
        onRunDiagnostics={handleRunDiagnostics}
        isSnappyEnabled={isSnappyEnabled}
        toggleSnappy={() => setIsSnappyEnabled(!isSnappyEnabled)}
        // ML Export props
        onCaptureMLFrame={handleCaptureMLFrame}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onExportCOCO={handleOpenMLExportModal}
        onExportYOLO={handleExportYOLO}
        isRecording={isRecording}
        recordedFrameCount={recordedFrameCount}
      />

      {/* ML Export Modal */}
      <MLExportModal
        isOpen={showMLExportModal}
        onClose={() => setShowMLExportModal(false)}
        onExportCOCO={handleExportCOCO}
        onExportYOLO={handleExportYOLO}
        onExportDepth={handleExportDepth}
        onExportSegmentation={handleExportSegmentation}
        onExportVRPoses={handleExportVRPoses}
        onExportPhysics={handleExportPhysics}
        recordedFrameCount={recordedFrameCount}
      />

      {/* Snappy AI Chatbot */}
      <SnappyChatbot
        isOpen={isSnappyEnabled}
        onClose={() => setIsSnappyEnabled(false)}
      />

      {/* Chaos Activity Panel - Shows what Chaos mode is doing */}
      <ChaosActivityPanel
        isActive={isChaosActive}
        currentActivity={chaosActivity}
      />

      {/* Room Selector Button - Floating bottom-right */}
      <button
        onClick={() => setShowRoomSelector(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
        title="Generate Procedural Room"
      >
        <Home className="w-6 h-6" />
        <span className="font-semibold">Rooms</span>
      </button>

      {/* Room Selector Modal */}
      {showRoomSelector && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border-2 border-purple-500 rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Generate Procedural Room</h2>
              <button
                onClick={() => setShowRoomSelector(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Room Template Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Room Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { template: SceneTemplate.LOUNGE, icon: Home, label: 'Lounge', desc: 'Casual hangout' },
                  { template: SceneTemplate.MEETING_ROOM, icon: Users, label: 'Meeting', desc: 'Conference space' },
                  { template: SceneTemplate.GAMING_ROOM, icon: Gamepad2, label: 'Gaming', desc: 'Arcade lounge' },
                  { template: SceneTemplate.CREATIVE_STUDIO, icon: Palette, label: 'Creative', desc: 'Maker space' },
                  { template: SceneTemplate.OPEN_WORLD, icon: Globe, label: 'Open World', desc: 'Minecraft-style' }
                ].map(({ template, icon: Icon, label, desc }) => (
                  <button
                    key={template}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedTemplate === template
                        ? 'border-purple-500 bg-purple-500/20 text-white'
                        : 'border-gray-600 bg-slate-700 text-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Icon className="w-8 h-8 mx-auto mb-2" />
                    <div className="font-semibold">{label}</div>
                    <div className="text-xs text-gray-400">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Room Size */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Room Size</h3>
              <div className="flex gap-3">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setRoomSize(size)}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 font-semibold transition-all ${
                      roomSize === size
                        ? 'border-purple-500 bg-purple-500/20 text-white'
                        : 'border-gray-600 bg-slate-700 text-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Object Density */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Object Density</h3>
              <div className="flex gap-3">
                {(['sparse', 'medium', 'dense'] as const).map((density) => (
                  <button
                    key={density}
                    onClick={() => setObjectDensity(density)}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 font-semibold transition-all ${
                      objectDensity === density
                        ? 'border-purple-500 bg-purple-500/20 text-white'
                        : 'border-gray-600 bg-slate-700 text-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {density.charAt(0).toUpperCase() + density.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Theme */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Color Theme</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['vibrant', 'pastel', 'neon', 'natural'] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setColorTheme(theme)}
                    className={`py-2 px-4 rounded-lg border-2 font-semibold transition-all ${
                      colorTheme === theme
                        ? 'border-purple-500 bg-purple-500/20 text-white'
                        : 'border-gray-600 bg-slate-700 text-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateRoom}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              Generate Room
            </button>

            {/* VR Hand Info */}
            <div className="mt-4 p-3 bg-cyan-900/30 border border-cyan-500/50 rounded-lg">
              <p className="text-sm text-cyan-200">
                <strong>VR Hand Controls:</strong> Press <kbd className="px-2 py-1 bg-slate-700 rounded">H</kbd> to toggle VR hand.
                Controls: WASD=move, Q/E=up/down, G=grasp, R=release
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Characters: Chaos, Lazarus, Snappy (Free-floating gently around UI) */}
      <FloatingCharacters
        isChaosActive={isChaosActive}
        onChaosClick={() => setIsChaosActive(!isChaosActive)}
        onLazarusClick={handleLazarusClick}
        onSnappyClick={() => setIsSnappyEnabled(true)}
      />

      {/* Guided Tour */}
      {showGuidedTour && (
        <GuidedTour onComplete={() => setShowGuidedTour(false)} />
      )}
    </div>
  );
};

export default App;