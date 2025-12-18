# 🎨 Photorealistic Rendering Setup Guide

SnapLock now supports **local Stable Diffusion** for photorealistic image generation!

## Quick Start

### 1. Install Python Dependencies

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Start the Stable Diffusion Server

```bash
python sd_server.py
```

**First startup**: Downloads SDXL Turbo model (~6GB), takes 2-5 minutes

### 3. Start SnapLock

```bash
cd ..
npm run dev
```

### 4. Generate Photorealistic Scenes

1. Open http://localhost:5173
2. Type a prompt: `"conference room with laptops and coffee"`
3. Click RUN
4. Wait 3-5 seconds for photorealistic image

## How It Works

**Priority Order:**
1. 🏠 **Local Stable Diffusion** (port 5001) - FAST, no restrictions
2. ☁️ **Imagen 4.0** - Fallback if local unavailable
3. ☁️ **Gemini Image Gen** - Final fallback

## Hardware Requirements

### Recommended:
- **NVIDIA GPU** with 6GB+ VRAM (RTX 2060 or better)
- **Apple Silicon** (M1/M2/M3) with 16GB+ RAM
- Generation time: **2-5 seconds**

### Minimum (CPU):
- 16GB+ RAM
- Generation time: **30-60 seconds** (slow!)

## Features

✅ **Fast**: 2-5 seconds per image (GPU)
✅ **Unrestricted**: No safety filters or API limits
✅ **Offline**: Works without internet
✅ **High Quality**: SDXL Turbo professional renders
✅ **Free**: No API costs

## Troubleshooting

### "Connection refused" error
→ Start the SD server: `cd backend && python sd_server.py`

### Out of memory
→ Close other applications or use CPU mode

### Slow generation
→ GPU highly recommended. First generation is slower.

### Model download fails
→ Check internet connection, need ~6GB disk space

## Alternative: Cloud-Only Mode

Don't want to run Stable Diffusion locally?

Just use the app without the SD server - it will automatically fall back to Gemini/Imagen APIs (if you have API key configured).

## Advanced

### Use Different Models

Edit `backend/sd_server.py`, line 31:
```python
model_id = "stabilityai/sdxl-turbo"  # Fast (current)
# model_id = "stabilityai/stable-diffusion-xl-base-1.0"  # Highest quality
# model_id = "runwayml/stable-diffusion-v1-5"  # Fastest
```

### Increase Quality

Edit `num_inference_steps` in `sd_server.py`:
- `4` steps = Fast (2-3 seconds)
- `20` steps = High quality (10-15 seconds)
- `50` steps = Maximum quality (30+ seconds)

### Change Resolution

Edit `width` and `height` in `sd_server.py`:
- `1024x576` = 16:9 (current)
- `512x512` = Faster, less memory
- `1024x1024` = Square, higher quality
