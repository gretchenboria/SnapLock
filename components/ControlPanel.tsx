import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, PhysicsParams, ShapeType, MovementBehavior, AssetGroup, SpawnMode, ViewMode, TelemetryData, MaterialPreset } from '../types';
import { DEFAULT_MATERIAL_PRESETS, SAMPLE_PROMPTS } from '../constants';
import { Play, Pause, RefreshCw, Command, Aperture, Camera, Download, Upload, Activity, Zap, Box, Hexagon, Circle, Triangle, Database, Layers, Skull, Video, Loader2, Plus, Trash, Wind, ArrowDown, Eye, EyeOff, ScanLine, Grid3X3, BoxSelect, Lock, RectangleHorizontal, Wand2, Brain, Sparkles, AlertTriangle, Save, X, FileText, FileSpreadsheet, RotateCcw, ChevronRight, Lightbulb, History, Keyboard, Bug, Smile, PlayCircle, StopCircle, Package, Settings, User, Mail, Image as ImageIcon, HelpCircle, Film } from 'lucide-react';
import { ApiKeyModal } from './ApiKeyModal';
import { SupportForm } from './SupportForm';
import { AuthSection } from './AuthSection';
import { AssetLibrary, Asset } from './AssetLibrary';
import { SceneAssembler } from '../services/sceneAssembler';
import { loadExampleScene as loadScene, EXAMPLE_SCENES } from '../services/exampleScenes';
import { PhysicsSceneHandle } from './PhysicsScene';

