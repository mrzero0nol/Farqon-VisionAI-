
'use client';

import { useState, useRef, useEffect, type FC, useCallback } from 'react';
import { Aperture, AlertCircle, VideoOff as VideoOffIconLucide } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface CameraFeedProps {
  onFrameForAnalysis: (dataUri: string | null) => void; // Renamed for clarity
  isCameraActive: boolean; 
  onStarted?: () => void;
  onStopped?: () => void;
  onErrorOccurred?: (errorMessage: string) => void;
  analysisIntervalMs?: number;
  isAiAnalyzing: boolean;
}

const DEFAULT_ANALYSIS_INTERVAL = 7000; // Default 7 seconds

const CameraFeed: FC<CameraFeedProps> = ({ 
  onFrameForAnalysis,
  isCameraActive,
  onStarted,
  onStopped,
  onErrorOccurred,
  analysisIntervalMs = DEFAULT_ANALYSIS_INTERVAL,
  isAiAnalyzing,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [internalStream, setInternalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); 
  const { toast } = useToast();
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCaptureTimeRef = useRef<number>(0);

  const stopCameraTracks = useCallback((streamToStop: MediaStream | null) => {
    if (streamToStop) {
      console.log("CameraFeed: Stopping tracks for stream:", streamToStop.id);
      streamToStop.getTracks().forEach(track => {
        track.stop();
        console.log(`CameraFeed: Track ${track.kind} (${track.label}) stopped.`);
      });
    }
  }, []);

  const captureAndSendFrameForAnalysis = useCallback(() => {
    if (videoRef.current && internalStream && videoRef.current.readyState >= videoRef.current.HAVE_CURRENT_DATA && !isAiAnalyzing && isCameraActive) {
      const now = Date.now();
      // Debounce captures if analysis is quick or interval is very short
      if (now - lastCaptureTimeRef.current < analysisIntervalMs / 2 && lastCaptureTimeRef.current !== 0) {
          // console.log("CameraFeed: Skipping auto-capture, too soon.");
          return;
      }

      const videoElement = videoRef.current;
      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        console.warn("CameraFeed: Auto-Capture - video dimensions are zero. Skipping frame.");
        return;
      }

      console.log(`CameraFeed: Auto-capturing frame for analysis. Dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg', 0.85); // Quality for analysis
        onFrameForAnalysis(dataUri);
        lastCaptureTimeRef.current = now;
        console.log("CameraFeed: Auto-frame captured and sent for analysis.");
      } else {
         console.error("CameraFeed: Auto-Capture - Could not get canvas context.");
      }
    } else if (isAiAnalyzing) {
        // console.log("CameraFeed: Skipping auto-capture, AI is analyzing.");
    }
  }, [internalStream, isAiAnalyzing, analysisIntervalMs, onFrameForAnalysis, isCameraActive]);


  useEffect(() => {
    let currentStream: MediaStream | null = null; 

    const startCamera = async () => {
      console.log("CameraFeed: Attempting to start camera.");
      setError(null);
      setIsLoading(true);
      lastCaptureTimeRef.current = 0; // Reset last capture time
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
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
        console.log("CameraFeed: Auto-analysis interval cleared due to camera stop.");
      }
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
      lastCaptureTimeRef.current = 0;
      if (onStopped) onStopped();
    };

    if (isCameraActive) {
      if (!internalStream) { 
        startCamera();
      } else {
        if (onStarted) onStarted(); 
      }
    } else {
      if (internalStream) { 
        stopCamera();
      } else {
         if (onStopped) onStopped(); 
      }
    }

    return () => {
      console.log("CameraFeed: useEffect cleanup. Stopping currentStream:", currentStream?.id);
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
      stopCameraTracks(currentStream); 
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraActive]); // Removed other deps to control flow strictly by isCameraActive


  useEffect(() => {
    if (isCameraActive && internalStream && !isAiAnalyzing) {
      if (!analysisIntervalRef.current) {
        console.log(`CameraFeed: Starting auto-analysis interval (${analysisIntervalMs}ms).`);
        // Initial capture attempt shortly after camera starts and AI is not busy
        setTimeout(() => captureAndSendFrameForAnalysis(), 500); 
        analysisIntervalRef.current = setInterval(captureAndSendFrameForAnalysis, analysisIntervalMs);
      }
    } else {
      if (analysisIntervalRef.current) {
        console.log("CameraFeed: Clearing auto-analysis interval (camera inactive, stream lost, or AI busy).");
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
    }
    // Cleanup for this effect instance
    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
    };
  }, [isCameraActive, internalStream, captureAndSendFrameForAnalysis, analysisIntervalMs, isAiAnalyzing]);


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

      {/* Manual capture button removed for automatic analysis */}
    </div>
  );
};

export default CameraFeed;
