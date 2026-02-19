import { useEffect, useRef } from 'react';
import { Participant } from '../../types';
import { Mic, MicOff, MonitorUp } from 'lucide-react';

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

  // Привязка stream к video element.
  // Зависит от stream, videoEnabled, screenSharing — при любом изменении
  // переустанавливаем srcObject и вызываем play() чтобы video "проснулся"
  useEffect(() => {
    if (!videoRef.current) return;

    if (participant.stream) {
      videoRef.current.srcObject = participant.stream;
      videoRef.current.play().catch(() => {
        // Autoplay policy — не критично, autoPlay атрибут обычно справляется
      });
    } else {
      videoRef.current.srcObject = null;
    }
  }, [participant.stream, participant.videoEnabled, participant.screenSharing]);

  const shouldShowVideo = !!(participant.stream && participant.videoEnabled);

  const avatarSize = isSpotlight ? 'w-32 h-32' : isThumbnail ? 'w-16 h-16' : 'w-24 h-24';
  const avatarTextSize = isSpotlight ? 'text-6xl' : isThumbnail ? 'text-2xl' : 'text-4xl';
  const nameTextSize = isThumbnail ? 'text-xs' : 'text-sm';
  const iconSize = isThumbnail ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div
      className={`relative bg-gray-900 rounded-lg overflow-hidden w-full h-full ${
        isThumbnail ? 'ring-2 ring-transparent hover:ring-purple-500 transition' : ''
      }`}
    >
      {/* Video element всегда в DOM — скрываем через CSS чтобы не терять srcObject */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${!shouldShowVideo ? 'hidden' : ''}`}
      />

      {/* Аватар */}
      {!shouldShowVideo && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
          <div
            className={`${avatarSize} rounded-full bg-white/10 flex items-center justify-center`}
          >
            <span className={`${avatarTextSize} font-bold text-white`}>
              {participant.displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Бейдж screen sharing */}
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

      {/* Имя и микрофон */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span
          className={`bg-black/50 text-white px-3 py-1 rounded-md ${nameTextSize} font-medium backdrop-blur-sm truncate max-w-[70%]`}
        >
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

      {isLocal && (
        <div className="absolute inset-0 border-2 border-purple-500 rounded-lg pointer-events-none" />
      )}

      {isSpotlight && !isLocal && (
        <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none" />
      )}
    </div>
  );
};
