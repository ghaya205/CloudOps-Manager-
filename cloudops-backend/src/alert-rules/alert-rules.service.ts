import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { pageArgs, paginated, parseSort } from '../common/utils/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateAlertRuleDto,
  QueryAlertRulesDto,
  UpdateAlertRuleDto,
} from './dto/alert-rule.dto.js';

const include = {
  server: { select: { id: true, name: true } },
} satisfies Prisma.AlertRuleInclude;

@Injectable()
export class AlertRulesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertServer(serverId?: string | null) {
    if (
      serverId &&
      !(await this.prisma.server.findUnique({
        where: { id: serverId },
        select: { id: true },
      }))
    ) {
      throw new BadRequestException('Server not found');
    }
  }

  async create(dto: CreateAlertRuleDto) {
    await this.assertServer(dto.serverId);
    return this.prisma.alertRule.create({ data: dto, include });
  }

  async findAll(query: QueryAlertRulesDto) {
    const where: Prisma.AlertRuleWhereInput = {
      ...(query.metric && { metric: query.metric }),
      ...(query.severity && { severity: query.severity }),
      ...(query.serverId && { serverId: query.serverId }),
      ...(query.enabled !== undefined && { enabled: query.enabled }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.alertRule.findMany({
        where,
        include,
        orderBy: parseSort(
          query.sort,
          ['metric', 'severity', 'threshold', 'createdAt'],
          {
            field: 'createdAt',
            order: 'desc',
          },
        ),
        ...pageArgs(query),
      }),
      this.prisma.alertRule.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async findOne(id: string) {
    const rule = await this.prisma.alertRule.findUnique({
      where: { id },
      include,
    });
    if (!rule) throw new NotFoundException('Alert rule not found');
    return rule;
  }

  async update(id: string, dto: UpdateAlertRuleDto) {
    await this.findOne(id);
    await this.assertServer(dto.serverId);
    return this.prisma.alertRule.update({ where: { id }, data: dto, include });
  }

  /** Alerts raised by the rule stay as history (their ruleId becomes null). */
  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.alertRule.delete({ where: { id } });
  }
}
