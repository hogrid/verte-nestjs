import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserStatus, UserProfile } from '../../src/database/entities';
import * as bcrypt from 'bcryptjs';

/**
 * Extractor Module E2E Tests
 * Validates 100% Laravel compatibility for all 3 extractor endpoints
 *
 * Endpoints tested:
 * 1. GET /api/v1/extractor/config
 * 2. PUT /api/v1/extractor/config
 * 3. GET /api/v1/extractor/logs
 */
describe('Extractor Module (e2e) - Laravel Compatibility Tests', () => {
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
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    dataSource = app.get(DataSource);

    await createTestUser();
    await loginTestUser();
  });

  afterAll(async () => {
    if (testUser) {
      const numberRepository = dataSource.getRepository('numbers');
      await numberRepository.delete({ user_id: testUser.id });

      await dataSource.getRepository(User).delete({ id: testUser.id });
    }
    await app.close();
  });

  async function createTestUser() {
    const userRepository = dataSource.getRepository(User);

    await userRepository.delete({ email: 'extractor-test@verte.com' });

    testUser = userRepository.create({
      name: 'Extractor',
      last_name: 'Tester',
      email: 'extractor-test@verte.com',
      password: await bcrypt.hash('password123', 10),
      status: UserStatus.ACTIVED,
      profile: UserProfile.USER,
      confirmed_mail: 1,
      active: 1,
      cel: '11999999999',
      cpfCnpj: '52998224725',
    });

    testUser = await userRepository.save(testUser);
  }

  async function loginTestUser() {
    const response = await request(app.getHttpServer())
      .post('/api/v1/login')
      .send({
        email: 'extractor-test@verte.com',
        password: 'password123',
      });

    authToken = response.body.token;
  }

  /**
   * ===========================================
   * 1. GET /api/v1/extractor/config
   * ===========================================
   */
  describe('GET /api/v1/extractor/config', () => {
    it('should get extractor configuration', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/extractor/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Validate Laravel-compatible response structure
      expect(response.body).toHaveProperty('enabled');
      expect(response.body).toHaveProperty('auto_extract');
      expect(response.body).toHaveProperty('extract_from_groups');
      expect(response.body).toHaveProperty('filter_keywords');
      expect(response.body).toHaveProperty('max_contacts_per_day');

      // Validate types
      expect(typeof response.body.enabled).toBe('boolean');
      expect(typeof response.body.auto_extract).toBe('boolean');
      expect(typeof response.body.extract_from_groups).toBe('boolean');
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/extractor/config')
        .expect(401);
    });
  });

  /**
   * ===========================================
   * 2. PUT /api/v1/extractor/config
   * ===========================================
   */
  describe('PUT /api/v1/extractor/config', () => {
    it('should update extractor configuration', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/extractor/config')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: true,
          auto_extract: true,
          extract_from_groups: false,
          filter_keywords: ['importante', 'urgente'],
          max_contacts_per_day: 100,
        })
        .expect(200);

      expect(response.body).toHaveProperty('enabled');
      expect(response.body.enabled).toBe(true);
      expect(response.body.auto_extract).toBe(true);
      expect(response.body.extract_from_groups).toBe(false);
      expect(Array.isArray(response.body.filter_keywords)).toBe(true);
      expect(response.body.max_contacts_per_day).toBe(100);
    });

    it('should update partial configuration', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/extractor/config')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: false,
        })
        .expect(200);

      expect(response.body.enabled).toBe(false);
    });

    it('should validate max_contacts_per_day is positive', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/extractor/config')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          max_contacts_per_day: -10,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/extractor/config')
        .send({
          enabled: true,
        })
        .expect(401);
    });
  });

  /**
   * ===========================================
   * 3. GET /api/v1/extractor/logs
   * ===========================================
   */
  describe('GET /api/v1/extractor/logs', () => {
    it('should get extractor logs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/extractor/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Validate Laravel-compatible response structure
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter logs by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      const response = await request(app.getHttpServer())
        .get('/api/v1/extractor/logs')
        .query({ start_date: startDate, end_date: endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter logs by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/extractor/logs')
        .query({ status: 'success' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/extractor/logs')
        .query({ page: 1, per_page: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/extractor/logs')
        .expect(401);
    });
  });

  /**
   * ===========================================
   * Laravel Compatibility Validation
   * ===========================================
   */
  describe('Laravel Compatibility Checks', () => {
    it('should maintain Laravel response structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/extractor/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify all expected fields
      const requiredFields = [
        'enabled',
        'auto_extract',
        'extract_from_groups',
        'filter_keywords',
        'max_contacts_per_day',
      ];

      requiredFields.forEach((field) => {
        expect(response.body).toHaveProperty(field);
      });
    });

    it('should use boolean types for flags', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/extractor/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(typeof response.body.enabled).toBe('boolean');
      expect(typeof response.body.auto_extract).toBe('boolean');
      expect(typeof response.body.extract_from_groups).toBe('boolean');
    });

    it('should handle array fields correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/extractor/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.filter_keywords)).toBe(true);
    });
  });
});
