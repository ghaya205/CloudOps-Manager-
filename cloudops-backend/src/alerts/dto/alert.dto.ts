import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { AlertStatus, Severity } from '../../generated/prisma/enums.js';

export class QueryAlertsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Severity })
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  @ApiPropertyOptional({ enum: AlertStatus })
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serverId?: string;

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-30' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class HandleAlertDto {
  @ApiPropertyOptional({ description: 'Comment recorded with the action' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
