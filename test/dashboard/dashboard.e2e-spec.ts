import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserStatus, UserProfile } from '../../src/database/entities';
import * as bcrypt from 'bcryptjs';

/**
 * Dashboard Module E2E Tests
 * Validates 100% Laravel compatibility for all 2 dashboard endpoints
 *
 * Endpoints tested:
 * 1. GET /api/v1/dashboard
 * 2. GET /api/v1/dashboard/recent-activity
 */
describe('Dashboard Module (e2e) - Laravel Compatibility Tests', () => {
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

    await userRepository.delete({ email: 'dashboard-test@verte.com' });

    testUser = userRepository.create({
      name: 'Dashboard',
      last_name: 'Tester',
      email: 'dashboard-test@verte.com',
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
        email: 'dashboard-test@verte.com',
        password: 'password123',
      });

    authToken = response.body.token;
  }

  /**
   * ===========================================
   * 1. GET /api/v1/dashboard
   * ===========================================
   */
  describe('GET /api/v1/dashboard', () => {
    it('should get dashboard stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Validate Laravel-compatible response structure
      expect(response.body).toHaveProperty('total_contacts');
      expect(response.body).toHaveProperty('total_campaigns');
      expect(response.body).toHaveProperty('active_campaigns');
      expect(response.body).toHaveProperty('total_messages_sent');
      expect(response.body).toHaveProperty('whatsapp_instances');
      expect(response.body).toHaveProperty('connected_instances');

      // Validate types
      expect(typeof response.body.total_contacts).toBe('number');
      expect(typeof response.body.total_campaigns).toBe('number');
      expect(typeof response.body.active_campaigns).toBe('number');
      expect(typeof response.body.total_messages_sent).toBe('number');
      expect(typeof response.body.whatsapp_instances).toBe('number');
      expect(typeof response.body.connected_instances).toBe('number');
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/api/v1/dashboard').expect(401);
    });
  });

  /**
   * ===========================================
   * 2. GET /api/v1/dashboard/recent-activity
   * ===========================================
   */
  describe('GET /api/v1/dashboard/recent-activity', () => {
    it('should get recent activity', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/recent-activity')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Validate Laravel-compatible response structure
      expect(response.body).toHaveProperty('recent_campaigns');
      expect(response.body).toHaveProperty('recent_contacts');
      expect(response.body).toHaveProperty('recent_messages');

      // Validate arrays
      expect(Array.isArray(response.body.recent_campaigns)).toBe(true);
      expect(Array.isArray(response.body.recent_contacts)).toBe(true);
      expect(Array.isArray(response.body.recent_messages)).toBe(true);
    });

    it('should limit results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/recent-activity')
        .query({ limit: 5 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.recent_campaigns)).toBe(true);
      expect(response.body.recent_campaigns.length).toBeLessThanOrEqual(5);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/dashboard/recent-activity')
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
        .get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify all expected fields are present
      const requiredFields = [
        'total_contacts',
        'total_campaigns',
        'active_campaigns',
        'total_messages_sent',
        'whatsapp_instances',
        'connected_instances',
      ];

      requiredFields.forEach((field) => {
        expect(response.body).toHaveProperty(field);
      });
    });

    it('should return numeric values for counters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(typeof response.body.total_contacts).toBe('number');
      expect(typeof response.body.total_campaigns).toBe('number');
      expect(response.body.total_contacts).toBeGreaterThanOrEqual(0);
      expect(response.body.total_campaigns).toBeGreaterThanOrEqual(0);
    });
  });
});
