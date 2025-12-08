# SnapLock Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

Open browser to `http://localhost:5173`

### 3. Configure API Access (Required for Auto-Spawn)

**NEW: In-App API Configuration** 🎉

You can now configure your API key directly in the app without editing files:

1. Click the **API** button in the top right corner
2. Choose between:
   - **Direct API Key**: Enter your Gemini API key (development only)
   - **Backend Proxy**: Enter your backend URL (recommended for production)
3. Click **Save & Reload**

**Get your free API key from:** https://aistudio.google.com/apikey

#### Alternative: Environment Variables

You can still configure via `.env` file if preferred:

**Option A: Backend Proxy (Recommended for Production)**
```bash
VITE_BACKEND_URL=http://localhost:3001
```

**Option B: Direct API Key (Development Only)**
```bash
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**Priority Order:**
1. In-app configuration (localStorage)
2. Environment variables (.env file)

⚠️ **Note**: Without API configuration, Auto-Spawn and AI features won't work. You'll see helpful error messages in the log panel guiding you to configure the API.

## Getting Started Workflow

### First-Time Users

SnapLock includes a **Guided Tour** that appears automatically on first visit. The tour explains:

1. **API Configuration** - How to set up your Gemini API key
2. **Workflow Options** - Auto-Spawn vs Manual mode
3. **Auto-Spawn Mode** - AI-generated scenarios
4. **Manual Mode** - Custom prompts and parameters
5. **Data Export** - COCO and YOLO format export

To restart the tour: Delete `snaplock_tour_completed` from localStorage in browser dev tools.

### Workflow Overview

**Option A: Auto-Spawn Mode (Recommended for Beginners)**
1. Configure API key (click API button, top right)
2. Toggle AUTO SPAWN on
3. Watch AI generate creative physics scenarios every 15 seconds
4. Each scenario is different: debris fields, collision tests, zero-g simulations
5. Export frames anytime from DATASET tab

**Option B: Manual Mode (Advanced Users)**
1. Configure API key (click API button, top right)
2. Toggle AUTO SPAWN off
3. Type custom prompts like "falling cubes" or "zero-g collision"
4. Press Enter or click RUN
5. Fine-tune physics using left panel controls
6. Export frames from DATASET tab

## Features Overview

### User Profile & Settings

**NEW: Settings Tab**

Access comprehensive settings via the **SETTINGS** tab in the left panel:

- **Account (NEW)**: Sign in with GitHub, Google, Microsoft, or other OAuth providers
- **Local Profile**: Set your username, email, and profile picture (stored in browser)
- **Default Preferences**: Configure what features are enabled by default
- **API Configuration**: Manage your Gemini API key
- **Help & Support**: Send me feedback or report issues directly from the app

#### Authentication (Optional)

Sign in to sync your settings across devices:

- **GitHub** - Sign in with your GitHub account
- **Google** - Sign in with your Google account
- **Microsoft** - Sign in with your Microsoft/Outlook account
- **And more** - Discord, Twitter, etc.

**Setup**: See [CLERK_SETUP.md](./CLERK_SETUP.md) for detailed instructions on enabling OAuth authentication.

**Note**: Authentication is **optional**. SnapLock works perfectly without signing in - your settings will be stored locally in your browser.

### Auto-Spawn Mode
- **What it does**: Automatically generates creative physics simulations every 15 seconds
- **How to use**: Enabled by default. Click the AUTO button in the command bar to toggle
- **Requirements**: Requires API configuration (see step 2 above)

### Command Line
- **Enter a prompt**: Type a physics scenario and press Enter or click RUN
- **Suggestions**: Press Ctrl+Space to see example prompts
- **History**: Press Up arrow to see previous prompts
- **AI Enhance**: Click the AI button to enhance your prompt

### Workflow Tips
1. Start with Auto-Spawn to see example simulations
2. Click any prompt in the command line to customize
3. Use the left panel to fine-tune physics parameters
4. Export training data from the DATASET tab

### Troubleshooting

**Auto-Spawn not working?**
- Check that you have a `.env` file with either `VITE_BACKEND_URL` or `VITE_GEMINI_API_KEY`
- Look at the logs in the right panel for detailed error messages
- The app will display helpful error messages like "Missing API key" or "Backend unavailable"
- Try clicking RUN manually with a simple prompt like "falling cubes"

**Objects in the scene look too dark?**
- ✅ Fixed in latest version with 50% brighter materials
- ✅ Scene lighting increased with multiple light sources
- ✅ Added emissive glow to all objects
- Make sure you've pulled the latest changes and rebuilt

**Text hard to read?**
- ✅ Fixed in latest version with improved contrast
- ✅ All labels now use brighter colors (gray-200/300 instead of gray-400/500)
- ✅ Numeric values displayed in bold white
- ✅ Better hover states on all interactive elements

**Buttons too big?**
- ✅ Fixed in latest version
- Header reduced to 48px height
- All buttons properly sized (32-36px)
- More compact and professional layout

**Can't see AUTO SPAWN text?**
- ✅ Fixed - now displays "AUTO SPAWN" in full with better contrast

## UI Improvements (Latest Version)

### Color Palette Enhanced
- Brighter cyan variants for better visibility
- Improved contrast ratios across all UI elements
- Labels now use gray-200/300 instead of gray-400/500
- Bold fonts on numeric values for emphasis

### Scene Rendering
- Materials 50% brighter (1.5x multiplier)
- Ambient light increased to 1.0 intensity
- Multiple directional lights for better illumination
- Objects have subtle emissive glow for visibility

### Layout Optimizations
- Compact header (48px)
- Appropriately sized buttons (32-36px)
- Better spacing and padding throughout
- Improved readability at all screen sizes

## Character Reference

**Snappy** is your friendly assistant represented by two glowing cyan eyes (not a plain smiley face). Click the SNAPPY button in the top right to get helpful tips and guidance about using SnapLock.

## Bug Fixes (Latest Version)

### Critical Fixes - December 8, 2025

**Latest Fixes (Evening)**
- **FIXED: API modal save button** - Added pointer-events-auto to all interactive elements (inputs, buttons, tabs)
- **ADDED: Guided Tour** - Comprehensive 6-step onboarding tutorial for first-time users
- **ADDED: Workflow Documentation** - Clear explanation of Auto-Spawn vs Manual mode
- Added console logging to API modal for debugging save functionality
- Improved button click handling across all modal elements

**Morning Fixes**
- **FIXED: Auto-spawn not working** - Added missing dependencies (addLog, executeAnalysis) to auto-spawn useEffect
- **FIXED: API modal unclickable** - Added pointer-events-auto to ApiKeyModal to override parent pointer-events-none
- **FIXED: Blank screen on load** - Made ClerkProvider conditional when VITE_CLERK_PUBLISHABLE_KEY not configured
- Fixed geminiService API key handling with window.aistudio undefined references
- Fixed inconsistent API key retrieval across image and video generation functions
- Fixed React useEffect dependency warnings causing stale closures in auto-spawn loop
- Fixed TypeScript build error with handleAnalyze forward reference in test hooks
- Removed all debug console.log statements from production code

### Performance Improvements
- Added isAnalyzingRef to prevent stale closure bugs in auto-spawn interval
- Converted executeAnalysis to useCallback for proper memoization
- Fixed useEffect hook ordering to prevent undefined variable errors

### Code Quality
- Cleaned up 15+ console.log debug statements across services and components
- Removed redundant environment logging that cluttered console
- Simplified API client initialization logic in geminiService
