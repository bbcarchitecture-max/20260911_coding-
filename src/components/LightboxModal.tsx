import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, RotateCcw } from 'lucide-react';

interface LightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName?: string;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  fileName = 'IMAGE PREVIEW'
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen) return null;

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName || 'attachment.png';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      id="lightbox-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between items-center p-4 select-none"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="w-full max-w-5xl flex items-center justify-between py-2.5 px-4 bg-white text-black border-2 border-black"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center space-x-3 truncate">
          <span className="font-serif font-bold text-sm truncate uppercase tracking-wider">{fileName}</span>
          <span className="font-mono text-xs px-2 py-0.5 border border-black bg-neutral-100">
            {Math.round(scale * 100)}% | {rotation}°
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 font-mono text-xs">
          <button
            id="lightbox-btn-zoom-in"
            title="Zoom In"
            onClick={handleZoomIn}
            className="p-1.5 border border-black hover:bg-black hover:text-white transition-colors duration-100"
          >
            <ZoomIn className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            id="lightbox-btn-zoom-out"
            title="Zoom Out"
            onClick={handleZoomOut}
            className="p-1.5 border border-black hover:bg-black hover:text-white transition-colors duration-100"
          >
            <ZoomOut className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            id="lightbox-btn-rotate"
            title="Rotate 90"
            onClick={handleRotate}
            className="p-1.5 border border-black hover:bg-black hover:text-white transition-colors duration-100"
          >
            <RotateCw className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            id="lightbox-btn-reset"
            title="Reset"
            onClick={handleReset}
            className="p-1.5 border border-black hover:bg-black hover:text-white transition-colors duration-100"
          >
            <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <div className="h-4 w-px bg-black mx-1"></div>
          <button
            id="lightbox-btn-download"
            title="Download"
            onClick={handleDownload}
            className="px-2.5 py-1.5 border border-black bg-black text-white hover:bg-white hover:text-black transition-colors duration-100 flex items-center space-x-1 uppercase text-[11px] font-bold"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={2} />
            <span>DOWNLOAD</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 border border-black hover:bg-black hover:text-white transition-colors duration-100"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="flex-1 w-full flex items-center justify-center p-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={fileName}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transition: 'transform 100ms cubic-bezier(0, 0, 1, 1)'
          }}
          className="max-h-[80vh] max-w-[90vw] object-contain border-2 border-white"
        />
      </div>

      {/* Bottom info banner */}
      <div
        className="text-[10px] font-mono text-white bg-black border border-white px-3 py-1 uppercase tracking-widest"
        onClick={e => e.stopPropagation()}
      >
        MINIMALIST MONOCHROME SPECIFICATION VIEWER
      </div>
    </div>
  );
};
