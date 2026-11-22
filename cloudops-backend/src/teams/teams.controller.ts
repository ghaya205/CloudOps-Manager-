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
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto.js';
import { TeamsService } from './teams.service.js';

@ApiTags('Teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'List teams' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.teams.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.teams.findOne(id);
  }

  @Roles(Role.ADMIN, Role.DEVOPS)
  @Post()
  @ApiOperation({ summary: 'Create a team (Admin, DevOps)' })
  create(@Body() dto: CreateTeamDto) {
    return this.teams.create(dto);
  }

  @Roles(Role.ADMIN, Role.DEVOPS)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTeamDto) {
    return this.teams.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.DEVOPS)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.teams.remove(id);
  }
}
