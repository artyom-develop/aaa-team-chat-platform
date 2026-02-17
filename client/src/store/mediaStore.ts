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
      console.log('[mediaStore] toggleAudio:', {
        from: audioEnabled,
        to: newAudioEnabled,
        streamId: localStream.id,
        audioTracksCount: localStream.getAudioTracks().length,
      });
      
      localStream.getAudioTracks().forEach((track) => {
        console.log('[mediaStore] Setting audio track enabled:', {
          trackId: track.id,
          enabled: newAudioEnabled,
          readyState: track.readyState,
        });
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
    } else {
      console.warn('[mediaStore] toggleAudio called but no localStream available');
    }
  },

  toggleVideo: () => {
    const { localStream, videoEnabled } = get();
    if (localStream) {
      const newVideoEnabled = !videoEnabled;
      console.log('[mediaStore] toggleVideo:', {
        from: videoEnabled,
        to: newVideoEnabled,
        streamId: localStream.id,
        videoTracksCount: localStream.getVideoTracks().length,
      });
      
      localStream.getVideoTracks().forEach((track) => {
        console.log('[mediaStore] Setting video track enabled:', {
          trackId: track.id,
          label: track.label,
          enabled: newVideoEnabled,
          readyState: track.readyState,
        });
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
    } else {
      console.warn('[mediaStore] toggleVideo called but no localStream available');
    }
  },

  startScreenShare: async () => {
    try {
      console.log('[mediaStore] Requesting screen share access...');
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor', // или 'window', 'application', 'browser'
        },
        audio: false,
      });

      console.log('[mediaStore] Screen share started successfully:', {
        streamId: stream.id,
        videoTracks: stream.getVideoTracks().length,
        videoTrackSettings: stream.getVideoTracks()[0]?.getSettings(),
      });

      // Автоматически останавливаем шаринг когда пользователь нажимает "Stop sharing"
      stream.getVideoTracks()[0].onended = () => {
        console.log('[mediaStore] Screen share ended by user');
        get().stopScreenShare();
      };

      set({ screenStream: stream, screenSharing: true });
      
      // Синхронно обновляем localParticipant
      setTimeout(async () => {
        const { useRoomStore } = await import('../store/roomStore');
        const localParticipant = useRoomStore.getState().localParticipant;
        if (localParticipant) {
          console.log('[mediaStore] Updating localParticipant screenSharing: true', {
            userId: localParticipant.userId,
            isHost: localParticipant.isHost,
            displayName: localParticipant.displayName,
          });
          useRoomStore.getState().updateLocalParticipant({ screenSharing: true });
        }
      }, 0);
      
      toast.success('Демонстрация экрана началась');
      return stream;
    } catch (error: any) {
      console.error('[mediaStore] Failed to start screen share:', {
        error,
        errorName: error.name,
        errorMessage: error.message,
      });
      
      // Более детальные сообщения об ошибках
      if (error.name === 'NotAllowedError') {
        toast.error('Вы отклонили разрешение на демонстрацию экрана');
      } else if (error.name === 'NotFoundError') {
        toast.error('Не найден источник для демонстрации');
      } else if (error.name === 'NotSupportedError') {
        toast.error('Демонстрация экрана не поддерживается вашим браузером');
      } else {
        toast.error('Не удалось начать демонстрацию экрана: ' + error.message);
      }
      
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
