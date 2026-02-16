import dotenv from 'dotenv';

dotenv.config();

export class TurnConfig {
  static readonly STUN_SERVER_URL = process.env.STUN_SERVER_URL || 'stun:stun.l.google.com:19302';
  static readonly TURN_SERVER_URL = process.env.TURN_SERVER_URL || '';
  static readonly TURN_SERVER_USERNAME = process.env.TURN_SERVER_USERNAME || '';
  static readonly TURN_SERVER_CREDENTIAL = process.env.TURN_SERVER_CREDENTIAL || '';

  /**
   * Получить конфигурацию ICE серверов для WebRTC
   */
  static getIceServers(): RTCIceServer[] {
    const iceServers: RTCIceServer[] = [
      {
        urls: this.STUN_SERVER_URL,
      },
    ];

    // Добавляем TURN сервер если настроен
    if (this.TURN_SERVER_URL && this.TURN_SERVER_USERNAME && this.TURN_SERVER_CREDENTIAL) {
      iceServers.push({
        urls: this.TURN_SERVER_URL,
        username: this.TURN_SERVER_USERNAME,
        credential: this.TURN_SERVER_CREDENTIAL,
      });
    }

    return iceServers;
  }

  /**
   * Проверить настройку TURN сервера
   */
  static hasTurnServer(): boolean {
    return !!(this.TURN_SERVER_URL && this.TURN_SERVER_USERNAME && this.TURN_SERVER_CREDENTIAL);
  }
}

// Типы для WebRTC ICE конфигурации
interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}
