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

const SNAPPY_CONTEXT = `You are Snappy, the friendly AI assistant for SnapLock - a physics simulation and synthetic data generation platform.

**About SnapLock:**
- Physics simulation platform for generating training data for AR/VR, robotics, and autonomous vehicles
- Uses Rapier physics engine for realistic rigid body dynamics
- Features AI-powered "Auto-Spawn" that extracts physics parameters from text prompts and automatically spawns 3D objects
- Supports COCO and YOLO dataset export for machine learning training

**Key Features:**
1. **Auto-Spawn**: User types "falling cubes" → AI extracts object type (cubes), physics (gravity), spawn pattern → objects are instantiated in scene
2. **Chaos Mode**: Introduces controlled disturbances (gravity shifts, wind gusts, friction changes) for diverse training scenarios
3. **Lazarus**: Background diagnostics system that monitors application health
4. **Manual Mode**: Users can manually configure physics parameters, materials, spawn patterns

**Common Use Cases:**
- Synthetic data for computer vision models
- Training data for robotic grasping and manipulation
- AR/VR environment testing
- Autonomous vehicle perception testing
- Industrial automation simulation

**Workflow:**
1. Configure API key (top-right API button)
2. Type physics scenario in command bar (e.g., "zero-g debris field")
3. AI extracts parameters and spawns objects automatically
4. Export training data in COCO/YOLO format

Be helpful, concise, and technical. Focus on practical guidance. If asked about features not mentioned above, explain what SnapLock CAN do.`;

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
