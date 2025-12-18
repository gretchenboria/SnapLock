#!/usr/bin/env python3
"""
Stable Diffusion Image Generation Server for SnapLock
Provides local photorealistic image generation without API restrictions
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from diffusers import StableDiffusionXLPipeline, DPMSolverMultistepScheduler
import base64
from io import BytesIO
import logging

app = Flask(__name__)
CORS(app)  # Enable CORS for React app

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global pipeline variable
pipe = None

def initialize_model():
    """Initialize Stable Diffusion XL model"""
    global pipe

    if pipe is not None:
        return

    logger.info("Loading Stable Diffusion XL model...")

    # Use SDXL Turbo for fast generation (2-4 steps)
    model_id = "stabilityai/sdxl-turbo"

    try:
        pipe = StableDiffusionXLPipeline.from_pretrained(
            model_id,
            torch_dtype=torch.float16,
            variant="fp16",
            use_safetensors=True
        )

        # Enable optimizations
        if torch.cuda.is_available():
            pipe = pipe.to("cuda")
            logger.info("Using GPU acceleration")
        elif torch.backends.mps.is_available():
            pipe = pipe.to("mps")
            logger.info("Using Apple Silicon GPU")
        else:
            logger.warning("Using CPU (will be slow)")

        # Use fast scheduler
        pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)

        logger.info("Model loaded successfully!")

    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "model_loaded": pipe is not None,
        "device": "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
    })

@app.route('/generate', methods=['POST'])
def generate_image():
    """Generate photorealistic image from text prompt"""
    try:
        data = request.json
        prompt = data.get('prompt', '')

        if not prompt:
            return jsonify({"error": "No prompt provided"}), 400

        # Initialize model on first request
        if pipe is None:
            initialize_model()

        logger.info(f"Generating image for: {prompt[:100]}...")

        # Generate image
        # SDXL Turbo uses 1-4 steps for fast generation
        image = pipe(
            prompt=prompt,
            num_inference_steps=4,  # Fast mode
            guidance_scale=0.0,     # SDXL Turbo doesn't use guidance
            width=1024,
            height=576,  # 16:9 aspect ratio
        ).images[0]

        # Convert to base64
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

        logger.info("Image generated successfully")

        return jsonify({
            "image": f"data:image/png;base64,{img_base64}",
            "success": True
        })

    except Exception as e:
        logger.error(f"Error generating image: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/generate-batch', methods=['POST'])
def generate_batch():
    """Generate multiple images (for variations)"""
    try:
        data = request.json
        prompt = data.get('prompt', '')
        count = min(data.get('count', 1), 4)  # Max 4 images

        if not prompt:
            return jsonify({"error": "No prompt provided"}), 400

        if pipe is None:
            initialize_model()

        logger.info(f"Generating {count} images for: {prompt[:100]}...")

        # Generate multiple images
        images = pipe(
            prompt=prompt,
            num_inference_steps=4,
            guidance_scale=0.0,
            width=1024,
            height=576,
            num_images_per_prompt=count
        ).images

        # Convert all to base64
        result_images = []
        for img in images:
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
            result_images.append(f"data:image/png;base64,{img_base64}")

        return jsonify({
            "images": result_images,
            "success": True
        })

    except Exception as e:
        logger.error(f"Error generating batch: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting Stable Diffusion server...")
    logger.info("Note: First request will be slow due to model loading")
    app.run(host='0.0.0.0', port=5001, debug=False)
