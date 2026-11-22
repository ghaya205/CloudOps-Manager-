import type { Role } from '../../generated/prisma/enums.js';


export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}


export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
