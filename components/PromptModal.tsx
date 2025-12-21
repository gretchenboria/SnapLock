/**
 * PROMPT MODAL - Expandable AI Scene Generator
 * Opens on button click to enter scene generation prompts
 */

import React from 'react';
import { X, Sparkles, Loader2, Play, Pause, RefreshCw } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  setPrompt: (s: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  isPaused: boolean;
  togglePause: () => void;
  onReset: () => void;
}

export function PromptModal({
  isOpen,
  onClose,
  prompt,
  setPrompt,
  onAnalyze,
  isAnalyzing,
  isPaused,
  togglePause,
  onReset
}: PromptModalProps) {
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (prompt.trim() && !isAnalyzing) {
      setErrorMessage(''); // Clear any previous errors
      try {
        onAnalyze();
      } catch (error) {
        setErrorMessage(`Generation failed: ${(error as Error).message}`);
        console.error('[PromptModal] Generation error:', error);
      }
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-3xl px-6">
        <div className="bg-black/95 backdrop-blur-xl border-2 border-cyan-500/50 rounded-2xl shadow-[0_0_60px_rgba(34,211,238,0.4)] p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg p-2">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">AI Scene Generator</h3>
                <p className="text-xs text-gray-400">Describe your simulation scene</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>

          {/* Warning Banner */}
          <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="text-yellow-400 text-sm">
                <strong>⚠️ Note:</strong> AI prompt generation requires a Gemini API key (click API button in top bar).
                <br/>
                <strong>Recommended:</strong> Use the purple <strong>SCENE</strong> button instead (top-right in Hierarchy panel) for instant scene loading.
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
              <div className="text-red-400 text-sm">
                <strong>Error:</strong> {errorMessage}
                <br/>
                <span className="text-xs">If you don't have an API key, use the SCENE button instead to load pre-built scenes.</span>
              </div>
            </div>
          )}

          {/* Prompt Input */}
          <div className="mb-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSubmit();
                }
              }}
              placeholder="surgical robot performing precision task, warehouse with stacked pallets, robotic arm grasping objects..."
              className="w-full h-32 px-4 py-3 bg-white/10 border-2 border-cyan-500/30 rounded-xl text-white text-base font-mono placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:bg-white/15 transition-all resize-none"
              autoFocus
            />
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span>Describe physics scenarios for ML training data</span>
              <span className="text-cyan-400 font-mono">Ctrl + Enter to generate</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Generate Button */}
            <button
              onClick={handleSubmit}
              disabled={isAnalyzing || !prompt.trim()}
              className={`flex-1 h-12 rounded-xl font-bold text-base tracking-wider transition-all flex items-center justify-center gap-3 ${
                isAnalyzing
                  ? 'bg-yellow-500/30 text-yellow-300 cursor-wait animate-pulse'
                  : prompt.trim()
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 shadow-[0_0_30px_rgba(34,211,238,0.5)]'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  GENERATING...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  GENERATE SCENE
                </>
              )}
            </button>

            {/* Quick Controls */}
            <button
              onClick={togglePause}
              className="h-12 px-4 bg-black/40 hover:bg-black/60 border border-white/20 rounded-xl text-white transition-all flex items-center gap-2"
              title={isPaused ? "Play" : "Pause"}
            >
              {isPaused ? <Play size={18}/> : <Pause size={18}/>}
              <span className="text-sm font-bold">{isPaused ? 'PLAY' : 'PAUSE'}</span>
            </button>

            <button
              onClick={onReset}
              className="h-12 px-4 bg-black/40 hover:bg-black/60 border border-white/20 rounded-xl text-white transition-all"
              title="Reset Simulation"
            >
              <RefreshCw size={18}/>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
