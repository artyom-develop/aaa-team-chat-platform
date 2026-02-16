import { useEffect, useRef } from 'react';
import { Participant } from '../../types';
import { Mic, MicOff, Video, VideoOff, MonitorUp } from 'lucide-react';

interface VideoTileProps {
  participant: Participant;
  isLocal?: boolean;
}

export const VideoTile = ({ participant, isLocal = false }: VideoTileProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  console.log('[VideoTile] Rendering participant:', {
    userId: participant.userId,
    displayName: participant.displayName,
    hasStream: !!participant.stream,
    streamId: participant.stream?.id,
    videoEnabled: participant.videoEnabled,
    audioEnabled: participant.audioEnabled,
    isLocal,
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
      
      // Проверяем состояние треков
      const videoTrack = participant.stream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('[VideoTile] Video track state:', {
          userId: participant.userId,
          trackEnabled: videoTrack.enabled,
          trackReadyState: videoTrack.readyState,
          participantVideoEnabled: participant.videoEnabled,
        });

        // ВАЖНО: Синхронизируем track.enabled с participant.videoEnabled
        // Это нужно для правильного отображения видео после toggle
        if (videoTrack.enabled !== participant.videoEnabled) {
          console.log('[VideoTile] Syncing track.enabled with participant.videoEnabled:', {
            userId: participant.userId,
            oldTrackEnabled: videoTrack.enabled,
            newTrackEnabled: participant.videoEnabled,
          });
          videoTrack.enabled = participant.videoEnabled;
        }
      }

      // Аналогично для аудио треков
      const audioTrack = participant.stream.getAudioTracks()[0];
      if (audioTrack && audioTrack.enabled !== participant.audioEnabled) {
        console.log('[VideoTile] Syncing audio track.enabled with participant.audioEnabled:', {
          userId: participant.userId,
          oldTrackEnabled: audioTrack.enabled,
          newTrackEnabled: participant.audioEnabled,
        });
        audioTrack.enabled = participant.audioEnabled;
      }
    } else {
      console.log('[VideoTile] Cannot attach stream:', {
        userId: participant.userId,
        hasVideoRef: !!videoRef.current,
        hasStream: !!participant.stream,
      });
    }
  }, [participant.stream, participant.userId, participant.videoEnabled, participant.audioEnabled]);

  // Проверяем, можно ли показать видео
  const shouldShowVideo = participant.stream && participant.videoEnabled;
  
  console.log('[VideoTile] shouldShowVideo:', {
    userId: participant.userId,
    shouldShowVideo,
    hasStream: !!participant.stream,
    videoEnabled: participant.videoEnabled,
  });

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
      {/* Видео */}
      {shouldShowVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
          <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-4xl font-bold text-white">
              {participant.displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Индикаторы */}
      <div className="absolute top-2 right-2 flex gap-2">
        {participant.screenSharing && (
          <div className="bg-green-500 text-white px-2 py-1 rounded-md flex items-center gap-1 text-sm">
            <MonitorUp className="w-4 h-4" />
            Экран
          </div>
        )}
      </div>

      {/* Имя и статус микрофона */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="bg-black/50 text-white px-3 py-1 rounded-md text-sm font-medium backdrop-blur-sm">
          {participant.displayName}
          {isLocal && ' (Вы)'}
          {participant.isGuest && ' (Гость)'}
        </span>

        <div className="bg-black/50 p-2 rounded-md backdrop-blur-sm">
          {participant.audioEnabled ? (
            <Mic className="w-4 h-4 text-white" />
          ) : (
            <MicOff className="w-4 h-4 text-red-500" />
          )}
        </div>
      </div>

      {/* Рамка для локального видео */}
      {isLocal && (
        <div className="absolute inset-0 border-2 border-purple-500 rounded-lg pointer-events-none" />
      )}
    </div>
  );
};
