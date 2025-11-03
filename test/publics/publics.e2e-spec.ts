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
import { Plan } from '../../src/database/entities/plan.entity';
import { Number } from '../../src/database/entities/number.entity';
import { Public } from '../../src/database/entities/public.entity';
import { Contact } from '../../src/database/entities/contact.entity';
import { PublicByContact } from '../../src/database/entities/public-by-contact.entity';
import * as bcrypt from 'bcryptjs';

describe('Publics (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testUser: User;
  let testPlan: Plan;
  let testNumber: Number;
  let testPublic: Public;
  let testContact: Contact;

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
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();
    dataSource = app.get(DataSource);

    // Create test plan
    testPlan = await dataSource.getRepository(Plan).save({
      name: 'Test Plan Publics',
      limit_disparo: 100,
      limit_atendentes: 5,
      limit_numeros: 2,
      limit_contatos: 1000,
      limit_tags: 50,
      allow_campanha_agendada: 1,
      allow_campanha_recorrente: 1,
      allow_integracao_n8n: 1,
      allow_integracao_webhook: 1,
      allow_relatorio_pdf: 1,
      allow_relatorio_personalizado: 1,
      daily_value: 29.9,
      monthly_value: 99.9,
      yearly_value: 999.9,
    });

    // Create test user
    const userData = {
      name: 'Test User Publics',
      last_name: 'E2E',
      email: `publics-test-${Date.now()}@example.com`,
      cel: '11999999999',
      cpfCnpj: `${Date.now()}`.substring(0, 11),
      password: await bcrypt.hash('password123', 10),
      status: UserStatus.ACTIVED,
      profile: UserProfile.USER,
      confirmed_mail: 1,
      active: 1,
      plan_id: testPlan.id,
    };
    testUser = (await dataSource.getRepository(User).save(userData)) as User;

    // Create test WhatsApp number
    testNumber = await dataSource.getRepository(Number).save({
      user_id: testUser.id,
      instance: 'test-instance-publics',
      name: 'Test Number Publics',
      cel: '5511999999999',
      status: 1,
    });

    // Create test public
    testPublic = await dataSource.getRepository(Public).save({
      user_id: testUser.id,
      number_id: testNumber.id,
      name: 'Test Public Original',
      photo: null,
      status: 0,
      from_chat: 0,
      from_tag: null,
      number: testNumber.cel,
      labels: null,
    });

    // Create test contacts
    testContact = await dataSource.getRepository(Contact).save({
      user_id: testUser.id,
      public_id: testPublic.id,
      number_id: testNumber.id,
      name: 'Test Contact',
      number: '5511988887777',
      description: 'Test description',
      variable_1: 'Var1',
      variable_2: 'Var2',
      variable_3: 'Var3',
      type: 1,
      status: 1,
    });

    // Create additional contact for CSV test
    await dataSource.getRepository(Contact).save({
      user_id: testUser.id,
      public_id: testPublic.id,
      number_id: testNumber.id,
      name: 'Test Contact 2',
      number: '5511977776666',
      description: null,
      variable_1: 'Value A',
      variable_2: null,
      variable_3: null,
      type: 1,
      status: 1,
    });

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/login')
      .send({
        email: testUser.email,
        password: 'password123',
      })
      .expect(200);

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    if (testUser) {
      // Cleanup in correct order (foreign keys)
      await dataSource
        .getRepository(PublicByContact)
        .delete({ user_id: testUser.id });
      await dataSource.getRepository(Contact).delete({ user_id: testUser.id });
      await dataSource.getRepository(Public).delete({ user_id: testUser.id });
      await dataSource.getRepository(Number).delete({ user_id: testUser.id });
      await dataSource.getRepository(User).delete({ id: testUser.id });
    }
    if (testPlan) {
      await dataSource.getRepository(Plan).delete({ id: testPlan.id });
    }
    await app.close();
  });

  describe('GET /api/v1/publics', () => {
    it('should return publics list with aggregations', () => {
      return request(app.getHttpServer())
        .get('/api/v1/publics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta).toHaveProperty('current_page');
          expect(res.body.meta).toHaveProperty('per_page');
          expect(res.body.meta).toHaveProperty('total');

          if (res.body.data.length > 0) {
            const firstPublic = res.body.data[0];
            expect(firstPublic).toHaveProperty('publics_id');
            expect(firstPublic).toHaveProperty('publics_name');
          }
        });
    });

    it('should filter by search term', () => {
      return request(app.getHttpServer())
        .get('/api/v1/publics?search=Test Public')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter by numberId', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/publics?numberId=${testNumber.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get('/api/v1/publics?page=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.current_page).toBe(1);
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/api/v1/publics').expect(401);
    });
  });

  describe('POST /api/v1/publics/:id', () => {
    it('should update public name', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/publics/${testPublic.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Public Name',
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.name).toBe('Updated Public Name');
    });

    it('should update public status and deactivate others', async () => {
      // Create another public
      const anotherPublic = await dataSource.getRepository(Public).save({
        user_id: testUser.id,
        number_id: testNumber.id,
        name: 'Another Public',
        status: 1, // Active
        from_chat: 0,
      });

      // Update testPublic to active (status = 1)
      await request(app.getHttpServer())
        .post(`/api/v1/publics/${testPublic.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 1,
        })
        .expect(200);

      // Check that anotherPublic is now inactive
      const updated = await dataSource.getRepository(Public).findOne({
        where: { id: anotherPublic.id },
      });
      expect(updated).not.toBeNull();
      expect(updated!.status).toBe(0);

      // Cleanup
      await dataSource.getRepository(Public).delete({ id: anotherPublic.id });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/publics/${testPublic.id}`)
        .send({
          name: 'Test',
        })
        .expect(401);
    });

    it('should return 404 for non-existent public', () => {
      return request(app.getHttpServer())
        .post('/api/v1/publics/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
        })
        .expect(404);
    });
  });

  describe('GET /api/v1/publics/download-contacts/:id', () => {
    it('should download contacts as CSV', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/publics/download-contacts/${testPublic.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('Celular;Nome');
      expect(response.text).toContain('Test Contact');
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/publics/download-contacts/${testPublic.id}`)
        .expect(401);
    });

    it('should return 404 for non-existent public', () => {
      return request(app.getHttpServer())
        .get('/api/v1/publics/download-contacts/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/publics-duplicate', () => {
    it('should duplicate public and its contacts', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/publics-duplicate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: testPublic.id,
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.name).toContain('Cópia');
      expect(response.body.data.status).toBe(0);

      // Verify contacts were duplicated
      const newPublicId = response.body.data.id;
      const contacts = await dataSource.getRepository(Contact).find({
        where: { public_id: newPublicId },
      });

      expect(contacts.length).toBeGreaterThan(0);

      // Cleanup duplicated public and contacts
      await dataSource
        .getRepository(Contact)
        .delete({ public_id: newPublicId });
      await dataSource.getRepository(Public).delete({ id: newPublicId });
    });

    it('should return 422 without id field', () => {
      return request(app.getHttpServer())
        .post('/api/v1/publics-duplicate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(422)
        .expect((res) => {
          // Accept both Laravel and NestJS validation error formats
          expect(res.body).toHaveProperty('message');
          expect(Array.isArray(res.body.message)).toBe(true);
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/publics-duplicate')
        .send({
          id: testPublic.id,
        })
        .expect(401);
    });

    it('should return 404 for non-existent public', () => {
      return request(app.getHttpServer())
        .post('/api/v1/publics-duplicate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 999999,
        })
        .expect(404);
    });

    it('should return 403 when trying to duplicate another user public', async () => {
      // Create another user
      const anotherUserData = {
        name: 'Another User',
        email: `another-publics-${Date.now()}@example.com`,
        cel: '11988888888',
        cpfCnpj: `${Date.now()}`.substring(0, 11),
        password: await bcrypt.hash('password123', 10),
        status: UserStatus.ACTIVED,
        profile: UserProfile.USER,
        confirmed_mail: 1,
        active: 1,
        plan_id: testPlan.id,
      };
      const anotherUser = (await dataSource
        .getRepository(User)
        .save(anotherUserData)) as User;

      // Create public for another user
      const anotherPublic = await dataSource.getRepository(Public).save({
        user_id: anotherUser.id,
        name: 'Another User Public',
        status: 0,
        from_chat: 0,
      });

      // Try to duplicate (should fail)
      await request(app.getHttpServer())
        .post('/api/v1/publics-duplicate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: anotherPublic.id,
        })
        .expect(403);

      // Cleanup
      await dataSource.getRepository(Public).delete({ id: anotherPublic.id });
      await dataSource.getRepository(User).delete({ id: anotherUser.id });
    });
  });

  describe('DELETE /api/v1/publics/:id', () => {
    it('should soft delete a public', async () => {
      // Create a public to delete
      const publicToDelete = await dataSource.getRepository(Public).save({
        user_id: testUser.id,
        number_id: testNumber.id,
        name: 'Public To Delete',
        status: 0,
        from_chat: 0,
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/publics/${publicToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify soft delete
      const deleted = await dataSource.getRepository(Public).findOne({
        where: { id: publicToDelete.id },
        withDeleted: true,
      });

      expect(deleted).not.toBeNull();
      expect(deleted!.deleted_at).not.toBeNull();

      // Cleanup
      await dataSource.getRepository(Public).delete({ id: publicToDelete.id });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/publics/${testPublic.id}`)
        .expect(401);
    });

    it('should return 404 for non-existent public', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/publics/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/publics/contact', () => {
    it('should return a random contact from public', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/publics/contact')
        .query({ id: testPublic.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      if (response.body.data) {
        expect(response.body.data).toHaveProperty('name');
        expect(response.body.data).toHaveProperty('number');
        expect(response.body.data.public_id).toBe(testPublic.id);
      }
    });

    it('should return 422 without id parameter', () => {
      return request(app.getHttpServer())
        .get('/api/v1/publics/contact')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(422);
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/publics/contact')
        .query({ id: testPublic.id })
        .expect(401);
    });

    it('should return 404 for non-existent public', () => {
      return request(app.getHttpServer())
        .get('/api/v1/publics/contact')
        .query({ id: 999999 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Laravel Compatibility', () => {
    it('should return data wrapper in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/publics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
    });

    it('should return 204 (no content) for delete', async () => {
      const publicToDelete = await dataSource.getRepository(Public).save({
        user_id: testUser.id,
        name: 'Delete Test',
        status: 0,
        from_chat: 0,
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/publics/${publicToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      expect(response.body).toEqual({});

      // Cleanup
      await dataSource.getRepository(Public).delete({ id: publicToDelete.id });
    });

    it('should return validation errors with proper structure', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/publics-duplicate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(422);

      // Verify validation error structure
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.statusCode).toBe(422);
      expect(Array.isArray(response.body.message)).toBe(true);
    });
  });
});
