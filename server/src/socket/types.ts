import { Socket } from 'socket.io';

/**
 * Типы событий для Socket.io
 */

// События комнаты
export interface RoomJoinData {
  roomSlug: string;
  password?: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
}

export interface RoomLeaveData {
  roomSlug: string;
}

// События WebRTC
export interface WebRTCOffer {
  roomSlug: string;
  targetUserId: string;
  offer: any; // WebRTC session description (browser API)
}

export interface WebRTCAnswer {
  roomSlug: string;
  targetUserId: string;
  answer: any; // WebRTC session description (browser API)
}

export interface WebRTCIceCandidate {
  roomSlug: string;
  targetUserId: string;
  candidate: any; // WebRTC ICE candidate (browser API)
}

// События чата
export interface ChatMessageData {
  roomSlug: string;
  text: string;
  replyToId?: string;
}

export interface ChatMessageResponse {
  id: string;
  text: string;
  createdAt: Date;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  replyTo?: {
    id: string;
    text: string;
    user: {
      displayName: string;
    };
  } | null;
}

// События управления комнатой
export interface MediaControlData {
  roomSlug: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isScreenSharing?: boolean;
}

export interface ParticipantData {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isHost: boolean;
}

// Расширенный Socket с пользовательскими данными
export interface AuthenticatedSocket extends Socket {
  userId?: string;
  displayName?: string;
  email?: string;
}

// События сервера -> клиента
export interface ServerToClientEvents {
  // Комната
  'room:joined': (data: { roomSlug: string; participants: ParticipantData[] }) => void;
  'room:user-joined': (data: ParticipantData) => void;
  'room:user-left': (data: { userId: string }) => void;
  'room:error': (data: { message: string }) => void;

  // WebRTC
  'webrtc:offer': (data: { from: string; sdp: any }) => void;
  'webrtc:answer': (data: { from: string; sdp: any }) => void;
  'webrtc:ice-candidate': (data: { from: string; candidate: any }) => void;

  // Чат
  'chat:message': (data: ChatMessageResponse) => void;
  'chat:error': (data: { message: string }) => void;

  // Управление
  'media:control': (data: { userId: string } & MediaControlData) => void;

  // Хост
  'user:kicked': () => void;
  'host:changed': (data: { newHostId: string; newHostName: string }) => void;
  'room:request-offers': (data: { participants: ParticipantData[] }) => void;
}

// События клиента -> сервера
export interface ClientToServerEvents {
  // Комната
  'room:join': (data: RoomJoinData, callback: (response: { success: boolean; error?: string }) => void) => void;
  'room:leave': (data: RoomLeaveData) => void;

  // WebRTC
  'webrtc:offer': (data: WebRTCOffer) => void;
  'webrtc:answer': (data: WebRTCAnswer) => void;
  'webrtc:ice-candidate': (data: WebRTCIceCandidate) => void;

  // Чат
  'chat:send': (data: ChatMessageData, callback: (response: { success: boolean; error?: string; message?: ChatMessageResponse }) => void) => void;

  // Управление
  'media:toggle-mute': (data: MediaControlData) => void;
  'media:toggle-camera': (data: MediaControlData) => void;
  'media:toggle-screen': (data: MediaControlData) => void;

  // Действия хоста
  'host:kick-user': (data: { targetUserId: string; roomSlug: string }) => void;
  'host:transfer-host': (data: { targetUserId: string; roomSlug: string }) => void;
}
