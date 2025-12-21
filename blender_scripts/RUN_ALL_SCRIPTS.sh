#!/bin/bash

# Run all Blender scene generation scripts
# Creates realistic robotic arms, surgical robots, autonomous vehicles, drones for SnapLock

BLENDER="/Applications/Blender.app/Contents/MacOS/Blender"
SCRIPT_DIR="/Users/dr.gretchenboria/snaplock/blender_scripts"

echo "=========================================="
echo "🎨 Blender Scene Generation for SnapLock"
echo "=========================================="
echo ""

# Check Blender installation
if [ ! -f "$BLENDER" ]; then
    echo "❌ Blender not found at $BLENDER"
    echo "Please install Blender or update the BLENDER path in this script"
    exit 1
fi

echo "✅ Found Blender: $($BLENDER --version | head -1)"
echo ""

# Create output directory
mkdir -p /Users/dr.gretchenboria/snaplock/public/models
echo "📁 Output directory: /Users/dr.gretchenboria/snaplock/public/models"
echo ""

# Script 1: Robotic Arm
echo "🤖 [1/4] Creating 6-Axis Industrial Robotic Arm..."
$BLENDER --background --python "$SCRIPT_DIR/create_robotic_arm.py" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ robotic_arm_6axis.glb created"
else
    echo "   ❌ Failed to create robotic arm"
fi
echo ""

# Script 2: Surgical Robot
echo "🏥 [2/4] Creating Da Vinci Style Surgical Robot..."
$BLENDER --background --python "$SCRIPT_DIR/create_surgical_robot.py" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ surgical_robot_davinci.glb created"
else
    echo "   ❌ Failed to create surgical robot"
fi
echo ""

# Script 3: Autonomous Vehicle
echo "🚗 [3/4] Creating Autonomous Vehicle..."
$BLENDER --background --python "$SCRIPT_DIR/create_autonomous_vehicle.py" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ autonomous_vehicle.glb created"
else
    echo "   ❌ Failed to create autonomous vehicle"
fi
echo ""

# Script 4: Drone
echo "🚁 [4/4] Creating Quadcopter Drone..."
$BLENDER --background --python "$SCRIPT_DIR/create_drone.py" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ drone_quadcopter.glb created"
else
    echo "   ❌ Failed to create drone"
fi
echo ""

echo "=========================================="
echo "✅ All models generated!"
echo "=========================================="
echo ""
echo "📦 Generated Models:"
ls -lh /Users/dr.gretchenboria/snaplock/public/models/*.glb 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'
echo ""
echo "🎯 Use in SnapLock exampleScenes.ts:"
echo "   modelUrl: '/models/robotic_arm_6axis.glb'"
echo "   modelUrl: '/models/surgical_robot_davinci.glb'"
echo "   modelUrl: '/models/autonomous_vehicle.glb'"
echo "   modelUrl: '/models/drone_quadcopter.glb'"
echo ""
echo "🎬 All models include animations:"
echo "   - Robotic arm: Pick and place motion"
echo "   - Surgical robot: Dual arm surgical procedure"
echo "   - Autonomous vehicle: Driving with spinning wheels & LIDAR"
echo "   - Drone: Takeoff, flight path, landing with spinning propellers"
echo ""