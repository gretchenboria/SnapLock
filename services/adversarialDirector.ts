
import { PhysicsParams, DisturbanceType, AdversarialAction, MovementBehavior, ShapeType, SpawnMode } from '../types';
import { CHAOS_INVENTORY } from './chaosInventory';

/**
 * ADVERSARIAL DIRECTOR SERVICE
 * 
 * Adapts the Supervisor logic to run natively in the browser.
 * Now integrated with Poly Haven asset inventory for dynamic fetching.
 */
export class AdversarialDirector {
    
    static applyDisturbance(currentParams: PhysicsParams, instruction: AdversarialAction): PhysicsParams {
        if (instruction.action === DisturbanceType.NONE) {
            return currentParams;
        }

        const newParams: PhysicsParams = JSON.parse(JSON.stringify(currentParams));
        const intensity = Math.max(0.1, Math.min(instruction.intensity, 1.0));

        console.log(`[Adversarial Director] Executing: ${instruction.action} @ ${(intensity * 100).toFixed(0)}%`);

        switch (instruction.action) {
            case DisturbanceType.GRAVITY_SHIFT:
                newParams.movementBehavior = MovementBehavior.PHYSICS_GRAVITY;
                const maxG = 20 * intensity;
                newParams.gravity = {
                    x: (Math.random() - 0.5) * maxG,
                    y: (Math.random() - 0.5) * maxG,
                    z: (Math.random() - 0.5) * maxG
                };
                break;

            case DisturbanceType.WIND_GUST:
                const angle = Math.random() * Math.PI * 2;
                const windForce = 50 * intensity;
                newParams.wind = {
                    x: Math.cos(angle) * windForce,
                    y: (Math.random() - 0.5) * 10 * intensity,
                    z: Math.sin(angle) * windForce
                };
                break;

            case DisturbanceType.FRICTION_FLUX:
                const targetFriction = Math.random() > 0.5 ? 0.01 : 0.99; 
                newParams.assetGroups.forEach((g) => {
                    g.friction = targetFriction;
                    g.restitution = Math.min(0.9, g.restitution + (Math.random() * 0.2)); 
                });
                break;

            case DisturbanceType.ENTROPY_BURST:
                newParams.movementBehavior = MovementBehavior.RADIAL_EXPLOSION;
                newParams.gravity = { x: 0, y: -1.0, z: 0 }; 
                break;

            case DisturbanceType.SPAWN_OBSTACLE:
                // Inject 3D Model from Inventory
                const model = CHAOS_INVENTORY.OBJECTS[Math.floor(Math.random() * CHAOS_INVENTORY.OBJECTS.length)];
                
                newParams.assetGroups.push({
                    id: `adversary_${Date.now()}`,
                    name: `DISTRACTOR: ${model.id}`,
                    count: Math.floor(5 * intensity) + 1, // Keep count low for high-poly models
                    shape: ShapeType.MODEL,
                    modelUrl: model.url,
                    color: '#ff0033',
                    spawnMode: SpawnMode.FLOAT,
                    scale: 2.0, // Models might need scaling up/down
                    mass: 20 * intensity,
                    restitution: 0.5,
                    friction: 0.5,
                    drag: 0.05
                });
                break;
            
            case DisturbanceType.HARSH_LIGHTING:
                // Inject HDRI from Inventory
                const hdri = CHAOS_INVENTORY.LIGHTING[Math.floor(Math.random() * CHAOS_INVENTORY.LIGHTING.length)];
                newParams.environmentUrl = hdri.url;
                break;

            case DisturbanceType.SENSOR_NOISE:
                newParams.wind = {
                    x: (Math.random() - 0.5) * 100 * intensity,
                    y: (Math.random() - 0.5) * 100 * intensity,
                    z: (Math.random() - 0.5) * 100 * intensity
                };
                break;

            case DisturbanceType.CALIBRATION_DRIFT:
                newParams.gravity.x += 2.0 * intensity;
                newParams.gravity.z += 2.0 * intensity;
                break;

            case DisturbanceType.SOLVER_FLUSH:
                newParams.movementBehavior = MovementBehavior.PHYSICS_GRAVITY;
                newParams.gravity = { x: 0, y: -20, z: 0 };
                newParams.assetGroups.forEach(g => g.friction = 0.0);
                break;
        }

        return newParams;
    }
}
