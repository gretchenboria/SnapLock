/**
 * SNAPPY ASSISTANT
 *
 * A soft, subtle floating assistant that provides tips and guidance.
 * Features smooth animations, non-distracting presence, and cute design.
 */

import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

interface Tip {
  id: string;
  title: string;
  message: string;
  category: 'getting-started' | 'feature' | 'tip' | 'advanced';
}

interface SnappyAssistantProps {
  isEnabled: boolean;
  onClose: () => void;
}

const TIPS: Tip[] = [
  {
    id: 'welcome',
    title: 'Welcome to SnapLock!',
    message: 'Hi! I\'m Snappy. I\'m here to help you get the most out of SnapLock. Click me anytime for tips!',
    category: 'getting-started'
  },
  {
    id: 'auto-spawn',
    title: 'Auto-Spawn Mode',
    message: 'Type a physics scenario in the command line and press Enter. The AI will automatically generate your simulation!',
    category: 'getting-started'
  },
  {
    id: 'manual-mode',
    title: 'Manual Control',
    message: 'Toggle off Auto-Spawn to manually configure physics parameters, gravity, wind, and asset groups.',
    category: 'feature'
  },
  {
    id: 'view-modes',
    title: 'View Modes',
    message: 'Switch between different camera views using the view mode buttons in the top right corner.',
    category: 'feature'
  },
  {
    id: 'chaos',
    title: 'Chaos Mode',
    message: 'Chaos Mode adds unpredictability and disturbances to test your AI systems under stress conditions.',
    category: 'advanced'
  },
  {
    id: 'lazarus',
    title: 'Lazarus Debugger',
    message: 'Having issues? Click the LAZARUS button to run comprehensive diagnostics on your simulation.',
    category: 'advanced'
  },
  {
    id: 'export',
    title: 'Export Data',
    message: 'Capture images and videos of your simulation to use as training data for computer vision models.',
    category: 'feature'
  },
  {
    id: 'materials',
    title: 'Material Presets',
    message: 'Try different material presets like rubber, ice, or metal to see how physics properties affect behavior.',
    category: 'tip'
  },
  {
    id: 'performance',
    title: 'Performance Tip',
    message: 'Keep particle counts under 500 for optimal performance. Check FPS in the telemetry panel.',
    category: 'tip'
  }
];

export function SnappyAssistant({ isEnabled, onClose }: SnappyAssistantProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  // Show welcome tip on first render
  useEffect(() => {
    if (isEnabled && !hasShownWelcome) {
      setIsExpanded(true);
      setHasShownWelcome(true);

      // Auto-collapse after 5 seconds
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isEnabled, hasShownWelcome]);

  // Cycle through tips periodically (every 30 seconds when not expanded)
  useEffect(() => {
    if (!isExpanded && isEnabled) {
      const interval = setInterval(() => {
        setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isExpanded, isEnabled]);

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleNextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
  };

  const handlePreviousTip = () => {
    setCurrentTipIndex((prev) => (prev - 1 + TIPS.length) % TIPS.length);
  };

  if (!isEnabled) return null;

  const currentTip = TIPS[currentTipIndex];

  return (
    <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none">
      <div className="relative pointer-events-auto">

        {/* SNAPPY SPHERE - Floating gently */}
        <div
          onClick={handleToggleExpanded}
          className="relative cursor-pointer group"
          style={{
            animation: 'snappyFloat 4s ease-in-out infinite'
          }}
        >
          {/* Outer glow */}
          <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-2xl scale-150 group-hover:bg-cyan-300/30 transition-all duration-500" />

          {/* Main sphere with large glowing eyes */}
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 via-cyan-400/15 to-cyan-600/20 backdrop-blur-md border border-cyan-400/30 shadow-[0_0_40px_rgba(34,211,238,0.5)] group-hover:shadow-[0_0_60px_rgba(34,211,238,0.7)] transition-all duration-500">

            {/* Inner glow effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-300/10 to-transparent" />

            {/* Large prominent eyes - inspired by reference */}
            <div className="absolute inset-0 flex items-center justify-center gap-2">
              {/* Left Eye */}
              <div className="relative">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.9)]"
                     style={{ animation: 'snappyBlink 4s ease-in-out infinite' }}>
                  {/* Eye highlight */}
                  <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-white/90" />
                  {/* Pupil */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-900" />
                </div>
                {/* Outer glow */}
                <div className="absolute inset-0 rounded-full bg-cyan-400/40 blur-md scale-150" />
              </div>

              {/* Right Eye */}
              <div className="relative">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.9)]"
                     style={{ animation: 'snappyBlink 4s ease-in-out infinite' }}>
                  {/* Eye highlight */}
                  <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-white/90" />
                  {/* Pupil */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-900" />
                </div>
                {/* Outer glow */}
                <div className="absolute inset-0 rounded-full bg-cyan-400/40 blur-md scale-150" />
              </div>
            </div>

            {/* Sparkle indicator when tip is ready */}
            {!isExpanded && (
              <div className="absolute -top-1 -right-1">
                <Sparkles size={14} className="text-cyan-300 animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* TIP BUBBLE - Appears when expanded */}
        {isExpanded && (
          <div
            className="absolute bottom-20 right-0 w-80 bg-black/90 backdrop-blur-xl rounded-2xl border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.3)] overflow-hidden"
            style={{
              animation: 'snappySlideIn 0.3s ease-out'
            }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-4 py-3 border-b border-cyan-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-cyan-400" />
                <span className="text-sm font-semibold text-cyan-300">
                  Snappy's Tips
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tip Content */}
            <div className="p-4">
              <div className="mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  currentTip.category === 'getting-started' ? 'bg-green-500/20 text-green-300' :
                  currentTip.category === 'feature' ? 'bg-blue-500/20 text-blue-300' :
                  currentTip.category === 'tip' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-purple-500/20 text-purple-300'
                }`}>
                  {currentTip.category.replace('-', ' ').toUpperCase()}
                </span>
              </div>

              <h3 className="text-white font-semibold mb-2 text-sm">
                {currentTip.title}
              </h3>

              <p className="text-gray-300 text-xs leading-relaxed mb-4">
                {currentTip.message}
              </p>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-3 border-t border-cyan-500/20">
                <button
                  onClick={handlePreviousTip}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Previous
                </button>

                <span className="text-xs text-gray-500">
                  {currentTipIndex + 1} / {TIPS.length}
                </span>

                <button
                  onClick={handleNextTip}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes snappyFloat {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-8px) translateX(4px);
          }
          50% {
            transform: translateY(-4px) translateX(-4px);
          }
          75% {
            transform: translateY(-10px) translateX(2px);
          }
        }

        @keyframes snappyBlink {
          0%, 46%, 50%, 100% {
            opacity: 1;
          }
          48% {
            opacity: 0;
          }
        }

        @keyframes snappySlideIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
