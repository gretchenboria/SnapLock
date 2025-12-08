/**
 * ML GROUND TRUTH EXPORT SERVICE
 *
 * Exports simulation data in standard ML training formats:
 * - COCO JSON (object detection)
 * - YOLO format (bounding boxes)
 * - Custom JSON with full metadata
 */

import { MLGroundTruthFrame, ParticleSnapshot } from '../types';

export interface COCODataset {
  info: {
    description: string;
    version: string;
    year: number;
    contributor: string;
    date_created: string;
  };
  licenses: Array<{ id: number; name: string; url: string }>;
  images: Array<{
    id: number;
    width: number;
    height: number;
    file_name: string;
    license: number;
    date_captured: string;
    camera_intrinsics: any;
    camera_extrinsics: any;
  }>;
  annotations: Array<{
    id: number;
    image_id: number;
    category_id: number;
    bbox: [number, number, number, number]; // [x, y, width, height]
    area: number;
    segmentation: number[][];
    iscrowd: number;
    attributes: {
      pose_3d: any;
      velocity: any;
      angular_velocity: any;
      distance_from_camera: number;
      occlusion_level: number;
    };
  }>;
  categories: Array<{
    id: number;
    name: string;
    supercategory: string;
  }>;
}

export interface YOLOAnnotation {
  classId: number;
  x_center: number; // normalized 0-1
  y_center: number; // normalized 0-1
  width: number;    // normalized 0-1
  height: number;   // normalized 0-1
  confidence: number;
}

export class MLExportService {
  private static frameSequence: MLGroundTruthFrame[] = [];
  private static cocoDataset: COCODataset | null = null;
  private static annotationIdCounter = 0;

  /**
   * Add frame to sequence buffer
   */
  static addFrame(frame: MLGroundTruthFrame): void {
    this.frameSequence.push(frame);
    console.log(`[MLExport] Frame ${frame.frameNumber} buffered (${this.frameSequence.length} total)`);
  }

  /**
   * Clear frame buffer
   */
  static clearBuffer(): void {
    this.frameSequence = [];
    this.cocoDataset = null;
    this.annotationIdCounter = 0;
    console.log('[MLExport] Buffer cleared');
  }

  /**
   * Get current buffer size
   */
  static getBufferSize(): number {
    return this.frameSequence.length;
  }

  /**
   * Export single frame as JSON
   */
  static exportFrameJSON(frame: MLGroundTruthFrame): string {
    return JSON.stringify(frame, null, 2);
  }

  /**
   * Export frame as COCO format
   */
  static exportFrameCOCO(frame: MLGroundTruthFrame, imageId: number): {
    image: any;
    annotations: any[];
  } {
    const intrinsics = frame.camera.intrinsics;
    const extrinsics = frame.camera.extrinsics;

    const image = {
      id: imageId,
      width: intrinsics.resolution.width,
      height: intrinsics.resolution.height,
      file_name: `frame_${String(frame.frameNumber).padStart(6, '0')}.png`,
      license: 1,
      date_captured: new Date(frame.timestamp).toISOString(),
      camera_intrinsics: intrinsics,
      camera_extrinsics: extrinsics
    };

    const annotations = frame.objects
      .filter(obj => obj.inFrustum && obj.boundingBox2D.confidence > 0)
      .map(obj => {
        const bbox = obj.boundingBox2D;
        const width = bbox.xMax - bbox.xMin;
        const height = bbox.yMax - bbox.yMin;
        const area = width * height;

        return {
          id: this.annotationIdCounter++,
          image_id: imageId,
          category_id: this.getCategoryIdFromClass(obj.class),
          bbox: [bbox.xMin, bbox.yMin, width, height],
          area,
          segmentation: [], // Would need mask generation for full segmentation
          iscrowd: 0,
          attributes: {
            pose_3d: obj.pose3D,
            velocity: obj.velocity,
            angular_velocity: obj.angularVelocity,
            distance_from_camera: obj.distanceFromCamera,
            occlusion_level: obj.occlusionLevel
          }
        };
      });

    return { image, annotations };
  }

  /**
   * Export frame as YOLO format
   */
  static exportFrameYOLO(frame: MLGroundTruthFrame): YOLOAnnotation[] {
    const width = frame.camera.intrinsics.resolution.width;
    const height = frame.camera.intrinsics.resolution.height;

    return frame.objects
      .filter(obj => obj.inFrustum && obj.boundingBox2D.confidence > 0)
      .map(obj => {
        const bbox = obj.boundingBox2D;
        const bboxWidth = bbox.xMax - bbox.xMin;
        const bboxHeight = bbox.yMax - bbox.yMin;

        // Convert to YOLO format (normalized center coordinates)
        const x_center = (bbox.xMin + bboxWidth / 2) / width;
        const y_center = (bbox.yMin + bboxHeight / 2) / height;
        const norm_width = bboxWidth / width;
        const norm_height = bboxHeight / height;

        return {
          classId: this.getCategoryIdFromClass(obj.class),
          x_center,
          y_center,
          width: norm_width,
          height: norm_height,
          confidence: bbox.confidence
        };
      });
  }

