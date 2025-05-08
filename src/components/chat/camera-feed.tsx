
'use client';

import { useState, useRef, useEffect, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Aperture, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface CameraFeedProps {
  onFrameCapture: (dataUri: string) => void;
  isCameraActive: boolean;
  setIsCameraActive: (isActive: boolean) => void;
}

const CameraFeed: FC<CameraFeedProps> = ({ onFrameCapture, isCameraActive, setIsCameraActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const startCamera = async () => {
    setError(null);
    setIsLoading(true);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setIsCameraActive(true);
      } catch (err) {
        console.error("Error accessing camera:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error accessing camera.";
        setError(`Failed to access camera: ${errorMessage}. Please ensure permissions are granted and no other app is using the camera.`);
        toast({
          title: "Camera Error",
          description: `Failed to access camera. ${errorMessage}`,
          variant: "destructive",
        });
        setIsCameraActive(false);
      } finally {
        setIsLoading(false);
      }
    } else {
      setError("Camera access not supported by this browser.");
      toast({
        title: "Unsupported Browser",
        description: "Camera access not supported by this browser.",
        variant: "destructive",
      });
      setIsLoading(false);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    setIsCameraActive(false);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isCameraActive && !stream) {
      startCamera();
    } else if (!isCameraActive && stream) {
      // Don't automatically stop camera if isCameraActive is false on initial load
      // stopCamera(); 
    }
    return () => {
      // Ensure camera stops if component unmounts while active
      if (stream) {
        stopCamera();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraActive]); // Stream dependency removed to avoid re-triggering startCamera on stream set


  const captureFrame = () => {
    if (videoRef.current && stream && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg');
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
      <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`} />
      
      {!isCameraActive && !error && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white p-4">
          <VideoOff size={64} className="mb-4 opacity-70"/>
          <p className="text-xl font-semibold">Camera is Off</p>
          <p className="text-sm opacity-80 mt-1 text-center">Click the video icon below to start your camera.</p>
        </div>
      )}
      {isLoading && (
         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white">
          <Aperture size={64} className="animate-spin mb-4 opacity-70"/>
          <p className="text-xl font-semibold">Accessing Camera...</p>
        </div>
      )}
       {error && (
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

      {/* Floating Control Buttons */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex space-x-3 sm:space-x-4 z-20">
        <Button 
          variant="outline" 
          size="lg" 
          className="bg-card/80 backdrop-blur-md hover:bg-card/95 border-foreground/30 hover:border-foreground/50 text-foreground rounded-full p-3 sm:p-4 shadow-xl"
          onClick={isCameraActive ? stopCamera : startCamera} 
          disabled={isLoading} 
          aria-label={isCameraActive ? "Stop camera" : "Start camera"}
        >
          {isLoading ? <Aperture className="animate-spin h-6 w-6 sm:h-7 sm:w-7" /> : isCameraActive ? <VideoOff className="h-6 w-6 sm:h-7 sm:w-7" /> : <Video className="h-6 w-6 sm:h-7 sm:w-7" />}
        </Button>
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
    </div>
  );
};

export default CameraFeed;
