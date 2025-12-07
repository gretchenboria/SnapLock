import { PhysicsParams, DisturbanceType, AdversarialAction, MovementBehavior, ShapeType, SpawnMode } from '../types';

/**
 * ADVERSARIAL DIRECTOR SERVICE
 * 
 * Adapts the Supervisor logic originally designed for Python/Backend 
 * to run natively in the browser's TypeScript runtime.
 */
export class AdversarialDirector {
    
    /**
     * Translates an abstract AdversarialAction into a concrete PhysicsParams update.
     */
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
                const shapes = [ShapeType.ICOSAHEDRON, ShapeType.CUBE, ShapeType.CAPSULE];
                const selectedShape = shapes[Math.floor(Math.random() * shapes.length)];
                
                newParams.assetGroups.push({
                    id: `adversary_${Date.now()}`,
                    name: 'ANOMALY',
                    count: Math.floor(15 * intensity) + 5,
                    shape: selectedShape,
                    color: '#ff0033', // "Warning" Red
                    spawnMode: SpawnMode.BLAST,
                    scale: 0.5 + intensity,
                    mass: 50 * intensity,
                    restitution: 0.8,
                    friction: 0.4,
                    drag: 0.02
                });

                const g = newParams.gravity;
                if (Math.abs(g.x) < 0.1 && Math.abs(g.y) < 0.1 && Math.abs(g.z) < 0.1) {
                     newParams.gravity.y = -9.81;
                }
                break;

            case DisturbanceType.SENSOR_NOISE:
                // Simulates "noisy" perception by violently shaking the wind/gravity vectors temporarily.
                // In a real physics engine, we'd jitter positions directly, but here we jitter forces
                // to cause "tracking errors" in the object movement.
                newParams.wind = {
                    x: (Math.random() - 0.5) * 100 * intensity,
                    y: (Math.random() - 0.5) * 100 * intensity,
                    z: (Math.random() - 0.5) * 100 * intensity
                };
                break;

            case DisturbanceType.CALIBRATION_DRIFT:
                // Slowly rotates the gravity vector to simulate IMU drift on a robot.
                // We add a small constant bias to whatever gravity currently exists.
                newParams.gravity.x += 2.0 * intensity;
                newParams.gravity.z += 2.0 * intensity;
                break;

            case DisturbanceType.SOLVER_FLUSH:
                // This simulates the "Contact Manifold Serialization Trap".
                // By momentarily changing the movement behavior to something non-integrated
                // or applying a zero-g state with high drag, we force the "Agent" (the visualizer)
                // to lose its velocity history, mimicking the "Pop" effect seen in Isaac Sim.
                newParams.movementBehavior = MovementBehavior.PHYSICS_GRAVITY;
                // We jolt the gravity to force a re-solve of all contacts
                newParams.gravity = { x: 0, y: -20, z: 0 };
                // And momentarily kill friction to simulate the "Static Friction Lie"
                newParams.assetGroups.forEach(g => g.friction = 0.0);
                break;
        }

        return newParams;
    }
}