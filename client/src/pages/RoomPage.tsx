import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VideoGrid, Controls, Chat, Participants } from '../components/room';
import { useSocket, useSocketEvents } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { useChat } from '../hooks/useChat';
import { useRoomStore } from '../store/roomStore';
import { useMediaStore } from '../store/mediaStore';
import { useAuthStore } from '../store/authStore';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import { PEER_CONNECTION_CONFIG } from '../constants';
import toast from 'react-hot-toast';

export const RoomPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  // Регистрация socket event listeners — ОДИН РАЗ здесь
  useSocketEvents();
  const { joinRoom } = useSocket();
  const { setRoom, updateLocalParticipant, room, localParticipant } = useRoomStore();
  const { screenSharing, audioEnabled, videoEnabled, localStream } = useMediaStore();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [iceServers, setIceServers] = useState(PEER_CONNECTION_CONFIG.iceServers);

  // Подключение к чату - всегда активно пока в комнате
  const { messages, isLoading: isChatLoading, sendMessage } = useChat();
  
  console.log('[RoomPage] Chat state:', {
    messagesCount: messages.length,
    isChatOpen,
    isChatLoading,
  });

  // Загрузка ICE серверов с сервера (если есть TURN)
  useEffect(() => {
    const loadIceServers = async () => {
      try {
        const servers = await apiService.getIceServers();
        if (servers && servers.length > 0) {
          console.log('[RoomPage] Loaded ICE servers from API:', servers);
          setIceServers(servers);
        } else {
          console.log('[RoomPage] Using default ICE servers from config');
        }
      } catch (error) {
        console.log('[RoomPage] Failed to load ICE servers, using defaults:', error);
      }
    };
    
    loadIceServers();
  }, []);

  // Инициализация WebRTC с ICE серверами
  useWebRTC(iceServers);

  // Ref-ы для стабильных ссылок на функции в init useEffect
  const joinRoomRef = useRef(joinRoom);
  joinRoomRef.current = joinRoom;
  const setRoomRef = useRef(setRoom);
  setRoomRef.current = setRoom;
  const hasJoinedRef = useRef(false);

  // Присоединение к комнате — выполняется ОДИН раз при монтировании
  useEffect(() => {
    if (!slug || hasJoinedRef.current) return;
    hasJoinedRef.current = true;

    const init = async () => {
      try {
        console.log('[RoomPage] Loading room data for slug:', slug);

        // Загружаем данные о комнате
        const room = await apiService.getRoom(slug);
        console.log('[RoomPage] Room data loaded:', room);
        setRoomRef.current(room);

        // Получаем медиа если его еще нет (например при перезагрузке страницы)
        const currentStream = useMediaStore.getState().localStream;
        console.log('[RoomPage] Current media stream state:', {
          hasStream: !!currentStream,
          streamId: currentStream?.id,
          videoTracks: currentStream?.getVideoTracks().length || 0,
          audioTracks: currentStream?.getAudioTracks().length || 0,
        });

        if (!currentStream) {
          console.log('[RoomPage] No media stream found, requesting access...');
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              },
            });
            console.log('[RoomPage] Media stream obtained:', {
              streamId: stream.id,
              videoTracks: stream.getVideoTracks().length,
              audioTracks: stream.getAudioTracks().length,
              videoTrackSettings: stream.getVideoTracks()[0]?.getSettings(),
            });
            useMediaStore.getState().setLocalStream(stream);
          } catch (mediaError) {
            console.error('[RoomPage] Failed to get media:', mediaError);
            toast.error('Не удалось получить доступ к камере и микрофону. Вы можете продолжить без них.');
          }
        } else {
          console.log('[RoomPage] Using existing media stream:', currentStream.id);
        }

        console.log('[RoomPage] Joining room via socket...');

        // Проверяем наличие медиа (опционально)
        const finalStream = useMediaStore.getState().localStream;
        if (finalStream) {
          console.log('[RoomPage] LocalStream ready, joining room with media:', {
            streamId: finalStream.id,
            videoTracks: finalStream.getVideoTracks().length,
            audioTracks: finalStream.getAudioTracks().length,
          });
        } else {
          console.warn('[RoomPage] Joining room without media stream');
          toast('Вы присоединяетесь без камеры и микрофона', { icon: '⚠️' });
        }

        // Присоединяемся к комнате через Socket.io
        await joinRoomRef.current(slug);
        console.log('[RoomPage] Successfully joined room');
        toast.success('Вы присоединились к комнате');
      } catch (error: any) {
        console.error('[RoomPage] Error joining room:', error);
        toast.error(error.message || 'Не удалось присоединиться к комнате');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    init();

    // Обработка переподключения Socket.io
    const handleReconnect = () => {
      console.log('[RoomPage] Socket reconnected');
      toast('Переподключение...', { icon: '🔄', duration: 2000 });

      setTimeout(() => {
        console.log('[RoomPage] Reconnect complete');
        toast.success('Соединение восстановлено');
      }, 1000);
    };

    socketService.setReconnectCallback(handleReconnect);

    return () => {
      socketService.setReconnectCallback(null);
      hasJoinedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, navigate]);

  // Инициализация локального участника - теперь происходит в useSocket handleRoomJoined
  // Этот useEffect только для обновления существующего localParticipant
  useEffect(() => {
    if (!localParticipant) {
      console.log('[RoomPage] Waiting for room:joined event to create localParticipant');
      return;
    }

    // Проверяем что нужно обновить
    const needsUpdate = 
      (localStream && localParticipant.stream?.id !== localStream.id) ||
      localParticipant.audioEnabled !== audioEnabled ||
      localParticipant.videoEnabled !== videoEnabled ||
      localParticipant.screenSharing !== screenSharing;

    if (needsUpdate) {
      console.log('[RoomPage] Updating local participant:', {
        streamChanged: localStream && localParticipant.stream?.id !== localStream.id,
        audioChanged: localParticipant.audioEnabled !== audioEnabled,
        videoChanged: localParticipant.videoEnabled !== videoEnabled,
        screenChanged: localParticipant.screenSharing !== screenSharing,
      });
      
      updateLocalParticipant({
        stream: localStream || localParticipant.stream,
        audioEnabled,
        videoEnabled,
        screenSharing,
      });
    }
  }, [localStream, audioEnabled, videoEnabled, screenSharing, localParticipant, updateLocalParticipant]);

  // Очищаем localParticipant при выходе из комнаты
  useEffect(() => {
    return () => {
      console.log('[RoomPage] Cleaning up - clearing room state and stopping media streams');
      const { clearRoom } = useRoomStore.getState();
      const { stopAllStreams } = useMediaStore.getState();
      
      // Останавливаем все медиа потоки (камера, микрофон, скриншеринг)
      stopAllStreams();
      
      // Очищаем состояние комнаты
      clearRoom();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Подключение к комнате...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Основной контент */}
      <div className="flex-1 flex overflow-hidden">
        {/* Видео сетка */}
        <div className="flex-1 overflow-hidden">
          <VideoGrid />
        </div>

        {/* Чат - только визуальное открытие/закрытие */}
        {isChatOpen && (
          <Chat
            messages={messages}
            isLoading={isChatLoading}
            sendMessage={sendMessage}
            onClose={() => setIsChatOpen(false)}
          />
        )}

        {/* Участники */}
        {isParticipantsOpen && <Participants onClose={() => setIsParticipantsOpen(false)} />}
      </div>

      {/* Панель управления */}
      <Controls
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onToggleParticipants={() => setIsParticipantsOpen(!isParticipantsOpen)}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
      />
    </div>
  );
};
