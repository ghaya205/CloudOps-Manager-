import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { Role } from '../generated/prisma/enums.js';
import type { AuthUser } from '../common/interfaces/auth-user.interface.js';
import { pageArgs, paginated, parseSort } from '../common/utils/pagination.js';
import { MetricsService } from '../metrics/metrics.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateServerDto,
  QueryServersDto,
  UpdateServerDto,
} from './dto/server.dto.js';

@Injectable()
export class ServersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
  ) {}

  private async assertProjectAndEnvironment(
    projectId: string,
    environmentId: string,
  ) {
    const env = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: { projectId: true },
    });
    if (!env) throw new BadRequestException('Environment not found');
    if (env.projectId !== projectId) {
      throw new BadRequestException(
        'The environment does not belong to the given project',
      );
    }
  }

  async create(dto: CreateServerDto) {
    if (
      !(await this.prisma.project.findUnique({
        where: { id: dto.projectId },
        select: { id: true },
      }))
    ) {
      throw new BadRequestException('Project not found');
    }
    await this.assertProjectAndEnvironment(dto.projectId, dto.environmentId);
    return this.prisma.server.create({ data: dto, include: this.listInclude });
  }

  private readonly listInclude = {
    project: { select: { id: true, name: true } },
    environment: { select: { id: true, name: true } },
  } satisfies Prisma.ServerInclude;

  async findAll(query: QueryServersDto) {
    const where: Prisma.ServerWhereInput = {
      ...(query.provider && {
        provider: { equals: query.provider, mode: 'insensitive' },
      }),
      ...(query.region && {
        region: { equals: query.region, mode: 'insensitive' },
      }),
      ...(query.status && { status: query.status }),
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.environmentId && { environmentId: query.environmentId }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { ipAddress: { contains: query.search } },
          { provider: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.server.findMany({
        where,
        include: this.listInclude,
        orderBy: parseSort(
          query.sort,
          ['name', 'provider', 'region', 'status', 'createdAt'],
          {
            field: 'createdAt',
            order: 'desc',
          },
        ),
        ...pageArgs(query),
      }),
      this.prisma.server.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async findOne(id: string) {
    const server = await this.prisma.server.findUnique({
      where: { id },
      include: {
        ...this.listInclude,
        applications: { orderBy: { name: 'asc' } },
        alerts: {
          where: { status: { not: 'RESOLVED' } },
          orderBy: { openedAt: 'desc' },
        },
      },
    });
    if (!server) throw new NotFoundException('Server not found');
    const { alerts, ...rest } = server;
    return {
      ...rest,
      openAlerts: alerts,
      latestMetric: await this.metrics.latest(id),
    };
  }

  async update(id: string, dto: UpdateServerDto) {
    const current = await this.prisma.server.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Server not found');
    if (dto.projectId || dto.environmentId) {
      await this.assertProjectAndEnvironment(
        dto.projectId ?? current.projectId,
        dto.environmentId ?? current.environmentId,
      );
    }
    return this.prisma.server.update({
      where: { id },
      data: dto,
      include: this.listInclude,
    });
  }

  async remove(id: string, actor: AuthUser) {
    const server = await this.prisma.server.findUnique({
      where: { id },
      include: {
        _count: {
          select: { applications: true, alertRules: true, alerts: true },
        },
      },
    });
    if (!server) throw new NotFoundException('Server not found');
    const dependents =
      server._count.applications +
      server._count.alertRules +
      server._count.alerts;
    if (dependents > 0 && actor.role !== Role.ADMIN) {
      throw new ForbiddenException(
        `This server still has ${dependents} dependent application(s)/rule(s)/alert(s); only an Admin can delete it`,
      );
    }
    await this.prisma.server.delete({ where: { id } });
  }
}
