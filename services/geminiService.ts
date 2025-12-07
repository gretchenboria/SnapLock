import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse, SpawnMode, ShapeType, MovementBehavior, AdversarialAction, DisturbanceType } from "../types";

// Initialize AI Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- UTILITIES ---

/**
 * Executes a function with exponential backoff retries for transient 503 errors.
 */
async function withRetry<T>(operation: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isOverloaded = error?.status === 503 || error?.code === 503 || error?.message?.toLowerCase().includes('overloaded');
    
    if (retries > 0 && isOverloaded) {
      const delay = baseDelay * (4 - retries); // 2000, 4000, 6000...
      console.warn(`[Gemini Service] Model overloaded (503). Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(operation, retries - 1, baseDelay);
    }
    
    throw error;
  }
}

export const analyzePhysicsPrompt = async (userPrompt: string): Promise<AnalysisResponse> => {
  return withRetry(async () => {
    try {
        // Using high-fidelity model for STEM/Physics reasoning
        const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: `You are a Physics Configuration Engine for Robotics & AR Simulation.
        
        INPUT: "${userPrompt}"

        TASK: Analyze the user's description and generate a Synthetic Data Simulation Configuration.
        The goal is to create test environments for computer vision and robotic physics.

        RULES:
        1. GRAVITY:
            - 'ORBITAL', 'SWARM_FLOCK' -> Zero G (x:0, y:0, z:0).
            - 'PHYSICS_GRAVITY' -> Standard Earth (y:-9.81).
        
        2. SPAWN MODES:
            - PILE: Debris/Clutter.
            - BLAST: Explosions/Fracture.
            - GRID: Structured calibration targets.

        3. ASSET GROUPS:
            - Distinguish between "The Robot/Sensor" and "The Environment".
            - Use CAPSULE for robotic limbs/connectors.
            - Use Icosahedrons/Spheres for sensor nodes.

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
            // Provide more detail if available
            const finishReason = response.candidates?.[0]?.finishReason;
            if (finishReason) {
                throw new Error(`AI response blocked. Reason: ${finishReason}`);
            }
            throw new Error("No text returned from AI. The model may have returned an empty response.");
        }
        
        return JSON.parse(jsonText) as AnalysisResponse;

    } catch (error) {
        console.error("Analysis Error:", error);
        throw error;
    }
  });
};

export const generateCreativePrompt = async (): Promise<string> => {
    try {
        // We don't retry creative prompts aggressively as they run in background loops
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a single, short, creative, and scientifically interesting prompt for a physics simulation engine called SnapLock. 
            The engine handles robotics, rigid body dynamics, zero-g, and various disturbances.
            
            Examples:
            - "Zero-G collision of 200 steel spheres with a magnetic attractor"
            - "Avalanche of cubes on a high friction slope with heavy wind"
            - "LIDAR calibration test with floating polyhedrons"

            OUTPUT: Just the prompt text string. No quotes, no markdown.`,
        });
        return response.text?.trim() || "Random entropy burst with heavy gravity";
    } catch (error) {
        console.error("Creative Prompt Error:", error);
        return "Standard gravity test with cubes";
    }
};

export const generateRealityImage = async (base64Image: string, prompt: string): Promise<string> => {
  return withRetry(async () => {
    try {
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
  try {
    // 1. Check/Request API Key
    if ((window as any).aistudio && !(await (window as any).aistudio.hasSelectedApiKey())) {
       await (window as any).aistudio.openSelectKey();
    }

    // 2. Instantiate fresh client with selected key
    const veoAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
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
  return withRetry(async () => {
    try {
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

        // Using Multimodal Reasoning Model for Vision Tasks
        const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
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
        if (!jsonText) throw new Error("Adversarial AI failed to respond");

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