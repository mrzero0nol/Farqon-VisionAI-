
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import CameraFeed from '@/components/chat/camera-feed';
import ChatPanel from '@/components/chat/chat-panel';
import type { CameraFeedRefType } from '@/types';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

export default function VisionAIChatPage() {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraProcessing, setIsCameraProcessing] = useState<boolean>(false); // For camera hardware start/stop
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false); // For AI model processing
  const cameraFeedRef = useRef<CameraFeedRefType>(null);
  const [showChatBubbles, setShowChatBubbles] = useState<boolean>(true);

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

  const handleToggleChatBubbles = useCallback(() => {
    setShowChatBubbles(prev => !prev);
  }, []);


  return (
    <div className="relative min-h-screen bg-background font-sans overflow-hidden"> {/* Added overflow-hidden to body container */}
      <div className="fixed inset-0 z-0">
        <CameraFeed 
          ref={cameraFeedRef}
          isCameraActive={isCameraActive}
          onStarted={handleCameraStarted}
          onStopped={handleCameraStopped}
          onErrorOccurred={handleCameraError}
          isCameraProcessing={isCameraProcessing} // Pass down the processing state
        />
      </div>

      <div className="fixed top-4 left-4 z-20">
        <Button
          variant="outline"
          size="icon"
          onClick={handleToggleChatBubbles}
          className="rounded-full bg-black/30 hover:bg-black/50 text-white border-white/30"
          aria-label={showChatBubbles ? "Sembunyikan Obrolan" : "Tampilkan Obrolan"}
        >
          {showChatBubbles ? <EyeOff size={20} /> : <Eye size={20} />}
        </Button>
      </div>

      {/* Watermark */}
      <div className="fixed top-2 right-4 z-20 text-right pointer-events-none">
        <h1 className="text-2xl font-bold text-white/80 drop-shadow-md">VisionAI</h1>
        <p className="text-xs text-white/70 drop-shadow-sm">Farqonzero.dev</p>
      </div>


      {/* Modified wrapper for ChatPanel to allow it to fill more screen height */}
      <div className="fixed inset-x-0 top-0 bottom-0 p-2 sm:p-4 z-10 flex flex-col pointer-events-none"> {/* Added pointer-events-none to allow interaction with elements behind if chat panel is mostly transparent */}
        <div className="max-w-2xl mx-auto w-full flex flex-col h-full"> {/* This container allows ChatPanel to use h-full */}
          <ChatPanel 
            cameraFeedRef={cameraFeedRef}
            isCameraActive={isCameraActive} 
            isCameraProcessing={isCameraProcessing}
            onToggleCamera={handleToggleCamera}
            isAiAnalyzing={isAiAnalyzing}
            setIsAiAnalyzing={setIsAiAnalyzing}
            showChatBubbles={showChatBubbles}
            className="h-full pointer-events-auto" // Added pointer-events-auto to ChatPanel itself
          />
        </div>
      </div>
    </div>
  );
}

