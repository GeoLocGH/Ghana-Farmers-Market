import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { 
  CameraIcon, 
  XIcon, 
  UploadIcon, 
  KeyIcon, 
  RefreshCwIcon, 
  CheckCircleIcon,
  ShieldCheckIcon,
  ScanLineIcon
} from './common/icons';
import Button from './common/Button';

interface HandoverQrScannerProps {
  onScan: (decodedText: string) => void;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
}

export const HandoverQrScanner: React.FC<HandoverQrScannerProps> = ({
  onScan,
  onClose,
  title = 'Scan Produce Handover QR',
  subtitle = 'Point camera at the buyer/farmer transaction QR code'
}) => {
  const [activeMode, setActiveMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [manualCode, setManualCode] = useState<string>('');
  const [manualError, setManualError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Scan frame loop using jsQR
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

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
        setIsScanning(false);
        try {
          if (navigator.vibrate) {
            navigator.vibrate([50, 100, 50]);
          }
        } catch {
          // ignore
        }
        stopCamera();
        onScan(code.data);
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [isScanning, onScan, stopCamera]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setIsScanning(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser. Please upload an image or enter verification code manually.');
      }

      const constraints: MediaStreamConstraints = {
        video: selectedCameraId 
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // essential for iOS
        await videoRef.current.play();
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }

      // Enumerate available cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setCameras(videoDevices);
      } catch {
        // ignore
      }
    } catch (err: any) {
      console.warn('Camera initiation failed:', err);
      let message = 'Unable to access device camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission was denied. Please allow camera permissions in your browser or enter the code manually.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No video camera detected on this device.';
      } else if (err.message) {
        message = err.message;
      }
      setCameraError(message);
    }
  }, [facingMode, selectedCameraId, scanFrame, stopCamera]);

  useEffect(() => {
    if (activeMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeMode, startCamera, stopCamera]);

  // Flip Front/Back Camera
  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
    setSelectedCameraId('');
  };

  // Decode Image File via jsQR
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(imageData.data, imageData.width, imageData.height);

        if (decoded && decoded.data) {
          try {
            if (navigator.vibrate) navigator.vibrate([60]);
          } catch {
            // ignore
          }
          onScan(decoded.data);
        } else {
          setCameraError('No valid QR code could be found in this uploaded image. Please try another image or enter the PIN manually.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle Manual Code Submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim().toUpperCase();
    if (!clean) {
      setManualError('Please enter a verification code (e.g. GH-7782-X9).');
      return;
    }
    setManualError(null);
    onScan(clean);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden max-w-md w-full mx-auto text-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-800 to-emerald-900 text-white px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-white/10 rounded-xl">
            <ScanLineIcon className="w-6 h-6 text-green-300" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg leading-tight">{title}</h3>
            <p className="text-xs text-green-200 line-clamp-1">{subtitle}</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveMode('camera')}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors ${
            activeMode === 'camera'
              ? 'text-green-800 border-b-2 border-green-700 bg-white font-black'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <CameraIcon className="w-4 h-4" />
          <span>Live Camera</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('upload')}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors ${
            activeMode === 'upload'
              ? 'text-green-800 border-b-2 border-green-700 bg-white font-black'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <UploadIcon className="w-4 h-4" />
          <span>Upload Image</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('manual')}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors ${
            activeMode === 'manual'
              ? 'text-green-800 border-b-2 border-green-700 bg-white font-black'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <KeyIcon className="w-4 h-4" />
          <span>Manual PIN</span>
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 sm:p-5">
        {/* Mode 1: Live Camera */}
        {activeMode === 'camera' && (
          <div className="space-y-3">
            <div className="relative aspect-square max-h-72 w-full bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                autoPlay
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Target Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="relative w-48 h-48 border-2 border-green-400 rounded-2xl shadow-lg">
                  {/* Top-left corner */}
                  <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  {/* Top-right corner */}
                  <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  {/* Bottom-left corner */}
                  <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  {/* Bottom-right corner */}
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />

                  {/* Animated laser line */}
                  <div className="absolute inset-x-2 top-0 h-0.5 bg-green-400 shadow-[0_0_8px_#22c55e] animate-pulse" />
                </div>
              </div>

              {/* Camera Error Message */}
              {cameraError && (
                <div role="alert" className="error-notification absolute inset-0 bg-red-100/95 text-black p-5 flex flex-col items-center justify-center text-center">
                  <CameraIcon className="w-10 h-10 text-red-600 mb-2" />
                  <p className="text-xs text-black font-semibold mb-4">{cameraError}</p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={startCamera} 
                      className="text-xs py-1.5 px-3 bg-green-700 hover:bg-green-800 text-white"
                    >
                      Retry Camera
                    </Button>
                    <button 
                      onClick={() => setActiveMode('manual')}
                      className="text-xs py-1.5 px-3 bg-white hover:bg-gray-100 text-black font-semibold border border-gray-300 rounded-lg"
                    >
                      Use Manual PIN
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-gray-500 font-medium">
                Hold phone steady over produce QR pass
              </span>
              <button
                type="button"
                onClick={toggleFacingMode}
                className="inline-flex items-center gap-1 font-bold text-green-800 hover:text-green-950 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-200 transition-colors"
              >
                <RefreshCwIcon className="w-3.5 h-3.5 text-green-700" />
                <span>Switch Camera</span>
              </button>
            </div>
          </div>
        )}

        {/* Mode 2: Upload Image */}
        {activeMode === 'upload' && (
          <div className="space-y-4 py-4 text-center">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-green-300 hover:border-green-600 bg-green-50/50 rounded-2xl p-8 cursor-pointer transition-colors flex flex-col items-center justify-center"
            >
              <div className="p-3 bg-green-100 rounded-full text-green-700 mb-3 shadow-xs">
                <UploadIcon className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-gray-800 mb-1">
                Upload Handover QR Screenshot or Photo
              </p>
              <p className="text-xs text-gray-500 max-w-xs">
                Select an image file from your gallery or file manager. The QR code will be read instantly.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {cameraError && (
              <div role="alert" className="error-notification p-3 bg-red-100 border border-red-400 rounded-lg text-xs text-black font-semibold">{cameraError}</div>
            )}
          </div>
        )}

        {/* Mode 3: Manual PIN Entry */}
        {activeMode === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
                Verification PIN / Order Code
              </label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="e.g. GH-7782-X9 or ORD-7782"
                className="w-full text-center text-lg font-mono font-bold tracking-widest p-3 border-2 border-green-700 rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
                autoFocus
              />
              <p className="text-[11px] text-gray-600 mt-1">
                Found on the buyer's mobile pass or printed consignment slip.
              </p>
            </div>

            {manualError && (
              <div role="alert" className="error-notification p-3 bg-red-100 border border-red-400 rounded-lg text-xs text-black font-semibold">{manualError}</div>
            )}

            <Button
              type="submit"
              className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 shadow-md flex items-center justify-center gap-2"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>Verify Handover Code</span>
            </Button>
          </form>
        )}

        {/* Security Assurance Badge */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <span className="flex items-center gap-1 text-emerald-800 font-semibold">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
            Escrow Protected
          </span>
          <span>Funds release automatically upon scan</span>
        </div>
      </div>
    </div>
  );
};

export default HandoverQrScanner;
