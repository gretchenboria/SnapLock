#!/usr/bin/env python3
"""
NVIDIA Omniverse USD Asset Download and Conversion Pipeline
Focuses on SimReady assets (physics-enabled) for ML training data generation
"""

import os
import requests
import json
from pathlib import Path
from typing import List, Dict
import subprocess
import shutil

# Asset configuration - curated subset for robotics/VR ML training
NVIDIA_ASSETS = {
    "simready_warehouse_01": {
        "url": "https://omniverse-content-production.s3-us-west-2.amazonaws.com/Assets/ArchVis/Commercial/Warehouse/SimReady_Props_Warehouse_01.zip",
        "category": "warehouse",
        "physics": True,
        "description": "Physics-enabled warehouse props (pallets, crates, barrels)"
    },
    "simready_containers": {
        "url": "https://omniverse-content-production.s3-us-west-2.amazonaws.com/Assets/ArchVis/Industrial/Shipping_Containers/SimReady_Containers_and_Shipping_01.zip",
        "category": "industrial",
        "physics": True,
        "description": "Industrial shipping containers and cargo boxes"
    },
    "simready_furniture": {
        "url": "https://omniverse-content-production.s3-us-west-2.amazonaws.com/Assets/ArchVis/Commercial/Furniture/SimReady_Furniture_and_Misc.zip",
        "category": "furniture",
        "physics": True,
        "description": "Interior and exterior furniture with physics"
    }
}

