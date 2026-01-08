import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeederService } from './seeder.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const seeder = app.get(SeederService);

    // Check for --fresh flag
    const isFresh = process.argv.includes('--fresh');

    if (isFresh) {
      console.log('🔄 Running FRESH seed (clearing all data first)...');
      await seeder.fresh();
    } else {
      await seeder.seed();
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

run();
