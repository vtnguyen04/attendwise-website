'use client';

import { useState, useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Send from 'lucide-react/icons/send';
import Paperclip from 'lucide-react/icons/paperclip';
import Loader2 from 'lucide-react/icons/loader-2';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';

interface MessageComposerProps {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
}

export function MessageComposer({ onSendMessage, isLoading }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const theme = useTheme();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleSend = () => {
    if (content.trim() && !isLoading) {
      onSendMessage(content.trim());
      setContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn(
      "flex items-end gap-2 p-3 border-t transition-colors duration-200",
      theme === 'dark' 
        ? 'bg-slate-950 border-slate-800' 
        : 'bg-white border-slate-200'
    )}>
      <Button 
        variant="ghost" 
        size="icon" 
        className={cn(
          "h-9 w-9 flex-shrink-0 transition-colors duration-150",
          theme === 'dark'
            ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
        )}
      >
        <Paperclip className="h-4 w-4" />
      </Button>

      <div className={cn(
        "flex-1 rounded-lg border transition-colors duration-200",
        theme === 'dark'
          ? 'bg-slate-900 border-slate-800'
          : 'bg-slate-50 border-slate-200'
      )}>
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className={cn(
            "resize-none border-0 bg-transparent shadow-none",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "max-h-32 px-3 py-2 text-[13px]",
            theme === 'dark'
              ? 'text-slate-100 placeholder:text-slate-600'
              : 'text-slate-900 placeholder:text-slate-500'
          )}
          rows={1}
        />
      </div>

      <Button 
        onClick={handleSend} 
        disabled={!content.trim() || isLoading} 
        size="icon" 
        className={cn(
          "h-9 w-9 flex-shrink-0 rounded-lg transition-all duration-150",
          theme === 'dark'
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-100'
            : 'bg-slate-900 hover:bg-slate-800 text-white',
          "disabled:opacity-50 disabled:cursor-not-allowed",
          !content.trim() && "opacity-40"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}