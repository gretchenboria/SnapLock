/**
 * SNAPPY AI CHATBOT
 *
 * Real LLM-powered assistant that helps users with SnapLock.
 * Uses Gemini API to answer questions about physics simulations, features, and troubleshooting.
 */

import React, { useState } from 'react';
import { X, Send, Bot } from 'lucide-react';
import { askSnappy } from '../services/snappyChatbot';

interface SnappyChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateScene?: (prompt: string) => void; // Callback to trigger scene generation
}

export function SnappyChatbot({ isOpen, onClose, onGenerateScene }: SnappyChatbotProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      // Check if this is a scene generation command
      const isSceneGenCommand = /^(generate|create|spawn|make|build|show me)\s+/i.test(userMsg.trim());

      if (isSceneGenCommand && onGenerateScene) {
        // Extract the scene description (everything after the command word)
        const scenePrompt = userMsg.replace(/^(generate|create|spawn|make|build|show me)\s+/i, '').trim();

        // Trigger scene generation
        onGenerateScene(scenePrompt);

        // Respond to user
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `🎬 Generating scene: "${scenePrompt}"\n\nI'm using AI to analyze your prompt and spawn objects with the right physics properties. Check the 3D viewport!`
        }]);
      } else {
        // Normal chat
        const response = await askSnappy(userMsg, messages);
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${(error as Error).message}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-black/95 border-2 border-cyan-500/50 rounded-lg shadow-[0_0_40px_rgba(34,211,238,0.3)] z-[9999] pointer-events-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-cyan-500/30">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-bold text-cyan-300">SNAPPY AI ASSISTANT</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-8 space-y-3">
            <div className="text-cyan-300 font-bold">👋 Hi! I'm Snappy, your AI assistant.</div>
            <div className="text-left bg-cyan-900/20 border border-cyan-500/30 rounded p-3 space-y-2">
              <div className="font-bold text-cyan-300">🎬 Generate Scenes:</div>
              <div className="text-xs space-y-1">
                <div>• "generate office with laptops"</div>
                <div>• "create falling cubes"</div>
                <div>• "spawn conference room"</div>
              </div>
            </div>
            <div className="text-xs">Or ask me anything about SnapLock!</div>
          </div>
        )}
        {messages.map((msg, idx) => (
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
        {loading && (
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Snappy anything..."
            className="flex-1 bg-black/40 border border-cyan-500/30 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded px-3 py-2 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
