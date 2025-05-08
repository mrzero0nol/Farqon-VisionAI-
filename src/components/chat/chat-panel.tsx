
'use client';

import { useState, useRef, useEffect, type FC } from 'react';
import ChatMessage from './chat-message';
import ChatInput from './chat-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessageData } from '@/types';
import { contextualChatWithVision, analyzeCameraFeed } from '@/ai/flows';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronDown, ChevronUp, MessageSquareDashed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  capturedFrame: string | null; 
  isCameraActive: boolean;
  clearCapturedFrame: () => void;
}

const ChatPanel: FC<ChatPanelProps> = ({ capturedFrame, isCameraActive, clearCapturedFrame }) => {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const addMessage = (message: ChatMessageData) => {
    setMessages(prev => [...prev, message]);
  };

  useEffect(() => {
    if (isChatOpen && chatContentRef.current) {
        // Wait for next tick to allow DOM update for scroll height
        setTimeout(() => {
            if(chatContentRef.current) {
                 chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
            }
        }, 0);
    }
  }, [messages, isChatOpen]);

  useEffect(() => {
    if (capturedFrame && isCameraActive) {
      handleAnalyzeFrame(capturedFrame);
      // Automatically open chat if it's closed and a new frame is analyzed
      if (!isChatOpen) {
        // setIsChatOpen(true); // User might prefer manual opening
      }
      clearCapturedFrame(); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedFrame, isCameraActive, clearCapturedFrame]); // Added clearCapturedFrame

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

    const imageToSend = capturedFrame; 
    
    addMessage({ id: Date.now().toString(), role: 'user', content: userQuestion, image: imageToSend ? imageToSend : undefined });
    setIsLoading(true);

    if (!imageToSend && isCameraActive) {
        addMessage({id: Date.now().toString() + '-no-img', role: 'assistant', content: "I don't have a specific image for this question. Please capture a frame if you want me to analyze something new. I will try to answer based on general knowledge or previous context if any."});
         toast({
            title: "No Image for Question",
            description: "Please capture a frame to ask about specific visual content.",
            variant: "destructive"
        });
        setIsLoading(false);
        return;
    }
    
    if (!imageToSend && !isCameraActive) {
       addMessage({id: Date.now().toString() + '-critical-no-img', role: 'assistant', content: "I can't see anything right now. Please start the camera and capture an image.", isError: true});
       setIsLoading(false);
       return;
    }

    if (imageToSend) { 
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
      }
    } else {
      addMessage({ id: Date.now().toString() + '-fallback-no-img', role: 'assistant', content: "I don't have an image to reference for your question.", isError: true });
      setIsLoading(false);
    }
  };

  return (
    <Card className={cn(
      "w-full shadow-xl rounded-t-xl overflow-hidden bg-card/90 backdrop-blur-md transition-all duration-300 ease-in-out",
      isChatOpen ? 'max-h-[75vh] sm:max-h-[65vh]' : 'max-h-[72px] sm:max-h-[80px]' // Adjusted height for collapsed state
    )}>
      <CardHeader 
        className="flex flex-row items-center justify-between p-3 sm:p-4 cursor-pointer select-none" 
        onClick={() => setIsChatOpen(!isChatOpen)}
      >
        <div>
          <CardTitle className="text-md sm:text-lg">VisionAI Chat</CardTitle>
          {!isChatOpen && messages.length > 0 && (
            <CardDescription className="text-xs mt-1 truncate max-w-[calc(100vw-120px)] sm:max-w-md">
              {messages[messages.length -1].role === 'user' ? 'You: ' : 'AI: '}
              {messages[messages.length -1].content}
            </CardDescription>
          )}
           {!isChatOpen && messages.length === 0 && (
             <CardDescription className="text-xs mt-1">Click to expand chat</CardDescription>
           )}
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground -mr-2 sm:mr-0">
          {isChatOpen ? <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6" /> : <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6" />}
          <span className="sr-only">{isChatOpen ? "Collapse Chat" : "Expand Chat"}</span>
        </Button>
      </CardHeader>
      
      <div className={cn("transition-opacity duration-200", isChatOpen ? "opacity-100" : "opacity-0 h-0 overflow-hidden")}>
          <ScrollArea viewPortClassName="max-h-[calc(75vh-140px)] sm:max-h-[calc(65vh-150px)]" className="h-full">
             <div ref={chatContentRef} className="p-3 sm:p-4 space-y-3">
                {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                    <MessageSquareDashed size={40} className="mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base text-center">Start the camera, capture a frame, or ask a question!</p>
                    <p className="text-xs text-center mt-1">Captured frames will be automatically analyzed.</p>
                </div>
                ) : (
                messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
                )}
             </div>
          </ScrollArea>
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </Card>
  );
};

export default ChatPanel;
