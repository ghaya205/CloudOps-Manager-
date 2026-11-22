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
import { PrismaService } from '../prisma/prisma.service.js';
import { publicUserSelect } from '../users/user.select.js';
import type {
  AddMemberDto,
  CreateEnvironmentDto,
  CreateProjectDto,
  QueryProjectsDto,
  UpdateMemberDto,
  UpdateProjectDto,
} from './dto/project.dto.js';

const ownerSelect = { id: true, name: true, email: true } as const;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private checkDates(start?: string | null, end?: string | null) {
    if (start && end && new Date(end) < new Date(start)) {
      throw new BadRequestException('endDate must not be before startDate');
    }
  }

  async create(dto: CreateProjectDto, actor: AuthUser) {
    this.checkDates(dto.startDate, dto.endDate);
    const ownerId = dto.ownerId ?? actor.id;
    if (
      !(await this.prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true },
      }))
    ) {
      throw new BadRequestException('Owner not found');
    }
    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        ownerId,
        environments: {
          create: (dto.environments ?? []).map((name) => ({ name })),
        },
        members: { create: { userId: ownerId, role: 'OWNER' } },
      },
      include: { owner: { select: ownerSelect }, environments: true },
    });
  }

  async findAll(query: QueryProjectsDto) {
    const where: Prisma.ProjectWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.environment && {
        environments: { some: { name: query.environment } },
      }),
      ...(query.teamId && { members: { some: { teamId: query.teamId } } }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        include: {
          owner: { select: ownerSelect },
          environments: { select: { id: true, name: true } },
          _count: { select: { servers: true, members: true } },
        },
        orderBy: parseSort(
          query.sort,
          ['name', 'status', 'startDate', 'createdAt'],
          {
            field: 'createdAt',
            order: 'desc',
          },
        ),
        ...pageArgs(query),
      }),
      this.prisma.project.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: ownerSelect },
        environments: true,
        members: {
          include: { user: { select: publicUserSelect }, team: true },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { servers: true, members: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    const current = await this.findOne(id);
    this.checkDates(
      dto.startDate ?? current.startDate?.toISOString(),
      dto.endDate ?? current.endDate?.toISOString(),
    );
    if (
      dto.ownerId &&
      !(await this.prisma.user.findUnique({
        where: { id: dto.ownerId },
        select: { id: true },
      }))
    ) {
      throw new BadRequestException('Owner not found');
    }
    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.startDate !== undefined && {
          startDate: new Date(dto.startDate),
        }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...(dto.ownerId !== undefined && { ownerId: dto.ownerId }),
      },
      include: { owner: { select: ownerSelect }, environments: true },
    });
  }

  /** Admin only when the project still has servers (permission matrix, section 4; NFR-9). */
  async remove(id: string, actor: AuthUser) {
    await this.findOne(id);
    const servers = await this.prisma.server.count({
      where: { projectId: id },
    });
    if (servers > 0 && actor.role !== Role.ADMIN) {
      throw new ForbiddenException(
        `This project still has ${servers} server(s); only an Admin can delete it with its dependents`,
      );
    }
    await this.prisma.project.delete({ where: { id } });
  }


  async listMembers(projectId: string) {
    await this.findOne(projectId);
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: publicUserSelect }, team: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(projectId: string, dto: AddMemberDto) {
    await this.findOne(projectId);
    if (
      !(await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true },
      }))
    ) {
      throw new BadRequestException('User not found');
    }
    if (
      dto.teamId &&
      !(await this.prisma.team.findUnique({
        where: { id: dto.teamId },
        select: { id: true },
      }))
    ) {
      throw new BadRequestException('Team not found');
    }
    
    return this.prisma.projectMember.create({
      data: {
        projectId,
        userId: dto.userId,
        role: dto.role,
        teamId: dto.teamId,
      },
      include: { user: { select: publicUserSelect }, team: true },
    });
  }

  private async findMember(projectId: string, memberId: string) {
    const member = await this.prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
    });
    if (!member) throw new NotFoundException('Project member not found');
    return member;
  }

  async updateMember(
    projectId: string,
    memberId: string,
    dto: UpdateMemberDto,
  ) {
    await this.findMember(projectId, memberId);
    if (
      dto.teamId &&
      !(await this.prisma.team.findUnique({
        where: { id: dto.teamId },
        select: { id: true },
      }))
    ) {
      throw new BadRequestException('Team not found');
    }
    return this.prisma.projectMember.update({
      where: { id: memberId },
      data: { role: dto.role, teamId: dto.teamId },
      include: { user: { select: publicUserSelect }, team: true },
    });
  }

  async removeMember(projectId: string, memberId: string) {
    await this.findMember(projectId, memberId);
    await this.prisma.projectMember.delete({ where: { id: memberId } });
  }

  // ---- environments (FR-P3)

  async listEnvironments(projectId: string) {
    await this.findOne(projectId);
    return this.prisma.environment.findMany({
      where: { projectId },
      include: { _count: { select: { servers: true, applications: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addEnvironment(projectId: string, dto: CreateEnvironmentDto) {
    await this.findOne(projectId);
    return this.prisma.environment.create({
      data: { projectId, name: dto.name },
    });
  }

  async removeEnvironment(
    projectId: string,
    environmentId: string,
    actor: AuthUser,
  ) {
    const env = await this.prisma.environment.findFirst({
      where: { id: environmentId, projectId },
      include: { _count: { select: { servers: true, applications: true } } },
    });
    if (!env) throw new NotFoundException('Environment not found');
    const dependents = env._count.servers + env._count.applications;
    if (dependents > 0 && actor.role !== Role.ADMIN) {
      throw new ForbiddenException(
        `This environment still has ${dependents} dependent server(s)/application(s); only an Admin can delete it`,
      );
    }
    await this.prisma.environment.delete({ where: { id: environmentId } });
  }
}
