import React from 'react';
import { Database, Box, Layers, Hand, Activity, Download, X } from 'lucide-react';

interface MLExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportCOCO: () => void;
  onExportYOLO: () => void;
  onExportDepth: () => void;
  onExportSegmentation: () => void;
  onExportVRPoses: () => void;
  onExportPhysics: () => void;
  recordedFrameCount: number;
}

export const MLExportModal: React.FC<MLExportModalProps> = ({
  isOpen,
  onClose,
  onExportCOCO,
  onExportYOLO,
  onExportDepth,
  onExportSegmentation,
  onExportVRPoses,
  onExportPhysics,
  recordedFrameCount
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-blue-500 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Export ML Training Dataset</h2>
            <p className="text-gray-400 text-sm">Synthetic data for auto-spatialization & XR systems</p>
            <p className="text-blue-400 text-xs mt-1 font-mono">
              {recordedFrameCount} frames captured • Physics ground truth • VR interaction data
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Export Format Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* COCO Dataset */}
          <ExportCard
            icon={<Box className="w-6 h-6" />}
            title="COCO Dataset"
            description="Object detection annotations with bounding boxes, segmentation masks, and keypoints"
            useCase="Training: Object detection, instance segmentation, pose estimation"
            format="JSON"
            onClick={onExportCOCO}
            status={recordedFrameCount > 0 ? 'ready' : 'no-data'}
          />

          {/* YOLO Dataset */}
          <ExportCard
            icon={<Box className="w-6 h-6" />}
            title="YOLO Format"
            description="Normalized bounding boxes in YOLO txt format with class labels"
            useCase="Training: YOLOv5/v8 object detection models"
            format="TXT"
            onClick={onExportYOLO}
            status={recordedFrameCount > 0 ? 'ready' : 'no-data'}
          />

          {/* Depth Maps */}
          <ExportCard
            icon={<Layers className="w-6 h-6" />}
            title="Depth Maps"
            description="Per-pixel depth information for 3D spatial understanding"
            useCase="Auto-spatialization: Room layout estimation, obstacle detection"
            format="PNG (16-bit)"
            onClick={onExportDepth}
            status="coming-soon"
          />

          {/* Segmentation Masks */}
          <ExportCard
            icon={<Layers className="w-6 h-6" />}
            title="Segmentation Masks"
            description="Semantic segmentation with per-pixel class labels (furniture, floor, objects)"
            useCase="Auto-spatialization: Scene understanding, spatial boundaries"
            format="PNG (indexed)"
            onClick={onExportSegmentation}
            status="coming-soon"
          />

          {/* VR Hand Poses */}
          <ExportCard
            icon={<Hand className="w-6 h-6" />}
            title="VR Hand Poses"
            description="68-joint skeletal hand poses with grasp annotations and interaction labels"
            useCase="Training: Hand tracking, grasp detection, manipulation prediction"
            format="HDF5"
            onClick={onExportVRPoses}
            status="coming-soon"
          />

          {/* Physics Ground Truth */}
          <ExportCard
            icon={<Activity className="w-6 h-6" />}
            title="Physics Ground Truth"
            description="Complete physics state: positions, velocities, forces, collisions, constraints"
            useCase="Validation: Physics-based ML models, simulation accuracy benchmarks"
            format="CSV/JSON"
            onClick={onExportPhysics}
            status="coming-soon"
          />

        </div>

        {/* Footer Note */}
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-200 mb-2">
            <strong>XR Auto-Spatialization Use Cases:</strong>
          </p>
          <ul className="text-xs text-blue-300 space-y-1 ml-4">
            <li>• <strong>Object Detection:</strong> COCO/YOLO formats for furniture & object localization</li>
            <li>• <strong>Spatial Understanding:</strong> Depth maps for 3D room layout reconstruction</li>
            <li>• <strong>Semantic Segmentation:</strong> Floor/wall/furniture classification for scene boundaries</li>
            <li>• <strong>Interaction Data:</strong> VR hand poses for natural gesture prediction</li>
            <li>• <strong>Physics Validation:</strong> Ground truth for collision-aware placement models</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

interface ExportCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  useCase: string;
  format: string;
  onClick: () => void;
  status: 'ready' | 'no-data' | 'coming-soon';
}

const ExportCard: React.FC<ExportCardProps> = ({
  icon,
  title,
  description,
  useCase,
  format,
  onClick,
  status
}) => {
  const isDisabled = status !== 'ready';

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        p-4 rounded-lg border-2 text-left transition-all
        ${isDisabled
          ? 'border-gray-700 bg-gray-800/50 cursor-not-allowed opacity-60'
          : 'border-blue-600 bg-blue-900/20 hover:bg-blue-800/30 hover:border-blue-400'
        }
      `}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded ${isDisabled ? 'bg-gray-700' : 'bg-blue-600'}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white mb-1">{title}</h3>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
            {format}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-300 mb-2">{description}</p>

      <p className="text-xs text-blue-400 mb-3">
        <strong>Use Case:</strong> {useCase}
      </p>

      <div className="flex items-center gap-2 text-xs">
        {status === 'ready' && (
          <>
            <Download className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-semibold">Ready to Export</span>
          </>
        )}
        {status === 'no-data' && (
          <span className="text-yellow-400">No frames recorded (start recording first)</span>
        )}
        {status === 'coming-soon' && (
          <span className="text-purple-400">Coming Soon</span>
        )}
      </div>
    </button>
  );
};
