// User types
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  isGuest: boolean;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Room types
export interface Room {
  id: string;
  slug: string;
  name: string;
  hostId: string;
  hasPassword: boolean;
  hasLobby: boolean;
  maxParticipants: number;
  scheduledAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomWithHost extends Room {
  host: User;
}

// Participant types
export interface Participant {
  userId: string;
  socketId: string;
  displayName: string;
  avatarUrl: string | null;
  isHost: boolean;
  isGuest: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  joinedAt: number;
  stream?: MediaStream;
}

// Chat types
export interface ChatMessage {
  id: string;
  text: string;
  createdAt: string;
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

// WebRTC types
export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface SignalingData {
  from: string;
  to: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

// Auth DTOs
export interface RegisterDto {
  displayName: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface GuestLoginDto {
  displayName: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

// Room DTOs
export interface CreateRoomDto {
  name: string;
  password?: string;
  hasLobby?: boolean;
  maxParticipants?: number;
  scheduledAt?: string;
}

export interface JoinRoomDto {
  slug: string;
  password?: string;
}

// Socket.io events
export interface ServerToClientEvents {
  'room:joined': (data: { roomSlug: string; participants: any[] }) => void;
  'room:user-joined': (participant: any) => void;
  'room:user-left': (data: { userId: string }) => void;
  'room:error': (data: { message: string }) => void;
  
  'webrtc:offer': (data: { from: string; sdp: RTCSessionDescriptionInit }) => void;
  'webrtc:answer': (data: { from: string; sdp: RTCSessionDescriptionInit }) => void;
  'webrtc:ice-candidate': (data: { from: string; candidate: RTCIceCandidateInit }) => void;
  
  'media:control': (data: { userId: string; audioEnabled?: boolean; videoEnabled?: boolean; screenSharing?: boolean }) => void;
  'media:hand-raised': (data: { userId: string; displayName: string; raised: boolean }) => void;
  
  'chat:message': (message: ChatMessage) => void;
  
  'user:kicked': () => void;
  'room:request-offers': (data: { participants: any[] }) => void;
}

export interface ClientToServerEvents {
  'room:join': (data: { roomSlug: string; password?: string; isMuted?: boolean; isCameraOff?: boolean }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'room:leave': (data: { roomSlug: string }) => void;
  
  'webrtc:offer': (data: { roomSlug: string; targetUserId: string; offer: RTCSessionDescriptionInit }) => void;
  'webrtc:answer': (data: { roomSlug: string; targetUserId: string; answer: RTCSessionDescriptionInit }) => void;
  'webrtc:ice-candidate': (data: { roomSlug: string; targetUserId: string; candidate: RTCIceCandidateInit }) => void;
  
  'media:toggle-mute': (data: { roomSlug: string; isMuted: boolean }) => void;
  'media:toggle-camera': (data: { roomSlug: string; isCameraOff: boolean }) => void;
  'media:toggle-screen': (data: { roomSlug: string; isScreenSharing: boolean }) => void;
  'media:raise-hand': (data: { raised: boolean }) => void;
  
  'chat:send': (data: { roomSlug: string; text: string; replyToId?: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  
  'host:kick-user': (data: { targetUserId: string; roomSlug: string }) => void;
}

// Media device types
export interface MediaDevices {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}

export interface SelectedDevices {
  audioInput: string | null;
  videoInput: string | null;
  audioOutput: string | null;
}
