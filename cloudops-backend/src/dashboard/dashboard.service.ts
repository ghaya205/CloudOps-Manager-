import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { MetricsService, rangeStart } from '../metrics/metrics.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { DashboardQueryDto } from './dto/dashboard.dto.js';

const BUCKET_UNIT = { hour: 'minute', day: 'hour', week: 'day' } as const;
const FRESH_MS = 10 * 60 * 1000;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
  ) {}

  private serverWhere(q: DashboardQueryDto): Prisma.ServerWhereInput {
    return {
      ...(q.projectId && { projectId: q.projectId }),
      ...(q.environment && { environment: { name: q.environment } }),
    };
  }

 
  async summary(q: DashboardQueryDto) {
    const serverWhere = this.serverWhere(q);
    const servers = await this.prisma.server.findMany({
      where: serverWhere,
      select: { id: true, status: true, createdAt: true },
    });
    const serverIds = servers.map((s) => s.id);

    const [projects, applications, openAlerts, latest, received] =
      await Promise.all([
        this.prisma.project.count({
          where: {
            ...(q.projectId && { id: q.projectId }),
            ...(q.environment && {
              environments: { some: { name: q.environment } },
            }),
          },
        }),
        this.prisma.application.count({ where: { server: serverWhere } }),
        this.prisma.alert.groupBy({
          by: ['severity'],
          where: { status: { not: 'RESOLVED' }, server: serverWhere },
          _count: { _all: true },
        }),
        serverIds.length
          ? this.prisma.$queryRaw<
              Array<{ cpu: number | null; ram: number | null }>
            >(Prisma.sql`
            SELECT AVG(m."cpuPercent") AS cpu, AVG(m."ramPercent") AS ram
            FROM (
              SELECT DISTINCT ON ("serverId") "cpuPercent", "ramPercent"
              FROM "Metric"
              WHERE "serverId" = ANY(${serverIds}::text[])
                AND "timestamp" >= ${new Date(Date.now() - FRESH_MS)}
              ORDER BY "serverId", "timestamp" DESC
            ) m`)
          : Promise.resolve([{ cpu: null, ram: null }]),
        serverIds.length
          ? this.prisma.metric.groupBy({
              by: ['serverId'],
              where: {
                serverId: { in: serverIds },
                timestamp: { gte: rangeStart('hour') },
              },
              _count: { _all: true },
            })
          : Promise.resolve([]),
      ]);

    const byStatus = { ACTIVE: 0, INACTIVE: 0, MAINTENANCE: 0, UNAVAILABLE: 0 };
    for (const s of servers) byStatus[s.status]++;

    const alertsBySeverity = { INFO: 0, WARNING: 0, CRITICAL: 0 };
    for (const g of openAlerts) alertsBySeverity[g.severity] = g._count._all;

    // Overall availability over the last hour: samples received / samples expected, all servers.
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const counts = new Map(received.map((r) => [r.serverId, r._count._all]));
    let got = 0;
    let expected = 0;
    for (const s of servers) {
      const from = Math.max(hourAgo, s.createdAt.getTime());
      expected += Math.max(
        1,
        Math.floor((now - from) / (this.metrics.intervalSeconds * 1000)),
      );
      got += Math.min(counts.get(s.id) ?? 0, expected);
    }

    const round = (n: number | null | undefined) =>
      n == null ? null : Math.round(Number(n) * 100) / 100;
    return {
      counters: {
        projects,
        servers: { total: servers.length, byStatus },
        applications,
        openAlerts: {
          total: Object.values(alertsBySeverity).reduce((a, b) => a + b, 0),
          bySeverity: alertsBySeverity,
        },
      },
      indicators: {
        averageCpuPercent: round(latest[0]?.cpu),
        averageRamPercent: round(latest[0]?.ram),
        overallAvailabilityPercent:
          expected > 0 ? round(Math.min(100, (got / expected) * 100)) : null,
      },
    };
  }

  /** FR-D3: usage trend, alerts over time and servers per provider. */
  async trends(q: DashboardQueryDto) {
    const serverWhere = this.serverWhere(q);
    const unit = BUCKET_UNIT[q.range];
    const since = rangeStart(q.range);
    const serverIds = (
      await this.prisma.server.findMany({
        where: serverWhere,
        select: { id: true },
      })
    ).map((s) => s.id);

    const [usage, alerts, providers] = await Promise.all([
      serverIds.length
        ? this.prisma.$queryRaw<
            Array<{ bucket: Date; cpu: number; ram: number }>
          >(Prisma.sql`
            SELECT date_trunc(${unit}, "timestamp") AS bucket,
                   AVG("cpuPercent") AS cpu, AVG("ramPercent") AS ram
            FROM "Metric"
            WHERE "serverId" = ANY(${serverIds}::text[]) AND "timestamp" >= ${since}
            GROUP BY bucket ORDER BY bucket`)
        : Promise.resolve([]),
      this.prisma.$queryRaw<
        Array<{ bucket: Date; severity: string; count: bigint }>
      >(Prisma.sql`
        SELECT date_trunc(${unit}, a."openedAt") AS bucket, a."severity"::text AS severity, COUNT(*) AS count
        FROM "Alert" a
        WHERE a."openedAt" >= ${since} AND a."serverId" = ANY(${serverIds}::text[])
        GROUP BY bucket, a."severity" ORDER BY bucket`),
      this.prisma.server.groupBy({
        by: ['provider'],
        where: serverWhere,
        _count: { _all: true },
      }),
    ]);

    const round = (n: number) => Math.round(Number(n) * 100) / 100;
    return {
      range: q.range,
      usageTrend: usage.map((u) => ({
        time: u.bucket,
        cpuPercent: round(u.cpu),
        ramPercent: round(u.ram),
      })),
      alertsOverTime: alerts.map((a) => ({
        time: a.bucket,
        severity: a.severity,
        count: Number(a.count),
      })),
      serversPerProvider: providers
        .map((p) => ({ provider: p.provider, count: p._count._all }))
        .sort((a, b) => b.count - a.count),
    };
  }
}
