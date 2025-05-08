
'use client';

import { useState, useRef, useEffect, type FC } from 'react';
import ChatMessage from './chat-message';
import ChatInput from './chat-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessageData } from '@/types';
import { contextualChatWithVision, analyzeCameraFeed } from '@/ai/flows'; // Assuming these are in index.ts of flows
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquareDashed } from 'lucide-react';

interface ChatPanelProps {
  capturedFrame: string | null; // dataURI of the captured frame
  isCameraActive: boolean;
  clearCapturedFrame: () => void;
}

const ChatPanel: FC<ChatPanelProps> = ({ capturedFrame, isCameraActive, clearCapturedFrame }) => {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const addMessage = (message: ChatMessageData) => {
    setMessages(prev => [...prev, message]);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    // This effect runs when a new frame is captured AND the camera is active.
    // It automatically triggers an analysis of the new frame.
    if (capturedFrame && isCameraActive) {
      handleAnalyzeFrame(capturedFrame);
      clearCapturedFrame(); // Clear the frame after processing to prevent re-analysis on other state changes
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedFrame, isCameraActive]); // Removed clearCapturedFrame from deps

  const handleAnalyzeFrame = async (imageDataUri: string) => {
    setIsLoading(true);
    addMessage({ id: Date.now().toString() + 'img-prompt', role: 'user', content: 'What do you see in this image?', image: imageDataUri});
    try {
      const response = await analyzeCameraFeed({ photoDataUri: imageDataUri });
      addMessage({ id: Date.now().toString(), role: 'assistant', content: response.summary });
    } catch (error) {
      console.error("Error analyzing camera feed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      addMessage({ id: Date.now().toString(), role: 'assistant', content: `Sorry, I encountered an error: ${errorMessage}`, isError: true });
      toast({
        title: "AI Analysis Error",
        description: `Failed to analyze image. ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSendMessage = async (userQuestion: string) => {
    if (!capturedFrame && !isCameraActive) {
      toast({
        title: "No Image Context",
        description: "Please start the camera and capture a frame, or ensure a frame was recently captured to ask questions about.",
        variant: "destructive"
      });
      addMessage({ id: Date.now().toString() + '-user-error', role: 'user', content: userQuestion });
      addMessage({ id: Date.now().toString() + '-ai-error', role: 'assistant', content: "I need an image to 'see'. Please capture a frame from the camera first.", isError: true });
      return;
    }

    const imageToSend = capturedFrame; // Use the latest captured frame if available
    
    addMessage({ id: Date.now().toString(), role: 'user', content: userQuestion, image: imageToSend ? imageToSend : undefined });
    setIsLoading(true);

    // If there's no image to send, but camera is active, prompt to capture
    if (!imageToSend && isCameraActive) {
        addMessage({id: Date.now().toString() + '-no-img', role: 'assistant', content: "I don't have a specific image for this question. Please capture a frame if you want me to analyze something new. I will try to answer based on general knowledge or previous context if any."});
        // Optionally, you could disable AI call here or let it proceed without image.
        // For now, we'll let it proceed, the AI should handle no image gracefully if designed for it.
        // However, contextualChatWithVision expects an image.
         toast({
            title: "No Image for Question",
            description: "Please capture a frame to ask about specific visual content.",
            variant: "destructive"
        });
        setIsLoading(false);
        return;
    }
    
    // If no image is available AT ALL (neither capturedFrame nor active camera)
    if (!imageToSend && !isCameraActive) {
       addMessage({id: Date.now().toString() + '-critical-no-img', role: 'assistant', content: "I can't see anything right now. Please start the camera and capture an image.", isError: true});
       setIsLoading(false);
       return;
    }


    if (imageToSend) { // Ensure imageToSend is not null before calling AI
      try {
        const response = await contextualChatWithVision({ photoDataUri: imageToSend, question: userQuestion });
        addMessage({ id: Date.now().toString(), role: 'assistant', content: response.answer });
      } catch (error) {
        console.error("Error in contextual chat:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        addMessage({ id: Date.now().toString(), role: 'assistant', content: `Sorry, I encountered an error: ${errorMessage}`, isError: true });
        toast({
          title: "AI Chat Error",
          description: `Failed to get response. ${errorMessage}`,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        //  clearCapturedFrame(); // Clear frame after it's used in a question
      }
    } else {
      // This case should ideally be handled by the checks above, but as a fallback:
      addMessage({ id: Date.now().toString() + '-fallback-no-img', role: 'assistant', content: "I don't have an image to reference for your question.", isError: true });
      setIsLoading(false);
    }
  };


  return (
    <Card className="flex flex-col h-full shadow-lg">
      <CardHeader>
        <CardTitle>Chat with VisionAI</CardTitle>
      </CardHeader>
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquareDashed size={48} className="mb-4" />
            <p className="text-center">Start the camera, capture a frame, or ask a question!</p>
            <p className="text-xs text-center mt-1">Captured frames will be automatically analyzed.</p>
          </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
      </ScrollArea>
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </Card>
  );
};

export default ChatPanel;
