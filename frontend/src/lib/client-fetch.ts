import apiClient from './api-client';
import { AxiosRequestConfig } from 'axios';

export const clientFetch = async <T>(
  endpoint: string,
  options: AxiosRequestConfig = {}
): Promise<T | null> => {
  try {
    const response = await apiClient.get(endpoint, options);
    return response.data as T;
  } catch (error) {
    console.error(`[clientFetch] Error for ${endpoint}:`, error);
    return null;
  }
};
