import { create } from 'zustand';
import { MEDIA_CONSTRAINTS } from '../constants';
import type { MediaDevices, SelectedDevices } from '../types';
import toast from 'react-hot-toast';

interface MediaStore {
  devices: MediaDevices;
  selectedDevices: SelectedDevices;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  isLoadingDevices: boolean;
  
  loadDevices: () => Promise<void>;
  selectDevice: (type: 'audioInput' | 'videoInput' | 'audioOutput', deviceId: string) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setScreenStream: (stream: MediaStream | null) => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<MediaStream | null>;
  stopScreenShare: () => void;
  stopAllStreams: () => void;
}

export const useMediaStore = create<MediaStore>((set, get) => ({
  devices: {
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
  },
  selectedDevices: {
    audioInput: null,
    videoInput: null,
    audioOutput: null,
  },
  localStream: null,
  screenStream: null,
  audioEnabled: true,
  videoEnabled: true,
  screenSharing: false,
  isLoadingDevices: false,

  loadDevices: async () => {
    set({ isLoadingDevices: true });
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');

      set({
        devices: { audioInputs, videoInputs, audioOutputs },
        selectedDevices: {
          audioInput: audioInputs[0]?.deviceId || null,
          videoInput: videoInputs[0]?.deviceId || null,
          audioOutput: audioOutputs[0]?.deviceId || null,
        },
      });
    } catch (error) {
      console.error('Failed to load devices:', error);
      toast.error('Не удалось загрузить список устройств');
    } finally {
      set({ isLoadingDevices: false });
    }
  },

  selectDevice: (type, deviceId) => {
    set((state) => ({
      selectedDevices: {
        ...state.selectedDevices,
        [type]: deviceId,
      },
    }));
  },

  setLocalStream: (stream) => {
    const { localStream: currentStream } = get();
    
    // Останавливаем предыдущий stream только если это другой stream
    if (currentStream && currentStream !== stream) {
      console.log('[mediaStore] Stopping previous stream:', currentStream.id);
      currentStream.getTracks().forEach((track) => track.stop());
    }

    console.log('[mediaStore] Setting new local stream:', stream?.id);
    set({ localStream: stream });
  },

  setScreenStream: (stream) => {
    set({ screenStream: stream });
  },

  toggleAudio: () => {
    const { localStream, audioEnabled } = get();
    if (localStream) {
      const newAudioEnabled = !audioEnabled;
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = newAudioEnabled;
      });
      set({ audioEnabled: newAudioEnabled });
      
      // Синхронно обновляем localParticipant
      setTimeout(async () => {
        const { useRoomStore } = await import('../store/roomStore');
        const localParticipant = useRoomStore.getState().localParticipant;
        if (localParticipant) {
          console.log('[mediaStore] Updating localParticipant audioEnabled:', newAudioEnabled);
          useRoomStore.getState().updateLocalParticipant({ audioEnabled: newAudioEnabled });
        }
      }, 0);
    }
  },

  toggleVideo: () => {
    const { localStream, videoEnabled } = get();
    if (localStream) {
      const newVideoEnabled = !videoEnabled;
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = newVideoEnabled;
      });
      set({ videoEnabled: newVideoEnabled });
      
      // Синхронно обновляем localParticipant
      setTimeout(async () => {
        const { useRoomStore } = await import('../store/roomStore');
        const localParticipant = useRoomStore.getState().localParticipant;
        if (localParticipant) {
          console.log('[mediaStore] Updating localParticipant videoEnabled:', newVideoEnabled);
          useRoomStore.getState().updateLocalParticipant({ videoEnabled: newVideoEnabled });
        }
      }, 0);
    }
  },

  startScreenShare: async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      console.log('[mediaStore] Screen share started:', stream.id);

      // Автоматически останавливаем шаринг когда пользователь нажимает "Stop sharing"
      stream.getVideoTracks()[0].onended = () => {
        get().stopScreenShare();
      };

      set({ screenStream: stream, screenSharing: true });
      
      // Синхронно обновляем localParticipant
      setTimeout(async () => {
        const { useRoomStore } = await import('../store/roomStore');
        const localParticipant = useRoomStore.getState().localParticipant;
        if (localParticipant) {
          console.log('[mediaStore] Updating localParticipant screenSharing: true');
          useRoomStore.getState().updateLocalParticipant({ screenSharing: true });
        }
      }, 0);
      
      return stream;
    } catch (error) {
      console.error('Failed to start screen share:', error);
      toast.error('Не удалось начать демонстрацию экрана');
      return null;
    }
  },

  stopScreenShare: () => {
    const { screenStream } = get();
    if (screenStream) {
      console.log('[mediaStore] Stopping screen share');
      screenStream.getTracks().forEach((track) => track.stop());
      set({ screenStream: null, screenSharing: false });
      
      // Синхронно обновляем localParticipant
      setTimeout(async () => {
        const { useRoomStore } = await import('../store/roomStore');
        const localParticipant = useRoomStore.getState().localParticipant;
        if (localParticipant) {
          console.log('[mediaStore] Updating localParticipant screenSharing: false');
          useRoomStore.getState().updateLocalParticipant({ screenSharing: false });
        }
      }, 0);
    }
  },

  stopAllStreams: () => {
    const { localStream, screenStream } = get();
    
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
    }

    set({
      localStream: null,
      screenStream: null,
      audioEnabled: true,
      videoEnabled: true,
      screenSharing: false,
    });
  },
}));