interface ControlPanelProps {
  prompt: string;
  setPrompt: (s: string) => void;
  onAnalyze: () => void;
  params: PhysicsParams;
  setParams: (p: PhysicsParams) => void;
  isPaused: boolean;
  togglePause: () => void;
  onReset: () => void;
  sceneRef?: React.RefObject<PhysicsSceneHandle | null>;
  logs: LogEntry[];
  isAnalyzing: boolean;
  resetCamera: () => void;
  isChaosActive?: boolean;
  toggleChaos?: () => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  isAutoSpawn: boolean;
  toggleAutoSpawn: () => void;
  telemetryRef: React.MutableRefObject<TelemetryData>;
  onDownloadCSV: () => void;
  onGenerateReport: () => void;
  isGeneratingReport: boolean;
  onRunDiagnostics: () => void;
  isSnappyEnabled: boolean;
  toggleSnappy: () => void;
  showTelemetry?: boolean;
  toggleTelemetry?: () => void;
  // ML Ground Truth Export
  onCaptureMLFrame?: () => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onExportCOCO?: () => void;
  onExportYOLO?: () => void;
  onOpenMLExportModal?: () => void;
  isRecording?: boolean;
  recordedFrameCount?: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  prompt,
  setPrompt,
  onAnalyze,
  params,
  setParams,
  isPaused,
  togglePause,
  onReset,
  sceneRef,
  logs,
  isAnalyzing,
  resetCamera,
  isChaosActive,
  toggleChaos,
  viewMode,
  setViewMode,
  isAutoSpawn,
  toggleAutoSpawn,
  telemetryRef,
  onDownloadCSV,
  onGenerateReport,
  isGeneratingReport,
  onRunDiagnostics,
  isSnappyEnabled,
  toggleSnappy,
  showTelemetry = true,
  toggleTelemetry,
  // ML Export props
  onCaptureMLFrame,
  onStartRecording,
  onStopRecording,
  onExportCOCO,
  onExportYOLO,
  onOpenMLExportModal,
  isRecording = false,
  recordedFrameCount = 0
}) => {
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'PHYSICS' | 'ENV' | 'DATA' | 'SETTINGS'>('ASSETS');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [latestChaosLog, setLatestChaosLog] = useState<LogEntry | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHierarchy, setShowHierarchy] = useState(true);
  const [showManualControls, setShowManualControls] = useState(false); // Hidden by default - user requested

  // Preset State
  const [presets, setPresets] = useState<MaterialPreset[]>(DEFAULT_MATERIAL_PRESETS);
  const [newPresetName, setNewPresetName] = useState('');

  // Prompt History
  const [promptHistory, setPromptHistory] = useState<string[]>([]);

  // API Key Modal State
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // User Profile State
  const [userProfile, setUserProfile] = useState<{
    username: string;
    email: string;
    profilePicture: string;
  }>(() => {
    const saved = localStorage.getItem('snaplock_user_profile');
    return saved ? JSON.parse(saved) : { username: '', email: '', profilePicture: '' };
  });

  const handleUpdateProfile = (updates: Partial<typeof userProfile>) => {
    const updated = { ...userProfile, ...updates };
    setUserProfile(updated);
    localStorage.setItem('snaplock_user_profile', JSON.stringify(updated));
  };

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleUpdateProfile({ profilePicture: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto-select first group if none selected or invalid
  useEffect(() => {
    if (params.assetGroups.length > 0) {
        if (!selectedGroupId || !params.assetGroups.find(g => g.id === selectedGroupId)) {
            setSelectedGroupId(params.assetGroups[0].id);
        }
    } else {
        // No asset groups - clear selection
        setSelectedGroupId(null);
    }
  }, [params.assetGroups, selectedGroupId]);

  // Toast System for Chaos Logs
  useEffect(() => {
    const chaosLogs = logs.filter(l => l.type === 'chaos');
    if (chaosLogs.length > 0) {
        const last = chaosLogs[chaosLogs.length - 1];
        if (last !== latestChaosLog) {
            setLatestChaosLog(last);
            const timer = setTimeout(() => setLatestChaosLog(null), 4000); // Hide after 4s
            return () => clearTimeout(timer);
        }
    }
  }, [logs]);

  const activeGroup = params.assetGroups.find(g => g.id === selectedGroupId) || params.assetGroups[0] || null;

  // Autocomplete functionality removed - using simple input now


  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Basic validation to ensure it matches PhysicsParams structure
        if (json.gravity && json.assetGroups && Array.isArray(json.assetGroups)) {
           setParams(json as PhysicsParams);
           // Force a reset to apply new params to physics engine
           setTimeout(() => onReset(), 100);
        } else {
           alert("Invalid Configuration File: Missing core physics parameters.");
        }
      } catch (err) {
        console.error("Import Failed", err);
        alert("Failed to parse JSON configuration.");
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const addAssetGroup = () => {
    // Generate a random bright color for distinction
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    
    const newGroup: AssetGroup = {
        id: `manual_${Date.now()}`,
        name: `Layer ${params.assetGroups.length + 1}`,
        count: 50,
        shape: ShapeType.CUBE,
        color: randomColor,
        spawnMode: SpawnMode.PILE,
        scale: 0.5,
        mass: 5.0,
        restitution: 0.5,
        friction: 0.5,
        drag: 0.01
    };
    setParams({ ...params, assetGroups: [...params.assetGroups, newGroup] });
    setSelectedGroupId(newGroup.id);
  };

  const removeAssetGroup = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (params.assetGroups.length <= 1) return; // Prevent deleting last group
    const newGroups = params.assetGroups.filter(g => g.id !== id);
    setParams({ ...params, assetGroups: newGroups });
    // Select the previous group or the first one
    if (selectedGroupId === id) {
        setSelectedGroupId(newGroups[newGroups.length - 1].id);
    }
  };

  const loadExampleScene = (sceneName: string) => {
    try {
      const sceneKey = sceneName as keyof typeof EXAMPLE_SCENES;
      if (!EXAMPLE_SCENES[sceneKey]) {
        alert(`Scene "${sceneName}" not found. Available: surgical, warehouse, assembly, tabletop, clutter`);
        return;
      }

      const scene = loadScene(sceneKey);
      console.log('[ControlPanel] Loading example scene:', sceneName, scene);

      // Set params with the scene - the physics engine will convert it to assetGroups
      setParams({
        ...params,
        scene: scene,
        assetGroups: [] // Clear existing groups, scene will take over
      });

      // Reset and trigger simulation
      onReset();

      alert(`Loaded ${EXAMPLE_SCENES[sceneKey].name}!\n${EXAMPLE_SCENES[sceneKey].description}`);
    } catch (error) {
      console.error('[ControlPanel] Failed to load scene:', error);
      alert(`Failed to load scene: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const toggleVisibility = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newGroups = params.assetGroups.map(g =>
      g.id === id ? { ...g, visible: g.visible === false ? true : false } : g
    );
    setParams({ ...params, assetGroups: newGroups });
  };

  const updateActiveGroup = (key: keyof AssetGroup, value: any) => {
    if (!activeGroup) return;
    const newGroups = params.assetGroups.map(g => 
        g.id === activeGroup.id ? { ...g, [key]: value } : g
    );
    setParams({ ...params, assetGroups: newGroups });
  };

  const updateVector = (parent: 'gravity' | 'wind', axis: 'x' | 'y' | 'z', value: number) => {
    setParams({
      ...params,
      [parent]: { ...params[parent], [axis]: value }
    });
  };

  const applyPreset = (preset: MaterialPreset) => {
    if (!activeGroup) return;
    const newGroups = params.assetGroups.map(g => 
        g.id === activeGroup.id ? { 
            ...g, 
            restitution: preset.restitution,
            friction: preset.friction,
            mass: preset.mass,
            drag: preset.drag
        } : g
    );
    setParams({ ...params, assetGroups: newGroups });
  };

  const savePreset = () => {
    if (!activeGroup || !newPresetName.trim()) return;
    const newPreset: MaterialPreset = {
        id: `custom_${Date.now()}`,
        name: newPresetName.trim(),
        restitution: activeGroup.restitution,
        friction: activeGroup.friction,
        mass: activeGroup.mass,
        drag: activeGroup.drag
    };
    setPresets([...presets, newPreset]);
    setNewPresetName('');
  };

  const deletePreset = (id: string) => {
    setPresets(presets.filter(p => p.id !== id));
  };

  const getViewModeIcon = (mode: ViewMode) => {
    switch(mode) {
        case ViewMode.RGB: return <Eye size={14}/>;
        case ViewMode.DEPTH: return <Grid3X3 size={14}/>;
        case ViewMode.LIDAR: return <ScanLine size={14}/>;
        case ViewMode.WIREFRAME: return <BoxSelect size={14}/>;
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-between z-50 font-sans text-xs select-none pointer-events-none">
      
      {/* --- COMPACT TOP TOOLBAR: SINGLE ROW, NO OVERLAPS --- */}
      <div className="w-full bg-scifi-900/95 backdrop-blur-sm border-b border-cyan-500/20 px-3 py-1.5 pointer-events-auto flex items-center justify-between shadow-lg z-50 h-12">

        {/* LEFT: BRANDING (compact) */}
        <div className="flex items-center gap-2 pr-4 border-r border-white/10">
          <Lock className="w-5 h-5 text-cyan-400" strokeWidth={2.5} />
          <span className="text-xs font-bold tracking-wider text-white">SNAPLOCK</span>
        </div>

        {/* CENTER: PRIMARY CONTROLS (compact inline buttons) */}
        <div className="flex items-center gap-2">

          {/* Auto-Spawn */}
          <button
            onClick={toggleAutoSpawn}
            className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${
              isAutoSpawn
                ? 'bg-cyan-500/30 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                : 'bg-gray-800/50 border-gray-600 hover:border-cyan-500/50'
            }`}
            title="Auto-Generate: Creates new physics scenarios every 15 seconds"
          >
            <Wand2 size={16} strokeWidth={2.5} className={isAutoSpawn ? 'text-cyan-300' : 'text-gray-400'} />
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-700" />

          {/* Play/Pause */}
          <button
            onClick={togglePause}
            className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${
              isPaused
                ? 'bg-green-500/30 border-green-400'
                : 'bg-blue-500/30 border-blue-400'
            }`}
            title={isPaused ? "Play (Space)" : "Pause (Space)"}
          >
            {isPaused ? <Play size={16} strokeWidth={2.5} className="text-green-300" /> : <Pause size={16} strokeWidth={2.5} className="text-blue-300" />}
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className="w-8 h-8 flex items-center justify-center bg-orange-500/30 border border-orange-400 rounded transition-all hover:bg-orange-500/40"
            title="Reset (R)"
          >
            <RefreshCw size={16} strokeWidth={2.5} className="text-orange-300" />
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-700" />

          {/* Record */}
          {!isRecording ? (
            <button
              onClick={onStartRecording}
              disabled={!onStartRecording}
              className="w-8 h-8 flex items-center justify-center bg-red-600/30 border border-red-500 rounded transition-all disabled:opacity-30"
              title="Record (30 FPS)"
            >
              <div className="w-3 h-3 bg-red-400 rounded-full" />
            </button>
          ) : (
            <button
              onClick={onStopRecording}
              className="w-8 h-8 flex items-center justify-center bg-red-500/40 border border-red-400 rounded animate-pulse"
              title="Stop Recording"
            >
              <div className="w-3 h-3 bg-red-300 rounded-sm" />
            </button>
          )}

          {/* Snap */}
          <button
            onClick={onCaptureMLFrame}
            disabled={!onCaptureMLFrame || isRecording}
            className="w-8 h-8 flex items-center justify-center bg-cyan-500/30 border border-cyan-500 rounded transition-all disabled:opacity-30"
            title="Capture Frame"
          >
            <Camera size={16} strokeWidth={2.5} className="text-cyan-300" />
          </button>

          {/* Export */}
          <button
            onClick={onOpenMLExportModal}
            disabled={recordedFrameCount === 0}
            className="w-8 h-8 flex items-center justify-center bg-blue-600/30 border border-blue-500 rounded transition-all disabled:opacity-30 relative"
            title={recordedFrameCount > 0 ? `Export ${recordedFrameCount} frames` : "Record first"}
          >
            <Download size={16} strokeWidth={2.5} className="text-blue-300" />
            {recordedFrameCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] font-bold px-1 rounded-full">
                {recordedFrameCount}
              </span>
            )}
          </button>
        </div>

        {/* RIGHT: VIEW MODE + SETTINGS (compact) */}
        <div className="flex items-center gap-2 pl-4 border-l border-white/10">

          {/* View Mode (compact pills) */}
          <div className="flex items-center bg-black/40 rounded border border-cyan-500/20">
            {Object.values(ViewMode).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2 py-1 text-[10px] font-bold transition-all ${
                  viewMode === mode
                    ? 'bg-cyan-500/30 text-cyan-300'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title={`${mode} View`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Chaos */}
          {toggleChaos && (
            <button
              onClick={toggleChaos}
              className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${
                isChaosActive
                  ? 'bg-red-500/30 border-red-400 animate-pulse'
                  : 'bg-gray-800/50 border-gray-600 hover:border-red-500/50'
              }`}
              title="Chaos Mode"
            >
              <Skull size={16} strokeWidth={2.5} className={isChaosActive ? 'text-red-300' : 'text-gray-400'} />
            </button>
          )}

          {/* Settings */}
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${
              activeTab === 'SETTINGS'
                ? 'bg-orange-500/30 border-orange-400'
                : 'bg-gray-800/50 border-gray-600 hover:border-orange-500/50'
            }`}
            title="Settings"
          >
            <Settings size={16} strokeWidth={2.5} className={activeTab === 'SETTINGS' ? 'text-orange-300' : 'text-gray-400'} />
          </button>
        </div>
      </div>

      {/* --- MAIN WORKSPACE --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* --- LEFT PANEL (Inspector) - COMPACT --- */}
        <div className="w-72 bg-scifi-900/95 backdrop-blur-md border-r border-scifi-cyan/30 flex flex-col pointer-events-auto overflow-hidden shadow-xl">

           {/* TAB BAR - COMPACT */}
           <div className="flex border-b border-scifi-cyan/30 bg-scifi-900 sticky top-0 z-10">
              <TabButton label="ASSETS" active={activeTab === 'ASSETS'} onClick={() => setActiveTab('ASSETS')} />
              <TabButton label="PHYSICS" active={activeTab === 'PHYSICS'} onClick={() => setActiveTab('PHYSICS')} />
              <TabButton label="ENV" active={activeTab === 'ENV'} onClick={() => setActiveTab('ENV')} />
              <TabButton label="DATA" active={activeTab === 'DATA'} onClick={() => setActiveTab('DATA')} />
              <TabButton label="SETTINGS" active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} />
           </div>

           {/* TAB CONTENT - Scrollable below tabs */}
           <div className="flex-1 overflow-y-auto custom-scrollbar">

           {/* ASSETS TAB - Full-height Asset Library */}
           {activeTab === 'ASSETS' ? (
             <AssetLibrary
               onAssetSelect={(asset: Asset) => {
                 // Add asset to scene as a new group
                 const newGroup: AssetGroup = {
                   id: `group_${Date.now()}`,
                   name: asset.name,
                   shape: asset.geometry as ShapeType || ShapeType.CUBE,
                   color: '#00d9ff',
                   count: 1,
                   scale: 1.0,
                   friction: asset.friction,
                   restitution: asset.restitution,
                   mass: asset.mass,
                   drag: 0.05,
                   spawnMode: SpawnMode.PILE,
                   modelUrl: asset.path
                 };
                 setParams({
                   ...params,
                   assetGroups: [...params.assetGroups, newGroup]
                 });
                 setSelectedGroupId(newGroup.id);
               }}
               onAssembleScene={(assets, layout) => {
                 try {
                   console.log(`[ControlPanel] Assembling scene with ${assets.length} assets, layout: ${layout}`);

                   // Validate we have assets
                   if (!assets || assets.length === 0) {
                     console.error('[ControlPanel] No assets to assemble');
                     return;
                   }

                   // Assemble scene from selected assets
                   const scene = SceneAssembler.assembleFromAssets({
                     assets,
                     layout,
                     includeGround: true,
                     includeRobot: false,
                     spacing: 0.3
                   });

                   // Validate scene was created
                   if (!scene || scene.objects.length === 0) {
                     console.error('[ControlPanel] Scene assembly produced no objects');
                     return;
                   }

                   console.log(`[ControlPanel] Scene assembled with ${scene.objects.length} objects`);

                   // Update params with assembled scene
                   setParams({
                     ...params,
                     assetGroups: [],  // Clear old groups
                     scene: scene       // Use new scene
                   });

                   // Trigger reset to apply new scene
                   onReset();
                 } catch (error) {
                   console.error('[ControlPanel] Scene assembly error:', error);
                   alert(`Failed to assemble scene: ${(error as Error).message}`);
                 }
               }}
             />
           ) : (
             <div className="p-4 space-y-6">
              {/* Context Header */}
              {(activeTab !== 'ENV' && activeTab !== 'DATA' && activeTab !== 'SETTINGS') && (
                 <div className="pb-4 border-b border-white/10">
                    <label className="text-[10px] text-gray-300 font-bold block mb-2 tracking-wider">TARGET GROUP</label>
                    {activeGroup ? (
                      <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded">
                          <div className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: activeGroup.color, color: activeGroup.color }}></div>
                          <span className="flex-1 text-xs font-mono font-bold text-white truncate">{activeGroup.name}</span>
                          <span className="text-[9px] text-gray-500 uppercase">{activeGroup.shape}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
                          <Sparkles className="w-4 h-4 text-yellow-400" />
                          <span className="text-xs text-yellow-200">No groups yet - Browse ASSETS tab to add 3D models, or type a prompt and click GENERATE</span>
                      </div>
                    )}
                 </div>
              )}

              {/* Empty State for PHYSICS */}
              {activeTab === 'PHYSICS' && !activeGroup && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Activity className="w-12 h-12 text-gray-600 mb-4" />
                  <h3 className="text-sm font-bold text-gray-400 mb-2">No Asset Groups</h3>
                  <p className="text-xs text-gray-500 mb-4 max-w-xs">
                    Create an asset group first to configure physics properties.
                  </p>
                  <button
                    onClick={addAssetGroup}
                    className="flex items-center gap-2 bg-scifi-cyan/10 hover:bg-scifi-cyan/20 text-scifi-cyan rounded px-4 py-2 transition-colors border border-scifi-cyan/20 text-xs font-bold"
                  >
                    <Plus size={14} />
                    ADD FIRST GROUP
                  </button>
                </div>
              )}

              {activeTab === 'PHYSICS' && activeGroup && (
                <>
                   <Section title="SIMULATION ALGORITHM">
                      <select
                        value={params.movementBehavior}
                        onChange={(e) => setParams({ ...params, movementBehavior: e.target.value as MovementBehavior })}
                        className="w-full bg-black/40 border border-white/10 text-xs p-2 rounded text-white font-mono mb-4 focus:border-scifi-cyan-light focus:outline-none font-bold"
                      >
                         {Object.values(MovementBehavior).map(b => (
                           <option key={b} value={b}>{b.replace('PHYSICS_', '')}</option>
                         ))}
                      </select>
                   </Section>

                   <Section title="MATERIAL PRESETS">
                      <div className="grid grid-cols-3 gap-1 mb-2">
                          {presets.map(preset => (
                              <button 
                                  key={preset.id}
                                  onClick={() => applyPreset(preset)}
                                  className="px-2 py-1.5 bg-white/5 hover:bg-scifi-cyan/20 border border-white/10 hover:border-scifi-cyan/50 rounded text-[10px] text-gray-300 truncate transition-colors relative group"
                                  title={`Restitution: ${preset.restitution}, Friction: ${preset.friction}`}
                              >
                                  {preset.name}
                                  {preset.id.startsWith('custom_') && (
                                      <div 
                                          onClick={(e) => { e.stopPropagation(); deletePreset(preset.id); }}
                                          className="absolute top-0 right-0 bottom-0 w-4 flex items-center justify-center bg-red-900/80 text-red-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                                      >
                                          <X size={10} />
                                      </div>
                                  )}
                              </button>
                          ))}
                      </div>
                      <div className="flex gap-1">
                          <input 
                              type="text" 
                              value={newPresetName} 
                              onChange={(e) => setNewPresetName(e.target.value)} 
                              placeholder="Custom Preset Name..." 
                              className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-scifi-cyan placeholder-gray-600"
                          />
                          <button 
                              onClick={savePreset}
                              disabled={!newPresetName.trim()}
                              className="bg-white/10 hover:bg-white/20 text-white px-2 rounded text-[9px] font-bold disabled:opacity-50 border border-white/10 flex items-center gap-1"
                              title="Save current material settings as new preset"
                          >
                              <Save size={10} />
                              SAVE
                          </button>
                      </div>
                   </Section>

                   <Section title="MATERIAL COEFFICIENTS">
                      <RangeControl label="RESTITUTION (BOUNCE)" value={activeGroup.restitution} min={0} max={1.2} step={0.05} onChange={(v: number) => updateActiveGroup('restitution', v)} />
                      <RangeControl label="FRICTION (GRIP)" value={activeGroup.friction} min={0} max={1} step={0.05} onChange={(v: number) => updateActiveGroup('friction', v)} />
                      <RangeControl label="MASS (DENSITY)" value={activeGroup.mass} min={0.1} max={50} step={0.5} onChange={(v: number) => updateActiveGroup('mass', v)} />
                      <RangeControl label="AERODYNAMIC DRAG" value={activeGroup.drag} min={0} max={0.2} step={0.01} onChange={(v: number) => updateActiveGroup('drag', v)} />
                   </Section>
                </>
              )}

              {activeTab === 'ENV' && (
                 <>
                    <Section title="GLOBAL FORCE VECTORS">
                       <div className="space-y-4">
                          <div className="space-y-2">
                             <div className="flex items-center gap-2 text-gray-200">
                                <ArrowDown size={12} />
                                <label className="text-[10px] font-bold tracking-wide">GRAVITY (M/S²)</label>
                             </div>
                             <div className="flex gap-2">
                                <NumInput label="X" value={params.gravity.x} onChange={(v: number) => updateVector('gravity', 'x', v)} />
                                <NumInput label="Y" value={params.gravity.y} onChange={(v: number) => updateVector('gravity', 'y', v)} />
                                <NumInput label="Z" value={params.gravity.z} onChange={(v: number) => updateVector('gravity', 'z', v)} />
                             </div>
                          </div>
                       </div>
                    </Section>

                    <Section title="INTELLIGENCE LAYER">
                        <div className="space-y-2">
                            <ModelBadge icon={<Brain size={12}/>} label="LOGIC CORE" model="GEMINI 3 PRO" />
                            <ModelBadge icon={<Eye size={12}/>} label="VISION ANALYST" model="GEMINI 3 PRO (MM)" />
                            <ModelBadge icon={<Aperture size={12}/>} label="IMG RENDER" model="GEMINI 3 PRO IMAGE" />
                            <ModelBadge icon={<Video size={12}/>} label="TEMPORAL" model="VEO 3.1" />
                        </div>
                    </Section>
                 </>
              )}

              {activeTab === 'DATA' && (
                  <>
                     {/* ML GROUND TRUTH EXPORT - V2 */}
                     <Section title="ML GROUND TRUTH EXPORT">
                        <div className="space-y-3">
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                Export production-ready training data with camera matrices, bounding boxes, and labels in COCO or YOLO format.
                            </p>

                            {/* Recording Status */}
                            <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Camera className="w-4 h-4 text-blue-400" />
                                    <span className="text-[10px] font-bold text-blue-400">RECORDING CONTROLS</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mb-2">
                                    Use the recording buttons in the <strong>top header</strong>:
                                </p>
                                <ul className="text-[9px] text-gray-500 space-y-1 ml-4 list-disc">
                                    <li><strong className="text-red-400">Red Circle</strong> - Start/Stop Recording</li>
                                    <li><strong className="text-cyan-400">Camera</strong> - Capture Single Frame</li>
                                    <li><strong className="text-blue-400">Download</strong> - Export Datasets</li>
                                </ul>
                                {isRecording && (
                                    <div className="mt-2 p-2 bg-red-900/30 border border-red-500/50 rounded flex items-center justify-between">
                                        <span className="text-[10px] text-red-400 font-bold">● RECORDING</span>
                                        <span className="text-[10px] text-red-400 font-mono">{recordedFrameCount} frames</span>
                                    </div>
                                )}
                            </div>

                            {/* Export Formats */}
                            <div className="space-y-2">
                                <button
                                    onClick={onExportCOCO}
                                    disabled={!onExportCOCO || recordedFrameCount === 0}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 py-3 rounded text-[10px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Package size={14} />
                                    EXPORT COCO DATASET ({recordedFrameCount} frames)
                                </button>

                                <button
                                    onClick={onExportYOLO}
                                    disabled={!onExportYOLO || recordedFrameCount === 0}
                                    className="w-full flex items-center justify-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 text-purple-400 py-3 rounded text-[10px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Package size={14} />
                                    EXPORT YOLO DATASET ({recordedFrameCount} frames)
                                </button>
                            </div>

                            <p className="text-[9px] text-gray-500 italic">
                                {recordedFrameCount === 0
                                    ? "Record frames or capture single frame to enable export."
                                    : `${recordedFrameCount} frame(s) ready for export with full ground truth data.`
                                }
                            </p>
                        </div>
                     </Section>

                     {/* LEGACY DATA EXPORT */}
                     <Section title="LEGACY DATA EXPORT">
                        <div className="space-y-3">
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                Basic CSV export and technical reports (deprecated - use ML Ground Truth Export above).
                            </p>

                            <button
                                onClick={onDownloadCSV}
                                className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-scifi-cyan/20 border border-white/10 hover:border-scifi-cyan/50 text-white py-3 rounded text-[10px] font-bold transition-all"
                            >
                                <FileSpreadsheet size={14} className="text-scifi-cyan" />
                                DOWNLOAD CSV (LEGACY)
                            </button>

                            <button
                                onClick={onGenerateReport}
                                disabled={isGeneratingReport}
                                className={`w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-scifi-accent/20 border border-white/10 hover:border-scifi-accent/50 text-white py-3 rounded text-[10px] font-bold transition-all ${isGeneratingReport ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                {isGeneratingReport ? <Loader2 size={14} className="animate-spin text-scifi-accent" /> : <FileText size={14} className="text-scifi-accent" />}
                                {isGeneratingReport ? 'COMPILING REPORT...' : 'AUDIT REPORT (PDF)'}
                            </button>
                        </div>
                     </Section>
                  </>
              )}

              {activeTab === 'SETTINGS' && (
                  <>
                     {/* Back Button */}
                     <div className="mb-4">
                        <button
                           onClick={() => setActiveTab('ASSETS')}
                           className="flex items-center gap-2 text-xs text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                           <ChevronRight className="w-4 h-4 rotate-180" />
                           <span>Back to Assets</span>
                        </button>
                     </div>

                     {/* Authentication Section */}
                     <Section title="ACCOUNT">
                        <AuthSection />
                     </Section>

                     {/* User Profile Section */}
                     <Section title="LOCAL PROFILE">
                        <div className="bg-blue-900/10 border border-blue-500/20 rounded p-3 mb-4">
                           <p className="text-xs text-gray-400">
                              Local profile is stored in your browser. Sign in above to sync across devices.
                           </p>
                        </div>
                        <div className="space-y-4">
                           {/* Profile Picture */}
                           <div className="flex items-center gap-4">
                              {userProfile.profilePicture ? (
                                 <img
                                    src={userProfile.profilePicture}
                                    alt="Profile"
                                    className="w-16 h-16 rounded-full object-cover border-2 border-scifi-cyan-light shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                                 />
                              ) : (
                                 <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-600 flex items-center justify-center">
                                    <User className="w-8 h-8 text-gray-500" />
                                 </div>
                              )}
                              <label className="cursor-pointer">
                                 <div className="px-3 py-2 bg-black/40 border border-white/20 rounded text-xs font-bold text-gray-300 hover:text-white hover:border-scifi-cyan-light transition-colors flex items-center gap-2">
                                    <ImageIcon size={14} />
                                    CHANGE PICTURE
                                 </div>
                                 <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleProfilePictureUpload}
                                    className="hidden"
                                 />
                              </label>
                           </div>

                           {/* Username */}
                           <div>
                              <label className="text-xs font-bold text-gray-200 block mb-2 tracking-wide flex items-center gap-2">
                                 <User size={14} />
                                 USERNAME
                              </label>
                              <input
                                 type="text"
                                 value={userProfile.username}
                                 onChange={(e) => handleUpdateProfile({ username: e.target.value })}
                                 placeholder="Enter your username"
                                 className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm focus:border-scifi-cyan-light focus:outline-none transition-colors"
                              />
                           </div>

                           {/* Email */}
                           <div>
                              <label className="text-xs font-bold text-gray-200 block mb-2 tracking-wide flex items-center gap-2">
                                 <Mail size={14} />
                                 EMAIL
                              </label>
                              <input
                                 type="email"
                                 value={userProfile.email}
                                 onChange={(e) => handleUpdateProfile({ email: e.target.value })}
                                 placeholder="your@email.com"
                                 className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm focus:border-scifi-cyan-light focus:outline-none transition-colors"
                              />
                              <p className="text-[10px] text-gray-500 mt-1">For support and updates</p>
                           </div>
                        </div>
                     </Section>

                     {/* Default Preferences */}
                     <Section title="DEFAULT PREFERENCES">
                        <div className="space-y-3">
                           <div className="bg-blue-900/10 border border-blue-500/20 rounded p-3">
                              <p className="text-[10px] text-gray-400">
                                 These settings control what's enabled when you start SnapLock. You can always toggle them using the buttons in the top right.
                              </p>
                           </div>
                        </div>
                     </Section>

                     {/* API Configuration */}
                     <Section title="API CONFIGURATION">
                        <div className="space-y-3">
                           <p className="text-[10px] text-gray-400">
                              Configure your Gemini API key for AI-powered scene generation and Dataset Mode (auto-generates training data variations).
                           </p>
                           <button
                              onClick={() => setShowApiKeyModal(true)}
                              className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-scifi-cyan/20 border border-white/10 hover:border-scifi-cyan/50 text-white py-3 rounded text-[10px] font-bold transition-all"
                           >
                              <Settings size={14} className="text-scifi-cyan-light" />
                              CONFIGURE API KEY
                           </button>
                        </div>
                     </Section>

                     {/* Help & Support */}
                     <Section title="HELP & SUPPORT">
                        <div className="space-y-3">
                           <div className="flex items-center gap-2 mb-3">
                              <HelpCircle className="w-5 h-5 text-scifi-cyan-light" />
                              <h4 className="font-bold text-white text-sm">Get Help</h4>
                           </div>
                           <p className="text-[10px] text-gray-400 mb-4">
                              Having issues or have feedback? Send me a message and I'll respond as soon as possible.
                           </p>
                           <SupportForm userEmail={userProfile.email} username={userProfile.username} />
                        </div>
                     </Section>
                  </>
              )}

              <div className="mt-auto pt-8 flex gap-2">
                 {/* Hidden File Input for Import */}
                 <input 
                    type="file" 
                    accept=".json" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleImportConfig}
                 />
                 
                 <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 border border-white/10 py-2 text-[10px] text-gray-400 hover:bg-white/5 transition-colors rounded hover:text-white"
                  title="Import Config from JSON"
                 >
                    <Upload size={12} />
                    IMPORT
                 </button>

                 <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = 'sim_config.json';
                    link.href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(params, null, 2))}`;
                    link.click();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 border border-white/10 py-2 text-[10px] text-gray-400 hover:bg-white/5 transition-colors rounded hover:text-white"
                  title="Export Config to JSON"
                 >
                    <Download size={12} />
                    EXPORT
                 </button>
              </div>

           </div>
           )}
           </div>
        </div>

        {/* --- SPACER TO REVEAL VIEWPORT --- */}
        <div className="flex-1 min-w-0"></div>

        {/* --- RIGHT PANEL (Scene Graph / Layers) --- TOGGLEABLE */}
        {showHierarchy && (
        <div className="w-80 bg-scifi-900/95 backdrop-blur-md border-l-2 border-scifi-cyan/30 flex flex-col pointer-events-auto p-4 space-y-4 shadow-xl">
           
           {/* Header with Add Action */}
           <div className="flex justify-between items-center border-b-2 border-scifi-cyan/30 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="text-scifi-cyan-light w-5 h-5" />
                <span className="font-bold tracking-widest text-scifi-cyan-light text-xs">SCENE LAYERS</span>
              </div>
              <div className="flex gap-1">
                <button
                   onClick={() => {
                     const sceneOptions = Object.entries(EXAMPLE_SCENES)
                       .map(([key, scene]) => `${key}: ${scene.description}`)
                       .join('\n');
                     const sceneName = window.prompt(`Choose a scene:\n\n${sceneOptions}\n\nAvailable: surgical, autonomous, xr, drone, warehouse, assembly, tabletop, clutter`);
                     if (sceneName) {
                       loadExampleScene(sceneName.trim().toLowerCase());
                     }
                   }}
                   className="flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded px-2 py-1 transition-colors border border-purple-500/20"
                   title="Load Example Scene - Any Domain"
                >
                   <Package size={10} />
                   <span className="text-[9px] font-bold">SCENE</span>
                </button>
                <button
                   onClick={addAssetGroup}
                   className="flex items-center gap-1 bg-scifi-cyan/10 hover:bg-scifi-cyan/20 text-scifi-cyan-light rounded px-2 py-1 transition-colors border border-scifi-cyan/20"
                   title="Add New Asset Group"
                >
                   <Plus size={10} />
                   <span className="text-[9px] font-bold">ADD LAYER</span>
                </button>
              </div>
           </div>
           
           {/* Group List */}
           <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {params.assetGroups.map((group) => (
                 <div
                   key={group.id}
                   onClick={() => setSelectedGroupId(group.id)}
                   className={`p-3 rounded border cursor-pointer transition-all group relative ${
                       selectedGroupId === group.id
                       ? 'border-scifi-cyan-light bg-scifi-cyan/10 shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]'
                       : 'border-white/10 bg-black/50 hover:border-white/30'
                   } ${group.visible === false ? 'opacity-50' : ''}`}
                 >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-bold uppercase ${selectedGroupId === group.id ? 'text-white' : 'text-gray-300'}`}>{group.name}</span>
                            <span className="text-[8px] text-gray-500">{group.shape} / {group.spawnMode}</span>
                        </div>
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: group.color }}></div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-gray-300">
                            <span>PARTICLES</span>
                            <span className="font-mono text-white font-bold">{group.count}</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded overflow-hidden">
                            <div className="bg-scifi-cyan-light h-full transition-all duration-500" style={{ width: `${Math.min(100, (group.count / 500) * 100)}%` }}></div>
                        </div>
                    </div>

                    {/* Visibility Toggle Button */}
                    <button
                        onClick={(e) => toggleVisibility(e, group.id)}
                        className={`absolute top-2 right-14 transition-all p-1 ${
                          group.visible === false
                            ? 'opacity-100 text-gray-400 hover:text-cyan-400'
                            : 'opacity-0 group-hover:opacity-100 text-gray-500 hover:text-cyan-400'
                        }`}
                        title={group.visible === false ? "Show layer" : "Hide layer"}
                    >
                        {group.visible === false ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>

                    {/* Delete Button */}
                    {params.assetGroups.length > 1 && (
                        <button
                            onClick={(e) => removeAssetGroup(e, group.id)}
                            className="absolute top-2 right-8 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-red-400"
                        >
                            <Trash size={12} />
                        </button>
                    )}
                 </div>
              ))}
           </div>

           <div className="h-px bg-white/10 my-1" />

           {/* RIGOROUS LIVE TELEMETRY DASHBOARD */}
           <div className="bg-white/5 rounded p-3 space-y-3 border border-white/5">
              <div className="flex items-center gap-2 text-gray-300 mb-1">
                  <Activity size={12} className={isAutoSpawn ? "text-purple-300" : ""} />
                  <span className="text-[9px] font-bold tracking-wider">LIVE TELEMETRY</span>
                  {isAutoSpawn && <span className="text-[9px] text-purple-300 ml-auto animate-pulse">AUTOMATED</span>}
              </div>
              
              <TelemetryReadout telemetryRef={telemetryRef} />
              
              {/* Rotation Metrics for VR/Robotics */}
              <div className="space-y-1 pt-1 border-t border-white/5 mt-2">
                  <div className="text-[8px] font-bold text-cyan-400 mb-1 tracking-wider">ROTATION METRICS</div>
                  <div className="flex justify-between text-[9px] text-gray-300">
                      <span>AVG ANGULAR VEL</span>
                      <span className="font-mono font-bold text-white">{(telemetryRef.current.maxVelocity * 0.3).toFixed(2)} rad/s</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-300">
                      <span>COLLISIONS/FRAME</span>
                      <span className={`font-mono font-bold ${telemetryRef.current.activeCollisions > 5 ? 'text-red-400' : 'text-white'}`}>
                          {telemetryRef.current.activeCollisions}
                      </span>
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-300">
                      <span>PHYSICS STEPS</span>
                      <span className="font-mono font-bold text-white">{telemetryRef.current.physicsSteps}</span>
                  </div>
              </div>
           </div>

        </div>
        )}

        {/* --- RIGHT PANEL: MANUAL CONTROLS --- TOGGLEABLE */}
        {showManualControls && (
        <div className="w-80 bg-scifi-900/95 backdrop-blur-md border-l border-white/10 flex flex-col pointer-events-auto overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <Settings className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-bold text-white tracking-wider">MANUAL CONTROLS</span>
            </div>

            {/* GRAVITY */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-cyan-400 tracking-wider">GRAVITY Y (m/s²)</label>
              <input
                type="range"
                min="-20"
                max="0"
                step="0.1"
                value={params.gravity.y}
                onChange={(e) => updateVector('gravity', 'y', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-right text-sm font-mono text-white font-bold">{params.gravity.y.toFixed(1)}</div>
            </div>

            {/* GLOBAL FRICTION - ALWAYS VISIBLE */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-orange-400 tracking-wider">GLOBAL FRICTION</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.assetGroups[0]?.friction || 0.5}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (params.assetGroups.length > 0) {
                    setParams({
                      ...params,
                      assetGroups: params.assetGroups.map(g => ({ ...g, friction: val }))
                    });
                  }
                }}
                className="w-full"
                disabled={params.assetGroups.length === 0}
              />
              <div className="text-right text-sm font-mono text-white font-bold">{(params.assetGroups[0]?.friction || 0.5).toFixed(2)}</div>
            </div>

            {/* GLOBAL RESTITUTION (BOUNCINESS) - ALWAYS VISIBLE */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-green-400 tracking-wider">GLOBAL RESTITUTION (BOUNCE)</label>
              <input
                type="range"
                min="0"
                max="1.2"
                step="0.01"
                value={params.assetGroups[0]?.restitution || 0.5}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (params.assetGroups.length > 0) {
                    setParams({
                      ...params,
                      assetGroups: params.assetGroups.map(g => ({ ...g, restitution: val }))
                    });
                  }
                }}
                className="w-full"
                disabled={params.assetGroups.length === 0}
              />
              <div className="text-right text-sm font-mono text-white font-bold">{(params.assetGroups[0]?.restitution || 0.5).toFixed(2)}</div>
            </div>

            {/* GLOBAL MASS - ALWAYS VISIBLE */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-purple-400 tracking-wider">GLOBAL MASS (kg)</label>
              <input
                type="range"
                min="0.1"
                max="500"
                step="0.5"
                value={params.assetGroups[0]?.mass || 10}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (params.assetGroups.length > 0) {
                    setParams({
                      ...params,
                      assetGroups: params.assetGroups.map(g => ({ ...g, mass: val }))
                    });
                  }
                }}
                className="w-full"
                disabled={params.assetGroups.length === 0}
              />
              <div className="text-right text-sm font-mono text-white font-bold">{(params.assetGroups[0]?.mass || 10).toFixed(1)} kg</div>
            </div>

            {/* GLOBAL DRAG (AIR RESISTANCE) - ALWAYS VISIBLE */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-blue-400 tracking-wider">GLOBAL DRAG (AIR RESISTANCE)</label>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={params.assetGroups[0]?.drag || 0.05}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (params.assetGroups.length > 0) {
                    setParams({
                      ...params,
                      assetGroups: params.assetGroups.map(g => ({ ...g, drag: val }))
                    });
                  }
                }}
                className="w-full"
                disabled={params.assetGroups.length === 0}
              />
              <div className="text-right text-sm font-mono text-white font-bold">{(params.assetGroups[0]?.drag || 0.05).toFixed(2)}</div>
            </div>

            {params.assetGroups.length === 0 && (
              <div className="mt-4 text-center text-gray-400 text-xs py-4 bg-yellow-900/10 border border-yellow-500/20 rounded">
                Add assets from left panel to enable controls
              </div>
            )}
          </div>
        </div>
        )}

        {/* API Key Configuration Modal */}
        <ApiKeyModal isOpen={showApiKeyModal} onClose={() => setShowApiKeyModal(false)} />

      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const ModelBadge = ({ icon, label, model }: any) => (
    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded p-1.5 hover:border-scifi-cyan-light/30 transition-colors">
        <div className="p-1 rounded bg-white/5 text-gray-300">
            {icon}
        </div>
        <div className="flex flex-col">
            <span className="text-[8px] font-bold text-gray-300 tracking-wider">{label}</span>
            <span className="text-[9px] font-mono text-scifi-cyan-light font-bold">{model}</span>
        </div>
    </div>
);

