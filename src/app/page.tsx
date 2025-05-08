
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import CameraFeed from '@/components/chat/camera-feed';
import ChatPanel from '@/components/chat/chat-panel';
import type { CameraFeedRefType } from '@/types';

export default function VisionAIChatPage() {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraProcessing, setIsCameraProcessing] = useState<boolean>(false); // For camera hardware start/stop
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false); // For AI model processing
  const cameraFeedRef = useRef<CameraFeedRefType>(null);

  useEffect(() => {
    console.log(`Page: isCameraActive: ${isCameraActive}, isCameraProcessing: ${isCameraProcessing}, isAiAnalyzing: ${isAiAnalyzing}`);
  }, [isCameraActive, isCameraProcessing, isAiAnalyzing]);

  const handleToggleCamera = useCallback(() => {
    console.log("Page: Toggle camera clicked. Current state: isCameraActive =", isCameraActive);
    setIsCameraProcessing(true); 
    setIsCameraActive(prev => !prev); 
  }, [isCameraActive]); 

  const handleCameraStarted = useCallback(() => {
    console.log("Page: CameraFeed reported camera started.");
    setIsCameraProcessing(false);
  }, []); 

  const handleCameraStopped = useCallback(() => {
    console.log("Page: CameraFeed reported camera stopped.");
    setIsCameraProcessing(false);
    setIsAiAnalyzing(false); // Stop AI analysis if camera stops
  }, []);

  const handleCameraError = useCallback((errorMessage: string) => {
    console.log(`Page: CameraFeed reported error: ${errorMessage}`);
    setIsCameraProcessing(false);
    setIsCameraActive(false); 
    setIsAiAnalyzing(false);
  }, []);


  return (
    <div className="relative min-h-screen bg-background font-sans">
      <div className="fixed inset-0 z-0">
        <CameraFeed 
          ref={cameraFeedRef}
          isCameraActive={isCameraActive}
          onStarted={handleCameraStarted}
          onStopped={handleCameraStopped}
          onErrorOccurred={handleCameraError}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-2 sm:p-4 z-10">
        <div className="max-w-2xl mx-auto">
          <ChatPanel 
            cameraFeedRef={cameraFeedRef}
            isCameraActive={isCameraActive} 
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
