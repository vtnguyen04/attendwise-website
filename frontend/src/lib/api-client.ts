
import axios from 'axios';
import Cookies from 'js-cookie';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const createApiClient = (withAuth: boolean = false) => {
  const client = axios.create({
    baseURL: API_BASE_URL,
  });

  if (withAuth) {
    client.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const token = Cookies.get('accessToken') || localStorage.getItem('accessToken');
          if (token) {
                    console.log("[apiClient] Attaching token to Authorization header:", token);
                    config.headers.Authorization = `Bearer ${token}`;
                  } else {
                    console.log("[apiClient] No token found, sending request without Authorization header.");
                  }        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          clearAuthToken();
          if (typeof window !== 'undefined') {
            // If we are on the login page, don't redirect. Instead, resolve the promise
            // with a specific error payload so the form can handle it without crashing.
            if (window.location.pathname === '/login') {
              return Promise.resolve({ data: { error: 'Invalid credentials' } });
            }
            // For any other page, redirect to login.
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  return client;
};

export const setAuthToken = (newToken: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', newToken);
    Cookies.set('accessToken', newToken, { expires: 7, path: '/', sameSite: 'None', secure: true });
  }
};

export const clearAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    Cookies.remove('accessToken', { path: '/' });
  }
};

// Client for authenticated requests
const apiClient = createApiClient(true);

// Client for public requests (no auth interceptor)
export const publicApiClient = createApiClient(false);

export default apiClient;
