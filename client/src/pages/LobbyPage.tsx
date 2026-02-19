import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, VideoOff, Mic, MicOff, Settings } from 'lucide-react';
import { useMedia } from '../hooks/useMedia';
import { useMediaStore } from '../store/mediaStore';
import { DeviceSettings } from '../components/room/DeviceSettings';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

export const LobbyPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [mediaStarted, setMediaStarted] = useState(false);
  const [isRequestingMedia, setIsRequestingMedia] = useState(false);

  const { localStream, audioEnabled, videoEnabled, toggleAudio, toggleVideo } = useMedia();

  // Ручной старт медиа
  const startMedia = async () => {
    setIsRequestingMedia(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: 1280, height: 720 },
      });
      
      const prefs = useMediaStore.getState().getMediaPreferences();
      
      // ✅ При первом включении устанавливаем оба устройства в true
      // При последующих включениях сохраняем предыдущие настройки
      if (!prefs.autoStart) {
        console.log('[LobbyPage] First time enabling media, setting both to true');
        useMediaStore.getState().saveMediaPreferences({ 
          audioEnabled: true, 
          videoEnabled: true, 
          autoStart: true // Помечаем что медиа было включено хотя бы раз
        });
      } else {
        console.log('[LobbyPage] Re-enabling media, keeping previous settings:', {
          audioEnabled: prefs.audioEnabled,
          videoEnabled: prefs.videoEnabled,
        });
        // При повторном включении сохраняем предыдущие настройки пользователя
        useMediaStore.getState().saveMediaPreferences({ 
          ...prefs, 
          autoStart: true 
        });
      }
      
      // setLocalStream применит текущий audioEnabled/videoEnabled из store к трекам
      useMediaStore.getState().setLocalStream(stream);
      
      setMediaStarted(true);
      console.log('[LobbyPage] Local stream initialized:', stream.id);
      toast.success('Доступ к камере и микрофону получен');
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Не удалось получить доступ к камере и микрофону');
    } finally {
      setIsRequestingMedia(false);
    }
  };

  // Проверка autoStart предпочтения при монтировании
  useEffect(() => {
    const checkAutoStart = async () => {
      const prefs = useMediaStore.getState().getMediaPreferences();
      if (prefs.autoStart) {
        await startMedia();
      }
    };
    checkAutoStart();
  }, []);

  // Отслеживаем наличие localStream
  useEffect(() => {
    if (localStream) {
      setMediaStarted(true);
    } else {
      setMediaStarted(false);
    }
  }, [localStream]);

  // Повторная попытка получить доступ к медиа
  const retryMediaAccess = async () => {
    await startMedia();
  };

  // Отображение локального видео — также при переключении videoEnabled
  // чтобы video element "проснулся" после hidden → visible
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
      videoRef.current.play().catch(() => {});
    }
  }, [localStream, videoEnabled]);

  // Загрузка информации о комнате
  useEffect(() => {
    if (!slug) return;

    const loadRoom = async () => {
      try {
        const room = await apiService.getRoom(slug);
        setRoomName(room.name);
      } catch (error) {
        console.error('Error loading room:', error);
        toast.error('Комната не найдена');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    loadRoom();
  }, [slug, navigate]);

  const handleJoin = () => {
    console.log('[LobbyPage] Joining room, current stream:', useMediaStore.getState().localStream?.id);
    if (slug) {
      navigate(`/room/${slug}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 flex items-center justify-center p-3 sm:p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-white/10">
          {/* Заголовок */}
          <div className="bg-gray-800/50 px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Готовы присоединиться?</h1>
            <p className="text-sm sm:text-base text-gray-300 mt-1">{roomName}</p>
          </div>

          {/* Контент */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Предпросмотр видео */}
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                {/* Video element всегда в DOM, скрываем через CSS чтобы не терять srcObject */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!(videoEnabled && localStream) ? 'hidden' : ''}`}
                />
                {!(videoEnabled && localStream) && (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
                    <VideoOff className="w-12 h-12 sm:w-16 sm:h-16 text-white/50" />
                  </div>
                )}

                {/* Индикатор микрофона */}
                <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
                  <div className="bg-black/50 p-1.5 sm:p-2 rounded-lg backdrop-blur-sm">
                    {audioEnabled ? (
                      <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    ) : (
                      <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Настройки */}
              <div className="flex flex-col justify-between">
                <div className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-white">Настройка устройств</h2>

                  {!mediaStarted && (
                    <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 sm:p-4 mb-4">
                      <p className="text-blue-200 text-xs sm:text-sm mb-3">
                        Для участия в видеоконференции включите камеру и микрофон
                      </p>
                      <button
                        onClick={startMedia}
                        disabled={isRequestingMedia}
                        className="w-full px-3 py-2 sm:px-4 text-sm sm:text-base bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                      >
                        {isRequestingMedia ? 'Запрашиваем доступ...' : 'Включить камеру и микрофон'}
                      </button>
                    </div>
                  )}

                  {!localStream && mediaStarted && (
                    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 sm:p-4 mb-4">
                      <p className="text-yellow-200 text-xs sm:text-sm mb-2">
                        Не удалось получить доступ к камере и микрофону
                      </p>
                      <button
                        onClick={retryMediaAccess}
                        className="w-full px-3 py-2 sm:px-4 text-sm sm:text-base bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Попробовать снова
                      </button>
                    </div>
                  )}

                  <div className="space-y-2 sm:space-y-3">
                    <button
                      onClick={toggleAudio}
                      className={`w-full flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 rounded-lg transition-colors ${
                        audioEnabled
                          ? 'bg-gray-800 hover:bg-gray-700'
                          : 'bg-red-500/20 hover:bg-red-500/30'
                      }`}
                    >
                      <span className="text-sm sm:text-base text-white font-medium">Микрофон</span>
                      {audioEnabled ? (
                        <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                      ) : (
                        <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                      )}
                    </button>

                    <button
                      onClick={toggleVideo}
                      className={`w-full flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 rounded-lg transition-colors ${
                        videoEnabled
                          ? 'bg-gray-800 hover:bg-gray-700'
                          : 'bg-red-500/20 hover:bg-red-500/30'
                      }`}
                    >
                      <span className="text-sm sm:text-base text-white font-medium">Камера</span>
                      {videoEnabled ? (
                        <Video className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                      ) : (
                        <VideoOff className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                      )}
                    </button>

                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="w-full flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      <span className="text-sm sm:text-base text-white font-medium">Дополнительные настройки</span>
                      <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleJoin}
                  className="w-full mt-4 sm:mt-6 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Присоединиться к встрече
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно настроек */}
      {isSettingsOpen && <DeviceSettings onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
};
