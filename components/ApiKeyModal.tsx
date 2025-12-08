import React, { useState, useEffect } from 'react';
import { X, Key, CheckCircle, AlertTriangle } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [backendUrl, setBackendUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'direct' | 'backend'>('direct');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedApiKey = localStorage.getItem('snaplock_api_key') || '';
      const storedBackendUrl = localStorage.getItem('snaplock_backend_url') || '';
      setApiKey(storedApiKey);
      setBackendUrl(storedBackendUrl);
      setSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (activeTab === 'direct') {
      if (apiKey.trim()) {
        localStorage.setItem('snaplock_api_key', apiKey.trim());
        localStorage.removeItem('snaplock_backend_url');
      } else {
        localStorage.removeItem('snaplock_api_key');
      }
    } else {
      if (backendUrl.trim()) {
        localStorage.setItem('snaplock_backend_url', backendUrl.trim());
        localStorage.removeItem('snaplock_api_key');
      } else {
        localStorage.removeItem('snaplock_backend_url');
      }
    }
    setSaved(true);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleClear = () => {
    localStorage.removeItem('snaplock_api_key');
    localStorage.removeItem('snaplock_backend_url');
    setApiKey('');
    setBackendUrl('');
    setSaved(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-scifi-900 border border-scifi-cyan-light/30 rounded-lg shadow-[0_0_50px_rgba(34,211,238,0.3)] max-w-2xl w-full animate-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Key className="w-6 h-6 text-scifi-cyan-light" />
            <div>
              <h2 className="text-xl font-bold text-white">API Configuration</h2>
              <p className="text-xs text-gray-400 mt-1">Configure Gemini API access for AI features</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex-1 px-6 py-3 text-sm font-bold tracking-wider transition-colors border-b-2 ${
              activeTab === 'direct'
                ? 'border-scifi-cyan-light text-white bg-white/5'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            DIRECT API KEY
          </button>
          <button
            onClick={() => setActiveTab('backend')}
            className={`flex-1 px-6 py-3 text-sm font-bold tracking-wider transition-colors border-b-2 ${
              activeTab === 'backend'
                ? 'border-scifi-cyan-light text-white bg-white/5'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            BACKEND PROXY
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {activeTab === 'direct' ? (
            <>
              <div>
                <label className="text-sm font-bold text-gray-200 block mb-2 tracking-wide">
                  GEMINI API KEY
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key..."
                  className="w-full bg-black/40 border border-white/20 rounded px-4 py-3 text-white font-mono text-sm focus:border-scifi-cyan-light focus:outline-none transition-colors"
                />
              </div>

              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-200 space-y-1">
                  <p className="font-bold">Development Only</p>
                  <p>Direct API keys are stored in browser localStorage. For production use, configure a backend proxy instead.</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-gray-400">
                  Get your free API key from Google AI Studio:
                </p>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-scifi-cyan-light hover:text-scifi-cyan-bright text-xs font-mono underline"
                >
                  https://aistudio.google.com/apikey
                </a>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-bold text-gray-200 block mb-2 tracking-wide">
                  BACKEND URL
                </label>
                <input
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  placeholder="https://your-backend.com"
                  className="w-full bg-black/40 border border-white/20 rounded px-4 py-3 text-white font-mono text-sm focus:border-scifi-cyan-light focus:outline-none transition-colors"
                />
              </div>

              <div className="bg-green-900/20 border border-green-500/30 rounded p-4 flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-green-200 space-y-1">
                  <p className="font-bold">Recommended for Production</p>
                  <p>Backend proxy keeps your API keys secure server-side and provides better rate limiting control.</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-gray-400">
                  Your backend should proxy requests to the Gemini API and handle authentication.
                </p>
              </div>
            </>
          )}

          {/* Save Confirmation */}
          {saved && (
            <div className="bg-green-900/20 border border-green-500/50 rounded p-3 flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm text-green-300 font-medium">Configuration saved! Reloading...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10 bg-black/20">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
          >
            CLEAR
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-bold text-gray-300 hover:text-white bg-black/40 border border-white/20 rounded transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              disabled={activeTab === 'direct' ? !apiKey.trim() : !backendUrl.trim()}
              className="px-6 py-2 text-sm font-bold text-black bg-scifi-cyan-light hover:bg-scifi-cyan-bright rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              SAVE & RELOAD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
