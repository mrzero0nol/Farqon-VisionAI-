
'use client';

import { useState, useRef, useEffect, type FC, useCallback } from 'react';
import ChatMessage from './chat-message';
import ChatInput from './chat-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessageData, CameraFeedRefType } from '@/types';
import { contextualChatWithVision } from '@/ai/flows';
import { useToast } from '@/hooks/use-toast';

interface ChatPanelProps {
  cameraFeedRef: React.RefObject<CameraFeedRefType>;
  isCameraActive: boolean;
  isCameraProcessing: boolean; // Hardware camera processing
  onToggleCamera: () => void;
  isAiAnalyzing: boolean; // AI model processing
  setIsAiAnalyzing: (isAnalyzing: boolean) => void;
}

const ChatPanel: FC<ChatPanelProps> = ({
  cameraFeedRef,
  isCameraActive,
  isCameraProcessing,
  onToggleCamera,
  isAiAnalyzing,
  setIsAiAnalyzing,
}) => {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [currentContextImageUri, setCurrentContextImageUri] = useState<string | null>(null);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const addMessage = useCallback((message: ChatMessageData) => {
    setMessages(prev => [...prev, message]);
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

  useEffect(() => {
    if (chatContentRef.current) {
      setTimeout(() => {
        if (chatContentRef.current) {
          chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [messages]);
  
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
  
    setCurrentContextImageUri(imageDataUri); // Set image for user message display
    
    const userMessageId = Date.now().toString();
    // Add user message with the captured image
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
    <div className="w-full flex flex-col overflow-hidden max-h-[45vh] sm:max-h-[40vh]">
      <ScrollArea className="flex-grow p-3 sm:p-4">
        <div ref={chatContentRef} className="space-y-3">
          {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
        </div>
      </ScrollArea>
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
