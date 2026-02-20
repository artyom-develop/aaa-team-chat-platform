/// <reference types="../vite-env.d.ts" />

// Hardcoded URLs для продакшена (обход проблемы с Vercel Secrets)
export const API_URL = 'https://aaa-team-chat-platform.onrender.com/api';
export const SOCKET_URL = 'https://aaa-team-chat-platform.onrender.com';

// Для локальной разработки раскомментируйте:
// export const API_URL = 'http://localhost:3000/api';
// export const SOCKET_URL = 'http://localhost:3000';

export const MAX_PARTICIPANTS_GRID = 6;
export const MAX_MESSAGE_LENGTH = 1000;
export const CHAT_MESSAGES_PER_PAGE = 50;

export const PEER_CONNECTION_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

export const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30 },
    facingMode: 'user',
  },
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  LOBBY: '/lobby/:slug',
  ROOM: '/room/:slug',
} as const;
