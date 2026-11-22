import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { pageArgs, paginated, parseSort } from '../common/utils/pagination.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { QueryUsersDto } from './dto/query-users.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import { publicUserSelect } from './user.select.js';

export const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const email = dto.email.toLowerCase();
    if (
      await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      })
    ) {
      throw new ConflictException('A user with this email already exists');
    }
    return this.prisma.user.create({
      data: {
        email,
        name: dto.name,
        role: dto.role,
        active: dto.active ?? true,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      },
      select: publicUserSelect,
    });
  }

  async findAll(query: QueryUsersDto) {
    const where: Prisma.UserWhereInput = {
      ...(query.role && { role: query.role }),
      ...(query.active !== undefined && { active: query.active }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: publicUserSelect,
        orderBy: parseSort(query.sort, ['name', 'email', 'role', 'createdAt'], {
          field: 'createdAt',
          order: 'desc',
        }),
        ...pageArgs(query),
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    await this.findOne(id);
    if (
      id === actorId &&
      (dto.active === false || (dto.role !== undefined && dto.role !== 'ADMIN'))
    ) {
      throw new BadRequestException(
        'You cannot deactivate your own account or remove your own Admin role',
      );
    }
    const email = dto.email?.toLowerCase();
    if (email) {
      const taken = await this.prisma.user.findFirst({
        where: { email, NOT: { id } },
        select: { id: true },
      });
      if (taken)
        throw new ConflictException('A user with this email already exists');
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(email && { email }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.password && {
          passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        }),
      },
      select: publicUserSelect,
    });
  }

  async remove(id: string, actorId: string) {
    if (id === actorId)
      throw new BadRequestException('You cannot delete your own account');
    await this.findOne(id);
    // Fails with a 409 (FK Restrict) when the user still owns projects.
    await this.prisma.user.delete({ where: { id } });
  }
}
