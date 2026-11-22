import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { ApplicationStatus } from '../../generated/prisma/enums.js';

export class CreateApplicationDto {
  @ApiProperty({ example: 'billing-api' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '1.4.2' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  version: string;

  @ApiPropertyOptional({
    enum: ApplicationStatus,
    default: ApplicationStatus.RUNNING,
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiProperty({ description: 'The server hosting the application (FR-AP2)' })
  @IsUUID()
  serverId: string;

  @ApiPropertyOptional({
    description: 'Defaults to the environment of the server',
  })
  @IsOptional()
  @IsUUID()
  environmentId?: string;
}

export class UpdateApplicationDto extends PartialType(CreateApplicationDto) {}

export class QueryApplicationsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serverId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  environmentId?: string;

  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;
}
