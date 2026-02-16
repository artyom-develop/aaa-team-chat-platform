import { User, Role } from '../../../generated/prisma/index.js';

export interface IUserResponse {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  isActive: boolean;
  isGuest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateUserData {
  displayName: string;
  email: string;
  password: string | null;
  avatarUrl?: string;
  role?: Role;
  isGuest?: boolean;
}

export interface IUpdateUserData {
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  isActive?: boolean;
  tokenVersion?: number;
}

export interface IUsersRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(skip?: number, take?: number): Promise<User[]>;
  count(): Promise<number>;
  create(data: ICreateUserData): Promise<User>;
  update(id: string, data: IUpdateUserData): Promise<User>;
  updateActiveStatus(id: string, isActive: boolean): Promise<User>;
  delete(id: string): Promise<void>;
}

// Re-export User type as IUser for compatibility
export type IUser = User;
