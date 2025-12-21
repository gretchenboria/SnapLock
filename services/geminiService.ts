import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse, SpawnMode, ShapeType, MovementBehavior, AdversarialAction, DisturbanceType, PhysicsParams, TelemetryData, AssetGroup, Vector3Data, RigidBodyType } from "../types";
import { MOCK_ANALYSIS_RESPONSE, MOCK_ADVERSARIAL_ACTION, MOCK_CREATIVE_PROMPT, MOCK_HTML_REPORT } from "./mockData";
import { AIValidationService } from "./aiValidationService";

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
    return 'gemini-2.5-flash';
  }

  // API key available - use BEST models (corrected to valid model names)
  switch (task) {
    case 'reasoning':
      return 'gemini-1.5-pro'; // Best stable model for physics reasoning
    case 'vision':
      return 'gemini-1.5-pro'; // Best for chaos mode (vision capabilities)
    case 'creative':
      return 'gemini-1.5-pro'; // Best for creative prompts
    case 'image':
      return 'gemini-2.0-flash-exp-image-generation'; // Experimental image generation
    case 'video':
      return 'gemini-1.5-pro'; // Video generation not natively supported, use text model
    default:
      return 'gemini-1.5-pro';
  }
};

const isTestMode = () => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('test') === 'true';
};

// --- UTILITIES ---

const FALLBACK_PROMPTS = [
    "Casual lounge with colorful floating orbs and interactive cubes on tables",
    "Meeting room with conference table, chairs, and markers scattered around",
    "Gaming lounge with neon bouncing balls and arcade-style furniture",
    "Creative studio with art supplies, building blocks, and work tables",
    "Open world with trees, rocks, and glowing crystals on grassy terrain",
    "Social hangout space with couches and decorative spheres",
    "Collaborative workspace with modular furniture and graspable objects",
    "Minecraft-style environment with natural terrain and collectible items"
];

/**
 * Generate fallback scene when API quota exceeded
 * Creates a reasonable default scene based on prompt keyword parsing
 */
