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
        const fullErrorMessage = `Gagal mengakses kamera: ${errorMessage}. Pastikan izin diberikan dan tidak ada aplikasi lain yang menggunakan kamera.`;
        setError(fullErrorMessage);
        toast({
          title: "Kesalahan Kamera",
          description: `Gagal mengakses kamera. ${errorMessage}`,
          variant: "destructive",
        });
        if (onErrorOccurred) onErrorOccurred(fullErrorMessage);
      } finally {
        setIsLoading(false);
      }
    } else {
      const unsupportedMessage = "Akses kamera tidak didukung oleh browser ini.";
      setError(unsupportedMessage);
      toast({
        title: "Browser Tidak Didukung",
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
        if (onStarted) onStarted(); 
      }
    } else {
      if (stream) {
        stopCameraInternal();
      } else {
        if (onStopped) onStopped(); 
      }
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const currentStream = videoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach(track => track.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraActive, startCameraInternal, stopCameraInternal]); // Added start/stop internal to deps

  const captureFrame = () => {
    if (videoRef.current && stream && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const videoElement = videoRef.current;
      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        toast({ 
          title: "Kesalahan Pengambilan", 
          description: "Dimensi video tidak valid. Kamera mungkin belum sepenuhnya siap atau resolusi tidak terdeteksi.", 
          variant: "destructive" 
        });
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg', 0.9); // Use quality 0.9 for a balance
        onFrameCapture(dataUri);
        toast({ title: "Frame Ditangkap", description: "Gambar dikirim untuk analisis." });
      } else {
         toast({ title: "Kesalahan Pengambilan", description: "Tidak dapat mengambil konteks kanvas.", variant: "destructive" });
      }
    } else {
      let reason = "Kamera belum siap atau tidak ada stream.";
      if(videoRef.current && videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA){
        reason = `Kamera tidak memiliki cukup data (readyState: ${videoRef.current.readyState}). Coba lagi.`;
      }
      toast({ title: "Kesalahan Pengambilan", description: reason, variant: "destructive" });
    }
  };

  return (
    <div className="w-full h-full relative bg-black">
      <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isCameraActive && stream ? 'block' : 'hidden'}`} />
      
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

      {isCameraActive && stream && (
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
