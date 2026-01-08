import { Controller, Get, NotFoundException } from '@nestjs/common';
import { AppService } from './app.service';
import { SeederService } from './seeder/seeder.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly seederService: SeederService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/seed')
  async seed() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    await this.seederService.seed();
    return { message: 'Seeding complete!' };
  }
}
