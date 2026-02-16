import { useEffect } from 'react';
import { useMediaStore } from '../store/mediaStore';

/**
 * Хук для управления медиа-устройствами и потоками
 */
export const useMedia = () => {
  const {
    devices,
    selectedDevices,
    localStream,
    screenStream,
    audioEnabled,
    videoEnabled,
    screenSharing,
    loadDevices,
    selectDevice,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    stopAllStreams,
  } = useMediaStore();

  // Загружаем список устройств при монтировании
  useEffect(() => {
    loadDevices();

    // Обновляем список при изменении устройств
    const handleDeviceChange = () => {
      loadDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [loadDevices]);

  // НЕ ОЧИЩАЕМ потоки при размонтировании - они нужны в других компонентах
  // useEffect(() => {
  //   return () => {
  //     stopAllStreams();
  //   };
  // }, []);

  return {
    // Устройства
    devices,
    selectedDevices,
    selectDevice,

    // Потоки
    localStream,
    screenStream,

    // Состояние медиа
    audioEnabled,
    videoEnabled,
    screenSharing,

    // Управление медиа
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    stopAllStreams,
  };
};
