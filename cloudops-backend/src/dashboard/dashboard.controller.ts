import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { DashboardQueryDto } from './dto/dashboard.dto.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Counters and indicators (projects, servers, applications, open alerts, CPU/RAM, availability)',
  })
  summary(@Query() query: DashboardQueryDto) {
    return this.dashboard.summary(query);
  }

  @Get('trends')
  @ApiOperation({
    summary: 'Resource usage trend, alerts over time, servers per provider',
  })
  trends(@Query() query: DashboardQueryDto) {
    return this.dashboard.trends(query);
  }
}