// High Performance Telemetry Component
const TelemetryReadout = ({ telemetryRef }: { telemetryRef: React.MutableRefObject<TelemetryData> }) => {
    const fpsRef = useRef<HTMLDivElement>(null);
    const keRef = useRef<HTMLDivElement>(null);
    const velRef = useRef<HTMLDivElement>(null);
    const countRef = useRef<HTMLDivElement>(null);
    const stabilityRef = useRef<HTMLDivElement>(null);

    // Sample object transform data (for ML ground truth display)
    const samplePosRef = useRef<HTMLDivElement>(null);
    const sampleQuatRef = useRef<HTMLDivElement>(null);
    const sampleVelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let active = true;
        const update = () => {
            if (!active) return;
            const data = telemetryRef.current;

            if (fpsRef.current) {
                fpsRef.current.innerText = `${data.fps.toFixed(0)} FPS`;
                fpsRef.current.style.color = data.fps < 30 ? '#ef4444' : (data.fps < 50 ? '#f59e0b' : '#22d3ee');
            }
            if (keRef.current) {
                if (data.isWarmup) {
                    keRef.current.innerText = "WARMUP";
                    keRef.current.className = "text-[10px] font-mono font-bold truncate text-yellow-500 animate-pulse";
                } else {
                    keRef.current.innerText = `${(data.systemEnergy / 1000).toFixed(2)} kJ`;
                    keRef.current.className = "text-[10px] font-mono text-white font-bold truncate";
                }
            }
            if (velRef.current) velRef.current.innerText = `${data.avgVelocity.toFixed(2)} m/s`;
            if (countRef.current) countRef.current.innerText = `${data.particleCount}`;

            // Stability Color Coding
            if (stabilityRef.current) {
                // If StdDev < 0.1 it's very stable. If > 1.0 it's chaotic.
                const score = data.stabilityScore || 0;
                let color = '#22d3ee'; // Blue/Stable default
                let label = 'STABLE';

                if (score > 2.0) { color = '#ef4444'; label = 'CHAOTIC'; }
                else if (score > 0.5) { color = '#f59e0b'; label = 'ACTIVE'; }
                else if (score < 0.1) { color = '#22c55e'; label = 'SETTLED'; }

                stabilityRef.current.innerText = label;
                stabilityRef.current.style.color = color;
            }

            // Sample object transform data (first object in scene)
            if (samplePosRef.current) {
                if (data.samplePosition) {
                    const pos = data.samplePosition;
                    samplePosRef.current.innerText = `X:${pos.x.toFixed(2)} Y:${pos.y.toFixed(2)} Z:${pos.z.toFixed(2)}`;
                } else {
                    samplePosRef.current.innerText = '--';
                }
            }

            if (sampleQuatRef.current) {
                if (data.sampleQuaternion) {
                    const q = data.sampleQuaternion;
                    sampleQuatRef.current.innerText = `X:${q.x.toFixed(2)} Y:${q.y.toFixed(2)} Z:${q.z.toFixed(2)} W:${q.w.toFixed(2)}`;
                } else {
                    sampleQuatRef.current.innerText = '--';
                }
            }

            if (sampleVelRef.current) {
                if (data.sampleVelocity) {
                    const vel = data.sampleVelocity;
                    sampleVelRef.current.innerText = `X:${vel.x.toFixed(2)} Y:${vel.y.toFixed(2)} Z:${vel.z.toFixed(2)}`;
                } else {
                    sampleVelRef.current.innerText = '--';
                }
            }

            requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
        return () => { active = false; };
    }, []);

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
                <TelemetryBoxRaw label="KINETIC ENERGY" ref={keRef} />
                <TelemetryBoxRaw label="MEAN VELOCITY" ref={velRef} />
                <TelemetryBoxRaw label="ENTITIES" ref={countRef} />
                <TelemetryBoxRaw label="SYSTEM STATE" ref={stabilityRef} />
            </div>

            <div className="border-t border-white/10 pt-3">
                <div className="text-[8px] font-bold text-green-400 tracking-widest uppercase mb-2">3D POSE (Object #1)</div>
                <div className="space-y-2">
                    <TelemetryBoxRaw label="POSITION (m)" ref={samplePosRef} />
                    <TelemetryBoxRaw label="QUATERNION ORIENTATION" ref={sampleQuatRef} />
                    <TelemetryBoxRaw label="VELOCITY (m/s)" ref={sampleVelRef} />
                </div>
            </div>
        </div>
    );
};

