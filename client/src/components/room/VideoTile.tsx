import { useEffect, useRef } from 'react';
import { Participant } from '../../types';
import { Mic, MicOff, Video, VideoOff, MonitorUp } from 'lucide-react';

interface VideoTileProps {
  participant: Participant;
  isLocal?: boolean;
  isSpotlight?: boolean;
  isThumbnail?: boolean;
}

export const VideoTile = ({ 
  participant, 
  isLocal = false,
  isSpotlight = false,
  isThumbnail = false,
}: VideoTileProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  console.log('[VideoTile] Rendering participant:', {
    userId: participant.userId,
    displayName: participant.displayName,
    hasStream: !!participant.stream,
    streamId: participant.stream?.id,
    videoEnabled: participant.videoEnabled,
    audioEnabled: participant.audioEnabled,
    isLocal,
    isSpotlight,
    isThumbnail,
  });

  useEffect(() => {
    if (!videoRef.current) {
      console.log('[VideoTile] videoRef not ready yet:', participant.userId);
      return;
    }

    if (participant.stream) {
      console.log('[VideoTile] Attaching stream to video element:', {
        userId: participant.userId,
        streamId: participant.stream.id,
        videoTracks: participant.stream.getVideoTracks().length,
        audioTracks: participant.stream.getAudioTracks().length,
      });
      
      videoRef.current.srcObject = participant.stream;
      
      // Принудительно запускаем воспроизведение
      videoRef.current.play().catch(err => {
        console.warn('[VideoTile] Failed to play video:', participant.userId, err);
      });
      
      // Проверяем состояние треков
      const videoTrack = participant.stream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('[VideoTile] Video track state:', {
          userId: participant.userId,
          trackEnabled: videoTrack.enabled,
          trackReadyState: videoTrack.readyState,
          participantVideoEnabled: participant.videoEnabled,
        });
      }

      // Проверяем аудио треки
      const audioTrack = participant.stream.getAudioTracks()[0];
      if (audioTrack) {
        console.log('[VideoTile] Audio track state:', {
          userId: participant.userId,
          trackEnabled: audioTrack.enabled,
          trackReadyState: audioTrack.readyState,
        });
      }
    } else {
      console.log('[VideoTile] No stream available:', {
        userId: participant.userId,
        hasVideoRef: !!videoRef.current,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [participant.stream, participant.userId]);

  const shouldShowVideo = participant.stream && participant.videoEnabled;
  const hasVideoTrack = (participant.stream?.getVideoTracks().length ?? 0) > 0;
  
  console.log('[VideoTile] Video visibility decision:', {
    userId: participant.userId,
    hasStream: !!participant.stream,
    videoEnabled: participant.videoEnabled,
    hasVideoTrack,
    shouldShowVideo,
    isHidden: !shouldShowVideo,
  });

  // Стили в зависимости от режима
  const containerClasses = isSpotlight 
    ? 'w-full h-full'
    : isThumbnail
    ? 'w-full h-full'
    : 'w-full h-full'; // Для grid используем aspect-ratio из родительского div

  const avatarSize = isSpotlight ? 'w-32 h-32' : isThumbnail ? 'w-16 h-16' : 'w-24 h-24';
  const avatarTextSize = isSpotlight ? 'text-6xl' : isThumbnail ? 'text-2xl' : 'text-4xl';
  const nameTextSize = isThumbnail ? 'text-xs' : 'text-sm';
  const iconSize = isThumbnail ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${containerClasses} ${isThumbnail ? 'ring-2 ring-transparent hover:ring-purple-500 transition' : ''}`}>
      {/* Видео - показываем всегда когда есть stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${!shouldShowVideo ? 'hidden' : ''}`}
      />
      
      {/* Аватар - показываем когда нет видео или оно выключено */}
      {!shouldShowVideo && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
          <div className={`${avatarSize} rounded-full bg-white/10 flex items-center justify-center`}>
            <span className={`${avatarTextSize} font-bold text-white`}>
              {participant.displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Индикаторы */}
      {!isThumbnail && (
        <div className="absolute top-2 right-2 flex gap-2">
          {participant.screenSharing && (
            <div className="bg-green-500 text-white px-2 py-1 rounded-md flex items-center gap-1 text-sm">
              <MonitorUp className="w-4 h-4" />
              Экран
            </div>
          )}
        </div>
      )}

      {/* Имя и статус микрофона */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className={`bg-black/50 text-white px-3 py-1 rounded-md ${nameTextSize} font-medium backdrop-blur-sm truncate max-w-[70%]`}>
          {participant.displayName}
          {isLocal && ' (Вы)'}
          {participant.isGuest && ' (Гость)'}
          {participant.isHost && ' (Хост)'}
        </span>

        <div className="bg-black/50 p-2 rounded-md backdrop-blur-sm">
          {participant.audioEnabled ? (
            <Mic className={iconSize + ' text-white'} />
          ) : (
            <MicOff className={iconSize + ' text-red-500'} />
          )}
        </div>
      </div>

      {/* Рамка для локального видео */}
      {isLocal && (
        <div className="absolute inset-0 border-2 border-purple-500 rounded-lg pointer-events-none" />
      )}

      {/* Рамка для spotlight */}
      {isSpotlight && !isLocal && (
        <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none" />
      )}
    </div>
  );
};
