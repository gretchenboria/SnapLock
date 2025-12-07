# SnapLock: Synthetic Data & Physics Simulation Platform

**"Lock physics, snap reality."**

SnapLock is a high-fidelity, web-based rigid body physics engine designed for **Robotics** and **AR/VR** applications. It serves as a rapid prototyping tool for generating synthetic training data, testing computer vision sensor configurations (LIDAR, Depth), and simulating adversarial environmental conditions.

## Features

*   **Multimodal Sensor Simulation**: Switch instantly between RGB, Depth Map, LiDAR Point Cloud, and Wireframe visualizations.
*   **Adversarial Director**: An AI-driven background agent that visually analyzes the scene and injects random disturbances (Gravity Shifts, Sensor Noise, Calibration Drift) to stress-test synthetic data.
*   **Generative Ground Truth**: Convert wireframe simulations into photorealistic industrial imagery or temporal video sequences using generative models.
*   **Auto-Spawn Mode**: Automated feature that generates scientifically relevant physics scenarios for continuous data harvesting.
*   **Live Telemetry**: Real-time graphing of system kinetic energy, particle velocity, and framerate for scientific rigor.
*   **Configuration Management**: Import and Export complex simulation states via JSON to share scenarios or restore specific test conditions.

## Tech Stack & Machine Learning Models

**Frontend Architecture:**
*   **React 19**: Component-based UI.
*   **Three.js / React Three Fiber**: WebGL rendering engine.
*   **InstancedMesh**: Optimized for rendering 1000+ rigid bodies at 60fps.

**Generative AI & Machine Learning:**
*   **Physics Reasoning & Logic**: **Gemini 3 Pro** (`gemini-3-pro-preview`) - Reasoning model for converting natural language into rigid body parameters and vector mathematics.
*   **Adversarial Supervisor**: **Gemini 3 Pro** (`gemini-3-pro-preview`) - Multimodal Vision Language Model (VLM) used for real-time scene analysis and stability detection.
*   **Photorealistic Rendering**: **Gemini 3 Pro Image** (`gemini-3-pro-image-preview`) - Image generation model used to skin wireframes into photorealistic "Ground Truth" datasets.
*   **Temporal Synthesis**: **Veo 3.1** (`veo-3.1-generate-preview`) - High-fidelity generative video model for creating temporal synthetic data sequences.

## Solver Stabilization & Warm Start

SnapLock addresses the **"Contact Manifold Serialization Trap"** common in advanced physics engines (like PhysX/Isaac Sim). When a simulation is paused, saved, or loaded, the internal solver often loses its cached contact history, causing overlapping objects to explosively repel (the "Pop" effect) upon resumption.

**SnapLock's Solution:**
*   **Warm Start Protocol**: Upon any load or reset, the engine enters a 60-step **Warmup Phase**. This counter only increments during active simulation steps, preventing the warmup from expiring while the simulation is paused.
*   **Velocity Clamping**: During warmup, particle velocities are capped to prevent divergence.
*   **Overdamped Dynamics**: Drag is increased and restitution (bounce) is zeroed. This allows interpenetrating geometries to "settle" gently into a stable contact manifold before full physics integration resumes.

**Domain Randomization:**
The Adversarial Director includes a `SOLVER_FLUSH` disturbance type. This artificially clears velocity history and friction anchors, simulating the loss of solver cache. This enables the generation of synthetic datasets that train RL agents to be robust against physics state loss.

## Architecture Overview

SnapLock functions through a continuous loop of Logic > Simulation > Perception > Adaptation.

1.  **Logic Core**: Takes a Natural Language Prompt (e.g., "Debris in zero-g") and uses `gemini-3-pro-preview` to output a strictly typed JSON Physics Configuration.
2.  **Simulation Layer**: A custom Verlet Integration engine (running in `SimulationLayer.tsx`) updates particle positions, velocities, and collisions at 60Hz. It avoids heavy physics engines like Cannon/Ammo in favor of high-performance particle math suited for visual synthetic data.
3.  **Visual Layer**: Renders the state using `THREE.InstancedMesh`. It supports "Sensor Modes" (Depth/LiDAR) by overriding fragment shaders or material colors on the fly.
4.  **Adversarial Loop**: The "Director" captures a low-res snapshot of the canvas, sends it to the Multimodal VLM, and receives instructions to inject noise (e.g., change wind vector) if the scene is deemed "too stable."

