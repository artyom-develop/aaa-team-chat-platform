import dotenv from 'dotenv';

dotenv.config();

export class DatabaseConfig {
  static readonly DATABASE_URL = process.env.DATABASE_URL || '';

  static validateConfig(): void {
    if (!this.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }
  }
}
