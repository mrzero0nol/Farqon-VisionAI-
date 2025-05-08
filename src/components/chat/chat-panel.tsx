
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
    addMessage({ id: Date.now().toString() + 'img-prompt', role: 'user', content: 'Apa yang Anda lihat di gambar ini?', image: imageDataUri });
    try {
      const response = await analyzeCameraFeed({ photoDataUri: imageDataUri });
      addMessage({ id: Date.now().toString(), role: 'assistant', content: response.summary });
      if (response.summary) speakText(response.summary);
    } catch (error) {
      console.error("Error analyzing camera feed:", error);
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
      const aiErrorMsg = `Maaf, saya mengalami kesalahan: ${errorMessage}`;
      addMessage({ id: Date.now().toString(), role: 'assistant', content: aiErrorMsg, isError: true });
      speakText(aiErrorMsg);
      toast({
        title: "Kesalahan Analisis AI",
        description: `Gagal menganalisis gambar. ${errorMessage}`,
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
        title: "Tidak Ada Konteks Gambar",
        description: "Silakan mulai kamera dan tangkap frame, atau pastikan frame baru saja ditangkap untuk bertanya tentangnya.",
        variant: "destructive"
      });
      addMessage({ id: Date.now().toString() + '-user-error', role: 'user', content: userQuestion });
      const aiErrorMsg = "Saya membutuhkan gambar untuk 'melihat'. Harap aktifkan kamera dan tangkap frame terlebih dahulu.";
      addMessage({ id: Date.now().toString() + '-ai-error', role: 'assistant', content: aiErrorMsg, isError: true });
      speakText(aiErrorMsg);
      return;
    }

    const imageToSend = capturedFrame;

    addMessage({ id: Date.now().toString(), role: 'user', content: userQuestion, image: imageToSend ? imageToSend : undefined });
    setIsLoading(true);

    if (!imageToSend && isCameraActive) {
      const aiMsg = "Saya tidak memiliki gambar spesifik untuk pertanyaan ini. Harap tangkap frame jika Anda ingin saya menganalisis sesuatu yang baru. Saya akan mencoba menjawab berdasarkan pengetahuan umum atau konteks sebelumnya jika ada.";
      addMessage({ id: Date.now().toString() + '-no-img', role: 'assistant', content: aiMsg });
      speakText(aiMsg);
      toast({
        title: "Tidak Ada Gambar untuk Pertanyaan",
        description: "Harap tangkap frame untuk bertanya tentang konten visual tertentu.",
        variant: "warning"
      });
      setIsLoading(false);
      return;
    }

    if (!imageToSend && !isCameraActive) {
      const aiErrorMsg = "Saya tidak bisa melihat apa pun saat ini. Harap mulai kamera dan tangkap gambar.";
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
        const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
        const aiErrorMsg = `Maaf, saya mengalami kesalahan: ${errorMessage}`;
        addMessage({ id: Date.now().toString(), role: 'assistant', content: aiErrorMsg, isError: true });
        speakText(aiErrorMsg);
        toast({
          title: "Kesalahan Obrolan AI",
          description: `Gagal mendapatkan respons. ${errorMessage}`,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      const aiErrorMsg = "Saya tidak memiliki gambar untuk dirujuk untuk pertanyaan Anda. Harap tangkap frame.";
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

