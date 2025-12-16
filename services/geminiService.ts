import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse, SpawnMode, ShapeType, MovementBehavior, AdversarialAction, DisturbanceType, PhysicsParams, TelemetryData, AssetGroup, Vector3Data } from "../types";
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

  // API key available - use BEST models
  switch (task) {
    case 'reasoning':
      return 'gemini-3-pro-preview'; // Best for physics reasoning
    case 'vision':
      return 'gemini-3-pro-preview'; // Best for chaos mode
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
 * Generate fallback scene when API quota exceeded
 * Creates a reasonable default scene based on prompt keyword parsing
 */
function generateFallbackScene(prompt: string): AnalysisResponse {
  const lowerPrompt = prompt.toLowerCase();
  const assetGroups: AssetGroup[] = [];

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
      assetGroups.push({
        id: `${keyword}_group`,
        name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
        count: config.count,
        shape: config.shape,
        color: config.color,
        spawnMode: isZeroG ? SpawnMode.FLOAT : (keyword === 'table' || keyword === 'floor' || keyword === 'platform') ? SpawnMode.GRID : SpawnMode.PILE,
        scale: config.scale,
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
        mass: 2.0,
        restitution: 0.6,
        friction: 0.5,
        drag: 0.05
      }
    );
  }

  return {
    movementBehavior,
    gravity,
    wind,
    assetGroups,
    explanation: `Fallback scene generated from keyword parsing (API quota exceeded). Detected: ${assetGroups.map(g => g.name).join(', ')}`
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

export const analyzePhysicsPrompt = async (userPrompt: string): Promise<AnalysisResponse> => {
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
        contents: `You are a Physics-Aware Scene Generation Engine for Synthetic Training Data, AR/VR Simulation, Digital Twin Creation, and Robotics Training.

        USER PROMPT: "${userPrompt}"

        MISSION: Parse natural language to generate PHYSICALLY ACCURATE simulation scenes for ML training data synthesis. Extract objects, infer realistic physics properties, and create scientifically valid environments.

        PHYSICS-FIRST REQUIREMENTS:

        1. OBJECT EXTRACTION & SHAPE MAPPING
           Parse every physical entity and map to realistic 3D primitives:
           - FLAT SURFACES (tables, floors, platforms, walls, ramps) -> PLATE
           - CONTAINERS (cups, cans, bottles, tubes, pipes) -> CYLINDER
           - RIGID BOXES (crates, packages, cabinets, blocks) -> CUBE
           - ROLLING OBJECTS (balls, marbles, spheres, planets) -> SPHERE
           - POINTED OBJECTS (traffic cones, pyramids) -> CONE or PYRAMID
           - ARTICULATED BODIES (robots, humanoids, vehicles) -> CAPSULE
           - ORGANIC/COMPLEX (rocks, debris, irregular objects) -> ICOSAHEDRON
           - CIRCULAR STRUCTURES (rings, tires, donuts, hoops) -> TORUS

        2. MATERIAL PHYSICS (Critical for Real Simulation)
           Infer realistic material properties from descriptions:

           WOOD (oak, pine, lumber, wooden):
           - friction: 0.6, restitution: 0.3, mass: 5 kg/m³, drag: 0.05
           - color: #8B4513 (saddle brown)
           - density: 600-900 kg/m³, rigid body

           METAL (steel, iron, aluminum, brass, copper):
           - friction: 0.4, restitution: 0.5, mass: 15 kg/m³, drag: 0.02
           - color: #C0C0C0 (silver/gray)
           - density: 2700-7800 kg/m³, very rigid, high inertia

           RUBBER (elastic, bouncy, tire, foam):
           - friction: 0.9, restitution: 0.85, mass: 3 kg/m³, drag: 0.1
           - color: #2F4F4F (dark slate)
           - density: 900-1200 kg/m³, deformable, high energy return

           GLASS (crystal, transparent, brittle):
           - friction: 0.1, restitution: 0.7, mass: 8 kg/m³, drag: 0.01
           - color: #00CED1 (cyan/transparent)
           - density: 2500 kg/m³, rigid, slippery surface

           PLASTIC (polymer, synthetic):
           - friction: 0.5, restitution: 0.6, mass: 2 kg/m³, drag: 0.06
           - color: vibrant (red, blue, yellow)
           - density: 900-1400 kg/m³, semi-rigid

           STONE/CONCRETE (rock, granite, cement):
           - friction: 0.8, restitution: 0.2, mass: 20 kg/m³, drag: 0.03
           - color: #696969 (dim gray)
           - density: 2300-2700 kg/m³, very rigid, low bounce

           CARDBOARD/PAPER:
           - friction: 0.7, restitution: 0.25, mass: 1 kg/m³, drag: 0.15
           - color: #D2691E (tan/brown)
           - density: 200-700 kg/m³, lightweight, compressible

           FABRIC/CLOTH:
           - friction: 0.8, restitution: 0.1, mass: 0.5 kg/m³, drag: 0.25
           - color: varied
           - density: 100-500 kg/m³, very flexible, high drag

        3. REALISTIC DRAG COEFFICIENTS (Critical for Accurate Motion)
           Air resistance based on object properties:
           - Streamlined (capsule, sphere) -> drag: 0.02-0.05
           - Compact rigid (cube, cylinder) -> drag: 0.05-0.1
           - Irregular/porous (debris, cloth) -> drag: 0.1-0.25
           - Lightweight flat (paper, leaves) -> drag: 0.3-0.5
           - Scale drag with surface area to volume ratio

        4. SPATIAL LAYOUT & SPAWN LOGIC
           Understand 3D spatial relationships and interaction patterns:
           - "on X" / "above X" -> Foundation object spawns first (GRID/fixed position), dependent object spawns in contact zone
           - "floating" / "suspended" / "hovering" -> FLOAT spawn, reduce gravity or orbital motion
           - "falling" / "dropping" / "thrown" -> JET or BLAST spawn with initial velocity
           - "scattered" / "pile of" / "messy" -> PILE spawn, random positions
           - "organized" / "arranged" / "grid" -> GRID spawn, structured layout
           - "explosion" / "burst" / "shatter" -> BLAST spawn, radial velocity
           - "rolling" / "sliding" -> Low friction surface + sphere/cylinder + initial angular velocity

        5. GRAVITY & ENVIRONMENT (Mission-Critical for Robotics Training)
           Parse environmental physics from context:

           GRAVITY MODES:
           - "Earth" / standard / default -> {x:0, y:-9.81, z:0} m/s², PHYSICS_GRAVITY
           - "Moon" / "lunar" / "low gravity" -> {x:0, y:-1.62, z:0} m/s², PHYSICS_GRAVITY
           - "Mars" -> {x:0, y:-3.71, z:0} m/s²
           - "Zero-G" / "space" / "ISS" / "orbital" -> {x:0, y:0, z:0} m/s², ORBITAL behavior
           - "High gravity" / "Jupiter" / "heavy" -> {x:0, y:-15 to -25, z:0} m/s²
           - "Underwater" -> {x:0, y:-2, z:0} m/s² (buoyancy approximation)

           WIND/AIRFLOW:
           - "Calm" / indoor / default -> {x:0, y:0, z:0} m/s
           - "Breeze" / "gentle wind" -> {x:3-5, y:0, z:0} m/s
           - "Windy" / "moderate wind" -> {x:8-12, y:0, z:0} m/s
           - "Storm" / "gust" / "hurricane" -> {x:20-30, y:0, z:-5} m/s (includes vertical)
           - "Updraft" / "thermal" -> {x:0, y:10-20, z:0} m/s (vertical wind)

        6. SCALE, COUNT & DENSITY (Data Synthesis Realism)
           Base on real-world proportions:
           - LARGE STATIC (tables, floors, walls): scale 2-5, count 1-3, mass 20-100 kg
           - MEDIUM OBJECTS (boxes, robots, furniture): scale 0.5-2, count 1-15, mass 2-50 kg
           - SMALL ITEMS (cups, tools, balls): scale 0.2-0.8, count 1-20, mass 0.1-5 kg
           - PARTICLES (marbles, debris, grains): scale 0.05-0.2, count 20-200, mass 0.01-0.5 kg
           - Mass should scale with volume (scale³) and material density

        7. COLOR FOR COMPUTER VISION TRAINING
           Assign colors based on:
           - Material realism (wood=brown, metal=gray, glass=cyan/clear)
           - High contrast for CV detection (bright vs dark, complementary colors)
           - Semantic meaning (robots=cyan, hazards=red/yellow, environment=earth tones)
           - Avoid pure black (#000) or pure white (#FFF) - use slight variations

        8. VR TRAINING DATA REQUIREMENTS (Critical for XR/VR Scenarios)
           For VR training scenarios, add affordance and interaction properties:

           OBJECT AFFORDANCES (Add when prompt mentions VR, grasping, manipulation, interaction):
           - graspable: true for small/medium objects that can be picked up (cups, tools, boxes)
           - manipulable: true if object can be moved after grasping (not fixed furniture)
           - interactive: true for objects with mechanisms (doors, drawers, buttons)
           - interactionType: 'door'/'drawer'/'button'/'lever' for interactive objects, 'static' for fixed

           SPATIAL CONSTRAINTS (Add for structured scenes):
           - type: 'on_surface' for objects on tables/floors, 'attached_to' for connected parts, 'none' for floating
           - parentGroupId: ID of surface/parent object (e.g., cup ON table -> parent is table's ID)
           - maintainOrientation: true to keep objects upright on surfaces

           SEMANTIC LABELING (Add for VR):
           - semanticLabel: Specific category name (e.g., "coffee_mug", "office_desk", "sliding_door")
           - vrRole: 'target' for main interaction objects, 'tool' for instruments, 'furniture' for surfaces, 'environment' for walls/floors

           VR SCENE STRUCTURE:
           - Always create foundation objects FIRST (floors, tables, walls) with vrRole='furniture'/'environment'
           - Then place interactive objects ON surfaces using spatialConstraint
           - Mark graspable objects with affordances
           - Use semantic labels for all objects in VR scenarios

        9. SYNTHETIC DATA GENERATION CONTEXT
           Consider how scene will be used for training:
           - Object variety: Include multiple object types for dataset diversity
           - Pose variation: Use different spawn modes for varied orientations
           - Occlusion scenarios: Dense pile spawns for partial occlusion training
           - Scale variation: Range of sizes for scale-invariant detection
           - Physics diversity: Different material combinations for interaction learning

        EXAMPLE SCENARIOS:

        A) "Robot arm picking up cardboard boxes from a wooden pallet"
           -> wooden_pallet (PLATE, brown, scale:3, mass:15, friction:0.6, count:1, GRID)
           -> cardboard_boxes (CUBE, tan, scale:0.8, mass:2, friction:0.7, restitution:0.25, count:12, PILE on pallet)
           -> robot_arm (CAPSULE, cyan, scale:2, mass:50, friction:0.5, count:1, GRID)
           -> Earth gravity, no wind

        B) "Ball rolling down a metal ramp in low gravity with wind"
           -> rubber_ball (SPHERE, red, scale:0.5, mass:1.5, restitution:0.85, friction:0.9, count:1, FLOAT)
           -> metal_ramp (PLATE, silver, scale:4, mass:80, friction:0.4, angle:30°, count:1, GRID)
           -> Moon gravity {x:0, y:-1.62, z:0}, wind {x:5, y:0, z:0}

        C) "Glass bottles falling into a pile of plastic cubes"
           -> glass_bottles (CYLINDER, cyan, scale:0.4, mass:2, restitution:0.7, friction:0.1, count:8, JET/falling)
           -> plastic_cubes (CUBE, multi-color, scale:0.3, mass:0.5, restitution:0.6, friction:0.5, count:50, PILE)
           -> Earth gravity, indoor (no wind)

        D) "Drone navigating through warehouse with metal shelves and boxes"
           -> drone (CAPSULE, black, scale:0.6, mass:2, friction:0.5, count:1, FLOAT, drag:0.08)
           -> metal_shelves (CUBE, gray, scale:4, mass:200, friction:0.4, count:3, GRID/structured)
           -> storage_boxes (CUBE, brown, scale:0.8, mass:5, friction:0.7, count:30, PILE on shelves)
           -> Earth gravity, gentle breeze {x:2, y:0, z:0}

        E) "VR training: Pick up coffee mug from office desk" (VR-SPECIFIC EXAMPLE)
           -> office_desk (PLATE, wood brown, scale:4, mass:50, friction:0.6, count:1, GRID,
               vrRole:'furniture', semanticLabel:'office_desk',
               affordances:{graspable:false, manipulable:false, interactive:false, interactionType:'static'})
           -> coffee_mug (CYLINDER, white, scale:0.3, mass:0.5, friction:0.5, restitution:0.3, count:1, FLOAT,
               vrRole:'target', semanticLabel:'coffee_mug',
               affordances:{graspable:true, manipulable:true, interactive:false, graspPoints:[{x:0.1, y:0, z:0}]},
               spatialConstraint:{type:'on_surface', parentGroupId:'office_desk', offset:{x:0, y:0.15, z:0}, maintainOrientation:true})
           -> Earth gravity, no wind

        F) "VR training: Open drawer and retrieve tool" (VR-SPECIFIC WITH INTERACTIVE)
           -> workbench (PLATE, wood, scale:4, mass:100, friction:0.7, count:1, GRID,
               vrRole:'furniture', semanticLabel:'workbench',
               affordances:{graspable:false, manipulable:false, interactive:false, interactionType:'static'})
           -> drawer (CUBE, wood, scale:0.8, mass:5, friction:0.6, count:1, GRID,
               vrRole:'tool', semanticLabel:'storage_drawer',
               affordances:{graspable:true, manipulable:true, interactive:true, interactionType:'drawer'},
               spatialConstraint:{type:'attached_to', parentGroupId:'workbench', offset:{x:0, y:-0.5, z:0}})
           -> screwdriver (CYLINDER, metal, scale:0.4, mass:0.3, count:1, PILE,
               vrRole:'tool', semanticLabel:'screwdriver',
               affordances:{graspable:true, manipulable:true, interactive:false},
               spatialConstraint:{type:'inside', parentGroupId:'drawer'})
           -> Earth gravity, no wind

        CRITICAL RULES:
        - Extract EVERY object mentioned - no random additions, no omissions
        - Use REALISTIC physics values based on actual material science
        - Scale mass with object size (mass ∝ scale³ for same material)
        - Drag increases for irregular shapes and decreases for streamlined objects
        - Foundation objects (floors, tables) must spawn before dependent objects
        - Provide detailed "explanation" of physics reasoning

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
      console.error("[GeminiService] Analysis Error:", error);

      // Use fallback for quota errors
      if (error.message && (error.message.includes('quota') || error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
        console.warn('[GeminiService] API quota exceeded, using fallback scene generation');
        return generateFallbackScene(userPrompt);
      }

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
};

export const generateSimulationVideo = async (base64Image: string, prompt: string): Promise<string> => {
  if (isTestMode()) {
      // Mock video blob url
      return "mock_video_url.mp4";
  }

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
