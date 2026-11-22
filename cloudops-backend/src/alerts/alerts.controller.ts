import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { WRITE_ROLES } from '../common/constants.js';
import type { AuthUser } from '../common/interfaces/auth-user.interface.js';
import { AlertsService } from './alerts.service.js';
import { HandleAlertDto, QueryAlertsDto } from './dto/alert.dto.js';

@ApiTags('Alerts')
@ApiBearerAuth()
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Incident history with filters (severity, status, server, date range)',
  })
  findAll(@Query() query: QueryAlertsDto) {
    return this.alerts.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.alerts.findOne(id);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an open alert (Admin, DevOps)' })
  acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HandleAlertDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.alerts.acknowledge(id, user.id, dto);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Resolve an alert (Admin, DevOps)' })
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HandleAlertDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.alerts.resolve(id, user.id, dto);
  }
}
