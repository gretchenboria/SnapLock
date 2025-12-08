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

## Features Overview

### User Profile & Settings

**NEW: Settings Tab**

Access comprehensive settings via the **SETTINGS** tab in the left panel:

- **User Profile**: Set your username, email, and profile picture
- **Default Preferences**: Configure what features are enabled by default
- **API Configuration**: Manage your Gemini API key
- **Help & Support**: Send me feedback or report issues directly from the app

All settings are stored locally in your browser.

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
