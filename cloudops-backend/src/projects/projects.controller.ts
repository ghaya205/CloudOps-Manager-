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
import {
  AddMemberDto,
  CreateEnvironmentDto,
  CreateProjectDto,
  QueryProjectsDto,
  UpdateMemberDto,
  UpdateProjectDto,
} from './dto/project.dto.js';
import { ProjectsService } from './projects.service.js';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @ApiOperation({
    summary: 'List projects with search, filters and pagination',
  })
  findAll(@Query() query: QueryProjectsDto) {
    return this.projects.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projects.findOne(id);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  @ApiOperation({ summary: 'Create a project (Admin, DevOps)' })
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projects.create(dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(id, dto);
  }

  @Roles(...WRITE_ROLES)
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a project; with servers attached only an Admin may',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projects.remove(id, user);
  }

  // ---- members

  @Get(':id/members')
  listMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.projects.listMembers(id);
  }

  @Roles(...WRITE_ROLES)
  @Post(':id/members')
  @ApiOperation({ summary: 'Assign a user to the project with a project role' })
  addMember(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddMemberDto) {
    return this.projects.addMember(id, dto);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id/members/:memberId')
  updateMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.projects.updateMember(id, memberId, dto);
  }

  @Roles(...WRITE_ROLES)
  @Delete(':id/members/:memberId')
  @HttpCode(204)
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.projects.removeMember(id, memberId);
  }

  // ---- environments

  @Get(':id/environments')
  listEnvironments(@Param('id', ParseUUIDPipe) id: string) {
    return this.projects.listEnvironments(id);
  }

  @Roles(...WRITE_ROLES)
  @Post(':id/environments')
  addEnvironment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEnvironmentDto,
  ) {
    return this.projects.addEnvironment(id, dto);
  }

  @Roles(...WRITE_ROLES)
  @Delete(':id/environments/:environmentId')
  @HttpCode(204)
  removeEnvironment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('environmentId', ParseUUIDPipe) environmentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projects.removeEnvironment(id, environmentId, user);
  }
}
