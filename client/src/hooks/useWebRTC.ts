import { useEffect, useRef, useCallback } from 'react';
import { socketService } from '../services/socket';
import { useRoomStore } from '../store/roomStore';
import { useMediaStore } from '../store/mediaStore';
import { useAuthStore } from '../store/authStore';
import { PEER_CONNECTION_CONFIG } from '../constants';
import { IceServer } from '../types';
import toast from 'react-hot-toast';

/**
 * Хук для управления WebRTC соединениями.
 *
 * Ключевые принципы:
 * 1. toggle audio/video — ТОЛЬКО track.enabled, БЕЗ renegotiation
 * 2. screen share — replaceTrack на video sender, БЕЗ renegotiation
 * 3. peer connection создаётся ОДИН раз и переиспользуется
 * 4. Все callback-и используют refs чтобы избежать лишних пересозданий
 */
export const useWebRTC = (iceServers?: IceServer[]) => {
  const { room, participants, updateParticipant } = useRoomStore();
  const { user } = useAuthStore();

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Храним localStream и screenStream в ref-ах чтобы callback-и
  // всегда видели актуальные значения без пересоздания
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const roomRef = useRef(room);

  // Синхронизируем ref-ы с Zustand state
  const localStream = useMediaStore((s) => s.localStream);
  const screenStream = useMediaStore((s) => s.screenStream);
  localStreamRef.current = localStream;
  screenStreamRef.current = screenStream;
  roomRef.current = room;

  // Конфигурация ICE серверов — стабильная ссылка
  const rtcConfigRef = useRef<RTCConfiguration>(
    iceServers
      ? {
          iceServers,
          iceCandidatePoolSize: PEER_CONNECTION_CONFIG.iceCandidatePoolSize,
        }
      : PEER_CONNECTION_CONFIG
  );

  // ─────────────────────────────────────────────────────────
  // Создание peer connection — стабильный callback (без зависимостей от stream)
  // ─────────────────────────────────────────────────────────
  const createPeerConnection = useCallback(
    (userId: string): RTCPeerConnection => {
      const existingPc = peerConnectionsRef.current.get(userId);
      if (
        existingPc &&
        existingPc.connectionState !== 'closed' &&
        existingPc.connectionState !== 'failed'
      ) {
        return existingPc;
      }

      if (existingPc) {
        existingPc.close();
        peerConnectionsRef.current.delete(userId);
      }

      const stream = localStreamRef.current;
      console.log('[useWebRTC] Creating peer connection for:', userId, {
        hasStream: !!stream,
      });

      const pc = new RTCPeerConnection(rtcConfigRef.current);

      // Добавляем локальные треки
      if (stream) {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      }

      // ICE candidates
      pc.onicecandidate = (event) => {
        const r = roomRef.current;
        if (event.candidate && r) {
          socketService.sendIceCandidate(r.slug, userId, event.candidate);
        }
      };

      // Входящие треки
      pc.ontrack = (event) => {
        console.log('[useWebRTC] ontrack:', userId, event.track.kind);
        const [remoteStream] = event.streams;
        if (remoteStream) {
          updateParticipant(userId, { stream: remoteStream });
        }
      };

      // Connection state
      pc.onconnectionstatechange = () => {
        console.log(`[useWebRTC] Connection state ${userId}:`, pc.connectionState);
        if (pc.connectionState === 'failed') {
          setTimeout(() => {
            peerConnectionsRef.current.delete(userId);
          }, 2000);
        }
        if (pc.connectionState === 'closed') {
          peerConnectionsRef.current.delete(userId);
        }
      };

      // ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log(`[useWebRTC] ICE state ${userId}:`, pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          if (pc.restartIce) pc.restartIce();
          setTimeout(async () => {
            try {
              const r = roomRef.current;
              if (r && pc.signalingState === 'stable') {
                const offer = await pc.createOffer({ iceRestart: true });
                await pc.setLocalDescription(offer);
                socketService.sendOffer(r.slug, userId, offer);
              }
            } catch (e) {
              console.error('[useWebRTC] ICE restart error:', e);
            }
          }, 1000);
        }
      };

      // Подавляем шум от обычных STUN timeout
      pc.onicecandidateerror = (event: any) => {
        if (event.errorCode !== 701) {
          console.warn(`[useWebRTC] ICE error ${userId}:`, event.errorText);
        }
      };

      peerConnectionsRef.current.set(userId, pc);
      return pc;
    },
    [updateParticipant] // стабильные зависимости — НЕ зависит от localStream!
  );

  // ─────────────────────────────────────────────────────────
  // Создание и отправка offer
  // ─────────────────────────────────────────────────────────
  const createOffer = useCallback(
    async (userId: string) => {
      try {
        const existingPc = peerConnectionsRef.current.get(userId);
        if (
          existingPc &&
          (existingPc.connectionState === 'connecting' ||
            existingPc.connectionState === 'connected')
        ) {
          return;
        }

        const stream = localStreamRef.current;
        if (!stream) {
          console.warn('[useWebRTC] No localStream for offer');
          return;
        }

        const pc = createPeerConnection(userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const r = roomRef.current;
        if (r) {
          socketService.sendOffer(r.slug, userId, offer);
        }
      } catch (error) {
        console.error('[useWebRTC] Error creating offer:', error);
      }
    },
    [createPeerConnection] // стабильная зависимость
  );

  // ─────────────────────────────────────────────────────────
  // Обработка входящего offer
  // ─────────────────────────────────────────────────────────
  const handleOffer = useCallback(
    async (data: { from: string; sdp: RTCSessionDescriptionInit }) => {
      try {
        const pc = createPeerConnection(data.from);
        const isPolite = user && user.id < data.from;
        const collision = pc.signalingState !== 'stable';

        if (collision) {
          if (!isPolite) return;
          await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const r = roomRef.current;
        if (r) {
          socketService.sendAnswer(r.slug, data.from, answer);
        }
      } catch (error) {
        console.error('[useWebRTC] Error handling offer:', error);
      }
    },
    [createPeerConnection, user]
  );

  // ─────────────────────────────────────────────────────────
  // Обработка входящего answer
  // ─────────────────────────────────────────────────────────
  const handleAnswer = useCallback(
    async (data: { from: string; sdp: RTCSessionDescriptionInit }) => {
      try {
        const pc = peerConnectionsRef.current.get(data.from);
        if (!pc || pc.connectionState === 'closed') return;
        if (pc.signalingState !== 'have-local-offer') return;
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } catch (error) {
        console.error('[useWebRTC] Error handling answer:', error);
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────
  // Обработка ICE candidate
  // ─────────────────────────────────────────────────────────
  const handleIceCandidate = useCallback(
    async (data: { from: string; candidate: RTCIceCandidateInit }) => {
      try {
        const pc = peerConnectionsRef.current.get(data.from);
        if (!pc || pc.connectionState === 'closed') return;
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (error) {
        console.error('[useWebRTC] Error handling ICE candidate:', error);
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────
  // Подписка на WebRTC socket события
  // ─────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────
  // Создание offers для участников — ОДИН раз при появлении participant + stream.
  // НЕ зависит от createOffer/localStream напрямую — использует refs.
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!room || !localStream) return;

    // Очищаем соединения для ушедших участников
    peerConnectionsRef.current.forEach((pc, userId) => {
      if (!participants.has(userId)) {
        pc.close();
        peerConnectionsRef.current.delete(userId);
      }
    });

    // Создаём offers для новых участников
    participants.forEach((participant) => {
      const existingPc = peerConnectionsRef.current.get(participant.userId);
      if (!existingPc) {
        createOffer(participant.userId);
      } else if (
        existingPc.connectionState === 'closed' ||
        existingPc.connectionState === 'failed'
      ) {
        existingPc.close();
        peerConnectionsRef.current.delete(participant.userId);
        createOffer(participant.userId);
      }
    });
  }, [participants, room, localStream, createOffer]);

  // ─────────────────────────────────────────────────────────
  // replaceTrack при смене устройства или screen share.
  // Заменяем audio и video треки в sender-ах БЕЗ renegotiation.
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!room || peerConnectionsRef.current.size === 0) return;

    const doReplace = async () => {
      const screenTrack = screenStream?.getVideoTracks()[0] || null;
      const cameraTrack = localStream?.getVideoTracks()[0] || null;
      const audioTrack = localStream?.getAudioTracks()[0] || null;
      const newVideoTrack = screenTrack || cameraTrack;

      console.log('[useWebRTC] replaceTrack:', {
        hasScreen: !!screenTrack,
        hasCamera: !!cameraTrack,
        hasAudio: !!audioTrack,
      });

      for (const [userId, pc] of peerConnectionsRef.current.entries()) {
        try {
          if (pc.connectionState === 'closed' || pc.connectionState === 'failed') continue;

          const senders = pc.getSenders();

          // Replace video track
          const videoSender = senders.find((s) => s.track?.kind === 'video');
          if (videoSender && newVideoTrack) {
            await videoSender.replaceTrack(newVideoTrack);
          }

          // Replace audio track
          const audioSender = senders.find((s) => s.track?.kind === 'audio');
          if (audioSender && audioTrack) {
            await audioSender.replaceTrack(audioTrack);
          }
        } catch (error) {
          console.error('[useWebRTC] replaceTrack error for:', userId, error);
        }
      }
    };

    doReplace();
  }, [screenStream, room, localStream]);

  // ─────────────────────────────────────────────────────────
  // Очистка при размонтировании
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  // Socket reconnect
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleSocketReconnect = () => {
      console.log('[useWebRTC] Socket reconnected, recreating connections');
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      toast('Переподключение к участникам...', { icon: '🔄' });
    };

    socketService.onConnect(handleSocketReconnect);
    return () => {
      socketService.offConnect(handleSocketReconnect);
    };
  }, []);

  return {
    peerConnections: peerConnectionsRef.current,
    createOffer,
  };
};
