import React from 'react';
import { Skull, Bug } from 'lucide-react';

interface FloatingCharactersProps {
  isChaosActive: boolean;
  onChaosClick?: () => void;
  onLazarusClick?: () => void;
  onSnappyClick?: () => void;
}

export function FloatingCharacters({
  isChaosActive,
  onChaosClick,
  onLazarusClick,
  onSnappyClick
}: FloatingCharactersProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[99]">

      {/* Chaos Skull - Top Right (moved inward to not block API button) */}
      {isChaosActive && (
        <button
          onClick={onChaosClick}
          className="absolute top-32 right-24 pointer-events-auto transition-all duration-300 hover:scale-110 group"
          style={{
            animation: 'float 6s ease-in-out infinite',
            animationDelay: '0s'
          }}
          title="Chaos Mode Active"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/30 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-gradient-to-br from-red-950/60 to-red-900/40 backdrop-blur-sm border-2 border-red-500/50 rounded-full p-3 shadow-[0_0_30px_rgba(239,68,68,0.5)]">
              <Skull
                className="w-6 h-6 text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                strokeWidth={2.5}
              />
            </div>
          </div>
        </button>
      )}

      {/* Lazarus Bug - Top center-left (moved away from left panel) */}
      <button
        onClick={onLazarusClick}
        className="absolute top-32 left-96 pointer-events-auto transition-all duration-300 hover:scale-110 group"
        style={{
          animation: 'float 7s ease-in-out infinite',
          animationDelay: '1s'
        }}
        title="Lazarus Diagnostics"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-green-500/30 rounded-full blur-xl animate-pulse" />
          <div className="relative bg-gradient-to-br from-green-950/60 to-green-900/40 backdrop-blur-sm border-2 border-green-500/50 rounded-full p-3 shadow-[0_0_30px_rgba(34,197,94,0.5)]">
            <Bug
              className="w-6 h-6 text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]"
              strokeWidth={2.5}
            />
          </div>
        </div>
      </button>

      {/* Snappy Eyes - Bottom center (moved away from telemetry panel) */}
      <button
        onClick={onSnappyClick}
        className="absolute bottom-32 right-1/3 pointer-events-auto transition-all duration-300 hover:scale-110 group"
        style={{
          animation: 'float 8s ease-in-out infinite',
          animationDelay: '2s'
        }}
        title="Snappy Assistant"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-cyan-500/30 rounded-full blur-xl" />
          <div className="relative bg-gradient-to-br from-cyan-950/60 to-cyan-900/40 backdrop-blur-sm border-2 border-cyan-500/50 rounded-full p-3 shadow-[0_0_30px_rgba(34,211,238,0.5)]">
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,1)]" />
                <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-75" style={{ animationDuration: '2s' }} />
              </div>
              <div className="relative">
                <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,1)]" />
                <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-75" style={{ animationDuration: '2s', animationDelay: '0.1s' }} />
              </div>
            </div>
          </div>
        </div>
      </button>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-15px) translateX(5px);
          }
          50% {
            transform: translateY(-5px) translateX(-5px);
          }
          75% {
            transform: translateY(-10px) translateX(3px);
          }
        }
      `}} />
    </div>
  );
}
