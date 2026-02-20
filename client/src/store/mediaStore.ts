import { create } from 'zustand';
import { MEDIA_CONSTRAINTS } from '../constants';
import type { MediaDevices, SelectedDevices } from '../types';
import toast from 'react-hot-toast';

// Константы для localStorage
const MEDIA_PREFS_KEY = 'videoMeetMediaPrefs';

interface MediaPreferences {
  audioEnabled: boolean;
  videoEnabled: boolean;
  autoStart: boolean;
}

// Загрузить предпочтения из localStorage
const loadMediaPreferences = (): MediaPreferences => {
  try {
    const stored = localStorage.getItem(MEDIA_PREFS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[mediaStore] Failed to load media preferences:', error);
  }
  // Значения по умолчанию - НЕ автоматически включать
  return {
    audioEnabled: false,
    videoEnabled: false,
    autoStart: false,
  };
};

// Сохранить предпочтения
const saveMediaPreferences = (prefs: MediaPreferences) => {
  try {
    localStorage.setItem(MEDIA_PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('[mediaStore] Failed to save media preferences:', error);
  }
};

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
  selectDevice: (type: 'audioInput' | 'videoInput' | 'audioOutput', deviceId: string) => Promise<void> | void;
  setLocalStream: (stream: MediaStream | null) => void;
  setScreenStream: (stream: MediaStream | null) => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<MediaStream | null>;
  stopScreenShare: () => void;
  stopAllStreams: () => void;
  getMediaPreferences: () => MediaPreferences;
  saveMediaPreferences: (prefs: MediaPreferences) => void;
}

export const useMediaStore = create<MediaStore>((set, get) => {
  const prefs = loadMediaPreferences();
  
  return {
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
  audioEnabled: prefs.audioEnabled,
  videoEnabled: prefs.videoEnabled,
  screenSharing: false,
  isLoadingDevices: false,

  loadDevices: async () => {
    set({ isLoadingDevices: true });
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');

      // Сохраняем текущий выбор, если устройство всё ещё доступно
      const current = get().selectedDevices;
      const audioInputStillExists = current.audioInput && audioInputs.some(d => d.deviceId === current.audioInput);
      const videoInputStillExists = current.videoInput && videoInputs.some(d => d.deviceId === current.videoInput);
      const audioOutputStillExists = current.audioOutput && audioOutputs.some(d => d.deviceId === current.audioOutput);

      set({
        devices: { audioInputs, videoInputs, audioOutputs },
        selectedDevices: {
          audioInput: audioInputStillExists ? current.audioInput : (audioInputs[0]?.deviceId || null),
          videoInput: videoInputStillExists ? current.videoInput : (videoInputs[0]?.deviceId || null),
          audioOutput: audioOutputStillExists ? current.audioOutput : (audioOutputs[0]?.deviceId || null),
        },
      });
    } catch (error) {
      console.error('Failed to load devices:', error);
      toast.error('Не удалось загрузить список устройств');
    } finally {
      set({ isLoadingDevices: false });
    }
  },

  selectDevice: async (type, deviceId) => {
    const prev = get().selectedDevices;
    set((state) => ({
      selectedDevices: {
        ...state.selectedDevices,
        [type]: deviceId,
      },
    }));

    // Для audioOutput просто обновляем sinkId — не нужен новый stream
    if (type === 'audioOutput') return;

    // Для audioInput и videoInput — нужно получить новый stream с выбранным устройством
    const { localStream, audioEnabled, videoEnabled } = get();
    if (!localStream) return;

    const newSelectedDevices = { ...prev, [type]: deviceId };

    try {
      const constraints: MediaStreamConstraints = {
        audio: newSelectedDevices.audioInput
          ? { deviceId: { exact: newSelectedDevices.audioInput } }
          : true,
        video: newSelectedDevices.videoInput
          ? { deviceId: { exact: newSelectedDevices.videoInput }, width: 1280, height: 720 }
          : { width: 1280, height: 720 },
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Останавливаем старые треки
      localStream.getTracks().forEach((t) => t.stop());

      // Применяем текущий enabled state
      newStream.getAudioTracks().forEach((t) => { t.enabled = audioEnabled; });
      newStream.getVideoTracks().forEach((t) => { t.enabled = videoEnabled; });

      set({ localStream: newStream });

      // Обновляем localParticipant
      const { useRoomStore } = await import('../store/roomStore');
      const lp = useRoomStore.getState().localParticipant;
      if (lp) {
        useRoomStore.getState().updateLocalParticipant({ stream: newStream });
      }

      console.log('[mediaStore] Device switched, new stream:', newStream.id);
    } catch (error) {
      console.error('[mediaStore] Failed to switch device:', error);
      toast.error('Не удалось переключить устройство');
    }
  },

  setLocalStream: (stream) => {
    const { localStream: currentStream } = get();
    
    // Проверяем, действительно ли это новый stream
    // Не останавливаем треки при reconnect если это тот же stream
    if (currentStream && currentStream !== stream && currentStream.id !== stream?.id) {
      console.log('[mediaStore] Stopping previous stream:', currentStream.id);
      // Только если это ДЕЙСТВИТЕЛЬНО другой stream (не reconnect)
      currentStream.getTracks().forEach((track) => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
    } else if (currentStream && currentStream.id === stream?.id) {
      console.log('[mediaStore] Same stream, keeping tracks alive');
      return; // Не заменяем, если это тот же stream
    }

    console.log('[mediaStore] Setting new local stream:', stream?.id);
    set({ localStream: stream });
    
    // ✅ Применяем текущее состояние enabled к трекам нового стрима
    // Это гарантирует что настройки из лобби или предыдущей сессии применятся к трекам
    if (stream) {
      const { audioEnabled, videoEnabled } = get();
      
      console.log('[mediaStore] Applying enabled state to stream tracks:', { 
        audioEnabled, 
        videoEnabled,
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
      });
      
      stream.getAudioTracks().forEach((track) => {
        console.log('[mediaStore] Setting audio track enabled:', {
          trackId: track.id,
          enabled: audioEnabled,
          prevEnabled: track.enabled,
        });
        track.enabled = audioEnabled;
      });
      
      stream.getVideoTracks().forEach((track) => {
        console.log('[mediaStore] Setting video track enabled:', {
          trackId: track.id,
          label: track.label,
          enabled: videoEnabled,
          prevEnabled: track.enabled,
        });
        track.enabled = videoEnabled;
      });
      
      console.log('[mediaStore] Stream tracks configured with enabled state');
    }
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
        // ✅ ВАЖНО: Используем track.enabled вместо track.stop()
        // track.stop() полностью убивает трек и требует нового getUserMedia
        // track.enabled = false просто отключает трансляцию, трек остается живым
        track.enabled = newAudioEnabled;
      });
      set({ audioEnabled: newAudioEnabled });
      
      // Сохраняем предпочтение
      const prefs = loadMediaPreferences();
      saveMediaPreferences({ ...prefs, audioEnabled: newAudioEnabled });
      
      // Синхронно обновляем localParticipant (renegotiation НЕ нужна - track.enabled
      // автоматически отражается на remote стороне через существующее WebRTC соединение)
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
        // ✅ ВАЖНО: Используем track.enabled вместо track.stop()
        // track.stop() полностью убивает трек и требует нового getUserMedia
        // track.enabled = false просто отключает трансляцию, трек остается живым
        track.enabled = newVideoEnabled;
      });
      set({ videoEnabled: newVideoEnabled });
      
      // Сохраняем предпочтение
      const prefs = loadMediaPreferences();
      saveMediaPreferences({ ...prefs, videoEnabled: newVideoEnabled });
      
      // Синхронно обновляем localParticipant (renegotiation НЕ нужна - track.enabled
      // автоматически отражается на remote стороне через существующее WebRTC соединение)
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

  getMediaPreferences: () => loadMediaPreferences(),
  
  saveMediaPreferences: (prefs: MediaPreferences) => {
    saveMediaPreferences(prefs);
    set({ 
      audioEnabled: prefs.audioEnabled, 
      videoEnabled: prefs.videoEnabled 
    });
  },
};
});
