import React, { useState } from 'react';
import { LogEntry, PhysicsParams, ShapeType, MovementBehavior } from '../types';
import { Play, Pause, RefreshCw, Command, Aperture, Camera, Download, Activity, Wind, Box, Hexagon, Circle, Triangle, Layers, Sliders, Database, Zap, Settings, MousePointer2 } from 'lucide-react';

interface ControlPanelProps {
  prompt: string;
  setPrompt: (s: string) => void;
  onAnalyze: () => void;
  onSnap: () => void;
  params: PhysicsParams;
  setParams: (p: PhysicsParams) => void;
  isPaused: boolean;
  togglePause: () => void;
  onReset: () => void;
  logs: LogEntry[];
  isAnalyzing: boolean;
  isSnapping: boolean;
  resetCamera: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  prompt,
  setPrompt,
  onAnalyze,
  onSnap,
  params,
  setParams,
  isPaused,
  togglePause,
  onReset,
  logs,
  isAnalyzing,
  isSnapping,
  resetCamera
}) => {
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'PHYSICS' | 'ENV'>('ASSETS');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onAnalyze();
    }
  };

  const updateParam = (key: keyof PhysicsParams, value: any) => {
    setParams({ ...params, [key]: value });
  };

  const updateVector = (parent: 'gravity' | 'wind', axis: 'x' | 'y' | 'z', value: number) => {
    setParams({
      ...params,
      [parent]: { ...params[parent], [axis]: value }
    });
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-50 font-sans text-xs select-none">
      
      {/* --- TOP HEADER (Command Center) --- */}
      <div className="w-full bg-scifi-900 border-b border-white/10 p-2 pointer-events-auto flex items-center gap-4 shadow-xl z-50 h-14">
        <div className="flex items-center gap-3 px-4 border-r border-white/10 h-full">
          <Zap className="w-5 h-5 text-scifi-cyan" />
          <div className="flex flex-col justify-center">
            <span className="text-sm font-bold tracking-widest text-white">SNAPLOCK</span>
            <span className="text-[9px] text-scifi-cyan/80 tracking-widest">ENTERPRISE XR</span>
          </div>
        </div>

        <div className="flex-1 relative max-w-3xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Command className="w-3 h-3 text-scifi-cyan/50" />
          </div>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-black/40 border border-white/10 rounded-sm pl-9 pr-4 py-1.5 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-scifi-cyan focus:ring-1 focus:ring-scifi-cyan transition-all"
            placeholder="System Prompt: Describe behavior (e.g., 'Glass shards sliding on ice')..."
          />
        </div>

        <button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className={`h-8 px-6 rounded-sm font-mono text-[10px] font-bold transition-all border flex items-center gap-2 ${
            isAnalyzing 
              ? 'bg-yellow-900/20 border-yellow-500/50 text-yellow-500 cursor-wait' 
              : 'bg-scifi-cyan/10 border-scifi-cyan/50 text-scifi-cyan hover:bg-scifi-cyan hover:text-black'
          }`}
        >
          {isAnalyzing ? <Activity className="w-3 h-3 animate-spin"/> : <Database className="w-3 h-3"/>}
          {isAnalyzing ? 'PROCESSING KERNEL...' : 'EXECUTE'}
        </button>

        <div className="flex-1"></div>

        <div className="flex items-center gap-1 pr-4">
             <IconButton onClick={resetCamera} icon={<Camera size={14}/>} />
             <IconButton onClick={togglePause} icon={isPaused ? <Play size={14}/> : <Pause size={14}/>} active={!isPaused} />
             <IconButton onClick={onReset} icon={<RefreshCw size={14}/>} />
             <div className="w-px h-6 bg-white/10 mx-2"></div>
             <button 
               onClick={onSnap} 
               disabled={isSnapping}
               className="bg-white text-black px-3 py-1.5 rounded-sm font-bold flex items-center gap-2 hover:bg-gray-200"
             >
                <Aperture size={14} className={isSnapping ? 'animate-spin' : ''}/>
                <span>SNAP</span>
             </button>
        </div>
      </div>

      {/* --- MAIN WORKSPACE --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* --- LEFT PANEL (Inspector) --- */}
        <div className="w-72 bg-scifi-900/95 backdrop-blur-md border-r border-white/10 flex flex-col pointer-events-auto overflow-y-auto custom-scrollbar">
           
           {/* Panel Tabs */}
           <div className="flex border-b border-white/10">
              <TabButton label="ASSETS" active={activeTab === 'ASSETS'} onClick={() => setActiveTab('ASSETS')} />
              <TabButton label="PHYSICS" active={activeTab === 'PHYSICS'} onClick={() => setActiveTab('PHYSICS')} />
              <TabButton label="ENV" active={activeTab === 'ENV'} onClick={() => setActiveTab('ENV')} />
           </div>

           <div className="p-4 space-y-6">
              
              {activeTab === 'ASSETS' && (
                <>
                  <Section title="PRIMITIVE TYPE">
                    <div className="grid grid-cols-4 gap-2">
                       <ShapeButton shape={ShapeType.CUBE} current={params.shape} onClick={() => updateParam('shape', ShapeType.CUBE)} icon={<Box size={14}/>} />
                       <ShapeButton shape={ShapeType.SPHERE} current={params.shape} onClick={() => updateParam('shape', ShapeType.SPHERE)} icon={<Circle size={14}/>} />
                       <ShapeButton shape={ShapeType.PYRAMID} current={params.shape} onClick={() => updateParam('shape', ShapeType.PYRAMID)} icon={<Triangle size={14}/>} />
                       <ShapeButton shape={ShapeType.CYLINDER} current={params.shape} onClick={() => updateParam('shape', ShapeType.CYLINDER)} icon={<Database size={14}/>} />
                       <ShapeButton shape={ShapeType.CONE} current={params.shape} onClick={() => updateParam('shape', ShapeType.CONE)} icon={<Triangle size={14} className="rotate-180"/>} />
                       <ShapeButton shape={ShapeType.TORUS} current={params.shape} onClick={() => updateParam('shape', ShapeType.TORUS)} icon={<Circle size={14} strokeWidth={4}/>} />
                       <ShapeButton shape={ShapeType.ICOSAHEDRON} current={params.shape} onClick={() => updateParam('shape', ShapeType.ICOSAHEDRON)} icon={<Hexagon size={14}/>} />
                       <ShapeButton shape={ShapeType.CAPSULE} current={params.shape} onClick={() => updateParam('shape', ShapeType.CAPSULE)} icon={<div className="w-2 h-4 border rounded-full border-current"/>} />
                    </div>
                  </Section>

                  <Section title="INSTANCE CONFIG">
                     <RangeControl label="COUNT" value={params.particleCount} min={10} max={2000} step={10} onChange={(v) => updateParam('particleCount', v)} />
                     <RangeControl label="SCALE" value={params.particleSize} min={0.1} max={2.0} step={0.1} onChange={(v) => updateParam('particleSize', v)} />
                     <RangeControl label="SPREAD" value={params.spread} min={1} max={20} step={1} onChange={(v) => updateParam('spread', v)} />
                  </Section>

                  <Section title="MATERIAL">
                     <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: params.color }}></div>
                        <input type="color" value={params.color} onChange={(e) => updateParam('color', e.target.value)} className="bg-transparent border-none w-full h-6 cursor-pointer" />
                     </div>
                  </Section>
                </>
              )}

              {activeTab === 'PHYSICS' && (
                <>
                   <Section title="ALGORITHM">
                      <select 
                        value={params.movementBehavior}
                        onChange={(e) => updateParam('movementBehavior', e.target.value)}
                        className="w-full bg-black/40 border border-white/10 text-xs p-2 rounded text-scifi-cyan font-mono mb-4"
                      >
                         {Object.values(MovementBehavior).map(b => (
                           <option key={b} value={b}>{b.replace('PHYSICS_', '')}</option>
                         ))}
                      </select>
                   </Section>

                   <Section title="COEFFICIENTS">
                      <RangeControl label="RESTITUTION (BOUNCE)" value={params.restitution} min={0} max={1.2} step={0.05} onChange={(v) => updateParam('restitution', v)} />
                      <RangeControl label="FRICTION (SLIDE)" value={params.friction} min={0} max={1} step={0.05} onChange={(v) => updateParam('friction', v)} />
                      <RangeControl label="MASS (KG)" value={params.mass} min={0.1} max={50} step={0.5} onChange={(v) => updateParam('mass', v)} />
                      <RangeControl label="DRAG (AIR)" value={params.drag} min={0} max={0.2} step={0.01} onChange={(v) => updateParam('drag', v)} />
                   </Section>
                </>
              )}

              {activeTab === 'ENV' && (
                 <>
                    <Section title="GLOBAL FORCES">
                       <div className="space-y-4">
                          <div className="space-y-1">
                             <label className="text-[9px] text-gray-500 font-bold">GRAVITY VECTOR</label>
                             <div className="flex gap-2">
                                <NumInput label="X" value={params.gravity.x} onChange={(v) => updateVector('gravity', 'x', v)} />
                                <NumInput label="Y" value={params.gravity.y} onChange={(v) => updateVector('gravity', 'y', v)} />
                                <NumInput label="Z" value={params.gravity.z} onChange={(v) => updateVector('gravity', 'z', v)} />
                             </div>
                          </div>
                          <div className="space-y-1">
                             <label className="text-[9px] text-gray-500 font-bold">WIND VECTOR</label>
                             <div className="flex gap-2">
                                <NumInput label="X" value={params.wind.x} onChange={(v) => updateVector('wind', 'x', v)} />
                                <NumInput label="Y" value={params.wind.y} onChange={(v) => updateVector('wind', 'y', v)} />
                                <NumInput label="Z" value={params.wind.z} onChange={(v) => updateVector('wind', 'z', v)} />
                             </div>
                          </div>
                       </div>
                    </Section>
                 </>
              )}

              <div className="mt-auto pt-8">
                 <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = 'sim_config.json';
                    link.href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(params, null, 2))}`;
                    link.click();
                  }}
                  className="w-full flex items-center justify-center gap-2 border border-white/10 py-2 text-[10px] text-gray-400 hover:bg-white/5"
                 >
                    <Download size={12} />
                    EXPORT CONFIG
                 </button>
              </div>

           </div>
        </div>

        {/* --- CENTER VIEWPORT --- */}
        <div className="flex-1 relative">
           {/* Center is transparent, Canvas is behind in App.tsx */}
        </div>

        {/* --- RIGHT PANEL (Telemetry) --- */}
        <div className="w-64 bg-black/80 backdrop-blur-md border-l border-white/10 flex flex-col pointer-events-auto p-4 space-y-4">
           
           <div className="border-b border-white/10 pb-2 flex items-center gap-2">
              <Activity className="text-scifi-cyan w-4 h-4" />
              <span className="font-bold tracking-widest text-scifi-cyan">TELEMETRY</span>
           </div>

           <div className="space-y-1">
              <TelemetryRow label="SIMULATION STATUS" value={isPaused ? "PAUSED" : "RUNNING"} color={isPaused ? "text-yellow-500" : "text-green-500"} />
              <TelemetryRow label="FRAME TIME" value="16.6ms" />
              <TelemetryRow label="ACTIVE ENTITIES" value={params.particleCount.toString()} />
           </div>

           <div className="h-px bg-white/10 my-2" />
           
           <div className="space-y-2">
              <span className="text-[9px] font-bold text-gray-500">VELOCITY PROFILE</span>
              <div className="flex items-end gap-1 h-16 w-full opacity-80">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex-1 bg-scifi-cyan/30" style={{ height: `${Math.random() * 100}%` }}></div>
                  ))}
              </div>
           </div>

           <div className="h-px bg-white/10 my-2" />

           <div className="space-y-1">
              <TelemetryRow label="ALGORITHM" value={params.movementBehavior} />
              <TelemetryRow label="INTEGRATOR" value="VERLET" />
              <TelemetryRow label="COLLISION" value={params.restitution < 0.2 ? "INELASTIC" : "ELASTIC"} />
           </div>

           <div className="flex-1"></div>

           {/* Console Log Area */}
           <div className="h-48 border border-white/10 bg-black/50 rounded p-2 overflow-y-auto font-mono text-[9px] space-y-1">
              {logs.map(log => (
                 <div key={log.id} className={`${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-gray-500'}`}>
                    <span className="opacity-50">[{log.timestamp}]</span> {log.message}
                 </div>
              ))}
              <div className="animate-pulse">_</div>
           </div>

        </div>

      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const Section = ({ title, children }: any) => (
  <div className="space-y-3">
    <h3 className="text-[9px] font-bold text-gray-500 tracking-widest uppercase">{title}</h3>
    {children}
  </div>
);

