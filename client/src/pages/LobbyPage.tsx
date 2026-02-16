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

  const { localStream, audioEnabled, videoEnabled, toggleAudio, toggleVideo } = useMedia();

  // Повторная попытка получить доступ к медиа
  const retryMediaAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: 1280, height: 720 },
      });
      
      // Сохраняем поток в медиа-сторе
      useMediaStore.getState().setLocalStream(stream);
      console.log('[LobbyPage] Media access granted on retry:', stream.id);
      toast.success('Доступ к камере и микрофону получен');
    } catch (error) {
      console.error('Error accessing media devices on retry:', error);
      toast.error('Не удалось получить доступ к камере и микрофону. Проверьте настройки браузера.');
    }
  };

  // Инициализация локального медиа-потока
  useEffect(() => {
    const initMedia = async () => {
      // Проверяем, есть ли уже stream
      const existingStream = useMediaStore.getState().localStream;
      if (existingStream) {
        console.log('[LobbyPage] Using existing stream:', existingStream.id);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: 1280, height: 720 },
        });
        
        // Сохраняем поток в медиа-сторе
        useMediaStore.getState().setLocalStream(stream);
        console.log('[LobbyPage] Local stream initialized:', stream.id);
      } catch (error) {
        console.error('Error accessing media devices:', error);
        toast.error('Не удалось получить доступ к камере и микрофону. Вы можете продолжить без них.');
      }
    };

    initMedia();
  }, []);

  // Отображение локального видео
  useEffect(() => {
    if (videoRef.current && localStream) {
      console.log('[LobbyPage] Attaching stream to video element');
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-white/10">
          {/* Заголовок */}
          <div className="bg-gray-800/50 px-6 py-4 border-b border-white/10">
            <h1 className="text-2xl font-bold text-white">Готовы присоединиться?</h1>
            <p className="text-gray-300 mt-1">{roomName}</p>
          </div>

          {/* Контент */}
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Предпросмотр видео */}
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                {videoEnabled && localStream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
                    <VideoOff className="w-16 h-16 text-white/50" />
                  </div>
                )}

                {/* Индикатор микрофона */}
                <div className="absolute bottom-4 left-4">
                  <div className="bg-black/50 p-2 rounded-lg backdrop-blur-sm">
                    {audioEnabled ? (
                      <Mic className="w-5 h-5 text-white" />
                    ) : (
                      <MicOff className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Настройки */}
              <div className="flex flex-col justify-between">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-white">Настройка устройств</h2>

                  {!localStream && (
                    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-4">
                      <p className="text-yellow-200 text-sm mb-2">
                        Не удалось получить доступ к камере и микрофону
                      </p>
                      <button
                        onClick={retryMediaAccess}
                        className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Попробовать снова
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      onClick={toggleAudio}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                        audioEnabled
                          ? 'bg-gray-800 hover:bg-gray-700'
                          : 'bg-red-500/20 hover:bg-red-500/30'
                      }`}
                    >
                      <span className="text-white font-medium">Микрофон</span>
                      {audioEnabled ? (
                        <Mic className="w-5 h-5 text-green-500" />
                      ) : (
                        <MicOff className="w-5 h-5 text-red-500" />
                      )}
                    </button>

                    <button
                      onClick={toggleVideo}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                        videoEnabled
                          ? 'bg-gray-800 hover:bg-gray-700'
                          : 'bg-red-500/20 hover:bg-red-500/30'
                      }`}
                    >
                      <span className="text-white font-medium">Камера</span>
                      {videoEnabled ? (
                        <Video className="w-5 h-5 text-green-500" />
                      ) : (
                        <VideoOff className="w-5 h-5 text-red-500" />
                      )}
                    </button>

                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      <span className="text-white font-medium">Дополнительные настройки</span>
                      <Settings className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleJoin}
                  className="w-full mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
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
