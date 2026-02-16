import dotenv from 'dotenv';

dotenv.config();

export class JwtConfig {
  static readonly SECRET: string = process.env.JWT_SECRET || 'default-secret-change-in-production';
  static readonly EXPIRES_IN: string = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
  static readonly REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  static validateConfig(): void {
    if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be defined in production environment');
    }
  }

  static getAccessTokenExpiresInSeconds(): number {
    const expiresIn = this.EXPIRES_IN;
    return this.parseTimeToSeconds(expiresIn);
  }

  static getRefreshTokenExpiresInSeconds(): number {
    const expiresIn = this.REFRESH_EXPIRES_IN;
    return this.parseTimeToSeconds(expiresIn);
  }

  private static parseTimeToSeconds(time: string): number {
    const unit = time.slice(-1);
    const value = parseInt(time.slice(0, -1));
    
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 3600; // default 1 hour
    }
  }
}
