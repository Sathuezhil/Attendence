import { Controller, Get, Query } from '@nestjs/common';
import { QuerySearchDto } from './dto/query-search.dto';
import { SearchService } from './search.service';
import { SearchResponse } from './search.types';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query() query: QuerySearchDto): Promise<SearchResponse> {
    return this.searchService.search(query);
  }
}
