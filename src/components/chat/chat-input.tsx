
'use client';

import { useState, type FC, type FormEvent, useEffect, useRef }
from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Video, VideoOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean; // For AI message loading
  isCameraActive: boolean;
  isCameraProcessing: boolean;
  onToggleCamera: () => void;
  isTtsEnabled: boolean;
  onToggleTts: () => void;
  stopSpeaking: () => void;
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
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const speechRecognitionRef = useRef<any>(null); // SpeechRecognition instance
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const recognitionInstance = new SpeechRecognitionAPI();
        recognitionInstance.continuous = false; // Process single utterances
        recognitionInstance.interimResults = true; // Show interim results
        recognitionInstance.lang = 'id-ID'; // Set language to Indonesian for better recognition

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
            // Auto-send the message
            onSendMessage(finalTranscript.trim());
            setInputValue(''); // Clear the input field

            // Ensure recognition stops and onend is triggered
            // This might be redundant if continuous is false, but ensures clean stop
            if (speechRecognitionRef.current && isRecording) { // isRecording check is a safeguard
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
          setIsRecording(false); // Ensure recording state is reset on error
        };

        recognitionInstance.onend = () => {
          setIsRecording(false);
        };
        speechRecognitionRef.current = recognitionInstance;
      } else {
        // Toast shown once if API not supported, not on every render.
        // This could be moved to a top-level component or context if needed globally.
      }
    }

    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.abort(); // Abort any ongoing recognition
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, onSendMessage]); // Added onSendMessage to deps as it's used in onresult

  const handleMicClick = () => {
    stopSpeaking(); // Stop any ongoing TTS
    if (!speechRecognitionRef.current) {
      toast({ title: "Input Suara Tidak Didukung", description: "Browser Anda tidak mendukung pengenalan ucapan.", variant: "destructive" });
      return;
    }

    if (isRecording) {
      speechRecognitionRef.current.stop(); // This will trigger onend, which sets isRecording to false
      // setIsRecording(false); // Let onend handle this for consistency
    } else {
      try {
        setInputValue(''); // Clear input before starting new recording
        speechRecognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        toast({ title: "Kesalahan Suara", description: "Tidak dapat memulai input suara.", variant: "destructive" });
        setIsRecording(false); // Reset if start fails
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    stopSpeaking(); // Stop any ongoing TTS

    if (isRecording && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop(); // Stop recording if user manually submits
      // setIsRecording(false); // Let onend handle this
    }
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };
  
  const commonDisabled = isLoading || isCameraProcessing;

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
        disabled={commonDisabled}
        aria-label={isRecording ? "Hentikan perekaman" : "Mulai perekaman"}
      >
        {isRecording ? <MicOff className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5" />}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="rounded-full border-white/30 bg-white/20 hover:bg-white/30 text-white"
        onClick={onToggleCamera}
        disabled={commonDisabled || isRecording} // Disable camera toggle while recording
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
          if (isTtsEnabled) stopSpeaking(); // If turning off, stop current speech
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
        disabled={commonDisabled || !inputValue.trim()} // Disable send if input is empty OR commonDisabled
        aria-label="Kirim pesan"
      >
        {isLoading && !isCameraProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
      </Button>
    </form>
  );
};

export default ChatInput;

