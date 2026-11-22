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
import { Roles } from '../common/decorators/roles.decorator.js';
import { WRITE_ROLES } from '../common/constants.js';
import { AlertRulesService } from './alert-rules.service.js';
import {
  CreateAlertRuleDto,
  QueryAlertRulesDto,
  UpdateAlertRuleDto,
} from './dto/alert-rule.dto.js';

@ApiTags('Alert rules')
@ApiBearerAuth()
@Controller('alert-rules')
export class AlertRulesController {
  constructor(private readonly rules: AlertRulesService) {}

  @Get()
  findAll(@Query() query: QueryAlertRulesDto) {
    return this.rules.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rules.findOne(id);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  @ApiOperation({ summary: 'Define an alert rule (Admin, DevOps)' })
  create(@Body() dto: CreateAlertRuleDto) {
    return this.rules.create(dto);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id')
  @ApiOperation({ summary: 'Edit a rule or enable/disable it (Admin, DevOps)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertRuleDto,
  ) {
    return this.rules.update(id, dto);
  }

  @Roles(...WRITE_ROLES)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.rules.remove(id);
  }
}
