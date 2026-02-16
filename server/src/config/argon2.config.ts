import dotenv from 'dotenv';

dotenv.config();

export class Argon2Config {
  static readonly MEMORY_COST = parseInt(process.env.ARGON2_MEMORY_COST || '65536', 10);
  static readonly TIME_COST = parseInt(process.env.ARGON2_TIME_COST || '3', 10);
  static readonly PARALLELISM = parseInt(process.env.ARGON2_PARALLELISM || '4', 10);
}
