import { VideoTile } from './VideoTile';
import { useRoomStore } from '../../store/roomStore';
import { useAuthStore } from '../../store/authStore';
import { useVideoLayoutStore } from '../../store/videoLayoutStore';
import { useEffect, useMemo } from 'react';
import { Grid, Users } from 'lucide-react';

export const VideoGrid = () => {
  const { participants, localParticipant } = useRoomStore();
  const { user } = useAuthStore();
  const { spotlightUserId, setSpotlightUserId, layout, setLayout } = useVideoLayoutStore();

  console.log('[VideoGrid] Rendering:', {
    hasLocalParticipant: !!localParticipant,
    localParticipantStream: localParticipant?.stream?.id,
    remoteParticipantsCount: participants.size,
    totalParticipants: localParticipant ? 1 + participants.size : participants.size,
  });

  const allParticipants = useMemo(() => {
    return localParticipant
      ? [localParticipant, ...Array.from(participants.values())]
      : Array.from(participants.values());
  }, [localParticipant, participants]);

  // Автоматически выбираем хоста как spotlight при входе в комнату
  useEffect(() => {
    if (!spotlightUserId && allParticipants.length > 0) {
      const host = allParticipants.find(p => p.isHost);
      if (host) {
        setSpotlightUserId(host.userId);
      } else if (allParticipants[0]) {
        setSpotlightUserId(allParticipants[0].userId);
      }
    }
  }, [allParticipants, spotlightUserId, setSpotlightUserId]);

  console.log('[VideoGrid] All participants:', allParticipants.map(p => ({
    userId: p.userId,
    displayName: p.displayName,
    hasStream: !!p.stream,
    streamId: p.stream?.id,
    videoEnabled: p.videoEnabled,
  })));

  // Если нет участников - показываем сообщение
  if (allParticipants.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400 text-center">
          <p className="text-xl mb-2">Ожидание подключения...</p>
          <p className="text-sm">Вы будете видеть других участников когда они присоединятся</p>
        </div>
      </div>
    );
  }

  // Определяем participant для spotlight
  const spotlightParticipant = allParticipants.find(p => p.userId === spotlightUserId) || allParticipants[0];
  
  // Остальные участники для preview
  const otherParticipants = allParticipants.filter(p => p.userId !== spotlightParticipant.userId);

  // Grid layout - как раньше
  const getGridCols = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-1 sm:grid-cols-2';
    if (count <= 9) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  };

  // Spotlight layout
  if (layout === 'spotlight' && allParticipants.length >= 1) {
    return (
      <div className="h-full flex flex-col gap-2 p-2 sm:p-4">
        {/* Кнопка переключения layout */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setLayout('grid')}
            className="p-1.5 sm:p-2 rounded-lg transition bg-gray-700 text-gray-300 hover:bg-gray-600"
            title="Grid View"
          >
            <Grid className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={() => setLayout('spotlight')}
            className="p-1.5 sm:p-2 rounded-lg transition bg-purple-600 text-white"
            title="Spotlight View"
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Главное видео */}
        <div className="flex-1 min-h-0">
          <VideoTile
            participant={spotlightParticipant}
            isLocal={spotlightParticipant.userId === user?.id}
            isSpotlight={true}
          />
        </div>

        {/* Превью остальных участников со скроллом */}
        {otherParticipants.length > 0 && (
          <div 
            className="h-24 sm:h-32 flex gap-2 overflow-x-auto"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#a3a3a3 transparent',
            }}
          >
            {otherParticipants.map((participant) => (
              <div
                key={participant.userId}
                className="shrink-0 w-32 sm:w-48 cursor-pointer transform transition hover:scale-105"
                onClick={() => setSpotlightUserId(participant.userId)}
              >
                <VideoTile
                  participant={participant}
                  isLocal={participant.userId === user?.id}
                  isThumbnail={true}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Grid layout
  return (
    <div className="flex flex-col h-full p-2 sm:p-4 gap-2">
      {/* Кнопка переключения layout */}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setLayout('grid')}
          className="p-1.5 sm:p-2 rounded-lg transition bg-purple-600 text-white"
          title="Grid View"
        >
          <Grid className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <button
          onClick={() => setLayout('spotlight')}
          className="p-1.5 sm:p-2 rounded-lg transition bg-gray-700 text-gray-300 hover:bg-gray-600"
          title="Spotlight View"
        >
          <Users className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Grid с ограниченной высотой и скроллом */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#a3a3a3 transparent',
        }}
      >
        <div className={`grid ${getGridCols(allParticipants.length)} gap-2 sm:gap-4 content-start`}>
          {allParticipants.map((participant) => (
            <div key={participant.userId} className="w-full" style={{ aspectRatio: '16/9' }}>
              <VideoTile
                participant={participant}
                isLocal={participant.userId === user?.id}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

