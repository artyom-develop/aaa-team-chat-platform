import { X } from 'lucide-react';
import { useMedia } from '../../hooks/useMedia';

interface DeviceSettingsProps {
  onClose: () => void;
}

export const DeviceSettings = ({ onClose }: DeviceSettingsProps) => {
  const { devices, selectedDevices, selectDevice } = useMedia();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-md">
        {/* Заголовок */}
        <div className="bg-gray-800 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between border-b border-gray-700 rounded-t-lg">
          <h3 className="text-white font-semibold text-base sm:text-lg">Настройки устройств</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Контент */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Микрофон */}
          <div>
            <label className="block text-white font-medium mb-2 text-sm sm:text-base">Микрофон</label>
            <select
              value={selectedDevices.audioInput || ''}
              onChange={(e) => selectDevice('audioInput', e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 sm:px-4 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {devices.audioInputs.length === 0 ? (
                <option>Микрофон не найден</option>
              ) : (
                devices.audioInputs.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Микрофон ${device.deviceId.slice(0, 5)}`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Камера */}
          <div>
            <label className="block text-white font-medium mb-2 text-sm sm:text-base">Камера</label>
            <select
              value={selectedDevices.videoInput || ''}
              onChange={(e) => selectDevice('videoInput', e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 sm:px-4 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {devices.videoInputs.length === 0 ? (
                <option>Камера не найдена</option>
              ) : (
                devices.videoInputs.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Камера ${device.deviceId.slice(0, 5)}`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Динамики */}
          <div>
            <label className="block text-white font-medium mb-2 text-sm sm:text-base">Динамики</label>
            <select
              value={selectedDevices.audioOutput || ''}
              onChange={(e) => selectDevice('audioOutput', e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 sm:px-4 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {devices.audioOutputs.length === 0 ? (
                <option>Динамики не найдены</option>
              ) : (
                devices.audioOutputs.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Динамики ${device.deviceId.slice(0, 5)}`}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Футер */}
        <div className="bg-gray-800 px-4 py-3 sm:px-6 sm:py-4 flex justify-end border-t border-gray-700 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 sm:px-6 text-sm sm:text-base bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
