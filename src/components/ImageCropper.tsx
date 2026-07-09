import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import { X, Check } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImageBase64: string) => void;
  onCancel: () => void;
  aspectRatio?: number;
  title?: string;
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel, aspectRatio = 1, title = "Crop Logo" }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [currentAspect, setCurrentAspect] = useState<number>(aspectRatio);
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const handleCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showCroppedImage = useCallback(async () => {
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedImage) {
        onCropComplete(croppedImage);
      }
    } catch (e) {
      console.error(e);
    }
  }, [imageSrc, croppedAreaPixels, onCropComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl overflow-hidden w-full max-w-md shadow-2xl">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onCancel} className="text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="relative w-full h-80 bg-black/50">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={currentAspect}
            onCropChange={setCrop}
            onCropComplete={handleCropComplete}
            onZoomChange={setZoom}
          />
        </div>
        
        <div className="p-4 bg-white/[0.02]">
          
          {title === "Crop Background" && (
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => setCurrentAspect(16/9)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentAspect === 16/9 ? "bg-indigo-500 text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}
              >
                16:9 (PC)
              </button>
              <button 
                onClick={() => setCurrentAspect(9/16)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentAspect === 9/16 ? "bg-indigo-500 text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}
              >
                9:16 (Mobile)
              </button>
            </div>
          )}
          <label className="block text-sm text-zinc-400 mb-2">Zoom</label>

          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          
          <div className="mt-6 flex gap-3 justify-end">
            <button 
              onClick={onCancel}
              className="px-4 py-2 text-zinc-400 hover:text-white font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={showCroppedImage}
              className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)] flex items-center gap-2"
            >
              <Check size={18} /> Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
