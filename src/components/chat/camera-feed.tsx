
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
  isCameraProcessing?: boolean; // From parent, indicates external processing like initial start/stop
}

const CameraFeed = forwardRef<CameraFeedRefType, CameraFeedProps>(({
  isCameraActive,
  onStarted,
  onStopped,
  onErrorOccurred,
  isCameraProcessing, // Consume prop
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [internalStream, setInternalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Internal loading for stream acquisition
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
    }
  }), [internalStream]);

  const stopCameraTracks = useCallback((streamToStop: MediaStream | null, reason: string) => {
    if (streamToStop) {
      console.log(`CameraFeed: Stopping tracks for stream: ${streamToStop.id} (Reason: ${reason})`);
      streamToStop.getTracks().forEach(track => {
        track.stop();
        console.log(`CameraFeed: Track ${track.kind} (${track.label}) stopped.`);
      });
    }
  }, []);

  const handleToggleFacingMode = useCallback(async () => {
    if (isLoading || isCameraProcessing) {
      console.log("CameraFeed: Camera is busy (isLoading or isCameraProcessing is true), cannot toggle facing mode now.");
      return;
    }
    // Set isLoading true here to prevent rapid clicks before useEffect kicks in
    // This isLoading primarily guards the toggle action itself.
    // The useEffect will manage its own isLoading for the stream acquisition process.
    setIsLoading(true); 
    setFacingMode(prevMode => {
      const newMode = prevMode === 'user' ? 'environment' : 'user';
      console.log(`CameraFeed: User requested switch to facingMode: ${newMode}. Current camera active state: ${isCameraActive}`);
      // If camera is not active, changing mode doesn't need to immediately reflect in loading state,
      // but we set isLoading above to prevent multiple toggles. The effect will handle actual stream.
      return newMode;
    });
    // The useEffect will pick up the facingMode change and handle the camera restart if active.
    // setIsLoading(false) will be handled by the useEffect's start/stop logic.
  }, [isLoading, isCameraProcessing, isCameraActive]);

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
    if(hasCameraPermission === undefined) { // Only run once
        getInitialCameraPermission();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onErrorOccurred, stopCameraTracks, toast]); // hasCameraPermission removed to ensure it runs only once on mount correctly


  useEffect(() => {
    let effectInstanceStream: MediaStream | null = null;

    const startCamera = async () => {
      if (hasCameraPermission === false) {
        console.log("CameraFeed: Cannot start camera, permission not granted or explicitly denied.");
        setIsLoading(false); // Ensure loading is false if we bail out
        // Error message should have been shown by permission check or previous attempt.
        // If onErrorOccurred exists and no current error is set, signal a problem.
        if (onErrorOccurred && !error) {
             const permError = "Izin kamera belum diberikan atau ditolak.";
             // setError(permError); // setError is managed by initial check mostly
             onErrorOccurred(permError); // Notify parent
        }
        return;
      }
      if (hasCameraPermission === undefined) {
        console.log("CameraFeed: Waiting for permission check to complete.");
        setIsLoading(true); // Show loading while waiting for permission
        return;
      }

      console.log(`CameraFeed: Attempting to start camera. Active: ${isCameraActive}, Mode: ${facingMode}, Current Stream: ${internalStream?.id}`);
      
      // If there's an existing stream, ensure it's stopped before starting a new one,
      // especially if facingMode changed. The cleanup function handles this for changes in deps,
      // but an explicit stop here can be safer if called mid-effect.
      // However, relying on cleanup is generally cleaner for dependency changes.
      // For now, let cleanup handle stopping the previous stream.

      setError(null); // Clear previous errors before attempting to start
      setIsLoading(true);

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          console.log(`CameraFeed: Requesting media stream with facingMode: ${facingMode}`);
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } });
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
                    setError(null); // Clear error on successful play
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
                setHasCameraPermission(false); // Update permission state
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
          effectInstanceStream = null; // Ensure this is nulled on error
        }
      } else {
        const unsupportedMessage = "Akses kamera tidak didukung oleh browser ini.";
        setError(unsupportedMessage);
        toast({ title: "Browser Tidak Didukung", description: unsupportedMessage, variant: "destructive" });
        setIsLoading(false);
        if (onErrorOccurred) onErrorOccurred(unsupportedMessage);
        setInternalStream(null);
        effectInstanceStream = null; // Ensure this is nulled
      }
    };

    if (isCameraActive) {
      console.log("CameraFeed: useEffect - Camera active, proceeding to start/ensure camera.");
      startCamera();
    } else { 
      console.log("CameraFeed: useEffect - Camera inactive. Current stream:", internalStream?.id);
      if (internalStream) { // Only stop if there's an active stream
        stopCameraTracks(internalStream, "camera becoming inactive");
        setInternalStream(null); 
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.pause();
        }
      }
      //setError(null); // Do not clear error when camera is simply turned off. Error should persist if it was a start failure.
      setIsLoading(false); // Ensure loading is false if camera is inactive
      if (onStopped) onStopped(); // Notify parent that camera is stopped
    }

    return () => {
      console.log(`CameraFeed: useEffect cleanup for facingMode: ${facingMode}, isCameraActive: ${isCameraActive}. Stopping effectInstanceStream: ${effectInstanceStream?.id}`);
      stopCameraTracks(effectInstanceStream, "useEffect cleanup"); 
      if (videoRef.current && videoRef.current.srcObject === effectInstanceStream && effectInstanceStream !== null) {
        videoRef.current.srcObject = null; // Important to release the video element from the stream
        videoRef.current.pause();
      }
      // This helps ensure that if the effect runs again quickly, 
      // internalStream state doesn't get stuck on an old stream that effectInstanceStream was supposed to clean.
      setInternalStream(current => {
        if (current === effectInstanceStream) {
          console.log("CameraFeed: useEffect cleanup - clearing internalStream as it matches the effectInstanceStream being cleaned up.");
          return null;
        }
        return current;
      });
      // When cleaning up, especially due to facingMode change, we set isLoading to false.
      // The next run of startCamera will set it to true again if needed.
      setIsLoading(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraActive, facingMode, hasCameraPermission, stopCameraTracks, onErrorOccurred, onStarted, onStopped, toast]);


  const showLoadingIndicator = isLoading || (isCameraActive && hasCameraPermission === undefined) || (isCameraActive && hasCameraPermission && !internalStream && !error);
  const showVideo = isCameraActive && internalStream && !isLoading && hasCameraPermission && !error;
  const showCameraOffMessage = !isCameraActive && !isLoading && hasCameraPermission === true && !error; // only if permission known true
  const showPermissionNeededMessage = hasCameraPermission === false && !isLoading;
  const showErrorAlert = error && !isLoading;


  return (
    <div className="w-full h-full relative bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline // Important for iOS
        muted // Required for autoplay in most browsers
        className={`w-full h-full object-cover ${showVideo ? 'block' : 'hidden'}`}
        onLoadedData={() => console.log("CameraFeed: Video data loaded.")}
        onCanPlay={() => console.log("CameraFeed: Video can play.")}
        onError={(e) => {
          console.error("CameraFeed: Video element direct error event:", e);
          // This might indicate a problem not caught by getUserMedia, e.g., codec issue or stream corruption
          if (!error) { // If no error already set by getUserMedia
            const videoElementErrorMsg = "Terjadi kesalahan pada elemen video.";
            setError(videoElementErrorMsg);
            if(onErrorOccurred) onErrorOccurred(videoElementErrorMsg);
          }
        }}
      />

	{hasCameraPermission && isCameraActive && !isLoading && internalStream && ( // Only show if camera is active, has permission, not loading, and stream exists
        <Button
          onClick={handleToggleFacingMode}
          variant="outline"
          size="icon"
          className="absolute top-4 right-4 z-20 rounded-full p-2 bg-black/30 hover:bg-black/50 text-white border-white/30"
          aria-label="Ganti Kamera"
          disabled={isLoading || isCameraProcessing} // Disable if internally loading or parent says processing
        >
          <SwitchCamera size={20} />
        </Button>
      )}

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
            {hasCameraPermission === undefined ? "Memeriksa Izin..." : "Mengakses Kamera..."}
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

