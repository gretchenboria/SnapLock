
import { AnalysisResponse, MovementBehavior, ShapeType, SpawnMode, AdversarialAction, DisturbanceType } from "../types";

export const MOCK_ANALYSIS_RESPONSE: AnalysisResponse = {
  movementBehavior: MovementBehavior.PHYSICS_GRAVITY,
  gravity: { x: 0, y: -5.0, z: 0 },
  wind: { x: 2.0, y: 0, z: 0 },
  assetGroups: [
    {
      id: "mock_group_1",
      name: "Mock Cubes",
      count: 50,
      shape: ShapeType.CUBE,
      color: "#ff00ff",
      spawnMode: SpawnMode.PILE,
      scale: 1.0,
      mass: 5.0,
      restitution: 0.5,
      friction: 0.5,
      drag: 0.01
    },
    {
      id: "mock_group_2",
      name: "Mock Spheres",
      count: 20,
      shape: ShapeType.SPHERE,
      color: "#00ffff",
      spawnMode: SpawnMode.GRID,
      scale: 0.5,
      mass: 1.0,
      restitution: 0.8,
      friction: 0.1,
      drag: 0.0
    }
  ],
  explanation: "[TEST MODE] Generated mock configuration for regression testing."
};

export const MOCK_ADVERSARIAL_ACTION: AdversarialAction = {
  detectedState: "STABLE",
  action: DisturbanceType.WIND_GUST,
  intensity: 0.8,
  reasoning: "[TEST MODE] Mock director detected high stability, injecting wind noise."
};

export const MOCK_CREATIVE_PROMPT = "TEST MODE: Zero-G collision of mock objects";

export const MOCK_HTML_REPORT = `
<!DOCTYPE html>
<html>
<head><style>body{font-family:sans-serif;}</style></head>
<body>
  <h1>TEST REPORT</h1>
  <p>This is a mock report generated in test mode.</p>
</body>
</html>
`;
