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

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.getVoices(); // Ensure voices are loaded
      }
    };
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      loadVoices(); // Initial load
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


  const handleAnalyzeFrame = useCallback(async (imageDataUri: string) => {
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
  }, [addMessage, speakText, stopSpeaking, toast]);
  
  useEffect(() => {
    // Trigger analysis only when capturedFrame is newly set and valid.
    // isCameraActive check removed from here, as frame capture itself implies camera was active.
    // Analysis should proceed even if camera is toggled off right after capture.
    if (capturedFrame) { 
      handleAnalyzeFrame(capturedFrame);
      clearCapturedFrame(); // Clear it after initiating analysis to prevent re-analysis on re-renders.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedFrame, handleAnalyzeFrame, clearCapturedFrame]); // Only react to capturedFrame changes


  const handleSendMessage = useCallback(async (userQuestion: string) => {
    stopSpeaking();
    
    // Use the `capturedFrame` state variable, which holds the last captured frame.
    // It's cleared by `handleAnalyzeFrame` after initiating analysis.
    // If a question is asked immediately after auto-analysis, `capturedFrame` might be null here.
    // This logic assumes a question relates to the *last visual context*, which is the analyzed frame.
    // If no frame has been captured and analyzed recently, it will prompt to start camera.
    
    // Determine if there's *any* visual context.
    // This depends on how `capturedFrame` is managed by the parent and when `handleAnalyzeFrame` clears it.
    // Let's assume if a message has an image, that's our context.
    const lastMessageWithImage = messages.slice().reverse().find(msg => msg.image);
    const imageContextForQuestion = lastMessageWithImage?.image;

    if (!isCameraActive && !imageContextForQuestion) {
      toast({
        title: "Tidak Ada Konteks Gambar",
        description: "Silakan mulai kamera dan tangkap frame untuk bertanya tentangnya.",
        variant: "destructive"
      });
      addMessage({ id: Date.now().toString() + '-user-error', role: 'user', content: userQuestion });
      const aiErrorMsg = "Saya membutuhkan gambar untuk 'melihat'. Harap aktifkan kamera dan tangkap frame terlebih dahulu.";
      addMessage({ id: Date.now().toString() + '-ai-error', role: 'assistant', content: aiErrorMsg, isError: true });
      speakText(aiErrorMsg);
      return;
    }
    
    addMessage({ id: Date.now().toString(), role: 'user', content: userQuestion, image: imageContextForQuestion ? imageContextForQuestion : undefined });
    setIsLoading(true);

    if (!imageContextForQuestion) {
        // This case means camera might be active, but no frame was explicitly captured *for this question*
        // or the auto-analyzed frame is not considered the direct context for this specific question.
        // The AI should be informed.
        const aiMsg = "Saya tidak memiliki gambar spesifik untuk pertanyaan ini. Jika Anda ingin saya melihat sesuatu yang baru, harap tangkap frame. Saya akan mencoba menjawab berdasarkan pengetahuan umum atau konteks visual sebelumnya jika ada.";
        addMessage({ id: Date.now().toString() + '-no-img', role: 'assistant', content: aiMsg });
        speakText(aiMsg);
        toast({
          title: "Tidak Ada Gambar Baru untuk Pertanyaan Ini",
          description: "Harap tangkap frame jika Anda ingin bertanya tentang konten visual tertentu yang baru.",
          variant: "info"
        });
        setIsLoading(false);
        return;
    }


    // If we have imageContextForQuestion, proceed with contextual chat
    try {
      const response = await contextualChatWithVision({ photoDataUri: imageContextForQuestion, question: userQuestion });
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
  }, [addMessage, speakText, stopSpeaking, toast, isCameraActive, messages]);

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
            null 
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
