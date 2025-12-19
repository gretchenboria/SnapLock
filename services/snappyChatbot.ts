/**
 * SNAPPY CHATBOT SERVICE
 *
 * Real LLM-powered assistant that helps users with SnapLock.
 * Provides guidance on physics simulations, features, and troubleshooting.
 */

import { GoogleGenAI } from "@google/genai";

const getApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const storedKey = localStorage.getItem('snaplock_api_key');
    if (storedKey) return storedKey;
  }
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey) return envKey;
  return '';
};

const getAI = () => {
  const key = getApiKey();
  return new GoogleGenAI({ apiKey: key });
};

const SNAPPY_CONTEXT = `You are Snappy, the AI assistant for SnapLock - an ENTERPRISE physics simulation and synthetic training data platform.

**About SnapLock:**
- Enterprise-grade physics simulation for medical robotics, industrial automation, and autonomous systems
- Uses Rapier physics engine for realistic rigid body dynamics at 120Hz
- AI-powered scene generation extracts physics parameters from natural language
- Exports COCO/YOLO datasets for computer vision training

**Primary Use Cases:**
1. **Medical Robotics**: Surgical robot simulations (suturing, grasping, tissue manipulation)
2. **Industrial Automation**: Robotic arms, pick-and-place, assembly line scenarios
3. **Autonomous Vehicles**: Obstacle detection, navigation, sensor fusion training
4. **Warehouse Logistics**: Forklift operations, package handling, inventory management
5. **Manufacturing**: Quality control, defect detection, process optimization

**Key Features:**
1. **AI Scene Generation**: Natural language → 3D simulation
   - "surgical robot stitching heart" → spawns surgical tools with precise physics
   - "robotic arm grasping medical instruments" → generates manipulation scenario
2. **Manual Controls**: Precise configuration of mass, friction, restitution, spawn patterns
3. **Real-time Recording**: Capture sequences with ground truth for ML training
4. **ML Export**: COCO/YOLO formats with bounding boxes, segmentation masks, depth maps

**Workflow:**
1. Use Snappy chat: "generate surgical robot stitching heart"
2. AI analyzes prompt and spawns 3D objects with realistic physics
3. Record simulation sequences (30 FPS)
4. Export training datasets in COCO/YOLO format

**Recording Instructions:**
- Open ML Export modal (Export Dataset button)
- Click "Start Recording" to capture frames
- Click "Stop Recording" when done
- Export as COCO (JSON) or YOLO (text files)

Be technical, precise, and focused on enterprise VR/robotics applications. Avoid consumer/casual examples.`;

export async function askSnappy(userMessage: string, conversationHistory: Array<{role: string, content: string}> = []): Promise<string> {

  if (!getApiKey()) {
    throw new Error('API key not configured. Click the API button in the top-right to configure your Gemini API key.');
  }

  try {
    const ai = getAI();

    // Build conversation with context
    const messages = [
      { role: 'system', content: SNAPPY_CONTEXT },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    // Convert to Gemini format (system message becomes part of first user message)
    const geminiMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    // Prepend context to first user message
    if (geminiMessages.length > 0 && geminiMessages[0].role === 'user') {
      geminiMessages[0].parts[0].text = `${SNAPPY_CONTEXT}\n\nUser: ${geminiMessages[0].parts[0].text}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: geminiMessages
    });

    return response.text || 'Sorry, I had trouble generating a response.';

  } catch (error: any) {
    console.error('[Snappy] Chat error:', error);

    if (error?.status === 401 || error?.status === 403) {
      throw new Error('Invalid API key. Please check your API configuration.');
    }

    throw new Error(`Chat error: ${error.message || 'Unknown error'}`);
  }
}
