import { useEffect, useRef, useCallback } from 'react';
import { socketService } from '../services/socket';
import { useRoomStore } from '../store/roomStore';
import { useMediaStore } from '../store/mediaStore';
import { PEER_CONNECTION_CONFIG } from '../constants';
import { IceServer } from '../types';
import toast from 'react-hot-toast';

interface PeerConnection {
  pc: RTCPeerConnection;
  userId: string;
}

/**
 * Хук для управления WebRTC соединениями
 */
export const useWebRTC = (iceServers?: IceServer[]) => {
  const { room, participants, updateParticipant } = useRoomStore();
  const { localStream, screenStream } = useMediaStore();
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Конфигурация ICE серверов
  const rtcConfig: RTCConfiguration = iceServers
    ? { iceServers }
    : PEER_CONNECTION_CONFIG;

  // Создание peer connection для участника
  const createPeerConnection = useCallback(
    (userId: string): RTCPeerConnection => {
      // Проверяем, нет ли уже соединения с этим пользователем
      const existingPc = peerConnectionsRef.current.get(userId);
      if (existingPc && existingPc.connectionState !== 'closed') {
        console.log('[useWebRTC] Peer connection already exists for:', userId, 'state:', existingPc.connectionState);
        return existingPc;
      }

      // Если старое соединение закрыто, удаляем его
      if (existingPc) {
        console.log('[useWebRTC] Removing closed peer connection for:', userId);
        existingPc.close();
        peerConnectionsRef.current.delete(userId);
      }

      console.log('[useWebRTC] Creating new peer connection for:', userId);
      const pc = new RTCPeerConnection(rtcConfig);

      // Добавляем локальные треки
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
        console.log('[useWebRTC] Added local tracks to peer connection for:', userId);
      }

      // Обработка ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && room) {
          socketService.sendIceCandidate(room.slug, userId, event.candidate);
        }
      };

      // Обработка входящих треков
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          console.log('[useWebRTC] Received remote stream from:', userId, 'streamId:', remoteStream.id);
          updateParticipant(userId, { stream: remoteStream });
        }
      };

      // Обработка изменения состояния соединения
      pc.onconnectionstatechange = () => {
        console.log(`[useWebRTC] PeerConnection state for ${userId}:`, pc.connectionState);

        if (pc.connectionState === 'connected') {
          console.log(`[useWebRTC] Successfully connected to ${userId}`);
        }

        if (pc.connectionState === 'failed') {
          console.error(`[useWebRTC] Connection failed for ${userId}`);
          toast.error('Ошибка соединения с участником');
          
          // Пытаемся переподключиться
          console.log(`[useWebRTC] Attempting to reconnect to ${userId}`);
          peerConnectionsRef.current.delete(userId);
          // Соединение будет пересоздано в useEffect для новых участников
        }

        if (pc.connectionState === 'disconnected') {
          console.log(`[useWebRTC] Disconnected from ${userId}, waiting for reconnection...`);
          // Не удаляем сразу - ICE может восстановить соединение
        }

        if (pc.connectionState === 'closed') {
          console.log(`[useWebRTC] Connection closed for ${userId}`);
          peerConnectionsRef.current.delete(userId);
        }
      };

      // Обработка ошибок ICE
      pc.onicecandidateerror = (event: any) => {
        console.error(`[useWebRTC] ICE candidate error for ${userId}:`, {
          errorCode: event.errorCode,
          errorText: event.errorText,
          url: event.url,
        });
      };

      peerConnectionsRef.current.set(userId, pc);
      return pc;
    },
    [rtcConfig, localStream, room, updateParticipant]
  );

  // Создание и отправка offer
  const createOffer = useCallback(
    async (userId: string) => {
      try {
        console.log('[useWebRTC] Creating offer for user:', userId, 'localStream:', !!localStream);
        const pc = createPeerConnection(userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (!room) {
          console.error('[useWebRTC] Cannot send offer - no room');
          return;
        }

        console.log('[useWebRTC] Sending offer to:', userId);
        socketService.sendOffer(room.slug, userId, offer);
      } catch (error) {
        console.error('[useWebRTC] Error creating offer:', error);
        toast.error('Ошибка создания offer');
      }
    },
    [createPeerConnection, localStream]
  );

  // Обработка входящего offer
  const handleOffer = useCallback(
    async (data: { from: string; sdp: RTCSessionDescriptionInit }) => {
      try {
        console.log('[useWebRTC] Received offer from:', data.from, 'localStream:', !!localStream);
        const pc = createPeerConnection(data.from);
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (!room) {
          console.error('[useWebRTC] Cannot send answer - no room');
          return;
        }

        console.log('[useWebRTC] Sending answer to:', data.from);
        socketService.sendAnswer(room.slug, data.from, answer);
      } catch (error) {
        console.error('[useWebRTC] Error handling offer:', error);
        toast.error('Ошибка обработки offer');
      }
    },
    [createPeerConnection, localStream]
  );

  // Обработка входящего answer
  const handleAnswer = useCallback(
    async (data: { from: string; sdp: RTCSessionDescriptionInit }) => {
      try {
        const pc = peerConnectionsRef.current.get(data.from);
        if (!pc) {
          console.warn('[useWebRTC] No peer connection found for answer from:', data.from);
          return;
        }

        // Проверяем что соединение не закрыто
        if (pc.connectionState === 'closed') {
          console.warn('[useWebRTC] Peer connection closed, ignoring answer from:', data.from);
          peerConnectionsRef.current.delete(data.from);
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        console.log('[useWebRTC] Answer processed successfully from:', data.from);
      } catch (error) {
        console.error('[useWebRTC] Error handling answer:', error);
        toast.error('Ошибка обработки answer');
      }
    },
    []
  );

  // Обработка ICE candidate
  const handleIceCandidate = useCallback(
    async (data: { from: string; candidate: RTCIceCandidateInit }) => {
      try {
        const pc = peerConnectionsRef.current.get(data.from);
        if (!pc) {
          console.warn('[useWebRTC] No peer connection found for ICE candidate from:', data.from);
          return;
        }

        // Проверяем что соединение не закрыто
        if (pc.connectionState === 'closed') {
          console.warn('[useWebRTC] Peer connection closed, ignoring ICE candidate from:', data.from);
          peerConnectionsRef.current.delete(data.from);
          return;
        }

        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log('[useWebRTC] ICE candidate added from:', data.from);
      } catch (error) {
        console.error('[useWebRTC] Error handling ICE candidate:', error);
        // Не показываем toast для ICE ошибок - они могут быть частыми и не критичными
      }
    },
    []
  );

  // Подписка на WebRTC события
  useEffect(() => {
    if (!room) return;

    socketService.on('webrtc:offer', handleOffer);
    socketService.on('webrtc:answer', handleAnswer);
    socketService.on('webrtc:ice-candidate', handleIceCandidate);

    return () => {
      socketService.off('webrtc:offer', handleOffer);
      socketService.off('webrtc:answer', handleAnswer);
      socketService.off('webrtc:ice-candidate', handleIceCandidate);
    };
  }, [room, handleOffer, handleAnswer, handleIceCandidate]);

  // Создание offers для новых участников
  useEffect(() => {
    if (!room || !localStream) {
      console.log('[useWebRTC] Not creating offers - room:', !!room, 'localStream:', !!localStream);
      return;
    }

    console.log('[useWebRTC] Checking for new participants. Total:', participants.size);

    participants.forEach((participant) => {
      if (!peerConnectionsRef.current.has(participant.userId)) {
        console.log('[useWebRTC] Creating offer for new participant:', participant.userId);
        createOffer(participant.userId);
      } else {
        console.log('[useWebRTC] Peer connection already exists for:', participant.userId);
      }
    });

    // Очистка peer connections для участников которые вышли из комнаты
    peerConnectionsRef.current.forEach((pc, userId) => {
      if (!participants.has(userId)) {
        console.log('[useWebRTC] Closing peer connection for removed participant:', userId);
        pc.close();
        peerConnectionsRef.current.delete(userId);
      }
    });
  }, [participants, room, localStream, createOffer]);

  // Обновление локальных треков во всех соединениях
  useEffect(() => {
    if (!localStream) return;

    const updateTracks = async () => {
      console.log('[useWebRTC] Updating tracks in all peer connections');
      
      for (const [userId, pc] of peerConnectionsRef.current.entries()) {
        try {
          // Проверяем состояние соединения перед renegotiation
          if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
            console.log('[useWebRTC] Skipping renegotiation for closed/failed connection:', {
              userId,
              connectionState: pc.connectionState,
            });
            peerConnectionsRef.current.delete(userId);
            continue;
          }

          // Удаляем старые треки
          const senders = pc.getSenders();
          for (const sender of senders) {
            pc.removeTrack(sender);
          }

          // Добавляем треки из localStream
          for (const track of localStream.getTracks()) {
            pc.addTrack(track, localStream);
          }

          // Добавляем треки из screenStream, если есть
          if (screenStream) {
            console.log('[useWebRTC] Adding screen share tracks for user:', userId);
            for (const track of screenStream.getTracks()) {
              pc.addTrack(track, screenStream);
            }
          }

          // Создаем новый offer для renegotiation ТОЛЬКО если соединение активно
          if (pc.connectionState === 'connected' || pc.connectionState === 'connecting') {
            console.log('[useWebRTC] Creating new offer for renegotiation:', userId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            if (room) {
              socketService.sendOffer(room.slug, userId, offer);
            }
          } else {
            console.log('[useWebRTC] Skipping offer creation - connection not ready:', {
              userId,
              connectionState: pc.connectionState,
            });
          }
        } catch (error) {
          console.error('[useWebRTC] Error updating tracks for user:', userId, error);
          // Не удаляем соединение - возможно это временная ошибка
        }
      }
    };

    updateTracks();
  }, [localStream, screenStream]);

  // Очистка соединений при размонтировании
  useEffect(() => {
    return () => {
      peerConnectionsRef.current.forEach((pc) => {
        pc.close();
      });
      peerConnectionsRef.current.clear();
    };
  }, []);

  return {
    peerConnections: peerConnectionsRef.current,
    createOffer,
  };
};
