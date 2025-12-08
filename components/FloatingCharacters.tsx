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
    <div className="fixed inset-0 pointer-events-none z-[100]">

      {/* Chaos Skull - Top Right */}
      {isChaosActive && (
        <button
          onClick={onChaosClick}
          className="absolute top-20 right-8 pointer-events-auto transition-all duration-300 hover:scale-110 group"
          style={{
            animation: 'float 6s ease-in-out infinite',
            animationDelay: '0s'
          }}
          title="Chaos Mode Active"
        >
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-red-500/30 rounded-full blur-xl animate-pulse" />

            {/* Skull */}
            <div className="relative bg-gradient-to-br from-red-950/60 to-red-900/40 backdrop-blur-sm border-2 border-red-500/50 rounded-full p-3 shadow-[0_0_30px_rgba(239,68,68,0.5)]">
              <Skull
                className="w-6 h-6 text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                strokeWidth={2.5}
              />
            </div>
          </div>
        </button>
      )}

      {/* Lazarus Bug - Top Left */}
      <button
        onClick={onLazarusClick}
        className="absolute top-20 left-8 pointer-events-auto transition-all duration-300 hover:scale-110 group"
        style={{
          animation: 'float 7s ease-in-out infinite',
          animationDelay: '1s'
        }}
        title="Lazarus Diagnostics"
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-green-500/30 rounded-full blur-xl animate-pulse" />

          {/* Bug */}
          <div className="relative bg-gradient-to-br from-green-950/60 to-green-900/40 backdrop-blur-sm border-2 border-green-500/50 rounded-full p-3 shadow-[0_0_30px_rgba(34,197,94,0.5)]">
            <Bug
              className="w-6 h-6 text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]"
              strokeWidth={2.5}
            />
          </div>
        </div>
      </button>

      {/* Snappy Eyes - Bottom Right */}
      <button
        onClick={onSnappyClick}
        className="absolute bottom-20 right-8 pointer-events-auto transition-all duration-300 hover:scale-110 group"
        style={{
          animation: 'float 8s ease-in-out infinite',
          animationDelay: '2s'
        }}
        title="Snappy Assistant"
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-cyan-500/30 rounded-full blur-xl" />

          {/* Eyes Container */}
          <div className="relative bg-gradient-to-br from-cyan-950/60 to-cyan-900/40 backdrop-blur-sm border-2 border-cyan-500/50 rounded-full p-3 shadow-[0_0_30px_rgba(34,211,238,0.5)]">
            <div className="flex items-center gap-1.5">
              {/* Left Eye */}
              <div className="relative">
                <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,1)]" />
                <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-75" style={{ animationDuration: '2s' }} />
              </div>

              {/* Right Eye */}
              <div className="relative">
                <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,1)]" />
                <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-75" style={{ animationDuration: '2s', animationDelay: '0.1s' }} />
              </div>
            </div>
          </div>
        </div>
      </button>

      <style jsx>{`
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
      `}</style>
    </div>
  );
}
