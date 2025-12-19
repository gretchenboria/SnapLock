/**
 * PROMINENT TELEMETRY DISPLAY
 * Large, visible, critical data for VR/Robotics
 */

import React, { useEffect, useRef } from 'react';
import { Activity, Crosshair, Gauge, Target } from 'lucide-react';
import { TelemetryData } from '../types';

interface ProminentTelemetryProps {
  telemetryRef: React.MutableRefObject<TelemetryData>;
}

export function ProminentTelemetry({ telemetryRef }: ProminentTelemetryProps) {
  const fpsRef = useRef<HTMLDivElement>(null);
  const particleRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<HTMLDivElement>(null);
  const quatRef = useRef<HTMLDivElement>(null);
  const velRef = useRef<HTMLDivElement>(null);
  const energyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Graph data
  const fpsHistory = useRef<number[]>([]);
  const maxHistory = 60; // 60 data points

  useEffect(() => {
    let active = true;
    const update = () => {
      if (!active) return;
      const data = telemetryRef.current;

      if (fpsRef.current) {
        fpsRef.current.innerText = `${data.fps.toFixed(0)}`;
        fpsRef.current.style.color = data.fps < 30 ? '#ef4444' : data.fps < 50 ? '#f59e0b' : '#22d3ee';
      }

      if (particleRef.current) {
        particleRef.current.innerText = `${data.particleCount}`;
      }

      if (energyRef.current) {
        if (data.isWarmup) {
          energyRef.current.innerText = 'WARMUP';
          energyRef.current.style.color = '#f59e0b';
        } else {
          energyRef.current.innerText = `${(data.systemEnergy / 1000).toFixed(1)} kJ`;
          energyRef.current.style.color = '#22d3ee';
        }
      }

      if (posRef.current && data.samplePosition) {
        const p = data.samplePosition;
        posRef.current.innerText = `[${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}]`;
      }

      if (quatRef.current && data.sampleQuaternion) {
        const q = data.sampleQuaternion;
        quatRef.current.innerText = `[${q.x.toFixed(2)}, ${q.y.toFixed(2)}, ${q.z.toFixed(2)}, ${q.w.toFixed(2)}]`;
      }

      if (velRef.current && data.sampleVelocity) {
        const v = data.sampleVelocity;
        velRef.current.innerText = `[${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}]`;
      }

      // Update graph
      fpsHistory.current.push(data.fps);
      if (fpsHistory.current.length > maxHistory) {
        fpsHistory.current.shift();
      }

      // Draw graph
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          // Clear
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(0, 0, width, height);

          // Grid lines
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.1)';
          ctx.lineWidth = 1;
          for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }

          // Draw FPS line
          if (fpsHistory.current.length > 1) {
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 2;
            ctx.beginPath();

            const xStep = width / (maxHistory - 1);
            const yScale = height / 120; // 0-120 FPS range

            fpsHistory.current.forEach((fps, i) => {
              const x = i * xStep;
              const y = height - (fps * yScale);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });

            ctx.stroke();
          }

          // Labels
          ctx.fillStyle = '#22d3ee';
          ctx.font = '10px monospace';
          ctx.fillText('FPS', 5, 12);
          ctx.fillText('120', width - 25, 12);
          ctx.fillText('0', width - 15, height - 2);
        }
      }

      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
    return () => { active = false; };
  }, [telemetryRef]);

  return (
    <div className="fixed top-20 left-80 w-72 bg-black/95 border-2 border-cyan-500/50 rounded-lg shadow-[0_0_40px_rgba(34,211,238,0.4)] z-40 pointer-events-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-950/60 to-cyan-900/40 px-4 py-3 border-b border-cyan-500/30 flex items-center gap-2">
        <Activity className="w-5 h-5 text-cyan-400" strokeWidth={2.5} />
        <span className="text-base font-bold text-cyan-300 tracking-wider">LIVE TELEMETRY</span>
        <div className="ml-auto w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Real-time Graph */}
        <div className="bg-black/60 border border-cyan-500/30 rounded p-2">
          <div className="text-xs text-gray-400 mb-2">FPS GRAPH (Real-time)</div>
          <canvas
            ref={canvasRef}
            width={336}
            height={80}
            className="w-full h-20 rounded"
          />
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-black/60 border border-cyan-500/30 rounded p-2 text-center">
            <div className="text-xs text-gray-400 mb-1">FPS</div>
            <div ref={fpsRef} className="text-2xl font-bold font-mono text-cyan-400">--</div>
          </div>
          <div className="bg-black/60 border border-cyan-500/30 rounded p-2 text-center">
            <div className="text-xs text-gray-400 mb-1">PARTICLES</div>
            <div ref={particleRef} className="text-2xl font-bold font-mono text-cyan-400">--</div>
          </div>
          <div className="bg-black/60 border border-cyan-500/30 rounded p-2 text-center">
            <div className="text-xs text-gray-400 mb-1">ENERGY</div>
            <div ref={energyRef} className="text-xl font-bold font-mono text-cyan-400">--</div>
          </div>
        </div>

        {/* VR/Robotics Tracking */}
        <div className="border-t border-cyan-500/20 pt-3">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-green-400" />
            <span className="text-sm font-bold text-green-400 tracking-wider">VR/ROBOTICS TRACKING</span>
          </div>

          <div className="space-y-2">
            {/* Position */}
            <div className="bg-black/60 border border-green-500/30 rounded p-2">
              <div className="flex items-center gap-2 mb-1">
                <Crosshair className="w-3 h-3 text-green-400" />
                <span className="text-xs text-gray-400">POSITION (m)</span>
              </div>
              <div ref={posRef} className="text-sm font-mono font-bold text-green-300">--</div>
            </div>

            {/* Quaternion */}
            <div className="bg-black/60 border border-yellow-500/30 rounded p-2">
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-gray-400">QUATERNION [x,y,z,w]</span>
              </div>
              <div ref={quatRef} className="text-sm font-mono font-bold text-yellow-300">--</div>
            </div>

            {/* Velocity */}
            <div className="bg-black/60 border border-blue-500/30 rounded p-2">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-gray-400">VELOCITY (m/s)</span>
              </div>
              <div ref={velRef} className="text-sm font-mono font-bold text-blue-300">--</div>
            </div>
          </div>
        </div>
      </div>

      {/* Glow effect */}
      <div className="absolute inset-0 bg-cyan-500/5 rounded-lg animate-pulse pointer-events-none" />
    </div>
  );
}
