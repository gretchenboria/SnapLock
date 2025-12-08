import React, { useState } from 'react';
import { Skull, Bug, Bot, X, Send } from 'lucide-react';

interface CharactersProps {
  // Chaos
  isChaosActive: boolean;
  chaosActivity?: string;
  onChaosClick?: () => void;

  // Lazarus
  lazarusStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'ERROR';
  lazarusSummary?: string;
  onLazarusClick?: () => void;

  // Snappy
  onSnappyMessage: (message: string) => Promise<string>;
}

export function Characters({
  isChaosActive,
  chaosActivity,
  onChaosClick,
  lazarusStatus,
  lazarusSummary,
  onLazarusClick,
  onSnappyMessage
}: CharactersProps) {
  const [snappyOpen, setSnappyOpen] = useState(false);
  const [snappyInput, setSnappyInput] = useState('');
  const [snappyMessages, setSnappyMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [snappyLoading, setSnappyLoading] = useState(false);

  const handleSnappySend = async () => {
    if (!snappyInput.trim() || snappyLoading) return;

    const userMsg = snappyInput;
    setSnappyInput('');
    setSnappyMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setSnappyLoading(true);

    try {
      const response = await onSnappyMessage(userMsg);
      setSnappyMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setSnappyMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure your API key is configured.'
      }]);
    } finally {
      setSnappyLoading(false);
    }
  };

  const getLazarusColor = () => {
    switch (lazarusStatus) {
      case 'HEALTHY': return 'green';
      case 'WARNING': return 'yellow';
      case 'CRITICAL': return 'orange';
      case 'ERROR': return 'red';
      default: return 'gray';
    }
  };

  return (
    <>
      {/* Character Container - Bottom Left, compact */}
      <div className="fixed bottom-6 left-6 flex flex-col gap-3 z-[80] pointer-events-none">

        {/* Lazarus Bug */}
        <button
          onClick={onLazarusClick}
          className="pointer-events-auto transition-all duration-300 hover:scale-110 group relative"
          title={`Lazarus: ${lazarusStatus}`}
        >
          <div className="relative">
            <div className={`absolute inset-0 bg-${getLazarusColor()}-500/30 rounded-full blur-xl animate-pulse`} />
            <div className={`relative bg-gradient-to-br from-${getLazarusColor()}-950/60 to-${getLazarusColor()}-900/40 backdrop-blur-sm border-2 border-${getLazarusColor()}-500/50 rounded-full p-2 shadow-[0_0_20px_rgba(34,197,94,0.4)]`}>
              <Bug
                className={`w-5 h-5 text-${getLazarusColor()}-400`}
                strokeWidth={2.5}
              />
            </div>
          </div>
          {lazarusSummary && (
            <div className="absolute left-14 bottom-0 bg-black/90 border border-green-500/30 rounded px-3 py-1.5 text-xs text-green-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {lazarusSummary}
            </div>
          )}
        </button>

        {/* Chaos Skull */}
        {isChaosActive && (
          <button
            onClick={onChaosClick}
            className="pointer-events-auto transition-all duration-300 hover:scale-110 group relative"
            title="Chaos Mode Active"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/30 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-gradient-to-br from-red-950/60 to-red-900/40 backdrop-blur-sm border-2 border-red-500/50 rounded-full p-2 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                <Skull
                  className="w-5 h-5 text-red-400"
                  strokeWidth={2.5}
                />
              </div>
            </div>
            {chaosActivity && (
              <div className="absolute left-14 bottom-0 bg-black/90 border border-red-500/30 rounded px-3 py-1.5 text-xs text-red-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {chaosActivity}
              </div>
            )}
          </button>
        )}

        {/* Snappy Bot */}
        <button
          onClick={() => setSnappyOpen(!snappyOpen)}
          className="pointer-events-auto transition-all duration-300 hover:scale-110 group relative"
          title="Snappy Assistant"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/30 rounded-full blur-xl" />
            <div className="relative bg-gradient-to-br from-cyan-950/60 to-cyan-900/40 backdrop-blur-sm border-2 border-cyan-500/50 rounded-full p-2 shadow-[0_0_20px_rgba(34,211,238,0.4)]">
              <Bot
                className="w-5 h-5 text-cyan-400"
                strokeWidth={2.5}
              />
            </div>
          </div>
        </button>
      </div>

      {/* Snappy Chat Window */}
      {snappyOpen && (
        <div className="fixed bottom-24 left-6 w-96 h-[500px] bg-black/95 border-2 border-cyan-500/50 rounded-lg shadow-[0_0_40px_rgba(34,211,238,0.3)] z-[90] pointer-events-auto flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-cyan-500/30">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-bold text-cyan-300">SNAPPY ASSISTANT</span>
            </div>
            <button
              onClick={() => setSnappyOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {snappyMessages.length === 0 && (
              <div className="text-center text-gray-500 text-sm mt-8">
                Hi! I'm Snappy. Ask me anything about SnapLock, physics simulations, or how to use the app.
              </div>
            )}
            {snappyMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-cyan-600/20 text-cyan-100 border border-cyan-500/30'
                      : 'bg-gray-800/50 text-gray-200 border border-gray-700/50'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {snappyLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800/50 text-gray-400 border border-gray-700/50 px-3 py-2 rounded-lg text-sm">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-cyan-500/30">
            <div className="flex gap-2">
              <input
                type="text"
                value={snappyInput}
                onChange={(e) => setSnappyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSnappySend()}
                placeholder="Ask Snappy anything..."
                className="flex-1 bg-black/40 border border-cyan-500/30 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
                disabled={snappyLoading}
              />
              <button
                onClick={handleSnappySend}
                disabled={!snappyInput.trim() || snappyLoading}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded px-3 py-2 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
