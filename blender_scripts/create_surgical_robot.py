"""
Blender Script: Create Animated Surgical Robot (Da Vinci Style)

Run in Blender:
  blender --python create_surgical_robot.py
"""

import bpy
import math
from mathutils import Vector

# Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

def create_cylinder(name, radius, depth, location=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=location)
    obj = bpy.context.active_object
    obj.name = name
    return obj

def create_cone(name, radius, depth, location=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(radius1=radius, depth=depth, location=location)
    obj = bpy.context.active_object
    obj.name = name
    return obj

def create_sphere(name, radius, location=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=location)
    obj = bpy.context.active_object
    obj.name = name
    return obj

# ===== OPERATING TABLE =====
table = create_cylinder("OperatingTable", radius=1.5, depth=0.1, location=(0, 0, 0.8))
table_mat = bpy.data.materials.new(name="TableMaterial")
table_mat.diffuse_color = (0.9, 0.9, 0.9, 1.0)  # White/gray
table.data.materials.append(table_mat)

# ===== SURGICAL ROBOT ARM 1 (Right side) =====

# Base column
base1 = create_cylinder("SurgicalBase1", radius=0.2, depth=2.0, location=(-1.5, 0, 1.8))
base1_mat = bpy.data.materials.new(name="SurgicalBaseMat")
base1_mat.diffuse_color = (0.15, 0.15, 0.15, 1.0)  # Dark gray
base1.data.materials.append(base1_mat)

# Arm segment 1
arm1_seg1 = create_cylinder("Arm1_Segment1", radius=0.08, depth=0.8, location=(-1.5, 0, 3.2))
arm1_seg1.rotation_euler[1] = math.radians(30)
arm1_mat = bpy.data.materials.new(name="Arm1Material")
arm1_mat.diffuse_color = (0.3, 0.6, 0.8, 1.0)  # Light blue (medical)
arm1_seg1.data.materials.append(arm1_mat)

# Joint 1
joint1 = create_sphere("Joint1", radius=0.12, location=(-1.3, 0, 3.5))
joint1_mat = bpy.data.materials.new(name="JointMaterial")
joint1_mat.diffuse_color = (0.7, 0.7, 0.7, 1.0)
joint1.data.materials.append(joint1_mat)

# Arm segment 2
arm1_seg2 = create_cylinder("Arm1_Segment2", radius=0.06, depth=0.6, location=(-1.0, 0, 3.7))
arm1_seg2.rotation_euler[1] = math.radians(-20)
arm1_seg2.data.materials.append(arm1_mat)

# Surgical instrument (endoscope)
instrument1 = create_cylinder("Endoscope", radius=0.02, depth=0.5, location=(-0.7, 0, 3.8))
instrument1.rotation_euler[1] = math.radians(-10)
inst_mat = bpy.data.materials.new(name="InstrumentMaterial")
inst_mat.diffuse_color = (0.8, 0.8, 0.8, 1.0)  # Metallic
inst_mat.metallic = 0.9
inst_mat.roughness = 0.2
instrument1.data.materials.append(inst_mat)

# Instrument tip (camera/tool)
tip1 = create_cone("EndoscopeTip", radius=0.03, depth=0.08, location=(-0.65, 0, 4.0))
tip1.rotation_euler = (0, math.radians(-10), 0)
tip_mat = bpy.data.materials.new(name="TipMaterial")
tip_mat.diffuse_color = (0.1, 0.1, 0.1, 1.0)
tip1.data.materials.append(tip_mat)

# ===== SURGICAL ROBOT ARM 2 (Left side - grasping tool) =====

base2 = create_cylinder("SurgicalBase2", radius=0.2, depth=2.0, location=(1.5, 0, 1.8))
base2.data.materials.append(base1_mat)

arm2_seg1 = create_cylinder("Arm2_Segment1", radius=0.08, depth=0.8, location=(1.5, 0, 3.2))
arm2_seg1.rotation_euler[1] = math.radians(-30)
arm2_seg1.data.materials.append(arm1_mat)

joint2 = create_sphere("Joint2", radius=0.12, location=(1.3, 0, 3.5))
joint2.data.materials.append(joint1_mat)

arm2_seg2 = create_cylinder("Arm2_Segment2", radius=0.06, depth=0.6, location=(1.0, 0, 3.7))
arm2_seg2.rotation_euler[1] = math.radians(20)
arm2_seg2.data.materials.append(arm1_mat)

# Grasping tool
grasp_tool = create_cylinder("GraspTool", radius=0.02, depth=0.5, location=(0.7, 0, 3.8))
grasp_tool.rotation_euler[1] = math.radians(10)
grasp_tool.data.materials.append(inst_mat)

# ===== PATIENT (simplified body) =====
patient = create_cylinder("Patient", radius=0.4, depth=0.3, location=(0, 0, 1.0))
patient.scale = (1.5, 1.0, 1.0)
patient_mat = bpy.data.materials.new(name="PatientMaterial")
patient_mat.diffuse_color = (0.95, 0.8, 0.7, 1.0)  # Skin tone
patient.data.materials.append(patient_mat)

# ===== SETUP HIERARCHY =====
arm1_seg1.parent = base1
joint1.parent = arm1_seg1
arm1_seg2.parent = joint1
instrument1.parent = arm1_seg2
tip1.parent = instrument1

arm2_seg1.parent = base2
joint2.parent = arm2_seg1
arm2_seg2.parent = joint2
grasp_tool.parent = arm2_seg2

# ===== ANIMATION =====
fps = 30
duration = 6
total_frames = fps * duration

bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = total_frames
bpy.context.scene.render.fps = fps

# Animate arm 1 (scanning motion)
arm1_seg1.rotation_euler[1] = math.radians(30)
arm1_seg1.keyframe_insert(data_path="rotation_euler", frame=1)

arm1_seg1.rotation_euler[1] = math.radians(10)
arm1_seg1.keyframe_insert(data_path="rotation_euler", frame=60)

arm1_seg1.rotation_euler[1] = math.radians(30)
arm1_seg1.keyframe_insert(data_path="rotation_euler", frame=120)

# Animate arm 2 (grasping motion)
arm2_seg1.rotation_euler[1] = math.radians(-30)
arm2_seg1.keyframe_insert(data_path="rotation_euler", frame=1)

arm2_seg1.rotation_euler[1] = math.radians(-15)
arm2_seg1.keyframe_insert(data_path="rotation_euler", frame=80)

arm2_seg1.rotation_euler[1] = math.radians(-30)
arm2_seg1.keyframe_insert(data_path="rotation_euler", frame=160)

# ===== LIGHTING =====
bpy.ops.object.light_add(type='AREA', location=(0, -3, 4))
light1 = bpy.context.active_object
light1.data.energy = 500
light1.data.size = 2

bpy.ops.object.light_add(type='AREA', location=(0, 3, 4))
light2 = bpy.context.active_object
light2.data.energy = 300
light2.data.size = 2

# ===== CAMERA =====
bpy.ops.object.camera_add(location=(3, -4, 3.5))
camera = bpy.context.active_object
camera.rotation_euler = (math.radians(70), 0, math.radians(37))
bpy.context.scene.camera = camera

# ===== EXPORT =====
output_path = "/Users/dr.gretchenboria/snaplock/public/models/surgical_robot_davinci.glb"

# Select ONLY the robot components (not environment, lights, camera)
bpy.ops.object.select_all(action='DESELECT')
base1.select_set(True)
arm1_seg1.select_set(True)
joint1.select_set(True)
arm1_seg2.select_set(True)
instrument1.select_set(True)
tip1.select_set(True)
base2.select_set(True)
arm2_seg1.select_set(True)
joint2.select_set(True)
arm2_seg2.select_set(True)
grasp_tool.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    export_animations=True,
    export_yup=True,
    use_selection=True
)

print(f"✅ Created Da Vinci Style Surgical Robot")
print(f"📤 Exported to: {output_path}")
print(f"🎬 Animation: {total_frames} frames at {fps} FPS")
print(f"Use in SnapLock: modelUrl: '/models/surgical_robot_davinci.glb'")