class AssetPipeline:
    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
        self.download_dir = self.base_dir / "downloads" / "usd"
        self.output_dir = self.base_dir / "public" / "assets"
        self.metadata_file = self.output_dir / "asset_registry.json"

        # Create directories
        self.download_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.registry: Dict[str, List[Dict]] = {}

    def download_asset_pack(self, pack_id: str, config: Dict) -> Path:
        """Download a NVIDIA asset pack"""
        print(f"\n📦 Downloading {pack_id}...")
        print(f"   {config['description']}")

        zip_path = self.download_dir / f"{pack_id}.zip"

        if zip_path.exists():
            print(f"   ✓ Already downloaded: {zip_path}")
            return zip_path

        try:
            response = requests.get(config['url'], stream=True)
            response.raise_for_status()

            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0

            with open(zip_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"\r   Progress: {percent:.1f}%", end='', flush=True)

            print(f"\n   ✓ Downloaded: {zip_path}")
            return zip_path

        except Exception as e:
            print(f"\n   ✗ Failed to download: {e}")
            raise

    def extract_pack(self, zip_path: Path, pack_id: str) -> Path:
        """Extract USD asset pack"""
        extract_dir = self.download_dir / pack_id

        if extract_dir.exists():
            print(f"   ✓ Already extracted: {extract_dir}")
            return extract_dir

        print(f"   📂 Extracting {zip_path.name}...")

        try:
            import zipfile
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            print(f"   ✓ Extracted to: {extract_dir}")
            return extract_dir
        except Exception as e:
            print(f"   ✗ Failed to extract: {e}")
            raise

    def find_usd_files(self, directory: Path) -> List[Path]:
        """Find all USD files in directory"""
        usd_extensions = ['.usd', '.usda', '.usdc', '.usdz']
        usd_files = []

        for ext in usd_extensions:
            usd_files.extend(directory.rglob(f'*{ext}'))

        return usd_files

    def convert_usd_to_gltf(self, usd_file: Path, output_path: Path) -> bool:
        """Convert USD file to GLTF using available tools"""
        print(f"   🔄 Converting {usd_file.name}...")

        # Try usd2gltf if available
        if shutil.which('usd2gltf'):
            try:
                subprocess.run([
                    'usd2gltf',
                    str(usd_file),
                    '-o', str(output_path)
                ], check=True, capture_output=True)
                print(f"   ✓ Converted: {output_path.name}")
                return True
            except subprocess.CalledProcessError as e:
                print(f"   ✗ usd2gltf failed: {e}")

        # Try Blender USD import/export if available
        if shutil.which('blender'):
            try:
                blender_script = f"""
import bpy
bpy.ops.wm.usd_import(filepath="{usd_file}")
bpy.ops.export_scene.gltf(filepath="{output_path}", export_format='GLB')
bpy.ops.wm.quit_blender()
"""
                script_path = self.download_dir / "convert.py"
                script_path.write_text(blender_script)

                subprocess.run([
                    'blender',
                    '--background',
                    '--python', str(script_path)
                ], check=True, capture_output=True)

                print(f"   ✓ Converted via Blender: {output_path.name}")
                return True
            except subprocess.CalledProcessError as e:
                print(f"   ✗ Blender conversion failed: {e}")

        print(f"   ⚠️  No USD converter available (tried: usd2gltf, blender)")
        print(f"   ℹ️  Install: pip install usd-core gltfpack")
        return False

    def generate_thumbnail(self, gltf_path: Path, thumbnail_path: Path) -> bool:
        """Generate thumbnail preview of 3D model"""
        # Would use Three.js headless rendering or Blender
        # For now, placeholder
        return False

    def process_asset_pack(self, pack_id: str, config: Dict):
        """Download, extract, convert, and catalog asset pack"""
        print(f"\n{'='*60}")
        print(f"Processing: {pack_id}")
        print(f"{'='*60}")

        # Download
        zip_path = self.download_asset_pack(pack_id, config)

        # Extract
        extract_dir = self.extract_pack(zip_path, pack_id)

        # Find USD files
        usd_files = self.find_usd_files(extract_dir)
        print(f"\n   Found {len(usd_files)} USD files")

        # Convert to GLTF
        category_dir = self.output_dir / config['category']
        category_dir.mkdir(exist_ok=True)

        converted_assets = []

        for i, usd_file in enumerate(usd_files[:10]):  # Limit to first 10 for testing
            asset_name = usd_file.stem
            gltf_output = category_dir / f"{asset_name}.glb"

            if self.convert_usd_to_gltf(usd_file, gltf_output):
                asset_metadata = {
                    "id": f"{pack_id}_{asset_name}",
                    "name": asset_name.replace('_', ' ').title(),
                    "path": f"/assets/{config['category']}/{asset_name}.glb",
                    "category": config['category'],
                    "physics_enabled": config['physics'],
                    "source": "NVIDIA Omniverse",
                    "thumbnail": f"/assets/{config['category']}/{asset_name}_thumb.jpg"
                }
                converted_assets.append(asset_metadata)

        # Update registry
        if config['category'] not in self.registry:
            self.registry[config['category']] = []
        self.registry[config['category']].extend(converted_assets)

        print(f"\n   ✓ Processed {len(converted_assets)} assets")

    def save_registry(self):
        """Save asset registry to JSON"""
        with open(self.metadata_file, 'w') as f:
            json.dump(self.registry, f, indent=2)
        print(f"\n📋 Asset registry saved: {self.metadata_file}")
        print(f"   Total assets: {sum(len(assets) for assets in self.registry.values())}")

    def run(self):
        """Run full pipeline"""
        print("\n" + "="*60)
        print("NVIDIA OMNIVERSE ASSET PIPELINE")
        print("="*60)
        print("\nThis will download, convert, and catalog NVIDIA USD assets")
        print("for use in SnapLock ML training data generation.")
        print("\nRequired tools:")
        print("  - usd2gltf (pip install usd-core) OR")
        print("  - Blender 3.0+ with USD support")
        print("\n" + "="*60)

        for pack_id, config in NVIDIA_ASSETS.items():
            try:
                self.process_asset_pack(pack_id, config)
            except Exception as e:
                print(f"\n✗ Failed to process {pack_id}: {e}")
                continue

        self.save_registry()

        print("\n" + "="*60)
        print("✓ PIPELINE COMPLETE")
        print("="*60)
        print(f"\nAssets location: {self.output_dir}")
        print(f"Registry file: {self.metadata_file}")
        print("\nNext steps:")
        print("1. Review asset_registry.json")
        print("2. Generate thumbnails (optional)")
        print("3. Update SnapLock UI to load from registry")


if __name__ == "__main__":
    pipeline = AssetPipeline(base_dir="/Users/dr.gretchenboria/SnapLock")
    pipeline.run()
