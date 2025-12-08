import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse, SpawnMode, ShapeType, MovementBehavior, AdversarialAction, DisturbanceType, PhysicsParams, TelemetryData } from "../types";
import { MOCK_ANALYSIS_RESPONSE, MOCK_ADVERSARIAL_ACTION, MOCK_CREATIVE_PROMPT, MOCK_HTML_REPORT } from "./mockData";

// BACKEND API CONFIGURATION
// Priority order:
// 1. localStorage (user-provided via UI)
// 2. .env file (VITE_BACKEND_URL or VITE_GEMINI_API_KEY)
const getBackendUrl = (): string | null => {
  if (typeof window !== 'undefined') {
    const storedUrl = localStorage.getItem('snaplock_backend_url');
    if (storedUrl) return storedUrl;
  }
  return import.meta.env.VITE_BACKEND_URL || null;
};

const getApiKey = (): string => {
  // Check localStorage first (user-provided)
  if (typeof window !== 'undefined') {
    const storedKey = localStorage.getItem('snaplock_api_key');
    if (storedKey) return storedKey;
  }

  // Fall back to environment variable
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey) return envKey;

  // Legacy: check process.env (for older builds)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }

  return '';
};

const BACKEND_URL = getBackendUrl();
const USE_BACKEND = Boolean(BACKEND_URL);

if (USE_BACKEND) {
  console.log('[GeminiService] Using backend API proxy:', BACKEND_URL);
} else {
  console.warn('[GeminiService] No backend URL configured. Using direct Gemini API calls (INSECURE in production)');
}

// Lazy Initialization of AI Client to prevent 'process is not defined' crashes on module load
let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
  if (!aiInstance) {
    const key = getApiKey();
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
};

// Check if API key is configured
const hasApiKey = () => {
  return Boolean(getApiKey());
};

// Model selection: ALWAYS use best SOTA models by default, fallback to Flash only if no API key
const getModelForTask = (task: 'reasoning' | 'vision' | 'creative' | 'image' | 'video'): string => {
  const apiKeyAvailable = hasApiKey();

  if (!apiKeyAvailable) {
    console.warn('[GeminiService] No API key detected, falling back to gemini-2.5-flash');
    return 'gemini-2.5-flash';
  }

  // API key available - use BEST models
  switch (task) {
    case 'reasoning':
      return 'gemini-3-pro-preview'; // Best for physics reasoning
    case 'vision':
      return 'gemini-3-pro-preview'; // Best for adversarial director
    case 'creative':
      return 'gemini-3-pro-preview'; // Best for creative prompts too
    case 'image':
      return 'gemini-3-pro-image-preview'; // Best for image generation
    case 'video':
      return 'veo-3.1-generate-preview'; // Best for video
    default:
      return 'gemini-3-pro-preview';
  }
};

const isTestMode = () => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('test') === 'true';
};

// --- UTILITIES ---

const FALLBACK_PROMPTS = [
    "Zero-G collision of a heavy gold sphere against a cloud of 200 steel cubes",
    "Avalanche of red pyramids crashing into a static wall of blue plates",
    "LIDAR calibration test with floating polyhedrons and a rotating sensor",
    "Swarm of micro-drones navigating through a debris field",
    "Heavy industrial pistons crushing soft foam blocks",
    "Orbital debris containment field failure simulation",
    "High-velocity impact testing on reinforced glass panels",
    "Magnetic resonance simulation with metallic shards"
];

/**
 * Executes a function with exponential backoff retries for transient errors (503, 500, Empty Response).
 */
