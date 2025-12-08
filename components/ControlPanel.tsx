import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, PhysicsParams, ShapeType, MovementBehavior, AssetGroup, SpawnMode, ViewMode, TelemetryData, MaterialPreset } from '../types';
import { DEFAULT_MATERIAL_PRESETS, SAMPLE_PROMPTS } from '../constants';
import { Play, Pause, RefreshCw, Command, Aperture, Camera, Download, Upload, Activity, Zap, Box, Hexagon, Circle, Triangle, Database, Layers, Skull, Video, Loader2, Plus, Trash, Wind, ArrowDown, Eye, ScanLine, Grid3X3, BoxSelect, Lock, RectangleHorizontal, Wand2, Brain, Sparkles, AlertTriangle, Save, X, FileText, FileSpreadsheet, RotateCcw, ChevronRight, Lightbulb, History, Keyboard, Bug } from 'lucide-react';

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
  onDownloadCSV: () => void;
  onGenerateReport: () => void;
  isGeneratingReport: boolean;
  onRunDiagnostics: () => void;
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
  telemetryRef,
  onDownloadCSV,
  onGenerateReport,
  isGeneratingReport,
  onRunDiagnostics
}) => {
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'PHYSICS' | 'ENV' | 'DATA'>('ASSETS');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [latestDirectorLog, setLatestDirectorLog] = useState<LogEntry | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preset State
  const [presets, setPresets] = useState<MaterialPreset[]>(DEFAULT_MATERIAL_PRESETS);
  const [newPresetName, setNewPresetName] = useState('');

  // Intelligent Command Line State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const commandLineRef = useRef<HTMLInputElement>(null);

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

  const activeGroup = params.assetGroups.find(g => g.id === selectedGroupId) || params.assetGroups[0] || null;

  // Auto-complete suggestions based on input
  useEffect(() => {
    if (prompt.length > 2) {
      const matches = SAMPLE_PROMPTS.filter(p =>
        p.toLowerCase().includes(prompt.toLowerCase())
      );
      if (matches.length > 0 && matches[0] !== prompt) {
        setSuggestions(matches);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else if (prompt.length === 0) {
      setSuggestions(SAMPLE_PROMPTS);
    } else {
      setShowSuggestions(false);
    }
  }, [prompt]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (commandLineRef.current && !commandLineRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Enter key - Execute prompt
    if (e.key === 'Enter' && !e.shiftKey && !showSuggestions) {
      e.preventDefault();
      if (prompt.trim()) {
        setPromptHistory(prev => [...prev, prompt]);
        setHistoryIndex(-1);
        onAnalyze();
      }
    }

    // Handle Enter with suggestions - Select suggestion
    if (e.key === 'Enter' && showSuggestions && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      setPrompt(suggestions[selectedSuggestionIndex]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }

    // Handle Tab - Autocomplete first suggestion
    if (e.key === 'Tab' && showSuggestions && suggestions.length > 0) {
      e.preventDefault();
      setPrompt(suggestions[0]);
      setShowSuggestions(false);
    }

    // Handle Escape - Close suggestions
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }

    // Handle Arrow Down - Navigate suggestions
    if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    }

    // Handle Arrow Up - Navigate suggestions or history
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showSuggestions) {
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (promptHistory.length > 0) {
        const newIndex = historyIndex === -1 ? promptHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setPrompt(promptHistory[newIndex]);
      }
    }

    // Handle Ctrl/Cmd + Space - Show all suggestions
    if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
      e.preventDefault();
      setSuggestions(SAMPLE_PROMPTS);
      setShowSuggestions(true);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || isEnhancing) return;

    setIsEnhancing(true);
    // Simulate AI enhancement - in production, this would call your AI service
    setTimeout(() => {
      const enhanced = `${prompt} with high fidelity physics and realistic material properties, optimized for robotic perception training`;
      setPrompt(enhanced);
      setIsEnhancing(false);
    }, 1500);
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
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-50 font-sans text-xs select-none">
      
      {/* --- TOP HEADER --- */}
      <div className="w-full bg-scifi-900 border-b border-white/10 p-2 pointer-events-auto flex items-center gap-4 shadow-xl z-50 h-14 relative">
        {/* Left: Branding */}
        <div className="flex items-center gap-3 px-4 border-r border-white/10 h-full">
          <div className="relative w-8 h-8 flex items-center justify-center bg-scifi-cyan/10 rounded-md border border-scifi-cyan/20">
             <Lock className="w-5 h-5 text-scifi-cyan relative z-10" strokeWidth={2.5} />
             <Aperture className="w-2.5 h-2.5 text-scifi-accent absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-sm font-bold tracking-widest text-white">SNAPLOCK</span>
            <span className="text-[10px] text-scifi-cyan/80 tracking-widest uppercase">Lock physics, snap reality</span>
          </div>
        </div>

        {/* Center: Intelligent Command Line */}
        <div className="flex-1 flex items-center justify-center gap-3 max-w-6xl mx-auto">
          {/* Command Line Container */}
          <div className="relative flex-1 max-w-4xl" ref={commandLineRef}>
            {/* Main Input Area */}
            <div className={`relative bg-gradient-to-r from-black/60 via-black/50 to-black/60 backdrop-blur-sm border-2 rounded-lg transition-all duration-300 ${
              showSuggestions
                ? 'border-scifi-cyan shadow-[0_0_25px_rgba(34,211,238,0.3)]'
                : 'border-white/20 hover:border-white/30'
            }`}>
              {/* Terminal Prompt Indicator */}
              <div className="absolute inset-y-0 left-0 w-12 flex items-center justify-center border-r border-white/10 bg-scifi-cyan/5">
                <ChevronRight className="w-5 h-5 text-scifi-cyan animate-pulse" strokeWidth={3} />
              </div>

              {/* Input Field */}
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={(e) => {
                  e.target.select();
                  if(isAutoSpawn) toggleAutoSpawn();
                  if(prompt.length === 0) {
                    setSuggestions(SAMPLE_PROMPTS);
                    setShowSuggestions(true);
                  }
                }}
                className="w-full h-14 bg-transparent border-none pl-14 pr-40 text-base font-mono text-white placeholder-gray-500 focus:outline-none"
                placeholder="Type simulation command or press Ctrl+Space for suggestions..."
              />

              {/* Right Action Buttons */}
              <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                {/* Character Count */}
                {prompt.length > 0 && (
                  <div className="text-[10px] text-gray-600 font-mono px-2">
                    {prompt.length}
                  </div>
                )}

                {/* AI Enhance Button */}
                <button
                  onClick={handleEnhancePrompt}
                  disabled={!prompt.trim() || isEnhancing}
                  className={`h-9 px-3 rounded flex items-center gap-1.5 transition-all border text-[10px] font-bold tracking-wider ${
                    isEnhancing
                      ? 'bg-yellow-900/20 border-yellow-500/50 text-yellow-400 cursor-wait'
                      : prompt.trim()
                      ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/50 text-purple-300 hover:from-purple-600/30 hover:to-pink-600/30 hover:border-purple-400'
                      : 'bg-black/20 border-white/5 text-gray-600 cursor-not-allowed'
                  }`}
                  title="Enhance prompt with AI"
                >
                  {isEnhancing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>AI</span>
                </button>

                {/* Execute Button */}
                <button
                  onClick={() => {
                    if (prompt.trim()) {
                      setPromptHistory(prev => [...prev, prompt]);
                      onAnalyze();
                    }
                  }}
                  disabled={isAnalyzing || !prompt.trim()}
                  className={`h-9 px-4 rounded flex items-center gap-2 transition-all border font-bold text-[10px] tracking-wider ${
                    isAnalyzing
                      ? 'bg-yellow-900/20 border-yellow-500/50 text-yellow-400 cursor-wait'
                      : prompt.trim()
                      ? 'bg-scifi-cyan/20 border-scifi-cyan text-scifi-cyan hover:bg-scifi-cyan hover:text-black'
                      : 'bg-black/20 border-white/5 text-gray-600 cursor-not-allowed'
                  }`}
                  title="Execute simulation (Enter)"
                >
                  {isAnalyzing ? (
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Database className="w-3.5 h-3.5" />
                  )}
                  <span>RUN</span>
                </button>
              </div>
            </div>

            {/* Auto-complete Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-scifi-900/98 backdrop-blur-md border border-scifi-cyan/30 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.8)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Suggestions Header */}
                <div className="px-4 py-2 bg-scifi-cyan/10 border-b border-scifi-cyan/20 flex items-center gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-scifi-cyan" />
                  <span className="text-[10px] font-bold text-scifi-cyan tracking-wider">SUGGESTIONS</span>
                  <div className="flex-1"></div>
                  <div className="flex items-center gap-3 text-[9px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <Keyboard className="w-3 h-3" />
                      <kbd className="px-1 py-0.5 bg-black/40 rounded text-[8px] border border-white/10">Tab</kbd> to accept
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 bg-black/40 rounded text-[8px] border border-white/10">↑↓</kbd> to navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 bg-black/40 rounded text-[8px] border border-white/10">Esc</kbd> to close
                    </span>
                  </div>
                </div>

                {/* Suggestions List */}
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setPrompt(suggestion);
                        setShowSuggestions(false);
                        setSelectedSuggestionIndex(-1);
                      }}
                      className={`w-full px-4 py-3 text-left font-mono text-sm transition-all border-b border-white/5 ${
                        index === selectedSuggestionIndex
                          ? 'bg-scifi-cyan/20 text-white border-l-4 border-l-scifi-cyan'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Command className="w-4 h-4 text-scifi-cyan/50 mt-0.5 flex-shrink-0" />
                        <span className="flex-1">{suggestion}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Keyboard Shortcuts Hint */}
            {!showSuggestions && prompt.length === 0 && (
              <div className="absolute -bottom-6 left-0 flex items-center gap-3 text-[9px] text-gray-600">
                <span className="flex items-center gap-1">
                  <History className="w-3 h-3" />
                  <kbd className="px-1 py-0.5 bg-black/40 rounded text-[8px] border border-white/10">↑</kbd> for history
                </span>
                <span className="flex items-center gap-1">
                  <Keyboard className="w-3 h-3" />
                  <kbd className="px-1 py-0.5 bg-black/40 rounded text-[8px] border border-white/10">Ctrl+Space</kbd> for all commands
                </span>
              </div>
            )}
          </div>

          {/* Auto-Spawn Toggle - Compact Design */}
          <button
             onClick={toggleAutoSpawn}
             className={`h-14 px-5 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all border-2 font-bold whitespace-nowrap group ${
                 isAutoSpawn
                 ? 'bg-purple-600/20 border-purple-500 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                 : 'bg-black/40 border-white/20 text-gray-500 hover:text-purple-400 hover:border-purple-500/50 hover:bg-purple-600/10'
             }`}
             title={isAutoSpawn ? "Auto-Spawn Active (15s intervals)" : "Enable Auto-Spawn Mode"}
          >
             <Wand2 size={16} className={isAutoSpawn ? "animate-pulse" : "group-hover:scale-110 transition-transform"} />
             <span className="text-[9px] tracking-widest">AUTO</span>
             {isAutoSpawn && (
               <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500/50 rounded-full overflow-hidden">
                 <div className="h-full bg-purple-400 animate-[progress_15s_linear_infinite]" />
               </div>
             )}
          </button>
        </div>

        {/* Right: View Controls & AI Director */}
        <div className="flex items-center gap-3 pr-4">
             {/* View Mode Selector */}
             <div className="flex items-center bg-black/40 rounded border border-white/10 p-0.5">
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

             {/* ADVERSARIAL DIRECTOR - PROMINENT TOGGLE */}
             {toggleDirector && (
                 <div className={`relative h-14 px-4 rounded-lg border-2 transition-all duration-300 ${
                     isDirectorActive
                     ? 'bg-gradient-to-r from-red-950/40 via-red-900/30 to-red-950/40 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]'
                     : 'bg-black/40 border-red-900/30 hover:border-red-700/50 hover:bg-red-950/20'
                 }`}>
                    {/* Animated Background Effect When Active */}
                    {isDirectorActive && (
                        <div className="absolute inset-0 overflow-hidden rounded-lg">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
                        </div>
                    )}

                    <button
                       onClick={toggleDirector}
                       title={isDirectorActive ? "Disable Adversarial Director" : "Enable Adversarial Director"}
                       className="relative h-full flex flex-col items-center justify-center gap-0.5 group"
                    >
                       {/* Icon with Pulse Effect */}
                       <div className="relative">
                           <Skull size={20} className={`${isDirectorActive ? 'text-red-400 animate-pulse' : 'text-red-800 group-hover:text-red-600'} transition-colors`} strokeWidth={2.5} />
                           {isDirectorActive && (
                               <>
                                   <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                   <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                               </>
                           )}
                       </div>

                       {/* Label */}
                       <div className="flex flex-col items-center gap-0">
                           <span className={`font-bold text-[9px] tracking-widest ${
                               isDirectorActive ? 'text-red-400' : 'text-red-800 group-hover:text-red-600'
                           }`}>
                               {isDirectorActive ? 'ACTIVE' : 'OFFLINE'}
                           </span>
                           <span className={`text-[8px] tracking-wider ${
                               isDirectorActive ? 'text-red-500/80' : 'text-red-900/60'
                           }`}>
                               AI DIRECTOR
                           </span>
                       </div>

                       {/* Warning Stripes When Active */}
                       {isDirectorActive && (
                           <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
                       )}
                    </button>
                 </div>
             )}

             {/* LAZARUS DEBUGGER - DIAGNOSTIC BUTTON */}
             <button
                onClick={onRunDiagnostics}
                title="Run Lazarus Diagnostics"
                className="h-14 px-4 rounded-lg border-2 transition-all duration-300 bg-black/40 border-blue-900/30 hover:border-blue-500/50 hover:bg-blue-950/20 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
             >
                <div className="flex flex-col items-center justify-center gap-0.5 group">
                   {/* Icon */}
                   <Bug size={20} className="text-blue-800 group-hover:text-blue-500 transition-colors" strokeWidth={2.5} />

                   {/* Labels */}
                   <div className="flex flex-col items-center gap-0">
                       <span className="font-bold text-[9px] tracking-widest text-blue-800 group-hover:text-blue-500">
                           LAZARUS
                       </span>
                       <span className="text-[8px] tracking-wider text-blue-900/60 group-hover:text-blue-600/80">
                           DEBUGGER
                       </span>
                   </div>
                </div>
             </button>
        </div>

        {/* DIRECTOR TOAST NOTIFICATION - More Dramatic */}
        {latestDirectorLog && (
            <div className="absolute top-[72px] left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-950/95 via-red-900/95 to-red-950/95 backdrop-blur-md border-2 border-red-500 text-red-100 px-8 py-4 rounded-lg shadow-[0_0_40px_rgba(239,68,68,0.6)] flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none min-w-[400px] z-50">
                {/* Warning Header */}
                <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="w-5 h-5 animate-pulse text-red-400" strokeWidth={2.5} />
                    <span className="font-bold tracking-widest text-red-400 text-xs">ADVERSARIAL INTERVENTION</span>
                    <AlertTriangle className="w-5 h-5 animate-pulse text-red-400" strokeWidth={2.5} />
                </div>

                {/* Message */}
                <span className="font-mono text-sm text-center">{latestDirectorLog.message}</span>

                {/* Bottom Warning Strip */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
            </div>
        )}
      </div>

      {/* --- MAIN WORKSPACE --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* --- LEFT PANEL (Inspector) --- */}
        <div className="w-72 bg-scifi-900/95 backdrop-blur-md border-r border-white/10 flex flex-col pointer-events-auto overflow-y-auto custom-scrollbar">
           
           <div className="flex border-b border-white/10">
              <TabButton label="ASSETS" active={activeTab === 'ASSETS'} onClick={() => setActiveTab('ASSETS')} />
              <TabButton label="PHYSICS" active={activeTab === 'PHYSICS'} onClick={() => setActiveTab('PHYSICS')} />
              <TabButton label="ENV" active={activeTab === 'ENV'} onClick={() => setActiveTab('ENV')} />
              <TabButton label="DATASET" active={activeTab === 'DATA'} onClick={() => setActiveTab('DATA')} />
           </div>

           <div className="p-4 space-y-6">

              {/* Context Header */}
              {(activeTab !== 'ENV' && activeTab !== 'DATA') && (
                 <div className="pb-4 border-b border-white/10">
                    <label className="text-[10px] text-gray-400 font-bold block mb-2">TARGET GROUP</label>
                    {activeGroup ? (
                      <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded">
                          <div className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: activeGroup.color, color: activeGroup.color }}></div>
                          <span className="flex-1 text-xs font-mono font-bold text-white truncate">{activeGroup.name}</span>
                          <span className="text-[9px] text-gray-500 uppercase">{activeGroup.shape}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-yellow-900/10 border border-yellow-500/20 rounded">
                          <Sparkles className="w-4 h-4 text-yellow-500" />
                          <span className="text-xs text-yellow-200/80">No groups yet - Enable Auto-Spawn or add manually</span>
                      </div>
                    )}
                 </div>
              )}

              {/* Empty State for ASSETS */}
              {activeTab === 'ASSETS' && !activeGroup && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Wand2 className="w-12 h-12 text-gray-600 mb-4" />
                  <h3 className="text-sm font-bold text-gray-400 mb-2">No Asset Groups</h3>
                  <p className="text-xs text-gray-500 mb-4 max-w-xs">
                    Start with a prompt using Auto-Spawn, or manually add an asset group below.
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
                       <ShapeButton shape={ShapeType.PYRAMID} current={activeGroup.shape} onClick={() => updateActiveGroup('shape', ShapeType.PYRAMID)} icon={<Triangle size={14}/>} />
                    </div>
                  </Section>

                  <Section title="INSTANCE CONFIGURATION">
                     {/* Add Spawn Mode Selector */}
                     <div className="mb-3">
                        <label className="text-[10px] text-gray-400 block mb-1">SPAWN TOPOLOGY</label>
                        <select 
                            value={activeGroup.spawnMode}
                            onChange={(e) => updateActiveGroup('spawnMode', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 text-xs p-1.5 rounded text-white font-mono focus:border-scifi-cyan focus:outline-none"
                        >
                            {Object.values(SpawnMode).map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                     </div>

                     <RangeControl label="PARTICLE COUNT" value={activeGroup.count} min={1} max={1000} step={1} onChange={(v: number) => updateActiveGroup('count', v)} />
                     <RangeControl label="UNIT SCALE" value={activeGroup.scale} min={0.1} max={5.0} step={0.1} onChange={(v: number) => updateActiveGroup('scale', v)} />
                  </Section>

                  <Section title="SURFACE MATERIAL">
                     <div className="space-y-2">
                        <label className="text-[10px] text-gray-400">ALBEDO COLOR</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={activeGroup.color} onChange={(e) => updateActiveGroup('color', e.target.value)} className="bg-transparent border border-white/20 rounded w-8 h-8 cursor-pointer p-0.5" />
                            <span className="font-mono text-[9px] text-gray-500 uppercase">{activeGroup.color}</span>
                        </div>
                     </div>
                  </Section>
                </>
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
                        className="w-full bg-black/40 border border-white/10 text-xs p-2 rounded text-scifi-cyan font-mono mb-4 focus:border-scifi-cyan focus:outline-none"
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
                             <div className="flex items-center gap-2 text-gray-500">
                                <ArrowDown size={12} />
                                <label className="text-[10px] font-bold">GRAVITY (M/S²)</label>
                             </div>
                             <div className="flex gap-2">
                                <NumInput label="X" value={params.gravity.x} onChange={(v: number) => updateVector('gravity', 'x', v)} />
                                <NumInput label="Y" value={params.gravity.y} onChange={(v: number) => updateVector('gravity', 'y', v)} />
                                <NumInput label="Z" value={params.gravity.z} onChange={(v: number) => updateVector('gravity', 'z', v)} />
                             </div>
                          </div>
                          <div className="space-y-2">
                             <div className="flex items-center gap-2 text-gray-500">
                                <Wind size={12} />
                                <label className="text-[10px] font-bold">WIND VELOCITY</label>
                             </div>
                             <div className="flex gap-2">
                                <NumInput label="X" value={params.wind.x} onChange={(v: number) => updateVector('wind', 'x', v)} />
                                <NumInput label="Y" value={params.wind.y} onChange={(v: number) => updateVector('wind', 'y', v)} />
                                <NumInput label="Z" value={params.wind.z} onChange={(v: number) => updateVector('wind', 'z', v)} />
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
                     <Section title="SYNTHETIC DATA WORKFLOW">
                        <div className="space-y-3">
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                Capture raw physics data from the current simulation frame for offline training or download a technical report.
                            </p>
                            
                            <button 
                                onClick={onDownloadCSV}
                                className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-scifi-cyan/20 border border-white/10 hover:border-scifi-cyan/50 text-white py-3 rounded text-[10px] font-bold transition-all"
                            >
                                <FileSpreadsheet size={14} className="text-scifi-cyan" />
                                DOWNLOAD DATASET (CSV)
                            </button>

                            <button 
                                onClick={onGenerateReport}
                                disabled={isGeneratingReport}
                                className={`w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-scifi-accent/20 border border-white/10 hover:border-scifi-accent/50 text-white py-3 rounded text-[10px] font-bold transition-all ${isGeneratingReport ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                {isGeneratingReport ? <Loader2 size={14} className="animate-spin text-scifi-accent" /> : <FileText size={14} className="text-scifi-accent" />}
                                {isGeneratingReport ? 'COMPILING REPORT...' : 'GENERATE AUDIT REPORT (PDF)'}
                            </button>
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
           <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <Layers className="text-scifi-cyan w-4 h-4" />
                <span className="font-bold tracking-widest text-scifi-cyan text-[10px]">HIERARCHY</span>
              </div>
              <button 
                 onClick={addAssetGroup}
                 className="flex items-center gap-1 bg-scifi-cyan/10 hover:bg-scifi-cyan/20 text-scifi-cyan rounded px-2 py-1 transition-colors border border-scifi-cyan/20"
                 title="Add New Asset Group"
              >
                 <Plus size={10} />
                 <span className="text-[9px] font-bold">ADD LAYER</span>
              </button>
           </div>
           
           {/* Group List */}
           <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {params.assetGroups.map((group) => (
                 <div 
                   key={group.id} 
                   onClick={() => setSelectedGroupId(group.id)}
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

      {/* --- BOTTOM CONTROL BAR --- */}
      <div className="w-full bg-scifi-900/98 backdrop-blur-md border-t border-white/10 pointer-events-auto shadow-xl">
        <div className="flex items-center justify-center gap-3 py-3">

          {/* Execute Button */}
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className={`h-10 px-6 rounded font-mono text-xs font-bold transition-all border flex items-center gap-2 ${
              isAnalyzing
                ? 'bg-yellow-900/20 border-yellow-500/50 text-yellow-500 cursor-wait'
                : 'bg-scifi-cyan/10 border-scifi-cyan/50 text-scifi-cyan hover:bg-scifi-cyan hover:text-black'
            }`}
            title="Execute Prompt"
          >
            {isAnalyzing ? <Activity className="w-4 h-4 animate-spin"/> : <Database className="w-4 h-4"/>}
            {isAnalyzing ? 'RUNNING' : 'RUN'}
          </button>

          {/* Separator */}
          <div className="w-px h-8 bg-white/10"></div>

          {/* Playback Controls */}
          <div className="flex items-center gap-1 bg-black/40 rounded border border-white/10 p-1">
            <IconButton onClick={togglePause} icon={isPaused ? <Play size={18}/> : <Pause size={18}/>} active={!isPaused} title={isPaused ? "Play" : "Pause"} />
            <IconButton onClick={onReset} icon={<RefreshCw size={18}/>} title="Reset" />
            <IconButton onClick={resetCamera} icon={<RotateCcw size={18}/>} title="Reset Camera" />
          </div>

          {/* Separator */}
          <div className="w-px h-8 bg-white/10"></div>

          {/* Capture Controls */}
          <div className="flex gap-2">
            <button
              onClick={onSnap}
              disabled={isSnapping}
              className="h-10 bg-white text-black px-5 rounded font-mono text-xs font-bold flex items-center gap-2 hover:bg-gray-200 transition-all border border-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Capture Image"
            >
              <Aperture size={16} className={isSnapping ? 'animate-spin' : ''}/>
              IMAGE
            </button>

            <button
              onClick={onGenerateVideo}
              disabled={isGeneratingVideo}
              className="h-10 bg-white/10 border border-white/20 text-white px-5 rounded font-mono text-xs font-bold flex items-center gap-2 hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Generate Video"
            >
              {isGeneratingVideo ? <Loader2 className="animate-spin" size={16} /> : <Video size={16}/>}
              VIDEO
            </button>
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
    const stabilityRef = useRef<HTMLDivElement>(null);

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
            <TelemetryBoxRaw label="SYSTEM STATE" ref={stabilityRef} />
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
    <div className="flex justify-between items-center">
      <label className="text-[10px] text-gray-400 font-medium">{label}</label>
      <input
        type="number"
        min={min} max={max} step={step}
        value={value ? parseFloat(value.toFixed(2)) : 0}
        onChange={(e) => {
             const val = parseFloat(e.target.value);
             if(!isNaN(val)) onChange(val);
        }}
        className="w-12 bg-transparent text-right text-[10px] font-mono text-scifi-cyan focus:outline-none border-b border-transparent focus:border-scifi-cyan/50 hover:border-white/20 transition-colors p-0"
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
   <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded px-2 py-1 flex-1 focus-within:border-scifi-cyan transition-colors">
      <span className="text-[10px] text-gray-500 font-bold">{label}</span>
      <input 
        type="number" 
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full bg-transparent border-none text-[10px] font-mono text-white focus:outline-none p-0 text-right"
        step={0.1}
      />
   </div>
);

export default ControlPanel;