const TelemetryBoxRaw = React.forwardRef<HTMLDivElement, { label: string }>(({ label }, ref) => (
   <div className="bg-black/40 border border-white/5 rounded p-2 text-center">
      <div ref={ref} className="text-[10px] font-mono text-white font-bold truncate">--</div>
      <div className="text-[8px] text-gray-400 mt-0.5 font-medium">{label}</div>
   </div>
));

const Section = ({ title, children }: any) => (
  <div className="space-y-3 animate-in fade-in duration-300">
    <h3 className="text-[9px] font-bold text-gray-300 tracking-widest uppercase border-l-2 border-scifi-cyan/30 pl-2">{title}</h3>
    {children}
  </div>
);

const TabButton = ({ label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 py-2 text-[10px] font-bold tracking-wider transition-all border-b-2 ${
      active
        ? 'border-scifi-cyan-light text-white bg-scifi-cyan/10'
        : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5 hover:border-gray-600'
    }`}
  >
    {label}
  </button>
);

const IconButton = ({ onClick, icon, active, title }: any) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-sm hover:bg-white/20 transition-colors pointer-events-auto ${active ? 'text-scifi-cyan-light bg-scifi-cyan/10' : 'text-gray-300 hover:text-white'}`}
  >
    {icon}
  </button>
);

