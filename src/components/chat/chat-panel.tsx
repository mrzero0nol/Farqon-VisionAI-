
'use client';

import { useState, useRef, useEffect, type FC, useCallback } from 'react';
import ChatMessage from './chat-message';
import ChatInput from './chat-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessageData, CameraFeedRefType } from '@/types';
import { contextualChatWithVision } from '@/ai/flows';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  cameraFeedRef: React.RefObject<CameraFeedRefType>;
  isCameraActive: boolean;
  isCameraProcessing: boolean; // Hardware camera processing
  onToggleCamera: () => void;
  isAiAnalyzing: boolean; // AI model processing
  setIsAiAnalyzing: (isAnalyzing: boolean) => void;
  showChatBubbles: boolean;
  className?: string; // Added className prop
}

const ChatPanel: FC<ChatPanelProps> = ({
  cameraFeedRef,
  isCameraActive,
  isCameraProcessing,
  onToggleCamera,
  isAiAnalyzing,
  setIsAiAnalyzing,
  showChatBubbles,
  className, // Destructure className
}) => {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const addMessage = useCallback((message: ChatMessageData) => {
    setMessages(prev => [message, ...prev]); // Prepend new messages
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speakText = useCallback((text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis && text && isTtsEnabled) {
      window.speechSynthesis.cancel();
      const cleanedText = text.replace(/\*/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanedText);
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

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          // For some browsers, onvoiceschanged needs to fire first.
        }
      }
    };
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      };
    }
  }, []);
  
  const handleSendMessage = useCallback(async (userQuestion: string) => {
    stopSpeaking();
    setIsAiAnalyzing(true);
    
    // Clear previous highlights before sending new message or if camera is off
    if (cameraFeedRef.current?.drawHighlights) {
        cameraFeedRef.current.drawHighlights(null);
    }
  
    let imageDataUri: string | null = null;
    if (isCameraActive && cameraFeedRef.current) {
      imageDataUri = cameraFeedRef.current.captureCurrentFrame();
      if (!imageDataUri) {
        console.warn("ChatPanel: Camera is active, but failed to capture frame. Proceeding without image for this turn.");
        toast({ title: "Peringatan Kamera", description: "Gagal menangkap gambar dari kamera untuk pertanyaan ini. AI akan merespons tanpa gambar baru.", variant: "default" });
      }
    } else if (!isCameraActive) {
      console.log("ChatPanel: Camera is not active. Sending message without new image.");
    }
    
    const userMessageData: ChatMessageData = {
      id: Date.now().toString(),
      role: 'user',
      content: userQuestion,
      image: imageDataUri ?? undefined
    };

    const historyForAI = [...messages]
      .reverse()
      .map(msg => ({ role: msg.role, content: msg.content }));

    addMessage(userMessageData);
    
    try {
      console.log("ChatPanel: Sending to AI. Image for this turn:", imageDataUri ? "Present" : "Absent", "History items:", historyForAI.length);
      const response = await contextualChatWithVision({
        photoDataUri: imageDataUri ?? undefined,
        question: userQuestion,
        history: historyForAI
      });

      const assistantMessageData: ChatMessageData = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.answer,
        countedObjects: response.countedObjects, // Store counted objects with the message
      };
      addMessage(assistantMessageData);

      if (response.answer) speakText(response.answer);

      // Draw highlights if objects were counted
      if (response.countedObjects && response.countedObjects.length > 0) {
        if (cameraFeedRef.current?.drawHighlights) {
          cameraFeedRef.current.drawHighlights(response.countedObjects);
        }
      } else {
        // Ensure highlights are cleared if no objects were counted or if camera is off
         if (cameraFeedRef.current?.drawHighlights) {
          cameraFeedRef.current.drawHighlights(null);
        }
      }

    } catch (error) {
      console.error("Error in contextual chat:", error);
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
      const aiErrorMsg = `Maaf, saya mengalami kesalahan saat memproses pertanyaan Anda: ${errorMessage.substring(0, 150)}...`;
      addMessage({ id: Date.now().toString(), role: 'assistant', content: aiErrorMsg, isError: true });
      speakText(`Terjadi kesalahan: ${errorMessage.substring(0,50)}`);
      toast({
        title: "Kesalahan Obrolan AI",
        description: `Gagal mendapatkan respons. ${errorMessage}`,
        variant: "destructive",
      });
      // Clear highlights on error
      if (cameraFeedRef.current?.drawHighlights) {
          cameraFeedRef.current.drawHighlights(null);
      }
    } finally {
      setIsAiAnalyzing(false);
    }
  
  }, [messages, addMessage, speakText, stopSpeaking, toast, setIsAiAnalyzing, isCameraActive, cameraFeedRef]);

  const toggleTts = () => {
    setIsTtsEnabled(prev => {
      if (prev) stopSpeaking();
      return !prev;
    });
  };

  const handleToggleFacingMode = useCallback(() => {
    if (cameraFeedRef.current?.toggleFacingMode) {
      cameraFeedRef.current.toggleFacingMode();
    }
     // Clear highlights when toggling camera as the view changes
    if (cameraFeedRef.current?.drawHighlights) {
        cameraFeedRef.current.drawHighlights(null);
    }
  }, [cameraFeedRef]);

  return (
    <div className={cn("w-full flex flex-col overflow-hidden", className)}>
      {showChatBubbles ? (
        <ScrollArea className="flex-grow p-3 sm:p-4">
          <div ref={chatContentRef} className="space-y-3">
            {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex-grow"></div>
      )}
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isAiAnalyzing || isCameraProcessing}
        isCameraActive={isCameraActive}
        isCameraProcessing={isCameraProcessing}
        onToggleCamera={() => {
          onToggleCamera();
           // Clear highlights when toggling camera state
          if (cameraFeedRef.current?.drawHighlights) {
            cameraFeedRef.current.drawHighlights(null);
          }
        }}
        onToggleFacingMode={handleToggleFacingMode}
        isTtsEnabled={isTtsEnabled}
        onToggleTts={toggleTts}
        stopSpeaking={stopSpeaking}
      />
    </div>
  );
};

export default ChatPanel;
