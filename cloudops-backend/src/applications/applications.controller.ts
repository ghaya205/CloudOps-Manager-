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
import { ApplicationsService } from './applications.service.js';
import {
  CreateApplicationDto,
  QueryApplicationsDto,
  UpdateApplicationDto,
} from './dto/application.dto.js';

@ApiTags('Applications')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List applications filtered by server, environment, status',
  })
  findAll(@Query() query: QueryApplicationsDto) {
    return this.applications.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.applications.findOne(id);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  @ApiOperation({
    summary: 'Attach an application to a server (Admin, DevOps)',
  })
  create(@Body() dto: CreateApplicationDto) {
    return this.applications.create(dto);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applications.update(id, dto);
  }

  @Roles(...WRITE_ROLES)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.applications.remove(id);
  }
}
