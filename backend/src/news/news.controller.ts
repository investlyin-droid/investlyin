import { Controller, Get, Query } from '@nestjs/common';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private newsService: NewsService) {}

  @Get()
  getNews(@Query('category') category?: string) {
    return this.newsService.getNews(category);
  }

  @Get('calendar')
  getCalendar() {
    return this.newsService.getCalendar();
  }
}
