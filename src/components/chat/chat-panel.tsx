
'use client';

import { useState, useRef, useEffect, type FC, useCallback } from 'react';
import ChatMessage from './chat-message';
import ChatInput from './chat-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessageData } from '@/types';
import { contextualChatWithVision, analyzeCameraFeed } from '@/ai/flows';
import { useToast } from '@/hooks/use-toast';
import { MessageSquareDashed } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  capturedFrame: string | null;
  isCameraActive: boolean;
  clearCapturedFrame: () => void;
  isCameraProcessing: boolean;
  onToggleCamera: () => void;
}

const ChatPanel: FC<ChatPanelProps> = ({
  capturedFrame,
  isCameraActive,
  clearCapturedFrame,
  isCameraProcessing,
  onToggleCamera,
}) => {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false); // For AI message loading
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const addMessage = (message: ChatMessageData) => {
    setMessages(prev => [...prev, message]);
  };

  const speakText = useCallback((text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis && text && isTtsEnabled) {
      window.speechSynthesis.cancel(); // Stop any previous speech
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const indonesianVoice = voices.find(voice => voice.lang === 'id-ID' || voice.lang.startsWith('id-'));
      if (indonesianVoice) {
        utterance.voice = indonesianVoice;
      } else {
        const defaultVoice = voices.find(voice => voice.default);
        if (defaultVoice) utterance.voice = defaultVoice;
      }
      utterance.lang = 'id-ID';
      window.speechSynthesis.speak(utterance);
    }
  }, [isTtsEnabled]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.getVoices();
      }
    };
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  useEffect(() => {
    if (chatContentRef.current) {
      setTimeout(() => {
        if (chatContentRef.current) {
          chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [messages]);

  useEffect(() => {
    if (capturedFrame && isCameraActive) {
      handleAnalyzeFrame(capturedFrame);
      clearCapturedFrame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedFrame, isCameraActive]);

  const handleAnalyzeFrame = async (imageDataUri: string) => {
    setIsLoading(true);
    stopSpeaking();
    addMessage({ id: Date.now().toString() + 'img-prompt', role: 'user', content: 'What do you see in this image?', image: imageDataUri });
    try {
      const response = await analyzeCameraFeed({ photoDataUri: imageDataUri });
      addMessage({ id: Date.now().toString(), role: 'assistant', content: response.summary });
      if (response.summary) speakText(response.summary);
    } catch (error) {
      console.error("Error analyzing camera feed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      const aiErrorMsg = `Sorry, I encountered an error: ${errorMessage}`;
      addMessage({ id: Date.now().toString(), role: 'assistant', content: aiErrorMsg, isError: true });
      speakText(aiErrorMsg);
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
    stopSpeaking();
    if (!capturedFrame && !isCameraActive) {
      toast({
        title: "No Image Context",
        description: "Please start the camera and capture a frame, or ensure a frame was recently captured to ask questions about.",
        variant: "destructive"
      });
      addMessage({ id: Date.now().toString() + '-user-error', role: 'user', content: userQuestion });
      const aiErrorMsg = "I need an image to 'see'. Please activate the camera and capture a frame first.";
      addMessage({ id: Date.now().toString() + '-ai-error', role: 'assistant', content: aiErrorMsg, isError: true });
      speakText(aiErrorMsg);
      return;
    }

    const imageToSend = capturedFrame;

    addMessage({ id: Date.now().toString(), role: 'user', content: userQuestion, image: imageToSend ? imageToSend : undefined });
    setIsLoading(true);

    if (!imageToSend && isCameraActive) {
      const aiMsg = "I don't have a specific image for this question. Please capture a frame if you want me to analyze something new. I will try to answer based on general knowledge or previous context if any.";
      addMessage({ id: Date.now().toString() + '-no-img', role: 'assistant', content: aiMsg });
      speakText(aiMsg);
      toast({
        title: "No Image for Question",
        description: "Please capture a frame to ask about specific visual content.",
        variant: "warning"
      });
      setIsLoading(false);
      return;
    }

    if (!imageToSend && !isCameraActive) {
      const aiErrorMsg = "I can't see anything right now. Please start the camera and capture an image.";
      addMessage({ id: Date.now().toString() + '-critical-no-img', role: 'assistant', content: aiErrorMsg, isError: true });
      speakText(aiErrorMsg);
      setIsLoading(false);
      return;
    }

    if (imageToSend) {
      try {
        const response = await contextualChatWithVision({ photoDataUri: imageToSend, question: userQuestion });
        addMessage({ id: Date.now().toString(), role: 'assistant', content: response.answer });
        if(response.answer) speakText(response.answer);
      } catch (error) {
        console.error("Error in contextual chat:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        const aiErrorMsg = `Sorry, I encountered an error: ${errorMessage}`;
        addMessage({ id: Date.now().toString(), role: 'assistant', content: aiErrorMsg, isError: true });
        speakText(aiErrorMsg);
        toast({
          title: "AI Chat Error",
          description: `Failed to get response. ${errorMessage}`,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      const aiErrorMsg = "I don't have an image to reference for your question. Please capture a frame.";
      addMessage({ id: Date.now().toString() + '-fallback-no-img', role: 'assistant', content: aiErrorMsg, isError: true });
      speakText(aiErrorMsg);
      setIsLoading(false);
    }
  };

  const toggleTts = () => {
    setIsTtsEnabled(prev => {
      if (prev) stopSpeaking(); 
      return !prev;
    });
  };

  return (
    <div className="w-full flex flex-col overflow-hidden max-h-[45vh] sm:max-h-[40vh]">
      <ScrollArea className="flex-grow p-3 sm:p-4">
        <div ref={chatContentRef} className="space-y-3">
          {messages.length === 0 ? (
            null // Removed placeholder text
          ) : (
            messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
          )}
        </div>
      </ScrollArea>
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        isCameraActive={isCameraActive}
        isCameraProcessing={isCameraProcessing}
        onToggleCamera={onToggleCamera}
        isTtsEnabled={isTtsEnabled}
        onToggleTts={toggleTts}
        stopSpeaking={stopSpeaking}
      />
    </div>
  );
};

export default ChatPanel;

