import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { BadRequestToValidationFilter } from '../../src/common/filters/bad-request-to-validation.filter';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Campaigns E2E Tests (FASE 2: Públicos Simplificados/Custom)
 * Tests all 8 endpoints:
 * - GET /api/v1/campaigns/simplified/public
 * - GET /api/v1/campaigns/simplified/public/:id
 * - POST /api/v1/campaigns/simplified/public
 * - PUT /api/v1/campaigns/simplified/public/:id
 * - POST /api/v1/campaigns/custom/public
 * - GET /api/v1/campaigns/custom/public
 * - PUT /api/v1/campaigns/custom/public/:id
 * - POST /api/v1/campaigns/label/public
 *
 * Compatibilidade Laravel: 100%
 */
describe('CampaignsController (e2e) - FASE 2: Públicos', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testUserId: number;
  let testNumberId: number;
  let testPublicId: number;
  let testSimplifiedPublicId: number;
  let testCustomPublicId: number;
  let testContactId: number;
  let testLabelId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same validation as main.ts
    app.useGlobalFilters(new BadRequestToValidationFilter());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        // Custom exception factory to format errors like Laravel
        exceptionFactory: (errors) => {
          const formattedErrors: Record<string, string[]> = {};

          errors.forEach((error) => {
            if (error.constraints) {
              formattedErrors[error.property] = Object.values(
                error.constraints,
              );
            }
          });

          return new BadRequestException({
            errors: formattedErrors,
            statusCode: 422,
          });
        },
      }),
    );

    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Setup: Create test user with plan
    const hashedPassword = await bcrypt.hash('password123', 10);
    await dataSource.query(`
      INSERT INTO users (name, email, password, cpfCnpj, cel, status, profile, confirmed_mail, active, plan_id, created_at, updated_at)
      VALUES ('Publics Test User', 'publics.test@example.com', '${hashedPassword}', '12345678901', '11999999999', 'actived', 'user', 1, 1, 1, NOW(), NOW())
    `);

    const [user] = await dataSource.query(
      `SELECT id FROM users WHERE email = 'publics.test@example.com' LIMIT 1`,
    );
    testUserId = user.id;

    // Create test number (WhatsApp instance)
    await dataSource.query(`
      INSERT INTO numbers (user_id, name, instance, status, status_connection, cel, created_at, updated_at)
      VALUES (${testUserId}, 'Test WhatsApp', 'test-instance', 1, 1, '5511999999999', NOW(), NOW())
    `);

    const [number] = await dataSource.query(
      `SELECT id FROM numbers WHERE user_id = ${testUserId} LIMIT 1`,
    );
    testNumberId = number.id;

    // Create test public
    await dataSource.query(`
      INSERT INTO publics (user_id, number_id, name, status, created_at, updated_at)
      VALUES (${testUserId}, ${testNumberId}, 'Test Public for Simplified', 0, NOW(), NOW())
    `);

    const [publicRecord] = await dataSource.query(
      `SELECT id FROM publics WHERE user_id = ${testUserId} LIMIT 1`,
    );
    testPublicId = publicRecord.id;

    // Create test label
    await dataSource.query(`
      INSERT INTO labels (user_id, name, created_at, updated_at)
      VALUES (${testUserId}, 'PROJECT=verte', NOW(), NOW())
    `);

    const [label] = await dataSource.query(
      `SELECT id FROM labels WHERE user_id = ${testUserId} LIMIT 1`,
    );
    testLabelId = label.id;

    // Create test contacts with labels
    await dataSource.query(`
      INSERT INTO contacts (user_id, public_id, number_id, name, number, cel_owner, status, labels, created_at, updated_at)
      VALUES
        (${testUserId}, ${testPublicId}, ${testNumberId}, 'Contact 1', '5511988888888', '5511999999999', 1, '["PROJECT=verte","STATUS=ativo"]', NOW(), NOW()),
        (${testUserId}, ${testPublicId}, ${testNumberId}, 'Contact 2', '5511977777777', '5511999999999', 1, '["PROJECT=verte"]', NOW(), NOW()),
        (${testUserId}, ${testPublicId}, ${testNumberId}, 'Contact 3', '5511966666666', '5511999999999', 1, '[]', NOW(), NOW())
    `);

    const [contact] = await dataSource.query(
      `SELECT id FROM contacts WHERE user_id = ${testUserId} LIMIT 1`,
    );
    testContactId = contact.id;

    // Create public_by_contact relationships
    await dataSource.query(`
      INSERT INTO public_by_contact (user_id, public_id, contact_id, number_id, label, status, created_at, updated_at)
      SELECT ${testUserId}, ${testPublicId}, id, ${testNumberId}, labels, 1, NOW(), NOW()
      FROM contacts WHERE user_id = ${testUserId}
    `);

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/login')
      .send({
        email: 'publics.test@example.com',
        password: 'password123',
      })
      .expect(200);

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Cleanup in reverse order of dependencies
    await dataSource.query(
      `DELETE FROM public_by_contact WHERE user_id = ${testUserId}`,
    );
    await dataSource.query(
      `DELETE FROM simplified_publics WHERE user_id = ${testUserId}`,
    );
    await dataSource.query(
      `DELETE FROM custom_publics WHERE user_id = ${testUserId}`,
    );
    await dataSource.query(
      `DELETE FROM contacts WHERE user_id = ${testUserId}`,
    );
    await dataSource.query(`DELETE FROM labels WHERE user_id = ${testUserId}`);
    await dataSource.query(`DELETE FROM publics WHERE user_id = ${testUserId}`);
    await dataSource.query(`DELETE FROM numbers WHERE user_id = ${testUserId}`);
    await dataSource.query(`DELETE FROM users WHERE id = ${testUserId}`);

    await app.close();
  });

  /**
   * GET /api/v1/campaigns/simplified/public
   * List simplified public contacts
   */
  describe('GET /api/v1/campaigns/simplified/public', () => {
    it('should list simplified public contacts with public_id', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/campaigns/simplified/public?public_id=${testPublicId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          // Verify contact structure
          const contact = res.body.data[0];
          expect(contact).toHaveProperty('id');
          expect(contact).toHaveProperty('name');
          expect(contact).toHaveProperty('number');
        });
    });

    it('should filter by labels (PROJECT=verte)', () => {
      return request(app.getHttpServer())
        .get(
          `/api/v1/campaigns/simplified/public?public_id=${testPublicId}&labels=["PROJECT=verte"]`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThanOrEqual(2);
          // All contacts should have PROJECT=verte label
          res.body.data.forEach((contact: any) => {
            expect(contact.label || '').toContain('PROJECT=verte');
          });
        });
    });

    it('should filter by search term', () => {
      return request(app.getHttpServer())
        .get(
          `/api/v1/campaigns/simplified/public?public_id=${testPublicId}&search=Contact 1`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].name).toContain('Contact 1');
        });
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/campaigns/simplified/public?public_id=${testPublicId}`)
        .expect(401);
    });
  });

  /**
   * GET /api/v1/campaigns/simplified/public/:id
   * Show simplified public details
   */
  describe('GET /api/v1/campaigns/simplified/public/:id', () => {
    beforeAll(async () => {
      // Create a simplified public for this test
      await dataSource.query(`
        INSERT INTO simplified_publics (user_id, public_id, number_id, status, created_at, updated_at)
        VALUES (${testUserId}, ${testPublicId}, ${testNumberId}, 2, NOW(), NOW())
      `);

      const [sp] = await dataSource.query(
        `SELECT id FROM simplified_publics WHERE user_id = ${testUserId} LIMIT 1`,
      );
      testSimplifiedPublicId = sp.id;
    });

    it('should show simplified public details', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/campaigns/simplified/public/${testPublicId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('totalPublic');
          expect(res.body.data).toHaveProperty('totalWhatsSend');
          expect(res.body.data).toHaveProperty('totalWhatsReceive');
          expect(res.body.data).toHaveProperty('totalWhatsError');
          expect(typeof res.body.data.totalPublic).toBe('number');
        });
    });

    it('should return 404 if public not found', () => {
      return request(app.getHttpServer())
        .get('/api/v1/campaigns/simplified/public/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/campaigns/simplified/public/${testPublicId}`)
        .expect(401);
    });
  });

  /**
   * POST /api/v1/campaigns/simplified/public
   * Create simplified public
   */
  describe('POST /api/v1/campaigns/simplified/public', () => {
    it('should create simplified public', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/simplified/public')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: testPublicId,
          numberId: testNumberId,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('public_id');
          expect(res.body.data).toHaveProperty('status');
          expect(res.body.data.public_id).toBe(testPublicId);
          expect(res.body.data.status).toBe(2); // processing
        });
    });

    it('should validate required field id', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/simplified/public')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          numberId: testNumberId,
        })
        .expect(422)
        .expect((res) => {
          expect(res.body).toHaveProperty('errors');
          expect(res.body.errors).toHaveProperty('id');
        });
    });

    it('should use active number if numberId not provided', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/simplified/public')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: testPublicId,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('number_id');
          expect(res.body.data.number_id).toBe(testNumberId);
        });
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/simplified/public')
        .send({
          id: testPublicId,
        })
        .expect(401);
    });
  });

  /**
   * PUT /api/v1/campaigns/simplified/public/:id
   * Update/cancel simplified public
   */
  describe('PUT /api/v1/campaigns/simplified/public/:id', () => {
    it('should cancel simplified publics when cancel=true', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/campaigns/simplified/public/${testSimplifiedPublicId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cancel: true,
        })
        .expect(201) // Laravel returns 201 in PUT
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should return 201 status (Laravel compat)', async () => {
      // Create another simplified public to cancel
      await dataSource.query(`
        INSERT INTO simplified_publics (user_id, public_id, number_id, status, created_at, updated_at)
        VALUES (${testUserId}, ${testPublicId}, ${testNumberId}, 2, NOW(), NOW())
      `);

      const [sp] = await dataSource.query(
        `SELECT id FROM simplified_publics WHERE user_id = ${testUserId} AND status = 2 ORDER BY id DESC LIMIT 1`,
      );

      return request(app.getHttpServer())
        .put(`/api/v1/campaigns/simplified/public/${sp.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cancel: true,
        })
        .expect(201);
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/campaigns/simplified/public/${testSimplifiedPublicId}`)
        .send({
          cancel: true,
        })
        .expect(401);
    });
  });

  /**
   * POST /api/v1/campaigns/custom/public
   * Create custom public from XLSX
   */
  describe('POST /api/v1/campaigns/custom/public', () => {
    // Create a test XLSX file for upload tests
    const testXlsxPath = path.join(
      __dirname,
      '..',
      '..',
      'uploads',
      'custom_publics',
      'test-contacts.xlsx',
    );

    beforeAll(() => {
      // Create a minimal valid XLSX file (using a simple text file as placeholder)
      // In a real scenario, you would use a library like exceljs to create a proper XLSX
      const xlsxContent = Buffer.from([
        0x50, 0x4b, 0x03, 0x04, // XLSX is a ZIP file, this is the ZIP header
      ]);
      fs.writeFileSync(testXlsxPath, xlsxContent);
    });

    afterAll(() => {
      // Cleanup test file
      if (fs.existsSync(testXlsxPath)) {
        fs.unlinkSync(testXlsxPath);
      }
    });

    it('should create custom public with XLSX file', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/custom/public')
        .set('Authorization', `Bearer ${authToken}`)
        .field('id', testPublicId.toString())
        .field('numberId', testNumberId.toString())
        .attach('file', testXlsxPath)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('file_path');
          expect(res.body.data.public_id).toBe(testPublicId);
        });
    });

    it('should validate file is required', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/custom/public')
        .set('Authorization', `Bearer ${authToken}`)
        .field('id', testPublicId.toString())
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('obrigatório');
        });
    });

    it('should reject non-XLSX files', () => {
      const testTxtPath = path.join(
        __dirname,
        '..',
        '..',
        'uploads',
        'custom_publics',
        'test.txt',
      );
      fs.writeFileSync(testTxtPath, 'This is a text file');

      return request(app.getHttpServer())
        .post('/api/v1/campaigns/custom/public')
        .set('Authorization', `Bearer ${authToken}`)
        .field('id', testPublicId.toString())
        .attach('file', testTxtPath)
        .expect(400)
        .then(() => {
          fs.unlinkSync(testTxtPath);
        });
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/custom/public')
        .field('id', testPublicId.toString())
        .attach('file', testXlsxPath)
        .expect(401);
    });
  });

  /**
   * GET /api/v1/campaigns/custom/public
   * List custom public contacts (reuses simplified logic)
   */
  describe('GET /api/v1/campaigns/custom/public', () => {
    it('should list custom public contacts', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/campaigns/custom/public?public_id=${testPublicId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/campaigns/custom/public?public_id=${testPublicId}`)
        .expect(401);
    });
  });

  /**
   * PUT /api/v1/campaigns/custom/public/:id
   * Update/cancel custom public
   */
  describe('PUT /api/v1/campaigns/custom/public/:id', () => {
    beforeAll(async () => {
      // Create a custom public for this test
      await dataSource.query(`
        INSERT INTO custom_publics (user_id, public_id, number_id, status, file_path, created_at, updated_at)
        VALUES (${testUserId}, ${testPublicId}, ${testNumberId}, 2, 'test.xlsx', NOW(), NOW())
      `);

      const [cp] = await dataSource.query(
        `SELECT id FROM custom_publics WHERE user_id = ${testUserId} LIMIT 1`,
      );
      testCustomPublicId = cp.id;
    });

    it('should cancel custom publics when cancel=true', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/campaigns/custom/public/${testCustomPublicId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cancel: true,
        })
        .expect(201) // Laravel returns 201 in PUT
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should return 201 status (Laravel compat)', async () => {
      // Create another custom public to cancel
      await dataSource.query(`
        INSERT INTO custom_publics (user_id, public_id, number_id, status, file_path, created_at, updated_at)
        VALUES (${testUserId}, ${testPublicId}, ${testNumberId}, 2, 'test2.xlsx', NOW(), NOW())
      `);

      const [cp] = await dataSource.query(
        `SELECT id FROM custom_publics WHERE user_id = ${testUserId} AND status = 2 ORDER BY id DESC LIMIT 1`,
      );

      return request(app.getHttpServer())
        .put(`/api/v1/campaigns/custom/public/${cp.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cancel: true,
        })
        .expect(201);
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/campaigns/custom/public/${testCustomPublicId}`)
        .send({
          cancel: true,
        })
        .expect(401);
    });
  });

  /**
   * POST /api/v1/campaigns/label/public
   * Create label-filtered public
   */
  describe('POST /api/v1/campaigns/label/public', () => {
    it('should create label-filtered public', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/label/public')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: testPublicId,
          label: ['PROJECT=verte', 'STATUS=ativo'],
          numberId: testNumberId,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('labels');
          expect(res.body.data.public_id).toBe(testPublicId);
        });
    });

    it('should validate required fields (id, label)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/label/public')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          numberId: testNumberId,
        })
        .expect(422)
        .expect((res) => {
          expect(res.body).toHaveProperty('errors');
        });
    });

    it('should validate label is array', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/label/public')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: testPublicId,
          label: 'not-an-array',
          numberId: testNumberId,
        })
        .expect(422)
        .expect((res) => {
          expect(res.body).toHaveProperty('errors');
          expect(res.body.errors).toHaveProperty('label');
        });
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/label/public')
        .send({
          id: testPublicId,
          label: ['PROJECT=verte'],
        })
        .expect(401);
    });
  });
});
