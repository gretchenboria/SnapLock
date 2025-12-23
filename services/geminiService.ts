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
    return 'gemini-3-pro-preview';
  }

  // API key available - use BEST SOTA models for each task (Dec 2025)
  // CRITICAL: Use Pro models with dynamic thinking, NOT Flash
  switch (task) {
    case 'reasoning':
      return 'gemini-3-pro-preview'; // PhD-level reasoning with dynamic thinking (1M context)
    case 'vision':
      return 'gemini-3-pro-preview'; // Multimodal analysis with advanced reasoning
    case 'creative':
      return 'gemini-3-pro-preview'; // Complex creative generation with thinking
    case 'image':
      return 'imagen-3.0-generate-002'; // SOTA image generation (or imagen-4.0-generate-001)
    case 'video':
      return 'veo-3.1-generate-preview'; // SOTA video generation with audio
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
async function generateFallbackScene(prompt: string): Promise<AnalysisResponse> {
  const lowerPrompt = prompt.toLowerCase();
  let assetGroups: AssetGroup[] = [];

  // CONTEXT-AWARE MOVEMENT BEHAVIOR FOR ML TRAINING
  // PURPOSE: Controlled, reproducible motion - NOT chaotic falling!

  // Detect scene context
  const isZeroG = lowerPrompt.includes('zero') || lowerPrompt.includes('orbit') || lowerPrompt.includes('space') || lowerPrompt.includes('weightless');
  const isSurgical = lowerPrompt.includes('surgical') || lowerPrompt.includes('surgery') || lowerPrompt.includes('operating') || lowerPrompt.includes('medical');
  const isWarehouse = lowerPrompt.includes('warehouse') || lowerPrompt.includes('conveyor') || lowerPrompt.includes('factory') || lowerPrompt.includes('assembly');
  const isDrone = lowerPrompt.includes('drone') || lowerPrompt.includes('uav') || lowerPrompt.includes('quadcopter') || lowerPrompt.includes('swarm');
  const isTraffic = lowerPrompt.includes('traffic') || lowerPrompt.includes('highway') || lowerPrompt.includes('road') || lowerPrompt.includes('vehicle');
  const isRobotics = lowerPrompt.includes('robot') || lowerPrompt.includes('robotic') || lowerPrompt.includes('manipulator');

  let gravity: Vector3Data;
  let movementBehavior: MovementBehavior;

  // CRITICAL: Use context-aware movement for ML training data
  if (isZeroG) {
    // Space/orbital scenarios
    gravity = { x: 0, y: 0, z: 0 };
    movementBehavior = MovementBehavior.ORBITAL;
  } else if (isSurgical || isRobotics) {
    // Surgical/robotics: Controlled motion via behaviors, NO automatic movement!
    // Objects are KINEMATIC (controlled) and only move when commanded by behaviors
    gravity = { x: 0, y: -9.81, z: 0 };  // Gravity exists but objects are KINEMATIC
    movementBehavior = MovementBehavior.ORBITAL;  // ORBITAL with zero-g = objects stay put until commanded
  } else if (isWarehouse) {
    // Warehouse: Conveyor belt motion, controlled flow
    gravity = { x: 0, y: -9.81, z: 0 };
    movementBehavior = MovementBehavior.LINEAR_FLOW;  // Conveyor belts
  } else if (isDrone) {
    // Drones: Coordinated flight patterns
    gravity = { x: 0, y: -9.81, z: 0 };
    movementBehavior = MovementBehavior.SWARM_FLOCK;  // Coordinated swarms
  } else if (isTraffic) {
    // Traffic: Predictable vehicle flow
    gravity = { x: 0, y: -9.81, z: 0 };
    movementBehavior = MovementBehavior.LINEAR_FLOW;  // Vehicle flow
  } else {
    // General default: Objects stay in place unless commanded
    gravity = { x: 0, y: -9.81, z: 0 };
    movementBehavior = MovementBehavior.ORBITAL;  // Objects maintain position (kinematic hold)
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
  try {
    const modelLibrary = await import('./modelLibrary');
    const { findModelForObject, getModelScale } = modelLibrary;

    assetGroups = assetGroups.map(group => {
      const modelInfo = findModelForObject(group.name, group.id);

      if (modelInfo) {
        console.log(`[GeminiService/Fallback] Using 3D model for "${group.name}": ${modelInfo.modelUrl}`);
        return {
          ...group,
          shape: ShapeType.MODEL,
          modelUrl: modelInfo.modelUrl,
          scale: modelInfo.scale * group.scale
        };
      }

      return group; // Keep geometric primitive if no model found
    });

    console.log('[GeminiService/Fallback] Scene generated with domain randomization (mix of 3D models and geometric primitives)');
  } catch (error) {
    console.warn('[GeminiService/Fallback] Model library not available, using primitives');
  }

  // Apply spatial positioning to prevent random falling (P0 CRITICAL FIX)
  try {
    const spatialModule = await import('./spatialPositioning');
    const { calculateSpatialPositions } = spatialModule;
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
        // Use best reasoning model for physics configuration
        const modelName = getModelForTask('reasoning');
        const response = await ai.models.generateContent({
        model: modelName,
        contents: `You are a Photorealistic Physics-Aware 3D Digital Twin Generator for SnapLock simulation engine.

        USER PROMPT: "${userPrompt}"

        MISSION: You are generating ML TRAINING DATA for robotics and computer vision.
        This is a SIMULATION platform - you MUST generate ANIMATED action sequences, not static scenes!

        CRITICAL UNDERSTANDING:
        - This is NOT a scene builder - it's a SIMULATION ENGINE
        - Users want to see ACTIONS and TASKS being performed
        - Generate physics simulations of robots/agents DOING things
        - Output = video of simulated task for ML training

        STEP 1: DETECT ACTION VERBS in the prompt
        - "pick up", "grasp", "grab" → GRASP action
        - "move", "transport", "carry" → MOVE_TO action
        - "drop", "release", "place" → RELEASE action
        - "inspect", "scan", "navigate" → FOLLOW_PATH action
        - "rotate", "turn", "flip" → ROTATE action

        STEP 2: MANDATORY BEHAVIOR GENERATION
        CRITICAL: If ANY robots/agents are present in the scene, you MUST generate behaviors array.
        - Robot prompts WITHOUT explicit verbs → Generate default inspection/demo behaviors
        - Example: "robot arm" → Generate behaviors showing the robot moving and demonstrating capability
        - Example: "surgical robot" → Generate behaviors showing surgical motions
        - NEVER generate robot scenes without behaviors - robots must DO something!

        STEP 3: Generate BASE ENVIRONMENT appropriate for the task
        STEP 4: Add ACTORS (robots, agents) that will perform actions
        STEP 5: Add TARGET OBJECTS that actions are performed on

        EXAMPLE PROMPTS (what users ACTUALLY want):
        - "surgical robot picks up scalpel" → Robot + scalpel + GRASP behavior
        - "forklift moves box to shelf" → Forklift + box + MOVE_TO behavior
        - "drone flies inspection path" → Drone + FOLLOW_PATH behavior
        - "robotic arm assembles parts" → Arm + parts + GRASP + MOVE_TO sequence

        REQUIREMENTS:

        0. RIGID BODY TYPES (CRITICAL FOR SYNTHETIC DATA GENERATION)
           Assign rigidBodyType to EVERY object based on its role:

           STATIC: Fixed objects that never move (critical for surgical/industrial simulations)
           - Operating tables, floors, walls, platforms, fixtures
           - Organs/tissues being operated on (heart, brain, liver)
           - Industrial workbenches, assembly fixtures, mounting plates
           - Use when: Object provides reference frame for manipulation tasks
           - Mass: Use realistic mass (e.g., floor=100kg, table=50kg). NEVER use mass=0

           KINEMATIC: Precisely controlled motion, NOT affected by physics forces
           - Robotic arms (surgical robots, industrial manipulators)
           - Gantry systems, CNC machines, automated stages
           - VR hand controllers, teleoperated devices
           - Use when: Object follows programmed trajectories, not physics
           - Mass: Required (use typical mass for the object type)

           DYNAMIC: Normal physics simulation (default if not specified)
           - Surgical instruments (forceps, needles, scalpels)
           - Parts being assembled, packages, containers
           - Objects that collide, fall, bounce naturally
           - Use when: Object should respond to forces and collisions
           - Mass: MUST BE > 0 (physics engine requires mass for dynamics)

           EXAMPLE - Surgical Robot Scene:
           - operating_table: STATIC
           - heart_model: STATIC
           - da_vinci_arm: KINEMATIC
           - suture_needle: DYNAMIC (held by kinematic arm)
           - forceps: DYNAMIC

        1. 3D MODEL USAGE (ENTERPRISE GRADE - PRODUCTION QUALITY ONLY!)

           CRITICAL: This is an ENTERPRISE ML training platform. Use REAL 3D models, NOT mock primitives!

           **ROBOTS & VEHICLES (MANDATORY - NEVER USE PRIMITIVES FOR THESE!):**

           CRITICAL: For robots, ALWAYS use appropriate 3D models with type:'mesh', shape:'MODEL':

           **SURGICAL/MEDICAL ROBOTS:**
           - "Da Vinci surgical robot" / "Surgical robot" / "Medical robot": modelUrl:'/models/surgical_robot_davinci.glb', scale:1.0
           - NEVER use generic robotic_arm_6axis.glb for surgical robots!

           **INDUSTRIAL ROBOTS:**
           - "6-axis robot arm" / "Industrial robotic arm" / "Manipulator": modelUrl:'/models/robotic_arm_6axis.glb', scale:1.0
           - "KUKA robot" / "Heavy duty robot" / "Factory robot": modelUrl:'/models/industrial_robot_arm_kuka.glb', scale:1.0
           - "Basic robot arm" / "Simple robot" / "Mech arm" / "Demo robot": modelUrl:'/models/basic_robot_arm.glb', scale:2.5
           - "Collaborative robot" / "Cobot" / "UR5": modelUrl:'/models/collaborative_robot_ur5.glb', scale:1.0
           - "SCARA robot" / "Pick and place robot": modelUrl:'/models/scara_robot_assembly.glb', scale:1.0
           - "Delta robot" / "Parallel robot" / "Picker robot": modelUrl:'/models/delta_robot_picker.glb', scale:1.0

           **AERIAL ROBOTS:**
           - "Drone" / "Quadcopter" / "UAV": modelUrl:'/models/drone_quadcopter.glb', scale:1.0

           **VEHICLES:**
           - "Buggy" / "Off-road vehicle": modelUrl:'/models/buggy.glb', scale:1.0
           - "Autonomous vehicle" / "Self-driving car": modelUrl:'/models/autonomous_vehicle.glb', scale:1.0
           - "Toy car": modelUrl:'/models/toy_car.glb', scale:0.8

           NEVER use primitives (CUBE, CYLINDER, SPHERE) for robots or vehicles!

           **ENVIRONMENTAL OBJECTS (ALWAYS use primitives - NOT 3D models!):**
           - Floors/ground/surfaces/platforms: shape:'PLATE', type:'primitive' (NEVER modelUrl!)
           - Tables/workbenches/desks/counters: shape:'PLATE', type:'primitive' (NEVER use vehicle models!)
           - Walls/barriers/partitions: shape:'CUBE', type:'primitive'
           - Generic crates/boxes/bins/containers: shape:'CUBE', type:'primitive' (NEVER use buggy.glb!)
           - Generic cylinders/barrels/tubes: shape:'CYLINDER', type:'primitive'
           - Generic spheres/balls: shape:'SPHERE', type:'primitive'
           - Parts/components/pieces to manipulate: shape:'CUBE' or 'CYLINDER', type:'primitive'
           - Surgical instruments/tools: shape:'CYLINDER', type:'primitive', scale:0.1-0.2

           **SPECIFIC 3D MODELS (use ONLY if prompt specifically names these items):**
           CRITICAL: Do NOT add gearboxes, saws, or machinery to robot/vehicle scenes!
           - "Textured cardboard box": modelUrl:'/models/box_textured.glb'
           - "Water bottle": modelUrl:'/models/water_bottle.glb'
           - "Lantern": modelUrl:'/models/lantern.glb'

           WARNING: NEVER use these with robots - they cause visual clutter:
           - "Industrial gearbox" (ONLY if user explicitly requests gearbox): modelUrl:'/models/gearbox.glb'
           - "Reciprocating saw" (ONLY if user explicitly requests saw): modelUrl:'/models/reciprocating_saw.glb'

           **RULES (CRITICAL FOR PRODUCTION):**
           - Robots/vehicles MUST use LOCAL .glb models (NOT primitives!)
           - Simple objects CAN use primitives for performance
           - NEVER use external URLs (cdn.jsdelivr.net, raw.githubusercontent.com) - ALWAYS use /models/ path
           - modelUrl field IS supported in schema - use it for robots!
           - shape:'MODEL' tells renderer to load 3D mesh
           - type:'mesh' indicates 3D model asset

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

        5. ENVIRONMENTAL FORCES (context-sensitive defaults)

           GRAVITY:
           - Earth standard (DEFAULT): {x:0, y:-9.81, z:0}
           - Moon/Mars (low gravity): {x:0, y:-1.62, z:0}
           - Space station (zero-g): {x:0, y:0, z:0}
           - Heavy planet: {x:0, y:-15, z:0}

           WIND (context-aware - indoor vs outdoor):
           - Indoor scenes (surgical, warehouse, factory, office): {x:0, y:0, z:0}
           - Outdoor calm (vehicles, construction): {x:0, y:0, z:0}
           - Outdoor light breeze: {x:3, y:0, z:0}
           - Moderate wind (drone training): {x:8, y:0, z:0}
           - Strong wind (stress testing): {x:15, y:0, z:0}
           - Storm conditions (adversarial): {x:25, y:0, z:-5}

           RULES:
           - Detect indoor/outdoor from scene type
           - Use zero wind for controlled environments
           - Use appropriate wind for outdoor scenarios

        6. SCALE & COUNT (CRITICAL - WRONG SCALE = WRONG OBJECTS!)
           - Large static (tables, floors, platforms): scale 2-6, count 1-3, mass 50-200 kg
           - Medium objects (boxes, robots, furniture): scale 0.5-2, count 1-15, mass 2-50 kg
           - Small items (cups, balls, laptops): scale 0.2-0.5, count 1-20, mass 0.1-5 kg
           - SURGICAL INSTRUMENTS (scalpels, forceps, needles): scale 0.1-0.2, count 1-10, mass 0.02-0.1 kg
           - Micro objects (screws, pills, marbles): scale 0.05-0.15, count 10-100, mass 0.01-0.05 kg

           SCALE VALIDATION:
           - Scalpel should be 0.15 (size of a pen), NOT 1.0 (size of a baseball bat)
           - Robot arm should be 0.8 (human arm size), NOT 0.2 (toy size)
           - Operating table should be 2.0 (standard bed), NOT 0.5 (stool size)
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

        8b. SPATIAL CONSTRAINTS (CRITICAL - PREVENTS FLOATING OBJECTS)
           EVERY object MUST have a spatialConstraint defining WHERE it's positioned:

           'on_surface': Object sits ON another object (table, floor, shelf)
           - Use for: instruments on table, laptop on desk, cup on surface, box on floor
           - MUST include parentGroupId (ID of the surface object)
           - Set maintainOrientation: true to keep upright
           - Example: { type: 'on_surface', parentGroupId: 'operating_table', maintainOrientation: true }

           'attached_to': Object is connected/fixed to parent (door hinge, drawer slide)
           - Use for: doors attached to frames, drawers in cabinet, robot arm on base
           - MUST include parentGroupId
           - Example: { type: 'attached_to', parentGroupId: 'robot_base' }

           'none': Object floats freely in space (for zero-gravity or aerial objects)
           - Use ONLY for: drones, balloons, spacecraft, particles in fluid
           - Example: { type: 'none' }

           RULES:
           - Surfaces (floors, tables) use { type: 'none' } (they ARE the reference)
           - Objects ON surfaces use { type: 'on_surface', parentGroupId: 'surface_id' }
           - Order matters: Define parent BEFORE children in assetGroups array
           - NEVER leave spatialConstraint undefined (will cause floating!)

        9. JOINTS (for interactive objects: doors, drawers, buttons)
           DOOR (Revolute): type:'REVOLUTE', axis:{x:0,y:1,z:0}, limits:{min:0,max:1.57}
           DRAWER (Prismatic): type:'PRISMATIC', axis:{x:1,y:0,z:0}, limits:{min:0,max:0.5}
           BUTTON (Prismatic): type:'PRISMATIC', axis:{x:0,y:-1,z:0}, limits:{min:0,max:0.02}
           HANDLE (Fixed): type:'FIXED', rigidly attached

           Rules: Parent object before child, joint ID: "{parent}_to_{child}_joint"

        EXAMPLE 1: "conference room with laptops and notebooks"

        assetGroups: [
          {
            id: "floor_1", name: "Concrete Floor", shape: "PLATE", scale: 6,
            rigidBodyType: "STATIC", mass: 100, color: "#696969",
            spatialConstraint: { type: "none" }  // Floors don't sit on anything
          },
          {
            id: "table_1", name: "Conference Table", shape: "PLATE", scale: 2.5,
            rigidBodyType: "STATIC", mass: 30, color: "#8B4513",
            spatialConstraint: { type: "on_surface", parentGroupId: "floor_1" }
          },
          {
            id: "laptop_1", name: "Laptop", shape: "CUBE", scale: 0.3,
            rigidBodyType: "DYNAMIC", mass: 2, color: "#C0C0C0",
            spatialConstraint: { type: "on_surface", parentGroupId: "table_1", maintainOrientation: true }
          },
          {
            id: "notebook_1", name: "Notebook", shape: "CUBE", scale: 0.2,
            rigidBodyType: "DYNAMIC", mass: 0.3, color: "#FFFFFF",
            spatialConstraint: { type: "on_surface", parentGroupId: "table_1", maintainOrientation: true }
          }
        ]

        EXAMPLE 2: "surgical robot picks up scalpel" (REAL 3D MODEL + ANIMATION)

        assetGroups: [
          {
            id: "operating_table", name: "Operating Table", shape: "PLATE", scale: 2,
            rigidBodyType: "STATIC", mass: 150, color: "#C0C0C0",
            spatialConstraint: { type: "none" }
          },
          {
            id: "robot_arm", name: "Surgical Robot", shape: "MODEL", scale: 1.0,
            rigidBodyType: "KINEMATIC", mass: 20, color: "#4A90E2",
            spatialConstraint: { type: "attached_to", parentGroupId: "operating_table" },
            modelUrl: "/models/robotic_arm_6axis.glb"  // REAL 6-axis industrial robot arm!
          },
          {
            id: "scalpel_1", name: "Surgical Scalpel", shape: "CYLINDER", scale: 0.15,
            rigidBodyType: "DYNAMIC", mass: 0.05, color: "#E0E0E0",
            spatialConstraint: { type: "on_surface", parentGroupId: "operating_table", maintainOrientation: true }
          }
        ],
        behaviors: [
          {
            id: "pickup_scalpel_sequence",
            name: "Surgical Pickup Task",
            description: "Robot approaches scalpel, grasps it, lifts up",
            targetObjectId: "robot_arm",
            loop: false,
            actions: [
              { type: "MOVE_TO", duration: 2.0, position: {x: 0.5, y: 0, z: 0} },
              { type: "GRASP", duration: 0.5, target: "scalpel_1" },
              { type: "MOVE_TO", duration: 2.0, position: {x: 0.5, y: 1.0, z: 0} },
              { type: "WAIT", duration: 1.0 }
            ]
          }
        ]

        10. ACTIONS & BEHAVIORS (CRITICAL FOR SIMULATION PLATFORM)
            Extract ACTION SEQUENCES from the user's prompt:

            ACTION VERBS TO DETECT:
            - "pick up" / "grasp" / "grab" -> type: GRASP
            - "drop" / "release" / "let go" -> type: RELEASE
            - "move to" / "go to" / "navigate to" -> type: MOVE_TO
            - "follow path" / "drive along" / "fly through" -> type: FOLLOW_PATH
            - "rotate" / "turn" / "spin" -> type: ROTATE
            - "wait" / "pause" / "hold" -> type: WAIT

            EXAMPLE PROMPTS WITH ACTIONS:
            "surgical robot picks up scalpel" ->
              behavior: { id: "surgical_pickup", targetObjectId: "surgical_robot", actions: [
                { type: "MOVE_TO", duration: 2.0, position: {x: scalpel.x, y: scalpel.y, z: scalpel.z} },
                { type: "GRASP", duration: 0.5, target: "scalpel" },
                { type: "MOVE_TO", duration: 2.0, position: {x: 0, y: 2, z: 0} }
              ]}

            "drone flies forward and lands" ->
              behavior: { id: "drone_flight", targetObjectId: "drone", actions: [
                { type: "MOVE_TO", duration: 3.0, position: {x: 5, y: 3, z: 0} },
                { type: "WAIT", duration: 1.0 },
                { type: "MOVE_TO", duration: 2.0, position: {x: 5, y: 0.5, z: 0} }
              ]}

            "robot arm moves left" ->
              behavior: { id: "move_left", targetObjectId: "robot_arm", actions: [
                { type: "MOVE_TO", duration: 1.5, position: {x: -2, y: current.y, z: current.z} }
              ]}

            "robot arm and blocks" (NO explicit verbs) ->
              behavior: { id: "pick_and_place_demo", targetObjectId: "robot_arm", actions: [
                { type: "MOVE_TO", duration: 2.0, position: {x: block1.x, y: block1.y + 0.5, z: block1.z} },
                { type: "GRASP", duration: 0.5, target: "block_1" },
                { type: "MOVE_TO", duration: 2.0, position: {x: 2, y: 1.5, z: 0} },
                { type: "RELEASE", duration: 0.5 },
                { type: "MOVE_TO", duration: 1.5, position: {x: 0, y: 1.0, z: 0} }
              ]}

            "basic robot arm demo" (NO explicit verbs) ->
              behavior: { id: "demo_movement", targetObjectId: "robot_arm", actions: [
                { type: "MOVE_TO", duration: 2.0, position: {x: 1, y: 1.2, z: 0.5} },
                { type: "WAIT", duration: 0.5 },
                { type: "MOVE_TO", duration: 2.0, position: {x: -1, y: 1.2, z: -0.5} },
                { type: "WAIT", duration: 0.5 },
                { type: "MOVE_TO", duration: 2.0, position: {x: 0, y: 1.5, z: 0} }
              ]}

            RULES FOR BEHAVIOR GENERATION (MANDATORY FOR PRODUCTION!):
            - IF scene has ANY robot/vehicle → behaviors array is MANDATORY! NEVER SKIP THIS!
            - IF prompt has action verbs (pick, move, grasp) → Generate behaviors matching those verbs
            - IF scene has robots but NO action verbs → Generate default pick-and-place OR demo movement behaviors
            - WITHOUT behaviors, robots will just fall or sit static - THIS IS UNACCEPTABLE!
            - targetObjectId MUST EXACTLY match the "id" field of a KINEMATIC object in assetGroups
            - CRITICAL ID CONSISTENCY: If you create a behavior with targetObjectId:"robot_arm", the assetGroups MUST have an object with id:"robot_arm"
            - Use simple, consistent IDs: "robot_arm" (NOT "robot_manipulator"), "surgical_robot" (NOT "davinci_system"), "drone" (NOT "quadcopter_drone")
            - KINEMATIC objects are the actors that perform behaviors
            - Action durations: GRASP/RELEASE=0.5s, MOVE_TO=1-3s, FOLLOW_PATH=2-5s, WAIT=0.5-2s
            - For MOVE_TO, calculate realistic positions based on scene layout
            - For FOLLOW_PATH, generate 3-5 waypoint positions
            - Set loop:false for one-time tasks, loop:true for repetitive cycles
            - Multiple behaviors can run simultaneously (e.g., two robots working together)

            CRITICAL VALIDATION:
            - Robot scenes with NO behaviors will be REJECTED!
            - This is a SIMULATION platform, not a static scene viewer
            - Every robot must DO something (even if just demonstration movement)

            PRIORITY ORDER:
            1. DETECT robots/vehicles in scene requirements
            2. GENERATE behaviors array for those robots
            3. THEN generate assetGroups with KINEMATIC robots
            4. Ensure every KINEMATIC object has at least one behavior

        CRITICAL RULES:
        - ALWAYS generate complete scene: BASE ENVIRONMENT + USER OBJECTS
        - BASE ENVIRONMENT includes floor, walls (optional), furniture appropriate to scene type
        - USER OBJECTS are placed WITH spatial context (on table, on floor, on shelf - NOT floating in void)
        - Use "on_surface" spatial constraints to place objects on surfaces (y position = surface top)
        - Foundation objects (floors, tables) must have y:0 or appropriate elevation
        - Use realistic physics values from material science
        - Only create joints array when interactive objects present
        - Extract behaviors if prompt contains action verbs, otherwise return empty array

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
                    rigidBodyType: { type: Type.STRING, enum: Object.values(RigidBodyType), description: "STATIC for immovable objects (floors, walls, tables), KINEMATIC for animated objects (robots), DYNAMIC for physics-driven objects" },
                    mass: { type: Type.NUMBER, description: "Mass in kg. MUST be > 0. Examples: floor=100, table=50, robot=20, block=5, ball=1, scalpel=0.05" },
                    restitution: { type: Type.NUMBER },
                    friction: { type: Type.NUMBER },
                    drag: { type: Type.NUMBER },
                    spatialConstraint: {
                      type: Type.OBJECT,
                      description: "CRITICAL: Defines WHERE object is positioned. Objects on tables/floors MUST have 'on_surface' constraint",
                      properties: {
                        type: { type: Type.STRING, enum: ['on_surface', 'attached_to', 'inside', 'none'], description: "Use 'on_surface' for objects ON tables/floors, 'attached_to' for connected parts, 'none' for floating" },
                        parentGroupId: { type: Type.STRING, description: "ID of surface/parent object (required for on_surface and attached_to)" },
                        maintainOrientation: { type: Type.BOOLEAN, description: "Keep object upright (true for cups, bottles, instruments)" }
                      },
                      required: ["type"]
                    },
                    modelUrl: {
                      type: Type.STRING,
                      description: "REQUIRED for robots/vehicles: Path to LOCAL 3D model. Use /models/surgical_robot_davinci.glb, /models/robotic_arm_6axis.glb, /models/autonomous_vehicle.glb, or /models/drone_quadcopter.glb. NEVER use external URLs!"
                    },
                    },
                    required: ["id", "name", "count", "shape", "color", "spawnMode", "scale", "rigidBodyType", "mass", "restitution", "friction", "drag", "spatialConstraint"]
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
                behaviors: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    targetObjectId: { type: Type.STRING, description: "MUST EXACTLY match the 'id' field of a KINEMATIC robot/vehicle object in assetGroups array. Example: if assetGroups has {id:'robot_arm', ...}, use targetObjectId:'robot_arm'" },
                    loop: { type: Type.BOOLEAN },
                    actions: {
                        type: Type.ARRAY,
                        items: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING, enum: ['MOVE_TO', 'GRASP', 'RELEASE', 'FOLLOW_PATH', 'ROTATE', 'WAIT'] },
                            duration: { type: Type.NUMBER },
                            target: { type: Type.STRING },
                            position: {
                            type: Type.OBJECT,
                            properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, z: { type: Type.NUMBER } },
                            },
                            rotation: {
                            type: Type.OBJECT,
                            properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, z: { type: Type.NUMBER } },
                            },
                            path: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, z: { type: Type.NUMBER } },
                            }
                            },
                        },
                        required: ["type", "duration"]
                        }
                    }
                    },
                    required: ["id", "name", "description", "targetObjectId", "loop", "actions"]
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
          console.log(`[GeminiService] 🔍 Attempting to find model for: name="${group.name}", id="${group.id}", shape="${group.shape}"`);
          const modelInfo = findModelForObject(group.name, group.id);

          if (modelInfo) {
            // Found a 3D model! Use it instead of geometric primitive
            console.log(`[GeminiService] ✅ [OK] Using 3D model for "${group.name}": ${modelInfo.modelUrl} (scale: ${modelInfo.scale})`);

            // Add domain randomization to material properties (±20%)
            const materialVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2

            return {
              ...group,
              shape: ShapeType.MODEL, // Switch from geometric primitive to MODEL
              modelUrl: modelInfo.modelUrl,
              scale: modelInfo.scale * (group.scale || 1.0), // Combine AI scale with model-specific scale
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

        // POST-PROCESSING #2: Set defaults for rigidBodyType, spawnMode, and mass
        aiResponse.assetGroups = aiResponse.assetGroups.map((group: AssetGroup) => {
          const updates: Partial<AssetGroup> = {};

          // Default rigidBodyType
          if (!group.rigidBodyType) {
            updates.rigidBodyType = RigidBodyType.DYNAMIC;
          }

          // Default spawnMode (CRITICAL: prevents undefined spawnMode)
          if (!group.spawnMode) {
            // Single objects with specific positions should use GRID
            if (group.count === 1) {
              updates.spawnMode = SpawnMode.GRID;
            } else {
              // Multiple objects default to PILE (realistic grouping)
              updates.spawnMode = SpawnMode.PILE;
            }
          }

          // Fix mass=0 for STATIC objects (physics engine allows it, but use reasonable default)
          // DYNAMIC/KINEMATIC with mass=0 will be caught by physics validation
          if (group.mass === 0 && (group.rigidBodyType === RigidBodyType.STATIC || updates.rigidBodyType === RigidBodyType.STATIC)) {
            // Assign reasonable mass based on scale
            const estimatedMass = Math.max(10, group.scale * group.scale * 10);
            updates.mass = estimatedMass;
            console.log(`[GeminiService] AUTO-FIX: STATIC object "${group.id}" had mass=0, setting to ${estimatedMass.toFixed(1)} kg based on scale`);
          }

          return Object.keys(updates).length > 0 ? { ...group, ...updates } : group;
        });

        // POST-PROCESSING #3: Apply spatial positioning (P0 CRITICAL FIX)
        console.log('[GeminiService] Applying spatial positioning to prevent random falling...');
        const { calculateSpatialPositions } = await import('./spatialPositioning');
        aiResponse.assetGroups = calculateSpatialPositions(aiResponse.assetGroups);

        // POST-PROCESSING #4: Validate and auto-fix behavior targetObjectId (P0 ANIMATION FIX)
        if (aiResponse.behaviors && aiResponse.behaviors.length > 0) {
          const assetGroupIds = new Set(aiResponse.assetGroups.map(g => g.id));
          const kinematicObjects = aiResponse.assetGroups.filter(g => g.rigidBodyType === RigidBodyType.KINEMATIC);
          const kinematicIds = new Set(kinematicObjects.map(g => g.id));

          aiResponse.behaviors = aiResponse.behaviors.map(behavior => {
            if (!assetGroupIds.has(behavior.targetObjectId)) {
              console.error(
                `[GeminiService] CRITICAL: Behavior "${behavior.id}" references targetObjectId "${behavior.targetObjectId}" ` +
                `which does not exist in assetGroups. Available IDs: ${Array.from(assetGroupIds).join(', ')}`
              );

              // AUTO-FIX: Try to find a kinematic robot to target
              if (kinematicObjects.length > 0) {
                const autoFixTarget = kinematicObjects[0].id;
                console.warn(`[GeminiService] AUTO-FIX: Reassigning behavior "${behavior.id}" to target "${autoFixTarget}"`);
                return { ...behavior, targetObjectId: autoFixTarget };
              } else {
                console.error(`[GeminiService] FATAL: No KINEMATIC objects found to target. Behavior will not execute.`);
              }
            } else if (!kinematicIds.has(behavior.targetObjectId)) {
              console.warn(
                `[GeminiService] WARNING: Behavior "${behavior.id}" targets "${behavior.targetObjectId}" ` +
                `which is not KINEMATIC (animations only work on kinematic bodies). ` +
                `Object has rigidBodyType: ${aiResponse.assetGroups.find(g => g.id === behavior.targetObjectId)?.rigidBodyType}`
              );

              // AUTO-FIX: Find first kinematic object
              if (kinematicObjects.length > 0) {
                const autoFixTarget = kinematicObjects[0].id;
                console.warn(`[GeminiService] AUTO-FIX: Reassigning behavior "${behavior.id}" to kinematic object "${autoFixTarget}"`);
                return { ...behavior, targetObjectId: autoFixTarget };
              }
            } else {
              console.log(`[GeminiService] ✅ Behavior "${behavior.id}" correctly targets "${behavior.targetObjectId}"`);
            }

            return behavior;
          });
        }

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
            const modelName = getModelForTask('creative');
            const response = await ai.models.generateContent({
                model: modelName,
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
        const model = ai.getGenerativeModel({ model: "gemini-3-pro-image-preview" });
        const response = await model.generateContent({
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

        // Use best vision model for adversarial scene analysis
        const modelName = getModelForTask('vision');
        const response = await ai.models.generateContent({
        model: modelName,
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
        // Check if API key is available
        if (!hasApiKey()) {
            console.error("[Report] No API key configured");
            return "<h1>API Key Required</h1><p>Please configure your Gemini API key in Settings to generate reports.</p>";
        }

        const dataContext = JSON.stringify({
            params,
            telemetry: {
                ...telemetry,
                systemEnergy: telemetry.systemEnergy.toFixed(2),
                avgVelocity: telemetry.avgVelocity.toFixed(2),
                stabilityScore: telemetry.stabilityScore.toFixed(3)
            }
        });

        console.log("[Report] Generating simulation report...");

        return await withRetry(async () => {
            const ai = getAI();
            const modelName = getModelForTask('reasoning');
            console.log("[Report] Using model:", modelName);

            const response = await ai.models.generateContent({
                model: modelName,
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

            console.log("[Report] Response received:", !!response);
            console.log("[Report] Response text exists:", !!response.text);

            if (!response.text) {
                const candidate = response.candidates?.[0];
                const finishReason = candidate?.finishReason;
                console.error("[Report] No text in response. Finish reason:", finishReason);

                if (finishReason && finishReason !== 'STOP') {
                    throw new Error(`Report generation blocked by AI safety filters. Reason: ${finishReason}`);
                }
                throw new Error("Empty response from AI service");
            }

            const html = response.text;
            console.log("[Report] Generated HTML length:", html.length);

            // Clean markdown if present
            return html.replace(/```html/g, '').replace(/```/g, '');
        });

    } catch (error) {
        console.error("[Report] Generation error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        // FALLBACK: Generate basic report client-side if API fails
        console.log("[Report] Falling back to client-side report generation");
        return generateFallbackReport(params, telemetry, errorMessage);
    }
};

/**
 * Generate a basic HTML report client-side when AI generation fails
 */
function generateFallbackReport(params: PhysicsParams, telemetry: TelemetryData, errorMessage: string): string {
    const timestamp = new Date().toISOString();
    const assetGroupRows = params.assetGroups.map(group =>
        `<tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${group.name}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${group.count}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${group.shape}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${group.rigidBodyType}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${group.mass.toFixed(2)} kg</td>
        </tr>`
    ).join('');

    const stabilityStatus = telemetry.stabilityScore < 0.1 ? 'STABLE' :
                           telemetry.stabilityScore > 2.0 ? 'CHAOTIC' : 'DYNAMIC';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SnapLock Simulation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
        h2 { color: #1e40af; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background-color: #2563eb; color: white; padding: 10px; text-align: left; }
        td { padding: 8px; border: 1px solid #ddd; }
        .metric { background-color: #f3f4f6; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .warning { background-color: #fef3c7; padding: 10px; border-left: 4px solid #f59e0b; margin: 20px 0; }
        .status-${stabilityStatus.toLowerCase()} {
            font-weight: bold;
            color: ${stabilityStatus === 'STABLE' ? '#059669' : stabilityStatus === 'CHAOTIC' ? '#dc2626' : '#f59e0b'};
        }
    </style>
</head>
<body>
    <h1>SNAPLOCK // SIMULATION AUDIT REPORT</h1>
    <p><strong>Generated:</strong> ${timestamp}</p>
    <p><strong>Mode:</strong> Fallback Report (AI generation unavailable)</p>

    <div class="warning">
        <strong>Note:</strong> AI-powered analysis unavailable. Reason: ${errorMessage}<br>
        This report contains basic telemetry and configuration data only.
    </div>

    <h2>Executive Summary</h2>
    <p>Simulation contains ${params.assetGroups.length} asset group(s) with ${telemetry.particleCount} total objects.</p>
    <p>System Status: <span class="status-${stabilityStatus.toLowerCase()}">${stabilityStatus}</span></p>

    <h2>Configuration Matrix</h2>
    <div class="metric">
        <strong>Gravity:</strong> [${params.gravity.x.toFixed(2)}, ${params.gravity.y.toFixed(2)}, ${params.gravity.z.toFixed(2)}] m/s²<br>
        <strong>Wind:</strong> [${params.wind.x.toFixed(2)}, ${params.wind.y.toFixed(2)}, ${params.wind.z.toFixed(2)}] N<br>
        <strong>Movement Behavior:</strong> ${params.movementBehavior}
    </div>

    <h3>Asset Groups</h3>
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Count</th>
                <th>Shape</th>
                <th>Body Type</th>
                <th>Mass</th>
            </tr>
        </thead>
        <tbody>
            ${assetGroupRows}
        </tbody>
    </table>

    <h2>Telemetry Analysis</h2>
    <div class="metric">
        <strong>FPS:</strong> ${telemetry.fps.toFixed(1)}<br>
        <strong>System Energy:</strong> ${telemetry.systemEnergy.toFixed(2)} J<br>
        <strong>Average Velocity:</strong> ${telemetry.avgVelocity.toFixed(2)} m/s<br>
        <strong>Max Velocity:</strong> ${telemetry.maxVelocity.toFixed(2)} m/s<br>
        <strong>Stability Score:</strong> ${telemetry.stabilityScore.toFixed(3)} (Lower is more stable)<br>
        <strong>Active Collisions:</strong> ${telemetry.activeCollisions}<br>
        <strong>Physics Steps:</strong> ${telemetry.physicsSteps}
    </div>

    <h3>Stability Interpretation</h3>
    <p>
        ${telemetry.stabilityScore < 0.1
            ? 'System is <strong>STABLE</strong>. Objects have settled into equilibrium.'
            : telemetry.stabilityScore > 2.0
            ? 'System is <strong>CHAOTIC</strong>. High velocity variation indicates ongoing dynamic interactions or instability.'
            : 'System is <strong>DYNAMIC</strong>. Moderate activity with controlled interactions.'}
    </p>

    <h2>Real-World Validation Recommendations</h2>
    <ul>
        <li>Verify friction coefficients match real-world materials</li>
        <li>Calibrate sensor accuracy for velocity measurements</li>
        <li>Test edge cases with high-energy collisions</li>
        <li>Validate restitution values against drop tests</li>
    </ul>

    <hr style="margin-top: 40px; border: none; border-top: 1px solid #ccc;">
    <p style="text-align: center; color: #6b7280; font-size: 14px;">
        Generated by SnapLock Simulation Platform | <a href="https://snaplock.netlify.app">snaplock.netlify.app</a>
    </p>
</body>
</html>`;
}
