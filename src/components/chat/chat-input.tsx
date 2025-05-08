
'use client';

import { useState, type FC, type FormEvent, useEffect, useRef }
from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean; // Combined: AI analysis OR camera hardware processing
  isCameraActive: boolean;
  isCameraProcessing: boolean; // Specifically for camera hardware start/stop
  onToggleCamera: () => void;
  isTtsEnabled: boolean;
  onToggleTts: () => void;
  stopSpeaking: () => void;
  onAnalyzeScene: () => void; // New prop for triggering scene analysis
}

const ChatInput: FC<ChatInputProps> = ({
  onSendMessage,
  isLoading, 
  isCameraActive,
  isCameraProcessing, 
  onToggleCamera,
  isTtsEnabled,
  onToggleTts,
  stopSpeaking,
  onAnalyzeScene,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const speechRecognitionRef = useRef<any>(null); 
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const recognitionInstance = new SpeechRecognitionAPI();
        recognitionInstance.continuous = false; 
        recognitionInstance.interimResults = true; 
        recognitionInstance.lang = 'id-ID'; 

        recognitionInstance.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          const currentDisplayValue = finalTranscript || interimTranscript;
          setInputValue(currentDisplayValue);

          if (finalTranscript.trim()) {
            onSendMessage(finalTranscript.trim());
            setInputValue(''); 
            if (speechRecognitionRef.current && isRecording) { 
              speechRecognitionRef.current.stop();
            }
          }
        };

        recognitionInstance.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          toast({
            title: 'Kesalahan Suara',
            description: `Kesalahan pengenalan ucapan: ${event.error === 'no-speech' ? 'Tidak ada ucapan terdeteksi.' : event.error === 'not-allowed' ? 'Akses mikrofon ditolak.' : event.error}`,
            variant: 'destructive',
          });
          setIsRecording(false); 
        };

        recognitionInstance.onend = () => {
          setIsRecording(false);
        };
        speechRecognitionRef.current = recognitionInstance;
      }
    }

    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.abort(); 
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, onSendMessage]); 

  const handleMicClick = () => {
    stopSpeaking(); 
    if (!speechRecognitionRef.current) {
      toast({ title: "Input Suara Tidak Didukung", description: "Browser Anda tidak mendukung pengenalan ucapan.", variant: "destructive" });
      return;
    }

    if (isRecording) {
      speechRecognitionRef.current.stop(); 
    } else {
      try {
        setInputValue(''); 
        speechRecognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        toast({ title: "Kesalahan Suara", description: "Tidak dapat memulai input suara.", variant: "destructive" });
        setIsRecording(false); 
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    stopSpeaking(); 

    if (isRecording && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop(); 
    }
    if (inputValue.trim() && !isLoading) { 
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };
  
  const commonDisabled = isLoading; 

  return (
    <form 
      onSubmit={handleSubmit} 
      className="flex items-center space-x-2 p-4 border-t border-white/20 bg-background/70 backdrop-filter backdrop-blur-sm"
    >
      <Input
        type="text"
        placeholder={isRecording ? "Mendengarkan..." : "Tanyakan tentang apa yang dilihat kamera..."}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="flex-grow rounded-full focus-visible:ring-accent bg-white/20 placeholder-white/70 text-white border-white/30"
        disabled={commonDisabled}
        readOnly={isRecording}
        aria-label="Input pesan obrolan"
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="rounded-full border-white/30 bg-white/20 hover:bg-white/30 text-white"
        onClick={handleMicClick}
        disabled={commonDisabled || isRecording} // Also disable if recording
        aria-label={isRecording ? "Hentikan perekaman" : "Mulai perekaman"}
      >
        {isRecording ? <MicOff className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5" />}
      </Button>
       <Button
        type="button"
        size="icon"
        variant="outline"
        className="rounded-full border-white/30 bg-white/20 hover:bg-white/30 text-white"
        onClick={onAnalyzeScene}
        disabled={commonDisabled || isRecording || !isCameraActive}
        aria-label="Analisis pemandangan saat ini"
      >
        <Eye className="h-5 w-5" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="rounded-full border-white/30 bg-white/20 hover:bg-white/30 text-white"
        onClick={onToggleCamera}
        disabled={isLoading || isRecording} 
        aria-label={isCameraActive ? "Matikan kamera" : "Nyalakan kamera"}
      >
        {isCameraProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : isCameraActive ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
      </Button>
       <Button
        type="button"
        size="icon"
        variant="outline"
        className="rounded-full border-white/30 bg-white/20 hover:bg-white/30 text-white"
        onClick={() => {
          onToggleTts();
          if (isTtsEnabled) stopSpeaking(); 
        }}
        disabled={commonDisabled}
        aria-label={isTtsEnabled ? "Nonaktifkan suara AI" : "Aktifkan suara AI"}
      >
        {isTtsEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
      </Button>
      <Button
        type="submit"
        size="icon"
        className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground"
        disabled={commonDisabled || !inputValue.trim() || isRecording} 
        aria-label="Kirim pesan"
      >
        {isLoading && !isCameraProcessing && !isRecording ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
      </Button>
    </form>
  );
};

export default ChatInput;
