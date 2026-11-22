import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { WRITE_ROLES } from '../common/constants.js';
import { IngestMetricDto, QueryMetricsDto } from './dto/metrics.dto.js';
import { MetricsService } from './metrics.service.js';

@ApiTags('Monitoring')
@ApiBearerAuth()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Roles(...WRITE_ROLES)
  @Post()
  @ApiOperation({ summary: 'Ingest one CPU/RAM sample (Admin, DevOps)' })
  ingest(@Body() dto: IngestMetricDto) {
    return this.metrics.ingest(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Metric history of a server over the last hour, day or week',
  })
  history(@Query() query: QueryMetricsDto) {
    return this.metrics.history(query.serverId, query.range, query.limit);
  }
}
