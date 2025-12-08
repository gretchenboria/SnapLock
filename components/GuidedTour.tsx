import React, { useState, useEffect } from 'react';
import { Sparkles, Zap, Play, Settings, Database, X, ChevronRight, CheckCircle } from 'lucide-react';

interface GuidedTourProps {
  onComplete: () => void;
}

export function GuidedTour({ onComplete }: GuidedTourProps) {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const steps = [
    {
      title: "Welcome to SnapLock",
      description: "Generate synthetic physics training data for robotics and computer vision AI models.",
      icon: Sparkles,
      spotlight: null,
      actions: []
    },
    {
      title: "Step 1: Configure API",
      description: "Click the API button (top right) to enter your Gemini API key. This enables AI-powered features like Auto-Spawn and prompt enhancement.",
      icon: Settings,
      spotlight: "api-button",
      actions: [
        "Get free API key from https://aistudio.google.com/apikey",
        "Click API button",
        "Enter your key",
        "Click SAVE & RELOAD"
      ]
    },
    {
      title: "Step 2: How It Works",
      description: "SnapLock uses AI to automatically extract physics parameters from your text descriptions - no manual configuration needed.",
      icon: Zap,
      spotlight: null,
      actions: [
        "Type a scenario like 'falling cubes' or 'zero-g debris field'",
        "AI automatically extracts: object types, physics properties, spawn patterns",
        "Objects are instantiated (spawned) with correct properties",
        "Perfect for rapid synthetic data generation"
      ]
    },
    {
      title: "Auto-Spawn Feature",
      description: "AI automatically analyzes your prompts and spawns objects with physics. No manual parameter tweaking required.",
      icon: Play,
      spotlight: "auto-spawn-button",
      actions: [
        "Type: 'floating debris field' → AI spawns debris with zero gravity",
        "Type: 'falling cubes' → AI spawns cubes with Earth gravity",
        "Type: 'collision test' → AI spawns objects with collision physics",
        "AI extracts shapes, masses, materials, spawn positions automatically"
      ]
    },
    {
      title: "Manual Control",
      description: "For advanced users: override AI decisions and manually adjust physics parameters in the left panel.",
      icon: Play,
      spotlight: "command-input",
      actions: [
        "Type your prompt as usual",
        "AI spawns initial configuration",
        "Override: Use left panel to manually adjust gravity, wind, materials",
        "Fine-tune: Modify spawn patterns, object properties, physics behavior"
      ]
    },
    {
      title: "Export Training Data",
      description: "Capture frames and export in COCO or YOLO format for training computer vision models.",
      icon: Database,
      spotlight: "dataset-tab",
      actions: [
        "Click DATASET tab (left panel)",
        "Click START RECORDING to capture frames",
        "Click STOP RECORDING when done",
        "Export as COCO JSON or YOLO format"
      ]
    }
  ];

  const currentStep = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem('snaplock_tour_completed', 'true');
    setTimeout(onComplete, 300);
  };

  if (!isVisible) return null;

  const Icon = currentStep.icon;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md animate-in fade-in duration-300" />

      {/* Spotlight Effect */}
      {currentStep.spotlight && (
        <div
          className="fixed z-[10001] pointer-events-none"
          style={{
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.85)',
            animation: 'pulse 2s ease-in-out infinite'
          }}
        />
      )}

      {/* Tour Card */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10002] w-full max-w-2xl px-4 animate-in zoom-in slide-in-from-bottom-8 duration-500">
        <div className="bg-gradient-to-br from-scifi-900 to-scifi-800 border-2 border-scifi-cyan-light/40 rounded-2xl shadow-[0_0_80px_rgba(34,211,238,0.5)] overflow-hidden">

          {/* Header */}
          <div className="relative p-8 border-b border-white/10">
            <div className="absolute top-0 right-0 p-4">
              <button
                onClick={handleSkip}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-scifi-cyan/20 to-purple-600/20 border-2 border-scifi-cyan-light flex items-center justify-center flex-shrink-0">
                <Icon className="w-8 h-8 text-scifi-cyan-light" />
              </div>

              <div className="flex-1">
                <div className="text-xs font-bold text-scifi-cyan-light tracking-widest mb-2">
                  STEP {step + 1} OF {steps.length}
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">{currentStep.title}</h2>
                <p className="text-gray-300 leading-relaxed">{currentStep.description}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          {currentStep.actions.length > 0 && (
            <div className="p-8 bg-black/20">
              <div className="space-y-3">
                {currentStep.actions.map((action, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 text-sm text-gray-200"
                  >
                    <ChevronRight className="w-5 h-5 text-scifi-cyan-light flex-shrink-0 mt-0.5" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Indicators */}
          <div className="flex items-center justify-center gap-2 p-4 bg-black/30">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === step
                    ? 'w-8 bg-scifi-cyan-light'
                    : index < step
                    ? 'w-2 bg-scifi-cyan-light/50'
                    : 'w-2 bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-white/10 bg-black/40">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-2 text-sm font-bold text-gray-300 hover:text-white transition-colors"
              >
                BACK
              </button>
            )}

            <div className="flex gap-3 ml-auto">
              <button
                onClick={handleSkip}
                className="px-6 py-2 text-sm font-bold text-gray-400 hover:text-gray-200 transition-colors"
              >
                SKIP TOUR
              </button>
              <button
                onClick={handleNext}
                className="px-8 py-3 text-sm font-bold text-scifi-900 bg-scifi-cyan-light hover:bg-scifi-cyan-bright rounded transition-colors flex items-center gap-2 shadow-lg"
              >
                {step === steps.length - 1 ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    GOT IT
                  </>
                ) : (
                  <>
                    NEXT
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
