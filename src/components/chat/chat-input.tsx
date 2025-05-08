
'use client';

import { useState, type FC, type FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Video, VideoOff } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean; // For AI message loading
  isCameraActive: boolean;
  isCameraProcessing: boolean;
  onToggleCamera: () => void;
}

const ChatInput: FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading, 
  isCameraActive, 
  isCameraProcessing, 
  onToggleCamera 
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2 p-4 border-t bg-background">
      <Input
        type="text"
        placeholder="Ask about what the camera sees..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="flex-grow rounded-full focus-visible:ring-accent"
        disabled={isLoading || isCameraProcessing}
        aria-label="Chat message input"
      />
      <Button 
        type="button" 
        size="icon" 
        variant="outline" 
        className="rounded-full" 
        onClick={onToggleCamera} 
        disabled={isLoading || isCameraProcessing}
        aria-label={isCameraActive ? "Turn off camera" : "Turn on camera"}
      >
        {isCameraProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : isCameraActive ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
      </Button>
      <Button 
        type="submit" 
        size="icon" 
        className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground" 
        disabled={isLoading || isCameraProcessing || !inputValue.trim()} 
        aria-label="Send message"
      >
        {isLoading && !isCameraProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
      </Button>
    </form>
  );
};

export default ChatInput;
