import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';
import { DATE_REGEX } from './date.util';

export class RangeQueryDto {
  @ApiPropertyOptional({ example: '2026-10-12', description: 'Inclusive, YYYY-MM-DD' })
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'from must be in YYYY-MM-DD format' })
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-18', description: 'Inclusive, YYYY-MM-DD' })
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'to must be in YYYY-MM-DD format' })
  to?: string;
}