const TabButton = ({ label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex-1 py-2 text-[10px] font-bold tracking-wider transition-colors border-b-2 ${
      active ? 'border-scifi-cyan text-white bg-white/5' : 'border-transparent text-gray-500 hover:text-white'
    }`}
  >
    {label}
  </button>
);

const IconButton = ({ onClick, icon, active }: any) => (
  <button 
    onClick={onClick}
    className={`p-2 rounded hover:bg-white/10 transition-colors ${active ? 'text-scifi-cyan bg-scifi-cyan/10' : 'text-gray-400'}`}
  >
    {icon}
  </button>
);

const ShapeButton = ({ shape, current, onClick, icon }: any) => (
  <button
    onClick={onClick}
    className={`aspect-square flex flex-col items-center justify-center gap-1 rounded border transition-all ${
      current === shape ? 'border-scifi-cyan bg-scifi-cyan/20 text-scifi-cyan' : 'border-white/10 bg-black/40 text-gray-500 hover:border-white/30 hover:text-white'
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
      <span className="text-[9px] font-mono text-scifi-cyan">{value}</span>
    </div>
    <input 
      type="range" 
      min={min} max={max} step={step} 
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-scifi-cyan"
    />
  </div>
);

const NumInput = ({ label, value, onChange }: any) => (
   <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded px-2 py-1 flex-1">
      <span className="text-[9px] text-gray-500">{label}</span>
      <input 
        type="number" 
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full bg-transparent border-none text-[9px] font-mono text-white focus:outline-none p-0 text-right"
        step={0.1}
      />
   </div>
);

const TelemetryRow = ({ label, value, color = "text-gray-300" }: any) => (
   <div className="flex justify-between items-center text-[10px] font-mono border-b border-white/5 pb-1">
      <span className="text-gray-500">{label}</span>
      <span className={`${color}`}>{value}</span>
   </div>
);

export default ControlPanel;