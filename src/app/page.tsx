'use client';

import { useState, useCallback } from 'react';
import CameraFeed from '@/components/chat/camera-feed';
import ChatPanel from '@/components/chat/chat-panel';
import { useToast } from '@/hooks/use-toast';

export default function VisionAIChatPage() {
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraProcessing, setIsCameraProcessing] = useState<boolean>(false);
  const { toast } = useToast();

  const handleFrameCapture = useCallback((dataUri: string) => {
    setCapturedFrame(dataUri);
  }, []);

  const clearCapturedFrame = useCallback(() => {
    setCapturedFrame(null);
  }, []);

  const handleToggleCamera = useCallback(() => {
    setIsCameraProcessing(true);
    setIsCameraActive(prev => !prev);
  }, []);

  const handleCameraStarted = useCallback(() => {
    setIsCameraProcessing(false);
    // If isCameraActive is false here, it means it was toggled off rapidly after being toggled on.
    // The CameraFeed component will only call onStarted if it successfully started.
    if (!isCameraActive) {
        // This case should ideally not happen if logic is tight, but as a safeguard:
        // setIsCameraActive(true); // Ensure UI consistency if camera started despite a quick toggle off.
    }
  }, [isCameraActive]);

  const handleCameraStopped = useCallback(() => {
    setIsCameraProcessing(false);
     // Similar to handleCameraStarted, ensure consistency.
    if (isCameraActive) {
       // setIsCameraActive(false); // Safeguard
    }
  }, [isCameraActive]);

  const handleCameraError = useCallback((errorMessage: string) => {
    setIsCameraProcessing(false);
    // If camera was intended to be active, but failed, turn it off.
    // The local isCameraActive state will be checked against the state when this callback was created.
    // If isCameraActive was true when this was created, and an error occurs, setIsCameraActive(false) is called.
    // This should correctly reflect the camera's off state.
    if (isCameraActive) { 
        setIsCameraActive(false);
    }
    // Toast is already shown by CameraFeed, but can add more specific ones here if needed.
    // toast({
    //   title: "Camera Operation Failed",
    //   description: errorMessage,
    //   variant: "destructive",
    // });
  }, [isCameraActive, toast]);


  return (
    <div className="relative min-h-screen bg-background font-sans">
      {/* Camera Feed will be full screen */}
      <div className="fixed inset-0 z-0">
        <CameraFeed 
          onFrameCapture={handleFrameCapture} 
          isCameraActive={isCameraActive}
          onStarted={handleCameraStarted}
          onStopped={handleCameraStopped}
          onErrorOccurred={handleCameraError}
        />
      </div>

      {/* Floating Chat Panel */}
      <div className="fixed bottom-0 left-0 right-0 p-2 sm:p-4 z-10">
        <div className="max-w-2xl mx-auto">
          <ChatPanel 
            capturedFrame={capturedFrame} 
            isCameraActive={isCameraActive} 
            clearCapturedFrame={clearCapturedFrame}
            isCameraProcessing={isCameraProcessing}
            onToggleCamera={handleToggleCamera}
          />
        </div>
      </div>
      
      {/* Footer can be added here if needed, also as a floating element */}
      {/* <footer className="fixed bottom-2 left-1/2 -translate-x-1/2 p-2 z-20 text-center">
        <p className="text-xs text-white/90 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full shadow-md">
          Farqon VisionAI &copy; {new Date().getFullYear()}
        </p>
      </footer> */}
    </div>
  );
}
