'use client';

import type { FC } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, AlertTriangleIcon } from 'lucide-react';
import type { ChatMessageData } from '@/types';

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
        {/* 
          Optionally, display counted object information here if needed in the future:
          {message.countedObjects && message.countedObjects.length > 0 && (
            <div className="mt-2 text-xs opacity-80">
              <p>Objek Terhitung:</p>
              <ul>
                {message.countedObjects.map(obj => (
                  <li key={obj.name}>{obj.name}: {obj.count}</li>
                ))}
              </ul>
            </div>
          )}
        */}
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
