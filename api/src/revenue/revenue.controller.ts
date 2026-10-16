import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RangeQueryDto } from '../common/range-query.dto';
import { CompareQueryDto } from './revenue.dto';
import { RevenueService } from './revenue.service';

@ApiTags('Revenue (one row per day)')
@Controller('revenue')
export class RevenueController {
  constructor(private readonly service: RevenueService) {}

  @Get()
  @ApiOperation({ summary: 'List the revenue rows, optionally within from..to' })
  list(@Query() q: RangeQueryDto) {
    return this.service.list(q.from, q.to);
  }

  @Get('compare')
  @ApiOperation({
    summary: 'Compare a day with the next day (default: today vs tomorrow)',
    description:
      'Returns both days and `difference` = target - base for every metric (value and changePct). ' +
      'Use `date` to pick the base day and `compareTo` to compare with a day other than the next one.',
  })
  compare(@Query() q: CompareQueryDto) {
    return this.service.compare(q.date, q.compareTo);
  }
}
