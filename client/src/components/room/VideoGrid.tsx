import { VideoTile } from './VideoTile';
import { useRoomStore } from '../../store/roomStore';
import { useAuthStore } from '../../store/authStore';

export const VideoGrid = () => {
  const { participants, localParticipant } = useRoomStore();
  const { user } = useAuthStore();

  console.log('[VideoGrid] Rendering:', {
    hasLocalParticipant: !!localParticipant,
    localParticipantStream: localParticipant?.stream?.id,
    remoteParticipantsCount: participants.size,
    totalParticipants: localParticipant ? 1 + participants.size : participants.size,
  });

  const allParticipants = localParticipant
    ? [localParticipant, ...Array.from(participants.values())]
    : Array.from(participants.values());

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

  // Определяем количество колонок в зависимости от количества участников
  const getGridCols = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  return (
    <div className={`grid ${getGridCols(allParticipants.length)} gap-4 h-full p-4`}>
      {allParticipants.map((participant) => (
        <VideoTile
          key={participant.userId}
          participant={participant}
          isLocal={participant.userId === user?.id}
        />
      ))}
    </div>
  );
};
