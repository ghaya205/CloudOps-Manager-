import type { Prisma } from '../generated/prisma/client.js';

export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
