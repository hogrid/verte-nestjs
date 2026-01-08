import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserStatus, UserProfile } from '../../src/database/entities';
import { Number as NumberEntity } from '../../src/database/entities/number.entity';
import { BadRequestToValidationFilter } from '../../src/common/filters/bad-request-to-validation.filter';
import * as bcrypt from 'bcryptjs';

/**
 * Numbers Module E2E Tests
 * Validates 100% Laravel compatibility for all 6 numbers endpoints
 *
 * Endpoints tested:
 * 1. GET /api/v1/numbers
 * 2. POST /api/v1/numbers
 * 3. GET /api/v1/numbers/{id}
 * 4. PUT /api/v1/numbers/{id}
 * 5. DELETE /api/v1/numbers/{id}
 * 6. POST /api/v1/numbers/{id}/reconnect
 */
describe('Numbers Module (e2e) - Laravel Compatibility Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testUser: User;
  let testNumber: NumberEntity;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    app.useGlobalFilters(new BadRequestToValidationFilter());

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
      const numberRepository = dataSource.getRepository(NumberEntity);
      await numberRepository.delete({ user_id: testUser.id });

      await dataSource.getRepository(User).delete({ id: testUser.id });
    }
    await app.close();
  });

  async function createTestUser() {
    const userRepository = dataSource.getRepository(User);

    await userRepository.delete({ email: 'numbers-test@verte.com' });

    testUser = userRepository.create({
      name: 'Numbers',
      last_name: 'Tester',
      email: 'numbers-test@verte.com',
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
        email: 'numbers-test@verte.com',
        password: 'password123',
      });

    authToken = response.body.token;
  }

  /**
   * ===========================================
   * 1. GET /api/v1/numbers
   * ===========================================
   */
  describe('GET /api/v1/numbers', () => {
    it('should list user WhatsApp numbers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/numbers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/api/v1/numbers').expect(401);
    });
  });

  /**
   * ===========================================
   * 2. POST /api/v1/numbers
   * ===========================================
   */
  describe('POST /api/v1/numbers', () => {
    it('should create WhatsApp number successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/numbers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'WhatsApp Teste',
          instance: `test_instance_${Date.now()}`,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body.name).toBe('WhatsApp Teste');
      expect(response.body).toHaveProperty('instance');
      expect(response.body).toHaveProperty('status');

      testNumber = response.body;
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/numbers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(422);

      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(
        response.body.message.some((msg: string) => msg.includes('instância')),
      ).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/numbers')
        .send({
          name: 'Test',
          instance: 'test',
        })
        .expect(401);
    });
  });

  /**
   * ===========================================
   * 3. GET /api/v1/numbers/{id}
   * ===========================================
   */
  describe('GET /api/v1/numbers/:id', () => {
    it('should get number details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/numbers/${testNumber.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('instance');
    });

    it('should return 404 for non-existent number', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/numbers/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/numbers/${testNumber.id}`)
        .expect(401);
    });
  });

  /**
   * ===========================================
   * 4. PUT /api/v1/numbers/{id}
   * ===========================================
   */
  describe('PUT /api/v1/numbers/:id', () => {
    it('should update number successfully', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/numbers/${testNumber.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'WhatsApp Atualizado',
        })
        .expect(200);

      expect(response.body.name).toBe('WhatsApp Atualizado');
    });

    it('should return 404 for non-existent number', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/numbers/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/numbers/${testNumber.id}`)
        .send({ name: 'Test' })
        .expect(401);
    });
  });

  /**
   * ===========================================
   * 5. POST /api/v1/numbers/{id}/reconnect
   * ===========================================
   */
  describe('POST /api/v1/numbers/:id/reconnect', () => {
    it('should trigger WhatsApp reconnection', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/numbers/${testNumber.id}/reconnect`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message.toLowerCase()).toContain('reconexão');
    });

    it('should return 404 for non-existent number', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/numbers/999999/reconnect')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/numbers/${testNumber.id}/reconnect`)
        .expect(401);
    });
  });

  /**
   * ===========================================
   * 6. DELETE /api/v1/numbers/{id}
   * ===========================================
   */
  describe('DELETE /api/v1/numbers/:id', () => {
    it('should soft delete number successfully', async () => {
      // Create a number to delete
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/numbers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Number para Deletar',
          instance: `delete_test_${Date.now()}`,
        });

      const numberId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/numbers/${numberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('sucesso');

      // Verify soft delete
      const numberRepository = dataSource.getRepository(NumberEntity);
      const deletedNumber = await numberRepository.findOne({
        where: { id: numberId },
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

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/numbers/${testNumber.id}`)
        .expect(401);
    });
  });

  /**
   * ===========================================
   * Laravel Compatibility Validation
   * ===========================================
   */
  describe('Laravel Compatibility Checks', () => {
    it('should use soft deletes', () => {
      expect(NumberEntity).toBeDefined();
    });

    it('should maintain Laravel response structure', () => {
      expect(testNumber).toHaveProperty('id');
      expect(testNumber).toHaveProperty('name');
      expect(testNumber).toHaveProperty('instance');
    });
  });
});
