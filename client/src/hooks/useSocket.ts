import { useEffect, useCallback } from 'react';
import { socketService } from '../services/socket';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '../store/authStore';
import { useMediaStore } from '../store/mediaStore';
import { Participant } from '../types';
import toast from 'react-hot-toast';

/**
 * Хук для работы с Socket.io
 */
export const useSocket = () => {
  const { user } = useAuthStore();
  const { room, addParticipant, removeParticipant, updateParticipant, setRoom, clearRoom } = useRoomStore();
  const { audioEnabled, videoEnabled } = useMediaStore();

  // Подключение к Socket.io
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        socketService.connect(token);
      }
    }

    // НЕ отключаем socket при unmount - соединение сохраняется
    // Disconnect должен вызываться только при logout
  }, [user]);

  // Подписка на события участников
  useEffect(() => {
    console.log('[useSocket] Setting up event listeners. Room:', room?.slug, 'User:', user?.id);
    
    // Устанавливаем обработчики независимо от наличия room
    // потому что room:joined может прийти до того как room установлена в стейт

    // Обработка события room:joined с изначальным списком участников
    const handleRoomJoined = (data: any) => {
      console.log('[useSocket] Room joined event received:', data);
      console.log('[useSocket] Current user ID:', user?.id);
      
      const socketId = socketService.getId();
      console.log('[useSocket] Current socketId:', socketId);
      
      // Преобразуем данные участников из серверного формата в клиентский
      if (data.participants && Array.isArray(data.participants)) {
        console.log('[useSocket] Processing participants:', data.participants.length);
        
        data.participants.forEach((p: any) => {
          // Если это мы сами - создаем localParticipant
          if (p.userId === user?.id) {
            console.log('[useSocket] Creating localParticipant for self:', p.userId);
            
            const { localStream, audioEnabled, videoEnabled } = useMediaStore.getState();
            
            console.log('[useSocket] Media state:', {
              hasLocalStream: !!localStream,
              streamId: localStream?.id,
              audioEnabled,
              videoEnabled,
              videoTracks: localStream?.getVideoTracks().length || 0,
              audioTracks: localStream?.getAudioTracks().length || 0,
            });
            
            const localParticipant: Participant = {
              userId: p.userId,
              socketId: socketId || '',
              displayName: p.displayName,
              avatarUrl: p.avatarUrl,
              isHost: p.isHost,
              isGuest: false,
              audioEnabled: audioEnabled && !!localStream,
              videoEnabled: videoEnabled && !!localStream,
              screenSharing: false,
              handRaised: false,
              joinedAt: Date.now(),
              stream: localStream || undefined,
            };
            
            console.log('[useSocket] Setting localParticipant:', {
              userId: localParticipant.userId,
              hasStream: !!localParticipant.stream,
              audioEnabled: localParticipant.audioEnabled,
              videoEnabled: localParticipant.videoEnabled,
            });
            useRoomStore.getState().setLocalParticipant(localParticipant);
            return;
          }
          
          console.log('[useSocket] Adding participant:', p.displayName, p.userId);
          
          const participant: Participant = {
            userId: p.userId,
            socketId: '', // Будет обновлено при WebRTC соединении
            displayName: p.displayName,
            avatarUrl: p.avatarUrl,
            isHost: p.isHost,
            isGuest: false,
            audioEnabled: !p.isMuted,
            videoEnabled: !p.isCameraOff,
            screenSharing: p.isScreenSharing,
            handRaised: false,
            joinedAt: Date.now(),
          };
          addParticipant(participant);
        });
        
        console.log('[useSocket] Participants added. Total:', useRoomStore.getState().participants.size);
      } else {
        console.log('[useSocket] No participants in room:joined event');
      }
    };

    const handleUserJoined = (data: any) => {
      console.log('[useSocket] User joined:', data);
      // Пропускаем себя
      if (data.userId === user?.id) return;
      
      const participant: Participant = {
        userId: data.userId,
        socketId: '',
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        isHost: data.isHost,
        isGuest: false,
        audioEnabled: !data.isMuted,
        videoEnabled: !data.isCameraOff,
        screenSharing: data.isScreenSharing,
        handRaised: false,
        joinedAt: Date.now(),
      };
      addParticipant(participant);
      toast.success(`${participant.displayName} присоединился к комнате`);
    };

    const handleUserLeft = (data: { userId: string }) => {
      const participant = useRoomStore.getState().participants.get(data.userId);
      if (participant) {
        removeParticipant(data.userId);
        toast(`${participant.displayName} покинул комнату`);
      }
    };

    const handleMediaControl = (data: {
      userId: string;
      audioEnabled?: boolean;
      videoEnabled?: boolean;
      screenSharing?: boolean;
    }) => {
      const updates: Partial<Participant> = {};
      if (data.audioEnabled !== undefined) updates.audioEnabled = data.audioEnabled;
      if (data.videoEnabled !== undefined) updates.videoEnabled = data.videoEnabled;
      if (data.screenSharing !== undefined) updates.screenSharing = data.screenSharing;
      
      if (Object.keys(updates).length > 0) {
        updateParticipant(data.userId, updates);
      }
    };

    const handleUserKicked = () => {
      toast.error('Вы были удалены из комнаты');
      clearRoom();
    };

    const handleHostChanged = (data: { newHostId: string; newHostName: string }) => {
      if (data.newHostId === user?.id) {
        toast.success('Вы теперь хост комнаты');
      } else {
        toast(`${data.newHostName} теперь хост комнаты`);
      }
    };

    // Подписываемся на события
    socketService.on('room:joined', handleRoomJoined);
    socketService.on('room:user-joined', handleUserJoined);
    socketService.on('room:user-left', handleUserLeft);
    socketService.on('media:control', handleMediaControl);
    socketService.on('user:kicked', handleUserKicked);
    socketService.on('host:changed', handleHostChanged);

    // Отписываемся при размонтировании
    return () => {
      socketService.off('room:joined', handleRoomJoined);
      socketService.off('room:user-joined', handleUserJoined);
      socketService.off('room:user-left', handleUserLeft);
      socketService.off('media:control', handleMediaControl);
      socketService.off('user:kicked', handleUserKicked);
      socketService.off('host:changed', handleHostChanged);
    };
  }, [user, addParticipant, removeParticipant, updateParticipant, clearRoom]);

  // Методы для взаимодействия с сокетом
  const joinRoom = useCallback(
    (slug: string, password?: string) => {
      return new Promise<void>((resolve, reject) => {
        console.log('[useSocket] joinRoom called for:', slug, {
          audioEnabled,
          videoEnabled,
          isMuted: !audioEnabled,
          isCameraOff: !videoEnabled,
        });
        
        socketService.joinRoom(slug, password, !audioEnabled, !videoEnabled, (response) => {
          console.log('[useSocket] joinRoom callback response:', response);
          if (response.success) {
            resolve();
          } else {
            reject(new Error(response.error));
          }
        });
      });
    },
    [audioEnabled, videoEnabled]
  );

  const leaveRoom = useCallback(() => {
    if (room) {
      socketService.leaveRoom(room.slug);
    }
  }, [room]);

  const toggleMute = useCallback(
    (enabled: boolean) => {
      if (room) {
        socketService.toggleMute(room.slug, !enabled);
      }
    },
    [room]
  );

  const toggleCamera = useCallback(
    (enabled: boolean) => {
      if (room) {
        socketService.toggleCamera(room.slug, !enabled);
      }
    },
    [room]
  );

  const toggleScreenShare = useCallback(
    (enabled: boolean) => {
      if (room) {
        socketService.toggleScreenShare(room.slug, enabled);
      }
    },
    [room]
  );

  const kickUser = useCallback(
    (userId: string) => {
      socketService.kickUser(userId);
    },
    []
  );

  const transferHost = useCallback(
    (userId: string) => {
      socketService.transferHost(userId);
    },
    []
  );

  return {
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    kickUser,
    transferHost,
  };
};
