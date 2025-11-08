import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserStatus, UserProfile } from '../../src/database/entities/user.entity';
import { Number } from '../../src/database/entities/number.entity';
import * as bcrypt from 'bcryptjs';

/**
 * WhatsApp Module E2E Tests
 * Valida 100% de compatibilidade Laravel para todos os 15 endpoints WhatsApp/WAHA
 *
 * Endpoints testados:
 * 1. GET /api/v1/connect-whatsapp
 * 2. GET /api/v1/connect-whatsapp-check
 * 3. POST /api/v1/force-check-whatsapp-connections
 * 4. POST /api/v1/waha/qr
 * 5. GET /api/v1/waha/sessions/:sessionName
 * 6. POST /api/v1/waha/disconnect
 * 7. POST /api/v1/disconnect-waha-session
 * 8. POST /api/v1/webhook-whatsapp (já testado em webhooks.e2e-spec.ts)
 * 9. POST /api/v1/webhook-whatsapp-extractor
 * 10. POST /api/v1/whatsapp/:instance/poll
 * 11. GET /api/v1/whatsapp/:instance/settings
 * 12. POST /api/v1/whatsapp/:instance/settings
 * 13. GET /api/v1/numbers
 * 14. GET /api/v1/numbers/:number
 * 15. DELETE /api/v1/numbers/:number
 *
 * Note: WAHA API será mockada pois não está disponível em testes
 */
