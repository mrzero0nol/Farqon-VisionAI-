
'use client';

import { useState, useRef, useEffect, type FC, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Aperture, AlertCircle, VideoOff as VideoOffIconLucide } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
  }), [internalStream]); // Dependency: internalStream ensures the function has the latest stream state.

  const stopCameraTracks = useCallback((streamToStop: MediaStream | null) => {
    if (streamToStop) {
      console.log("CameraFeed: Stopping tracks for stream:", streamToStop.id);
      streamToStop.getTracks().forEach(track => {
        track.stop();
        console.log(`CameraFeed: Track ${track.kind} (${track.label}) stopped.`);
      });
    }
  }, []);

  useEffect(() => {
    let currentStream: MediaStream | null = null; 

    const startCamera = async () => {
      console.log("CameraFeed: Attempting to start camera.");
      setError(null);
      setIsLoading(true);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          currentStream = mediaStream; 
          setInternalStream(mediaStream);
          console.log("CameraFeed: Camera stream obtained:", mediaStream.id);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            try {
              await videoRef.current.play();
              console.log("CameraFeed: videoRef.play() successful.");
            } catch (playError) {
              console.warn("CameraFeed: videoRef.play() failed:", playError);
            }
          }
          setIsLoading(false);
          if (onStarted) onStarted();
        } catch (err) {
          console.error("CameraFeed: Error accessing camera:", err);
          const errorMessage = err instanceof Error ? err.message : "Unknown error.";
          const fullErrorMessage = `Gagal mengakses kamera: ${errorMessage}.`;
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
      if (onStopped) onStopped();
    };

    if (isCameraActive) {
      if (!internalStream) { 
        startCamera();
      } else {
        // If camera is already active and stream exists (e.g. due to HMR or prop change without toggling)
        // Ensure onStarted is called if it wasn't (though typically this path means it was).
        if (onStarted) onStarted(); 
      }
    } else {
      if (internalStream) { 
        stopCamera();
      } else {
         // If camera is inactive and no stream, ensure onStopped is called.
         if (onStopped) onStopped(); 
      }
    }

    return () => {
      console.log("CameraFeed: useEffect cleanup. Stopping currentStream:", currentStream?.id);
      stopCameraTracks(currentStream); 
      // Ensure video srcObject is cleared on unmount if stream was active
      if (videoRef.current && videoRef.current.srcObject === currentStream && currentStream !== null) {
        videoRef.current.srcObject = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraActive]); // Control flow strictly by isCameraActive


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
      
      {!isCameraActive && !error && !isLoading && ( 
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white p-4">
          <VideoOffIconLucide size={64} className="mb-4 opacity-70"/>
          <p className="text-xl font-semibold">Kamera Mati</p>
          <p className="text-sm opacity-80 mt-1 text-center">Gunakan tombol kamera di panel obrolan untuk memulai.</p>
        </div>
      )}
      {isLoading && ( 
         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white">
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
