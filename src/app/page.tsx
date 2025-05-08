
'use client';

import { useState, useCallback, useEffect } from 'react';
import CameraFeed from '@/components/chat/camera-feed';
import ChatPanel from '@/components/chat/chat-panel';
import { useToast } from '@/hooks/use-toast';

export default function VisionAIChatPage() {
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraProcessing, setIsCameraProcessing] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    console.log(`Page: isCameraActive changed to: ${isCameraActive}, isCameraProcessing: ${isCameraProcessing}`);
  }, [isCameraActive, isCameraProcessing]);

  const handleFrameCapture = useCallback((dataUri: string) => {
    console.log("Page: Frame captured");
    setCapturedFrame(dataUri);
  }, []);

  const clearCapturedFrame = useCallback(() => {
    console.log("Page: Clearing captured frame");
    setCapturedFrame(null);
  }, []);

  const handleToggleCamera = useCallback(() => {
    console.log("Page: Toggle camera clicked. Current state: isCameraActive =", isCameraActive);
    setIsCameraProcessing(true); // Indicate processing will start
    setIsCameraActive(prev => !prev); // This triggers CameraFeed to react
  }, []); // setIsCameraProcessing and setIsCameraActive are stable

  const handleCameraStarted = useCallback(() => {
    console.log("Page: CameraFeed reported camera started.");
    setIsCameraProcessing(false);
    // isCameraActive should be true at this point, set by handleToggleCamera
  }, []); // setIsCameraProcessing is stable

  const handleCameraStopped = useCallback(() => {
    console.log("Page: CameraFeed reported camera stopped.");
    setIsCameraProcessing(false);
    // isCameraActive should be false at this point, set by handleToggleCamera or error
  }, []); // setIsCameraProcessing is stable

  const handleCameraError = useCallback((errorMessage: string) => {
    console.log(`Page: CameraFeed reported error: ${errorMessage}`);
    setIsCameraProcessing(false);
    setIsCameraActive(false); // Ensure camera is marked as inactive on error
    // Toast is already shown by CameraFeed
  }, []); // setIsCameraProcessing and setIsCameraActive are stable


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

