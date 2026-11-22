import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { IngestMetricDto, MetricRange } from './dto/metrics.dto.js';

const RANGE_MS: Record<MetricRange, number> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
};

export function rangeStart(range: MetricRange, now = new Date()): Date {
  return new Date(now.getTime() - RANGE_MS[range]);
}

@Injectable()
export class MetricsService {
  
  readonly intervalSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.intervalSeconds = Number(config.get('METRICS_INTERVAL_SECONDS') ?? 60);
  }

  private async assertServer(serverId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: { id: true, createdAt: true },
    });
    if (!server) throw new NotFoundException('Server not found');
    return server;
  }

  /** FR-M1: stores one CPU/RAM sample. The scheduler (phase 6) calls this too. */
  async ingest(dto: IngestMetricDto) {
    await this.assertServer(dto.serverId);
    return this.prisma.metric.create({
      data: {
        serverId: dto.serverId,
        cpuPercent: dto.cpuPercent,
        ramPercent: dto.ramPercent,
        timestamp: dto.timestamp ? new Date(dto.timestamp) : undefined,
      },
    });
  }

  /** Oldest to newest, so charts can plot the array as is. Never unbounded (NFR-6). */
  async history(serverId: string, range: MetricRange, limit: number) {
    await this.assertServer(serverId);
    const rows = await this.prisma.metric.findMany({
      where: { serverId, timestamp: { gte: rangeStart(range) } },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        serverId: true,
        cpuPercent: true,
        ramPercent: true,
        timestamp: true,
      },
    });
    return rows.reverse();
  }

  latest(serverId: string) {
    return this.prisma.metric.findFirst({
      where: { serverId },
      orderBy: { timestamp: 'desc' },
      select: { id: true, cpuPercent: true, ramPercent: true, timestamp: true },
    });
  }

  /**
   * FR-M4: uptime % = samples received / samples expected over the period. The period starts
   * no earlier than the server's creation, so a new server is not penalised for the past.
   */
  async availability(serverId: string, range: MetricRange) {
    const server = await this.assertServer(serverId);
    const now = new Date();
    const from = new Date(
      Math.max(rangeStart(range, now).getTime(), server.createdAt.getTime()),
    );
    const received = await this.prisma.metric.count({
      where: { serverId, timestamp: { gte: from, lte: now } },
    });
    const expected = Math.max(
      1,
      Math.floor(
        (now.getTime() - from.getTime()) / (this.intervalSeconds * 1000),
      ),
    );
    const percent = Math.min(100, (received / expected) * 100);
    return {
      serverId,
      range,
      from,
      to: now,
      intervalSeconds: this.intervalSeconds,
      expectedSamples: expected,
      receivedSamples: received,
      availabilityPercent: Math.round(percent * 100) / 100,
    };
  }
}
