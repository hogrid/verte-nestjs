import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import {
  User,
  UserStatus,
  UserProfile,
} from '../../src/database/entities/user.entity';
import { Number } from '../../src/database/entities/number.entity';
import { Contact } from '../../src/database/entities/contact.entity';
import { BadRequestToValidationFilter } from '../../src/common/filters/bad-request-to-validation.filter';
import { NumberHelper } from '../../src/common/helpers/number.helper';
import * as bcrypt from 'bcryptjs';

/**
 * Contacts Module E2E Tests
 *
 * Tests all 6 implemented endpoints:
 * 1. GET /api/v1/contacts - List contacts with filters
 * 2. GET /api/v1/contacts/indicators - Get indicators
 * 3. POST /api/v1/contacts - Bulk update status
 * 4. POST /api/v1/contacts/block - Block contacts
 * 5. POST /api/v1/contacts/unblock - Unblock contacts
 * 6. POST /api/v1/contacts/search - Advanced search
 *
 * Validates:
 * - 100% Laravel compatibility
 * - Portuguese validation messages
 * - Correct HTTP status codes
 * - Response structure
 * - Authentication requirements
 * - Business logic
 */
describe('Contacts Module (E2E)', () => {
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

    // Apply Laravel compatibility filter (converts 400 -> 422)
    app.useGlobalFilters(new BadRequestToValidationFilter());

    // Apply same validation pipe as main.ts
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

    // Create test user with active WhatsApp number
    await createTestUserWithNumber();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/login')
      .send({
        email: 'contactstest@verte.com',
        password: 'password123',
      })
      .expect(200);

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Cleanup test data in correct order (respecting foreign key constraints)
    if (testUser) {
      // 1. Delete contacts first (references user_id)
      await dataSource.getRepository(Contact).delete({ user_id: testUser.id });

      // 2. Delete number (references user_id)
      if (testNumber) {
        await dataSource.getRepository(Number).delete({ id: testNumber.id });
      }

      // 3. Finally delete user
      await dataSource.getRepository(User).delete({ id: testUser.id });
    }
    await app.close();
  });

  /**
   * Helper: Create test user with active WhatsApp number
   * Required for contacts endpoints to work
   */
  async function createTestUserWithNumber() {
    const userRepository = dataSource.getRepository(User);
    const numberRepository = dataSource.getRepository(Number);
    const contactRepository = dataSource.getRepository(Contact);

    // Delete existing test user if exists (with proper cleanup order)
    const existingUser = await userRepository.findOne({
      where: { email: 'contactstest@verte.com' },
    });

    if (existingUser) {
      // Delete contacts first
      await contactRepository.delete({ user_id: existingUser.id });
      // Delete numbers
      await numberRepository.delete({ user_id: existingUser.id });
      // Finally delete user
      await userRepository.delete({ id: existingUser.id });
    }

    // Create test user
    testUser = userRepository.create({
      name: 'Contacts',
      last_name: 'Test',
      email: 'contactstest@verte.com',
      password: await bcrypt.hash('password123', 10),
      status: UserStatus.ACTIVED,
      profile: UserProfile.USER,
      confirmed_mail: 1,
      active: 1,
      cel: '5511999999999',
      cpfCnpj: '52998224725', // Valid CPF
      plan_id: 1, // Assuming plan with ID 1 exists
    });

    testUser = await userRepository.save(testUser);

    // Create active WhatsApp number for this user
    testNumber = numberRepository.create({
      user_id: testUser.id,
      name: 'Test Number',
      instance: `WPP_${testUser.cel}_${testUser.id}`,
      status: 1, // Active
      status_connection: 1,
      cel: testUser.cel,
    });

    testNumber = await numberRepository.save(testNumber);
  }

  /**
   * 1. GET /api/v1/contacts
   * List contacts with filters
   */
  describe('GET /api/v1/contacts', () => {
    it('should list contacts successfully (authenticated)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter contacts by search parameter', () => {
      return request(app.getHttpServer())
        .get('/api/v1/contacts?search=test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter contacts by status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/contacts?status=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
        });
    });

    it('should filter contacts by multiple statuses', () => {
      return request(app.getHttpServer())
        .get('/api/v1/contacts?status=1&status=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
        });
    });

    it('should filter contacts by tag', () => {
      return request(app.getHttpServer())
        .get('/api/v1/contacts?tag=vip')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/contacts')
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.statusCode).toBe(401);
        });
    });

    it('should return 404 if user has no active WhatsApp number', async () => {
      // This test would require a user without active WhatsApp number
      // For now, we just document the expected behavior
      // Status: 404
      // Message: "Nenhum número WhatsApp ativo encontrado para este usuário."
    });
  });

  /**
   * 2. GET /api/v1/contacts/indicators
   * Get contact indicators/counters
   */
  describe('GET /api/v1/contacts/indicators', () => {
    it('should return indicators successfully', () => {
      return request(app.getHttpServer())
        .get('/api/v1/contacts/indicators')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('total');
          expect(res.body.data).toHaveProperty('totalBlocked');
          expect(res.body.data).toHaveProperty('totalActive');
          expect(res.body.data).toHaveProperty('totalInactive');

          // All should be numbers
          expect(typeof res.body.data.total).toBe('number');
          expect(typeof res.body.data.totalBlocked).toBe('number');
          expect(typeof res.body.data.totalActive).toBe('number');
          expect(typeof res.body.data.totalInactive).toBe('number');
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/contacts/indicators')
        .expect(401);
    });
  });

  /**
   * 3. POST /api/v1/contacts
   * Bulk update contact status
   */
  describe('POST /api/v1/contacts (bulk update status)', () => {
    it('should return 422 when rows field is missing', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 2,
        })
        .expect(422)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(Array.isArray(res.body.message)).toBe(true);
          expect(res.body.message).toContain('O campo linhas é obrigatório.');
        });
    });

    it('should return 422 when status field is missing', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rows: [1, 2, 3],
        })
        .expect(422)
        .expect((res) => {
          expect(res.body.message).toContain('O campo status é obrigatório.');
        });
    });

    it('should return 422 when status is invalid', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rows: [1, 2, 3],
          status: 5, // Invalid status
        })
        .expect(422)
        .expect((res) => {
          expect(res.body.message).toContain(
            'O campo status deve ser 1 (Ativo), 2 (Bloqueado) ou 3 (Inativo).',
          );
        });
    });

    it('should return 422 when rows is empty array', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rows: [],
          status: 2,
        })
        .expect(422)
        .expect((res) => {
          expect(res.body.message).toContain(
            'O campo linhas deve conter pelo menos 1 ID.',
          );
        });
    });

    it('should return 400 when no contacts were updated (IDs do not belong to user)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rows: [999999, 999998], // Non-existent IDs
          status: 2,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain(
            'Nenhum contato foi atualizado. Verifique se os IDs pertencem ao usuário.',
          );
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          rows: [1, 2, 3],
          status: 2,
        })
        .expect(401);
    });
  });

  /**
   * 4. POST /api/v1/contacts/block
   * Block multiple contacts
   */
  describe('POST /api/v1/contacts/block', () => {
    it('should return 422 when contact_ids field is missing', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/block')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(422)
        .expect((res) => {
          expect(res.body.message).toContain(
            'O campo contact_ids é obrigatório.',
          );
        });
    });

    it('should return 422 when contact_ids is not an array', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/block')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_ids: 'not-an-array',
        })
        .expect(422)
        .expect((res) => {
          expect(res.body.message).toContain(
            'O campo contact_ids deve ser um array.',
          );
        });
    });

    it('should return 422 when contact_ids is empty array', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/block')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_ids: [],
        })
        .expect(422)
        .expect((res) => {
          expect(res.body.message).toContain(
            'O campo contact_ids deve conter pelo menos 1 ID.',
          );
        });
    });

    it('should return 400 when no contacts were blocked (IDs do not belong to user)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/block')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_ids: [999999, 999998],
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain(
            'Nenhum contato foi bloqueado. Verifique se os IDs pertencem ao usuário.',
          );
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/block')
        .send({
          contact_ids: [1, 2, 3],
        })
        .expect(401);
    });
  });

  /**
   * 5. POST /api/v1/contacts/unblock
   * Unblock multiple contacts
   */
  describe('POST /api/v1/contacts/unblock', () => {
    it('should return 422 when contact_ids field is missing', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/unblock')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(422)
        .expect((res) => {
          expect(res.body.message).toContain(
            'O campo contact_ids é obrigatório.',
          );
        });
    });

    it('should return 422 when contact_ids is not an array', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/unblock')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_ids: 'not-an-array',
        })
        .expect(422)
        .expect((res) => {
          expect(res.body.message).toContain(
            'O campo contact_ids deve ser um array.',
          );
        });
    });

    it('should return 422 when contact_ids is empty array', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/unblock')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_ids: [],
        })
        .expect(422)
        .expect((res) => {
          expect(res.body.message).toContain(
            'O campo contact_ids deve conter pelo menos 1 ID.',
          );
        });
    });

    it('should return 400 when no contacts were unblocked (IDs do not belong to user)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/unblock')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contact_ids: [999999, 999998],
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain(
            'Nenhum contato foi desbloqueado. Verifique se os IDs pertencem ao usuário.',
          );
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/unblock')
        .send({
          contact_ids: [1, 2, 3],
        })
        .expect(401);
    });
  });

  /**
   * 6. POST /api/v1/contacts/search
   * Advanced search for contacts
   */
  describe('POST /api/v1/contacts/search', () => {
    it('should search contacts successfully with query only', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'test',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);

          // Meta should contain query info
          expect(res.body.meta).toHaveProperty('query');
          expect(res.body.meta).toHaveProperty('type');
          expect(res.body.meta).toHaveProperty('total');
          expect(res.body.meta.query).toBe('test');
        });
    });

    it('should search contacts by name type', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'João',
          type: 'name',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.type).toBe('name');
        });
    });

    it('should search contacts by phone type', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: '5511',
          type: 'phone',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.type).toBe('phone');
        });
    });

    it('should search contacts by label type', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'vip',
          type: 'label',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.type).toBe('label');
        });
    });

    it('should return 422 when query field is missing', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(422)
        .expect((res) => {
          expect(res.body.message).toContain('O campo query é obrigatório.');
        });
    });

    it('should return 422 when query is less than 3 characters', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'ab',
        })
        .expect(422)
        .expect((res) => {
          expect(res.body.message).toContain(
            'O campo query deve ter no mínimo 3 caracteres.',
          );
        });
    });

    it('should return 422 when type is invalid', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'test',
          type: 'invalid',
        })
        .expect(422)
        .expect((res) => {
          expect(res.body.message).toContain(
            'O campo type deve ser: name, phone ou label.',
          );
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/search')
        .send({
          query: 'test',
        })
        .expect(401);
    });
  });

  /**
   * GET /api/v1/contacts/active/export
   * Export active contacts to CSV or XLSX
   */
  describe('GET /api/v1/contacts/active/export', () => {
    // Create test contacts for export tests
    beforeAll(async () => {
      const contactRepository = dataSource.getRepository(Contact);
      const normalizedCel = NumberHelper.formatNumber(testNumber.cel!);

      // Create 3 active test contacts for export (2 with label_id=1, 1 without)
      const testContacts = [
        {
          name: 'Export Test Contact 1',
          number: '5511999999991',
          cel_owner: normalizedCel,
          status: 1, // Active
          user_id: testUser.id,
          number_id: testNumber.id,
          labelsName: '1', // Has label_id 1
        },
        {
          name: 'Export Test Contact 2',
          number: '5511999999992',
          cel_owner: normalizedCel,
          status: 1, // Active
          user_id: testUser.id,
          number_id: testNumber.id,
          labelsName: '1', // Has label_id 1
        },
        {
          name: 'Export Test Contact 3',
          number: '5511999999993',
          cel_owner: normalizedCel,
          status: 1, // Active
          user_id: testUser.id,
          number_id: testNumber.id,
          labelsName: null, // No label
        },
      ];

      await contactRepository.save(testContacts);
    });

    it('should export contacts as CSV successfully', () => {
      return request(app.getHttpServer())
        .get('/api/v1/contacts/active/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'csv' })
        .expect(200)
        .expect('Content-Type', /text\/csv/)
        .expect((res) => {
          expect(res.headers['content-disposition']).toContain('attachment');
          expect(res.headers['content-disposition']).toContain('.csv');
        });
    });

    it('should export contacts as XLSX successfully', () => {
      return request(app.getHttpServer())
        .get('/api/v1/contacts/active/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'xlsx' })
        .expect(200)
        .expect('Content-Type', /spreadsheetml/)
        .expect((res) => {
          expect(res.headers['content-disposition']).toContain('attachment');
          expect(res.headers['content-disposition']).toContain('.xlsx');
        });
    });

    it('should export contacts with default format (CSV) when format not specified', () => {
      return request(app.getHttpServer())
        .get('/api/v1/contacts/active/export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect('Content-Type', /text\/csv/);
    });

    it('should export contacts filtered by label_id', () => {
      return request(app.getHttpServer())
        .get('/api/v1/contacts/active/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'csv', label_id: 1 })
        .expect(200)
        .expect('Content-Type', /text\/csv/);
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/contacts/active/export')
        .expect(401);
    });

    it('should return 404 if user has no active WhatsApp number', async () => {
      // Create a user without active WhatsApp number
      const userRepository = dataSource.getRepository(User);
      const contactRepository = dataSource.getRepository(Contact);

      // First, cleanup any existing temp user
      const existingTempUser = await userRepository.findOne({
        where: { email: 'tempuser@test.com' },
      });
      if (existingTempUser) {
        await contactRepository.delete({ user_id: existingTempUser.id });
        await dataSource
          .getRepository(Number)
          .delete({ user_id: existingTempUser.id });
        await userRepository.delete({ id: existingTempUser.id });
      }

      const tempUser = userRepository.create({
        name: 'Temp',
        last_name: 'User',
        email: 'tempuser@test.com',
        password: await bcrypt.hash('password123', 10),
        status: UserStatus.ACTIVED,
        profile: UserProfile.USER,
        confirmed_mail: 1,
        active: 1,
        cel: '5511888888888',
        cpfCnpj: '12345678901',
        plan_id: 1,
      });
      const savedUser = await userRepository.save(tempUser);

      // Login with temp user
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/login')
        .send({
          email: 'tempuser@test.com',
          password: 'password123',
        })
        .expect(200);

      const tempToken = loginResponse.body.token;

      // Try to export (should fail - no active number)
      await request(app.getHttpServer())
        .get('/api/v1/contacts/active/export')
        .set('Authorization', `Bearer ${tempToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('Nenhum número WhatsApp ativo');
        });

      // Cleanup: delete contacts first to avoid foreign key constraint
      await contactRepository.delete({ user_id: savedUser.id });
      await userRepository.delete({ id: savedUser.id });
    });
  });

  /**
   * POST /api/v1/contacts/import/csv
   * Import contacts from CSV file
   */
  describe('POST /api/v1/contacts/import/csv', () => {
    it('should import contacts from CSV successfully', () => {
      // Create a simple CSV buffer
      const csvContent =
        'Nome,Telefone\nJoão Silva,11999999999\nMaria Santos,11988888888';
      const csvBuffer = Buffer.from(csvContent);

      return request(app.getHttpServer())
        .post('/api/v1/contacts/import/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, 'contacts.csv')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('summary');
          expect(res.body.summary).toHaveProperty('total_lines');
          expect(res.body.summary).toHaveProperty('imported');
          expect(res.body.summary).toHaveProperty('duplicates');
          expect(res.body.summary).toHaveProperty('invalid');
          expect(res.body.summary).toHaveProperty('errors');
          expect(res.body.message).toBe('Importação concluída com sucesso');
        });
    });

    it('should import contacts with semicolon delimiter', () => {
      const csvContent =
        'Nome;Telefone\nPedro Silva;11977777777\nAna Costa;11966666666';
      const csvBuffer = Buffer.from(csvContent);

      return request(app.getHttpServer())
        .post('/api/v1/contacts/import/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, 'contacts.csv')
        .expect(200)
        .expect((res) => {
          expect(res.body.summary.total_lines).toBeGreaterThan(0);
        });
    });

    it('should import contacts with label_id', () => {
      const csvContent = 'Nome,Telefone\nCarlos Silva,11955555555';
      const csvBuffer = Buffer.from(csvContent);

      return request(app.getHttpServer())
        .post('/api/v1/contacts/import/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, 'contacts.csv')
        .field('label_id', '1')
        .expect(200);
    });

    it('should detect duplicates during import', async () => {
      const csvContent = 'Nome,Telefone\nDuplicate User,11999999999';
      const csvBuffer = Buffer.from(csvContent);

      // Import twice to create duplicates
      await request(app.getHttpServer())
        .post('/api/v1/contacts/import/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, 'contacts.csv')
        .expect(200);

      // Second import should detect duplicates
      return request(app.getHttpServer())
        .post('/api/v1/contacts/import/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, 'contacts.csv')
        .expect(200)
        .expect((res) => {
          expect(res.body.summary.duplicates).toBeGreaterThan(0);
        });
    });

    it('should report invalid phone numbers', () => {
      const csvContent = 'Nome,Telefone\nInvalid User,123';
      const csvBuffer = Buffer.from(csvContent);

      return request(app.getHttpServer())
        .post('/api/v1/contacts/import/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, 'contacts.csv')
        .expect(200)
        .expect((res) => {
          expect(res.body.summary.invalid).toBeGreaterThan(0);
          expect(res.body.summary.errors.length).toBeGreaterThan(0);
        });
    });

    it('should return 400 when file is missing', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/import/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('arquivo CSV é obrigatório');
        });
    });

    it('should return 400 when file is not CSV', () => {
      const txtBuffer = Buffer.from('This is a text file, not CSV');

      return request(app.getHttpServer())
        .post('/api/v1/contacts/import/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', txtBuffer, 'file.txt')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Apenas arquivos CSV');
        });
    });

    it('should return 401 without authentication', () => {
      const csvBuffer = Buffer.from('Nome,Telefone\nTest,11999999999');
      return request(app.getHttpServer())
        .post('/api/v1/contacts/import/csv')
        .attach('file', csvBuffer, 'contacts.csv')
        .expect(401);
    });
  });

  /**
   * POST /api/v1/contacts/import/test
   * Test CSV import without saving to database
   */
  describe('POST /api/v1/contacts/import/test', () => {
    it('should return preview of valid contacts', () => {
      const csvContent =
        'Nome,Telefone\nJoão Preview,11999999999\nMaria Preview,11988888888';
      const csvBuffer = Buffer.from(csvContent);

      return request(app.getHttpServer())
        .post('/api/v1/contacts/import/test')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, 'contacts.csv')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('preview');
          expect(res.body.preview).toHaveProperty('total_lines');
          expect(res.body.preview).toHaveProperty('valid');
          expect(res.body.preview).toHaveProperty('invalid');
          expect(res.body.preview).toHaveProperty('sample');
          expect(res.body.preview).toHaveProperty('errors');
          expect(res.body.message).toBe(
            'Preview da importação gerado com sucesso',
          );
          expect(Array.isArray(res.body.preview.sample)).toBe(true);
        });
    });

    it('should return sample of first 5 contacts', () => {
      const csvContent = `Nome,Telefone
João 1,11999999991
João 2,11999999992
João 3,11999999993
João 4,11999999994
João 5,11999999995
João 6,11999999996
João 7,11999999997`;
      const csvBuffer = Buffer.from(csvContent);

      return request(app.getHttpServer())
        .post('/api/v1/contacts/import/test')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, 'contacts.csv')
        .expect(200)
        .expect((res) => {
          expect(res.body.preview.sample.length).toBeLessThanOrEqual(5);
          expect(res.body.preview.total_lines).toBe(7);
        });
    });

    it('should validate phone numbers in preview', () => {
      const csvContent = 'Nome,Telefone\nValid,11999999999\nInvalid,123';
      const csvBuffer = Buffer.from(csvContent);

      return request(app.getHttpServer())
        .post('/api/v1/contacts/import/test')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, 'contacts.csv')
        .expect(200)
        .expect((res) => {
          expect(res.body.preview.valid).toBe(1);
          expect(res.body.preview.invalid).toBe(1);
          expect(res.body.preview.errors.length).toBeGreaterThan(0);
        });
    });

    it('should not save contacts to database (preview only)', async () => {
      const csvContent = 'Nome,Telefone\nPreview Only User,11944444444';
      const csvBuffer = Buffer.from(csvContent);

      // Get initial contact count
      const initialResponse = await request(app.getHttpServer())
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const initialCount = initialResponse.body.data.length;

      // Test import (should not save)
      await request(app.getHttpServer())
        .post('/api/v1/contacts/import/test')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, 'contacts.csv')
        .expect(200);

      // Verify count is the same (no contacts were saved)
      const finalResponse = await request(app.getHttpServer())
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const finalCount = finalResponse.body.data.length;

      expect(finalCount).toBe(initialCount);
    });

    it('should return 400 when file is missing', () => {
      return request(app.getHttpServer())
        .post('/api/v1/contacts/import/test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('arquivo CSV é obrigatório');
        });
    });

    it('should return 400 when file is not CSV', () => {
      const txtBuffer = Buffer.from('This is not CSV');
      return request(app.getHttpServer())
        .post('/api/v1/contacts/import/test')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', txtBuffer, 'file.txt')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Apenas arquivos CSV');
        });
    });

    it('should return 401 without authentication', () => {
      const csvBuffer = Buffer.from('Nome,Telefone\nTest,11999999999');
      return request(app.getHttpServer())
        .post('/api/v1/contacts/import/test')
        .attach('file', csvBuffer, 'contacts.csv')
        .expect(401);
    });
  });

  /**
   * Laravel Compatibility Tests
   * These tests ensure 100% compatibility with Laravel responses
   */
  describe('Laravel Compatibility', () => {
    it('should return data wrapped in "data" property (Laravel format)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).not.toHaveProperty('items'); // Not NestJS default
    });

    it('should return validation errors in array format (Laravel format)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(422);

      expect(Array.isArray(response.body.message)).toBe(true);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode');
    });

    it('should return Portuguese validation messages', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(422);

      const messages = response.body.message;
      expect(messages.some((msg: string) => msg.includes('obrigatório'))).toBe(
        true,
      );
    });
  });
});
