import { useEffect, useRef, useCallback } from 'react';
import { socketService } from '../services/socket';
import { useRoomStore } from '../store/roomStore';
import { useMediaStore } from '../store/mediaStore';
import { useAuthStore } from '../store/authStore';
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
  const { user } = useAuthStore();
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
      if (existingPc && existingPc.connectionState !== 'closed' && existingPc.connectionState !== 'failed') {
        console.log('[useWebRTC] ✅ Peer connection already exists and active for:', userId, 'state:', existingPc.connectionState);
        return existingPc; // ✅ ВОЗВРАЩАЕМ существующее соединение
      }

      // Если старое соединение закрыто или failed, удаляем его
      if (existingPc) {
        console.log('[useWebRTC] ⚠️ Removing old peer connection for:', userId, 'state:', existingPc.connectionState);
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
          // Не показываем toast при каждом подключении - слишком много шума
        }

        if (pc.connectionState === 'failed') {
          console.error(`[useWebRTC] Connection failed for ${userId}`);
          toast.error('Ошибка соединения с участником');
          
          // Пытаемся переподключиться через 2 секунды
          console.log(`[useWebRTC] Scheduling reconnection attempt for ${userId}`);
          setTimeout(() => {
            if (peerConnectionsRef.current.has(userId)) {
              console.log(`[useWebRTC] Removing failed connection for ${userId}`);
              peerConnectionsRef.current.delete(userId);
              // useEffect с participants автоматически создаст новое соединение
            }
          }, 2000);
        }

        if (pc.connectionState === 'disconnected') {
          console.log(`[useWebRTC] Disconnected from ${userId}, waiting for reconnection...`);
          // Не удаляем сразу - ICE может восстановить соединение
          // Даем 10 секунд на восстановление
          setTimeout(() => {
            if (pc.connectionState === 'disconnected') {
              console.warn(`[useWebRTC] Still disconnected after 10s for ${userId}, marking as failed`);
              peerConnectionsRef.current.delete(userId);
            }
          }, 10000);
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
          toast.error('Проблема с подключением. Попытка переподключения...');
          
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
        
        // Отслеживаем disconnected (но не паникуем - может восстановиться)
        if (pc.iceConnectionState === 'disconnected') {
          console.warn(`[useWebRTC] ICE disconnected for ${userId}, waiting for reconnection...`);
          
          // ✅ Даем 3 секунды на восстановление (по требованию)
          setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected') {
              console.log(`[useWebRTC] ICE still disconnected after 3s, trying ICE restart for ${userId}`);
              
              if (pc.signalingState === 'stable') {
                // Используем restartIce + новый offer
                if (pc.restartIce) {
                  pc.restartIce();
                }
                
                // Создаем новый offer с iceRestart флагом
                const createRestartOffer = async () => {
                  try {
                    if (room && localStream) {
                      console.log('[useWebRTC] Creating ICE restart offer for:', userId);
                      const offer = await pc.createOffer({ iceRestart: true });
                      await pc.setLocalDescription(offer);
                      socketService.sendOffer(room.slug, userId, offer);
                    }
                  } catch (error) {
                    console.error('[useWebRTC] Error during ICE restart offer:', error);
                  }
                };
                createRestartOffer();
              }
            }
          }, 3000); // ✅ ИЗМЕНЕНО на 3000
        }
      };

      // Обработка ICE gathering state
      pc.onicegatheringstatechange = () => {
        console.log(`[useWebRTC] ICE gathering state for ${userId}:`, pc.iceGatheringState);
      };

      // Обработка ошибок ICE - фильтруем нормальные таймауты
      pc.onicecandidateerror = (event: any) => {
        // STUN timeout это нормально - браузер пробует несколько серверов
        if (event.errorCode === 701) {
          // Логируем только в debug режиме
          // console.log(`[useWebRTC] STUN timeout for ${userId} (normal):`, event.url);
          return;
        }
        
        // Показываем только критичные ошибки
        console.warn(`[useWebRTC] ICE candidate error for ${userId}:`, {
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
        // ✅ Защита от дублей: не создаём offer если соединение уже активно
        const existingPc = peerConnectionsRef.current.get(userId);
        if (existingPc && (existingPc.connectionState === 'connecting' || existingPc.connectionState === 'connected')) {
          console.log('[useWebRTC] ⏭️ Skipping createOffer - connection already active for:', userId, existingPc.connectionState);
          return;
        }

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
        
        // Polite peer pattern: определяем кто polite по userId
        const isPolite = user && user.id < data.from;
        
        // Проверяем signaling state
        const offerCollision = pc.signalingState !== 'stable';
        
        if (offerCollision) {
          console.log('[useWebRTC] Offer collision detected:', {
            from: data.from,
            isPolite,
            signalingState: pc.signalingState,
          });
          
          // Если мы impolite и есть collision - игнорируем
          if (!isPolite) {
            console.log('[useWebRTC] Impolite peer ignoring offer collision');
            return;
          }
          
          // Если мы polite - откатываем свой offer
          console.log('[useWebRTC] Polite peer rolling back local offer');
          await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
        }
        
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
        // Не показываем toast - может быть normal collision
      }
    },
    [createPeerConnection, localStream, room, user]
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
        
        // Проверяем signaling state перед setRemoteDescription
        if (pc.signalingState !== 'have-local-offer') {
          console.warn('[useWebRTC] Invalid signaling state for answer:', {
            from: data.from,
            signalingState: pc.signalingState,
            expectedState: 'have-local-offer',
          });
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        console.log('[useWebRTC] Answer processed successfully from:', data.from);
      } catch (error) {
        console.error('[useWebRTC] Error handling answer:', error);
        // Не показываем toast - может быть normal collision
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

    console.log('[useWebRTC] ===== Participants/Stream changed, checking connections =====');
    console.log('[useWebRTC] Current state:', {
      roomSlug: room.slug,
      localStreamId: localStream.id,
      participantsCount: participants.size,
      existingConnectionsCount: peerConnectionsRef.current.size,
    });

    // Очищаем соединения для участников которых нет в списке (они вышли или это reconnect)
    peerConnectionsRef.current.forEach((pc, userId) => {
      if (!participants.has(userId)) {
        console.log('[useWebRTC] Closing peer connection for removed participant:', userId);
        pc.close();
        peerConnectionsRef.current.delete(userId);
      }
    });

    // Создаем или пересоздаем соединения
    participants.forEach((participant) => {
      const existingPc = peerConnectionsRef.current.get(participant.userId);
      
      if (!existingPc) {
        console.log('[useWebRTC] Creating offer for new participant:', participant.userId);
        createOffer(participant.userId);
      } else if (existingPc.connectionState === 'closed' || existingPc.connectionState === 'failed') {
        // Если соединение закрыто или failed, пересоздаем его
        console.log('[useWebRTC] Recreating offer for participant with bad connection:', {
          userId: participant.userId,
          state: existingPc.connectionState,
        });
        existingPc.close();
        peerConnectionsRef.current.delete(participant.userId);
        createOffer(participant.userId);
      } else if (existingPc.iceConnectionState === 'disconnected' || existingPc.iceConnectionState === 'failed') {
        // ICE в плохом состоянии - пересоздаем
        console.log('[useWebRTC] Recreating offer for participant with bad ICE state:', {
          userId: participant.userId,
          iceConnectionState: existingPc.iceConnectionState,
        });
        existingPc.close();
        peerConnectionsRef.current.delete(participant.userId);
        createOffer(participant.userId);
      } else {
        console.log('[useWebRTC] Peer connection OK for:', participant.userId, {
          connectionState: existingPc.connectionState,
          iceConnectionState: existingPc.iceConnectionState,
        });
      }
    });
    
    console.log('[useWebRTC] ===== Connections check complete =====');
  }, [participants, room, localStream, createOffer]);

  // Отслеживаем screen share senders чтобы корректно удалять их при остановке
  const screenSendersRef = useRef<Map<string, RTCRtpSender[]>>(new Map());

  // Обновление screen share треков во всех соединениях (ТОЛЬКО screen share!)
  useEffect(() => {
    if (!room || peerConnectionsRef.current.size === 0) return;

    const updateScreenShare = async () => {
      console.log('[useWebRTC] Updating screen share in all peer connections, screenSharing:', !!screenStream);

      for (const [userId, pc] of peerConnectionsRef.current.entries()) {
        try {
          // Проверяем состояние соединения
          if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
            console.log('[useWebRTC] Skipping screen share update for closed/failed connection:', userId);
            continue;
          }

          // Удаляем ранее добавленные screen share senders (используем ref вместо label-based фильтрации)
          const prevScreenSenders = screenSendersRef.current.get(userId) || [];
          for (const sender of prevScreenSenders) {
            try {
              pc.removeTrack(sender);
              console.log('[useWebRTC] Removed old screen share sender for:', userId);
            } catch (e) {
              console.warn('[useWebRTC] Failed to remove screen sender for:', userId, e);
            }
          }
          screenSendersRef.current.delete(userId);

          // Добавляем новые screen share треки
          if (screenStream) {
            console.log('[useWebRTC] Adding screen share tracks for user:', userId);
            const newSenders: RTCRtpSender[] = [];
            for (const track of screenStream.getTracks()) {
              const sender = pc.addTrack(track, screenStream);
              newSenders.push(sender);
            }
            screenSendersRef.current.set(userId, newSenders);
          }

          // Renegotiation — нужна и при добавлении и при удалении screen share треков
          if (pc.signalingState === 'stable') {
            console.log('[useWebRTC] Renegotiating after screen share change for:', userId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketService.sendOffer(room.slug, userId, offer);
          }
        } catch (error) {
          console.error('[useWebRTC] Error updating screen share for user:', userId, error);
        }
      }
    };

    updateScreenShare();
  }, [screenStream, room]);

  // Очистка соединений при размонтировании
  useEffect(() => {
    return () => {
      peerConnectionsRef.current.forEach((pc) => {
        pc.close();
      });
      peerConnectionsRef.current.clear();
    };
  }, []);

  // Обработка socket reconnect
  useEffect(() => {
    const handleSocketReconnect = () => {
      console.log('[useWebRTC] Socket reconnected, recreating WebRTC connections');
      
      // Закрываем все старые соединения
      peerConnectionsRef.current.forEach((pc, userId) => {
        console.log('[useWebRTC] Closing old connection for:', userId);
        pc.close();
      });
      peerConnectionsRef.current.clear();
      
      // Новые соединения создадутся автоматически через useEffect с participants
      toast('Переподключение к участникам...', { icon: '🔄' });
    };
    
    socketService.onConnect(handleSocketReconnect);
    
    return () => {
      socketService.offConnect(handleSocketReconnect);
    };
  }, []);

  // Примечание: renegotiation при toggleAudio/toggleVideo НЕ нужна.
  // track.enabled автоматически отражается на remote стороне через WebRTC.

  return {
    peerConnections: peerConnectionsRef.current,
    createOffer,
  };
};
