"""
Blender Script: Create Animated Quadcopter Drone

Run in Blender:
  blender --python create_drone.py
"""

import bpy
import math

# Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

def create_cube(name, size, location=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=size, location=location)
    obj = bpy.context.active_object
    obj.name = name
    return obj

def create_cylinder(name, radius, depth, location=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=location)
    obj = bpy.context.active_object
    obj.name = name
    return obj

def create_torus(name, major_radius, minor_radius, location=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major_radius, minor_radius=minor_radius, location=location)
    obj = bpy.context.active_object
    obj.name = name
    return obj

# ===== DRONE BODY =====
body = create_cube("DroneBody", size=0.3, location=(0, 0, 2))
body.scale = (1.5, 1.5, 0.5)
body_mat = bpy.data.materials.new(name="BodyMaterial")
body_mat.diffuse_color = (0.1, 0.1, 0.1, 1.0)  # Black
body.data.materials.append(body_mat)

# Battery compartment
battery = create_cube("Battery", size=0.2, location=(0, 0, 1.95))
battery.scale = (1.0, 0.8, 0.3)
battery_mat = bpy.data.materials.new(name="BatteryMaterial")
battery_mat.diffuse_color = (0.8, 0.8, 0.0, 1.0)  # Yellow
battery.data.materials.append(battery_mat)

# Camera gimbal
camera = create_cylinder("Camera", radius=0.08, depth=0.15, location=(0, 0, 1.75))
camera_mat = bpy.data.materials.new(name="CameraMaterial")
camera_mat.diffuse_color = (0.2, 0.2, 0.2, 1.0)
camera.data.materials.append(camera_mat)

# ===== MOTOR ARMS =====
arm_mat = bpy.data.materials.new(name="ArmMaterial")
arm_mat.diffuse_color = (0.3, 0.3, 0.3, 1.0)  # Dark gray
arm_mat.metallic = 0.8

# Arm 1 - Front right
arm1 = create_cylinder("Arm1", radius=0.03, depth=0.6, location=(0.35, 0.35, 2.0))
arm1.rotation_euler = (0, math.radians(90), math.radians(45))
arm1.data.materials.append(arm_mat)

# Arm 2 - Front left
arm2 = create_cylinder("Arm2", radius=0.03, depth=0.6, location=(-0.35, 0.35, 2.0))
arm2.rotation_euler = (0, math.radians(90), math.radians(-45))
arm2.data.materials.append(arm_mat)

# Arm 3 - Rear left
arm3 = create_cylinder("Arm3", radius=0.03, depth=0.6, location=(-0.35, -0.35, 2.0))
arm3.rotation_euler = (0, math.radians(90), math.radians(-135))
arm3.data.materials.append(arm_mat)

# Arm 4 - Rear right
arm4 = create_cylinder("Arm4", radius=0.03, depth=0.6, location=(0.35, -0.35, 2.0))
arm4.rotation_euler = (0, math.radians(90), math.radians(135))
arm4.data.materials.append(arm_mat)

# ===== MOTORS AND PROPELLERS =====
motor_mat = bpy.data.materials.new(name="MotorMaterial")
motor_mat.diffuse_color = (0.5, 0.1, 0.1, 1.0)  # Red
motor_mat.metallic = 0.9

prop_mat = bpy.data.materials.new(name="PropellerMaterial")
prop_mat.diffuse_color = (0.1, 0.1, 0.1, 0.3)  # Translucent black
prop_mat.blend_method = 'BLEND'

motor_positions = [
    (0.55, 0.55, 2.0),   # Front right
    (-0.55, 0.55, 2.0),  # Front left
    (-0.55, -0.55, 2.0), # Rear left
    (0.55, -0.55, 2.0)   # Rear right
]

motors = []
propellers = []

for i, pos in enumerate(motor_positions):
    # Motor
    motor = create_cylinder(f"Motor{i+1}", radius=0.06, depth=0.08, location=pos)
    motor.data.materials.append(motor_mat)
    motors.append(motor)

    # Propeller blades (2 flat blades instead of torus ring)
    prop_pos = (pos[0], pos[1], pos[2] + 0.05)

    # Create propeller as two crossed flat blades
    bpy.ops.mesh.primitive_cube_add(size=1, location=prop_pos)
    prop = bpy.context.active_object
    prop.name = f"Propeller{i+1}"
    prop.scale = (0.25, 0.02, 0.005)  # Long, thin blade
    prop.data.materials.append(prop_mat)

    # Second blade perpendicular to first
    bpy.ops.mesh.primitive_cube_add(size=1, location=prop_pos)
    blade2 = bpy.context.active_object
    blade2.name = f"Blade2_{i+1}"
    blade2.scale = (0.02, 0.25, 0.005)
    blade2.data.materials.append(prop_mat)
    blade2.parent = prop  # Parent to first blade so they rotate together

    propellers.append(prop)

    # Parent propeller to motor
    prop.parent = motor

# ===== LANDING GEAR =====
gear_mat = bpy.data.materials.new(name="GearMaterial")
gear_mat.diffuse_color = (0.2, 0.2, 0.2, 1.0)

