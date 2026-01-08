import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { BadRequestToValidationFilter } from '../../src/common/filters/bad-request-to-validation.filter';
import {
  User,
  UserStatus,
  UserProfile,
} from '../../src/database/entities/user.entity';
import { Number as WhatsAppNumber } from '../../src/database/entities/number.entity';
import * as bcrypt from 'bcryptjs';

describe('WhatsApp Status/Profile/SSE (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testUser: User;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    useContainer(app.select(AppModule), { fallbackOnErrors: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new BadRequestToValidationFilter());
    await app.init();

    dataSource = app.get(DataSource);
    await createAdminUserWithNumber();
    await authenticateAdmin();
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function createAdminUserWithNumber() {
    const userRepository = dataSource.getRepository(User);
    const numberRepository = dataSource.getRepository(WhatsAppNumber);

    const existing = await userRepository.findOne({
      where: { email: 'admin@verte.com' },
    });
    if (existing) {
      await numberRepository.delete({ user_id: existing.id });
      await userRepository.delete({ id: existing.id });
    }

    testUser = userRepository.create({
      name: 'Admin',
      last_name: 'Verte',
      email: 'admin@verte.com',
      password: await bcrypt.hash('admin123', 10),
      status: UserStatus.ACTIVED,
      profile: UserProfile.ADMINISTRATOR,
      confirmed_mail: 1,
      active: 1,
      cel: '11999999999',
      cpfCnpj: '52998224725',
    });
    testUser = await userRepository.save(testUser);

    const instanceName = `user_${testUser.id}_whatsapp`;
    const numberRow = numberRepository.create({
      user_id: testUser.id,
      name: 'WhatsApp Principal',
      instance: instanceName,
      status: 1,
      status_connection: 0,
    });
    await numberRepository.save(numberRow);
  }

  async function authenticateAdmin() {
    const res = await request(app.getHttpServer())
      .post('/api/v1/login')
      .send({ email: 'admin@verte.com', password: 'admin123' })
      .expect(200);
    authToken = res.body.token;
  }

  async function cleanup() {
    const numberRepository = dataSource.getRepository(WhatsAppNumber);
    const userRepository = dataSource.getRepository(User);
    await numberRepository.delete({ user_id: testUser.id });
    await userRepository.delete({ id: testUser.id });
  }

  it('GET /api/v1/whatsapp/status should return connection status', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/whatsapp/status')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(res.body).toHaveProperty('connected');
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('instance_name');
  });

  it('GET /api/v1/whatsapp/me should return profile info with graceful fallback', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/whatsapp/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(res.body).toHaveProperty('connected');
    expect(res.body).toHaveProperty('instance_name');
    expect(res.body).toHaveProperty('phone_number');
    expect(res.body).toHaveProperty('profile_name');
    expect(res.body).toHaveProperty('profile_pic_url');
  });

  // SSE endpoints are validated via integration; streaming tests are omitted to avoid hanging the runner

  it('POST /api/v1/whatsapp/disconnect should return success', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/whatsapp/disconnect')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(res.body).toHaveProperty('success');
  });
});
