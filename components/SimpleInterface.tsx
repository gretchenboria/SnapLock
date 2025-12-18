import React, { useState } from 'react';
import { Play, RotateCcw, Download, Settings } from 'lucide-react';

interface SimpleInterfaceProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  statusMessage: string;
  autoRegenerate: boolean;
  setAutoRegenerate: (value: boolean) => void;
  onExport: () => void;
  onResetCamera: () => void;
  sceneInfo: {
    objectCount: number;
    fps: number;
  };
}

export const SimpleInterface: React.FC<SimpleInterfaceProps> = ({
  prompt,
  setPrompt,
  onGenerate,
  isGenerating,
  statusMessage,
  autoRegenerate,
  setAutoRegenerate,
  onExport,
  onResetCamera,
  sceneInfo
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onGenerate();
    }
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* Main Interface - Top Center */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur-lg border border-cyan-500/30 rounded-2xl shadow-2xl p-6">

          {/* Title */}
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-white mb-1">
              SnapLock
            </h1>
            <p className="text-sm text-slate-400">
              Generate 3D scenes from text prompts
            </p>
          </div>

          {/* Prompt Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Describe your scene:
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="conference room with laptops on table..."
              disabled={isGenerating}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg
                       text-white placeholder-slate-500 focus:outline-none focus:ring-2
                       focus:ring-cyan-500 focus:border-transparent resize-none
                       disabled:opacity-50 disabled:cursor-not-allowed"
              rows={3}
            />
            <div className="text-xs text-slate-500 mt-1">
              Press Enter to generate • Shift+Enter for new line
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={onGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600
                     hover:to-blue-600 text-white font-semibold rounded-lg transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center
                     justify-center gap-2 text-lg shadow-lg"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                <span>Generating Scene...</span>
              </>
            ) : (
              <>
                <Play size={20} />
                <span>GENERATE SCENE</span>
              </>
            )}
          </button>

          {/* Auto-regenerate Toggle */}
          <div className="mt-4 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRegenerate}
                onChange={(e) => setAutoRegenerate(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500
                         focus:ring-2 focus:ring-cyan-500"
              />
              <span className="text-sm text-slate-300">
                Auto-regenerate every 15 seconds
              </span>
            </label>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <Settings size={16} />
              {showAdvanced ? 'Hide' : 'Advanced'}
            </button>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="mt-4 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-300">{statusMessage}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur-lg border border-slate-700 rounded-lg
                      shadow-xl px-6 py-3 flex items-center gap-4">

          {/* Scene Info */}
          <div className="text-sm">
            <span className="text-slate-400">Objects:</span>
            <span className="text-cyan-400 font-semibold ml-2">{sceneInfo.objectCount}</span>
            <span className="text-slate-400 ml-4">FPS:</span>
            <span className="text-green-400 font-semibold ml-2">{sceneInfo.fps}</span>
          </div>

          <div className="h-6 w-px bg-slate-700" />

          {/* Action Buttons */}
          <button
            onClick={onResetCamera}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg
                     transition-colors flex items-center gap-2 text-sm"
            title="Reset Camera"
          >
            <RotateCcw size={16} />
            Reset View
          </button>

          <button
            onClick={onExport}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg
                     transition-colors flex items-center gap-2 text-sm font-medium"
            title="Export Dataset"
          >
            <Download size={16} />
            Export Dataset
          </button>
        </div>
      </div>

      {/* Scene Hierarchy - Right Side (Collapsed by default) */}
      {showAdvanced && (
        <div className="absolute top-8 right-8 w-72 pointer-events-auto">
          <div className="bg-slate-900/95 backdrop-blur-lg border border-slate-700 rounded-lg
                        shadow-xl p-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-3">Scene Hierarchy</h3>
            {/* Scene hierarchy will be populated here */}
            <div className="text-sm text-slate-400">
              Advanced controls coming soon...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
