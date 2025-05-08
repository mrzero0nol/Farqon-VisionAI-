
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
        window.speechSynthesis.cancel(); 
      };
    }
  }, []);
  
  const handleSendMessage = useCallback(async (userQuestion: string) => {
    stopSpeaking();
    setIsAiAnalyzing(true);
  
    if (!isCameraActive || !cameraFeedRef.current) {
      const errorMsg = "Kamera tidak aktif. Aktifkan kamera untuk bertanya tentang apa yang dilihatnya.";
      addMessage({ id: Date.now().toString(), role: 'assistant', content: errorMsg, isError: true });
      speakText(errorMsg);
      toast({ title: "Kamera Tidak Aktif", description: errorMsg, variant: "destructive" });
      setIsAiAnalyzing(false);
      return;
    }
  
    const imageDataUri = cameraFeedRef.current.captureCurrentFrame();
  
    if (!imageDataUri) {
      const errorMsg = "Tidak dapat menangkap gambar dari kamera. Pastikan kamera berfungsi dan berikan izin.";
      addMessage({ id: Date.now().toString(), role: 'assistant', content: errorMsg, isError: true });
      speakText(errorMsg);
      toast({ title: "Gagal Menangkap Gambar", description: errorMsg, variant: "destructive" });
      setIsAiAnalyzing(false);
      return;
    }
    
    const userMessageId = Date.now().toString();
    addMessage({ id: userMessageId, role: 'user', content: userQuestion, image: imageDataUri });
    
    try {
      console.log("ChatPanel: Sending user question with live camera frame to AI.");
      const response = await contextualChatWithVision({ photoDataUri: imageDataUri, question: userQuestion });
      addMessage({ id: Date.now().toString(), role: 'assistant', content: response.answer });
      if(response.answer) speakText(response.answer);
    } catch (error) {
      console.error("Error in contextual chat:", error);
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
      const aiErrorMsg = `Maaf, saya mengalami kesalahan saat memproses pertanyaan Anda dengan gambar: ${errorMessage.substring(0, 150)}...`;
      addMessage({ id: Date.now().toString(), role: 'assistant', content: aiErrorMsg, isError: true });
      speakText(`Terjadi kesalahan: ${errorMessage.substring(0,50)}`);
      toast({
        title: "Kesalahan Obrolan AI",
        description: `Gagal mendapatkan respons. ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsAiAnalyzing(false);
    }
  
  }, [addMessage, speakText, stopSpeaking, toast, setIsAiAnalyzing, isCameraActive, cameraFeedRef]);

  const toggleTts = () => {
    setIsTtsEnabled(prev => {
      if (prev) stopSpeaking(); 
      return !prev;
    });
  };

  return (
    <div className={cn("w-full flex flex-col overflow-hidden", className)}>
      {showChatBubbles ? (
        <ScrollArea className="flex-grow p-3 sm:p-4">
          <div ref={chatContentRef} className="space-y-3">
            {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex-grow"></div> // Spacer to keep ChatInput at the bottom
      )}
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isAiAnalyzing || isCameraProcessing} 
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