function generateFallbackScene(prompt: string): AnalysisResponse {
  const lowerPrompt = prompt.toLowerCase();
  let assetGroups: AssetGroup[] = [];

  // Detect gravity environment
  const isZeroG = lowerPrompt.includes('zero') || lowerPrompt.includes('orbit') || lowerPrompt.includes('space') || lowerPrompt.includes('weightless');
  const isLowG = lowerPrompt.includes('moon') || lowerPrompt.includes('low gravity');
  const isHighG = lowerPrompt.includes('high gravity') || lowerPrompt.includes('heavy');

  let gravity: Vector3Data;
  let movementBehavior: MovementBehavior;

  if (isZeroG) {
    gravity = { x: 0, y: 0, z: 0 };
    movementBehavior = MovementBehavior.ORBITAL;
  } else if (isLowG) {
    gravity = { x: 0, y: -1.62, z: 0 };
    movementBehavior = MovementBehavior.PHYSICS_GRAVITY;
  } else if (isHighG) {
    gravity = { x: 0, y: -15, z: 0 };
    movementBehavior = MovementBehavior.PHYSICS_GRAVITY;
  } else {
    gravity = { x: 0, y: -9.81, z: 0 };
    movementBehavior = MovementBehavior.PHYSICS_GRAVITY;
  }

  // Detect wind
  const isWindy = lowerPrompt.includes('wind') || lowerPrompt.includes('breeze') || lowerPrompt.includes('gust');
  const wind: Vector3Data = isWindy ? { x: 8, y: 0, z: 0 } : { x: 0, y: 0, z: 0 };

  // Parse object mentions
  const objectKeywords = {
    table: { shape: ShapeType.PLATE, scale: 3, mass: 10, count: 1, color: '#8B4513', friction: 0.6, restitution: 0.3 },
    floor: { shape: ShapeType.PLATE, scale: 5, mass: 100, count: 1, color: '#696969', friction: 0.7, restitution: 0.2 },
    platform: { shape: ShapeType.PLATE, scale: 4, mass: 50, count: 1, color: '#A9A9A9', friction: 0.6, restitution: 0.3 },
    cup: { shape: ShapeType.CYLINDER, scale: 0.5, mass: 2, count: 1, color: '#C0C0C0', friction: 0.4, restitution: 0.5 },
    cylinder: { shape: ShapeType.CYLINDER, scale: 1, mass: 5, count: 3, color: '#4682B4', friction: 0.5, restitution: 0.5 },
    can: { shape: ShapeType.CYLINDER, scale: 0.4, mass: 1, count: 5, color: '#DC143C', friction: 0.4, restitution: 0.6 },
    ball: { shape: ShapeType.SPHERE, scale: 0.5, mass: 2, count: 3, color: '#FF4500', friction: 0.5, restitution: 0.8 },
    sphere: { shape: ShapeType.SPHERE, scale: 1, mass: 5, count: 5, color: '#1E90FF', friction: 0.3, restitution: 0.7 },
    box: { shape: ShapeType.CUBE, scale: 1, mass: 5, count: 5, color: '#D2691E', friction: 0.7, restitution: 0.4 },
    cube: { shape: ShapeType.CUBE, scale: 1, mass: 5, count: 5, color: '#FFA500', friction: 0.5, restitution: 0.5 },
    crate: { shape: ShapeType.CUBE, scale: 1.5, mass: 8, count: 3, color: '#8B4513', friction: 0.8, restitution: 0.3 },
    robot: { shape: ShapeType.CAPSULE, scale: 2, mass: 50, count: 1, color: '#00CED1', friction: 0.5, restitution: 0.4 },
    capsule: { shape: ShapeType.CAPSULE, scale: 1.5, mass: 10, count: 2, color: '#FF69B4', friction: 0.5, restitution: 0.5 },
    cone: { shape: ShapeType.CONE, scale: 1, mass: 3, count: 5, color: '#FF8C00', friction: 0.6, restitution: 0.4 },
    pyramid: { shape: ShapeType.PYRAMID, scale: 1.2, mass: 6, count: 3, color: '#FFD700', friction: 0.6, restitution: 0.4 },
    torus: { shape: ShapeType.TORUS, scale: 1, mass: 4, count: 2, color: '#9370DB', friction: 0.5, restitution: 0.6 },
    ring: { shape: ShapeType.TORUS, scale: 0.8, mass: 3, count: 3, color: '#DA70D6', friction: 0.5, restitution: 0.6 }
  };

  // Check for each object type
  for (const [keyword, config] of Object.entries(objectKeywords)) {
    if (lowerPrompt.includes(keyword)) {
      // Determine rigid body type based on object role
      let rigidBodyType = RigidBodyType.DYNAMIC; // Default
      if (keyword === 'table' || keyword === 'floor' || keyword === 'platform') {
        rigidBodyType = RigidBodyType.STATIC; // Surfaces don't move
      } else if (keyword === 'robot') {
        rigidBodyType = RigidBodyType.KINEMATIC; // Robots follow programmed paths
      }

      assetGroups.push({
        id: `${keyword}_group`,
        name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
        count: config.count,
        shape: config.shape,
        color: config.color,
        spawnMode: isZeroG ? SpawnMode.FLOAT : (keyword === 'table' || keyword === 'floor' || keyword === 'platform') ? SpawnMode.GRID : SpawnMode.PILE,
        scale: config.scale,
        rigidBodyType: rigidBodyType,
        mass: config.mass,
        restitution: config.restitution,
        friction: config.friction,
        drag: 0.05
      });
    }
  }

  // Material overrides
  if (lowerPrompt.includes('wood') || lowerPrompt.includes('wooden')) {
    assetGroups.forEach(g => {
      if (!lowerPrompt.includes('metal')) {
        g.color = '#8B4513';
        g.friction = 0.6;
        g.restitution = 0.3;
        g.mass *= 1.0;
      }
    });
  }
  if (lowerPrompt.includes('metal') || lowerPrompt.includes('steel')) {
    assetGroups.forEach(g => {
      g.color = '#C0C0C0';
      g.friction = 0.4;
      g.restitution = 0.5;
      g.mass *= 2.0;
    });
  }
  if (lowerPrompt.includes('rubber') || lowerPrompt.includes('bouncy')) {
    assetGroups.forEach(g => {
      g.color = '#2F4F4F';
      g.friction = 0.9;
      g.restitution = 0.85;
      g.mass *= 0.6;
    });
  }
  if (lowerPrompt.includes('glass') || lowerPrompt.includes('crystal')) {
    assetGroups.forEach(g => {
      g.color = '#00CED1';
      g.friction = 0.1;
      g.restitution = 0.7;
      g.mass *= 1.6;
    });
  }

  // If no objects detected, create a default scene
  if (assetGroups.length === 0) {
    assetGroups.push(
      {
        id: 'default_subject',
        name: 'Primary Object',
        count: 5,
        shape: ShapeType.ICOSAHEDRON,
        color: '#f59e0b',
        spawnMode: isZeroG ? SpawnMode.FLOAT : SpawnMode.GRID,
        scale: 1.5,
        rigidBodyType: RigidBodyType.DYNAMIC,
        mass: 8.0,
        restitution: 0.5,
        friction: 0.5,
        drag: 0.05
      },
      {
        id: 'default_environment',
        name: 'Environment',
        count: 50,
        shape: ShapeType.SPHERE,
        color: '#22d3ee',
        spawnMode: SpawnMode.PILE,
        scale: 0.6,
        rigidBodyType: RigidBodyType.DYNAMIC,
        mass: 2.0,
        restitution: 0.6,
        friction: 0.5,
        drag: 0.05
      }
    );
  }

  // Try to integrate 3D models from library
  const { findModelForObject, getModelScale } = require('./modelLibrary');

  assetGroups = assetGroups.map(group => {
    const modelUrl = findModelForObject(group.name, group.id);

    if (modelUrl) {
      const modelScale = getModelScale(modelUrl);
      console.log(`[GeminiService/Fallback] Using 3D model for "${group.name}"`);
      return {
        ...group,
        shape: ShapeType.MODEL,
        modelUrl,
        scale: modelScale * group.scale
      };
    }

    return group; // Keep geometric primitive if no model found
  });

  console.log('[GeminiService/Fallback] Scene generated with domain randomization (mix of 3D models and geometric primitives)');

  // Apply spatial positioning to prevent random falling (P0 CRITICAL FIX)
  try {
    const { calculateSpatialPositions } = require('./spatialPositioning');
    assetGroups = calculateSpatialPositions(assetGroups);
    console.log('[GeminiService/Fallback] Applied spatial positioning to fallback scene');
  } catch (error) {
    console.error('[GeminiService/Fallback] Failed to apply spatial positioning:', error);
  }

  return {
    movementBehavior,
    gravity,
    wind,
    assetGroups,
    explanation: `Fallback scene generated from keyword parsing (API quota exceeded). Detected: ${assetGroups.map(g => g.name).join(', ')}. Using available 3D models with geometric primitive fallbacks.`
  };
}

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

