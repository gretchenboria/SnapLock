

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DEFAULT_PHYSICS } from './constants';
import { PhysicsParams, LogEntry, ViewMode, TelemetryData, VRHand } from './types';
import ControlPanel from './components/ControlPanel';
import PhysicsScene, { PhysicsSceneHandle } from './components/PhysicsScene';
import { analyzePhysicsPrompt, analyzeSceneStability, generateCreativePrompt, generateSimulationReport, generatePhotorealisticScene } from './services/geminiService';
import { SimpleInterface } from './components/SimpleInterface';
import { ChaosMode } from './services/chaosMode';
import { validateAndSanitize, ValidationOntology } from './services/validationService';
import { LazarusDebugger } from './services/lazarusDebugger';
import { MLExportService } from './services/mlExportService';
import { askSnappy } from './services/snappyChatbot';
import { ProceduralSceneGenerator, SceneTemplate } from './services/proceduralSceneGenerator';
import { X, Bot } from 'lucide-react';
import { MLExportModal } from './components/MLExportModal';
import { TestDashboard } from './components/TestDashboard';
import { GuidedTour } from './components/GuidedTour';
import { FloatingCharacters } from './components/FloatingCharacters';
import { SnappyChatbot } from './components/SnappyChatbot';
import { ChaosActivityPanel } from './components/ChaosActivityPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProminentTelemetry } from './components/ProminentTelemetry';
import { PromptModal } from './components/PromptModal';
import { loadExampleScene } from './services/exampleScenes';
import { SceneGraph, SceneBuilder } from './services/sceneGraph';
import { SceneAssembler } from './services/sceneAssembler';
import { MovementBehavior } from './types';

