
'use client';

import { useState, useRef, useEffect, type FC, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Aperture, AlertCircle, VideoOff as VideoOffIconLucide } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import type { CameraFeedRefType, CountedObject } from '@/types'; // Added CountedObject

interface CameraFeedProps {
  isCameraActive: boolean;
  onStarted?: () => void;
  onStopped?: () => void;
  onErrorOccurred?: (errorMessage: string) => void;
  isCameraProcessing?: boolean;
}

const CameraFeed = forwardRef<CameraFeedRefType, CameraFeedProps>(({
  isCameraActive,
  onStarted,
  onStopped,
  onErrorOccurred,
  isCameraProcessing,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // Ref for canvas overlay
  const [internalStream, setInternalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | undefined>(undefined);

  useImperativeHandle(ref, () => ({
    captureCurrentFrame: (): string | null => {
      if (videoRef.current && internalStream && videoRef.current.readyState >= videoRef.current.HAVE_CURRENT_DATA) {
        const videoElement = videoRef.current;
        if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
          console.warn("CameraFeed: Capture - video dimensions are zero. Skipping frame.");
          return null;
        }
        console.log(`CameraFeed: Capturing frame on demand. Dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          const dataUri = canvas.toDataURL('image/jpeg', 0.85);
          return dataUri;
        } else {
           console.error("CameraFeed: Capture - Could not get canvas context.");
           return null;
        }
      }
      console.log("CameraFeed: Capture - Camera not ready, stream not available, or video data not loaded.");
      return null;
    },
    toggleFacingMode: async () => {
      if (isLoading || isCameraProcessing) {
        console.log("CameraFeed: Camera is busy (isLoading or isCameraProcessing is true), cannot toggle facing mode now.");
        return;
      }
      setIsLoading(true);
      setFacingMode(prevMode => {
        const newMode = prevMode === 'user' ? 'environment' : 'user';
        console.log(`CameraFeed: User requested switch to facingMode: ${newMode}. Current camera active state: ${isCameraActive}`);
        return newMode;
      });
    },
    drawHighlights: (objects: CountedObject[] | null) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (!canvas || !video || !video.videoWidth || !video.videoHeight) {
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = canvas.clientWidth; // Match display size for clearing
            canvas.height = canvas.clientHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
        if (!objects) return; 
        console.warn("CameraFeed: Canvas or video not ready for drawing highlights.");
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error("CameraFeed: Could not get canvas 2D context.");
        return;
      }

      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;

      const vidWidth = video.videoWidth;
      const vidHeight = video.videoHeight;
      const canWidth = canvas.width;
      const canHeight = canvas.height;

      const vidAspectRatio = vidWidth / vidHeight;
      const canAspectRatio = canWidth / canHeight;

      let drawX = 0, drawY = 0, drawWidth = 0, drawHeight = 0;

      if (vidAspectRatio > canAspectRatio) {
        drawHeight = canHeight;
        drawWidth = drawHeight * vidAspectRatio;
        drawX = (canWidth - drawWidth) / 2;
        drawY = 0;
      } else {
        drawWidth = canWidth;
        drawHeight = drawWidth / vidAspectRatio;
        drawY = (canHeight - drawHeight) / 2;
        drawX = 0;
      }

      ctx.clearRect(0, 0, canWidth, canHeight);

      if (objects && objects.length > 0) {
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.9)'; // Emerald-like color for circles
        ctx.lineWidth = Math.max(2, Math.min(canWidth, canHeight) * 0.007); // Slightly thicker line

        objects.forEach(obj => {
          obj.instances.forEach((instance) => {
            const { x, y, width, height } = instance.boundingBox;

            const rectX = drawX + (x * drawWidth);
            const rectY = drawY + (y * drawHeight);
            const rectWidth = width * drawWidth;
            const rectHeight = height * drawHeight;
            
            const centerX = rectX + rectWidth / 2;
            const centerY = rectY + rectHeight / 2;
            const radius = (Math.min(rectWidth, rectHeight) / 2) * 0.9; // Circle radius based on smaller dimension

            if (radius > ctx.lineWidth / 2) { // Ensure radius is large enough to be visible
              ctx.beginPath();
              ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
              ctx.stroke();
            }
          });
        });
      }
    },
  }), [internalStream, isLoading, isCameraProcessing, isCameraActive, videoRef, canvasRef]);

  const stopCameraTracks = useCallback((streamToStop: MediaStream | null, reason: string) => {
    if (streamToStop) {
      console.log(`CameraFeed: Stopping tracks for stream: ${streamToStop.id} (Reason: ${reason})`);
      streamToStop.getTracks().forEach(track => {
        track.stop();
        console.log(`CameraFeed: Track ${track.kind} (${track.label}) stopped.`);
      });
    }
  }, []);


  useEffect(() => {
    const getInitialCameraPermission = async () => {
      if (typeof navigator !== "undefined" && navigator.mediaDevices) {
        let permissionStream: MediaStream | null = null;
        try {
          console.log("CameraFeed: Checking initial camera permission...");
          permissionStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          console.log("CameraFeed: Initial camera permission granted.");
        } catch (err) {
          console.error('CameraFeed: Initial camera permission check failed:', err);
          setHasCameraPermission(false);
          const typedError = err instanceof Error ? err : new Error("Unknown error during permission check");
          let userMessage = 'Tidak dapat mengakses kamera. Pastikan kamera terhubung dan izin telah diberikan.';
          if (typedError.name === 'NotAllowedError' || typedError.name === 'PermissionDeniedError') {
            userMessage = 'Izin Kamera Diperlukan. Harap aktifkan izin kamera di pengaturan browser Anda.';
          }
          toast({ variant: 'destructive', title: 'Akses Kamera Bermasalah', description: userMessage });
          if (onErrorOccurred) onErrorOccurred(userMessage);
        } finally {
          if (permissionStream) {
            stopCameraTracks(permissionStream, "initial permission check cleanup");
          }
        }
      } else {
        console.warn("CameraFeed: MediaDevices API not available.");
        const unsupportedMessage = "Akses kamera tidak didukung oleh browser ini.";
        setError(unsupportedMessage);
        setHasCameraPermission(false);
        if (onErrorOccurred) onErrorOccurred(unsupportedMessage);
      }
    };
    if(hasCameraPermission === undefined) {
        getInitialCameraPermission();
    }
  }, [onErrorOccurred, stopCameraTracks, toast, hasCameraPermission]);


  useEffect(() => {
    let effectInstanceStream: MediaStream | null = null;

    const startCamera = async () => {
      if (hasCameraPermission === false) {
        console.log("CameraFeed: Cannot start camera, permission not granted or explicitly denied.");
        setIsLoading(false);
        if (onErrorOccurred) {
             const permError = "Izin kamera belum diberikan atau ditolak.";
             onErrorOccurred(permError);
             setError(permError);
        }
        return;
      }
      if (hasCameraPermission === undefined) {
        console.log("CameraFeed: Waiting for permission check to complete.");
        setIsLoading(true);
        return;
      }

      console.log(`CameraFeed: Attempting to start camera. Active: ${isCameraActive}, Mode: ${facingMode}`);
      
      setError(null);
      setIsLoading(true);

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const constraints = { video: { facingMode: facingMode as VideoFacingModeEnum } };
        console.log('CameraFeed: Requesting media with constraints:', constraints);
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          effectInstanceStream = mediaStream;
          setInternalStream(mediaStream);
          console.log("CameraFeed: Camera stream obtained:", mediaStream.id, "Tracks:", mediaStream.getTracks().map(t => t.label));

          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.onloadedmetadata = () => {
                 console.log("CameraFeed: Video metadata loaded. Attempting to play.");
                 videoRef.current?.play().then(() => {
                    console.log("CameraFeed: videoRef.play() successful.");
                    setIsLoading(false);
                    setError(null);
                    if (onStarted) onStarted();
                 }).catch((playError) => {
                    console.error("CameraFeed: videoRef.play() failed:", playError);
                    const playErrorMessage = `Gagal memulai pemutaran video: ${playError instanceof Error ? playError.message : "Kesalahan tidak diketahui."}`;
                    setError(playErrorMessage);
                    setIsLoading(false);
                    if (onErrorOccurred) onErrorOccurred(playErrorMessage);
                    stopCameraTracks(mediaStream, "play error");
                    setInternalStream(null);
                    effectInstanceStream = null;
                 });
            };
            videoRef.current.onerror = (e) => {
              console.error("CameraFeed: Video element error during stream setup:", e);
              const videoErrorMessage = "Kesalahan elemen video saat memuat stream.";
              setError(videoErrorMessage);
              setIsLoading(false);
              if (onErrorOccurred) onErrorOccurred(videoErrorMessage);
              stopCameraTracks(mediaStream, "video element error");
              setInternalStream(null);
              effectInstanceStream = null;
            };
          } else {
             console.warn("CameraFeed: videoRef.current is null when trying to set srcObject.");
             setIsLoading(false);
             const noVidRefError = "Referensi video tidak ditemukan.";
             setError(noVidRefError);
             if (onErrorOccurred) onErrorOccurred(noVidRefError);
             stopCameraTracks(mediaStream, "null video ref");
             setInternalStream(null);
             effectInstanceStream = null;
          }
        } catch (err) {
          console.error(`CameraFeed: Error accessing camera with facingMode ${facingMode}:`, err);
          let userFriendlyMessage = `Terjadi kesalahan umum saat mengakses kamera mode '${facingMode}'.`;
          const technicalMessage = err instanceof Error ? err.message : "Unknown error.";

          if (err instanceof Error) {
            switch (err.name) {
              case 'NotFoundError':
              case 'DevicesNotFoundError':
                userFriendlyMessage = `Kamera mode '${facingMode}' tidak ditemukan.`;
                break;
              case 'OverconstrainedError':
                 userFriendlyMessage = `Tidak dapat memenuhi batasan untuk kamera mode '${facingMode}'. Perangkat mungkin tidak mendukung mode ini atau resolusi yang diminta. (Detail: ${technicalMessage})`;
                 if (technicalMessage.toLowerCase().includes("could not start video source")) {
                     userFriendlyMessage = `Tidak dapat memulai sumber video untuk mode '${facingMode}'. Ini mungkin karena mode tidak tersedia, atau ada konflik. (Detail: ${technicalMessage})`;
                 }
                break;
              case 'NotAllowedError':
              case 'PermissionDeniedError':
                userFriendlyMessage = `Izin akses kamera ditolak. Silakan aktifkan izin kamera di pengaturan browser Anda.`;
                setHasCameraPermission(false);
                break;
              case 'AbortError':
                userFriendlyMessage = `Akses kamera dibatalkan.`;
                break;
              case 'NotReadableError':
              case 'TrackStartError':
                userFriendlyMessage = `Kamera mungkin sedang digunakan oleh aplikasi lain, atau ada masalah dengan perangkat keras kamera (mode '${facingMode}'). (Detail: ${technicalMessage})`;
                if (technicalMessage.toLowerCase().includes("could not start video source")) {
                     userFriendlyMessage = `Tidak dapat membaca dari sumber video untuk mode '${facingMode}'. Pastikan tidak ada aplikasi lain yang menggunakan kamera. (Detail: ${technicalMessage})`;
                }
                break;
              default:
                userFriendlyMessage = `Gagal mengakses kamera mode '${facingMode}'. (${err.name}: ${technicalMessage})`;
            }
          }
          
          setError(userFriendlyMessage);
          toast({ title: "Kesalahan Kamera", description: userFriendlyMessage, variant: "destructive" });
          setIsLoading(false);
          if (onErrorOccurred) onErrorOccurred(userFriendlyMessage);
          setInternalStream(null);
          effectInstanceStream = null;
        }
      } else {
        const unsupportedMessage = "Akses kamera tidak didukung oleh browser ini.";
        setError(unsupportedMessage);
        toast({ title: "Browser Tidak Didukung", description: unsupportedMessage, variant: "destructive" });
        setIsLoading(false);
        if (onErrorOccurred) onErrorOccurred(unsupportedMessage);
        setInternalStream(null);
        effectInstanceStream = null;
      }
    };

    if (isCameraActive) {
      console.log("CameraFeed: useEffect - Camera active, proceeding to start/ensure camera.");
      startCamera();
    } else {
      console.log("CameraFeed: useEffect - Camera inactive. Current internalStream from state:", internalStream?.id);
      if (internalStream) {
        stopCameraTracks(internalStream, "camera becoming inactive (from state)");
        setInternalStream(null);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.pause();
        }
        // Clear highlights when camera is turned off
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      }
      setIsLoading(false);
      setError(null);
      if (onStopped) onStopped();
    }

    return () => {
      console.log(`CameraFeed: useEffect cleanup for facingMode: ${facingMode}, isCameraActive: ${isCameraActive}. Stopping effectInstanceStream: ${effectInstanceStream?.id}`);
      stopCameraTracks(effectInstanceStream, "useEffect cleanup");
      if (videoRef.current && videoRef.current.srcObject === effectInstanceStream && effectInstanceStream !== null) {
        videoRef.current.srcObject = null;
        videoRef.current.pause();
      }
      setInternalStream(current => {
        if (current === effectInstanceStream) {
          console.log("CameraFeed: useEffect cleanup - clearing internalStream as it matches the effectInstanceStream being cleaned up.");
          return null;
        }
        return current;
      });
      setIsLoading(false);
    };
  }, [isCameraActive, facingMode, hasCameraPermission, stopCameraTracks, onErrorOccurred, onStarted, onStopped, toast]);


  const showLoadingIndicator = isLoading || (isCameraActive && hasCameraPermission === undefined) || (isCameraActive && hasCameraPermission && !internalStream && !error && !isCameraProcessing);
  const showVideo = isCameraActive && internalStream && !isLoading && hasCameraPermission && !error;
  const showCameraOffMessage = !isCameraActive && !isLoading && (hasCameraPermission === true || hasCameraPermission === undefined) && !error;
  const showPermissionNeededMessage = hasCameraPermission === false && !isLoading;
  const showErrorAlert = error && !isLoading;


  return (
    <div className="w-full h-full relative bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${showVideo ? 'block' : 'hidden'}`}
        onLoadedData={() => console.log("CameraFeed: Video data loaded.")}
        onCanPlay={() => {
          console.log("CameraFeed: Video can play.");
          if (canvasRef.current && videoRef.current) {
            // Ensure canvas matches the video's display dimensions
            canvasRef.current.width = videoRef.current.clientWidth;
            canvasRef.current.height = videoRef.current.clientHeight;
          }
        }}
        onError={(e) => {
          console.error("CameraFeed: Video element direct error event:", e);
          if (!error) {
            const videoElementErrorMsg = "Terjadi kesalahan pada elemen video.";
            setError(videoElementErrorMsg);
            if(onErrorOccurred) onErrorOccurred(videoElementErrorMsg);
          }
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        // Initial dimensions will be set on video canPlay or when drawing
      />

      {showCameraOffMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white p-4">
          <VideoOffIconLucide size={64} className="mb-4 opacity-70"/>
          <p className="text-xl font-semibold">Kamera Mati</p>
          <p className="text-sm opacity-80 mt-1 text-center">Gunakan tombol kamera di panel obrolan untuk memulai.</p>
        </div>
      )}
      {showLoadingIndicator && (
         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white z-20">
          <Aperture size={64} className="animate-spin mb-4 opacity-70"/>
          <p className="text-xl font-semibold">
            {isCameraProcessing ? "Memproses..." : hasCameraPermission === undefined ? "Memeriksa Izin..." : "Mengakses Kamera..."}
          </p>
        </div>
      )}
       {showErrorAlert && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 sm:top-auto sm:bottom-1/3 p-4 flex justify-center z-30">
            <Alert variant="destructive" className="max-w-md bg-destructive/90 text-destructive-foreground border-destructive-foreground/50 shadow-2xl">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="font-bold">Kesalahan Akses Kamera</AlertTitle>
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
        </div>
      )}
	{showPermissionNeededMessage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 text-white p-4 z-30">
              <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Izin Kamera Diperlukan</AlertTitle>
                <AlertDescription>
                  Aplikasi ini memerlukan izin untuk mengakses kamera Anda. Aktifkan di pengaturan browser Anda dan segarkan halaman jika perlu.
                </AlertDescription>
              </Alert>
            </div>
          )
        }
    </div>
  );
});

CameraFeed.displayName = 'CameraFeed';
export default CameraFeed;
