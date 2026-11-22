import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import {
  AlertMetric,
  AlertOperator,
  Severity,
} from '../../generated/prisma/enums.js';

export class CreateAlertRuleDto {
  @ApiProperty({ enum: AlertMetric })
  @IsEnum(AlertMetric)
  metric: AlertMetric;

  @ApiProperty({
    enum: AlertOperator,
    description: 'GT >, GTE >=, LT <, LTE <=',
  })
  @IsEnum(AlertOperator)
  operator: AlertOperator;

  @ApiProperty({ minimum: 0, maximum: 100, description: 'Percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  threshold: number;

  @ApiProperty({ enum: Severity })
  @IsEnum(Severity)
  severity: Severity;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Target server; omit for a global rule' })
  @IsOptional()
  @IsUUID()
  serverId?: string;
}

export class UpdateAlertRuleDto extends PartialType(CreateAlertRuleDto) {}

export class QueryAlertRulesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AlertMetric })
  @IsOptional()
  @IsEnum(AlertMetric)
  metric?: AlertMetric;

  @ApiPropertyOptional({ enum: Severity })
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serverId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  enabled?: boolean;
}
