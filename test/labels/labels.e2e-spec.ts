import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserStatus, UserProfile } from '../../src/database/entities/user.entity';
import { Number } from '../../src/database/entities/number.entity';
import { Label } from '../../src/database/entities/label.entity';
import { BadRequestToValidationFilter } from '../../src/common/filters/bad-request-to-validation.filter';
import * as bcrypt from 'bcryptjs';

/**
 * Labels Module E2E Tests
 * Tests all 3 endpoints:
 * 1. GET /api/v1/labels - List labels
 * 2. POST /api/v1/labels - Create label
 * 3. DELETE /api/v1/labels/{label} - Delete label
 *
 * Validates:
 * - 100% Laravel compatibility
 * - Portuguese validation messages
 * - Correct HTTP status codes
 * - Response structure
 * - Authentication requirements
 */
describe('Labels Module (E2E)', () => {
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

    await createTestUserWithNumber();

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/login')
      .send({
        email: 'labelstest@verte.com',
        password: 'password123',
      })
      .expect(200);

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    if (testUser) {
      await dataSource.getRepository(Label).delete({ user_id: testUser.id });
      if (testNumber) {
        await dataSource.getRepository(Number).delete({ id: testNumber.id });
      }
      await dataSource.getRepository(User).delete({ id: testUser.id });
    }
    await app.close();
  });

  async function createTestUserWithNumber() {
    const userRepository = dataSource.getRepository(User);
    const numberRepository = dataSource.getRepository(Number);
    const labelRepository = dataSource.getRepository(Label);

    const existingUser = await userRepository.findOne({
      where: { email: 'labelstest@verte.com' },
    });

    if (existingUser) {
      await labelRepository.delete({ user_id: existingUser.id });
      await numberRepository.delete({ user_id: existingUser.id });
      await userRepository.delete({ id: existingUser.id });
    }

    testUser = userRepository.create({
      name: 'Labels',
      last_name: 'Test',
      email: 'labelstest@verte.com',
      password: await bcrypt.hash('password123', 10),
      status: UserStatus.ACTIVED,
      profile: UserProfile.USER,
      confirmed_mail: 1,
      active: 1,
      cel: '5511888888888',
      cpfCnpj: '12345678901',
      plan_id: 1,
    });

    testUser = await userRepository.save(testUser);

    testNumber = numberRepository.create({
      user_id: testUser.id,
      name: 'Test Number',
      instance: `WPP_${testUser.cel}_${testUser.id}`,
      status: 1,
      status_connection: 1,
      cel: testUser.cel,
    });

    testNumber = await numberRepository.save(testNumber);
  }

  /**
   * GET /api/v1/labels
   */
  describe('GET /api/v1/labels', () => {
    it('should list labels successfully', () => {
      return request(app.getHttpServer())
        .get('/api/v1/labels')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta).toHaveProperty('current_page');
          expect(res.body.meta).toHaveProperty('total');
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/labels')
        .expect(401);
    });
  });

  /**
   * POST /api/v1/labels
   */
  describe('POST /api/v1/labels', () => {
    it('should create label successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/labels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Label',
          number_id: testNumber.id,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.name).toBe('Test Label');
          expect(res.body.data.user_id).toBe(testUser.id);
          expect(res.body.data.number_id).toBe(testNumber.id);
        });
    });

    it('should return 422 when name is missing', () => {
      return request(app.getHttpServer())
        .post('/api/v1/labels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          number_id: testNumber.id,
        })
        .expect(422)
        .expect((res) => {
          expect(res.body.message).toContain('O campo nome é obrigatório.');
        });
    });

    it('should return 422 when number_id is missing', () => {
      return request(app.getHttpServer())
        .post('/api/v1/labels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
        })
        .expect(422)
        .expect((res) => {
          expect(res.body.message).toContain('O campo number_id é obrigatório.');
        });
    });

    it('should return 400 when number_id does not belong to user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/labels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
          number_id: 99999,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('O número informado não pertence ao usuário.');
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/labels')
        .send({
          name: 'Test',
          number_id: 1,
        })
        .expect(401);
    });
  });

  /**
   * DELETE /api/v1/labels/{label}
   */
  describe('DELETE /api/v1/labels/:label', () => {
    let labelToDelete: Label;

    beforeEach(async () => {
      const labelRepository = dataSource.getRepository(Label);
      labelToDelete = await labelRepository.save({
        user_id: testUser.id,
        number_id: testNumber.id,
        name: 'Label to Delete',
      });
    });

    it('should delete label successfully', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/labels/${labelToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 404 when label not found', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/labels/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/labels/${labelToDelete.id}`)
        .expect(401);
    });
  });

  /**
   * Laravel Compatibility
   */
  describe('Laravel Compatibility', () => {
    it('should return data wrapped in "data" property', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/labels')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).not.toHaveProperty('items');
    });

    it('should return validation errors in array format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/labels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(422);

      expect(Array.isArray(response.body.message)).toBe(true);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode');
    });

    it('should return Portuguese validation messages', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/labels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(422);

      const messages = response.body.message;
      expect(messages.some((msg: string) => msg.includes('obrigatório'))).toBe(true);
    });

    it('should return 201 status when creating resource (Laravel style)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/labels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Laravel Test',
          number_id: testNumber.id,
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
    });

    it('should return 204 status when deleting resource (Laravel style)', async () => {
      const labelRepository = dataSource.getRepository(Label);
      const label = await labelRepository.save({
        user_id: testUser.id,
        number_id: testNumber.id,
        name: 'To Delete',
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/labels/${label.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });
  });
});
