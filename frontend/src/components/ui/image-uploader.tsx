// components/image-uploader.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api-client';
import { Input } from '@/components/ui/input';

// STEP 1: Add the 'alt' prop to the interface.
// It's best to make it optional with `?`.
interface ImageUploaderProps {
  value?: string;
  onUploadSuccess: (url: string) => void;
  alt?: string; // 👈 ADD THIS LINE
}

// STEP 2: Destructure 'alt' from the props.
export function ImageUploader({ onUploadSuccess, value, alt }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/media/upload', formData);
      onUploadSuccess(response.data.final_url);
      toast({ title: 'Success', description: 'Image uploaded successfully.' });
    } catch (error) {
      console.error("Upload failed. Error details:", error);
      toast({ title: 'Error', description: 'Failed to upload image.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative flex h-48 w-full items-center justify-center rounded-lg liquid-glass-interactive">
        {value ? (
          // STEP 3: Use the 'alt' prop here with a fallback.
          <Image
            src={value}
            // 👇 CHANGE THIS LINE
            alt={alt || 'Image preview'}
            fill
            className="object-cover rounded-lg"
          />
        ) : (
          <div className="text-center text-muted-foreground">
            <UploadCloud className="mx-auto h-12 w-12" />
            <p>Click or drag file to upload</p>
          </div>
        )}
        <Input
          type="file"
          accept="image/*"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => handleFileUpload(e.target.files?.[0] || null)}
          disabled={isUploading}
        />
      </div>
      {isUploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
    </div>
  );
}