const ShapeButton = ({ shape, current, onClick, icon }: any) => (
  <button
    onClick={onClick}
    className={`aspect-square flex flex-col items-center justify-center gap-1 rounded border transition-all p-2 ${
      current === shape ? 'border-scifi-cyan-light bg-scifi-cyan/20 text-scifi-cyan-light shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'border-white/10 bg-black/40 text-gray-400 hover:border-white/30 hover:text-gray-200'
    }`}
    title={shape}
  >
    {icon}
  </button>
);

const RangeControl = ({ label, value, min, max, step, onChange }: any) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center">
      <label className="text-[10px] text-gray-300 font-medium tracking-wide">{label}</label>
      <input
        type="number"
        min={min} max={max} step={step}
        value={value ? parseFloat(value.toFixed(2)) : 0}
        onChange={(e) => {
             const val = parseFloat(e.target.value);
             if(!isNaN(val)) onChange(val);
        }}
        className="w-12 bg-transparent text-right text-[10px] font-mono text-scifi-cyan-light font-bold focus:outline-none border-b border-transparent focus:border-scifi-cyan-light/50 hover:border-white/20 transition-colors p-0"
      />
    </div>
    {/* Increased Hit Area for Slider Usability */}
    <div className="relative w-full h-4 flex items-center group">
        <div className="absolute left-0 right-0 h-1 bg-gray-800 rounded-lg overflow-hidden group-hover:bg-gray-700 transition-colors">
            <div className="h-full bg-scifi-cyan shadow-[0_0_8px_rgba(34,211,238,0.5)]" style={{ width: `${((value - min) / (max - min)) * 100}%` }}></div>
        </div>
        <input 
            type="range" 
            min={min} max={max} step={step} 
            value={value} 
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
    </div>
  </div>
);

const NumInput = ({ label, value, onChange }: any) => (
   <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded px-2 py-1 flex-1 focus-within:border-scifi-cyan-light transition-colors">
      <span className="text-[10px] text-gray-300 font-bold">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full bg-transparent border-none text-[10px] font-mono text-white font-bold focus:outline-none p-0 text-right"
        step={0.1}
      />
   </div>
);

export default ControlPanel;