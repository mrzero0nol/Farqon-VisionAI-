
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
    // This guard: if camera is off AND not loading, OR camera is ON and IS loading.
    if ((!isCameraActive && !isLoading) || (isCameraActive && isLoading)) {
      if (!isCameraActive && !isLoading) { // If camera is off, just change the mode for next start
        setFacingMode(prevMode => {
          const newMode = prevMode === 'user' ? 'environment' : 'user';
          console.log(`CameraFeed: FacingMode set to ${newMode} (camera will use this when next started)`);
          return newMode;
        });
      } else { // (isCameraActive && isLoading)
        console.log("CameraFeed: Camera is busy, cannot toggle facing mode now.");
      }
      return; // Exit if camera is off (mode set for next time) OR if camera is busy.
    }

    // This part executes ONLY if isCameraActive is TRUE and isLoading is FALSE.
    // This is the scenario for switching an *active, non-busy* camera.
    console.log("CameraFeed: Toggling facing mode while camera is active. Current stream:", internalStream?.id);
    setIsLoading(true); // Indicate camera operation is starting.

    if (internalStream) {
      stopCameraTracks(internalStream); // Stop current video tracks.
      setInternalStream(null); // Clear the state for the stream.
      if (videoRef.current) {
        videoRef.current.pause(); // Explicitly pause video element
        videoRef.current.srcObject = null; // Detach stream from video element.
      }
    }

    // Update facingMode state. This will trigger the useEffect.
    setFacingMode(prevMode => {
      const newMode = prevMode === 'user' ? 'environment' : 'user';
      console.log(`CameraFeed: FacingMode will change to ${newMode}. useEffect will restart camera.`);
      return newMode;
    });
    // useEffect listening to 'facingMode' will now take over and call 'startCamera'.
  }, [isCameraActive, internalStream, stopCameraTracks, isLoading]);


  useEffect(() => {
    let currentStreamRef: MediaStream | null = null; 

    const startCamera = async () => {
      console.log(`CameraFeed: Attempting to start camera with facingMode: ${facingMode}.`);
      setError(null);
      setIsLoading(true); 
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } });
          currentStreamRef = mediaStream; 
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
                 });
            };
          } else {
             console.warn("CameraFeed: videoRef.current is null when trying to set srcObject.");
             setIsLoading(false);
             if (onErrorOccurred) onErrorOccurred("Referensi video tidak ditemukan.");
             stopCameraTracks(mediaStream);
             setInternalStream(null);
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
        }
      } else {
        const unsupportedMessage = "Akses kamera tidak didukung oleh browser ini.";
        setError(unsupportedMessage);
        toast({ title: "Browser Tidak Didukung", description: unsupportedMessage, variant: "destructive" });
        setIsLoading(false);
        if (onErrorOccurred) onErrorOccurred(unsupportedMessage);
        setInternalStream(null);
      }
    };

    const stopCamera = () => {
      console.log("CameraFeed: Attempting to stop camera. Current internalStream:", internalStream?.id);
      if (internalStream) { 
        stopCameraTracks(internalStream);
        setInternalStream(null); 
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.pause(); 
        videoRef.current.load(); 
        console.log("CameraFeed: videoRef.srcObject set to null, paused, and loaded.");
      }
      setIsLoading(false); 
      setError(null); 
      if (onStopped) onStopped();
    };

    if (isCameraActive) {
      if (!internalStream || internalStream.getTracks().every(track => track.readyState === 'ended')) {
        console.log("CameraFeed: useEffect - Camera active, starting/restarting camera.", internalStream ? "Stream ended." : "No stream.");
        startCamera();
      } else {
        console.log("CameraFeed: useEffect - Camera active, stream already running.");
        if (onStarted && !isLoading) onStarted(); 
      }
    } else { 
      if (internalStream) { 
        console.log("CameraFeed: useEffect - Camera inactive, stopping camera.");
        stopCamera();
      } else {
         console.log("CameraFeed: useEffect - Camera inactive, already stopped or never started.");
         if (onStopped && !isLoading) onStopped(); 
      }
    }

    return () => {
      console.log("CameraFeed: useEffect cleanup. Stopping currentStreamRef:", currentStreamRef?.id);
      stopCameraTracks(currentStreamRef); 
      if (videoRef.current && videoRef.current.srcObject === currentStreamRef && currentStreamRef !== null) {
        videoRef.current.srcObject = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [isCameraActive, facingMode]);

  return (
    <div className="w-full h-full relative bg-black">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`w-full h-full object-cover ${isCameraActive && internalStream ? 'block' : 'hidden'}`}
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
