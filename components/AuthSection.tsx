import React from 'react';
import { SignInButton, SignOutButton, SignUpButton, useUser, useClerk } from '@clerk/clerk-react';
import { LogIn, LogOut, User as UserIcon, Mail, Shield } from 'lucide-react';

export function AuthSection() {
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();

  if (isSignedIn && user) {
    return (
      <div className="space-y-4">
        {/* Signed In User Info */}
        <div className="bg-green-900/20 border border-green-500/30 rounded p-4">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-5 h-5 text-green-400" />
            <span className="text-sm font-bold text-green-300">Signed In</span>
          </div>

          <div className="flex items-center gap-4">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.fullName || 'User'}
                className="w-12 h-12 rounded-full border-2 border-green-400"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {user.fullName || user.username || 'User'}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {user.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <SignOutButton>
          <button className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-300 py-3 rounded text-sm font-bold transition-all">
            <LogOut size={16} />
            SIGN OUT
          </button>
        </SignOutButton>

        {/* Benefits */}
        <div className="bg-blue-900/10 border border-blue-500/20 rounded p-3">
          <p className="text-xs text-gray-400">
            Your settings and preferences are now synced across devices.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Not Signed In */}
      <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-4">
        <div className="flex items-center gap-2 mb-2">
          <UserIcon className="w-5 h-5 text-yellow-400" />
          <span className="text-sm font-bold text-yellow-300">Not Signed In</span>
        </div>
        <p className="text-xs text-gray-400">
          Sign in to sync your settings across devices and access cloud features.
        </p>
      </div>

      {/* Sign In Button */}
      <SignInButton mode="modal">
        <button className="w-full flex items-center justify-center gap-2 bg-scifi-cyan-light/10 hover:bg-scifi-cyan-light/20 border border-scifi-cyan-light/30 hover:border-scifi-cyan-light/50 text-scifi-cyan-light py-3 rounded text-sm font-bold transition-all">
          <LogIn size={16} />
          SIGN IN
        </button>
      </SignInButton>

      {/* Benefits */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-300">Sign in with:</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black/40 border border-white/10 rounded p-2 text-center">
            <p className="text-xs text-gray-400">GitHub</p>
          </div>
          <div className="bg-black/40 border border-white/10 rounded p-2 text-center">
            <p className="text-xs text-gray-400">Google</p>
          </div>
          <div className="bg-black/40 border border-white/10 rounded p-2 text-center">
            <p className="text-xs text-gray-400">Microsoft</p>
          </div>
          <div className="bg-black/40 border border-white/10 rounded p-2 text-center">
            <p className="text-xs text-gray-400">Email</p>
          </div>
        </div>
      </div>

      {/* Privacy Note */}
      <div className="bg-blue-900/10 border border-blue-500/20 rounded p-3">
        <p className="text-xs text-gray-400">
          Your data is secure and encrypted. We never share your information with third parties.
        </p>
      </div>
    </div>
  );
}
