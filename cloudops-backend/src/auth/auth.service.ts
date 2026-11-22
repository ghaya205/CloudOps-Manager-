import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { JwtPayload } from '../common/interfaces/auth-user.interface.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BCRYPT_ROUNDS } from '../users/users.service.js';
import { publicUserSelect } from '../users/user.select.js';
import type { LoginDto } from './dto/login.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';


const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    const passwordOk = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !user.active || !passwordOk) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const { passwordHash: _omit, ...publicUser } = user;
    return { accessToken: await this.jwt.signAsync(payload), user: publicUser };
  }

  me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: publicUserSelect,
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    let passwordHash: string | undefined;
    if (dto.newPassword) {
      if (
        !dto.currentPassword ||
        !(await bcrypt.compare(dto.currentPassword, current.passwordHash))
      ) {
        throw new BadRequestException(
          'The current password is missing or incorrect',
        );
      }
      passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    }

    const email = dto.email?.toLowerCase();
    if (email && email !== current.email) {
      const taken = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (taken)
        throw new ConflictException('A user with this email already exists');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(email && { email }),
        ...(passwordHash && { passwordHash }),
      },
      select: publicUserSelect,
    });
  }
}
