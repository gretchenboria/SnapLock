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

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
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
  }

  /**
   * Clear frame buffer
   */
  static clearBuffer(): void {
    this.frameSequence = [];
    this.cocoDataset = null;
    this.annotationIdCounter = 0;
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

  /**
   * Validate COCO dataset format
   */
  static validateCOCO(dataset: COCODataset): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required top-level fields
    if (!dataset.info || !dataset.images || !dataset.annotations || !dataset.categories) {
      errors.push('Missing required COCO fields (info, images, annotations, categories)');
      return { valid: false, errors, warnings };
    }

    // Validate images
    const imageIds = new Set<number>();
    dataset.images.forEach((img, idx) => {
      if (typeof img.id !== 'number') errors.push(`Image ${idx}: Invalid ID type`);
      if (imageIds.has(img.id)) errors.push(`Image ${idx}: Duplicate ID ${img.id}`);
      imageIds.add(img.id);

      if (typeof img.width !== 'number' || img.width <= 0) {
        errors.push(`Image ${img.id}: Invalid width`);
      }
      if (typeof img.height !== 'number' || img.height <= 0) {
        errors.push(`Image ${img.id}: Invalid height`);
      }
      if (!img.file_name) errors.push(`Image ${img.id}: Missing file_name`);
    });

    // Validate annotations
    const annotationIds = new Set<number>();
    const categoryIds = new Set(dataset.categories.map(c => c.id));

    dataset.annotations.forEach((ann, idx) => {
      if (typeof ann.id !== 'number') errors.push(`Annotation ${idx}: Invalid ID type`);
      if (annotationIds.has(ann.id)) errors.push(`Annotation ${idx}: Duplicate ID ${ann.id}`);
      annotationIds.add(ann.id);

      if (!imageIds.has(ann.image_id)) {
        errors.push(`Annotation ${ann.id}: References non-existent image ${ann.image_id}`);
      }
      if (!categoryIds.has(ann.category_id)) {
        errors.push(`Annotation ${ann.id}: References non-existent category ${ann.category_id}`);
      }

      // Validate bbox format [x, y, width, height]
      if (!Array.isArray(ann.bbox) || ann.bbox.length !== 4) {
        errors.push(`Annotation ${ann.id}: Invalid bbox format (expected [x,y,w,h])`);
      } else {
        const [x, y, w, h] = ann.bbox;
        if (w < 0 || h < 0) errors.push(`Annotation ${ann.id}: Negative bbox dimensions`);
        if (w === 0 || h === 0) warnings.push(`Annotation ${ann.id}: Zero-area bbox`);
      }

      if (typeof ann.area !== 'number' || ann.area < 0) {
        errors.push(`Annotation ${ann.id}: Invalid area`);
      }

      // Check for empty segmentation (documented limitation)
      if (Array.isArray(ann.segmentation) && ann.segmentation.length === 0) {
        if (warnings.length < 1) { // Only warn once
          warnings.push('Segmentation masks are empty (not implemented)');
        }
      }
    });

    // Validate categories
    const categoryNames = new Set<string>();
    dataset.categories.forEach((cat, idx) => {
      if (typeof cat.id !== 'number') errors.push(`Category ${idx}: Invalid ID type`);
      if (!cat.name) errors.push(`Category ${idx}: Missing name`);
      if (categoryNames.has(cat.name)) warnings.push(`Category ${cat.name}: Duplicate name`);
      categoryNames.add(cat.name);
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate YOLO annotation format
   */
  static validateYOLO(annotations: YOLOAnnotation[], numClasses: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    annotations.forEach((ann, idx) => {
      // Validate class ID
      if (typeof ann.classId !== 'number' || !Number.isInteger(ann.classId)) {
        errors.push(`Annotation ${idx}: Class ID must be integer`);
      }
      if (ann.classId < 0 || ann.classId >= numClasses) {
        errors.push(`Annotation ${idx}: Class ID ${ann.classId} out of range [0, ${numClasses - 1}]`);
      }

      // Validate normalized coordinates (0-1 range)
      const coords = [
        { name: 'x_center', value: ann.x_center },
        { name: 'y_center', value: ann.y_center },
        { name: 'width', value: ann.width },
        { name: 'height', value: ann.height }
      ];

      coords.forEach(({ name, value }) => {
        if (typeof value !== 'number') {
          errors.push(`Annotation ${idx}: ${name} must be number`);
        } else if (value < 0 || value > 1) {
          errors.push(`Annotation ${idx}: ${name} must be in range [0, 1], got ${value}`);
        } else if (value === 0 && (name === 'width' || name === 'height')) {
          warnings.push(`Annotation ${idx}: Zero ${name}`);
        }
      });

      // Validate confidence (optional)
      if (ann.confidence !== undefined) {
        if (typeof ann.confidence !== 'number' || ann.confidence < 0 || ann.confidence > 1) {
          warnings.push(`Annotation ${idx}: Invalid confidence value ${ann.confidence}`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get validation summary for current buffer
   */
  static validateCurrentBuffer(): {
    coco: ValidationResult;
    yolo: ValidationResult;
    summary: string;
  } {
    if (this.frameSequence.length === 0) {
      return {
        coco: { valid: false, errors: ['No frames in buffer'], warnings: [] },
        yolo: { valid: false, errors: ['No frames in buffer'], warnings: [] },
        summary: 'No data to validate'
      };
    }

    // Validate COCO
    const cocoDataset = this.exportSequenceCOCO();
    const cocoValidation = this.validateCOCO(cocoDataset);

    // Validate YOLO (sample first frame)
    const yoloAnnotations = this.exportFrameYOLO(this.frameSequence[0]);
    const numClasses = this.getCategories().length;
    const yoloValidation = this.validateYOLO(yoloAnnotations, numClasses);

    const summary = [
      `Frames: ${this.frameSequence.length}`,
      `COCO: ${cocoValidation.valid ? 'VALID' : 'INVALID'}`,
      `YOLO: ${yoloValidation.valid ? 'VALID' : 'INVALID'}`,
      `Errors: ${cocoValidation.errors.length + yoloValidation.errors.length}`,
      `Warnings: ${cocoValidation.warnings.length + yoloValidation.warnings.length}`
    ].join(' | ');

    return { coco: cocoValidation, yolo: yoloValidation, summary };
  }
}
