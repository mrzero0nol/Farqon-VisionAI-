
'use client';

import { useState, useRef, useEffect, type FC, useCallback } from 'react';
import ChatMessage from './chat-message';
import ChatInput from './chat-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessageData } from '@/types';
import { contextualChatWithVision, analyzeCameraFeed } from '@/ai/flows';
import { useToast } from '@/hooks/use-toast';
// import { MessageSquareDashed } from 'lucide-react'; // No longer used
// import { cn } from '@/lib/utils'; // No longer used

interface ChatPanelProps {
  autoCapturedFrame: string | null; 
  isCameraActive: boolean;
  clearAutoCapturedFrame: () => void;
  isCameraProcessing: boolean; // Hardware camera processing
  onToggleCamera: () => void;
  isAiAnalyzing: boolean; // AI model processing
  setIsAiAnalyzing: (isAnalyzing: boolean) => void;
}

const ChatPanel: FC<ChatPanelProps> = ({
  autoCapturedFrame,
  isCameraActive,
  clearAutoCapturedFrame,
  isCameraProcessing,
  onToggleCamera,
  isAiAnalyzing,
  setIsAiAnalyzing,
}) => {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
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


  const handleAnalyzeAutoFrame = useCallback(async (imageDataUri: string) => {
    if (isAiAnalyzing) {
      console.log("ChatPanel: Analysis already in progress. Skipping new auto-frame.");
      clearAutoCapturedFrame(); // Clear it to prevent re-processing if AI becomes free quickly
      return;
    }
    setIsAiAnalyzing(true);
    stopSpeaking();

    try {
      console.log("ChatPanel: Sending auto-frame for AI analysis.");
      const response = await analyzeCameraFeed({ photoDataUri: imageDataUri });
      // Add AI's analysis to chat, associating the image with the AI's response.
      // This makes the image available for subsequent questions.
      addMessage({ 
        id: Date.now().toString() + '-auto', 
        role: 'assistant', 
        content: response.summary, 
        image: imageDataUri // Associate image with AI's summary
      });
      if (response.summary) speakText(response.summary);
    } catch (error) {
      console.error("Error auto-analyzing camera feed:", error);
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
      // Optionally add a silent error message or log, avoid spamming toasts for auto-analysis
      addMessage({ id: Date.now().toString() + '-auto-err', role: 'assistant', content: `Maaf, terjadi kesalahan saat menganalisis secara otomatis: ${errorMessage.substring(0,100)}...`, isError: true });
      // speakText(`Analisis otomatis gagal.`); // Avoid speaking errors frequently
    } finally {
      setIsAiAnalyzing(false);
      clearAutoCapturedFrame(); // Ensure frame is cleared after attempt
    }
  }, [addMessage, speakText, stopSpeaking, setIsAiAnalyzing, isAiAnalyzing, clearAutoCapturedFrame, analyzeCameraFeed]);
  
  useEffect(() => {
    if (autoCapturedFrame && isCameraActive && !isCameraProcessing) { 
      handleAnalyzeAutoFrame(autoCapturedFrame);
      // autoCapturedFrame is cleared within handleAnalyzeAutoFrame or its finally block
    } else if (autoCapturedFrame && (!isCameraActive || isCameraProcessing)) {
        // If camera becomes inactive or is processing, clear stale frame
        clearAutoCapturedFrame();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCapturedFrame, isCameraActive, isCameraProcessing]); // handleAnalyzeAutoFrame is memoized


  const handleSendMessage = useCallback(async (userQuestion: string) => {
    stopSpeaking();
    
    const userMessageId = Date.now().toString();
    // Find the latest image from message history to use as context.
    // This image could be from a user's previous message OR from an AI's auto-analysis response.
    let imageToUseForQuestion: string | undefined = messages.slice().reverse().find(msg => msg.image)?.image;
  
    addMessage({ id: userMessageId, role: 'user', content: userQuestion, image: imageToUseForQuestion });
    setIsAiAnalyzing(true); 
  
    if (!imageToUseForQuestion) {
      const aiErrorMsg = "Saat ini tidak ada gambar untuk dijadikan konteks pertanyaan Anda. Jika kamera aktif, tunggu analisis otomatis. Jika tidak, silakan aktifkan kamera.";
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
    
    // We have an image context.
    try {
      console.log("ChatPanel: Sending user question with image context to AI.");
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
      setIsAiAnalyzing(false);
    }
  
  }, [addMessage, speakText, stopSpeaking, toast, messages, setIsAiAnalyzing, contextualChatWithVision]);

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
        isLoading={isAiAnalyzing || isCameraProcessing} // Combined loading state for input
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
