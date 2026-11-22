import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { pageArgs, paginated, parseSort } from '../common/utils/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { HandleAlertDto, QueryAlertsDto } from './dto/alert.dto.js';

const include = {
  server: { select: { id: true, name: true } },
  rule: { select: { id: true, metric: true, operator: true, threshold: true } },
  acknowledgedBy: { select: { id: true, name: true } },
  resolvedBy: { select: { id: true, name: true } },
} satisfies Prisma.AlertInclude;

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  /** FR-AL4: incident history with filters and pagination. */
  async findAll(query: QueryAlertsDto) {
    const where: Prisma.AlertWhereInput = {
      ...(query.severity && { severity: query.severity }),
      ...(query.status && { status: query.status }),
      ...(query.serverId && { serverId: query.serverId }),
      ...((query.from || query.to) && {
        openedAt: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      }),
      ...(query.search && {
        message: { contains: query.search, mode: 'insensitive' },
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.alert.findMany({
        where,
        include,
        orderBy: parseSort(query.sort, ['openedAt', 'severity', 'status'], {
          field: 'openedAt',
          order: 'desc',
        }),
        ...pageArgs(query),
      }),
      this.prisma.alert.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async findOne(id: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
      include,
    });
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }

  async acknowledge(id: string, userId: string, dto: HandleAlertDto) {
    const alert = await this.findOne(id);
    if (alert.status !== 'OPEN') {
      throw new ConflictException(
        `Only an open alert can be acknowledged (current status: ${alert.status})`,
      );
    }
    return this.prisma.alert.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedById: userId,
        ...(dto.comment !== undefined && { comment: dto.comment }),
      },
      include,
    });
  }

  async resolve(id: string, userId: string, dto: HandleAlertDto) {
    const alert = await this.findOne(id);
    if (alert.status === 'RESOLVED') {
      throw new ConflictException('This alert is already resolved');
    }
    return this.prisma.alert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedById: userId,
        ...(dto.comment !== undefined && { comment: dto.comment }),
      },
      include,
    });
  }
}
