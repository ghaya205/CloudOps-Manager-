import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { pageArgs, paginated, parseSort } from '../common/utils/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateApplicationDto,
  QueryApplicationsDto,
  UpdateApplicationDto,
} from './dto/application.dto.js';

const include = {
  server: { select: { id: true, name: true, projectId: true } },
  environment: { select: { id: true, name: true } },
} satisfies Prisma.ApplicationInclude;

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveEnvironment(serverId: string, environmentId?: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: { projectId: true, environmentId: true },
    });
    if (!server) throw new BadRequestException('Server not found');
    const envId = environmentId ?? server.environmentId;
    const env = await this.prisma.environment.findUnique({
      where: { id: envId },
      select: { projectId: true },
    });
    if (!env) throw new BadRequestException('Environment not found');
    if (env.projectId !== server.projectId) {
      throw new BadRequestException(
        "The environment does not belong to the server's project",
      );
    }
    return envId;
  }

  async create(dto: CreateApplicationDto) {
    const environmentId = await this.resolveEnvironment(
      dto.serverId,
      dto.environmentId,
    );
    return this.prisma.application.create({
      data: {
        name: dto.name,
        version: dto.version,
        status: dto.status,
        serverId: dto.serverId,
        environmentId,
      },
      include,
    });
  }

  async findAll(query: QueryApplicationsDto) {
    const where: Prisma.ApplicationWhereInput = {
      ...(query.serverId && { serverId: query.serverId }),
      ...(query.environmentId && { environmentId: query.environmentId }),
      ...(query.status && { status: query.status }),
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' },
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.application.findMany({
        where,
        include,
        orderBy: parseSort(
          query.sort,
          ['name', 'version', 'status', 'createdAt'],
          {
            field: 'name',
            order: 'asc',
          },
        ),
        ...pageArgs(query),
      }),
      this.prisma.application.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async findOne(id: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include,
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async update(id: string, dto: UpdateApplicationDto) {
    const current = await this.findOne(id);
    const serverId = dto.serverId ?? current.serverId;
   
    const environmentId =
      dto.serverId || dto.environmentId
        ? await this.resolveEnvironment(serverId, dto.environmentId)
        : undefined;
    return this.prisma.application.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.version !== undefined && { version: dto.version }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.serverId !== undefined && { serverId: dto.serverId }),
        ...(environmentId && { environmentId }),
      },
      include,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.application.delete({ where: { id } });
  }
}
