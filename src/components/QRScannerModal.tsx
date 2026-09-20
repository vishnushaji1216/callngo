'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, X, Upload, AlertCircle, Sparkles } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedCarId: string) => void;
  title?: string;
  subtitle?: string;
}

export function QRScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Scan CallNGo QR Sticker',
  subtitle = 'Point your camera at the QR code sticker to activate'
}: QRScannerModalProps) {
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to extract carId from URL or raw ID
  const extractCarId = (text: string): string => {
    const trimmed = text.trim();
    // Matches /c/<carId> in URL
    const urlMatch = trimmed.match(/\/c\/([a-zA-Z0-9_-]+)/i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
    // Or if scanned text is directly an ID
    return trimmed;
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        const detectedId = extractCarId(code.data);
        if (detectedId) {
          stopCamera();
          onScan(detectedId);
          return;
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      setScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setHasCamera(false);
      setCameraError(err.message || 'Camera permission denied or camera unavailable');
      setScanning(false);
    }
  };

  // Handle uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            const detectedId = extractCarId(code.data);
            stopCamera();
            onScan(detectedId);
          } else {
            alert('Could not find a valid CallNGo QR code in this image. Please try another image or point camera.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl relative flex flex-col items-center text-center overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B5822B] mb-1 font-mono">
          <Sparkles className="w-4 h-4 text-[#B5822B]" />
          QR SCANNER
        </div>

        <h3 className="text-xl font-bold text-gray-900 font-serif mb-1">
          {title}
        </h3>

        <p className="text-xs text-gray-500 mb-4 max-w-xs">
          {subtitle}
        </p>

        {/* Camera Viewport */}
        <div className="w-64 h-64 rounded-2xl bg-black relative overflow-hidden flex items-center justify-center shadow-inner border-2 border-gray-800">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Overlay Frame */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-[#FFDF00] rounded-xl relative shadow-lg">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-[#FFDF00] rounded-tl" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-[#FFDF00] rounded-tr" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-[#FFDF00] rounded-bl" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-[#FFDF00] rounded-br" />

              {/* Animated Laser line */}
              {scanning && (
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#FFDF00] to-transparent shadow-[0_0_8px_#FFDF00] animate-pulse absolute top-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>

          {/* Camera Error / Fallback */}
          {cameraError && (
            <div className="absolute inset-0 bg-black/90 p-4 flex flex-col items-center justify-center text-white text-xs gap-2">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <p className="text-center text-gray-300">Camera access not available.</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-4 py-2 rounded-xl bg-[#4A2E20] text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload QR Image
              </button>
            </div>
          )}
        </div>

        {/* Upload Fallback Button */}
        <div className="mt-4 w-full flex flex-col items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold text-gray-600 hover:text-black flex items-center gap-1.5 transition py-1"
          >
            <Upload className="w-3.5 h-3.5 text-[#B5822B]" />
            Upload photo of sticker QR
          </button>
        </div>
      </div>
    </div>
  );
}