const App: React.FC = () => {
  // State
  const [prompt, setPrompt] = useState('');
  const [params, setParams] = useState<PhysicsParams>(() => {
    // ALWAYS load surgical scene by default - NO LOCALSTORAGE BULLSHIT
    try {
      const scene = loadExampleScene('surgical');
      const assetGroups = SceneGraph.sceneToLegacyFormat(scene);
      const legacyParams = {
        ...DEFAULT_PHYSICS,
        assetGroups,
        scene // Pass raw scene for animations/behaviors
      };
      console.log('[App] ✅ Loading surgical robotics scene with REAL 3D MODELS and ANIMATIONS');
      return legacyParams;
    } catch (error) {
      console.error('[App] ❌ Failed to load surgical scene:', error);
      return DEFAULT_PHYSICS;
    }
  });

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
  
  // Auto Spawn: Generates new physics scenarios every 15 seconds
  const [isAutoSpawn, setIsAutoSpawn] = useState(false);
  const isAutoSpawnRef = useRef(false);
  const autoSpawnTimerRef = useRef<number | null>(null);
  const isAnalyzingRef = useRef(false);

  // Chaos Mode State
  const [isChaosActive, setIsChaosActive] = useState(false);
  const [chaosActivity, setChaosActivity] = useState<string>('');
  const chaosIntervalRef = useRef<number | null>(null);

  // Lazarus Diagnostics State - DISABLED
  // const [lazarusStatus, setLazarusStatus] = useState<'HEALTHY' | 'WARNING' | 'CRITICAL' | 'ERROR'>('HEALTHY');
  // const [lazarusSummary, setLazarusSummary] = useState<string>('All systems operational');

  // Snappy Assistant State
  const [isSnappyEnabled, setIsSnappyEnabled] = useState(false);

  // Prompt Modal State
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  // Telemetry Visibility State (hidden by default to avoid viewport obstruction)
  const [showTelemetry, setShowTelemetry] = useState(false);

  // ML Export State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedFrameCount, setRecordedFrameCount] = useState(0);
  const recordingIntervalRef = useRef<number | null>(null);

  // Video Recording State
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);

  // VR Hands State (keyboard-controlled for testing)
  const [vrHands, setVRHands] = useState<VRHand[]>([]);

  // ML Export Modal State
  const [showMLExportModal, setShowMLExportModal] = useState(false);

  // Photorealistic Rendering State (DISABLED for simplicity)
  const [photorealisticImage, setPhotorealisticImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showPhotorealistic, setShowPhotorealistic] = useState(false); // Disabled by default

  // Simple status message for user feedback
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Calculate total particles for display
  const totalParticles = params.assetGroups.reduce((sum, group) => sum + group.count, 0);

  // Refs
  const sceneRef = useRef<PhysicsSceneHandle | null>(null);
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

  // Load Initial Scene on Mount - DISABLED (user should manually generate)
  // useEffect(() => {
  //     // Generate initial procedural scene so users see something immediately
  //     const templates = Object.values(SceneTemplate);
  //     const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  //     const roomSizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
  //     const densities: Array<'sparse' | 'medium' | 'dense'> = ['sparse', 'medium', 'dense'];
  //     const themes: Array<'vibrant' | 'pastel' | 'neon' | 'natural'> = ['vibrant', 'pastel', 'neon', 'natural'];

  //     const initialParams = ProceduralSceneGenerator.generateScene({
  //         template: randomTemplate,
  //         roomSize: roomSizes[Math.floor(Math.random() * roomSizes.length)],
  //         objectDensity: densities[Math.floor(Math.random() * densities.length)],
  //         colorTheme: themes[Math.floor(Math.random() * themes.length)]
  //     });

  //     setParams(initialParams);
  //     setShouldReset(true);
  //     console.log(`[SnapLock] Initial scene loaded: ${randomTemplate}`);
  // }, []); // Empty dependency array - run once on mount

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
    // Reset physics simulation (keeps objects, restarts motion)
    setShouldReset(true);
    addLog('Restarting simulation', 'info');
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
    setStatusMessage(`Generating scene: "${inputPrompt}"...`);
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

      addLog(`Spawned ${validatedParams.assetGroups.length} groups - ${result.explanation}`, 'success');
      setStatusMessage(`Scene generated: ${validatedParams.assetGroups.length} object groups created`);

    } catch (error) {
      const errorMsg = (error as Error).message;
      console.error('[SPAWN ERROR]', error);

      // FALLBACK: Load pre-built example scene instead of primitives
      addLog(`AI generation failed - loading example scene instead`, 'warning');

      try {
        // Pick example scene based on prompt keywords
        const lowerPrompt = inputPrompt.toLowerCase();
        let sceneType: 'surgical' | 'warehouse' | 'assembly' | 'tabletop' | 'clutter' = 'tabletop';

        if (lowerPrompt.includes('surgical') || lowerPrompt.includes('medical') || lowerPrompt.includes('hospital')) {
          sceneType = 'surgical';
        } else if (lowerPrompt.includes('warehouse') || lowerPrompt.includes('shelf') || lowerPrompt.includes('package')) {
          sceneType = 'warehouse';
        } else if (lowerPrompt.includes('assembly') || lowerPrompt.includes('industrial') || lowerPrompt.includes('factory')) {
          sceneType = 'assembly';
        } else if (lowerPrompt.includes('clutter') || lowerPrompt.includes('pile') || lowerPrompt.includes('mess')) {
          sceneType = 'clutter';
        }

        const scene = loadExampleScene(sceneType);

        const fallbackParams: PhysicsParams = {
          gravity: { x: 0, y: -9.81, z: 0 },
          wind: { x: 0, y: 0, z: 0 },
          movementBehavior: MovementBehavior.PHYSICS_GRAVITY,
          assetGroups: [],
          scene: scene  // Use scene architecture, not primitives
        };

        setParams(fallbackParams);
        setShouldReset(true);
        setIsPaused(false);

        addLog(`Loaded ${sceneType} example scene with ${scene.objects.length} objects`, 'success');
        addLog(`TIP: Configure API key to enable custom AI generation`, 'info');
        setStatusMessage(`Example scene loaded: ${sceneType}`);
      } catch (fallbackError) {
        console.error('[FALLBACK ERROR]', fallbackError);
        addLog(`Failed to load fallback scene: ${(fallbackError as Error).message}`, 'error');
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

  // DISABLED - Lazarus diagnostics
  // const handleRunDiagnostics = async () => {
  //     addLog("Running Lazarus Diagnostics...", "info");

  //     try {
  //         const report = await LazarusDebugger.runDiagnostics(
  //             params,
  //             telemetryRef.current,
  //             logs,
  //             {
  //                 prompt,
  //                 isAutoSpawn,
  //                 isPaused,
  //                 isAnalyzing,
  //                 isChaosActive
  //             }
  //         );

  //         // Format and log report
  //         const formattedReport = LazarusDebugger.formatReport(report);
  //         console.log(formattedReport);

  //         // Add summary to logs
  //         addLog(`Diagnostics Complete: ${report.overallStatus}`,
  //                report.overallStatus === 'HEALTHY' ? 'success' :
  //                report.overallStatus === 'CRITICAL' ? 'error' : 'warning');

  //         if (report.errors.length > 0) {
  //             addLog(`Found ${report.errors.length} errors - see console for details`, 'error');
  //         }

  //         if (report.warnings.length > 0) {
  //             addLog(`Found ${report.warnings.length} warnings - see console for details`, 'warning');
  //         }

  //         // Show alert with summary
  //         alert(`LAZARUS DIAGNOSTIC REPORT\n\nStatus: ${report.overallStatus}\n${report.summary}\n\nErrors: ${report.errors.length}\nWarnings: ${report.warnings.length}\n\nFull report available in browser console.`);

  //     } catch (error) {
  //         addLog(`Diagnostics failed: ${(error as Error).message}`, 'error');
  //         console.error('Lazarus diagnostics error:', error);
  //     }
  // };

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
      setRecordedVideoBlob(null); // Clear previous video
      addLog('Started ML sequence recording (30 FPS)', 'info');

      // Start video recording from canvas
      try {
          // Find the Three.js canvas element
          const canvas = document.querySelector('canvas');
          if (canvas) {
              const stream = canvas.captureStream(30); // 30 FPS
              const mediaRecorder = new MediaRecorder(stream, {
                  mimeType: 'video/webm;codecs=vp9', // VP9 codec for better compression
                  videoBitsPerSecond: 5000000 // 5 Mbps
              });

              videoChunksRef.current = [];

              mediaRecorder.ondataavailable = (event) => {
                  if (event.data.size > 0) {
                      videoChunksRef.current.push(event.data);
                  }
              };

              mediaRecorder.onstop = () => {
                  const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
                  setRecordedVideoBlob(videoBlob);
                  addLog('Video recording saved', 'success');
              };

              mediaRecorder.start(100); // Capture in 100ms chunks
              mediaRecorderRef.current = mediaRecorder;
              addLog('Video capture started', 'info');
          } else {
              addLog('Canvas not found for video recording', 'warning');
          }
      } catch (error) {
          console.error('Video recording error:', error);
          addLog('Video recording failed (metadata-only recording continues)', 'warning');
      }

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
  }, [addLog]);

  const handleStopRecording = useCallback(() => {
      if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
      }

      // Stop video recording
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
      } catch (error) {
        console.warn('[App] Video recording stop failed:', error);
        mediaRecorderRef.current = null;
      }

      setIsRecording(false);
      const frameCount = MLExportService.getBufferSize();
      addLog(`Stopped recording. ${frameCount} frames captured.`, 'success');
  }, [addLog]);

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

  const handleDownloadVideo = useCallback(() => {
      if (!recordedVideoBlob) {
          addLog('No video recording available. Record first, then download.', 'warning');
          return;
      }

      try {
          const url = URL.createObjectURL(recordedVideoBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `snaplock_recording_${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          addLog('Video downloaded successfully', 'success');
      } catch (error) {
          addLog(`Video download failed: ${(error as Error).message}`, 'error');
      }
  }, [recordedVideoBlob, addLog]);

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

  // --- DATASET MODE (AUTO-GENERATE VARIATIONS) ---
  // Purpose: Generate many variations of the SAME prompt for ML training datasets
  // CRITICAL: This is the core feature for synthetic data generation
  // REQUIREMENT: Must have a prompt - no random generation allowed
  useEffect(() => {
    if (isAutoSpawn) {
      // SAFETY CHECK: Require prompt for dataset mode
      if (!prompt.trim()) {
        setIsAutoSpawn(false);
        addLog("Dataset Mode requires a prompt. Type your scene description first.", "warning");
        return;
      }

      if (!autoSpawnTimerRef.current) {
        addLog(`Dataset Mode: Generating variations of "${prompt}" every 15s`, "info");
      }

      const generateVariation = () => {
        if (!isAutoSpawnRef.current) return;
        if (!prompt.trim()) {
          setIsAutoSpawn(false);
          addLog("Dataset Mode disabled - prompt was cleared", "warning");
          return;
        }

        // ALWAYS use user's prompt, AI generates spatial variations
        addLog(`Dataset Mode: Generating variation ${Date.now() % 1000} of "${prompt}"`, 'info');
        executeAnalysis(prompt, 'AUTO');
      };

      // Initial generation
      if (!autoSpawnTimerRef.current) {
        generateVariation();
      }

      // Generate variations every 15 seconds
      autoSpawnTimerRef.current = window.setInterval(generateVariation, 15000) as unknown as number;
    } else {
      // Stop dataset mode
      if (autoSpawnTimerRef.current) {
        window.clearInterval(autoSpawnTimerRef.current);
        autoSpawnTimerRef.current = null;
        addLog("Dataset Mode: Stopped", "info");
      }
    }

    return () => {
      if (autoSpawnTimerRef.current) window.clearInterval(autoSpawnTimerRef.current);
    };
  }, [isAutoSpawn, prompt, executeAnalysis, addLog]); 

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

  // --- LAZARUS DIAGNOSTICS LOOP --- DISABLED
  // useEffect(() => {
  //   const runDiagnostics = async () => {
  //     try {
  //       const report = await LazarusDebugger.runDiagnostics(
  //         params,
  //         telemetryRef.current,
  //         logs,
  //         {
  //           prompt,
  //           isAutoSpawn,
  //           isPaused,
  //           isAnalyzing,
  //           isChaosActive
  //         }
  //       );

  //       setLazarusStatus(report.overallStatus);
  //       setLazarusSummary(report.summary);
  //     } catch (error) {
  //       console.error('[Lazarus] Diagnostics failed:', error);
  //       setLazarusStatus('ERROR');
  //       setLazarusSummary('Diagnostics error');
  //     }
  //   };

  //   // Run diagnostics every 10 seconds
  //   const interval = window.setInterval(runDiagnostics, 10000);
  //   runDiagnostics(); // Run immediately

  //   return () => window.clearInterval(interval);
  // }, [params, logs, prompt, isAutoSpawn, isPaused, isAnalyzing, isChaosActive]);

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

  // --- LAZARUS AUTO-FIX HANDLER --- DISABLED
  // const handleLazarusClick = useCallback(async () => {
  //   addLog('🐛 Lazarus: Running diagnostics...', 'info');

  //   try {
  //     const report = await LazarusDebugger.runDiagnostics(
  //       params,
  //       telemetryRef.current,
  //       logs,
  //       {
  //         prompt,
  //         isAutoSpawn,
  //         isPaused,
  //         isAnalyzing,
  //         isChaosActive
  //       }
  //     );

  //     // Log diagnosis
  //     addLog(`🐛 Lazarus: ${report.summary}`, report.overallStatus === 'HEALTHY' ? 'success' : 'warning');

  //     // Auto-fix common issues
  //     if (report.errors.length > 0 || report.warnings.length > 0) {
  //       // Fix empty asset groups
  //       if (params.assetGroups.length === 0) {
  //         addLog('🐛 Lazarus: Fixing empty scene...', 'info');
  //         if (isAutoSpawn) {
  //           const creativePrompt = await generateCreativePrompt();
  //           setPrompt(creativePrompt);
  //           await executeAnalysis(creativePrompt, 'MANUAL');
  //           addLog('🐛 Lazarus: Scene populated!', 'success');
  //         } else {
  //           addLog('🐛 Lazarus: Enable Auto-Spawn or enter a prompt to populate scene', 'warning');
  //         }
  //       }

  //       // Fix paused simulation with no reason
  //       if (isPaused && params.assetGroups.length > 0) {
  //         addLog('🐛 Lazarus: Unpausing simulation...', 'info');
  //         setIsPaused(false);
  //       }

  //       // Recommend fixes for other issues
  //       if (report.recommendations.length > 0) {
  //         report.recommendations.forEach(rec => {
  //           addLog(`🐛 Lazarus suggests: ${rec}`, 'info');
  //         });
  //       }
  //     } else {
  //       addLog('🐛 Lazarus: All systems healthy! No fixes needed.', 'success');
  //     }
  //   } catch (error) {
  //     addLog(`🐛 Lazarus: Diagnostics failed - ${(error as Error).message}`, 'error');
  //   }
  // }, [params, logs, prompt, isAutoSpawn, isPaused, isAnalyzing, isChaosActive, addLog, executeAnalysis]);


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
    <ErrorBoundary>
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

      {/* Full ControlPanel with Manual Controls */}
      <ControlPanel
        prompt={prompt}
        setPrompt={setPrompt}
        onAnalyze={handleAnalyze}
        params={params}
        setParams={setParams}
        isPaused={isPaused}
        togglePause={() => setIsPaused(!isPaused)}
        onReset={handleReset}
        sceneRef={sceneRef}
        logs={logs}
        isAnalyzing={isAnalyzing}
        resetCamera={handleResetCamera}
        isChaosActive={isChaosActive}
        toggleChaos={() => setIsChaosActive(!isChaosActive)}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isAutoSpawn={isAutoSpawn} // DATASET MODE - generates variations of YOUR prompt
        toggleAutoSpawn={() => {
          if (!prompt.trim() && !isAutoSpawn) {
            addLog("Enter a prompt before enabling Dataset Mode", "warning");
            return;
          }
          setIsAutoSpawn(!isAutoSpawn);
          isAutoSpawnRef.current = !isAutoSpawn;
        }}
        telemetryRef={telemetryRef}
        onDownloadCSV={handleDownloadCSV}
        onGenerateReport={handleGenerateReport}
        isGeneratingReport={isGeneratingReport}
        onRunDiagnostics={() => {}} // Disabled Lazarus
        isSnappyEnabled={isSnappyEnabled}
        toggleSnappy={() => setIsSnappyEnabled(!isSnappyEnabled)}
        showTelemetry={showTelemetry}
        toggleTelemetry={() => setShowTelemetry(!showTelemetry)}
        // ML Export props
        onCaptureMLFrame={handleCaptureMLFrame}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onExportCOCO={handleOpenMLExportModal}
        onExportYOLO={handleExportYOLO}
        onOpenMLExportModal={handleOpenMLExportModal}
        isRecording={isRecording}
        recordedFrameCount={recordedFrameCount}
      />

      {/* ML Export Modal - P0 FIX: Recording controls now visible */}
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
        isRecording={isRecording}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        recordedVideoBlob={recordedVideoBlob}
        onDownloadVideo={handleDownloadVideo}
      />

      {/* Snappy AI Chatbot */}
      <SnappyChatbot
        isOpen={isSnappyEnabled}
        onClose={() => setIsSnappyEnabled(false)}
        onGenerateScene={(scenePrompt) => {
          setPrompt(scenePrompt);
          executeAnalysis(scenePrompt, 'MANUAL');
        }}
      />

      {/* Snappy Kawaii Robot Eyes - DISABLED */}
      {false && !isSnappyEnabled && (
        <button
          onClick={() => setIsSnappyEnabled(true)}
          className="fixed bottom-8 right-8 z-[9999] pointer-events-auto group"
          title="Ask Snappy AI Assistant"
        >
          {/* Robot Eyes Container */}
          <div className="relative flex items-center gap-4">
            {/* Left Eye */}
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full shadow-[0_0_30px_rgba(34,211,238,0.6)] animate-pulse">
                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-black rounded-full group-hover:scale-110 transition-transform"></div>
                </div>
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 bg-cyan-400 rounded-full blur-xl opacity-40 animate-pulse"></div>
            </div>

            {/* Right Eye */}
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full shadow-[0_0_30px_rgba(34,211,238,0.6)] animate-pulse" style={{animationDelay: '0.15s'}}>
                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-black rounded-full group-hover:scale-110 transition-transform"></div>
                </div>
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 bg-cyan-400 rounded-full blur-xl opacity-40 animate-pulse" style={{animationDelay: '0.15s'}}></div>
            </div>

            {/* AI Badge */}
            <div className="absolute -top-2 -right-2 bg-green-400 text-black text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg">
              AI
            </div>
          </div>
        </button>
      )}

      {/* Chaos Activity Panel - Shows what Chaos mode is doing */}
      <ChaosActivityPanel
        isActive={isChaosActive}
        currentActivity={chaosActivity}
      />

      {/* PROMINENT TELEMETRY - Large, visible, critical data */}
      {showTelemetry && <ProminentTelemetry telemetryRef={telemetryRef} />}


      {/* Floating Characters: Chaos, Snappy (Free-floating gently around UI) */}
      <FloatingCharacters
        isChaosActive={isChaosActive}
        onChaosClick={() => setIsChaosActive(!isChaosActive)}
        onSnappyClick={() => setIsSnappyEnabled(true)}
      />

      {/* Guided Tour */}
      {showGuidedTour && (
        <GuidedTour onComplete={() => setShowGuidedTour(false)} />
      )}

      {/* Floating Prompt Button - Bottom Center */}
      <button
        onClick={() => setIsPromptModalOpen(true)}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9997] w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full shadow-[0_0_40px_rgba(34,211,238,0.6)] hover:scale-110 transition-all duration-300 flex items-center justify-center group pointer-events-auto"
        title="Open AI Scene Generator"
      >
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        <div className="absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-20" />
      </button>

      {/* Prompt Modal */}
      <PromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        prompt={prompt}
        setPrompt={setPrompt}
        onAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
        isPaused={isPaused}
        togglePause={() => setIsPaused(!isPaused)}
        onReset={handleReset}
      />
    </div>
    </ErrorBoundary>
  );
};

export default App;