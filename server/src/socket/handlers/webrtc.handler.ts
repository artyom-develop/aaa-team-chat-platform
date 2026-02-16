import { Server } from 'socket.io';
import { AuthenticatedSocket, WebRTCOffer, WebRTCAnswer, WebRTCIceCandidate } from '../types.js';
import { logger } from '../../utils/logger.js';

/**
 * Обработчики WebRTC signaling
 */
export class WebRTCHandler {
  constructor(private io: Server) {}

  /**
   * Обработка WebRTC offer
   */
  async handleOffer(socket: AuthenticatedSocket, data: WebRTCOffer): Promise<void> {
    const { roomSlug, targetUserId, offer } = data;

    try {
      // Находим сокет целевого пользователя в этой комнате
      const socketsInRoom = await this.io.in(roomSlug).fetchSockets();
      const targetSocket = socketsInRoom.find(
        (s) => ((s as unknown) as AuthenticatedSocket).userId === targetUserId
      );

      if (!targetSocket) {
        logger.warn(`Target user ${targetUserId} not found in room ${roomSlug}`);
        return;
      }

      // Отправляем offer целевому пользователю
      targetSocket.emit('webrtc:offer', {
        from: socket.userId || '',
        sdp: offer,
      });

      logger.info(`WebRTC offer sent from ${socket.userId} to ${targetUserId} in room ${roomSlug}`);
    } catch (error) {
      logger.error('WebRTC offer error:', error);
    }
  }

  /**
   * Обработка WebRTC answer
   */
  async handleAnswer(socket: AuthenticatedSocket, data: WebRTCAnswer): Promise<void> {
    const { roomSlug, targetUserId, answer } = data;

    try {
      // Находим сокет целевого пользователя в этой комнате
      const socketsInRoom = await this.io.in(roomSlug).fetchSockets();
      const targetSocket = socketsInRoom.find(
        (s) => ((s as unknown) as AuthenticatedSocket).userId === targetUserId
      );

      if (!targetSocket) {
        logger.warn(`Target user ${targetUserId} not found in room ${roomSlug}`);
        return;
      }

      // Отправляем answer целевому пользователю
      targetSocket.emit('webrtc:answer', {
        from: socket.userId || '',
        sdp: answer,
      });

      logger.info(`WebRTC answer sent from ${socket.userId} to ${targetUserId} in room ${roomSlug}`);
    } catch (error) {
      logger.error('WebRTC answer error:', error);
    }
  }

  /**
   * Обработка ICE candidates
   */
  async handleIceCandidate(socket: AuthenticatedSocket, data: WebRTCIceCandidate): Promise<void> {
    const { roomSlug, targetUserId, candidate } = data;

    try {
      // Находим сокет целевого пользователя в этой комнате
      const socketsInRoom = await this.io.in(roomSlug).fetchSockets();
      const targetSocket = socketsInRoom.find(
        (s) => ((s as unknown) as AuthenticatedSocket).userId === targetUserId
      );

      if (!targetSocket) {
        logger.warn(`Target user ${targetUserId} not found in room ${roomSlug}`);
        return;
      }

      // Отправляем ICE candidate целевому пользователю
      targetSocket.emit('webrtc:ice-candidate', {
        from: socket.userId || '',
        candidate,
      });

      logger.debug(`ICE candidate sent from ${socket.userId} to ${targetUserId}`);
    } catch (error) {
      logger.error('WebRTC ICE candidate error:', error);
    }
  }
}
