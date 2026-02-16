/// <reference types="../vite-env.d.ts" />

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const MAX_PARTICIPANTS_GRID = 6;
export const MAX_MESSAGE_LENGTH = 1000;
export const CHAT_MESSAGES_PER_PAGE = 50;

export const PEER_CONNECTION_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
  ],
  iceCandidatePoolSize: 10,
};

export const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  LOBBY: '/lobby/:slug',
  ROOM: '/room/:slug',
} as const;
