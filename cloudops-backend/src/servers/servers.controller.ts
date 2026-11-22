import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { WRITE_ROLES } from '../common/constants.js';
import type { AuthUser } from '../common/interfaces/auth-user.interface.js';
import { RangeQueryDto } from '../metrics/dto/metrics.dto.js';
import { MetricsService } from '../metrics/metrics.service.js';
import {
  CreateServerDto,
  QueryServersDto,
  UpdateServerDto,
} from './dto/server.dto.js';
import { ServersService } from './servers.service.js';

@ApiTags('Servers')
@ApiBearerAuth()
@Controller('servers')
export class ServersController {
  constructor(
    private readonly servers: ServersService,
    private readonly metrics: MetricsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List servers with search, filters and pagination' })
  findAll(@Query() query: QueryServersDto) {
    return this.servers.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Server detail: specs, applications, latest metric, open alerts',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.servers.findOne(id);
  }

  @Get(':id/metrics')
  @ApiOperation({ summary: 'CPU/RAM history of a server' })
  history(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RangeQueryDto,
  ) {
    return this.metrics.history(id, query.range, query.limit);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Uptime percentage computed from received samples' })
  availability(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RangeQueryDto,
  ) {
    return this.metrics.availability(id, query.range);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  @ApiOperation({ summary: 'Register a server (Admin, DevOps)' })
  create(@Body() dto: CreateServerDto) {
    return this.servers.create(dto);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateServerDto) {
    return this.servers.update(id, dto);
  }

  @Roles(...WRITE_ROLES)
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a server; with dependents only an Admin may',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.servers.remove(id, user);
  }
}
