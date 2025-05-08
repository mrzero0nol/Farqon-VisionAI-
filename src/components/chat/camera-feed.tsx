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

  const handleToggleFacingMode = useCallback(() => {
    if (isLoading) {
      console.log("CameraFeed: Camera is busy (isLoading is true), cannot toggle facing mode now.");
      return;
    }

    setFacingMode(prevMode => {
      const newMode = prevMode === 'user' ? 'environment' : 'user';
      if (!isCameraActive) {
        // If camera is off, just update the mode for the next time it's started.
        console.log(`CameraFeed: FacingMode set to ${newMode} (camera is off, will use this when next started)`);
      } else {
        // If camera is active, we are initiating a switch. Set loading.
        // The useEffect will handle the actual stream stopping and starting.
        console.log(`CameraFeed: Initiating facing mode toggle to ${newMode}. useEffect will handle restart.`);
        setIsLoading(true); 
      }
      return newMode;
    });
  }, [isCameraActive, isLoading, setIsLoading, setFacingMode]);


  useEffect(() => {
    // This ref holds the stream created in *this specific run* of the useEffect.
    // It's used by the cleanup function to ensure the correct stream is stopped.
    let effectInstanceStream: MediaStream | null = null; 

    const startCamera = async () => {
      console.log(`CameraFeed: Attempting to start camera with facingMode: ${facingMode}.`);
      setError(null);
      setIsLoading(true); 
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } });
          effectInstanceStream = mediaStream; // Assign to the effect-local ref for cleanup
          setInternalStream(mediaStream); // Update component state
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
                    setInternalStream(null); // Clear stream state on error
                    effectInstanceStream = null; // Clear effect-local ref
                 });
            };
            // Handle cases where onloadedmetadata might not fire or video element errors
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
             if (onErrorOccurred) onErrorOccurred("Referensi video tidak ditemukan.");
             stopCameraTracks(mediaStream);
             setInternalStream(null);
             effectInstanceStream = null;
          }
        } catch (err) {
          console.error("CameraFeed: Error accessing camera:", err);
          const errorMessage = err instanceof Error ? err.message : "Unknown error.";
          const fullErrorMessage = `Gagal mengakses kamera (${facingMode}): ${errorMessage}.`;
          setError(fullErrorMessage);
          toast({ title: "Kesalahan Kamera", description: fullErrorMessage, variant: "destructive" });
          setIsLoading(false);
          if (onErrorOccurred) onErrorOccurred(fullErrorMessage);
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

    // This function is intended to be called by the effect's logic, not directly typically.
    // The cleanup function handles stopping the stream when dependencies change or component unmounts.
    const stopEffectCamera = () => {
      // The stream to stop is effectInstanceStream, which was set when *this effect run* started a camera.
      // Or, if relying on internalStream state, ensure it's the one from this effect's context.
      // For simplicity, using internalStream state here but cleanup function uses effectInstanceStream.
      const streamToActuallyStop = internalStream; // internalStream should be the one started by this effect cycle.
      console.log("CameraFeed: useEffect logic deciding to stop camera. Current internalStream:", streamToActuallyStop?.id);
      if (streamToActuallyStop) { 
        stopCameraTracks(streamToActuallyStop);
        setInternalStream(null); 
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.pause(); 
        // videoRef.current.load(); // Calling load() after srcObject=null can help ensure it's fully cleared.
        console.log("CameraFeed: videoRef.srcObject set to null and paused.");
      }
      // Don't reset isLoading to false here if isCameraActive is true and we are just switching facingMode,
      // as startCamera will handle isLoading. But if camera is being turned OFF, then set isLoading to false.
      if (!isCameraActive) {
        setIsLoading(false);
      }
      setError(null); // Clear any previous errors
      if (onStopped) onStopped();
    };

    if (isCameraActive) {
      // If camera should be active, we need to ensure it's running with the current facingMode.
      // This will also handle re-starting if facingMode changed.
      console.log("CameraFeed: useEffect - Camera active, proceeding to start/ensure camera with current settings.");
      startCamera();
    } else { 
      // If camera should not be active, ensure it's stopped.
      if (internalStream) { // Only stop if there's an active stream
        console.log("CameraFeed: useEffect - Camera inactive, stopping camera.");
        stopEffectCamera();
      } else {
         console.log("CameraFeed: useEffect - Camera inactive, already stopped or never started.");
         // Ensure isLoading is false if we reach here and camera is meant to be off.
         setIsLoading(false);
         if (onStopped) onStopped(); 
      }
    }

    return () => {
      // Cleanup function: This runs when dependencies (isCameraActive, facingMode) change,
      // or when the component unmounts. It stops the stream started by *this specific effect run*.
      console.log("CameraFeed: useEffect cleanup. Stopping effectInstanceStream:", effectInstanceStream?.id);
      stopCameraTracks(effectInstanceStream); 
      if (videoRef.current && videoRef.current.srcObject === effectInstanceStream && effectInstanceStream !== null) {
        videoRef.current.srcObject = null;
        videoRef.current.pause();
        // videoRef.current.load(); 
      }
      // Reset internalStream if it was the one we are cleaning up.
      // This helps if the component unmounts while a stream was active.
      setInternalStream(current => current === effectInstanceStream ? null : current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [isCameraActive, facingMode]); // Rerun effect if isCameraActive or facingMode changes.

  return (
    <div className="w-full h-full relative bg-black">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`w-full h-full object-cover ${isCameraActive && internalStream && !isLoading ? 'block' : 'hidden'}`}
        onLoadedData={() => console.log("CameraFeed: Video data loaded.")}
        onCanPlay={() => console.log("CameraFeed: Video can play.")}
        onError={(e) => console.error("CameraFeed: Video element error:", e)}
      />
      
      {isCameraActive && !isLoading && ( // Show switch button if camera is supposed to be active and not loading
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

      {!isCameraActive && !error && !isLoading && ( 
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white p-4">
          <VideoOffIconLucide size={64} className="mb-4 opacity-70"/>
          <p className="text-xl font-semibold">Kamera Mati</p>
          <p className="text-sm opacity-80 mt-1 text-center">Gunakan tombol kamera di panel obrolan untuk memulai.</p>
        </div>
      )}
      {isLoading && ( 
         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white z-20"> 
          <Aperture size={64} className="animate-spin mb-4 opacity-70"/>
          <p className="text-xl font-semibold">Mengakses Kamera...</p>
        </div>
      )}
       {error && !isLoading && ( 
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
    </div>
  );
});

CameraFeed.displayName = 'CameraFeed';
export default CameraFeed;
