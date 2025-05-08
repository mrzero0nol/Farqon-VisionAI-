
'use client';

import { useState, useCallback, useEffect } from 'react';
import CameraFeed from '@/components/chat/camera-feed';
import ChatPanel from '@/components/chat/chat-panel';
import { useToast } from '@/hooks/use-toast';

export default function VisionAIChatPage() {
  const [autoCapturedFrame, setAutoCapturedFrame] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraProcessing, setIsCameraProcessing] = useState<boolean>(false); // For camera hardware start/stop
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false); // For AI model processing
  const { toast } = useToast();

  useEffect(() => {
    console.log(`Page: isCameraActive: ${isCameraActive}, isCameraProcessing: ${isCameraProcessing}, isAiAnalyzing: ${isAiAnalyzing}`);
  }, [isCameraActive, isCameraProcessing, isAiAnalyzing]);

  // This callback is for CameraFeed's automatic periodic captures
  const handleAutoFrameForAnalysis = useCallback((dataUri: string | null) => {
    if (dataUri) {
      console.log("Page: Auto-frame received for analysis");
      setAutoCapturedFrame(dataUri); // This will trigger ChatPanel's useEffect
    }
  }, []);

  const clearAutoCapturedFrame = useCallback(() => {
    console.log("Page: Clearing auto-captured frame");
    setAutoCapturedFrame(null);
  }, []);

  const handleToggleCamera = useCallback(() => {
    console.log("Page: Toggle camera clicked. Current state: isCameraActive =", isCameraActive);
    setIsCameraProcessing(true); 
    setIsCameraActive(prev => !prev); 
  }, []); 

  const handleCameraStarted = useCallback(() => {
    console.log("Page: CameraFeed reported camera started.");
    setIsCameraProcessing(false);
  }, []); 

  const handleCameraStopped = useCallback(() => {
    console.log("Page: CameraFeed reported camera stopped.");
    setIsCameraProcessing(false);
    setIsAiAnalyzing(false); // Stop AI analysis if camera stops
    clearAutoCapturedFrame(); // Clear any pending frame
  }, [clearAutoCapturedFrame]);

  const handleCameraError = useCallback((errorMessage: string) => {
    console.log(`Page: CameraFeed reported error: ${errorMessage}`);
    setIsCameraProcessing(false);
    setIsCameraActive(false); 
    setIsAiAnalyzing(false);
    clearAutoCapturedFrame();
  }, [clearAutoCapturedFrame]);


  return (
    <div className="relative min-h-screen bg-background font-sans">
      <div className="fixed inset-0 z-0">
        <CameraFeed 
          onFrameForAnalysis={handleAutoFrameForAnalysis}
          isCameraActive={isCameraActive}
          onStarted={handleCameraStarted}
          onStopped={handleCameraStopped}
          onErrorOccurred={handleCameraError}
          isAiAnalyzing={isAiAnalyzing} // Pass AI analysis status to CameraFeed
          analysisIntervalMs={7000} // e.g., analyze every 7 seconds
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-2 sm:p-4 z-10">
        <div className="max-w-2xl mx-auto">
          <ChatPanel 
            autoCapturedFrame={autoCapturedFrame} 
            isCameraActive={isCameraActive} 
            clearAutoCapturedFrame={clearAutoCapturedFrame}
            isCameraProcessing={isCameraProcessing}
            onToggleCamera={handleToggleCamera}
            isAiAnalyzing={isAiAnalyzing}
            setIsAiAnalyzing={setIsAiAnalyzing}
          />
        </div>
      </div>
    </div>
  );
}
