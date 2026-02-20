import { create } from 'zustand';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import { useMediaStore } from './mediaStore';
import type { User, RegisterDto, LoginDto, GuestLoginDto } from '../types';
import toast from 'react-hot-toast';

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCheckingAuth: boolean;

  setUser: (user: User, token: string) => void;
  login: (credentials: LoginDto, redirectTo?: string) => Promise<string | undefined>;
  loginGuest: (data: GuestLoginDto, redirectTo?: string) => Promise<string | undefined>;
  register: (data: RegisterDto, redirectTo?: string) => Promise<string | undefined>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'), // Если токен есть, считаем авторизованным
  isLoading: false,
  isCheckingAuth: false,

  setUser: (user, token) => {
    console.log('[authStore] setUser called with token:', token);
    apiService.setToken(token);
    set({ user, accessToken: token, isAuthenticated: true });
  },

  login: async (credentials, redirectTo?: string) => {
    set({ isLoading: true });
    try {
      const response = await apiService.login(credentials);
      console.log('[authStore] login response:', response);
      get().setUser(response.user, response.accessToken);
      toast.success('Вход выполнен успешно');
      return redirectTo; // Возвращаем путь для редиректа
    } catch (error: any) {
      console.error('[authStore] Login error:', error);
      // Обрабатываем различные типы ошибок
      let message = 'Ошибка входа';
      
      if (error.response?.status === 401 || error.response?.status === 400) {
        // Неправильный email или пароль
        message = 'Неправильный email или пароль';
      } else if (error.response?.data?.message) {
        // Используем сообщение с сервера (но не технические)
        const serverMessage = error.response.data.message;
        if (serverMessage.toLowerCase().includes('refresh token')) {
          message = 'Ошибка авторизации. Попробуйте снова';
        } else {
          message = serverMessage;
        }
      } else if (error.message === 'Network Error') {
        message = 'Ошибка связи с сервером';
      }
      
      toast.error(message, { duration: 4000 });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  loginGuest: async (data, redirectTo?: string) => {
    set({ isLoading: true });
    try {
      const { user, accessToken } = await apiService.loginGuest(data);
      get().setUser(user, accessToken);
      toast.success('Вход как гость выполнен');
      return redirectTo; // Возвращаем путь для редиректа
    } catch (error: any) {
      console.error('[authStore] Guest login error:', error);
      let message = 'Ошибка гостевого входа';
      
      if (error.response?.data?.message) {
        const serverMessage = error.response.data.message;
        if (!serverMessage.toLowerCase().includes('refresh token')) {
          message = serverMessage;
        }
      } else if (error.message === 'Network Error') {
        message = 'Ошибка связи с сервером';
      }
      
      toast.error(message, { duration: 4000 });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data, redirectTo?: string) => {
    set({ isLoading: true });
    try {
      const { user, accessToken } = await apiService.register(data);
      get().setUser(user, accessToken);
      toast.success('Регистрация прошла успешно');
      return redirectTo; // Возвращаем путь для редиректа
    } catch (error: any) {
      console.error('[authStore] Registration error:', error);
      let message = 'Ошибка регистрации';
      
      if (error.response?.status === 409) {
        // Пользователь уже существует
        message = 'Пользователь с таким email уже существует';
      } else if (error.response?.data?.message) {
        const serverMessage = error.response.data.message;
        if (!serverMessage.toLowerCase().includes('refresh token')) {
          message = serverMessage;
        }
      } else if (error.message === 'Network Error') {
        message = 'Ошибка связи с сервером';
      }
      
      toast.error(message, { duration: 4000 });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await apiService.logout();
      
      // Останавливаем все медиа потоки перед выходом
      useMediaStore.getState().stopAllStreams();
      
      socketService.disconnect();
      get().clearAuth();
      toast.success('Выход выполнен');
    } catch (error: any) {
      console.error('Logout error:', error);
      // Даже если сервер вернул ошибку, очищаем локальное состояние
      
      // Останавливаем все медиа потоки
      useMediaStore.getState().stopAllStreams();
      
      socketService.disconnect();
      get().clearAuth();
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('[authStore] No token found, attempting refresh...');
      // Пытаемся обновить токен через refresh token (cookie)
      try {
        const { user, accessToken } = await apiService.refreshToken();
        get().setUser(user, accessToken);
        console.log('[authStore] Token refreshed successfully');
        return;
      } catch (refreshError) {
        console.log('[authStore] Refresh failed, user not authenticated');
        apiService.setToken(null);
        set({ isAuthenticated: false, user: null });
        return;
      }
    }

    // Убеждаемся что токен установлен в apiService
    apiService.setToken(token);

    set({ isCheckingAuth: true });
    try {
      const user = await apiService.getMe();
      set({ user, accessToken: token, isAuthenticated: true });
      console.log('[authStore] Auth check successful');
    } catch (error) {
      console.error('[authStore] Auth check failed:', error);
      // Пытаемся обновить токен
      try {
        const { user, accessToken } = await apiService.refreshToken();
        get().setUser(user, accessToken);
        console.log('[authStore] Token refreshed after failed auth check');
      } catch (refreshError) {
        console.error('[authStore] Refresh failed, clearing auth');
        get().clearAuth();
      }
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  clearAuth: () => {
    apiService.setToken(null);
    // Удаляем refresh token cookie
    document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));
