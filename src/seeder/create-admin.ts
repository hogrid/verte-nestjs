import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  User,
  UserProfile,
  UserStatus,
} from '../database/entities/user.entity';
import { Plan } from '../database/entities/plan.entity';
import * as bcrypt from 'bcryptjs';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    const planRepo = app.get<Repository<Plan>>(getRepositoryToken(Plan));

    let proPlan = await planRepo.findOne({
      where: { name: 'Plano Profissional' },
    });
    if (!proPlan) {
      proPlan = await planRepo.save(
        planRepo.create({
          name: 'Plano Profissional',
          value: 99.9,
          unlimited: 1,
          medias: 1,
          reports: 1,
          schedule: 1,
          popular: 1,
        }),
      );
      console.log('Criado plano: Plano Profissional');
    }

    const email = 'admin@verte.com';
    const password = '123456';
    const hashed = await bcrypt.hash(password, 10);

    let user = await userRepo.findOne({ where: { email } });
    if (user) {
      user.password = hashed;
      user.profile = UserProfile.ADMINISTRATOR;
      user.status = UserStatus.ACTIVED;
      user.plan_id = proPlan.id;
      await userRepo.save(user);
      console.log('Atualizado usuário admin@verte.com com senha 123456');
    } else {
      user = userRepo.create({
        name: 'Admin',
        last_name: 'Verte',
        email,
        password: hashed,
        profile: UserProfile.ADMINISTRATOR,
        status: UserStatus.ACTIVED,
        plan_id: proPlan.id,
        confirmed_mail: 1,
        active: 1,
      });
      await userRepo.save(user);
      console.log('Criado usuário admin@verte.com com senha 123456');
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

run();
