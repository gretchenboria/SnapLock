/**
 * CHAOS ACTIVITY PANEL
 *
 * Displays real-time Chaos mode actions and reasoning
 */

import React from 'react';
import { Skull, Activity } from 'lucide-react';

interface ChaosActivityPanelProps {
  isActive: boolean;
  currentActivity: string;
}

export function ChaosActivityPanel({ isActive, currentActivity }: ChaosActivityPanelProps) {
  if (!isActive) return null;

  // Parse activity to extract action type and reasoning
  const [actionType, reasoning] = currentActivity.includes(':')
    ? currentActivity.split(':').map(s => s.trim())
    : [currentActivity, ''];

  // Get action color based on type
  const getActionColor = () => {
    if (actionType.includes('GRAVITY')) return 'text-purple-400 border-purple-500/50';
    if (actionType.includes('WIND')) return 'text-cyan-400 border-cyan-500/50';
    if (actionType.includes('FRICTION')) return 'text-orange-400 border-orange-500/50';
    if (actionType.includes('ENTROPY')) return 'text-red-400 border-red-500/50';
    if (actionType.includes('SPAWN')) return 'text-yellow-400 border-yellow-500/50';
    if (actionType.includes('LIGHTING')) return 'text-blue-400 border-blue-500/50';
    if (actionType.includes('SENSOR')) return 'text-green-400 border-green-500/50';
    if (actionType.includes('Error')) return 'text-red-400 border-red-500/50';
    return 'text-gray-400 border-gray-500/50';
  };

  return (
    <div className="fixed top-32 left-6 w-80 bg-black/90 backdrop-blur-sm border-2 border-red-500/50 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.3)] z-50 pointer-events-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-950/60 to-red-900/40 px-4 py-2 border-b border-red-500/30 flex items-center gap-2">
        <Skull className="w-4 h-4 text-red-400" strokeWidth={2.5} />
        <span className="text-xs font-bold text-red-300">CHAOS MODE ACTIVE</span>
        <Activity className="w-3 h-3 text-red-400 animate-pulse ml-auto" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Current Action */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Current Action:</div>
          <div className={`text-sm font-bold px-2 py-1 rounded border ${getActionColor()} bg-black/40`}>
            {actionType || 'Initializing...'}
          </div>
        </div>

        {/* Reasoning */}
        {reasoning && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Reasoning:</div>
            <div className="text-xs text-gray-300 leading-relaxed bg-black/40 px-2 py-1.5 rounded border border-gray-700/50">
              {reasoning}
            </div>
          </div>
        )}

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 border-t border-red-500/20">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span>Analyzing scene every 6s</span>
        </div>
      </div>

      {/* Glow effect */}
      <div className="absolute inset-0 bg-red-500/5 rounded-lg animate-pulse pointer-events-none" />
    </div>
  );
}
