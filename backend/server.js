/**
 * SNAPLOCK BACKEND PROXY
 *
 * Secure API proxy to protect Gemini API keys from client-side exposure.
 * Deploy this to a Node.js server (Vercel, Railway, Heroku, etc.)
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3001;

// IMPORTANT: Set this environment variable on your server
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable not set!');
  process.exit(1);
}

// Middleware
app.use(express.json({ limit: '10mb' })); // Support large image uploads
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Initialize Gemini AI
let aiInstance = null;
const getAI = () => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return aiInstance;
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/analyze-physics
 * Analyze physics prompt and generate simulation configuration
 */
app.post('/api/analyze-physics', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid prompt' });
    }

    if (prompt.length > 10000) {
      return res.status(400).json({ error: 'Prompt too long (max 10000 chars)' });
    }

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are a Physics Configuration Engine for Robotics & AR Simulation.

      INPUT: "${prompt}"

      TASK: Analyze the user's description and generate a Synthetic Data Simulation Configuration.
      The goal is to create test environments for computer vision and robotic physics.

      RULES:
      1. GRAVITY:
          - 'ORBITAL', 'SWARM_FLOCK' -> Zero G (x:0, y:0, z:0).
          - 'PHYSICS_GRAVITY' -> Standard Earth (y:-9.81).

      2. SPAWN MODES:
          - PILE: Debris/Clutter (Good for environment).
          - BLAST: Explosions/Fracture.
          - GRID: Structured calibration targets (Good for Hero/Sensor objects).

      3. ASSET GROUPS (MULTI-LAYERED):
          - Always attempt to generate at least 2 distinct groups to create depth.
          - Group 1: "The Subject" (Robot, Sensor, Vehicle, Artifact) -> Low count (1-5), High Mass, CAPSULE/ICOSAHEDRON/CYLINDER.
          - Group 2: "The Environment" (Debris, Obstacles, Dust) -> High count, Low Mass, CUBE/SPHERE.
          - Use contrasting colors (e.g., Cyan vs Pink, Orange vs Slate).

      Return strictly valid JSON.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            movementBehavior: { type: 'STRING' },
            gravity: {
              type: 'OBJECT',
              properties: { x: { type: 'NUMBER' }, y: { type: 'NUMBER' }, z: { type: 'NUMBER' } },
            },
            wind: {
              type: 'OBJECT',
              properties: { x: { type: 'NUMBER' }, y: { type: 'NUMBER' }, z: { type: 'NUMBER' } },
            },
            assetGroups: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  id: { type: 'STRING' },
                  name: { type: 'STRING' },
                  count: { type: 'NUMBER' },
                  shape: { type: 'STRING' },
                  color: { type: 'STRING' },
                  spawnMode: { type: 'STRING' },
                  scale: { type: 'NUMBER' },
                  mass: { type: 'NUMBER' },
                  restitution: { type: 'NUMBER' },
                  friction: { type: 'NUMBER' },
                  drag: { type: 'NUMBER' },
                },
                required: ['id', 'name', 'count', 'shape', 'color', 'spawnMode', 'scale', 'mass', 'restitution', 'friction', 'drag']
              }
            },
            explanation: { type: 'STRING' },
          },
          required: ['movementBehavior', 'gravity', 'wind', 'assetGroups', 'explanation'],
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error('Empty response from AI model');
    }

    const result = JSON.parse(jsonText);
    res.json(result);

  } catch (error) {
    console.error('Error in /api/analyze-physics:', error);
    res.status(500).json({ error: 'Failed to analyze physics prompt', details: error.message });
  }
});

/**
 * POST /api/generate-creative-prompt
 * Generate creative physics scenario prompt
 */
app.post('/api/generate-creative-prompt', async (req, res) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Generate a single, short, creative, and scientifically interesting prompt for a physics simulation engine called SnapLock.
      The engine handles robotics, rigid body dynamics, zero-g, and multiple interacting asset layers.

      Examples:
      - "Zero-G collision of a heavy gold sphere against a cloud of 200 steel cubes"
      - "Avalanche of red pyramids crashing into a static wall of blue plates"
      - "LIDAR calibration test with floating polyhedrons and a rotating sensor"

      OUTPUT: Just the prompt text string. No quotes, no markdown.`,
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Empty response');
    }

    res.json({ prompt: text });

  } catch (error) {
    console.error('Error in /api/generate-creative-prompt:', error);
    res.status(500).json({ error: 'Failed to generate creative prompt', details: error.message });
  }
});

/**
 * POST /api/analyze-scene-stability
 * Adversarial director scene analysis
 */
app.post('/api/analyze-scene-stability', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Invalid image data' });
    }

    // Remove data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const ai = getAI();
    const systemPrompt = `
    SYSTEM ROLE: Adversarial Robotics Supervisor.
    CONTEXT: You are stress-testing a computer vision environment.

    TASK:
    1. Analyze the viewport snapshot.
    2. Determine if the environment is too predictable for training data.
    3. Introduce disturbances to challenge the "Sensor".

    AVAILABLE ACTIONS:
    - GRAVITY_SHIFT: Destabilize physics.
    - WIND_GUST: Apply noise force.
    - FRICTION_FLUX: Change surface traction (Ice/Sand).
    - ENTROPY_BURST: Scatter objects.
    - SPAWN_OBSTACLE: Add "Occluders" (Debris).
    - SENSOR_NOISE: Jitter object positions to simulate noisy Lidar/Tracking.
    - CALIBRATION_DRIFT: Slowly rotate global gravity/wind to simulate IMU drift.
    - NONE: Environment is sufficiently chaotic.

    OUTPUT FORMAT:
    Return strictly valid JSON matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { text: systemPrompt },
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64
            }
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            detectedState: { type: 'STRING' },
            action: { type: 'STRING' },
            intensity: { type: 'NUMBER', description: '0.0 to 1.0' },
            reasoning: { type: 'STRING' }
          },
          required: ['detectedState', 'action', 'intensity', 'reasoning']
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error('Empty response from AI model');
    }

    const result = JSON.parse(jsonText);
    res.json(result);

  } catch (error) {
    console.error('Error in /api/analyze-scene-stability:', error);
    res.status(500).json({ error: 'Failed to analyze scene', details: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`SnapLock Backend Proxy running on port ${PORT}`);
  console.log(`CORS enabled for: ${process.env.ALLOWED_ORIGINS || 'http://localhost:5173'}`);
});
