"""
Blender Script: Create Animated 6-Axis Industrial Robotic Arm

Run in Blender:
  blender --python create_robotic_arm.py

Or from Text Editor in Blender UI
"""

import bpy
import math
from mathutils import Vector, Euler

# Clear existing scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

def create_cylinder(name, radius, depth, location=(0, 0, 0)):
    """Helper to create cylinder"""
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=location)
    obj = bpy.context.active_object
    obj.name = name
    return obj

def create_cube(name, size, location=(0, 0, 0)):
    """Helper to create cube"""
    bpy.ops.mesh.primitive_cube_add(size=size, location=location)
    obj = bpy.context.active_object
    obj.name = name
    return obj

# ===== CREATE 6-AXIS ROBOT ARM =====

# Base (static platform)
base = create_cylinder("RobotBase", radius=0.8, depth=0.3, location=(0, 0, 0.15))
base_mat = bpy.data.materials.new(name="BaseMaterial")
base_mat.diffuse_color = (0.3, 0.3, 0.3, 1.0)  # Dark gray
base.data.materials.append(base_mat)

# Joint 1 - Base rotation (Y-axis rotation)
joint1 = create_cylinder("Joint1", radius=0.5, depth=0.4, location=(0, 0, 0.5))
joint1.rotation_euler[0] = math.pi / 2  # Rotate to vertical
joint1_mat = bpy.data.materials.new(name="Joint1Material")
joint1_mat.diffuse_color = (0.8, 0.3, 0.1, 1.0)  # Orange
joint1.data.materials.append(joint1_mat)

# Link 1 - First arm segment
link1 = create_cube("Link1", size=0.3, location=(0, 0, 1.2))
link1.scale = (0.8, 0.8, 2.5)
link1_mat = bpy.data.materials.new(name="Link1Material")
link1_mat.diffuse_color = (0.2, 0.5, 0.8, 1.0)  # Blue
link1.data.materials.append(link1_mat)

# Joint 2 - Shoulder
joint2 = create_cylinder("Joint2", radius=0.4, depth=0.3, location=(0, 0, 2.2))
joint2.rotation_euler[0] = math.pi / 2
joint2_mat = bpy.data.materials.new(name="Joint2Material")
joint2_mat.diffuse_color = (0.8, 0.3, 0.1, 1.0)  # Orange
joint2.data.materials.append(joint2_mat)

# Link 2 - Second arm segment (forearm)
link2 = create_cube("Link2", size=0.25, location=(0, 0, 3.5))
link2.scale = (0.7, 0.7, 2.0)
link2_mat = bpy.data.materials.new(name="Link2Material")
link2_mat.diffuse_color = (0.2, 0.5, 0.8, 1.0)  # Blue
link2.data.materials.append(link2_mat)

# Joint 3 - Elbow
joint3 = create_cylinder("Joint3", radius=0.35, depth=0.25, location=(0, 0, 4.5))
joint3.rotation_euler[0] = math.pi / 2
joint3_mat = bpy.data.materials.new(name="Joint3Material")
joint3_mat.diffuse_color = (0.8, 0.3, 0.1, 1.0)  # Orange
joint3.data.materials.append(joint3_mat)

# Link 3 - Wrist segment
link3 = create_cube("Link3", size=0.2, location=(0, 0, 5.3))
link3.scale = (0.6, 0.6, 1.2)
link3_mat = bpy.data.materials.new(name="Link3Material")
link3_mat.diffuse_color = (0.2, 0.5, 0.8, 1.0)  # Blue
link3.data.materials.append(link3_mat)

# Joint 4-6 - Wrist assembly
joint4 = create_cylinder("Joint4", radius=0.25, depth=0.2, location=(0, 0, 5.9))
joint4.rotation_euler[0] = math.pi / 2
joint4_mat = bpy.data.materials.new(name="Joint4Material")
joint4_mat.diffuse_color = (0.8, 0.3, 0.1, 1.0)
joint4.data.materials.append(joint4_mat)

