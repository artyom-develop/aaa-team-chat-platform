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
    ? { 
        iceServers,
        iceCandidatePoolSize: PEER_CONNECTION_CONFIG.iceCandidatePoolSize,
      }
    : PEER_CONNECTION_CONFIG;
  
  console.log('[useWebRTC] RTCConfiguration:', {
    iceServersCount: rtcConfig.iceServers?.length,
    iceServers: rtcConfig.iceServers,
    iceCandidatePoolSize: rtcConfig.iceCandidatePoolSize,
  });

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

      console.log('[useWebRTC] Creating new peer connection for:', userId, {
        hasLocalStream: !!localStream,
        localStreamId: localStream?.id,
        videoTracks: localStream?.getVideoTracks().length || 0,
        audioTracks: localStream?.getAudioTracks().length || 0,
      });
      const pc = new RTCPeerConnection(rtcConfig);

      // Добавляем локальные треки
      if (localStream) {
        const tracks = localStream.getTracks();
        console.log('[useWebRTC] Adding local tracks to peer connection:', {
          userId,
          tracksCount: tracks.length,
        });
        
        tracks.forEach((track) => {
          console.log('[useWebRTC] Adding track:', {
            userId,
            trackKind: track.kind,
            trackId: track.id,
            trackEnabled: track.enabled,
            trackReadyState: track.readyState,
          });
          pc.addTrack(track, localStream);
        });
        console.log('[useWebRTC] Added local tracks to peer connection for:', userId);
      } else {
        console.warn('[useWebRTC] No localStream available when creating peer connection for:', userId);
      }

      // Обработка ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && room) {
          socketService.sendIceCandidate(room.slug, userId, event.candidate);
        }
      };

      // Обработка входящих треков
      pc.ontrack = (event) => {
        console.log('[useWebRTC] ontrack event received:', {
          userId,
          trackKind: event.track.kind,
          trackId: event.track.id,
          trackEnabled: event.track.enabled,
          trackReadyState: event.track.readyState,
          streamsCount: event.streams.length,
        });
        
        const [remoteStream] = event.streams;
        if (remoteStream) {
          console.log('[useWebRTC] Received remote stream from:', userId, {
            streamId: remoteStream.id,
            videoTracks: remoteStream.getVideoTracks().length,
            audioTracks: remoteStream.getAudioTracks().length,
            videoTracksEnabled: remoteStream.getVideoTracks().map(t => t.enabled),
            audioTracksEnabled: remoteStream.getAudioTracks().map(t => t.enabled),
          });
          
          updateParticipant(userId, { stream: remoteStream });
        } else {
          console.warn('[useWebRTC] No stream in ontrack event for:', userId);
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

      // Обработка ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log(`[useWebRTC] ICE connection state for ${userId}:`, pc.iceConnectionState);
        
        if (pc.iceConnectionState === 'failed') {
          console.error(`[useWebRTC] ICE connection failed for ${userId}`);
          console.log('[useWebRTC] Attempting ICE restart...');
          
          // Пытаемся перезапустить ICE
          if (pc.restartIce) {
            pc.restartIce();
            
            // Создаем новый offer с iceRestart
            setTimeout(async () => {
              try {
                if (room && localStream && pc.signalingState === 'stable') {
                  console.log('[useWebRTC] Creating new offer with ICE restart for:', userId);
                  const offer = await pc.createOffer({ iceRestart: true });
                  await pc.setLocalDescription(offer);
                  socketService.sendOffer(room.slug, userId, offer);
                }
              } catch (error) {
                console.error('[useWebRTC] Error during ICE restart:', error);
              }
            }, 1000);
          }
        }
        
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          console.log(`[useWebRTC] ICE connection established for ${userId}`);
        }
      };

      // Обработка ICE gathering state
      pc.onicegatheringstatechange = () => {
        console.log(`[useWebRTC] ICE gathering state for ${userId}:`, pc.iceGatheringState);
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
        console.log('[useWebRTC] Creating offer for user:', userId, {
          hasLocalStream: !!localStream,
          localStreamId: localStream?.id,
          hasRoom: !!room,
        });
        
        if (!localStream) {
          console.warn('[useWebRTC] Cannot create offer - no localStream. User will receive streams but not send.');
          return;
        }
        
        const pc = createPeerConnection(userId);
        
        // Проверяем что треки добавлены
        const senders = pc.getSenders();
        console.log('[useWebRTC] Peer connection senders before offer:', {
          userId,
          sendersCount: senders.length,
          senders: senders.map(s => ({
            trackKind: s.track?.kind,
            trackId: s.track?.id,
            trackEnabled: s.track?.enabled,
          })),
        });
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        console.log('[useWebRTC] Offer created:', {
          userId,
          type: offer.type,
          hasVideo: offer.sdp?.includes('m=video'),
          hasAudio: offer.sdp?.includes('m=audio'),
          sdpLines: offer.sdp?.split('\n').length,
        });

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
    [createPeerConnection, localStream, room]
  );

  // Обработка входящего offer
  const handleOffer = useCallback(
    async (data: { from: string; sdp: RTCSessionDescriptionInit }) => {
      try {
        console.log('[useWebRTC] Received offer from:', data.from, {
          hasLocalStream: !!localStream,
          localStreamId: localStream?.id,
          offerType: data.sdp.type,
          hasVideo: data.sdp.sdp?.includes('m=video'),
          hasAudio: data.sdp.sdp?.includes('m=audio'),
        });
        
        // Создаем peer connection (даже без localStream - чтобы получать удаленные треки)
        const pc = createPeerConnection(data.from);
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        console.log('[useWebRTC] Answer created:', {
          from: data.from,
          type: answer.type,
          hasVideo: answer.sdp?.includes('m=video'),
          hasAudio: answer.sdp?.includes('m=audio'),
          senders: pc.getSenders().length,
        });

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
    [createPeerConnection, localStream, room]
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
