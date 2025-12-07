
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
*   **System Diagnostics**: Built-in regression test suite to validate physics engine determinism and service integration.

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

## Architecture Overview

SnapLock functions through a continuous loop of Logic > Simulation > Perception > Adaptation.

1.  **Logic Core**: Takes a Natural Language Prompt (e.g., "Debris in zero-g") and uses `gemini-3-pro-preview` to output a strictly typed JSON Physics Configuration.
2.  **Simulation Layer**: A custom Verlet Integration engine (running in `SimulationLayer.tsx`) updates particle positions, velocities, and collisions at 60Hz. It avoids heavy physics engines like Cannon/Ammo in favor of high-performance particle math suited for visual synthetic data.
3.  **Visual Layer**: Renders the state using `THREE.InstancedMesh`. It supports "Sensor Modes" (Depth/LiDAR) by overriding fragment shaders or material colors on the fly.
4.  **Adversarial Loop**: The "Director" captures a low-res snapshot of the canvas, sends it to the Multimodal VLM, and receives instructions to inject noise (e.g., change wind vector) if the scene is deemed "too stable."

## Pipeline Tools (Python)

### Adversarial Asset Bootstrapper
A Python pipeline script (`bootstrap_assets.py`) is included to hydrate the project with high-quality CC0 assets (HDRIs, Textures, Models) for Chaos Engineering tests.

**Usage:**
```bash
# Install dependencies
pip install requests tqdm

# Run the bootstrapper
python bootstrap_assets.py
```
This script downloads assets to the local filesystem. For the web application, a TypeScript inventory (`services/chaosInventory.ts`) handles remote asset loading from CDN.

## Testing & Validation

SnapLock includes a comprehensive **In-Browser Regression Suite**. This allows you to verify core functionality without installing external test runners.

### How to Run Tests
1.  Launch the application.
2.  Append `?test=true` to the URL (e.g., `https://snaplock.netlify.app/?test=true`).
3.  The **SYSTEM DIAGNOSTICS** panel will appear in the top-right corner.
4.  Click **RUN REGRESSION SUITE**.

### Included Tests
*   **Unit: Adversarial Logic**: Verifies that the Supervisor outputs valid vectors within safe constraints.
*   **Unit: Physics Config**: Validates default parameter integrity.
*   **Integration: Warm Start Protocol**: Automatically resets the sim, unpauses, and verifies the transition from "WARMUP" to "ACTIVE" states via telemetry hooks.
*   **Integration: AI Config Injection**: Mocks the Gemini API response and verifies that the physics engine correctly parses and applies the new JSON configuration.
*   **Regression: Renderer Integrity**: Checks WebGL context health and canvas dimensions.

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

## Docker Deployment

SnapLock can be deployed using Docker for a consistent, production-ready environment.

### Using Docker Compose (Recommended)

1.  **Start the application:**
    ```bash
    docker-compose up -d
    ```

2.  **Access the application:**
    Open your browser and navigate to `http://localhost:8080`

3.  **Stop the application:**
    ```bash
    docker-compose down
    ```

### Using Docker CLI

1.  **Build the image:**
    ```bash
    docker build -t snaplock:latest .
    ```

2.  **Run the container:**
    ```bash
    docker run -d -p 8080:80 --name snaplock snaplock:latest
    ```

3.  **Access the application:**
    Open your browser and navigate to `http://localhost:8080`

4.  **Stop and remove the container:**
    ```bash
    docker stop snaplock
    docker rm snaplock
    ```

### Docker Image Details

*   **Multi-stage build**: Optimized image size using Node.js for build and nginx-alpine for serving
*   **Production-ready**: Includes gzip compression, security headers, and health checks
*   **Image size**: ~50MB (production image)
*   **Port**: Exposes port 80 internally (mapped to 8080 by default)

## Licensing

SnapLock is distributed under a **Dual Licensing** model.

### 1. Open Source License (AGPLv3)
For non-commercial, educational, or open-source projects.
*   You are free to use, modify, and distribute the code.
*   **Condition**: If you deploy this application, you must disclose your full source code.

### 2. Commercial License
For proprietary use without source disclosure.
*   Contact the author for licensing details.