async function withRetry<T>(operation: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isOverloaded = error?.status === 503 || error?.code === 503 || error?.message?.toLowerCase().includes('overloaded');
    const isInternalError = error?.status === 500 || error?.code === 500;
    const isQuotaExceeded = error?.status === 429 || error?.code === 429 || error?.message?.includes('Quota');
    // Catch empty responses or "Reason: STOP" errors which are transient model glitches
    const isTransientModelError = error?.message?.includes('Empty response') || error?.message?.includes('Reason: STOP');
    
    // Do not retry on Quota Exceeded (429) - fail fast to trigger fallback
    if (isQuotaExceeded) {
        throw error;
    }

    if (retries > 0 && (isOverloaded || isInternalError || isTransientModelError)) {
      const delay = baseDelay * (4 - retries); // 2000, 4000, 6000...
      const errorType = isOverloaded ? 'Overloaded (503)' : isInternalError ? 'Internal Error (500)' : 'Transient Model Error';
      console.warn(`[Gemini Service] ${errorType}. Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(operation, retries - 1, baseDelay);
    }
    
    throw error;
  }
}

export const analyzePhysicsPrompt = async (userPrompt: string): Promise<AnalysisResponse> => {
  if (isTestMode()) {
      console.log("[GeminiService] Test Mode: Returning Mock Analysis");
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate latency
      return MOCK_ANALYSIS_RESPONSE;
  }

  // Use backend API if configured
  if (USE_BACKEND) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze-physics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`Backend API error: ${error.error || response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('[GeminiService] Backend API failed:', error);
      throw error;
    }
  }

  // Fallback to direct Gemini API calls
  try {
    return await withRetry(async () => {
        const ai = getAI();
        // Use best reasoning model for physics configuration (Gemini 3 Pro when available)
        const response = await ai.models.generateContent({
        model: getModelForTask('reasoning'),
        contents: `You are a Physics Configuration Engine for Robotics & AR Simulation.
        
        INPUT: "${userPrompt}"

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
            responseMimeType: "application/json",
            responseSchema: {
            type: Type.OBJECT,
            properties: {
                movementBehavior: { type: Type.STRING, enum: Object.values(MovementBehavior) },
                gravity: {
                type: Type.OBJECT,
                properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, z: { type: Type.NUMBER } },
                },
                wind: {
                type: Type.OBJECT,
                properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, z: { type: Type.NUMBER } },
                },
                assetGroups: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    count: { type: Type.NUMBER },
                    shape: { type: Type.STRING, enum: Object.values(ShapeType) },
                    color: { type: Type.STRING },
                    spawnMode: { type: Type.STRING, enum: Object.values(SpawnMode) },
                    scale: { type: Type.NUMBER },
                    mass: { type: Type.NUMBER },
                    restitution: { type: Type.NUMBER },
                    friction: { type: Type.NUMBER },
                    drag: { type: Type.NUMBER },
                    },
                    required: ["id", "name", "count", "shape", "color", "spawnMode", "scale", "mass", "restitution", "friction", "drag"]
                }
                },
                explanation: { type: Type.STRING },
            },
            required: ["movementBehavior", "gravity", "wind", "assetGroups", "explanation"],
            },
        },
        });

        const jsonText = response.text;
        
        if (!jsonText) {
            // Check for valid finish reasons before declaring a block
            const candidate = response.candidates?.[0];
            const finishReason = candidate?.finishReason;
            
            // STOP is a natural finish. If text is missing but reason is STOP, it's a transient glitch (empty output), not a safety block.
            if (finishReason && finishReason !== 'STOP') {
                throw new Error(`AI response blocked. Reason: ${finishReason}`);
            }
            throw new Error("Empty response from AI model.");
        }
        
        return JSON.parse(jsonText) as AnalysisResponse;
    });
  } catch (error: any) {
      // Gracefully handle Quota Exceeded by falling back to Mock Data
      if (error?.status === 429 || error?.code === 429 || error?.message?.includes('429') || error?.message?.includes('Quota')) {
           console.warn("[GeminiService] Quota Exceeded. Switching to Offline Fallback.");
           return {
               ...MOCK_ANALYSIS_RESPONSE,
               explanation: "⚠️ API Quota Limit Reached. Simulation running in Offline Demonstration Mode."
           };
      }
      console.error("Analysis Error:", error);
      throw error;
  }
};

export const generateCreativePrompt = async (): Promise<string> => {
    if (isTestMode()) return MOCK_CREATIVE_PROMPT;

    // Use backend API if configured
    if (USE_BACKEND) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/generate-creative-prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`Backend API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.prompt;
      } catch (error: any) {
        console.warn('[GeminiService] Backend creative prompt failed, using fallback:', error);
        return FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];
      }
    }

    // Fallback to direct API
    try {
        // We retry once for creative prompts to handle transient 500/503s or empty responses
        return await withRetry(async () => {
            const ai = getAI();
            const response = await ai.models.generateContent({
                model: getModelForTask('creative'),
                contents: `Generate a single, short, creative, and scientifically interesting prompt for a physics simulation engine called SnapLock. 
                The engine handles robotics, rigid body dynamics, zero-g, and multiple interacting asset layers.
                
                Examples:
                - "Zero-G collision of a heavy gold sphere against a cloud of 200 steel cubes"
                - "Avalanche of red pyramids crashing into a static wall of blue plates"
                - "LIDAR calibration test with floating polyhedrons and a rotating sensor"

                OUTPUT: Just the prompt text string. No quotes, no markdown.`,
            });
            const text = response.text?.trim();
            if (!text) throw new Error("Empty response");
            return text;
        }, 1, 1000); // 1 Retry, 1s delay
    } catch (error) {
        console.warn("Creative Prompt API failed, using fallback:", error);
        // Fallback to local random prompt to ensure the app stays "alive"
        return FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];
    }
};

export const generateRealityImage = async (base64Image: string, prompt: string): Promise<string> => {
  if (isTestMode()) {
     // Return a 1x1 pixel base64 image
     return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }

  // Mandatory API Key Selection for High-Quality Image Generation (Gemini 3 Pro Image)
  if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
     await window.aistudio.openSelectKey();
  }

  return withRetry(async () => {
    try {
        // Ensure we use the latest key selected by the user
        const key = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
        const ai = new GoogleGenAI({ apiKey: key });

        const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

        const aiPrompt = `
        Context: Robotics Synthetic Data Generation.
        User Prompt: "${prompt}"

        TASK:
        Render a high-fidelity Ground Truth image based on the provided wireframe/viewport buffer.
        
        REQUIREMENTS:
        1. STRICT GEOMETRY MATCH: Respect the positions in the input image.
        2. PHOTOREALISM: Industrial lighting, metallic surfaces, scuffed textures for training data realism.
        3. ASPECT RATIO: Maintain input aspect ratio.
        `;

        // High Fidelity Image Generation Model
        const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: {
            parts: [
            { text: aiPrompt },
            {
                inlineData: {
                mimeType: "image/png",
                data: cleanBase64
                }
            }
            ]
        },
        config: {}
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (!parts) throw new Error("No content generated");

        const imagePart = parts.find(p => p.inlineData);
        
        if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        }

        throw new Error("No image data found in response");

    } catch (error) {
        console.error("Image Gen Error:", error);
        throw error;
    }
  });
};

