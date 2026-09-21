'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera, Upload, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ScanPage() {
  const router = useRouter();

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(true);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const extractCarId = (text: string): string => {
    const trimmed = text.trim();
    const urlMatch = trimmed.match(/\/c\/([a-zA-Z0-9_-]+)/i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
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

  const handleDetectedCode = async (rawCode: string) => {
    stopCamera();
    const detectedId = extractCarId(rawCode);
    if (!detectedId) return;

    try {
      setVerifying(true);
      setScanMessage(null);

      const res = await fetch(`/api/cars/${detectedId}/public`);
      if (!res.ok) throw new Error('Could not check vehicle sticker');
      const data = await res.json();

      if (data.is_activated) {
        setScanMessage({
          type: 'error',
          text: '⚠️ This sticker has already been claimed and linked to a vehicle! Please scan an unassigned sticker.'
        });
      } else {
        setScanMessage({
          type: 'success',
          text: '✅ Unclaimed Sticker Verified! Redirecting to registration...'
        });
        setTimeout(() => {
          router.push(`/c/${detectedId}`);
        }, 1000);
      }
    } catch (err: any) {
      setScanMessage({ type: 'error', text: err.message || 'Failed to verify sticker' });
    } finally {
      setVerifying(false);
    }
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
        handleDetectedCode(code.data);
        return;
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
            handleDetectedCode(code.data);
          } else {
            alert('Could not find a valid QR code in this image. Please try another image or point camera.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] flex flex-col items-center justify-between p-4 sm:p-8 font-sans">
      {/* Top Navigation */}
      <header className="w-full max-w-md flex items-center justify-between py-3 border-b border-[#E4DCD0]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#4A2E20] hover:text-black transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>

        <div className="flex items-center gap-1.5 font-serif font-bold text-sm text-[#2C1A12]">
          <img
            src="/logo.png"
            alt="CallNGo Logo"
            className="w-6 h-6 rounded-md object-contain"
          />
          <span>Scan Sticker</span>
        </div>

        <Link
          href="/buy"
          className="text-xs font-semibold text-[#B5822B] hover:underline"
        >
          Buy Tags
        </Link>
      </header>

      {/* Main Scanner Section */}
      <div className="w-full max-w-md my-auto flex flex-col items-center text-center py-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF6EE] border border-[#E4DCD0] text-[#B5822B] text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#B5822B]" />
          Vehicle Sticker Activation
        </div>

        <h1 className="text-2xl font-bold font-serif text-[#2C1A12] mb-1">
          Scan CallNGo QR Sticker
        </h1>
        <p className="text-xs text-[#7A6657] mb-6 max-w-xs leading-relaxed">
          Point your camera at the physical QR code on your windshield sticker or valet card to register your vehicle.
        </p>

        {/* System Message */}
        {scanMessage && (
          <div
            className={`w-full p-3.5 rounded-2xl border text-xs flex items-center gap-2 mb-4 text-left ${
              scanMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {scanMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{scanMessage.text}</span>
          </div>
        )}

        {/* Camera Viewport */}
        <div className="w-72 h-72 rounded-3xl bg-black relative overflow-hidden flex items-center justify-center shadow-xl border-4 border-white">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Overlay Frame */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-52 h-52 border-2 border-[#FFDF00] rounded-2xl relative shadow-lg">
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-[#FFDF00] rounded-tl" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-[#FFDF00] rounded-tr" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-[#FFDF00] rounded-bl" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-[#FFDF00] rounded-br" />

              {scanning && (
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#FFDF00] to-transparent shadow-[0_0_10px_#FFDF00] animate-pulse absolute top-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>

          {/* Fallback for no camera */}
          {cameraError && (
            <div className="absolute inset-0 bg-black/90 p-4 flex flex-col items-center justify-center text-white text-xs gap-2">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <p className="text-center text-gray-300">Camera access unavailable.</p>
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

          {verifying && (
            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white text-xs gap-2">
              <div className="w-8 h-8 border-3 border-[#FFDF00] border-t-transparent rounded-full animate-spin" />
              <p className="font-semibold">Verifying sticker...</p>
            </div>
          )}
        </div>

        {/* Photo Upload & Actions */}
        <div className="mt-5 w-full flex flex-col items-center gap-3">
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

          {!scanning && !verifying && (
            <button
              type="button"
              onClick={startCamera}
              className="mt-2 px-5 py-2 rounded-xl bg-[#4A2E20] text-white font-bold text-xs"
            >
              Restart Camera
            </button>
          )}
        </div>
      </div>

      {/* Bottom Info */}
      <footer className="w-full max-w-md py-4 text-center text-xs text-gray-500">
        Don&apos;t have a sticker yet?{' '}
        <Link href="/buy" className="text-[#4A2E20] font-bold underline">
          Buy Our Card
        </Link>
      </footer>
    </main>
  );
}
