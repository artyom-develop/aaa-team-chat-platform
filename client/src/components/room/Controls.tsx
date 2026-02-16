import { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorX,
  MessageSquare,
  Users,
  Settings,
  PhoneOff,
} from 'lucide-react';
import { useMedia } from '../../hooks/useMedia';
import { useSocket } from '../../hooks/useSocket';
import { useNavigate } from 'react-router-dom';
import { DeviceSettings } from './DeviceSettings';

interface ControlsProps {
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
}

export const Controls = ({
  onToggleChat,
  onToggleParticipants,
  isChatOpen,
  isParticipantsOpen,
}: ControlsProps) => {
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const {
    audioEnabled,
    videoEnabled,
    screenSharing,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useMedia();

  const { leaveRoom, toggleMute, toggleCamera, toggleScreenShare } = useSocket();

  const handleToggleAudio = () => {
    const newAudioEnabled = !audioEnabled;
    console.log('[Controls] Toggling audio:', { oldValue: audioEnabled, newValue: newAudioEnabled });
    toggleAudio();
    if (toggleMute) {
      toggleMute(newAudioEnabled);
    }
  };

  const handleToggleVideo = () => {
    const newVideoEnabled = !videoEnabled;
    console.log('[Controls] Toggling video:', { oldValue: videoEnabled, newValue: newVideoEnabled });
    toggleVideo();
    if (toggleCamera) {
      toggleCamera(newVideoEnabled);
    }
  };

  const handleToggleScreen = async () => {
    if (screenSharing) {
      console.log('[Controls] Stopping screen share');
      stopScreenShare();
      if (toggleScreenShare) {
        toggleScreenShare(false);
      }
    } else {
      console.log('[Controls] Starting screen share - доступно для всех участников');
      try {
        const stream = await startScreenShare();
        console.log('[Controls] Screen share stream obtained:', !!stream);
        if (stream && toggleScreenShare) {
          console.log('[Controls] Notifying server about screen share');
          toggleScreenShare(true);
        } else if (!stream) {
          console.log('[Controls] Screen share cancelled or failed');
        }
      } catch (error) {
        console.error('[Controls] Error sharing screen:', error);
        // Ошибка уже обработана в startScreenShare
      }
    }
  };

  const handleLeave = () => {
    leaveRoom();
    navigate('/');
  };

  return (
    <>
      <div className="bg-gray-900 border-t border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Левая группа - основные контролы */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAudio}
              className={`p-3 rounded-lg transition-colors ${
                audioEnabled
                  ? 'bg-gray-800 hover:bg-gray-700 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
              title={audioEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
            >
              {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            <button
              onClick={handleToggleVideo}
              className={`p-3 rounded-lg transition-colors ${
                videoEnabled
                  ? 'bg-gray-800 hover:bg-gray-700 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
              title={videoEnabled ? 'Выключить камеру' : 'Включить камеру'}
            >
              {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <button
              onClick={handleToggleScreen}
              className={`p-3 rounded-lg transition-colors ${
                screenSharing
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
              title={screenSharing ? 'Остановить демонстрацию' : 'Поделиться экраном'}
            >
              {screenSharing ? <MonitorX className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
            </button>
          </div>

          {/* Центральная группа - дополнительные функции */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleChat}
              className={`p-3 rounded-lg transition-colors ${
                isChatOpen
                  ? 'bg-purple-500 hover:bg-purple-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
              title="Чат"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            <button
              onClick={onToggleParticipants}
              className={`p-3 rounded-lg transition-colors ${
                isParticipantsOpen
                  ? 'bg-purple-500 hover:bg-purple-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
              title="Участники"
            >
              <Users className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
              title="Настройки"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Правая группа - выход */}
          <div>
            <button
              onClick={handleLeave}
              className="px-6 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center gap-2"
              title="Покинуть комнату"
            >
              <PhoneOff className="w-5 h-5" />
              Выйти
            </button>
          </div>
        </div>
      </div>

      {/* Модальное окно настроек */}
      {isSettingsOpen && <DeviceSettings onClose={() => setIsSettingsOpen(false)} />}
    </>
  );
};
