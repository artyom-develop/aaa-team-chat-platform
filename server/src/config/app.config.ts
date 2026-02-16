import dotenv from 'dotenv';

dotenv.config();

export class AppConfig {
  static readonly PORT = parseInt(process.env.PORT || '3000', 10);
  static readonly NODE_ENV = process.env.NODE_ENV || 'development';
  static readonly IS_PRODUCTION = this.NODE_ENV === 'production';
  static readonly IS_DEVELOPMENT = this.NODE_ENV === 'development';
  static readonly CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
}
