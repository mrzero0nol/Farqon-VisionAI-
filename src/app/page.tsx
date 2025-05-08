
'use client';

import { useState } from 'react';
import CameraFeed from '@/components/chat/camera-feed';
import ChatPanel from '@/components/chat/chat-panel';
import { Github, Eye } from 'lucide-react';
import Link from 'next/link';

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

      {/* Floating Header Elements */}
      <header className="fixed top-0 left-0 right-0 p-4 sm:p-6 z-20 flex justify-between items-start sm:items-center">
        <div className="bg-card/80 backdrop-blur-md p-3 rounded-lg shadow-xl">
          <h1 className="text-xl sm:text-2xl font-bold text-primary flex items-center">
            <Eye className="mr-2 h-6 w-6 sm:h-7 sm:w-7 text-accent" /> Farqon VisionAI
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xs sm:max-w-sm">
            Interact with your world through AI-powered vision.
          </p>
        </div>
        <Link 
          href="https://github.com/GoogleCloudPlatform/firebase-genkit-nextjs-template" 
          target="_blank" 
          rel="noopener noreferrer" 
          aria-label="View source on GitHub"
          className="bg-card/80 backdrop-blur-md p-3 rounded-full shadow-xl hover:bg-primary/10 transition-colors"
        >
           <Github className="h-6 w-6 sm:h-7 sm:w-7 text-foreground hover:text-primary transition-colors" />
        </Link>
      </header>

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
