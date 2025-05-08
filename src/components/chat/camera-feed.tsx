
'use client';

import { useState, useRef, useEffect, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, VideoOff, Aperture, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

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
        setError(`Failed to access camera: ${errorMessage}. Please ensure permissions are granted.`);
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
      stopCamera();
    }
    // Cleanup function
    return () => {
      if (stream && !isCameraActive) { // ensure stopCamera is called if component unmounts while active
        stopCamera();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraActive]);


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
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Camera Feed
          <div className="flex space-x-2">
            <Button variant="outline" size="icon" onClick={isCameraActive ? stopCamera : startCamera} disabled={isLoading} aria-label={isCameraActive ? "Stop camera" : "Start camera"}>
              {isLoading ? <Aperture className="animate-spin h-5 w-5" /> : isCameraActive ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
            <Button variant="default" size="icon" onClick={captureFrame} disabled={!isCameraActive || isLoading} aria-label="Capture frame">
              <Aperture className="h-5 w-5" />
            </Button>
          </div>
        </CardTitle>
        <CardDescription>View and interact with your device camera.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center relative">
          <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`} />
          {!isCameraActive && !error && !isLoading && (
            <div className="text-muted-foreground flex flex-col items-center">
              <VideoOff size={48} className="mb-2"/>
              <p>Camera is off</p>
            </div>
          )}
          {isLoading && (
             <div className="text-muted-foreground flex flex-col items-center">
              <Aperture size={48} className="animate-spin mb-2"/>
              <p>Accessing camera...</p>
            </div>
          )}
           {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 p-4 rounded-md">
              <AlertCircle className="h-12 w-12 text-destructive mb-2" />
              <p className="text-destructive text-center font-medium">{error}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CameraFeed;
