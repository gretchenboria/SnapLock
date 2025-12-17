import * as THREE from 'three';

/**
 * TextureManager - Handles conversion of base64 images to THREE.Texture
 *
 * Features:
 * - Base64 to texture conversion
 * - Texture caching to avoid redundant loads
 * - Automatic disposal of old textures
 * - Image downscaling for GPU memory management
 */

interface TextureEntry {
  texture: THREE.Texture;
  timestamp: number;
}

export class TextureManager {
  private cache: Map<string, TextureEntry> = new Map();
  private readonly MAX_CACHE_SIZE = 10;
  private readonly MAX_TEXTURE_SIZE = 1024; // Downscale images larger than this

  /**
   * Load texture from base64 data URL
   * Caches textures to avoid redundant loads
   */
  async loadTextureFromBase64(base64: string, id: string): Promise<THREE.Texture> {
    // Check cache first
    if (this.cache.has(id)) {
      const entry = this.cache.get(id)!;
      entry.timestamp = Date.now(); // Update access time
      return entry.texture;
    }

    // Enforce cache size limit
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.disposeOldest();
    }

    // Create image element
    const img = await this.loadImageFromBase64(base64);

    // Downscale if necessary
    const processedImg = this.maybeDownscale(img);

    // Create texture
    const texture = new THREE.Texture(processedImg);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    texture.generateMipmaps = false; // Disable for performance

    // Add to cache
    this.cache.set(id, {
      texture,
      timestamp: Date.now(),
    });

    return texture;
  }

  /**
   * Load HTMLImageElement from base64
   */
  private loadImageFromBase64(base64: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error('Failed to load image from base64'));

      // Set crossOrigin to avoid CORS issues
      img.crossOrigin = 'anonymous';
      img.src = base64;
    });
  }

  /**
   * Downscale image if it exceeds MAX_TEXTURE_SIZE
   */
  private maybeDownscale(img: HTMLImageElement): HTMLImageElement | HTMLCanvasElement {
    const maxDim = Math.max(img.width, img.height);

    if (maxDim <= this.MAX_TEXTURE_SIZE) {
      return img; // No downscaling needed
    }

    // Calculate new dimensions maintaining aspect ratio
    const scale = this.MAX_TEXTURE_SIZE / maxDim;
    const newWidth = Math.floor(img.width * scale);
    const newHeight = Math.floor(img.height * scale);

    // Create canvas for downscaling
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('Failed to get 2D context for downscaling, using original image');
      return img;
    }

    // Draw downscaled image
    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    console.log(`🖼️ Downscaled image from ${img.width}x${img.height} to ${newWidth}x${newHeight}`);

    return canvas;
  }

  /**
   * Dispose oldest texture from cache
   */
  private disposeOldest(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    // Find oldest entry
    this.cache.forEach((entry, id) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestId = id;
      }
    });

    if (oldestId) {
      this.dispose(oldestId);
    }
  }

  /**
   * Dispose texture by ID
   */
  dispose(id: string): void {
    const entry = this.cache.get(id);
    if (entry) {
      entry.texture.dispose();
      this.cache.delete(id);
      console.log(`🗑️ Disposed texture: ${id}`);
    }
  }

  /**
   * Dispose all textures
   */
  disposeAll(): void {
    this.cache.forEach((entry) => {
      entry.texture.dispose();
    });
    this.cache.clear();
    console.log('🗑️ Disposed all textures');
  }

  /**
   * Get current cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Get texture by ID (if exists in cache)
   */
  getTexture(id: string): THREE.Texture | null {
    const entry = this.cache.get(id);
    return entry ? entry.texture : null;
  }
}

// Singleton instance for global use
export const textureManager = new TextureManager();
