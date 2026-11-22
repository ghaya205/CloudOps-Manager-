import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { EnvironmentName } from '../../generated/prisma/enums.js';
import { MetricRange } from '../../metrics/dto/metrics.dto.js';

export class DashboardQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ enum: EnvironmentName })
  @IsOptional()
  @IsEnum(EnvironmentName)
  environment?: EnvironmentName;

  @ApiPropertyOptional({ enum: MetricRange, default: MetricRange.DAY })
  @IsOptional()
  @IsEnum(MetricRange)
  range: MetricRange = MetricRange.DAY;
}
