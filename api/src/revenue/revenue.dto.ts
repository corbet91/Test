import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';
import { DATE_REGEX } from '../common/date.util';

export class CompareQueryDto {
  @ApiPropertyOptional({ example: '2026-10-15', description: '"Today": the base day (YYYY-MM-DD). Default: today in APP_TIMEZONE' })
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;

  @ApiPropertyOptional({
    example: '2026-10-16',
    description: 'The day to compare with. Default: the day after `date`',
  })
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'compareTo must be in YYYY-MM-DD format' })
  compareTo?: string;
}
