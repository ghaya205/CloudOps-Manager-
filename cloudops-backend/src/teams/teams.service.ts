import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { pageArgs, paginated, parseSort } from '../common/utils/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateTeamDto, UpdateTeamDto } from './dto/team.dto.js';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTeamDto) {
    if (
      await this.prisma.team.findUnique({
        where: { name: dto.name },
        select: { id: true },
      })
    ) {
      throw new ConflictException('A team with this name already exists');
    }
    return this.prisma.team.create({ data: dto });
  }

  async findAll(query: PaginationQueryDto) {
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.team.findMany({
        where,
        include: { _count: { select: { members: true } } },
        orderBy: parseSort(query.sort, ['name', 'createdAt'], {
          field: 'name',
          order: 'asc',
        }),
        ...pageArgs(query),
      }),
      this.prisma.team.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async update(id: string, dto: UpdateTeamDto) {
    await this.findOne(id);
    if (dto.name) {
      const taken = await this.prisma.team.findFirst({
        where: { name: dto.name, NOT: { id } },
        select: { id: true },
      });
      if (taken)
        throw new ConflictException('A team with this name already exists');
    }
    return this.prisma.team.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.team.delete({ where: { id } });
  }
}
