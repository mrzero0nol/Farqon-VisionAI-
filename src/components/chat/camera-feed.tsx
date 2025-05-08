
'use client';

import { useState, useRef, useEffect, type FC, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Aperture, AlertCircle, VideoOff as VideoOffIconLucide } from 'lucide-react'; // Renamed VideoOff to avoid conflict
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface CameraFeedProps {
  onFrameCapture: (dataUri: string) => void;
  isCameraActive: boolean;
  onStarted?: () => void;
  onStopped?: () => void;
  onErrorOccurred?: (errorMessage: string) => void;
}

const CameraFeed: FC<CameraFeedProps> = ({ 
  onFrameCapture, 
  isCameraActive,
  onStarted,
  onStopped,
  onErrorOccurred
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Internal loading for camera UI overlay
  const { toast } = useToast();

  const startCameraInternal = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        if (onStarted) onStarted();
      } catch (err) {
        console.error("Error accessing camera:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error accessing camera.";
        const fullErrorMessage = `Failed to access camera: ${errorMessage}. Please ensure permissions are granted and no other app is using the camera.`;
        setError(fullErrorMessage);
        toast({
          title: "Camera Error",
          description: `Failed to access camera. ${errorMessage}`,
          variant: "destructive",
        });
        if (onErrorOccurred) onErrorOccurred(fullErrorMessage);
      } finally {
        setIsLoading(false);
      }
    } else {
      const unsupportedMessage = "Camera access not supported by this browser.";
      setError(unsupportedMessage);
      toast({
        title: "Unsupported Browser",
        description: unsupportedMessage,
        variant: "destructive",
      });
      setIsLoading(false);
      if (onErrorOccurred) onErrorOccurred(unsupportedMessage);
    }
  }, [onStarted, onErrorOccurred, toast]);

  const stopCameraInternal = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    // setIsLoading(false); //isLoading is primarily for start sequence
    if (onStopped) onStopped();
  }, [stream, onStopped]);

  useEffect(() => {
    if (isCameraActive) {
      if (!stream) {
        startCameraInternal();
      } else {
        // Camera is desired active and stream already exists (e.g., state restored)
        if (onStarted) onStarted(); // Ensure processing state is cleared
      }
    } else {
      if (stream) {
        stopCameraInternal();
      } else {
        // Camera is desired inactive and no stream exists
        if (onStopped) onStopped(); // Ensure processing state is cleared
      }
    }

    // Cleanup function
    return () => {
      // This cleanup is for when the component unmounts.
      // If a stream exists, it should be stopped to release camera.
      if (videoRef.current && videoRef.current.srcObject) {
        const currentStream = videoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach(track => track.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        // Do not call onStopped here as it might interfere with parent's isCameraProcessing state
        // if unmount is not tied to an explicit stop action by user.
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraActive]); // Removed stream, startCameraInternal, stopCameraInternal from deps to avoid potential loops/issues
                        // Callbacks onStarted/onStopped are assumed stable from parent.

  const captureFrame = () => {
    if (videoRef.current && stream && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg', 1.0); // Set JPEG quality to maximum
        onFrameCapture(dataUri);
        toast({ title: "Frame Captured", description: "Image sent for analysis." });
      } else {
         toast({ title: "Capture Error", description: "Could not get canvas context.", variant: "destructive" });
      }
    } else {
      toast({ title: "Capture Error", description: "Camera not ready or no stream.", variant: "destructive" });
    }
  };

  return (
    <div className="w-full h-full relative bg-black">
      <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isCameraActive && stream ? 'block' : 'hidden'}`} />
      
      {!isCameraActive && !error && !isLoading && ( // Show if camera is off, no error, not loading to start
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white p-4">
          <VideoOffIconLucide size={64} className="mb-4 opacity-70"/>
          <p className="text-xl font-semibold">Camera is Off</p>
          <p className="text-sm opacity-80 mt-1 text-center">Use the camera button in the chat panel to start.</p>
        </div>
      )}
      {isLoading && ( // Show when startCameraInternal is running
         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white">
          <Aperture size={64} className="animate-spin mb-4 opacity-70"/>
          <p className="text-xl font-semibold">Accessing Camera...</p>
        </div>
      )}
       {error && !isLoading && ( // Show error if not currently trying to load (isLoading is for start process)
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 sm:top-auto sm:bottom-1/3 p-4 flex justify-center z-30">
            <Alert variant="destructive" className="max-w-md bg-destructive/90 text-destructive-foreground border-destructive-foreground/50 shadow-2xl">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="font-bold">Camera Access Error</AlertTitle>
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
        </div>
      )}

      {/* Floating Control Buttons - Only Capture Button Remains */}
      {isCameraActive && stream && (
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex space-x-3 sm:space-x-4 z-20">
          <Button 
            variant="default" 
            size="lg" 
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full p-3 sm:p-4 shadow-xl"
            onClick={captureFrame} 
            disabled={!isCameraActive || isLoading} 
            aria-label="Capture frame"
          >
            <Aperture className="h-6 w-6 sm:h-7 sm:w-7" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default CameraFeed;
