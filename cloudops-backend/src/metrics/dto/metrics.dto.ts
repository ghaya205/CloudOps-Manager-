import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export const MetricRange = {
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
} as const;
export type MetricRange = (typeof MetricRange)[keyof typeof MetricRange];

export class IngestMetricDto {
  @ApiProperty()
  @IsUUID()
  serverId: string;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  cpuPercent: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  ramPercent: number;

  @ApiPropertyOptional({ description: 'Defaults to now' })
  @IsOptional()
  @IsISO8601()
  timestamp?: string;
}

/** FR-M3: history over the last hour, day or week. */
export class RangeQueryDto {
  @ApiPropertyOptional({ enum: MetricRange, default: MetricRange.HOUR })
  @IsOptional()
  @IsEnum(MetricRange)
  range: MetricRange = MetricRange.HOUR;

  @ApiPropertyOptional({
    default: 1000,
    minimum: 1,
    maximum: 10000,
    description: 'Maximum points returned (most recent first kept)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  limit: number = 1000;
}

export class QueryMetricsDto extends RangeQueryDto {
  @ApiProperty()
  @IsUUID()
  serverId: string;
}
