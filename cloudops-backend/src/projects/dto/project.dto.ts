import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  EnvironmentName,
  ProjectRole,
  ProjectStatus,
} from '../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class CreateProjectDto {
  @ApiProperty({ example: 'Billing platform' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: ProjectStatus, default: ProjectStatus.PLANNED })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-03-01' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Defaults to the caller' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({
    enum: EnvironmentName,
    isArray: true,
    description: 'Environments to create with the project',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(EnvironmentName, { each: true })
  environments?: EnvironmentName[];
}

export class UpdateProjectDto extends PartialType(
  OmitType(CreateProjectDto, ['environments'] as const),
) {}

export class QueryProjectsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ enum: EnvironmentName })
  @IsOptional()
  @IsEnum(EnvironmentName)
  environment?: EnvironmentName;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  teamId?: string;
}

export class AddMemberDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ enum: ProjectRole, default: ProjectRole.MEMBER })
  @IsOptional()
  @IsEnum(ProjectRole)
  role?: ProjectRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  teamId?: string;
}

export class UpdateMemberDto {
  @ApiPropertyOptional({ enum: ProjectRole })
  @IsOptional()
  @IsEnum(ProjectRole)
  role?: ProjectRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  teamId?: string;
}

export class CreateEnvironmentDto {
  @ApiProperty({ enum: EnvironmentName })
  @IsEnum(EnvironmentName)
  name: EnvironmentName;
}
