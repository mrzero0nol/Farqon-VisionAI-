'use client';

import type { FC } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, AlertTriangleIcon } from 'lucide-react';
import type { ChatMessageData } from '@/types';
import { Card, CardContent } from '@/components/ui/card';

interface ChatMessageProps {
  message: ChatMessageData;
}

const ChatMessage: FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.isError;

  return (
    <div className={cn('flex items-start space-x-3 py-3', isUser ? 'justify-end' : '')}>
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className={cn(
            "bg-primary text-primary-foreground",
            isError && "bg-destructive text-destructive-foreground"
          )}>
            {isError ? <AlertTriangleIcon size={20} /> : <Bot size={20} />}
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn(
          'max-w-[70%] rounded-lg px-4 py-2 shadow-md backdrop-filter backdrop-blur-sm',
          isUser 
            ? 'bg-primary/70 text-primary-foreground' 
            : (isError 
                ? 'bg-destructive/80 text-destructive-foreground' 
                : 'bg-card/60 text-card-foreground border border-white/20'),
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.image && (
          <Card className="mt-2 overflow-hidden bg-white/10 border-none backdrop-filter backdrop-blur-sm">
            <CardContent className="p-1">
             <Image 
                src={message.image} 
                alt="Gambar kiriman" 
                width={200} 
                height={150} 
                className="rounded-md object-cover"
                data-ai-hint="captured image"
              />
            </CardContent>
          </Card>
        )}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-accent/80 text-accent-foreground">
            <User size={20} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default ChatMessage;

