import { Request } from 'express';
import { Role } from '../../generated/prisma/index.js';

export interface IUserPayload {
  id: string;
  email: string;
  role: Role;
  tokenVersion: number;
}

export interface IAuthenticatedRequest extends Request {
  user?: IUserPayload;
}
