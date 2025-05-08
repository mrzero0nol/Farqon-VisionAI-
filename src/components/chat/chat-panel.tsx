
'use client';

import { useState, useRef, useEffect, type FC, useCallback } from 'react';
import ChatMessage from './chat-message';
import ChatInput from './chat-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessageData, CameraFeedRefType } from '@/types';
import { contextualChatWithVision, analyzeCameraFeed } from '@/ai/flows';
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

  const handleAnalyzeScene = useCallback(async (imageDataUri: string) => {
    setIsAiAnalyzing(true);
    stopSpeaking();
    setCurrentContextImageUri(imageDataUri); // Set the context image for subsequent questions

    try {
      console.log("ChatPanel: Sending frame for AI analysis.");
      const response = await analyzeCameraFeed({ photoDataUri: imageDataUri });
      addMessage({ 
        id: Date.now().toString() + '-manual-analysis', 
        role: 'assistant', 
        content: response.summary, 
        image: imageDataUri // Display the newly analyzed image with the analysis
      });
      if (response.summary) speakText(response.summary);
    } catch (error) {
      console.error("Error analyzing camera feed:", error);
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
      addMessage({ id: Date.now().toString() + '-manual-err', role: 'assistant', content: `Maaf, terjadi kesalahan saat menganalisis pemandangan: ${errorMessage.substring(0,100)}...`, isError: true });
      speakText(`Analisis pemandangan gagal.`);
      toast({
        title: "Kesalahan Analisis",
        description: `Gagal menganalisis pemandangan. ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsAiAnalyzing(false);
    }
  }, [addMessage, speakText, stopSpeaking, setIsAiAnalyzing, toast, setCurrentContextImageUri]);

  const triggerManualSceneAnalysis = useCallback(async () => {
    if (isAiAnalyzing) {
      toast({ title: "Analisis Sedang Berjalan", description: "Harap tunggu analisis saat ini selesai.", variant: "default" });
      return;
    }
    if (!isCameraActive || !cameraFeedRef.current) {
      toast({ title: "Kamera Tidak Aktif", description: "Aktifkan kamera terlebih dahulu untuk menganalisis pemandangan.", variant: "destructive" });
      return;
    }

    console.log("ChatPanel: Attempting to capture frame manually.");
    const imageDataUri = cameraFeedRef.current.captureCurrentFrame();

    if (imageDataUri) {
      console.log("ChatPanel: Manual frame captured successfully.");
      await handleAnalyzeScene(imageDataUri); // Pass the new frame to handleAnalyzeScene
    } else {
      console.warn("ChatPanel: Failed to capture frame manually.");
      toast({ title: "Gagal Menangkap Gambar", description: "Tidak dapat menangkap gambar dari kamera. Pastikan kamera berfungsi.", variant: "destructive" });
    }
  }, [isAiAnalyzing, isCameraActive, cameraFeedRef, handleAnalyzeScene, toast]);
  

  const handleSendMessage = useCallback(async (userQuestion: string) => {
    stopSpeaking();
    
    const userMessageId = Date.now().toString();
    // Add user message. It will show currentContextImageUri if available.
    addMessage({ id: userMessageId, role: 'user', content: userQuestion, image: currentContextImageUri });
    setIsAiAnalyzing(true); 
  
    if (!currentContextImageUri) { // Check if there's a context image from manual analysis
      const aiErrorMsg = "Saat ini tidak ada gambar untuk dijadikan konteks pertanyaan Anda. Silakan analisis pemandangan terlebih dahulu menggunakan tombol 'Analisis Pemandangan' (ikon mata).";
      addMessage({ id: Date.now().toString() + '-ai-no-ctx', role: 'assistant', content: aiErrorMsg, isError: true });
      speakText(aiErrorMsg);
      toast({
        title: "Tidak Ada Konteks Visual",
        description: aiErrorMsg,
        variant: "destructive"
      });
      setIsAiAnalyzing(false);
      return;
    }
    
    try {
      console.log("ChatPanel: Sending user question with current context image to AI.");
      // Use currentContextImageUri for the AI call
      const response = await contextualChatWithVision({ photoDataUri: currentContextImageUri, question: userQuestion });
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
      setIsAiAnalyzing(false);
    }
  
  }, [addMessage, speakText, stopSpeaking, toast, setIsAiAnalyzing, currentContextImageUri]);

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
        onAnalyzeScene={triggerManualSceneAnalysis} 
      />
    </div>
  );
};

export default ChatPanel;

