"""
Blender Script: Create Animated Autonomous Vehicle

Run in Blender:
  blender --python create_autonomous_vehicle.py
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

def create_sphere(name, radius, location=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=location)
    obj = bpy.context.active_object
    obj.name = name
    return obj

# ===== CAR BODY =====
car_body = create_cube("CarBody", size=1, location=(0, 0, 0.5))
car_body.scale = (2.5, 1.2, 0.8)
body_mat = bpy.data.materials.new(name="BodyMaterial")
body_mat.diffuse_color = (0.1, 0.3, 0.8, 1.0)  # Blue
body_mat.metallic = 0.7
body_mat.roughness = 0.3
car_body.data.materials.append(body_mat)

# Hood/Front
hood = create_cube("Hood", size=0.8, location=(1.2, 0, 0.45))
hood.scale = (0.8, 1.2, 0.5)
hood.data.materials.append(body_mat)

# Roof/Cabin
roof = create_cube("Roof", size=0.7, location=(-0.2, 0, 0.85))
roof.scale = (1.2, 1.0, 0.6)
roof_mat = bpy.data.materials.new(name="RoofMaterial")
roof_mat.diffuse_color = (0.05, 0.05, 0.05, 1.0)  # Dark (tinted windows)
roof_mat.metallic = 0.9
roof_mat.roughness = 0.1
roof.data.materials.append(roof_mat)

# ===== WHEELS =====
wheel_mat = bpy.data.materials.new(name="WheelMaterial")
wheel_mat.diffuse_color = (0.1, 0.1, 0.1, 1.0)  # Black rubber
wheel_mat.roughness = 0.9

# Front left wheel
wheel_fl = create_cylinder("WheelFrontLeft", radius=0.3, depth=0.15, location=(0.9, -0.7, 0.3))
wheel_fl.rotation_euler[1] = math.pi / 2
wheel_fl.data.materials.append(wheel_mat)

# Front right wheel
wheel_fr = create_cylinder("WheelFrontRight", radius=0.3, depth=0.15, location=(0.9, 0.7, 0.3))
wheel_fr.rotation_euler[1] = math.pi / 2
wheel_fr.data.materials.append(wheel_mat)

# Rear left wheel
wheel_rl = create_cylinder("WheelRearLeft", radius=0.3, depth=0.15, location=(-0.9, -0.7, 0.3))
wheel_rl.rotation_euler[1] = math.pi / 2
wheel_rl.data.materials.append(wheel_mat)

# Rear right wheel
wheel_rr = create_cylinder("WheelRearRight", radius=0.3, depth=0.15, location=(-0.9, 0.7, 0.3))
wheel_rr.rotation_euler[1] = math.pi / 2
wheel_rr.data.materials.append(wheel_mat)

# ===== SENSORS (LIDAR, CAMERAS) =====

# LIDAR sensor on roof
lidar = create_cylinder("LidarSensor", radius=0.15, depth=0.2, location=(-0.2, 0, 1.4))
lidar_mat = bpy.data.materials.new(name="LidarMaterial")
lidar_mat.diffuse_color = (0.2, 0.2, 0.2, 1.0)
lidar.data.materials.append(lidar_mat)

# Front camera
camera_sensor = create_cube("CameraFront", size=0.08, location=(1.65, 0, 0.7))
cam_mat = bpy.data.materials.new(name="CameraMaterial")
cam_mat.diffuse_color = (0.05, 0.05, 0.05, 1.0)
camera_sensor.data.materials.append(cam_mat)

# Side cameras
cam_left = create_cube("CameraLeft", size=0.06, location=(0, -0.65, 0.8))
cam_left.data.materials.append(cam_mat)

cam_right = create_cube("CameraRight", size=0.06, location=(0, 0.65, 0.8))
cam_right.data.materials.append(cam_mat)

# ===== PARENT HIERARCHY =====
hood.parent = car_body
roof.parent = car_body
wheel_fl.parent = car_body
wheel_fr.parent = car_body
wheel_rl.parent = car_body
wheel_rr.parent = car_body
lidar.parent = car_body
camera_sensor.parent = car_body
cam_left.parent = car_body
cam_right.parent = car_body

# ===== ROAD/ENVIRONMENT =====
road = create_cube("Road", size=1, location=(0, 0, -0.05))
road.scale = (50, 4, 0.1)
road_mat = bpy.data.materials.new(name="RoadMaterial")
road_mat.diffuse_color = (0.2, 0.2, 0.2, 1.0)  # Asphalt gray
road.data.materials.append(road_mat)

# Lane markings
lane_left = create_cube("LaneLeft", size=0.5, location=(0, -1.0, 0.02))
lane_left.scale = (100, 0.1, 0.05)
lane_mat = bpy.data.materials.new(name="LaneMaterial")
lane_mat.diffuse_color = (1.0, 1.0, 1.0, 1.0)  # White
lane_left.data.materials.append(lane_mat)

lane_right = create_cube("LaneRight", size=0.5, location=(0, 1.0, 0.02))
lane_right.scale = (100, 0.1, 0.05)
lane_right.data.materials.append(lane_mat)

# Traffic cones (obstacles)
cone_mat = bpy.data.materials.new(name="ConeMaterial")
cone_mat.diffuse_color = (1.0, 0.4, 0.0, 1.0)  # Orange

cone1 = create_cylinder("Cone1", radius=0.15, depth=0.5, location=(10, -0.5, 0.25))
cone1.scale = (1, 1, 1.5)
cone1.data.materials.append(cone_mat)

cone2 = create_cylinder("Cone2", radius=0.15, depth=0.5, location=(15, 0.5, 0.25))
cone2.scale = (1, 1, 1.5)
cone2.data.materials.append(cone_mat)

# ===== ANIMATION - CAR DRIVING FORWARD =====
fps = 30
duration = 8
total_frames = fps * duration

bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = total_frames
bpy.context.scene.render.fps = fps

# Animate car moving forward
car_body.location = (0, 0, 0.5)
car_body.keyframe_insert(data_path="location", frame=1)

car_body.location = (25, 0, 0.5)
car_body.keyframe_insert(data_path="location", frame=total_frames)

# Animate wheels rotating
for wheel in [wheel_fl, wheel_fr, wheel_rl, wheel_rr]:
    wheel.rotation_euler[0] = 0
    wheel.keyframe_insert(data_path="rotation_euler", frame=1)

    wheel.rotation_euler[0] = 20 * math.pi  # Many rotations
    wheel.keyframe_insert(data_path="rotation_euler", frame=total_frames)

# Animate LIDAR sensor spinning
lidar.rotation_euler[2] = 0
lidar.keyframe_insert(data_path="rotation_euler", frame=1)

lidar.rotation_euler[2] = 8 * math.pi  # Fast rotation
lidar.keyframe_insert(data_path="rotation_euler", frame=total_frames)

# ===== LIGHTING =====
bpy.ops.object.light_add(type='SUN', location=(10, 0, 20))
sun = bpy.context.active_object
sun.data.energy = 3.0
sun.rotation_euler = (math.radians(45), 0, math.radians(30))

# ===== CAMERA (following car) =====
bpy.ops.object.camera_add(location=(5, -8, 4))
camera = bpy.context.active_object
camera.rotation_euler = (math.radians(75), 0, math.radians(30))
bpy.context.scene.camera = camera

# Animate camera following car
camera.location = (5, -8, 4)
camera.keyframe_insert(data_path="location", frame=1)

camera.location = (30, -8, 4)
camera.keyframe_insert(data_path="location", frame=total_frames)

# ===== EXPORT =====
output_path = "/Users/dr.gretchenboria/snaplock/public/models/autonomous_vehicle.glb"

# Select ONLY the vehicle components (not road, lanes, cones, lights, camera)
bpy.ops.object.select_all(action='DESELECT')
car_body.select_set(True)
hood.select_set(True)
roof.select_set(True)
wheel_fl.select_set(True)
wheel_fr.select_set(True)
wheel_rl.select_set(True)
wheel_rr.select_set(True)
lidar.select_set(True)
camera_sensor.select_set(True)
cam_left.select_set(True)
cam_right.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    export_animations=True,
    export_yup=True,
    use_selection=True
)

print(f"✅ Created Autonomous Vehicle Scene")
print(f"📤 Exported to: {output_path}")
print(f"🎬 Animation: {total_frames} frames at {fps} FPS")
print(f"🚗 Features: LIDAR sensor (spinning), cameras, driving animation")
print(f"Use in SnapLock: modelUrl: '/models/autonomous_vehicle.glb'")
