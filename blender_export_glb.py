"""
Blender GLB Export Script for SnapLock
Exports all objects in a Blender scene to GLB format optimized for Three.js

Usage:
  blender myfile.blend --background --python blender_export_glb.py -- output.glb

Or from within Blender:
  Text Editor > New > Paste script > Run Script
"""

import bpy
import sys
import os

def export_to_glb(output_path):
    """Export current Blender scene to GLB format"""

    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Select all objects
    bpy.ops.object.select_all(action='SELECT')

    # Export settings optimized for Three.js
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',  # Binary format (smaller file size)

        # Include options
        export_extras=True,
        export_cameras=False,  # SnapLock generates its own camera
        export_lights=False,   # SnapLock uses Three.js lights

        # Transform options
        export_yup=True,  # Y-up coordinate system (Three.js default)

        # Geometry options
        export_apply=True,  # Apply modifiers
        export_texcoords=True,
        export_normals=True,
        export_tangents=True,
        export_colors=True,

        # Material options
        export_materials='EXPORT',
        export_image_format='AUTO',

        # Animation options
        export_animations=True,
        export_frame_range=True,
        export_current_frame=False,
        export_nla_strips=True,
        export_anim_single_armature=True,

        # Optimize
        export_draco_mesh_compression_enable=False,  # Disabled for compatibility
        export_vertex_color='ACTIVE',

        # Skinning
        export_skins=True,
        export_all_influences=False,
        export_morph=True,
        export_morph_normal=True,
        export_morph_tangent=True
    )

    print(f"✅ Exported to: {output_path}")
    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"📦 File size: {file_size_mb:.2f} MB")

    # Count objects
    num_objects = len(bpy.data.objects)
    num_meshes = len([obj for obj in bpy.data.objects if obj.type == 'MESH'])
    num_materials = len(bpy.data.materials)

    print(f"📊 Objects: {num_objects}, Meshes: {num_meshes}, Materials: {num_materials}")

    # Animation info
    if bpy.data.actions:
        print(f"🎬 Animations: {len(bpy.data.actions)}")
        for action in bpy.data.actions:
            print(f"  - {action.name}: {action.frame_range[1] - action.frame_range[0]} frames")

def optimize_scene():
    """Optimize scene for web/real-time rendering"""

    print("🔧 Optimizing scene...")

    # Set origin to geometry center for all objects
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')

    # Remove unused data
    bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)

    # Set smooth shading on all meshes
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.shade_smooth()

    print("✅ Optimization complete")

def main():
    # Get output path from command line args
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
        if len(argv) > 0:
            output_path = argv[0]
        else:
            output_path = "output.glb"
    else:
        # Default output path
        blend_file = bpy.data.filepath
        if blend_file:
            output_path = blend_file.replace('.blend', '.glb')
        else:
            output_path = "output.glb"

    print("=" * 60)
    print("🎨 Blender GLB Export for SnapLock")
    print("=" * 60)
    print(f"📁 Blend file: {bpy.data.filepath or 'Unsaved'}")
    print(f"📤 Output: {output_path}")
    print()

    # Optimize before export
    optimize_scene()

    # Export
    export_to_glb(output_path)

    print()
    print("=" * 60)
    print("✅ Export complete! Use in SnapLock:")
    print(f"   modelUrl: '/models/{os.path.basename(output_path)}'")
    print("=" * 60)

if __name__ == "__main__":
    main()
