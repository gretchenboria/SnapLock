import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, PhysicsParams, ShapeType, MovementBehavior, AssetGroup, SpawnMode, ViewMode, TelemetryData } from '../types';
import { Play, Pause, RefreshCw, Command, Aperture, Camera, Download, Upload, Activity, Zap, Box, Hexagon, Circle, Triangle, Database, Layers, Skull, Video, Loader2, Plus, Trash, Wind, ArrowDown, Eye, ScanLine, Grid3X3, BoxSelect, Lock, RectangleHorizontal, Wand2, Brain, Sparkles, AlertTriangle } from 'lucide-react';

interface ControlPanelProps {
  prompt: string;
  setPrompt: (s: string) => void;
  onAnalyze: () => void;
  onSnap: () => void;
  onGenerateVideo?: () => void;
  params: PhysicsParams;
  setParams: (p: PhysicsParams) => void;
  isPaused: boolean;
  togglePause: () => void;
  onReset: () => void;
  logs: LogEntry[];
  isAnalyzing: boolean;
  isSnapping: boolean;
  isGeneratingVideo?: boolean;
  resetCamera: () => void;
  isDirectorActive?: boolean;
  toggleDirector?: () => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  isAutoSpawn: boolean;
  toggleAutoSpawn: () => void;
  telemetryRef: React.MutableRefObject<TelemetryData>;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  prompt,
  setPrompt,
  onAnalyze,
  onSnap,
  onGenerateVideo,
  params,
  setParams,
  isPaused,
  togglePause,
  onReset,
  logs,
  isAnalyzing,
  isSnapping,
  isGeneratingVideo,
  resetCamera,
  isDirectorActive,
  toggleDirector,
  viewMode,
  setViewMode,
  isAutoSpawn,
  toggleAutoSpawn,
  telemetryRef
}) => {
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'PHYSICS' | 'ENV'>('ASSETS');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [latestDirectorLog, setLatestDirectorLog] = useState<LogEntry | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-select first group if none selected or invalid
  useEffect(() => {
    if (params.assetGroups.length > 0) {
        if (!selectedGroupId || !params.assetGroups.find(g => g.id === selectedGroupId)) {
            setSelectedGroupId(params.assetGroups[0].id);
        }
    }
  }, [params.assetGroups, selectedGroupId]);

  // Toast System for Director Logs
  useEffect(() => {
    const directorLogs = logs.filter(l => l.type === 'director');
    if (directorLogs.length > 0) {
        const last = directorLogs[directorLogs.length - 1];
        if (last !== latestDirectorLog) {
            setLatestDirectorLog(last);
            const timer = setTimeout(() => setLatestDirectorLog(null), 4000); // Hide after 4s
            return () => clearTimeout(timer);
        }
    }
  }, [logs]);

  const activeGroup = params.assetGroups.find(g => g.id === selectedGroupId) || params.assetGroups[0];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onAnalyze();
    }
  };

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
    const newGroup: AssetGroup = {
        id: `manual_${Date.now()}`,
        name: `Layer ${params.assetGroups.length + 1}`,
        count: 50,
        shape: ShapeType.CUBE,
        color: '#ffffff',
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

  const getViewModeIcon = (mode: ViewMode) => {
    switch(mode) {
        case ViewMode.RGB: return <Eye size={14}/>;
        case ViewMode.DEPTH: return <Grid3X3 size={14}/>;
        case ViewMode.LIDAR: return <ScanLine size={14}/>;
        case ViewMode.WIREFRAME: return <BoxSelect size={14}/>;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-50 font-sans text-xs select-none">
      
      {/* --- TOP HEADER --- */}
      <div className="w-full bg-scifi-900 border-b border-white/10 p-2 pointer-events-auto flex items-center gap-4 shadow-xl z-50 h-14 relative">
        <div className="flex items-center gap-3 px-4 border-r border-white/10 h-full">
          <div className="relative w-8 h-8 flex items-center justify-center bg-scifi-cyan/10 rounded-md border border-scifi-cyan/20">
             <Lock className="w-5 h-5 text-scifi-cyan relative z-10" strokeWidth={2.5} />
             <Aperture className="w-2.5 h-2.5 text-scifi-accent absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-sm font-bold tracking-widest text-white">SNAPLOCK</span>
            <span className="text-[9px] text-scifi-cyan/80 tracking-widest uppercase">Lock physics, snap reality</span>
          </div>
        </div>

        <div className="flex-1 relative max-w-2xl flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Command className="w-3 h-3 text-scifi-cyan/50" />
            </div>
            <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-black/40 border border-white/10 rounded-sm pl-9 pr-4 py-1.5 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-scifi-cyan focus:ring-1 focus:ring-scifi-cyan transition-all"
                placeholder="Simulation Prompt: e.g. 'LIDAR noise test on warehouse clutter'..."
            />
          </div>
          
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className={`h-8 px-4 rounded-sm font-mono text-[10px] font-bold transition-all border flex items-center gap-2 ${
                isAnalyzing 
                ? 'bg-yellow-900/20 border-yellow-500/50 text-yellow-500 cursor-wait' 
                : 'bg-scifi-cyan/10 border-scifi-cyan/50 text-scifi-cyan hover:bg-scifi-cyan hover:text-black'
            }`}
          >
            {isAnalyzing ? <Activity className="w-3 h-3 animate-spin"/> : <Database className="w-3 h-3"/>}
            {isAnalyzing ? 'SIMULATING...' : 'EXECUTE'}
          </button>

          {/* AUTO SPAWN TOGGLE */}
          <button
             onClick={toggleAutoSpawn}
             className={`h-8 w-8 flex items-center justify-center rounded-sm transition-all border ${
                 isAutoSpawn 
                 ? 'bg-purple-600/20 border-purple-500 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                 : 'bg-black/40 border-white/10 text-gray-500 hover:text-purple-400'
             }`}
             title="Toggle Auto Spawn Mode"
          >
             <Wand2 size={14} className={isAutoSpawn ? "animate-pulse" : ""} />
          </button>

        </div>

        <div className="flex-1"></div>

        {/* DIRECTOR TOAST NOTIFICATION (Centered Below Header) */}
        {latestDirectorLog && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-950/90 border border-red-500/50 text-red-200 px-6 py-3 rounded shadow-[0_0_20px_rgba(239,68,68,0.4)] flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 animate-pulse text-red-500" />
                    <span className="font-bold tracking-widest text-red-500 text-[10px]">SYSTEM ANOMALY</span>
                </div>
                <span className="font-mono text-xs">{latestDirectorLog.message}</span>
            </div>
        )}

        <div className="flex items-center gap-1 pr-4">
             {/* View Mode Toggle */}
             <div className="flex items-center bg-black/40 rounded border border-white/10 p-0.5 mr-4">
                 {Object.values(ViewMode).map(mode => (
                     <IconButton 
                        key={mode}
                        onClick={() => setViewMode(mode)} 
                        icon={getViewModeIcon(mode)} 
                        active={viewMode === mode} 
                        title={`Sensor View: ${mode}`} 
                     />
                 ))}
             </div>

             {/* Director Toggle */}
             {toggleDirector && (
                 <button 
                    onClick={toggleDirector}
                    title={isDirectorActive ? "Disable Adversarial Director" : "Enable Adversarial Director"}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all mr-4 ${
                        isDirectorActive 
                        ? 'bg-red-900/20 border-red-500/50 text-red-500 shadow-[0_0_10px_rgba(220,38,38,0.2)]' 
                        : 'bg-transparent border-transparent text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                 >
                    <div className="relative w-3 h-3">
                        <Skull size={12} className={isDirectorActive ? "animate-pulse" : ""} />
                        {isDirectorActive && <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />}
                    </div>
                    <span className="font-bold text-[9px] tracking-wider">{isDirectorActive ? 'DIRECTOR' : 'OFF'}</span>
                 </button>
             )}
             
             <div className="flex items-center bg-black/40 rounded border border-white/10 p-0.5">
                 <IconButton onClick={resetCamera} icon={<Camera size={14}/>} title="Reset Camera" />
                 <IconButton onClick={togglePause} icon={isPaused ? <Play size={14}/> : <Pause size={14}/>} active={!isPaused} title="Toggle Pause" />
                 <IconButton onClick={onReset} icon={<RefreshCw size={14}/>} title="Respawn Simulation" />
             </div>
             
             <div className="w-px h-6 bg-white/10 mx-2"></div>
             
             <div className="flex gap-1">
                <button 
                    onClick={onGenerateVideo} 
                    disabled={isGeneratingVideo}
                    className={`bg-white/5 border border-white/10 text-white px-3 py-1.5 rounded-sm font-bold flex items-center gap-2 hover:bg-white/20 transition-all ${isGeneratingVideo ? 'cursor-wait opacity-50' : ''}`}
                    title="Generate Video (Veo 3.1 High Fidelity)"
                >
                    {isGeneratingVideo ? <Loader2 className="animate-spin" size={14} /> : <Video size={14}/>}
                    <span className="text-[10px]">VIDEO</span>
                </button>

                <button 
                    onClick={onSnap} 
                    disabled={isSnapping}
                    className="bg-white text-black px-3 py-1.5 rounded-sm font-bold flex items-center gap-2 hover:bg-gray-200 transition-all border border-white"
                    title="Generate Photorealistic Image (Gemini 3 Pro Image)"
                >
                    <Aperture size={14} className={isSnapping ? 'animate-spin' : ''}/>
                    <span className="text-[10px]">RENDER</span>
                </button>
             </div>
        </div>
      </div>

      {/* --- MAIN WORKSPACE --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* --- LEFT PANEL (Inspector) --- */}
        <div className="w-72 bg-scifi-900/95 backdrop-blur-md border-r border-white/10 flex flex-col pointer-events-auto overflow-y-auto custom-scrollbar">
           
           <div className="flex border-b border-white/10">
              <TabButton label="ASSETS" active={activeTab === 'ASSETS'} onClick={() => setActiveTab('ASSETS')} />
              <TabButton label="PHYSICS" active={activeTab === 'PHYSICS'} onClick={() => setActiveTab('PHYSICS')} />
              <TabButton label="ENV" active={activeTab === 'ENV'} onClick={() => setActiveTab('ENV')} />
           </div>

           <div className="p-4 space-y-6">
              
              {/* Context Header */}
              {activeTab !== 'ENV' && (
                 <div className="pb-4 border-b border-white/10">
                    <label className="text-[9px] text-gray-400 font-bold block mb-2">TARGET GROUP</label>
                    <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded">
                        <div className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: activeGroup.color, color: activeGroup.color }}></div>
                        <span className="flex-1 text-xs font-mono font-bold text-white truncate">{activeGroup.name}</span>
                        <span className="text-[9px] text-gray-500 uppercase">{activeGroup.shape}</span>
                    </div>
                 </div>
              )}

              {activeTab === 'ASSETS' && activeGroup && (
                <>
                  <Section title="PRIMITIVE GEOMETRY">
                    <div className="grid grid-cols-4 gap-2">
                       <ShapeButton shape={ShapeType.CUBE} current={activeGroup.shape} onClick={() => updateActiveGroup('shape', ShapeType.CUBE)} icon={<Box size={14}/>} />
                       <ShapeButton shape={ShapeType.SPHERE} current={activeGroup.shape} onClick={() => updateActiveGroup('shape', ShapeType.SPHERE)} icon={<Circle size={14}/>} />
                       <ShapeButton shape={ShapeType.PLATE} current={activeGroup.shape} onClick={() => updateActiveGroup('shape', ShapeType.PLATE)} icon={<RectangleHorizontal size={14}/>} />
                       <ShapeButton shape={ShapeType.CYLINDER} current={activeGroup.shape} onClick={() => updateActiveGroup('shape', ShapeType.CYLINDER)} icon={<Database size={14}/>} />
                       <ShapeButton shape={ShapeType.CONE} current={activeGroup.shape} onClick={() => updateActiveGroup('shape', ShapeType.CONE)} icon={<Triangle size={14} className="rotate-180"/>} />
                       <ShapeButton shape={ShapeType.TORUS} current={activeGroup.shape} onClick={() => updateActiveGroup('shape', ShapeType.TORUS)} icon={<Circle size={14} strokeWidth={4}/>} />
                       <ShapeButton shape={ShapeType.ICOSAHEDRON} current={activeGroup.shape} onClick={() => updateActiveGroup('shape', ShapeType.ICOSAHEDRON)} icon={<Hexagon size={14}/>} />
                       <ShapeButton shape={ShapeType.CAPSULE} current={activeGroup.shape} onClick={() => updateActiveGroup('shape', ShapeType.CAPSULE)} icon={<div className="w-2 h-4 border rounded-full border-current"/>} />
                    </div>
                  </Section>

                  <Section title="INSTANCE CONFIGURATION">
                     <RangeControl label="PARTICLE COUNT" value={activeGroup.count} min={10} max={1000} step={10} onChange={(v) => updateActiveGroup('count', v)} />
                     <RangeControl label="UNIT SCALE" value={activeGroup.scale} min={0.1} max={2.0} step={0.1} onChange={(v) => updateActiveGroup('scale', v)} />
                  </Section>

                  <Section title="SURFACE MATERIAL">
                     <div className="space-y-2">
                        <label className="text-[9px] text-gray-400">ALBEDO COLOR</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={activeGroup.color} onChange={(e) => updateActiveGroup('color', e.target.value)} className="bg-transparent border border-white/20 rounded w-8 h-8 cursor-pointer p-0.5" />
                            <span className="font-mono text-[9px] text-gray-500 uppercase">{activeGroup.color}</span>
                        </div>
                     </div>
                  </Section>
                </>
              )}

              {activeTab === 'PHYSICS' && activeGroup && (
                <>
                   <Section title="SIMULATION ALGORITHM">
                      <select 
                        value={params.movementBehavior}
                        onChange={(e) => setParams({ ...params, movementBehavior: e.target.value as MovementBehavior })}
                        className="w-full bg-black/40 border border-white/10 text-xs p-2 rounded text-scifi-cyan font-mono mb-4 focus:border-scifi-cyan focus:outline-none"
                      >
                         {Object.values(MovementBehavior).map(b => (
                           <option key={b} value={b}>{b.replace('PHYSICS_', '')}</option>
                         ))}
                      </select>
                   </Section>

                   <Section title="MATERIAL COEFFICIENTS">
                      <RangeControl label="RESTITUTION (BOUNCE)" value={activeGroup.restitution} min={0} max={1.2} step={0.05} onChange={(v) => updateActiveGroup('restitution', v)} />
                      <RangeControl label="FRICTION (GRIP)" value={activeGroup.friction} min={0} max={1} step={0.05} onChange={(v) => updateActiveGroup('friction', v)} />
                      <RangeControl label="MASS (DENSITY)" value={activeGroup.mass} min={0.1} max={50} step={0.5} onChange={(v) => updateActiveGroup('mass', v)} />
                      <RangeControl label="AERODYNAMIC DRAG" value={activeGroup.drag} min={0} max={0.2} step={0.01} onChange={(v) => updateActiveGroup('drag', v)} />
                   </Section>
                </>
              )}

              {activeTab === 'ENV' && (
                 <>
                    <Section title="GLOBAL FORCE VECTORS">
                       <div className="space-y-4">
                          <div className="space-y-2">
                             <div className="flex items-center gap-2 text-gray-500">
                                <ArrowDown size={12} />
                                <label className="text-[9px] font-bold">GRAVITY (M/S²)</label>
                             </div>
                             <div className="flex gap-2">
                                <NumInput label="X" value={params.gravity.x} onChange={(v) => updateVector('gravity', 'x', v)} />
                                <NumInput label="Y" value={params.gravity.y} onChange={(v) => updateVector('gravity', 'y', v)} />
                                <NumInput label="Z" value={params.gravity.z} onChange={(v) => updateVector('gravity', 'z', v)} />
                             </div>
                          </div>
                          <div className="space-y-2">
                             <div className="flex items-center gap-2 text-gray-500">
                                <Wind size={12} />
                                <label className="text-[9px] font-bold">WIND VELOCITY</label>
                             </div>
                             <div className="flex gap-2">
                                <NumInput label="X" value={params.wind.x} onChange={(v) => updateVector('wind', 'x', v)} />
                                <NumInput label="Y" value={params.wind.y} onChange={(v) => updateVector('wind', 'y', v)} />
                                <NumInput label="Z" value={params.wind.z} onChange={(v) => updateVector('wind', 'z', v)} />
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
        </div>

        {/* --- SPACER TO REVEAL VIEWPORT --- */}
        <div className="flex-1 min-w-0"></div>

        {/* --- RIGHT PANEL (Scene Graph) --- */}
        <div className="w-64 bg-scifi-900/95 backdrop-blur-md border-l border-white/10 flex flex-col pointer-events-auto p-4 space-y-4">
           
           {/* Header with Add Action */}
           <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="text-scifi-cyan w-4 h-4" />
                <span className="font-bold tracking-widest text-scifi-cyan text-[10px]">HIERARCHY</span>
              </div>
              <button 
                 onClick={addAssetGroup}
                 className="bg-scifi-cyan/10 hover:bg-scifi-cyan/20 text-scifi-cyan rounded p-1 transition-colors"
                 title="Add New Asset Group"
              >
                 <Plus size={14} />
              </button>
           </div>
           
           {/* Group List */}
           <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {params.assetGroups.map((group) => (
                 <div 
                   key={group.id} 
                   onClick={() => { setSelectedGroupId(group.id); setActiveTab('ASSETS'); }}
                   className={`p-3 rounded border cursor-pointer transition-all group relative ${
                       selectedGroupId === group.id 
                       ? 'border-scifi-cyan bg-scifi-cyan/10 shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]' 
                       : 'border-white/10 bg-black/50 hover:border-white/30'
                   }`}
                 >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-bold uppercase ${selectedGroupId === group.id ? 'text-white' : 'text-gray-400'}`}>{group.name}</span>
                            <span className="text-[8px] text-gray-600">{group.shape} / {group.spawnMode}</span>
                        </div>
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: group.color }}></div>
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-gray-500">
                            <span>PARTICLES</span>
                            <span className="font-mono text-gray-300">{group.count}</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded overflow-hidden">
                            <div className="bg-scifi-cyan h-full transition-all duration-500" style={{ width: `${Math.min(100, (group.count / 500) * 100)}%` }}></div>
                        </div>
                    </div>

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
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Activity size={12} className={isAutoSpawn ? "text-purple-400" : ""} />
                  <span className="text-[9px] font-bold tracking-wider">LIVE TELEMETRY</span>
                  {isAutoSpawn && <span className="text-[9px] text-purple-400 ml-auto animate-pulse">AUTOMATED</span>}
              </div>
              
              <TelemetryReadout telemetryRef={telemetryRef} />
              
              {/* Force Readout */}
              <div className="space-y-1 pt-1 border-t border-white/5 mt-2">
                  <div className="flex justify-between text-[9px] text-gray-500">
                      <span>GRAVITY Y</span>
                      <span className={`font-mono ${Math.abs(params.gravity.y) > 0.1 ? 'text-white' : 'text-gray-600'}`}>{params.gravity.y.toFixed(2)}</span>
                  </div>
                   <div className="flex justify-between text-[9px] text-gray-500">
                      <span>WIND MAG</span>
                      <span className={`font-mono ${Math.abs(params.wind.x) + Math.abs(params.wind.z) > 0.1 ? 'text-white' : 'text-gray-600'}`}>
                          {(Math.abs(params.wind.x) + Math.abs(params.wind.z)).toFixed(2)}
                      </span>
                  </div>
              </div>
           </div>

        </div>

      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const ModelBadge = ({ icon, label, model }: any) => (
    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded p-1.5 hover:border-scifi-cyan/30 transition-colors">
        <div className="p-1 rounded bg-white/5 text-gray-400">
            {icon}
        </div>
        <div className="flex flex-col">
            <span className="text-[8px] font-bold text-gray-500 tracking-wider">{label}</span>
            <span className="text-[9px] font-mono text-scifi-cyan">{model}</span>
        </div>
    </div>
);

// High Performance Telemetry Component
const TelemetryReadout = ({ telemetryRef }: { telemetryRef: React.MutableRefObject<TelemetryData> }) => {
    const fpsRef = useRef<HTMLDivElement>(null);
    const keRef = useRef<HTMLDivElement>(null);
    const velRef = useRef<HTMLDivElement>(null);
    const countRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let active = true;
        const update = () => {
            if (!active) return;
            const data = telemetryRef.current;
            
            if (fpsRef.current) fpsRef.current.innerText = `${data.fps.toFixed(0)} FPS`;
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

            requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
        return () => { active = false; };
    }, []);

    return (
        <div className="grid grid-cols-2 gap-2">
            <TelemetryBoxRaw label="KINETIC ENERGY" ref={keRef} />
            <TelemetryBoxRaw label="MEAN VELOCITY" ref={velRef} />
            <TelemetryBoxRaw label="ENTITIES" ref={countRef} />
            <TelemetryBoxRaw label="FRAMERATE" ref={fpsRef} />
        </div>
    );
};

const TelemetryBoxRaw = React.forwardRef<HTMLDivElement, { label: string }>(({ label }, ref) => (
   <div className="bg-black/40 border border-white/5 rounded p-2 text-center">
      <div ref={ref} className="text-[10px] font-mono text-white font-bold truncate">--</div>
      <div className="text-[8px] text-gray-600 mt-0.5">{label}</div>
   </div>
));

const Section = ({ title, children }: any) => (
  <div className="space-y-3 animate-in fade-in duration-300">
    <h3 className="text-[9px] font-bold text-gray-500 tracking-widest uppercase border-l-2 border-scifi-cyan/20 pl-2">{title}</h3>
    {children}
  </div>
);

const TabButton = ({ label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex-1 py-3 text-[10px] font-bold tracking-wider transition-colors border-b-2 ${
      active ? 'border-scifi-cyan text-white bg-white/5' : 'border-transparent text-gray-600 hover:text-gray-300 hover:bg-white/5'
    }`}
  >
    {label}
  </button>
);

const IconButton = ({ onClick, icon, active, title }: any) => (
  <button 
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-sm hover:bg-white/20 transition-colors ${active ? 'text-scifi-cyan bg-scifi-cyan/10' : 'text-gray-400'}`}
  >
    {icon}
  </button>
);

const ShapeButton = ({ shape, current, onClick, icon }: any) => (
  <button
    onClick={onClick}
    className={`aspect-square flex flex-col items-center justify-center gap-1 rounded border transition-all ${
      current === shape ? 'border-scifi-cyan bg-scifi-cyan/20 text-scifi-cyan shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'border-white/10 bg-black/40 text-gray-500 hover:border-white/30 hover:text-white'
    }`}
    title={shape}
  >
    {icon}
  </button>
);

const RangeControl = ({ label, value, min, max, step, onChange }: any) => (
  <div className="space-y-1">
    <div className="flex justify-between">
      <label className="text-[9px] text-gray-400">{label}</label>
      <span className="text-[9px] font-mono text-scifi-cyan">{value && value.toFixed ? value.toFixed(2) : value}</span>
    </div>
    <div className="relative w-full h-1 bg-gray-800 rounded-lg">
        <div className="absolute top-0 left-0 h-full bg-scifi-cyan rounded-lg" style={{ width: `${((value - min) / (max - min)) * 100}%` }}></div>
        <input 
            type="range" 
            min={min} max={max} step={step} 
            value={value} 
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
    </div>
  </div>
);

const NumInput = ({ label, value, onChange }: any) => (
   <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded px-2 py-1 flex-1 focus-within:border-scifi-cyan transition-colors">
      <span className="text-[9px] text-gray-500 font-bold">{label}</span>
      <input 
        type="number" 
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full bg-transparent border-none text-[9px] font-mono text-white focus:outline-none p-0 text-right"
        step={0.1}
      />
   </div>
);

export default ControlPanel;