export const generateSimulationVideo = async (base64Image: string, prompt: string): Promise<string> => {
  if (isTestMode()) {
      // Mock video blob url
      return "mock_video_url.mp4";
  }

  try {
    // 1. Check/Request API Key
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
       await window.aistudio.openSelectKey();
    }

    // 2. Instantiate fresh client with selected key for Veo
    // Ensure we use the process.env which might be populated by the selection flow
    const veoAi = new GoogleGenAI({ apiKey: (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '' });
    
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    // 3. Initiate Generation (Using High Fidelity Video Model)
    // We retry the initiation call in case of 503
    let operation = await withRetry(async () => {
        return await veoAi.models.generateVideos({
            model: 'veo-3.1-generate-preview',
            prompt: `Robotics simulation, 8k industrial render, high contrast: ${prompt}`,
            image: {
                imageBytes: cleanBase64,
                mimeType: 'image/png',
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9' 
            }
        });
    });

    // 4. Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await veoAi.operations.getVideosOperation({operation: operation});
    }

    // 5. Retrieve Video
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed: No video URI returned");

    // 6. Fetch Bytes
    const key = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
    const videoResponse = await fetch(`${downloadLink}&key=${key}`);
    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);

  } catch (error) {
    console.error("Video Gen Error:", error);
    throw error;
  }
};

/**
 * ADVERSARIAL DIRECTOR VLM INTERFACE
 * Acts as the Supervisor analyzing the simulation state.
 */
