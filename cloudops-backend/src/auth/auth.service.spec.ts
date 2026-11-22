import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

const hash = bcrypt.hashSync('correct-password', 4);
const baseUser = {
  id: 'u1',
  email: 'a@b.c',
  name: 'A',
  role: 'DEVOPS',
  active: true,
  passwordHash: hash,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function setup(user: typeof baseUser | null) {
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue(user),
      findUniqueOrThrow: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue(user),
    },
  };
  const jwt = { signAsync: vi.fn().mockResolvedValue('signed.jwt.token') };
  return {
    prisma,
    service: new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
    ),
    jwt,
  };
}

describe('AuthService', () => {
  it('returns a token and never the password hash on a good login', async () => {
    const { service, jwt } = setup(baseUser);
    const result = await service.login({
      email: 'A@B.C',
      password: 'correct-password',
    });
    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: 'u1',
      email: 'a@b.c',
      role: 'DEVOPS',
    });
  });

  it('rejects a wrong password, an unknown email and a deactivated account alike', async () => {
    await expect(
      setup(baseUser).service.login({ email: 'a@b.c', password: 'nope' }),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      setup(null).service.login({ email: 'x@y.z', password: 'whatever' }),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      setup({ ...baseUser, active: false }).service.login({
        email: 'a@b.c',
        password: 'correct-password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('requires the current password to change the password', async () => {
    const { service } = setup(baseUser);
    await expect(
      service.updateProfile('u1', { newPassword: 'brand-new-pass' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateProfile('u1', {
        currentPassword: 'wrong',
        newPassword: 'brand-new-pass',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('stores a new password only as a bcrypt hash', async () => {
    const { service, prisma } = setup(baseUser);
    await service.updateProfile('u1', {
      currentPassword: 'correct-password',
      newPassword: 'brand-new-pass',
    });
    const stored = prisma.user.update.mock.calls[0]![0].data
      .passwordHash as string;
    expect(stored).not.toBe('brand-new-pass');
    expect(await bcrypt.compare('brand-new-pass', stored)).toBe(true);
  });
});
