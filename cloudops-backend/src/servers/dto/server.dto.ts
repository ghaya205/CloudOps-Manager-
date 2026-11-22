import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsIP,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { ServerStatus } from '../../generated/prisma/enums.js';

export class CreateServerDto {
  @ApiProperty({ example: 'web-01' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'AWS' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  provider: string;

  @ApiProperty({ example: 'eu-west-3' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  region: string;

  @ApiProperty({ minimum: 1, description: 'CPU cores' })
  @IsInt()
  @Min(1)
  @Max(1024)
  cpu: number;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(65536)
  ramGb: number;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(1000000)
  storageGb: number;

  @ApiProperty({ example: '10.0.0.12', description: 'IPv4 or IPv6' })
  @IsIP()
  ipAddress: string;

  @ApiPropertyOptional({ enum: ServerStatus, default: ServerStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ServerStatus)
  status?: ServerStatus;

  @ApiProperty()
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Must be an environment of the same project' })
  @IsUUID()
  environmentId: string;
}

export class UpdateServerDto extends PartialType(CreateServerDto) {}

export class QueryServersDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ enum: ServerStatus })
  @IsOptional()
  @IsEnum(ServerStatus)
  status?: ServerStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  environmentId?: string;
}
