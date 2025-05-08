
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
        window.speechSynthesis.cancel(); // Ensure any ongoing speech is stopped on unmount
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
    // The user message "Apa yang Anda lihat..." helps contextualize the AI's analysis in the chat log.
    addMessage({ id: Date.now().toString() + 'img-prompt', role: 'user', content: 'Analisis gambar ini.', image: imageDataUri });
    try {
      const response = await analyzeCameraFeed({ photoDataUri: imageDataUri });
      addMessage({ id: Date.now().toString(), role: 'assistant', content: response.summary });
      if (response.summary) speakText(response.summary);
    } catch (error) {
      console.error("Error analyzing camera feed:", error);
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
      const aiErrorMsg = `Maaf, saya mengalami kesalahan saat menganalisis gambar: ${errorMessage}`;
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
    if (capturedFrame) { 
      handleAnalyzeFrame(capturedFrame);
      clearCapturedFrame(); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedFrame, clearCapturedFrame]); // handleAnalyzeFrame removed from deps as its deps are stable or themselves memoized. This prevents re-analysis if, e.g., isTtsEnabled changes.


  const handleSendMessage = useCallback(async (userQuestion: string) => {
    stopSpeaking();
    
    const userMessageId = Date.now().toString();
    // Find the latest image from message history to use as context
    let imageToUseForQuestion: string | undefined = messages.slice().reverse().find(msg => msg.image)?.image;
  
    // Add user message optimistically. It will be updated with an image if one is used.
    addMessage({ id: userMessageId, role: 'user', content: userQuestion });
    setIsLoading(true);
  
    if (!isCameraActive && !imageToUseForQuestion) {
      // Case 1: Camera is OFF, and NO image context from previous messages.
      const aiErrorMsg = "Kamera tidak aktif dan tidak ada gambar sebelumnya untuk konteks. Aktifkan kamera dan tangkap frame jika pertanyaan Anda terkait visual.";
      addMessage({ id: Date.now().toString() + '-ai-no-cam-no-ctx', role: 'assistant', content: aiErrorMsg, isError: true });
      speakText(aiErrorMsg);
      toast({
        title: "Tidak Ada Konteks Visual",
        description: "Aktifkan kamera dan tangkap frame untuk pertanyaan visual.",
        variant: "destructive"
      });
      setIsLoading(false);
      // Optionally, remove the user's unanswerable question:
      // setMessages(prev => prev.filter(m => m.id !== userMessageId)); 
      return;
    }
  
    if (isCameraActive && !imageToUseForQuestion) {
      // Case 2: Camera is ON, but NO image context from previous messages.
      // This means the user likely wants to ask about the CURRENT live feed but hasn't captured a frame yet.
      const aiGuidanceMsg = "Kamera aktif. Untuk bertanya tentang apa yang Anda lihat sekarang, silakan tekan tombol rana (ikon Aperture di bawah video) untuk menangkap gambar terlebih dahulu. Setelah itu, saya bisa menjawab pertanyaan Anda tentang gambar tersebut.";
      addMessage({ id: Date.now().toString() + '-ai-prompt-capture', role: 'assistant', content: aiGuidanceMsg, isError: false }); // Guidance, not an error
      speakText(aiGuidanceMsg);
      toast({
        title: "Perlu Menangkap Gambar",
        description: "Tekan tombol rana (Aperture) untuk menangkap pemandangan saat ini.",
        variant: "info"
      });
      setIsLoading(false);
      // The user's question remains, and AI provides guidance.
      return;
    }
    
    // Case 3: We have an image context (imageToUseForQuestion is not undefined).
    // This image could be from a previous auto-analysis or a previous question.
    // This path is taken if:
    //   a) Camera is OFF, but there's historical image context.
    //   b) Camera is ON, and there's historical image context (user is continuing conversation about an older frame).
    if (imageToUseForQuestion) {
      // Update the user's message to formally associate it with the image being used for context.
      setMessages(prevMessages => prevMessages.map(m => {
        if (m.id === userMessageId) {
          return { ...m, image: imageToUseForQuestion };
        }
        return m;
      }));
  
      try {
        const response = await contextualChatWithVision({ photoDataUri: imageToUseForQuestion, question: userQuestion });
        addMessage({ id: Date.now().toString(), role: 'assistant', content: response.answer });
        if(response.answer) speakText(response.answer);
      } catch (error) {
        console.error("Error in contextual chat:", error);
        const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
        const aiErrorMsg = `Maaf, saya mengalami kesalahan saat memproses pertanyaan Anda dengan gambar: ${errorMessage}`;
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
      // Fallback: This case should ideally not be reached if the logic above is comprehensive.
      // It implies isCameraActive is true, but imageToUseForQuestion remained undefined even after checks.
      // Or camera off, image undefined (which should have been handled by Case 1).
      const aiFallbackMsg = "Saya tidak yakin gambar mana yang harus dirujuk. Silakan coba aktifkan kamera dan tangkap frame baru jika pertanyaan Anda visual.";
      addMessage({ id: Date.now().toString() + '-ai-fallback-err', role: 'assistant', content: aiFallbackMsg, isError: true });
      speakText(aiFallbackMsg);
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


    