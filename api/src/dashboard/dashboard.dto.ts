import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsOptional, Matches } from 'class-validator';
import { DATE_REGEX } from '../common/date.util';
import { SERIES, SeriesKey } from './dashboard.types';

export class DashboardQueryDto {
  @ApiPropertyOptional({
    example: '2026-10-12',
    description: "Any date inside the wanted week (YYYY-MM-DD), snapped to that week's Monday. Default: current week.",
  })
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'weekStart must be in YYYY-MM-DD format' })
  weekStart?: string;

  @ApiPropertyOptional({ default: false, description: '"Compare to Previous" button: true adds the previous-week values and % changes' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  compare?: boolean;

  @ApiPropertyOptional({
    example: 'pos,eatclub,labour',
    description:
      'The 3 checkboxes (POS Revenue / Eatclub Revenue / Labour Costs): comma-separated visible series out of pos, eatclub, labour. ' +
      'Default: all. Empty string: none. Hidden series come back as null and are left out of Total Revenue.',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : value))
  @IsArray()
  @IsIn(SERIES, { each: true, message: `series must be a comma-separated list of: ${SERIES.join(', ')}` })
  series?: SeriesKey[];
}
