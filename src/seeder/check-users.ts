import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import * as bcrypt from 'bcryptjs';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    const emails = [
      { email: 'admin@verte.com', password: '123456' },
      { email: 'pro@verte.com', password: '123456' },
      { email: 'free@verte.com', password: '123456' },
    ];

    for (const { email, password } of emails) {
      const user = await userRepo.findOne({ where: { email } });
      if (!user) {
        console.log(`${email}: NOT FOUND`);
        continue;
      }
      const ok = await bcrypt.compare(password, user.password);
      console.log(
        `${email}: FOUND, password match=${ok}, status=${user.status}, profile=${user.profile}`,
      );
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

run();
