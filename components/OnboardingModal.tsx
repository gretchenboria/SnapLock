import React, { useState } from 'react';
import { Sparkles, User, Mail, Image as ImageIcon, ChevronRight } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (profile: UserProfile) => void;
}

export interface UserProfile {
  username: string;
  email: string;
  profilePicture: string;
  preferences: {
    snappyEnabled: boolean;
    directorEnabled: boolean;
    autoSpawnEnabled: boolean;
  };
}

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [snappyEnabled, setSnappyEnabled] = useState(true);
  const [directorEnabled, setDirectorEnabled] = useState(false);
  const [autoSpawnEnabled, setAutoSpawnEnabled] = useState(true);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePicture(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = () => {
    const profile: UserProfile = {
      username,
      email,
      profilePicture,
      preferences: {
        snappyEnabled,
        directorEnabled,
        autoSpawnEnabled,
      },
    };
    onComplete(profile);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-scifi-900 border border-scifi-cyan-light/30 rounded-lg shadow-[0_0_80px_rgba(34,211,238,0.4)] max-w-2xl w-full animate-in zoom-in duration-500">

        {/* Header */}
        <div className="p-8 text-center border-b border-white/10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-scifi-cyan/20 to-purple-600/20 border-2 border-scifi-cyan-light flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-scifi-cyan-light" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to SnapLock</h1>
          <p className="text-gray-400">Let's set up your profile and preferences</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 p-4 bg-black/20">
          <div className={`w-12 h-1 rounded-full transition-colors ${step >= 1 ? 'bg-scifi-cyan-light' : 'bg-gray-700'}`} />
          <div className={`w-12 h-1 rounded-full transition-colors ${step >= 2 ? 'bg-scifi-cyan-light' : 'bg-gray-700'}`} />
          <div className={`w-12 h-1 rounded-full transition-colors ${step >= 3 ? 'bg-scifi-cyan-light' : 'bg-gray-700'}`} />
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Create Your Profile</h3>
                <p className="text-sm text-gray-400">This information will be saved locally in your browser</p>
              </div>

              {/* Profile Picture */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-2 border-scifi-cyan-light shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-600 flex items-center justify-center">
                      <User className="w-12 h-12 text-gray-500" />
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-scifi-cyan-light hover:bg-scifi-cyan-bright rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-lg">
                    <ImageIcon className="w-4 h-4 text-black" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">Click to upload profile picture (optional)</p>
              </div>

              {/* Username */}
              <div>
                <label className="text-sm font-bold text-gray-200 block mb-2 tracking-wide flex items-center gap-2">
                  <User size={16} />
                  USERNAME
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="w-full bg-black/40 border border-white/20 rounded px-4 py-3 text-white focus:border-scifi-cyan-light focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-bold text-gray-200 block mb-2 tracking-wide flex items-center gap-2">
                  <Mail size={16} />
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-black/40 border border-white/20 rounded px-4 py-3 text-white focus:border-scifi-cyan-light focus:outline-none transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">For support and important updates</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Default Preferences</h3>
                <p className="text-sm text-gray-400">Configure your default experience</p>
              </div>

              {/* Preferences */}
              <div className="space-y-4">
                {/* Snappy Assistant */}
                <div className="bg-black/40 border border-white/10 rounded p-4 flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex gap-0.5">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                      </div>
                      <h4 className="font-bold text-white">Snappy Assistant</h4>
                    </div>
                    <p className="text-xs text-gray-400">Helpful tips and guided tutorials</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={snappyEnabled}
                      onChange={(e) => setSnappyEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-scifi-cyan-light"></div>
                  </label>
                </div>

                {/* Auto-Spawn */}
                <div className="bg-black/40 border border-white/10 rounded p-4 flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles size={16} className="text-purple-400" />
                      <h4 className="font-bold text-white">Auto-Spawn Mode</h4>
                    </div>
                    <p className="text-xs text-gray-400">Automatically generate simulations every 15s</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSpawnEnabled}
                      onChange={(e) => setAutoSpawnEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                  </label>
                </div>

                {/* Adversarial Director */}
                <div className="bg-black/40 border border-white/10 rounded p-4 flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 text-red-400">💀</div>
                      <h4 className="font-bold text-white">Adversarial Director</h4>
                    </div>
                    <p className="text-xs text-gray-400">AI system that introduces chaos and disruptions</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={directorEnabled}
                      onChange={(e) => setDirectorEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>
              </div>

              <div className="bg-blue-900/10 border border-blue-500/20 rounded p-4">
                <p className="text-xs text-gray-400">
                  You can change these settings anytime in the Settings tab
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-scifi-cyan/20 border-2 border-green-400 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-green-400" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white mb-2">You're All Set!</h3>
                <p className="text-gray-400">Ready to start creating physics simulations</p>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-lg p-6 text-left space-y-3">
                <h4 className="font-bold text-white text-sm">Quick Tips:</h4>
                <ul className="text-xs text-gray-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <ChevronRight size={14} className="text-scifi-cyan-light mt-0.5 flex-shrink-0" />
                    <span>Type a physics scenario in the command line and press Enter</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight size={14} className="text-scifi-cyan-light mt-0.5 flex-shrink-0" />
                    <span>Click the API button to configure your Gemini API key for AI features</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight size={14} className="text-scifi-cyan-light mt-0.5 flex-shrink-0" />
                    <span>Use the tabs on the left to customize physics parameters</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight size={14} className="text-scifi-cyan-light mt-0.5 flex-shrink-0" />
                    <span>Click Snappy (two glowing eyes) anytime for help</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10 bg-black/20">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-2 text-sm font-bold text-gray-300 hover:text-white transition-colors"
            >
              BACK
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && (!username || !email)}
              className="ml-auto px-6 py-2 text-sm font-bold text-black bg-scifi-cyan-light hover:bg-scifi-cyan-bright rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              NEXT
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="ml-auto px-8 py-2 text-sm font-bold text-black bg-green-400 hover:bg-green-300 rounded transition-colors flex items-center gap-2"
            >
              GET STARTED
              <Sparkles size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
