# SnapLock Stable Diffusion Backend

Local photorealistic image generation server using Stable Diffusion XL Turbo.

## Features

- ⚡ **Fast Generation**: 2-5 seconds per image (with GPU)
- 🎨 **High Quality**: SDXL Turbo for photorealistic renders
- 🚫 **No Restrictions**: No API limits or safety filters
- 💻 **Local**: Runs entirely on your machine

## Installation

### 1. Create Virtual Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

**Note:** If you have an NVIDIA GPU, install CUDA-enabled PyTorch:
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

**For Apple Silicon (M1/M2/M3):**
```bash
pip install torch torchvision
```

### 3. Start the Server

```bash
python sd_server.py
```

The server will start on `http://localhost:5001`

**First startup takes 2-5 minutes** to download the model (~6GB).

## Usage

### Health Check
```bash
curl http://localhost:5001/health
```

### Generate Image
```bash
curl -X POST http://localhost:5001/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Photorealistic office with laptops and coffee"}'
```

## Troubleshooting

**Out of memory error:**
- Reduce width/height to 512x512
- Close other GPU applications

**Model download fails:**
- Check internet connection
- Ensure ~6GB disk space available

**Slow generation:**
- GPU highly recommended
- First generation is slower (model loading)
