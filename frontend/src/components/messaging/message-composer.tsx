// ./src/components/messaging/message-composer.tsx

'use client';

import Image from 'next/image'; // Đã import
import { useState, useRef, useEffect, useCallback } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import { useChatWebSocket } from "@/hooks/use-chat-websocket";
import { useUser } from "@/context/user-provider";
import { requestUploadURL } from "@/lib/services/upload.service";

interface MessageComposerProps {
  onSendMessage: (content: string, messageType?: "text" | "image" | "file") => void;
  isLoading: boolean;
  conversationId: string;
}

export function MessageComposer({ onSendMessage, isLoading, conversationId }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const theme = useTheme();
  const { sendJsonMessage } = useChatWebSocket();
  const { user } = useUser();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const sendTypingEvent = useCallback((typing: boolean) => {
    if (!user || !conversationId) return;
    sendJsonMessage({
      type: "typing_event",
      conversation_id: conversationId,
      user_id: user.id,
      is_typing: typing,
    });
    setIsTyping(typing);
  }, [user, conversationId, sendJsonMessage]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    if (!isTyping) {
      sendTypingEvent(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingEvent(false);
    }, 3000); // 3 seconds debounce
  };

  const handleSend = () => {
    const trimmedContent = content.trim();
    if (trimmedContent && !isLoading && !isUploading) {
      console.log("MessageComposer: Sending text message with content:", trimmedContent);
      onSendMessage(trimmedContent);
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      if (isTyping) {
        sendTypingEvent(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendAttachment = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    try {
      const { upload_url, object_name } = await requestUploadURL(selectedFile.name, selectedFile.type);
      await fetch(upload_url, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type,
        },
      });

      const messageType = selectedFile.type.startsWith('image/') ? "image" : "file";
      if (object_name) {
        console.log("MessageComposer: Sending attachment with object_name:", object_name);
        onSendMessage(object_name, messageType);
        clearFileSelection();
      } else {
        console.warn("MessageComposer: object_name is empty, not sending attachment message.");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      // TODO: Show error to user
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn(
      "flex items-end gap-3 p-4 border-t transition-colors duration-200",
      theme === 'dark'
        ? 'bg-slate-950 border-slate-800'
        : 'bg-white border-slate-200'
    )}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-10 w-10 flex-shrink-0 rounded-full transition-colors duration-150",
          theme === 'dark'
            ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        )}
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading || isUploading}
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Paperclip className="h-5 w-5" />
        )}
      </Button>

      <div className="flex-1 relative">
        {filePreview && (
          <div className="absolute -top-24 left-0 bg-background p-2 rounded-md shadow-lg flex items-center space-x-2">
            {/* Đã thay thế <img> bằng <Image> */}
            <Image
              src={filePreview}
              alt="Preview"
              width={80}  // tương đương w-20
              height={80} // tương đương h-20
              className="object-cover rounded-md"
            />
            <Button variant="ghost" size="icon" onClick={clearFileSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className={cn(
            "resize-none border-0 shadow-none rounded-3xl pr-12 w-full",
            "focus-visible:ring-1 focus-visible:ring-offset-0",
            "max-h-32 min-h-[44px] px-4 text-sm leading-relaxed",
            theme === 'dark'
              ? 'bg-slate-900 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-700'
              : 'bg-white text-slate-900 placeholder:text-slate-500 focus-visible:ring-slate-300'
          )}
          style={{ paddingTop: '11px', paddingBottom: '11px' }}
          rows={1}
          disabled={isUploading}
        />
        <Button
          onClick={selectedFile ? handleSendAttachment : handleSend}
          disabled={(!content.trim() && !selectedFile) || isLoading || isUploading}
          size="icon"
          className={cn(
            "absolute right-2 inset-y-0 my-auto h-8 w-8 rounded-full transition-all duration-150",
            theme === 'dark'
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-100'
              : 'bg-slate-900 hover:bg-slate-800 text-white',
            "disabled:opacity-50 disabled:cursor-not-allowed",
            (!content.trim() && !selectedFile) && !isLoading && "opacity-40"
          )}
        >
          {isLoading || isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}