  /**
   * Export entire sequence as COCO dataset
   */
  static exportSequenceCOCO(): COCODataset {
    if (this.frameSequence.length === 0) {
      throw new Error('No frames in buffer to export');
    }

    // Initialize dataset structure
    const dataset: COCODataset = {
      info: {
        description: 'SnapLock Synthetic Training Data',
        version: '2.0',
        year: new Date().getFullYear(),
        contributor: 'SnapLock Physics Simulator',
        date_created: new Date().toISOString()
      },
      licenses: [
        {
          id: 1,
          name: 'Synthetic Data License',
          url: 'https://github.com/gretchenboria/SnapLock'
        }
      ],
      images: [],
      annotations: [],
      categories: this.getCategories()
    };

    // Process each frame
    this.frameSequence.forEach((frame, index) => {
      const { image, annotations } = this.exportFrameCOCO(frame, index);
      dataset.images.push(image);
      dataset.annotations.push(...annotations);
    });

    console.log(`[MLExport] COCO dataset created: ${dataset.images.length} images, ${dataset.annotations.length} annotations`);

    return dataset;
  }

  /**
   * Export sequence as YOLO format (multiple files)
   */
  static exportSequenceYOLO(): Map<string, string> {
    if (this.frameSequence.length === 0) {
      throw new Error('No frames in buffer to export');
    }

    const files = new Map<string, string>();

    // Create labels for each frame
    this.frameSequence.forEach((frame) => {
      const annotations = this.exportFrameYOLO(frame);
      const fileName = `frame_${String(frame.frameNumber).padStart(6, '0')}.txt`;

      const content = annotations
        .map(ann => `${ann.classId} ${ann.x_center} ${ann.y_center} ${ann.width} ${ann.height}`)
        .join('\n');

      files.set(fileName, content);
    });

    // Create classes file
    const categories = this.getCategories();
    const classesContent = categories.map(c => c.name).join('\n');
    files.set('classes.txt', classesContent);

    // Create data.yaml for YOLO
    const yamlContent = `
train: ./images/train
val: ./images/val
nc: ${categories.length}
names: [${categories.map(c => `'${c.name}'`).join(', ')}]
`;
    files.set('data.yaml', yamlContent.trim());

    console.log(`[MLExport] YOLO dataset created: ${files.size} files`);

    return files;
  }

  /**
   * Export raw CSV (legacy format)
   */
  static exportFrameCSV(snapshots: ParticleSnapshot[]): string {
    if (snapshots.length === 0) return '';

    const headers = [
      'id',
      'groupId',
      'shape',
      'mass',
      'pos_x', 'pos_y', 'pos_z',
      'vel_x', 'vel_y', 'vel_z',
      'rot_x', 'rot_y', 'rot_z',
      'angVel_x', 'angVel_y', 'angVel_z'
    ].join(',');

    const rows = snapshots.map(s => {
      return [
        s.id,
        s.groupId,
        s.shape,
        s.mass,
        s.position.x.toFixed(6), s.position.y.toFixed(6), s.position.z.toFixed(6),
        s.velocity.x.toFixed(6), s.velocity.y.toFixed(6), s.velocity.z.toFixed(6),
        s.rotation.x.toFixed(6), s.rotation.y.toFixed(6), s.rotation.z.toFixed(6),
        s.angularVelocity?.x.toFixed(6) || '0', s.angularVelocity?.y.toFixed(6) || '0', s.angularVelocity?.z.toFixed(6) || '0'
      ].join(',');
    });

    return [headers, ...rows].join('\n');
  }

  /**
   * Download file to user's computer
   */
  static downloadFile(filename: string, content: string, mimeType: string = 'text/plain'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Download multiple files as ZIP
   */
  static async downloadZip(files: Map<string, string>, zipName: string): Promise<void> {
    // Note: Would need JSZip library for actual zip creation
    // For now, download individual files
    console.log(`[MLExport] Downloading ${files.size} files (ZIP support requires JSZip library)`);

    files.forEach((content, filename) => {
      this.downloadFile(filename, content);
    });
  }

  /**
   * Get category definitions
   */
  private static getCategories(): Array<{ id: number; name: string; supercategory: string }> {
    return [
      { id: 0, name: 'CUBE', supercategory: 'primitive' },
      { id: 1, name: 'SPHERE', supercategory: 'primitive' },
      { id: 2, name: 'CYLINDER', supercategory: 'primitive' },
      { id: 3, name: 'CONE', supercategory: 'primitive' },
      { id: 4, name: 'TORUS', supercategory: 'primitive' },
      { id: 5, name: 'ICOSAHEDRON', supercategory: 'primitive' },
      { id: 6, name: 'CAPSULE', supercategory: 'primitive' },
      { id: 7, name: 'PYRAMID', supercategory: 'primitive' },
      { id: 8, name: 'PLATE', supercategory: 'primitive' },
      { id: 9, name: 'MODEL', supercategory: 'custom' }
    ];
  }

  /**
   * Map class name to category ID
   */
  private static getCategoryIdFromClass(className: string): number {
    const categories = this.getCategories();
    const category = categories.find(c => c.name === className);
    return category ? category.id : 0;
  }

  /**
   * Export full dataset with all metadata
   */
  static exportFullDataset(): {
    coco: COCODataset;
    yolo: Map<string, string>;
    metadata: {
      totalFrames: number;
      totalObjects: number;
      simulationIds: string[];
      dateExported: string;
      engineVersion: string;
    };
  } {
    const coco = this.exportSequenceCOCO();
    const yolo = this.exportSequenceYOLO();

    const simulationIds = [...new Set(this.frameSequence.map(f => f.metadata.simulationId))];
    const totalObjects = this.frameSequence.reduce((sum, f) => sum + f.objects.length, 0);

    return {
      coco,
      yolo,
      metadata: {
        totalFrames: this.frameSequence.length,
        totalObjects,
        simulationIds,
        dateExported: new Date().toISOString(),
        engineVersion: this.frameSequence[0]?.metadata.engineVersion || 'unknown'
      }
    };
  }
}
