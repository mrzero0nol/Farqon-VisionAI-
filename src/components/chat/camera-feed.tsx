
'use client';

import { useState, useRef, useEffect, type FC, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Aperture, AlertCircle, VideoOff as VideoOffIconLucide } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface CameraFeedProps {
  onFrameCapture: (dataUri: string) => void;
  isCameraActive: boolean; // Controlled by parent
  onStarted?: () => void;
  onStopped?: () => void;
  onErrorOccurred?: (errorMessage: string) => void;
}

const CameraFeed: FC<CameraFeedProps> = ({ 
  onFrameCapture, 
  isCameraActive, // This prop now directly drives the camera state
  onStarted,
  onStopped,
  onErrorOccurred
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [internalStream, setInternalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); 
  const { toast } = useToast();

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
    let currentStream: MediaStream | null = null; // To hold the stream for cleanup

    const startCamera = async () => {
      console.log("CameraFeed: Attempting to start camera.");
      setError(null);
      setIsLoading(true);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          currentStream = mediaStream; // Assign to local variable for cleanup
          setInternalStream(mediaStream);
          console.log("CameraFeed: Camera stream obtained:", mediaStream.id);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
             // Attempt to play the video, especially on mobile Safari
            try {
              await videoRef.current.play();
              console.log("CameraFeed: videoRef.play() successful.");
            } catch (playError) {
              console.warn("CameraFeed: videoRef.play() failed, browser might block autoplay:", playError);
              // User interaction might be needed to start video in some browsers
              toast({
                title: "Info Kamera",
                description: "Kamera dimulai, tetapi video mungkin memerlukan interaksi untuk diputar.",
                variant: "default"
              });
            }
          }
          setIsLoading(false);
          if (onStarted) onStarted();
        } catch (err) {
          console.error("CameraFeed: Error accessing camera:", err);
          const errorMessage = err instanceof Error ? err.message : "Unknown error accessing camera.";
          const fullErrorMessage = `Gagal mengakses kamera: ${errorMessage}. Pastikan izin diberikan dan tidak ada aplikasi lain yang menggunakan kamera.`;
          setError(fullErrorMessage);
          toast({
            title: "Kesalahan Kamera",
            description: `Gagal mengakses kamera. ${errorMessage}`,
            variant: "destructive",
          });
          setIsLoading(false);
          if (onErrorOccurred) onErrorOccurred(fullErrorMessage);
          setInternalStream(null); // Ensure internal stream is null on error
        }
      } else {
        const unsupportedMessage = "Akses kamera tidak didukung oleh browser ini.";
        console.log("CameraFeed:", unsupportedMessage);
        setError(unsupportedMessage);
        toast({
          title: "Browser Tidak Didukung",
          description: unsupportedMessage,
          variant: "destructive",
        });
        setIsLoading(false);
        if (onErrorOccurred) onErrorOccurred(unsupportedMessage);
        setInternalStream(null);
      }
    };

    const stopCamera = () => {
      console.log("CameraFeed: Attempting to stop camera. Current internalStream:", internalStream?.id);
      // Use the internalStream state for stopping
      if (internalStream) {
        stopCameraTracks(internalStream);
        setInternalStream(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.pause(); // Explicitly pause
        videoRef.current.load(); // Reset video element
        console.log("CameraFeed: videoRef.srcObject set to null, paused, and loaded.");
      }
      setIsLoading(false); // Ensure loading is false when stopped
      if (onStopped) onStopped();
    };

    if (isCameraActive) {
      if (!internalStream) { // Only start if not already active internally
        startCamera();
      } else {
        console.log("CameraFeed: Camera active, stream already exists.");
        if (onStarted) onStarted(); // Call onStarted if already active and parent requests active state
      }
    } else {
      if (internalStream) { // Only stop if currently active internally
        stopCamera();
      } else {
         console.log("CameraFeed: Camera inactive, no stream to stop.");
         if (onStopped) onStopped(); // Call onStopped if already inactive and parent requests inactive state
      }
    }

    // Cleanup function
    return () => {
      console.log("CameraFeed: useEffect cleanup. Stopping currentStream if any:", currentStream?.id);
      stopCameraTracks(currentStream); // Stop tracks of the stream created in this effect instance
      if (videoRef.current) {
        videoRef.current.srcObject = null; // Ensure video source is cleared on unmount
        console.log("CameraFeed: videoRef.srcObject cleared in cleanup.");
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraActive, onStarted, onStopped, onErrorOccurred, toast, stopCameraTracks]); // internalStream removed from deps to avoid re-triggering, isCameraActive is the driver.

  const captureFrame = () => {
    if (videoRef.current && internalStream && videoRef.current.readyState >= videoRef.current.HAVE_CURRENT_DATA) {
      const videoElement = videoRef.current;
      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        console.warn("CameraFeed: CaptureFrame - video dimensions are zero.");
        toast({ 
          title: "Kesalahan Pengambilan", 
          description: "Dimensi video tidak valid. Kamera mungkin belum sepenuhnya siap atau resolusi tidak terdeteksi.", 
          variant: "destructive" 
        });
        return;
      }

      console.log(`CameraFeed: Capturing frame. Video dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg', 0.9); 
        onFrameCapture(dataUri);
        console.log("CameraFeed: Frame captured and sent.");
        toast({ title: "Frame Ditangkap", description: "Gambar dikirim untuk analisis." });
      } else {
         console.error("CameraFeed: CaptureFrame - Could not get canvas context.");
         toast({ title: "Kesalahan Pengambilan", description: "Tidak dapat mengambil konteks kanvas.", variant: "destructive" });
      }
    } else {
      let reason = "Kamera belum siap atau tidak ada stream.";
      if(videoRef.current && videoRef.current.readyState < videoRef.current.HAVE_CURRENT_DATA){
        reason = `Kamera tidak memiliki cukup data (readyState: ${videoRef.current.readyState}). Coba lagi.`;
      }
      console.warn(`CameraFeed: CaptureFrame - Cannot capture. Reason: ${reason}`);
      toast({ title: "Kesalahan Pengambilan", description: reason, variant: "destructive" });
    }
  };

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

      {isCameraActive && internalStream && (
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex space-x-3 sm:space-x-4 z-20">
          <Button 
            variant="default" 
            size="lg" 
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full p-3 sm:p-4 shadow-xl"
            onClick={captureFrame} 
            disabled={!isCameraActive || isLoading} 
            aria-label="Tangkap frame"
          >
            <Aperture className="h-6 w-6 sm:h-7 sm:w-7" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default CameraFeed;
