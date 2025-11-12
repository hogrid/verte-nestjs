import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserStatus, UserProfile } from '../../src/database/entities';
import * as bcrypt from 'bcryptjs';

/**
 * Utilities Module E2E Tests (Smoke Tests)
 * Validates critical utility endpoints for Laravel compatibility
 *
 * Endpoints tested (selection of 19 total):
 * 1. GET /api/v1/health - Health check
 * 2. GET /api/v1/cors-test - CORS test
 * 3. GET /api/v1/recovery/campaigns - Recovery endpoints
 * 4. POST /api/v1/debug/user-data - Debug endpoints
 * 5. GET /api/v1/sync/contacts - Sync endpoints
 * 6. GET /api/v1/user-configuration - User config
 */
describe('Utilities Module (e2e) - Laravel Compatibility Tests', () => {
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
      // Delete configurations first (foreign key constraint)
      const configRepository = dataSource.getRepository('configurations');
      await configRepository.delete({ user_id: testUser.id });

      const numberRepository = dataSource.getRepository('numbers');
      await numberRepository.delete({ user_id: testUser.id });

      await dataSource.getRepository(User).delete({ id: testUser.id });
    }
    await app.close();
  });

  async function createTestUser() {
    const userRepository = dataSource.getRepository(User);

    await userRepository.delete({ email: 'utilities-test@verte.com' });

    testUser = userRepository.create({
      name: 'Utilities',
      last_name: 'Tester',
      email: 'utilities-test@verte.com',
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
        email: 'utilities-test@verte.com',
        password: 'password123',
      });

    authToken = response.body.token;
  }

  /**
   * ===========================================
   * Health Check Endpoint
   * ===========================================
   */
  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.status).toBe('ok');
    });

    it('should not require authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  /**
   * ===========================================
   * CORS Test Endpoint
   * ===========================================
   */
  describe('GET /api/v1/cors-test', () => {
    it('should handle CORS test request', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/cors-test')
        .expect(200);

      expect(response.body).toHaveProperty('cors');
      expect(response.body.cors).toBe('enabled');
    });
  });

  /**
   * ===========================================
   * Recovery Endpoints (Smoke Tests)
   * ===========================================
   */
  describe('Recovery Endpoints', () => {
    it('GET /api/v1/recovery/campaigns - should list recoverable campaigns', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/recovery/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /api/v1/recovery/contacts - should list recoverable contacts', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/recovery/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('POST /api/v1/recovery/restore-campaign - should restore campaign', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/recovery/restore-campaign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ campaign_id: 999999 })
        .expect([200, 404]);

      // Either restores or returns 404 for non-existent
      expect(response.body).toBeDefined();
    });
  });

  /**
   * ===========================================
   * Debug Endpoints (Smoke Tests)
   * ===========================================
   */
  describe('Debug Endpoints', () => {
    it('POST /api/v1/debug/user-data - should return user debug data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/debug/user-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('contacts_count');
      expect(response.body).toHaveProperty('campaigns_count');
    });

    it('GET /api/v1/debug/database-status - should return database status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/debug/database-status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('connected');
      expect(response.body.connected).toBe(true);
    });

    it('POST /api/v1/debug/clear-user-cache - should clear user cache', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/debug/clear-user-cache')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });
  });

  /**
   * ===========================================
   * Sync Endpoints (Smoke Tests)
   * ===========================================
   */
  describe('Sync Endpoints', () => {
    it('GET /api/v1/sync/contacts - should sync contacts', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/sync/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('synced');
      expect(typeof response.body.synced).toBe('number');
    });

    it('GET /api/v1/sync/campaigns - should sync campaigns', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/sync/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('synced');
      expect(typeof response.body.synced).toBe('number');
    });

    it('POST /api/v1/sync/force-sync-all - should force sync all data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/sync/force-sync-all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });
  });

  /**
   * ===========================================
   * User Configuration
   * ===========================================
   */
  describe('User Configuration', () => {
    it('GET /api/v1/user-configuration - should get user configuration', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/user-configuration')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('timer_delay');
      expect(typeof response.body.timer_delay).toBe('number');
    });

    it('POST /api/v1/user-configuration - should save user configuration', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/user-configuration')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          timer_delay: 45,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });
  });

  /**
   * ===========================================
   * Authorization Tests
   * ===========================================
   */
  describe('Authorization Checks', () => {
    it('should require authentication for protected endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/recovery/campaigns')
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/debug/user-data')
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/v1/sync/contacts')
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/v1/user-configuration')
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
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return messages in Portuguese', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/debug/clear-user-cache')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.message) {
        expect(response.body.message).toMatch(/[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/);
      }
    });

    it('should handle sync operations correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/sync/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.synced).toBeGreaterThanOrEqual(0);
    });
  });
});
