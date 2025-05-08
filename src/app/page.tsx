
'use client';

import { useState } from 'react';
import CameraFeed from '@/components/chat/camera-feed';
import ChatPanel from '@/components/chat/chat-panel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="min-h-screen bg-background flex flex-col items-center p-4 font-sans">
      <header className="w-full max-w-5xl mb-6">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold text-primary flex items-center">
                <Eye className="mr-2 h-8 w-8 text-accent" /> Farqon VisionAI
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Interact with your world through AI-powered vision.
              </CardDescription>
            </div>
            <Link href="https://github.com/GoogleCloudPlatform/firebase-genkit-nextjs-template" target="_blank" rel="noopener noreferrer" aria-label="View source on GitHub">
               <Github className="h-7 w-7 text-foreground hover:text-primary transition-colors" />
            </Link>
          </CardHeader>
        </Card>
      </header>

      <main className="w-full max-w-5xl flex-grow grid md:grid-cols-2 gap-6">
        <div className="flex flex-col">
          <CameraFeed onFrameCapture={handleFrameCapture} isCameraActive={isCameraActive} setIsCameraActive={setIsCameraActive} />
        </div>
        <div className="flex flex-col h-[calc(100vh-12rem)] md:h-auto md:max-h-[calc(100vh-10rem)]"> 
          <ChatPanel capturedFrame={capturedFrame} isCameraActive={isCameraActive} clearCapturedFrame={clearCapturedFrame} />
        </div>
      </main>
      
      <footer className="w-full max-w-5xl mt-8 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by Genkit and Next.js. Farqon VisionAI &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
