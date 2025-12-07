import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse, SimulationMode, SpawnMode, ShapeType, MovementBehavior } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzePhysicsPrompt = async (userPrompt: string): Promise<AnalysisResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are the SnapLock Physics Architecture Engine.
      
      INPUT: "${userPrompt}"

      TASK: Analyze the user's description and determine the precise physical coefficients and simulation parameters.

      CRITICAL RULES FOR GRAVITY:
      1. If behavior is 'ORBITAL', 'SWARM_FLOCK', 'LINEAR_FLOW', or 'SINUSOIDAL_WAVE', you MUST set gravity to {x:0, y:0, z:0} unless the user explicitly asks for them to fall.
      2. If behavior is 'PHYSICS_GRAVITY' or 'RADIAL_EXPLOSION', standard Earth gravity {x:0, y:-9.81, z:0} is usually appropriate, unless context is "Space" or "Underwater".

      GUIDELINES:
      1. SPAWN MODE:
         - "Pile", "Stack", "Drop" -> PILE
         - "Explosion", "Burst", "Shatter" -> BLAST
         - "Stream", "Jet", "Hose" -> JET
         - "Cloud", "Float", "Space" -> FLOAT
         - "City", "Traffic", "Rows" -> GRID

      2. SHAPE MAPPING:
         - "Glass", "Shard", "Fragment" -> PYRAMID
         - "Box", "Crate", "Container" -> CUBE
         - "Ball", "Planet", "Orb" -> SPHERE
         - "Donut", "Ring" -> TORUS
         - "Pipe", "Log" -> CYLINDER

      Return strictly valid JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            simulationMode: { type: Type.STRING, enum: Object.values(SimulationMode) },
            spawnMode: { type: Type.STRING, enum: Object.values(SpawnMode) },
            shape: { type: Type.STRING, enum: Object.values(ShapeType) },
            movementBehavior: { type: Type.STRING, enum: Object.values(MovementBehavior) },
            gravity: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                z: { type: Type.NUMBER },
              },
            },
            wind: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                z: { type: Type.NUMBER },
              },
            },
            particleCount: { type: Type.NUMBER },
            restitution: { type: Type.NUMBER },
            friction: { type: Type.NUMBER },
            mass: { type: Type.NUMBER },
            color: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ["simulationMode", "spawnMode", "shape", "movementBehavior", "gravity", "wind", "particleCount", "restitution", "friction", "mass", "color", "explanation"],
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    return JSON.parse(jsonText) as AnalysisResponse;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const generateRealityImage = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const aiPrompt = `
    Context: Enterprise Synthetic Data Generation for XR.
    User Prompt: "${prompt}"

    TASK:
    Render a high-fidelity Ground Truth image based on the provided wireframe/viewport buffer.
    
    REQUIREMENTS:
    1. STRICT GEOMETRY MATCH: Do not hallucinate new objects. Respect the positions in the input image.
    2. PHOTOREALISM: Industrial grade lighting, PBR materials, ray-tracing.
    3. ASPECT RATIO: Maintain input aspect ratio.
    `;

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
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
};