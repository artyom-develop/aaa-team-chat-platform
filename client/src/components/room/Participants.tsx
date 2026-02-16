import { X, Crown, UserMinus } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../hooks/useSocket';

interface ParticipantsProps {
  onClose: () => void;
}

export const Participants = ({ onClose }: ParticipantsProps) => {
  const { user } = useAuthStore();
  const { room, participants, localParticipant, isHost } = useRoomStore();
  const { kickUser } = useSocket();

  const allParticipants = localParticipant
    ? [localParticipant, ...Array.from(participants.values())]
    : Array.from(participants.values());

  const handleKick = (userId: string, displayName: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить ${displayName} из комнаты?`)) {
      kickUser(userId);
    }
  };

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full">
      {/* Заголовок */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <h3 className="text-white font-semibold">
          Участники ({allParticipants.length})
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Список участников */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {allParticipants.map((participant) => {
          const isMe = participant.userId === user?.id;
          const isRoomHost = participant.userId === room?.hostId;

          return (
            <div
              key={participant.userId}
              className="bg-gray-800 rounded-lg px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {/* Аватар */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {participant.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Информация */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {participant.displayName}
                    </span>
                    {isRoomHost && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    {isMe && <span>Вы</span>}
                    {participant.isGuest && <span>Гость</span>}
                  </div>
                </div>
              </div>

              {/* Действия (только для хоста) */}
              {isHost && !isMe && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleKick(participant.userId, participant.displayName)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Удалить из комнаты"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Информация о комнате */}
      {room && (
        <div className="p-4 border-t border-gray-800">
          <div className="bg-gray-800 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Код комнаты:</span>
              <span className="text-white font-mono">{room.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Макс. участников:</span>
              <span className="text-white">{room.maxParticipants}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