## Session Behavior & State Management

SnapLock is designed as a **transient simulation environment**.

*   **Fresh Start Protocol**: Each time the application is reloaded, the state resets completely to default factory values. No data is persisted in LocalStorage, Cookies, or Browser Cache. This ensures a clean testing slate for every session, preventing pollution from previous experiments or Hot Module Reloads.
*   **Saving Work**: To preserve a simulation configuration, use the **EXPORT** button in the bottom left inspector panel. This will download a `sim_config.json` file.
*   **Restoring Work**: Use the **IMPORT** button to upload a valid `sim_config.json` file. This will instantly restore the assets, physics parameters, and environment settings.

## Configuration Guide

When inspecting assets, the following parameters control the physical properties:

*   **Restitution (0.0 - 1.2)**: Bounciness. 1.0 is perfectly elastic. >1.0 gains energy on collision.
*   **Friction (0.0 - 1.0)**: Surface grip. 0.0 is ice, 1.0 is sandpaper. Controls velocity decay on floor contact.
*   **Mass (0.1 - 50.0)**: Density. Heavier objects are less affected by Wind but fall faster if drag is low.
*   **Drag (0.0 - 0.2)**: Air resistance. Higher values simulate liquid environments or parachutes.

## Integration Testing & Validation

To validate core physics functionality manually:

1.  **Warm Start Validation**:
    *   Load the simulation.
    *   Immediately press PAUSE.
    *   Observe the "Kinetic Energy" telemetry flashing "WARMUP".
    *   Wait 5 seconds.
    *   Unpause.
    *   **Result**: The debris should settle gently. If it explodes immediately, the Warm Start timer expired while paused (Fail).

2.  **Adversarial Director Test**:
    *   Enable "Director" toggle.
    *   Wait for the red "SYSTEM ANOMALY" toast.
    *   **Result**: Physics parameters (Gravity/Wind) should visibly shift in the inspector panel.

3.  **Fresh Start Check**:
    *   Modify settings (change colors/shapes).
    *   Reload the browser page.
    *   **Result**: All settings must revert to the default Cyan Cubes.

## Quick Start

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/snaplock.git
    cd snaplock
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment:**
    Ensure you have a valid API Key for the GenAI SDK.
    ```bash
    export API_KEY="your_api_key_here"
    ```

4.  **Run the Simulation:**
    ```bash
    npm start
    ```

## Licensing

SnapLock is distributed under a **Dual Licensing** model to ensure open-source accessibility while sustaining commercial development.

### 1. Open Source License (AGPLv3)
For non-commercial, educational, or open-source projects, this software is available under the **GNU Affero General Public License v3.0 (AGPLv3)**. 
*   You are free to use, modify, and distribute the code.
*   **Condition**: If you deploy this application (even over a network), you must disclose your full source code and modifications to users.

### 2. Commercial License
For proprietary, closed-source, or commercial use where source code disclosure is not desired:
*   You must purchase a Commercial License.
*   This grants the right to use SnapLock in proprietary products without the copyleft obligations of AGPLv3.
*   Includes priority support and indemnification.

*Contact [me@gretchenboria.com] for commercial inquiries.*

## Troubleshooting

*   **"Director Offline"**: Ensure your API Key has access to `gemini-3-pro-preview`. This feature requires a high-throughput paid key for continuous sampling.
*   **Video Generation Stuck**: Veo model generation can take 20-60 seconds. Ensure the browser tab remains active. If it fails, check the console for "Quota Exceeded" errors.
*   **Model Overloaded (503)**: The backend automatically retries up to 3 times with exponential backoff (2s, 4s, 8s). If the error persists, wait 1 minute before retrying.
*   **Low FPS**: If simulating >1000 particles on a laptop, try reducing the "Particle Count" in the Inspector or switching to "Wireframe" view to reduce GPU load.

## Contributing

We welcome contributions. Please see `CONTRIBUTING.md` for details on how to submit pull requests, report issues, and request features.