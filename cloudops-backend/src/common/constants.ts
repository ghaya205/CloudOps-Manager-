import { Role } from '../generated/prisma/enums.js';


export const WRITE_ROLES = [Role.ADMIN, Role.DEVOPS] as const;
