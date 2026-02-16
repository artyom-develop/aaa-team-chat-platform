import { IUserPayload } from '../shared/types/express.types.js';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends IUserPayload {}
  }
}

export {};
