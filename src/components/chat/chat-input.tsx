
'use client';

import { useState, type FC, type FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const ChatInput: FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
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
        disabled={isLoading}
        aria-label="Chat message input"
      />
      <Button type="submit" size="icon" className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading || !inputValue.trim()} aria-label="Send message">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
      </Button>
    </form>
  );
};

export default ChatInput;
