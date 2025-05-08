
'use client';

import { useState, useRef, useEffect, type FC, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Aperture, AlertCircle, VideoOff as VideoOffIconLucide, SwitchCamera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { CameraFeedRefType } from '@/types';

interface CameraFeedProps {
  isCameraActive: boolean;
  onStarted?: () => void;
  onStopped?: () => void;
  onErrorOccurred?: (errorMessage: string) => void;
}

const CameraFeed = forwardRef<CameraFeedRefType, CameraFeedProps>(({
  isCameraActive,
  onStarted,
  onStopped,
  onErrorOccurred,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [internalStream, setInternalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(true); // Assume true initially, verify in useEffect

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
          const dataUri = canvas.toDataURL('image/jpeg', 0.85); // Quality for analysis
          return dataUri;
        } else {
           console.error("CameraFeed: Capture - Could not get canvas context.");
           return null;
        }
      }
      console.log("CameraFeed: Capture - Camera not ready, stream not available, or video data not loaded.");
      return null;
    }
  }), [internalStream]);

  const stopCameraTracks = useCallback((streamToStop: MediaStream | null) => {
    if (streamToStop) {
      console.log("CameraFeed: Stopping tracks for stream:", streamToStop.id);
      streamToStop.getTracks().forEach(track => {
        track.stop();
        console.log(`CameraFeed: Track ${track.kind} (${track.label}) stopped.`);
      });
    }
  }, []);

  const handleToggleFacingMode = useCallback(async () => {
    if (isLoading) {
      console.log("CameraFeed: Camera is busy (isLoading is true), cannot toggle facing mode now.");
      return;
    }
    setFacingMode(prevMode => {
      const newMode = prevMode === 'user' ? 'environment' : 'user';
      console.log(`CameraFeed: Switching facing mode to ${newMode}`);
      return newMode;
    });
  }, [isLoading]);

  useEffect(() => {
    const getInitialCameraPermission = async () => {
      if (typeof navigator !== "undefined" && navigator.mediaDevices) {
        let permissionStream: MediaStream | null = null;
        try {
          permissionStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          console.log("CameraFeed: Initial camera permission granted.");
        } catch (err) {
          console.error('CameraFeed: Initial camera permission check failed:', err);
          setHasCameraPermission(false);
          if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
            toast({
              variant: 'destructive',
              title: 'Izin Kamera Diperlukan',
              description: 'Harap aktifkan izin kamera di pengaturan browser Anda untuk menggunakan fitur ini.',
            });
          } else {
             toast({
               variant: 'destructive',
               title: 'Akses Kamera Bermasalah',
               description: 'Tidak dapat mengakses kamera. Pastikan kamera terhubung, tidak digunakan aplikasi lain, dan izin telah diberikan.',
             });
          }
          // Propagate error if onErroOccurred is provided, as this might be a critical startup failure
          if (onErrorOccurred) onErrorOccurred(err instanceof Error ? err.message : "Gagal memeriksa izin kamera.");
        } finally {
          if (permissionStream) {
            permissionStream.getTracks().forEach(track => track.stop());
            console.log("CameraFeed: Initial permission check stream stopped.");
          }
        }
      } else {
        console.warn("CameraFeed: MediaDevices API not available. Cannot check camera permission.");
        const unsupportedMessage = "Akses kamera tidak didukung oleh browser ini.";
        setError(unsupportedMessage);
        if (onErrorOccurred) onErrorOccurred(unsupportedMessage);
        setHasCameraPermission(false);
      }
    };
    getInitialCameraPermission();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); // Only toast as dependency, run once on mount.

  useEffect(() => {
    let effectInstanceStream: MediaStream | null = null;

    const startCamera = async () => {
      if (!hasCameraPermission) {
        console.log("CameraFeed: Cannot start camera, permission not granted.");
        // Error message for no permission should already be shown by initial check or subsequent attempt
        // Ensure isLoading is false if we bail out here.
        setIsLoading(false);
        if (onErrorOccurred && !error) { // Prevent duplicate error reporting if already set
             const permError = "Izin kamera belum diberikan.";
             setError(permError);
             onErrorOccurred(permError);
        }
        return;
      }

      console.log(`CameraFeed: Attempting to start camera with facingMode: ${facingMode}.`);
      setError(null);
      setIsLoading(true);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } });
          effectInstanceStream = mediaStream;
          setInternalStream(mediaStream);
          console.log("CameraFeed: Camera stream obtained:", mediaStream.id);

          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.onloadedmetadata = () => {
                 console.log("CameraFeed: Video metadata loaded. Attempting to play.");
                 videoRef.current?.play().then(() => {
                    console.log("CameraFeed: videoRef.play() successful.");
                    setIsLoading(false);
                    if (onStarted) onStarted();
                 }).catch((playError) => {
                    console.warn("CameraFeed: videoRef.play() failed:", playError);
                    const playErrorMessage = `Gagal memulai pemutaran video: ${playError instanceof Error ? playError.message : "Kesalahan tidak diketahui."}`;
                    setError(playErrorMessage);
                    setIsLoading(false);
                    if (onErrorOccurred) onErrorOccurred(playErrorMessage);
                    stopCameraTracks(mediaStream);
                    setInternalStream(null);
                    effectInstanceStream = null;
                 });
            };
            videoRef.current.onerror = (e) => {
              console.error("CameraFeed: Video element error during setup:", e);
              const videoErrorMessage = "Kesalahan elemen video saat memuat stream.";
              setError(videoErrorMessage);
              setIsLoading(false);
              if (onErrorOccurred) onErrorOccurred(videoErrorMessage);
              stopCameraTracks(mediaStream);
              setInternalStream(null);
              effectInstanceStream = null;
            };
          } else {
             console.warn("CameraFeed: videoRef.current is null when trying to set srcObject.");
             setIsLoading(false);
             const noVidRefError = "Referensi video tidak ditemukan.";
             setError(noVidRefError);
             if (onErrorOccurred) onErrorOccurred(noVidRefError);
             stopCameraTracks(mediaStream);
             setInternalStream(null);
             effectInstanceStream = null;
          }
        } catch (err) {
          console.error("CameraFeed: Error accessing camera:", err);
          let userFriendlyMessage = "Terjadi kesalahan umum saat mengakses kamera.";
          const technicalMessage = err instanceof Error ? err.message : "Unknown error.";

          if (err instanceof Error) {
            switch (err.name) {
              case 'NotFoundError':
              case 'DevicesNotFoundError':
              case 'OverconstrainedError': // This can include "Could not start video source" if constraints are impossible
                userFriendlyMessage = `Kamera mode '${facingMode}' tidak ditemukan atau tidak dapat diakses. Ini mungkin karena perangkat tidak memiliki kamera dengan mode tersebut, atau batasan lain. Coba mode lain jika tersedia.`;
                if (technicalMessage.toLowerCase().includes("could not start video source")) {
                     userFriendlyMessage += ` (Detail: ${technicalMessage})`;
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
              case 'TrackStartError': // This can also include "Could not start video source"
                userFriendlyMessage = `Kamera mungkin sedang digunakan oleh aplikasi lain, atau ada masalah dengan perangkat keras kamera. Pastikan tidak ada aplikasi lain yang menggunakan kamera dan coba lagi.`;
                 if (technicalMessage.toLowerCase().includes("could not start video source")) {
                     userFriendlyMessage += ` (Detail: ${technicalMessage})`;
                }
                break;
              default:
                userFriendlyMessage = `Gagal mengakses kamera mode '${facingMode}'. Detail Teknis: ${technicalMessage}`;
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

    const stopEffectCamera = () => {
      const streamToActuallyStop = internalStream; 
      console.log("CameraFeed: useEffect logic deciding to stop camera. Current internalStream:", streamToActuallyStop?.id);
      if (streamToActuallyStop) { 
        stopCameraTracks(streamToActuallyStop);
        setInternalStream(null); 
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.pause(); 
        console.log("CameraFeed: videoRef.srcObject set to null and paused.");
      }
      if (!isCameraActive) {
        setIsLoading(false);
      }
      // Don't clear error here if camera is being stopped due to an error
      // setError(null); 
      if (onStopped) onStopped();
    };

    if (isCameraActive) {
      console.log("CameraFeed: useEffect - Camera active, proceeding to start/ensure camera with current settings.");
      startCamera();
    } else { 
      if (internalStream) { 
        console.log("CameraFeed: useEffect - Camera inactive, stopping camera.");
        stopEffectCamera();
      } else {
         console.log("CameraFeed: useEffect - Camera inactive, already stopped or never started.");
         setIsLoading(false);
         if (onStopped) onStopped(); 
      }
    }

    return () => {
      console.log("CameraFeed: useEffect cleanup. Stopping effectInstanceStream:", effectInstanceStream?.id);
      stopCameraTracks(effectInstanceStream); 
      if (videoRef.current && videoRef.current.srcObject === effectInstanceStream && effectInstanceStream !== null) {
        videoRef.current.srcObject = null;
        videoRef.current.pause();
      }
      setInternalStream(current => current === effectInstanceStream ? null : current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraActive, facingMode, hasCameraPermission]); // Add hasCameraPermission as dependency

  return (
    <div className="w-full h-full relative bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${isCameraActive && internalStream && !isLoading && hasCameraPermission ? 'block' : 'hidden'}`}
        onLoadedData={() => console.log("CameraFeed: Video data loaded.")}
        onCanPlay={() => console.log("CameraFeed: Video can play.")}
        onError={(e) => console.error("CameraFeed: Video element error:", e)}
      />

	{hasCameraPermission && isCameraActive && !isLoading && internalStream && (
        <Button
          onClick={handleToggleFacingMode}
          variant="outline"
          size="icon"
          className="absolute top-4 right-4 z-20 rounded-full p-2 bg-black/30 hover:bg-black/50 text-white border-white/30"
          aria-label="Ganti Kamera"
        >
          <SwitchCamera size={20} />
        </Button>
      )}

      {!isCameraActive && !isLoading && hasCameraPermission && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white p-4">
          <VideoOffIconLucide size={64} className="mb-4 opacity-70"/>
          <p className="text-xl font-semibold">Kamera Mati</p>
          <p className="text-sm opacity-80 mt-1 text-center">Gunakan tombol kamera di panel obrolan untuk memulai.</p>
        </div>
      )}
      {isLoading && hasCameraPermission && ( // Only show loading if permission is there, otherwise error/permission alert takes precedence
         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white z-20">
          <Aperture size={64} className="animate-spin mb-4 opacity-70"/>
          <p className="text-xl font-semibold">Mengakses Kamera...</p>
        </div>
      )}
       {error && !isLoading && ( // Show error if there is an error message and not currently loading
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
	{!hasCameraPermission && !isLoading && ( // Show this if permission specifically is false and not loading
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 text-white p-4 z-30">
              <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Izin Kamera Diperlukan</AlertTitle>
                <AlertDescription>
                  Aplikasi ini memerlukan izin untuk mengakses kamera Anda. Aktifkan di pengaturan browser Anda.
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

