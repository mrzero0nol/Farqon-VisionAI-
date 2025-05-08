
'use client';

import { useState } from 'react';
import CameraFeed from '@/components/chat/camera-feed';
import ChatPanel from '@/components/chat/chat-panel';

export default function VisionAIChatPage() {
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  const handleFrameCapture = (dataUri: string) => {
    setCapturedFrame(dataUri);
  };

  const clearCapturedFrame = () => {
    setCapturedFrame(null);
  }

  return (
    <div className="relative min-h-screen bg-background font-sans">
      {/* Camera Feed will be full screen */}
      <div className="fixed inset-0 z-0">
        <CameraFeed onFrameCapture={handleFrameCapture} isCameraActive={isCameraActive} setIsCameraActive={setIsCameraActive} />
      </div>

      {/* Floating Chat Panel */}
      <div className="fixed bottom-0 left-0 right-0 p-2 sm:p-4 z-10">
        <div className="max-w-2xl mx-auto">
          <ChatPanel capturedFrame={capturedFrame} isCameraActive={isCameraActive} clearCapturedFrame={clearCapturedFrame} />
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
