import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../constants';
import type { ServerToClientEvents, ClientToServerEvents } from '../types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class SocketService {
  private socket: TypedSocket | null = null;

  connect(token: string): TypedSocket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    }) as TypedSocket;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): TypedSocket | null {
    return this.socket;
  }

  getId(): string | undefined {
    return this.socket?.id;
  }

  // Room events
  joinRoom(
    roomSlug: string,
    password: string | undefined,
    isMuted: boolean,
    isCameraOff: boolean,
    callback: (response: { success: boolean; error?: string }) => void
  ): void {
    this.socket?.emit('room:join', { roomSlug, password, isMuted, isCameraOff }, callback);
  }

  leaveRoom(roomSlug: string): void {
    this.socket?.emit('room:leave', { roomSlug });
  }

  // WebRTC signaling
  sendOffer(roomSlug: string, targetUserId: string, offer: RTCSessionDescriptionInit): void {
    console.log('[SocketService] Sending offer to:', targetUserId, 'in room:', roomSlug);
    this.socket?.emit('webrtc:offer', { roomSlug, targetUserId, offer });
  }

  sendAnswer(roomSlug: string, targetUserId: string, answer: RTCSessionDescriptionInit): void {
    console.log('[SocketService] Sending answer to:', targetUserId, 'in room:', roomSlug);
    this.socket?.emit('webrtc:answer', { roomSlug, targetUserId, answer });
  }

  sendIceCandidate(roomSlug: string, targetUserId: string, candidate: RTCIceCandidateInit): void {
    this.socket?.emit('webrtc:ice-candidate', { roomSlug, targetUserId, candidate });
  }

  // Media controls
  toggleMute(roomSlug: string, isMuted: boolean): void {
    this.socket?.emit('media:toggle-mute', { roomSlug, isMuted });
  }

  toggleCamera(roomSlug: string, isCameraOff: boolean): void {
    this.socket?.emit('media:toggle-camera', { roomSlug, isCameraOff });
  }

  toggleScreenShare(roomSlug: string, isScreenSharing: boolean): void {
    this.socket?.emit('media:toggle-screen', { roomSlug, isScreenSharing });
  }

  raiseHand(raised: boolean): void {
    this.socket?.emit('media:raise-hand', { raised });
  }

  // Chat
  sendMessage(
    roomSlug: string,
    text: string,
    replyToId: string | undefined,
    callback: (response: { success: boolean; error?: string }) => void
  ): void {
    console.log('[SocketService] sendMessage called:', {
      roomSlug,
      text,
      hasSocket: !!this.socket,
      socketConnected: this.socket?.connected,
      socketId: this.socket?.id,
    });
    
    if (!this.socket || !this.socket.connected) {
      console.error('[SocketService] Socket not connected!');
      callback({ success: false, error: 'Socket не подключен' });
      return;
    }
    
    this.socket.emit('chat:send', { roomSlug, text, replyToId }, callback);
  }

  // Host controls
  kickUser(roomSlug: string, targetUserId: string): void {
    console.log('[SocketService] Kicking user:', { roomSlug, targetUserId });
    this.socket?.emit('host:kick-user', { roomSlug, targetUserId });
  }

  admitUser(targetUserId: string): void {
    this.socket?.emit('host:admit-user', { targetUserId });
  }

  // Event listeners
  on<K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K]
  ): void {
    this.socket?.on(event, handler as any);
  }

  off<K extends keyof ServerToClientEvents>(
    event: K,
    handler?: ServerToClientEvents[K]
  ): void {
    this.socket?.off(event, handler as any);
  }
}

export const socketService = new SocketService();