# End effector (gripper simplified)
gripper = create_cube("Gripper", size=0.15, location=(0, 0, 6.3))
gripper.scale = (1.0, 1.0, 0.8)
gripper_mat = bpy.data.materials.new(name="GripperMaterial")
gripper_mat.diffuse_color = (0.1, 0.1, 0.1, 1.0)  # Black
gripper.data.materials.append(gripper_mat)

# ===== SETUP PARENT HIERARCHY =====
joint1.parent = base
link1.parent = joint1
joint2.parent = link1
link2.parent = joint2
joint3.parent = link2
link3.parent = joint3
joint4.parent = link3
gripper.parent = joint4

# ===== CREATE ANIMATION =====
# Animate robot performing pick-and-place operation

fps = 30
duration_seconds = 5
total_frames = fps * duration_seconds

bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = total_frames
bpy.context.scene.render.fps = fps

# Keyframe base rotation (Joint 1 - Y-axis rotation)
joint1.rotation_euler[2] = 0  # Start at 0
joint1.keyframe_insert(data_path="rotation_euler", frame=1)

joint1.rotation_euler[2] = math.pi / 2  # Rotate 90 degrees
joint1.keyframe_insert(data_path="rotation_euler", frame=75)

joint1.rotation_euler[2] = 0  # Return to start
joint1.keyframe_insert(data_path="rotation_euler", frame=150)

# Keyframe shoulder (Joint 2 - bend arm down/up)
link1.rotation_euler[1] = 0
link1.keyframe_insert(data_path="rotation_euler", frame=1)

link1.rotation_euler[1] = -math.pi / 4  # Bend forward
link1.keyframe_insert(data_path="rotation_euler", frame=50)

link1.rotation_euler[1] = 0  # Return
link1.keyframe_insert(data_path="rotation_euler", frame=100)

# Keyframe elbow (Joint 3)
link2.rotation_euler[1] = 0
link2.keyframe_insert(data_path="rotation_euler", frame=1)

link2.rotation_euler[1] = math.pi / 3  # Bend elbow
link2.keyframe_insert(data_path="rotation_euler", frame=60)

link2.rotation_euler[1] = 0
link2.keyframe_insert(data_path="rotation_euler", frame=110)

# ===== ADD WORKING SURFACE (TABLE) =====
table = create_cube("WorkTable", size=1, location=(2, 0, 0.05))
table.scale = (3, 2, 0.1)
table_mat = bpy.data.materials.new(name="TableMaterial")
table_mat.diffuse_color = (0.6, 0.6, 0.6, 1.0)  # Gray
table.data.materials.append(table_mat)

# ===== LIGHTING =====
bpy.ops.object.light_add(type='SUN', location=(5, 5, 10))
sun = bpy.context.active_object
sun.data.energy = 2.0

# ===== CAMERA =====
bpy.ops.object.camera_add(location=(8, -8, 6))
camera = bpy.context.active_object
camera.rotation_euler = (math.radians(65), 0, math.radians(45))
bpy.context.scene.camera = camera

# ===== EXPORT GLB =====
output_path = "/Users/dr.gretchenboria/snaplock/public/models/robotic_arm_6axis.glb"

# Select ONLY the robot components (not table, lights, camera)
bpy.ops.object.select_all(action='DESELECT')
base.select_set(True)
joint1.select_set(True)
link1.select_set(True)
joint2.select_set(True)
link2.select_set(True)
joint3.select_set(True)
link3.select_set(True)
joint4.select_set(True)
gripper.select_set(True)

# Export to GLB
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    export_animations=True,
    export_yup=True,
    use_selection=True
)

print(f"✅ Created 6-Axis Industrial Robot Arm")
print(f"📤 Exported to: {output_path}")
print(f"🎬 Animation: {total_frames} frames at {fps} FPS")
print(f"Use in SnapLock: modelUrl: '/models/robotic_arm_6axis.glb'")
