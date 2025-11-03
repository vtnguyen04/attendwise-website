
// lib/services/media.service.ts
'use client';

import apiClient from '@/lib/api-client';

interface UploadResponse {
  message: string;
  final_url: string;
  upload_url: string;
}

/**
 * [CLIENT] Uploads a file to the server.
 * @param file The file to upload.
 * @returns The URL of the uploaded file.
 */
export const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<UploadResponse>('/media/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.final_url;
};
