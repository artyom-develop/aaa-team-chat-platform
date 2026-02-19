import { create } from 'zustand';
import type { Room, Participant } from '../types';

interface RoomStore {
  room: Room | null;
  participants: Map<string, Participant>;
  localParticipant: Participant | null;
  isHost: boolean;
  isInLobby: boolean;
  streamUpdateTrigger: number;
  
  setRoom: (room: Room) => void;
  setLocalParticipant: (participant: Participant) => void;
  updateLocalParticipant: (updates: Partial<Participant>) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<Participant>) => void;
  getParticipant: (userId: string) => Participant | undefined;
  clearRoom: () => void;
  setIsInLobby: (inLobby: boolean) => void;
  triggerStreamUpdate: () => void;
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  room: null,
  participants: new Map(),
  localParticipant: null,
  isHost: false,
  isInLobby: false,
  streamUpdateTrigger: 0,

  setRoom: (room) => {
    set({ room });
  },

  setLocalParticipant: (participant) => {
    const { room } = get();
    const isHost = room ? participant.userId === room.hostId : false;
    set({ localParticipant: participant, isHost });
  },

  updateLocalParticipant: (updates: Partial<Participant>) => {
    set((state) => {
      if (!state.localParticipant) return state;
      return {
        localParticipant: { ...state.localParticipant, ...updates },
      };
    });
  },

  addParticipant: (participant) => {
    set((state) => {
      const newParticipants = new Map(state.participants);
      newParticipants.set(participant.userId, participant);
      return { participants: newParticipants };
    });
  },

  removeParticipant: (userId) => {
    set((state) => {
      const newParticipants = new Map(state.participants);
      newParticipants.delete(userId);
      return { participants: newParticipants };
    });
  },

  updateParticipant: (userId, updates) => {
    set((state) => {
      const participant = state.participants.get(userId);
      if (!participant) return state; // Не создаём новую Map если участника нет
      const newParticipants = new Map(state.participants);
      newParticipants.set(userId, { ...participant, ...updates });
      return { participants: newParticipants };
    });
  },

  getParticipant: (userId) => {
    return get().participants.get(userId);
  },

  clearRoom: () => {
    set({
      room: null,
      participants: new Map(),
      localParticipant: null,
      isHost: false,
      isInLobby: false,
    });
  },

  setIsInLobby: (inLobby) => {
    set({ isInLobby: inLobby });
  },

  triggerStreamUpdate: () => {
    set((state) => ({ streamUpdateTrigger: state.streamUpdateTrigger + 1 }));
  },
}));
