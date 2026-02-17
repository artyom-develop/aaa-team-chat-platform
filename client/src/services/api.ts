import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../constants';
import type {
  AuthResponse,
  RegisterDto,
  LoginDto,
  GuestLoginDto,
  User,
  Room,
  RoomWithHost,
  CreateRoomDto,
  ChatMessage,
  IceServer,
} from '../types';

class ApiService {
  private axiosInstance: AxiosInstance;
  private refreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];
  private accessToken: string | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_URL,
      withCredentials: true, // для httpOnly cookies с refresh token
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Инициализируем токен из localStorage при создании
    this.accessToken = localStorage.getItem('accessToken');

    this.setupInterceptors();
  }

  // Метод для установки токена
  setToken(token: string | null) {
    console.log('[apiService] setToken called with:', token);
    this.accessToken = token;
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  // Метод для получения текущего токена
  getToken(): string | null {
    return this.accessToken;
  }

  private setupInterceptors() {
    // Request interceptor - добавляем access token
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.accessToken || localStorage.getItem('accessToken');
        console.log('[apiService] Request interceptor - token:', token ? 'present' : 'missing');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - обрабатываем 401 и рефрешим токен
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.refreshing) {
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.axiosInstance(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.refreshing = true;

          try {
            const { data } = await this.axiosInstance.post<{ success: boolean; data: AuthResponse }>('/auth/refresh');
            const { accessToken } = data.data;

            this.setToken(accessToken);

            this.refreshSubscribers.forEach((callback) => callback(accessToken));
            this.refreshSubscribers = [];

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }

            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            console.log('[apiService] Refresh token failed, clearing auth');
            this.setToken(null);
            // НЕ делаем window.location.href - это вызывает перезагрузку страницы!
            // Пользователь останется на текущей странице, но без авторизации
            return Promise.reject(refreshError);
          } finally {
            this.refreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await this.axiosInstance.post<{ success: boolean; data: AuthResponse }>('/auth/register', data);
    console.log('[apiService] register response:', response.data);
    return response.data.data;
  }

  async login(credentials: LoginDto): Promise<AuthResponse> {
    const response = await this.axiosInstance.post<{ success: boolean; data: AuthResponse }>('/auth/login', credentials);
    console.log('[apiService] login response:', response.data);
    return response.data.data;
  }

  async loginGuest(data: GuestLoginDto): Promise<AuthResponse> {
    const response = await this.axiosInstance.post<{ success: boolean; data: AuthResponse }>('/auth/guest', data);
    console.log('[apiService] loginGuest response:', response.data);
    return response.data.data;
  }

  async logout(): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/logout');
    } catch (error) {
      console.warn('[apiService] Logout request failed, clearing local token anyway');
    }
    // Всегда очищаем локальный токен и refresh cookie
    this.setToken(null);
    // Удаляем refresh token cookie клиентской стороной
    document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';
  }

  async getMe(): Promise<User> {
    const response = await this.axiosInstance.get<{ success: boolean; data: User }>('/users/me');
    return response.data.data;
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await this.axiosInstance.post<{ success: boolean; data: AuthResponse }>('/auth/refresh');
    return response.data.data;
  }

  // Rooms endpoints
  async createRoom(data: CreateRoomDto): Promise<Room> {
    const response = await this.axiosInstance.post<{ success: boolean; data: Room }>('/rooms', data);
    console.log('[apiService] createRoom response:', response.data);
    return response.data.data;
  }

  async getRoom(slug: string): Promise<RoomWithHost> {
    const response = await this.axiosInstance.get<{ success: boolean; data: RoomWithHost }>(`/rooms/${slug}`);
    return response.data.data;
  }

  async joinRoom(slug: string, password?: string): Promise<{ success: boolean }> {
    const response = await this.axiosInstance.post<{ success: boolean; data: { success: boolean } }>(`/rooms/${slug}/join`, {
      password,
    });
    return response.data.data;
  }

  async getMyRooms(): Promise<Room[]> {
    const response = await this.axiosInstance.get<{ success: boolean; data: Room[] }>('/rooms/my');
    return response.data.data;
  }

  async deleteRoom(id: string): Promise<void> {
    await this.axiosInstance.delete(`/rooms/${id}`);
  }

  async getIceServers(): Promise<IceServer[]> {
    const response = await this.axiosInstance.get<{ success: boolean; data: IceServer[] }>('/rooms/ice-servers');
    return response.data.data;
  }

  // Users endpoints
  async updateProfile(data: Partial<Pick<User, 'displayName' | 'avatarUrl'>>): Promise<User> {
    const response = await this.axiosInstance.patch<{ success: boolean; data: User }>('/users/me', data);
    return response.data.data;
  }

  async deleteAccount(): Promise<void> {
    await this.axiosInstance.delete('/users/me');
  }

  // Chat endpoints
  async getChatHistory(
    roomSlug: string,
    page = 1,
    limit = 50
  ): Promise<{ messages: ChatMessage[]; total: number }> {
    const response = await this.axiosInstance.get<{ success: boolean; data: { messages: ChatMessage[]; total: number } }>(
      `/chat/${roomSlug}/messages`,
      {
        params: { page, limit },
      }
    );
    return response.data.data;
  }
}

export const apiService = new ApiService();