/**
 * Internal function - performs AI analysis without validation
 */
const analyzePhysicsPromptInternal = async (userPrompt: string): Promise<AnalysisResponse> => {
  if (isTestMode()) {
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
        const errorMsg = error.error || response.statusText;

        // Check if quota exceeded
        if (errorMsg.includes('quota') || errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
          console.warn('[GeminiService] API quota exceeded, using fallback scene generation');
          return generateFallbackScene(userPrompt);
        }

        throw new Error(`Backend API error: ${errorMsg}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('[GeminiService] Backend API failed:', error);

      // Use fallback for quota/network errors
      if (error.message.includes('quota') || error.message.includes('429') || error.message.includes('fetch')) {
        console.warn('[GeminiService] Using fallback scene generation');
        return generateFallbackScene(userPrompt);
      }

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
        contents: `You are a Photorealistic Physics-Aware 3D Digital Twin Generator for SnapLock simulation engine.

        USER PROMPT: "${userPrompt}"

        MISSION: Generate PHOTOREALISTIC 3D digital twins with physics-accurate materials and properties. Create a COMPLETE 3D environment with the user's requested objects that looks and behaves like the real world.

        STEP 1: Identify the SCENE TYPE from the prompt
        STEP 2: Generate the BASE ENVIRONMENT (floor, walls, furniture for that scene type)
        STEP 3: Add the USER'S MENTIONED OBJECTS with proper placement

        SCENE TYPES:
        - "meeting room" / "conference room" / "office" -> MEETING_ROOM (floor, table, chairs)
        - "lounge" / "living room" / "hangout" -> LOUNGE (floor, couches, coffee table)
        - "gaming room" / "arcade" / "game space" -> GAMING_ROOM (floor, arcade cabinets, gaming chairs)
        - "studio" / "art room" / "workshop" -> CREATIVE_STUDIO (floor, work tables, storage)
        - "outdoor" / "nature" / "forest" / "field" -> OPEN_WORLD (grass floor, trees, rocks)

        If no scene type mentioned, use LOUNGE as default.

        REQUIREMENTS:

        0. RIGID BODY TYPES (CRITICAL FOR SYNTHETIC DATA GENERATION)
           Assign rigidBodyType to EVERY object based on its role:

           STATIC: Fixed objects that never move (critical for surgical/industrial simulations)
           - Operating tables, floors, walls, platforms, fixtures
           - Organs/tissues being operated on (heart, brain, liver)
           - Industrial workbenches, assembly fixtures, mounting plates
           - Use when: Object provides reference frame for manipulation tasks

           KINEMATIC: Precisely controlled motion, NOT affected by physics forces
           - Robotic arms (surgical robots, industrial manipulators)
           - Gantry systems, CNC machines, automated stages
           - VR hand controllers, teleoperated devices
           - Use when: Object follows programmed trajectories, not physics

           DYNAMIC: Normal physics simulation (default if not specified)
           - Surgical instruments (forceps, needles, scalpels)
           - Parts being assembled, packages, containers
           - Objects that collide, fall, bounce naturally
           - Use when: Object should respond to forces and collisions

           EXAMPLE - Surgical Robot Scene:
           - operating_table: STATIC
           - heart_model: STATIC
           - da_vinci_arm: KINEMATIC
           - suture_needle: DYNAMIC (held by kinematic arm)
           - forceps: DYNAMIC

        1. SHAPE MAPPING
           - Flat surfaces (tables, floors, platforms) -> PLATE
           - Containers (cups, cans, bottles) -> CYLINDER
           - Boxes (crates, packages, blocks) -> CUBE
           - Rolling objects (balls, spheres) -> SPHERE
           - Pointed objects (cones, pyramids) -> CONE or PYRAMID
           - Robots, humanoids -> CAPSULE
           - Irregular objects (rocks, debris) -> ICOSAHEDRON
           - Rings, tires, hoops -> TORUS

        2. MATERIAL PHYSICS
           WOOD: friction:0.6, restitution:0.3, mass:5, drag:0.05, color:#8B4513
           METAL: friction:0.4, restitution:0.5, mass:15, drag:0.02, color:#C0C0C0
           RUBBER: friction:0.9, restitution:0.85, mass:3, drag:0.1, color:#2F4F4F
           GLASS: friction:0.1, restitution:0.7, mass:8, drag:0.01, color:#00CED1
           PLASTIC: friction:0.5, restitution:0.6, mass:2, drag:0.06, color:vibrant
           STONE/CONCRETE: friction:0.8, restitution:0.2, mass:20, drag:0.03, color:#696969
           CARDBOARD: friction:0.7, restitution:0.25, mass:1, drag:0.15, color:#D2691E
           FABRIC: friction:0.8, restitution:0.1, mass:0.5, drag:0.25, color:varied

        3. DRAG COEFFICIENTS
           - Streamlined (capsule, sphere): 0.02-0.05
           - Compact rigid (cube, cylinder): 0.05-0.1
           - Irregular (debris, cloth): 0.1-0.25

        4. SPAWN MODES
           - "on X" / "above X" -> Foundation first (GRID), dependent in contact zone
           - "floating" / "hovering" -> FLOAT spawn
           - "falling" / "thrown" -> JET or BLAST spawn
           - "scattered" / "pile of" -> PILE spawn
           - "organized" / "grid" -> GRID spawn
           - "explosion" / "burst" -> BLAST spawn

        5. GRAVITY & WIND
           GRAVITY:
           - Earth (default): {x:0, y:-9.81, z:0}, PHYSICS_GRAVITY
           - Moon / low gravity: {x:0, y:-1.62, z:0}
           - Zero-G / space: {x:0, y:0, z:0}, ORBITAL behavior
           - High gravity: {x:0, y:-15 to -25, z:0}

           WIND:
           - Calm (default): {x:0, y:0, z:0}
           - Breeze: {x:3-5, y:0, z:0}
           - Windy: {x:8-12, y:0, z:0}
           - Storm: {x:20-30, y:0, z:-5}

        6. SCALE & COUNT
           - Large static (tables, floors): scale 2-5, count 1-3, mass 20-100 kg
           - Medium objects (boxes, robots): scale 0.5-2, count 1-15, mass 2-50 kg
           - Small items (cups, balls): scale 0.2-0.8, count 1-20, mass 0.1-5 kg
           - Particles (marbles, debris): scale 0.05-0.2, count 20-200, mass 0.01-0.5 kg
           - Mass scales with volume (scale³) and material density

        7. COLOR ASSIGNMENT
           - Use material-realistic colors (wood=brown, metal=gray, glass=cyan)
           - High contrast for computer vision (bright vs dark)
           - Avoid pure black (#000) or pure white (#FFF)

        8. VR INTERACTIONS (when prompt mentions VR/grasping/manipulation)
           Add affordances to objects:
           - graspable: true for small/medium pickable objects
           - manipulable: true if movable after grasping
           - interactive: true for mechanisms (doors, drawers, buttons)
           - interactionType: 'door'/'drawer'/'button'/'lever' or 'static'

           Add spatial constraints for structured scenes:
           - type: 'on_surface' (objects on tables), 'attached_to' (connected parts), 'none' (floating)
           - parentGroupId: ID of surface/parent object
           - maintainOrientation: true to keep upright

           Add semantic labels:
           - semanticLabel: Specific category (e.g., "coffee_mug", "office_desk")
           - vrRole: 'target'/'tool'/'furniture'/'environment'

        9. JOINTS (for interactive objects: doors, drawers, buttons)
           DOOR (Revolute): type:'REVOLUTE', axis:{x:0,y:1,z:0}, limits:{min:0,max:1.57}
           DRAWER (Prismatic): type:'PRISMATIC', axis:{x:1,y:0,z:0}, limits:{min:0,max:0.5}
           BUTTON (Prismatic): type:'PRISMATIC', axis:{x:0,y:-1,z:0}, limits:{min:0,max:0.02}
           HANDLE (Fixed): type:'FIXED', rigidly attached

           Rules: Parent object before child, joint ID: "{parent}_to_{child}_joint"

        EXAMPLE 1:
        "conference room with laptops and notebooks"
        BASE SCENE (MEETING_ROOM):
        -> floor (PLATE, concrete, scale:6, mass:100, static, GRID, y:0)
        -> conference_table (PLATE, wood, scale:2.5x0.05x1.2, mass:30, GRID, y:0.4)
        -> chair (CUBE, plastic, scale:0.4x0.5x0.4, mass:8, count:4, GRID around table)
        USER OBJECTS:
        -> laptop (CUBE, metal, scale:0.3x0.02x0.2, mass:2, count:3, GRID on table, y:0.45)
        -> notebook (CUBE, cardboard, scale:0.2x0.01x0.15, mass:0.3, count:3, GRID on table, y:0.45)

        EXAMPLE 2:
        "lounge with colorful balls"
        BASE SCENE (LOUNGE):
        -> floor (PLATE, wood, scale:6, mass:100, static, GRID, y:0)
        -> couch (CUBE, fabric, scale:1.5x0.6x0.8, mass:25, count:2, GRID)
        -> coffee_table (PLATE, wood, scale:1x0.05x0.6, mass:15, GRID, y:0.25)
        USER OBJECTS:
        -> ball (SPHERE, rubber, scale:0.15, mass:0.5, restitution:0.85, count:10, PILE on floor)

        CRITICAL RULES:
        - ALWAYS generate complete scene: BASE ENVIRONMENT + USER OBJECTS
        - BASE ENVIRONMENT includes floor, walls (optional), furniture appropriate to scene type
        - USER OBJECTS are placed WITH spatial context (on table, on floor, on shelf - NOT floating in void)
        - Use "on_surface" spatial constraints to place objects on surfaces (y position = surface top)
        - Foundation objects (floors, tables) must have y:0 or appropriate elevation
        - Use realistic physics values from material science
        - Only create joints array when interactive objects present

        Return strictly valid JSON matching the schema.`,
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
                    rigidBodyType: { type: Type.STRING, enum: Object.values(RigidBodyType) },
                    mass: { type: Type.NUMBER },
                    restitution: { type: Type.NUMBER },
                    friction: { type: Type.NUMBER },
                    drag: { type: Type.NUMBER },
                    },
                    required: ["id", "name", "count", "shape", "color", "spawnMode", "scale", "mass", "restitution", "friction", "drag"]
                }
                },
                joints: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['REVOLUTE', 'PRISMATIC', 'FIXED', 'SPHERICAL'] },
                    parentGroupId: { type: Type.STRING },
                    childGroupId: { type: Type.STRING },
                    parentAnchor: {
                        type: Type.OBJECT,
                        properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, z: { type: Type.NUMBER } },
                    },
                    childAnchor: {
                        type: Type.OBJECT,
                        properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, z: { type: Type.NUMBER } },
                    },
                    axis: {
                        type: Type.OBJECT,
                        properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, z: { type: Type.NUMBER } },
                    },
                    limits: {
                        type: Type.OBJECT,
                        properties: {
                        min: { type: Type.NUMBER },
                        max: { type: Type.NUMBER },
                        stiffness: { type: Type.NUMBER },
                        damping: { type: Type.NUMBER },
                        },
                    },
                    motor: {
                        type: Type.OBJECT,
                        properties: {
                        enabled: { type: Type.BOOLEAN },
                        targetVelocity: { type: Type.NUMBER },
                        maxForce: { type: Type.NUMBER },
                        },
                    },
                    initialState: { type: Type.NUMBER },
                    },
                    required: ["id", "type", "parentGroupId", "childGroupId", "parentAnchor", "childAnchor", "axis"]
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

        const aiResponse = JSON.parse(jsonText) as AnalysisResponse;

        // POST-PROCESSING #1: 3D MODEL INTEGRATION
        // Try to find 3D models for each asset group from the model library
        const { findModelForObject, getModelScale } = await import('./modelLibrary');

        aiResponse.assetGroups = aiResponse.assetGroups.map((group: AssetGroup) => {
          // Try to find a 3D model for this object
          const modelUrl = findModelForObject(group.name, group.id);

          if (modelUrl) {
            // Found a 3D model! Use it instead of geometric primitive
            const modelScale = getModelScale(modelUrl);
            console.log(`[GeminiService] [OK] Using 3D model for "${group.name}": ${modelUrl}`);

            // Add domain randomization to material properties (±20%)
            const materialVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2

            return {
              ...group,
              shape: ShapeType.MODEL, // Switch from geometric primitive to MODEL
              modelUrl: modelUrl,
              scale: modelScale * group.scale, // Combine AI scale with model-specific scale
              // Domain randomization: vary material properties for training diversity
              restitution: Math.max(0.1, Math.min(0.95, group.restitution * materialVariation)),
              friction: Math.max(0.1, Math.min(0.95, group.friction * materialVariation)),
            };
          } else {
            // No model found - use geometric primitive with domain randomization
            console.log(`[GeminiService] Using geometric primitive for "${group.name}" (no model match)`);

            const materialVariation = 0.8 + Math.random() * 0.4;
            return {
              ...group,
              restitution: Math.max(0.1, Math.min(0.95, group.restitution * materialVariation)),
              friction: Math.max(0.1, Math.min(0.95, group.friction * materialVariation)),
            };
          }
        });

        // POST-PROCESSING #2: Set default rigidBodyType if missing
        aiResponse.assetGroups = aiResponse.assetGroups.map((group: AssetGroup) => {
          if (!group.rigidBodyType) {
            // Default to DYNAMIC for backward compatibility
            return { ...group, rigidBodyType: RigidBodyType.DYNAMIC };
          }
          return group;
        });

        // POST-PROCESSING #3: Apply spatial positioning (P0 CRITICAL FIX)
        console.log('[GeminiService] Applying spatial positioning to prevent random falling...');
        const { calculateSpatialPositions } = await import('./spatialPositioning');
        aiResponse.assetGroups = calculateSpatialPositions(aiResponse.assetGroups);

        return aiResponse;
    });
  } catch (error: any) {
      console.error("[GeminiService] Analysis Error:", error);

      // Use fallback for quota errors, authentication errors, or API key issues
      const errorMessage = error.message || '';
      const errorCode = error.status || error.code || '';

      const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED');
      const isAuthError = errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('403') ||
                          errorCode === 401 || errorCode === 403 || errorMessage.includes('unauthorized') ||
                          errorMessage.includes('API_KEY_INVALID') || !hasApiKey();
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED');

      if (isQuotaError || isAuthError || isNetworkError) {
        console.warn('[GeminiService] API unavailable (quota/auth/network), using fallback scene generation');
        return generateFallbackScene(userPrompt);
      }

      throw error;
  }
};

/**
 * Public API - Analyzes physics prompts with AI validation
 * Validates AI response against user intent and retries if needed
 */
export const analyzePhysicsPrompt = async (userPrompt: string): Promise<AnalysisResponse> => {
  try {
    const MAX_RETRIES = 2;
    let attempt = 0;
    let lastResponse: AnalysisResponse | null = null;

    while (attempt < MAX_RETRIES) {
      attempt++;

      // Get AI response
      const promptToUse = attempt === 1
        ? userPrompt
        : AIValidationService.generateEnhancedPrompt(userPrompt, AIValidationService.extractIntent(userPrompt));

      const response = await analyzePhysicsPromptInternal(promptToUse);
      lastResponse = response;

      // Extract physics params for validation
      const physicsParams: PhysicsParams = {
        gravity: response.gravity,
        wind: response.wind,
        movementBehavior: response.movementBehavior,
        assetGroups: response.assetGroups,
      };

      // Validate response
      const validationResult = AIValidationService.validateAIResponse(userPrompt, physicsParams);

      // Log validation results
      AIValidationService.logValidationResults(validationResult, userPrompt);

      // If valid or last attempt, return
      if (validationResult.isValid || attempt >= MAX_RETRIES) {
        if (!validationResult.isValid && attempt >= MAX_RETRIES) {
          console.warn(`[!] AI validation failed after ${MAX_RETRIES} attempts. Using last response anyway.`);
        }
        return response;
      }

      // Log retry
      console.log(`[SYNC] Validation failed (confidence: ${(validationResult.confidence * 100).toFixed(1)}%). Retrying with enhanced prompt (attempt ${attempt + 1}/${MAX_RETRIES})...`);
    }

    // Fallback (should never reach here)
    return lastResponse!;
  } catch (error) {
    // Final safety net: if everything fails, return a basic fallback scene
    console.error('[GeminiService] All attempts failed, using final fallback scene:', error);
    return generateFallbackScene(userPrompt);
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
                contents: `Generate a single, creative scene prompt for a social VR physics simulation engine called SnapLock.

                Scene Template Options:
                - LOUNGE: Casual hangout with couches, floating orbs, interactive objects
                - MEETING_ROOM: Conference table with chairs, markers, collaborative tools
                - GAMING_ROOM: Arcade cabinets, neon bouncing balls, gaming furniture
                - CREATIVE_STUDIO: Work tables with art supplies, colorful building blocks
                - OPEN_WORLD: Minecraft-style terrain with trees, rocks, natural objects

                Examples:
                - "Casual lounge with colorful floating orbs and interactive cubes on tables"
                - "Gaming lounge with neon bouncing balls and arcade-style furniture"
                - "Creative studio with art supplies, building blocks, and work tables"
                - "Open world with trees, rocks, and glowing crystals on grassy terrain"

                OUTPUT: Just the prompt text string describing a social/collaborative VR space. No quotes, no markdown.`,
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

/**
 * Generates a photorealistic image from a scene description using Imagen 3.0
 * @param sceneDescription - Natural language description of the scene
 * @returns Base64-encoded photorealistic image
 */
export const generatePhotorealisticScene = async (sceneDescription: string): Promise<string> => {
  if (isTestMode()) {
     // Return a 1x1 pixel base64 image
     return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }

  // Enhanced prompt for photorealistic rendering
  const imagePrompt = `Photorealistic 3D render: ${sceneDescription}.
  Professional quality, realistic materials (wood textures, metallic reflections, glass transparency),
  neutral office/lab environment with proper lighting and shadows,
  clean composition, high detail, suitable for computer vision training data. 16:9 aspect ratio.`;

  console.log('[generatePhotorealisticScene] Generating with local Stable Diffusion server');

  try {
    // Try local Stable Diffusion server first
    const sdResponse = await fetch('http://localhost:5001/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: imagePrompt })
    });

    if (sdResponse.ok) {
      const result = await sdResponse.json();
      if (result.success && result.image) {
        console.log('[generatePhotorealisticScene] Successfully generated with Stable Diffusion');
        return result.image;
      }
    }

    console.warn('[generatePhotorealisticScene] Local SD server unavailable, trying cloud APIs...');
  } catch (sdError) {
    console.warn('[generatePhotorealisticScene] Local SD server error:', sdError);
  }

  // Fallback to cloud APIs if local server unavailable
  if (!hasApiKey()) {
    throw new Error('Photorealistic rendering requires either local SD server (http://localhost:5001) or Gemini API key');
  }

  const apiKey = getApiKey();

  // Try Imagen 4.0
  try {
    console.log('[generatePhotorealisticScene] Trying Imagen 4.0...');
    const imagenResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:generateImages?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: '16:9'
          }
        })
      }
    );

    if (imagenResponse.ok) {
      const result = await imagenResponse.json();
      if (result.images && result.images.length > 0) {
        const imageData = result.images[0].imageBytes;
        return `data:image/png;base64,${imageData}`;
      }
    }
  } catch (imagenError) {
    console.warn('[generatePhotorealisticScene] Imagen 4.0 failed:', imagenError);
  }

  // Final fallback: Gemini image generation
  try {
    console.log('[generatePhotorealisticScene] Trying Gemini 2.0 Flash Image Generation...');
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp-image-generation',
      contents: imagePrompt
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) throw new Error('No content generated');

    const imagePart = parts.find((p: any) => p.inlineData);

    if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
  } catch (geminiError) {
    console.error('[generatePhotorealisticScene] Gemini image generation failed:', geminiError);
  }

  throw new Error('All photorealistic generation methods failed. Start local SD server: cd backend && python sd_server.py');
};

/**
 * DEPRECATED: Old function that tried to convert wireframes to photorealistic images
 * Use generatePhotorealisticScene() instead
 */
export const generateRealityImage = async (base64Image: string, prompt: string): Promise<string> => {
  if (isTestMode()) {
     // Return a 1x1 pixel base64 image
     return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }

  // Redirect to new function
  return generatePhotorealisticScene(prompt);

  /* DISABLED CODE - Re-enable when model name is verified
  return withRetry(async () => {
    try {
        const ai = getAI();

        const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

        const aiPrompt = `
        MISSION: Generate SCIENTIFIC GROUND TRUTH image for ML training dataset.

        Scene Description: "${prompt}"

        CRITICAL REQUIREMENTS:

        1. EXACT GEOMETRIC FIDELITY
           - Preserve EXACT positions, orientations, and scales from input wireframe
           - Do NOT alter object placement, count, or spatial relationships
           - Maintain precise depth relationships and occlusions

        2. REALISTIC PHYSICS SIMULATION APPEARANCE
           - Objects must appear as real physical entities, not artistic interpretations
           - Materials should show realistic properties (metal=reflective, wood=matte, rubber=soft sheen)
           - No fantasy elements, stylization, or artistic embellishments
           - Natural physics-based lighting (no dramatic or theatrical lighting)

        3. COMPUTER VISION TRAINING DATA QUALITY
           - High contrast edges for object detection algorithms
           - Realistic shadows for depth estimation training
           - Natural color variation and texture detail
           - Suitable for: object detection, pose estimation, depth prediction, semantic segmentation

        4. TECHNICAL SPECIFICATIONS
           - Natural ambient lighting with single light source (no multi-colored lights)
           - Physically-based rendering (PBR) materials only
           - Neutral background (concrete, industrial floor, lab environment)
           - No motion blur, lens flare, or camera effects
           - Crisp focus throughout entire frame

        OUTPUT: Photorealistic render suitable as ML training ground truth with pixel-perfect geometry matching input.
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
  */
};

/**
 * WARNING: Video generation has fundamental issues:
 * 1. Video AI models generate based on visual patterns, NOT physics simulation
 * 2. Cannot accurately simulate Newtonian mechanics, collision dynamics, or gravity
 * 3. Output looks plausible but is physically inaccurate
 * 4. Generation takes minutes and may not be available in all API tiers
 *
 * RECOMMENDATION: Use Three.js to record actual physics simulation frames
 * TEMPORARY FIX: Disabled until proper physics-based video recording is implemented
 */
export const generateSimulationVideo = async (base64Image: string, prompt: string): Promise<string> => {
  if (isTestMode()) {
      // Mock video blob url
      return "mock_video_url.mp4";
  }

  // TEMPORARY: Disabled until proper solution
  console.warn('[generateSimulationVideo] Video generation disabled. Use Three.js frame recording instead.');
  throw new Error('Video generation temporarily disabled. Use screenshot capture instead.');

  /* DISABLED CODE - Re-enable when physics-based recording is implemented
  try {
    const veoAi = getAI();
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    // Initiate Generation (Using High Fidelity Video Model)
    let operation = await withRetry(async () => {
        return await veoAi.models.generateVideos({
            model: 'veo-3.1-generate-preview',
            prompt: `SCIENTIFIC PHYSICS SIMULATION: ${prompt}. Requirements: (1) Realistic object motion following Newtonian mechanics, (2) Natural lighting, no artistic effects, (3) Stable camera view suitable for computer vision training data, (4) Objects maintain physical properties (rigid bodies, collision dynamics, gravity effects), (5) Photorealistic materials (metal, wood, rubber appear as real), (6) No stylization or fantasy elements, (7) Ground truth quality for ML dataset generation. Technical specifications: Physics-based animation, neutral industrial environment, high contrast for object detection, steady camera.`,
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
    const key = getApiKey();
    const videoResponse = await fetch(`${downloadLink}&key=${key}`);
    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);

  } catch (error) {
    console.error("Video Gen Error:", error);
    throw error;
  }
  */
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
        console.error("Chaos Mode Error:", error);
        // Fallback for Chaos Mode to keep loop alive without crashing
        return {
            detectedState: "Error",
            action: DisturbanceType.NONE,
            intensity: 0,
            reasoning: "Chaos Mode offline or overloaded."
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
