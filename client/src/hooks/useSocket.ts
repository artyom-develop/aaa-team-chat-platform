import { useEffect, useCallback, useRef } from 'react';
import { socketService } from '../services/socket';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '../store/authStore';
import { useMediaStore } from '../store/mediaStore';
import { Participant } from '../types';
import toast from 'react-hot-toast';

// Глобальный флаг: event listeners зарегистрированы только один раз
let socketEventsRegistered = false;

/**
 * Хук для регистрации событий Socket.io — вызывать ТОЛЬКО ОДИН РАЗ (в RoomPage).
 * Регистрирует обработчики room:joined, room:user-joined, room:user-left и т.д.
 */
export const useSocketEvents = () => {
  const { user } = useAuthStore();
  const registeredRef = useRef(false);

  // Подключение к Socket.io
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        socketService.connect(token);
      }
    }
  }, [user]);

  // Подписка на события участников — один раз
  useEffect(() => {
    // Защита от дублирования при StrictMode и множественных маунтах
    if (registeredRef.current || socketEventsRegistered) {
      console.log('[useSocket] Event listeners already registered, skipping');
      return;
    }
    registeredRef.current = true;
    socketEventsRegistered = true;

    console.log('[useSocket] Setting up event listeners. User:', user?.id);

    const handleRoomJoined = (data: any) => {
      console.log('[useSocket] Room joined event received:', data);
      const currentUser = useAuthStore.getState().user;
      console.log('[useSocket] Current user ID:', currentUser?.id);

      const socketId = socketService.getId();

      // Проверяем, есть ли уже участники (признак reconnect)
      const currentParticipants = useRoomStore.getState().participants;
      if (currentParticipants.size > 0) {
        console.log('[useSocket] Detected reconnect - clearing old participants');
        currentParticipants.forEach((p) => {
          if (p.userId !== currentUser?.id) {
            useRoomStore.getState().removeParticipant(p.userId);
          }
        });
      }

      if (data.participants && Array.isArray(data.participants)) {
        console.log('[useSocket] Processing participants:', data.participants.length);

        data.participants.forEach((p: any) => {
          if (p.userId === currentUser?.id) {
            const { localStream, audioEnabled, videoEnabled } = useMediaStore.getState();

            const localParticipant: Participant = {
              userId: p.userId,
              socketId: socketId || '',
              displayName: p.displayName,
              avatarUrl: p.avatarUrl,
              isHost: p.isHost,
              isGuest: false,
              audioEnabled: audioEnabled,
              videoEnabled: videoEnabled,
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
            socketId: '',
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
          useRoomStore.getState().addParticipant(participant);
        });
      }
    };

    const handleUserJoined = (data: any) => {
      console.log('[useSocket] User joined:', data);
      const currentUser = useAuthStore.getState().user;
      if (data.userId === currentUser?.id) return;

      // Проверяем что участник еще не добавлен (защита от дублирования)
      const existing = useRoomStore.getState().participants.get(data.userId);
      if (existing) {
        console.log('[useSocket] Participant already exists, updating:', data.userId);
        useRoomStore.getState().updateParticipant(data.userId, {
          audioEnabled: !data.isMuted,
          videoEnabled: !data.isCameraOff,
          screenSharing: data.isScreenSharing,
        });
        return;
      }

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
      useRoomStore.getState().addParticipant(participant);
      toast.success(`${participant.displayName} присоединился к комнате`);
    };

    const handleRequestOffers = (data: { participants: any[] }) => {
      console.log('[useSocket] Request to create offers for participants:', data.participants);
    };

    const handleUserLeft = (data: { userId: string }) => {
      const participant = useRoomStore.getState().participants.get(data.userId);
      if (participant) {
        useRoomStore.getState().removeParticipant(data.userId);
        toast(`${participant.displayName} покинул комнату`);
      }
    };

    const handleMediaControl = (data: any) => {
      console.log('[useSocket] Received media:control event:', data);

      // Пропускаем события о себе — локальный state уже обновлён напрямую
      const currentUser = useAuthStore.getState().user;
      if (data.userId === currentUser?.id) return;

      const updates: Partial<Participant> = {};

      if (data.isMuted !== undefined) updates.audioEnabled = !data.isMuted;
      if (data.isCameraOff !== undefined) updates.videoEnabled = !data.isCameraOff;
      if (data.isScreenSharing !== undefined) updates.screenSharing = data.isScreenSharing;

      if (data.audioEnabled !== undefined) updates.audioEnabled = data.audioEnabled;
      if (data.videoEnabled !== undefined) updates.videoEnabled = data.videoEnabled;
      if (data.screenSharing !== undefined) updates.screenSharing = data.screenSharing;

      if (Object.keys(updates).length > 0) {
        useRoomStore.getState().updateParticipant(data.userId, updates);
      }
    };

    const handleUserKicked = () => {
      toast.error('Вы были удалены из комнаты');
      useRoomStore.getState().clearRoom();
    };

    socketService.on('room:joined', handleRoomJoined);
    socketService.on('room:user-joined', handleUserJoined);
    socketService.on('room:user-left', handleUserLeft);
    socketService.on('room:request-offers', handleRequestOffers);
    socketService.on('media:control', handleMediaControl);
    socketService.on('user:kicked', handleUserKicked);

    return () => {
      socketService.off('room:joined', handleRoomJoined);
      socketService.off('room:user-joined', handleUserJoined);
      socketService.off('room:user-left', handleUserLeft);
      socketService.off('room:request-offers', handleRequestOffers);
      socketService.off('media:control', handleMediaControl);
      socketService.off('user:kicked', handleUserKicked);
      registeredRef.current = false;
      socketEventsRegistered = false;
    };
  }, [user]);
};

/**
 * Хук для действий с Socket.io — можно вызывать в любом компоненте.
 * Возвращает методы: joinRoom, leaveRoom, toggleMute, toggleCamera и т.д.
 */
export const useSocket = () => {
  const { room } = useRoomStore();
  const { audioEnabled, videoEnabled } = useMediaStore();

  const joinRoom = useCallback(
    (slug: string, password?: string) => {
      return new Promise<void>((resolve, reject) => {
        console.log('[useSocket] joinRoom called for:', slug, {
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
      console.log('[useSocket] Leaving room and stopping media streams');
      const { stopAllStreams } = useMediaStore.getState();
      stopAllStreams();
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
      if (room) {
        socketService.kickUser(room.slug, userId);
      }
    },
    [room]
  );

  const transferHost = useCallback(
    (userId: string) => {
      if (room) {
        socketService.transferHost(room.slug, userId);
      }
    },
    [room]
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
