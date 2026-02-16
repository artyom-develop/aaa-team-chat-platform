// Temporary Role enum until Prisma migration is applied
enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export const Roles = {
  ADMIN: Role.ADMIN,
  USER: Role.USER,
} as const;

// Alias for compatibility
export const ROLES = Roles;

export type RoleType = Role;