gear1 = create_cylinder("Gear1", radius=0.015, depth=0.3, location=(0.3, 0.3, 1.7))
gear1.data.materials.append(gear_mat)

gear2 = create_cylinder("Gear2", radius=0.015, depth=0.3, location=(-0.3, 0.3, 1.7))
gear2.data.materials.append(gear_mat)

gear3 = create_cylinder("Gear3", radius=0.015, depth=0.3, location=(-0.3, -0.3, 1.7))
gear3.data.materials.append(gear_mat)

gear4 = create_cylinder("Gear4", radius=0.015, depth=0.3, location=(0.3, -0.3, 1.7))
gear4.data.materials.append(gear_mat)

# ===== PARENT HIERARCHY =====
battery.parent = body
camera.parent = body
for arm in [arm1, arm2, arm3, arm4]:
    arm.parent = body
for motor in motors:
    motor.parent = body
for gear in [gear1, gear2, gear3, gear4]:
    gear.parent = body

# ===== ENVIRONMENT (WAREHOUSE) =====
floor = create_cube("Floor", size=1, location=(0, 0, 0.05))
floor.scale = (10, 10, 0.1)
floor_mat = bpy.data.materials.new(name="FloorMaterial")
floor_mat.diffuse_color = (0.5, 0.5, 0.5, 1.0)
floor.data.materials.append(floor_mat)

# Warehouse shelves (simplified)
shelf1 = create_cube("Shelf1", size=1, location=(-3, 0, 1.5))
shelf1.scale = (0.5, 3, 3)
shelf_mat = bpy.data.materials.new(name="ShelfMaterial")
shelf_mat.diffuse_color = (0.6, 0.4, 0.2, 1.0)  # Wood
shelf1.data.materials.append(shelf_mat)

shelf2 = create_cube("Shelf2", size=1, location=(3, 0, 1.5))
shelf2.scale = (0.5, 3, 3)
shelf2.data.materials.append(shelf_mat)

# ===== ANIMATION - DRONE FLIGHT =====
fps = 30
duration = 10
total_frames = fps * duration

bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = total_frames
bpy.context.scene.render.fps = fps

# Takeoff, hover, move, land
body.location = (0, 0, 0.5)  # Start on ground
body.keyframe_insert(data_path="location", frame=1)

body.location = (0, 0, 2.0)  # Takeoff
body.keyframe_insert(data_path="location", frame=60)

body.location = (2, 1, 2.5)  # Move forward and up
body.keyframe_insert(data_path="location", frame=150)

body.location = (-2, -1, 2.0)  # Move to different position
body.keyframe_insert(data_path="location", frame=210)

body.location = (0, 0, 0.5)  # Land
body.keyframe_insert(data_path="location", frame=300)

# Rotate propellers (fast spinning)
for i, prop in enumerate(propellers):
    prop.rotation_euler[2] = 0
    prop.keyframe_insert(data_path="rotation_euler", frame=1)

    # Different speeds for stability (front CW, rear CCW pattern)
    direction = 1 if i % 2 == 0 else -1
    prop.rotation_euler[2] = direction * 50 * math.pi  # 25 full rotations
    prop.keyframe_insert(data_path="rotation_euler", frame=total_frames)

# Camera gimbal movement (looking around)
camera.rotation_euler[1] = 0
camera.keyframe_insert(data_path="rotation_euler", frame=1)

camera.rotation_euler[1] = math.radians(30)
camera.keyframe_insert(data_path="rotation_euler", frame=120)

camera.rotation_euler[1] = math.radians(-30)
camera.keyframe_insert(data_path="rotation_euler", frame=200)

camera.rotation_euler[1] = 0
camera.keyframe_insert(data_path="rotation_euler", frame=300)

# ===== LIGHTING =====
bpy.ops.object.light_add(type='AREA', location=(0, 0, 8))
light = bpy.context.active_object
light.data.energy = 500
light.data.size = 10

# ===== CAMERA =====
bpy.ops.object.camera_add(location=(6, -6, 4))
cam = bpy.context.active_object
cam.rotation_euler = (math.radians(70), 0, math.radians(45))
bpy.context.scene.camera = cam

# ===== EXPORT =====
output_path = "/Users/dr.gretchenboria/snaplock/public/models/drone_quadcopter.glb"

# Select ONLY the drone components (not floor, shelves, lights, camera)
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
battery.select_set(True)
camera.select_set(True)
arm1.select_set(True)
arm2.select_set(True)
arm3.select_set(True)
arm4.select_set(True)
for motor in motors:
    motor.select_set(True)
for prop in propellers:
    prop.select_set(True)
gear1.select_set(True)
gear2.select_set(True)
gear3.select_set(True)
gear4.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    export_animations=True,
    export_yup=True,
    use_selection=True
)

print(f"✅ Created Quadcopter Drone Scene")
print(f"📤 Exported to: {output_path}")
print(f"🎬 Animation: {total_frames} frames at {fps} FPS")
print(f"🚁 Features: 4 spinning propellers, camera gimbal, takeoff/landing/flight")
print(f"Use in SnapLock: modelUrl: '/models/drone_quadcopter.glb'")