export const analyzeSceneStability = async (base64Image: string): Promise<AdversarialAction> => {
  if (isTestMode()) return MOCK_ADVERSARIAL_ACTION;

  // Use backend API if configured
  if (USE_BACKEND) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze-scene-stability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image })
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('[GeminiService] Backend scene analysis failed:', error);
      // Fallback to NONE action
      return {
        detectedState: 'Error',
        action: DisturbanceType.NONE,
        intensity: 0,
        reasoning: 'Backend offline or overloaded.'
      };
    }
  }

  // Fallback to direct API
  return withRetry(async () => {
    try {
        const ai = getAI();
        const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

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

        // Use best vision model for adversarial scene analysis (Gemini 3 Pro)
        const response = await ai.models.generateContent({
        model: getModelForTask('vision'),
        contents: {
            parts: [
            { text: systemPrompt },
            {
                inlineData: {
                mimeType: "image/png",
                data: cleanBase64
                }
            }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
            type: Type.OBJECT,
            properties: {
                detectedState: { type: Type.STRING },
                action: { type: Type.STRING, enum: Object.values(DisturbanceType) },
                intensity: { type: Type.NUMBER, description: "0.0 to 1.0" },
                reasoning: { type: Type.STRING }
            },
            required: ["detectedState", "action", "intensity", "reasoning"]
            }
        }
        });

        const jsonText = response.text;
        if (!jsonText) {
             const candidate = response.candidates?.[0];
             const finishReason = candidate?.finishReason;
             if (finishReason && finishReason !== 'STOP') {
                 throw new Error(`AI response blocked. Reason: ${finishReason}`);
             }
             throw new Error("Empty response from AI model.");
        }

        return JSON.parse(jsonText) as AdversarialAction;

    } catch (error) {
        console.error("Director Error:", error);
        // Fallback for Director to keep loop alive without crashing
        return {
            detectedState: "Error",
            action: DisturbanceType.NONE,
            intensity: 0,
            reasoning: "Director offline or overloaded."
        };
    }
  });
};

/**
 * GENERATES TECHNICAL REPORT (HTML)
 */
export const generateSimulationReport = async (params: PhysicsParams, telemetry: TelemetryData): Promise<string> => {
    if (isTestMode()) return MOCK_HTML_REPORT;

    try {
        const dataContext = JSON.stringify({
            params,
            telemetry: {
                ...telemetry,
                systemEnergy: telemetry.systemEnergy.toFixed(2),
                avgVelocity: telemetry.avgVelocity.toFixed(2),
                stabilityScore: telemetry.stabilityScore.toFixed(3)
            }
        });

        return await withRetry(async () => {
            const ai = getAI();
            const response = await ai.models.generateContent({
                model: getModelForTask('reasoning'),
                contents: `Generate a professional Technical Simulation Report (HTML format) based on the following JSON data context.
                
                DATA CONTEXT: ${dataContext}

                REQUIREMENTS:
                1. Output strictly valid HTML (no markdown code blocks, just the <html>...</html> content).
                2. Use a clean, scientific, printable style (Tailwind classes or inline CSS).
                3. Sections:
                   - HEADER: "SNAPLOCK // SIMULATION AUDIT REPORT", Date, Simulation ID.
                   - EXECUTIVE SUMMARY: Brief natural language description of the scene and its complexity.
                   - CONFIGURATION MATRIX: Table showing gravity, wind, and asset groups.
                   - TELEMETRY ANALYSIS: Interpret the Energy/Velocity data. 
                     * STABILITY SCORE (StdDev Velocity): If < 0.1, system is Stable/Settled. If > 2.0, system is Chaotic/Explosive.
                   - REAL-WORLD TESTING RECOMMENDATIONS: Identify 3-4 specific physical tests to validate this sim in a real lab.
                     * Example: "Verify friction coefficient of [Material X] on concrete."
                     * Example: "Calibrate LIDAR sensor for high-velocity particle tracking."
                
                TONE: Technical Product Manager / Research Scientist.`,
            });

            const html = response.text || "<h1>Report Generation Failed</h1>";
            // Clean markdown if present
            return html.replace(/```html/g, '').replace(/```/g, '');
        });

    } catch (error) {
        console.error("Report Gen Error:", error);
        return "<h1>Error Generating Report</h1><p>The AI service was unable to compile the analysis.</p>";
    }
};