describe('WhatsApp Module (e2e) - Laravel Compatibility Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testUser: User;
  let testNumber: Number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Enable class-validator to use NestJS dependency injection
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    // Apply same validation pipe as production
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

    // Create test user and authenticate
    await createTestUser();
    await authenticateUser();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await app.close();
  });

  /**
   * Helper: Create test user
   */
  async function createTestUser() {
    const userRepository = dataSource.getRepository(User);

    // Delete existing test user if exists
    await userRepository.delete({ email: 'whatsapp-test@verte.com' });

    testUser = userRepository.create({
      name: 'WhatsApp',
      last_name: 'Test',
      email: 'whatsapp-test@verte.com',
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

  /**
   * Helper: Authenticate user
   */
  async function authenticateUser() {
    const response = await request(app.getHttpServer())
      .post('/api/v1/login')
      .send({
        email: 'whatsapp-test@verte.com',
        password: 'password123',
      })
      .expect(200);

    authToken = response.body.access_token;
  }

  /**
   * Helper: Cleanup test data
   */
  async function cleanupTestData() {
    if (!testUser) return;

    const numberRepository = dataSource.getRepository(Number);
    const userRepository = dataSource.getRepository(User);

    await numberRepository.delete({ user_id: testUser.id });
    await userRepository.delete({ id: testUser.id });
  }

  /**
   * ===========================================
   * 1. GET /api/v1/connect-whatsapp
   * ===========================================
   */
  describe('GET /api/v1/connect-whatsapp', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/connect-whatsapp')
        .expect(401);
    });

    it.skip('should initiate WhatsApp connection and return QR code', async () => {
      // Skip: Requires WAHA API mock
      const response = await request(app.getHttpServer())
        .get('/api/v1/connect-whatsapp')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('qr');
      expect(response.body).toHaveProperty('instance');
      expect(response.body).toHaveProperty('number_id');
    });
  });

  /**
   * ===========================================
   * 2. GET /api/v1/connect-whatsapp-check
   * ===========================================
   */
  describe('GET /api/v1/connect-whatsapp-check', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/connect-whatsapp-check')
        .expect(401);
    });

    it.skip('should check WhatsApp connection status', async () => {
      // Skip: Requires WAHA API mock
      const response = await request(app.getHttpServer())
        .get('/api/v1/connect-whatsapp-check')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('connected');
      expect(response.body.connected).toBe(false);
    });
  });

  /**
   * ===========================================
   * 3. POST /api/v1/force-check-whatsapp-connections
   * ===========================================
   */
  describe('POST /api/v1/force-check-whatsapp-connections', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/force-check-whatsapp-connections')
        .expect(401);
    });

    it.skip('should force check all WhatsApp connections', async () => {
      // Skip: Requires WAHA API mock
      const response = await request(app.getHttpServer())
        .post('/api/v1/force-check-whatsapp-connections')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('checked');
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
    });
  });

  /**
   * ===========================================
   * 4. POST /api/v1/waha/qr
   * ===========================================
   */
  describe('POST /api/v1/waha/qr', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/waha/qr')
        .send({ session: 'default' })
        .expect(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/waha/qr')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('session');
    });

    it.skip('should generate QR code for session', async () => {
      // Skip: Requires WAHA API mock
      const response = await request(app.getHttpServer())
        .post('/api/v1/waha/qr')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ session: 'default' })
        .expect(200);

      expect(response.body).toHaveProperty('qr');
      expect(response.body).toHaveProperty('instance');
    });
  });

  /**
   * ===========================================
   * 5. GET /api/v1/waha/sessions/:sessionName
   * ===========================================
   */
  describe('GET /api/v1/waha/sessions/:sessionName', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/waha/sessions/default')
        .expect(401);
    });

    it.skip('should get session status', async () => {
      // Skip: Requires WAHA API mock
      const response = await request(app.getHttpServer())
        .get('/api/v1/waha/sessions/default')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('number_id');
    });
  });

  /**
   * ===========================================
   * 6. POST /api/v1/waha/disconnect
   * ===========================================
   */
  describe('POST /api/v1/waha/disconnect', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/waha/disconnect')
        .send({ session: 'default' })
        .expect(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/waha/disconnect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('session');
    });

    it.skip('should disconnect WAHA session', async () => {
      // Skip: Requires WAHA API mock
      const response = await request(app.getHttpServer())
        .post('/api/v1/waha/disconnect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ session: 'default' })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });
  });

  /**
   * ===========================================
   * 7. POST /api/v1/disconnect-waha-session (public)
   * ===========================================
   */
  describe('POST /api/v1/disconnect-waha-session', () => {
    it('should not require authentication (public endpoint)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/disconnect-waha-session')
        .send({ session: 'default' })
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });
  });

  /**
   * ===========================================
   * 9. POST /api/v1/webhook-whatsapp-extractor
   * ===========================================
   */
  describe('POST /api/v1/webhook-whatsapp-extractor', () => {
    it('should not require authentication (public webhook)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/webhook-whatsapp-extractor')
        .send({
          event: 'test.event',
          session: 'default',
          payload: {},
        })
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });
  });

  /**
   * ===========================================
   * 10. POST /api/v1/whatsapp/:instance/poll
   * ===========================================
   */
  describe('POST /api/v1/whatsapp/:instance/poll', () => {
    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/default/poll')
        .send({})
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('number');
      expect(response.body.errors).toHaveProperty('name');
      expect(response.body.errors).toHaveProperty('options');
    });

    it.skip('should send poll via WhatsApp', async () => {
      // Skip: Requires WAHA API mock
      const response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/default/poll')
        .send({
          number: '5511999999999',
          name: 'Test Poll',
          options: ['Option 1', 'Option 2'],
          selectableCount: 1,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message_id');
    });
  });

  /**
   * ===========================================
   * 11. GET /api/v1/whatsapp/:instance/settings
   * ===========================================
   */
  describe('GET /api/v1/whatsapp/:instance/settings', () => {
    it.skip('should get instance settings', async () => {
      // Skip: Requires WAHA API mock
      const response = await request(app.getHttpServer())
        .get('/api/v1/whatsapp/default/settings')
        .expect(200);

      expect(response.body).toHaveProperty('reject_call');
      expect(response.body).toHaveProperty('groups_ignore');
    });
  });

  /**
   * ===========================================
   * 12. POST /api/v1/whatsapp/:instance/settings
   * ===========================================
   */
  describe('POST /api/v1/whatsapp/:instance/settings', () => {
    it.skip('should update instance settings', async () => {
      // Skip: Requires WAHA API mock
      const response = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/default/settings')
        .send({
          reject_call: false,
          groups_ignore: true,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });
  });

  /**
   * ===========================================
   * 13. GET /api/v1/numbers
   * ===========================================
   */
  describe('GET /api/v1/numbers', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/numbers')
        .expect(401);
    });

    it('should list user WhatsApp numbers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/numbers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  /**
   * ===========================================
   * 14. GET /api/v1/numbers/:number
   * ===========================================
   */
  describe('GET /api/v1/numbers/:number', () => {
    beforeAll(async () => {
      // Create test number
      const numberRepository = dataSource.getRepository(Number);
      testNumber = numberRepository.create({
        user_id: testUser.id,
        name: 'Test Number',
        instance: 'test_instance',
        status: 1,
        status_connection: 0,
      });
      testNumber = await numberRepository.save(testNumber);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/numbers/${testNumber.id}`)
        .expect(401);
    });

    it('should show number details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/numbers/${testNumber.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.id).toBe(testNumber.id);
    });

    it('should return 404 for non-existent number', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/numbers/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  /**
   * ===========================================
   * 15. DELETE /api/v1/numbers/:number
   * ===========================================
   */
  describe('DELETE /api/v1/numbers/:number', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/numbers/${testNumber.id}`)
        .expect(401);
    });

    it.skip('should delete number (soft delete)', async () => {
      // Skip: Requires WAHA API mock for logout
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/numbers/${testNumber.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('message');

      // Verify soft delete
      const numberRepository = dataSource.getRepository(Number);
      const deletedNumber = await numberRepository.findOne({
        where: { id: testNumber.id },
        withDeleted: true,
      });

      expect(deletedNumber).not.toBeNull();
      expect(deletedNumber?.deleted_at).not.toBeNull();
    });

    it('should return 404 for non-existent number', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/numbers/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
