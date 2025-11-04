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

/**
 * Campaigns E2E Tests (COMPLETO)
 * Tests all 8 CRUD endpoints:
 * - GET /api/v1/campaigns
 * - POST /api/v1/campaigns
 * - GET /api/v1/campaigns/:id
 * - POST /api/v1/campaigns/:id/cancel
 * - GET /api/v1/campaigns-check
 * - POST /api/v1/campaigns-check
 * - POST /api/v1/campaigns/change-status
 * - GET /api/v1/campaigns/custom/public/:id
 *
 * Compatibilidade Laravel: 100%
 */
describe('CampaignsController (e2e) - COMPLETO', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testUserId: number;
  let testNumberId: number;
  let testPublicId: number;
  let testCampaignId: number;

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
      VALUES ('Campaign Test User', 'campaign.test@example.com', '${hashedPassword}', '12345678901', '11999999999', 'actived', 'user', 1, 1, 1, NOW(), NOW())
    `);

    const [user] = await dataSource.query(
      `SELECT id FROM users WHERE email = 'campaign.test@example.com' LIMIT 1`,
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
      VALUES (${testUserId}, ${testNumberId}, 'Test Public', 0, NOW(), NOW())
    `);

    const [publicRecord] = await dataSource.query(
      `SELECT id FROM publics WHERE user_id = ${testUserId} LIMIT 1`,
    );
    testPublicId = publicRecord.id;

    // Create test contacts
    await dataSource.query(`
      INSERT INTO contacts (user_id, public_id, number_id, name, number, cel_owner, status, created_at, updated_at)
      VALUES
        (${testUserId}, ${testPublicId}, ${testNumberId}, 'Contact 1', '5511988888888', '5511999999999', 1, NOW(), NOW()),
        (${testUserId}, ${testPublicId}, ${testNumberId}, 'Contact 2', '5511977777777', '5511999999999', 1, NOW(), NOW()),
        (${testUserId}, ${testPublicId}, ${testNumberId}, 'Contact 3', '5511966666666', '5511999999999', 1, NOW(), NOW())
    `);

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/login')
      .send({
        email: 'campaign.test@example.com',
        password: 'password123',
      })
      .expect(200);

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Cleanup in reverse order of dependencies
    await dataSource.query(
      `DELETE FROM message_by_contacts WHERE user_id = ${testUserId}`,
    );
    await dataSource.query(`DELETE FROM messages WHERE user_id = ${testUserId}`);
    await dataSource.query(
      `DELETE FROM campaigns WHERE user_id = ${testUserId}`,
    );
    await dataSource.query(
      `DELETE FROM contacts WHERE user_id = ${testUserId}`,
    );
    await dataSource.query(`DELETE FROM publics WHERE user_id = ${testUserId}`);
    await dataSource.query(`DELETE FROM numbers WHERE user_id = ${testUserId}`);
    await dataSource.query(`DELETE FROM users WHERE id = ${testUserId}`);

    await app.close();
  });

  /**
   * GET /api/v1/campaigns
   * List campaigns with filters and pagination
   */
  describe('GET /api/v1/campaigns', () => {
    beforeAll(async () => {
      // Create test campaign for listing tests
      await dataSource.query(`
        INSERT INTO campaigns (user_id, number_id, public_id, name, type, status, total_contacts, date_end, created_at, updated_at)
        VALUES (${testUserId}, ${testNumberId}, ${testPublicId}, 'Test Campaign for Listing', 1, 0, 3, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), NOW())
      `);
    });

    it('should list campaigns successfully', () => {
      return request(app.getHttpServer())
        .get('/api/v1/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta).toHaveProperty('current_page');
          expect(res.body.meta).toHaveProperty('per_page');
          expect(res.body.meta).toHaveProperty('total');
        });
    });

    it('should filter campaigns by search term', () => {
      return request(app.getHttpServer())
        .get('/api/v1/campaigns?search=Listing')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].name).toContain('Listing');
        });
    });

    it('should paginate campaigns', () => {
      return request(app.getHttpServer())
        .get('/api/v1/campaigns?per_page=1&page=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.per_page).toBe(1);
          expect(res.body.meta.current_page).toBe(1);
        });
    });

    it('should order campaigns asc', () => {
      return request(app.getHttpServer())
        .get('/api/v1/campaigns?order=asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should order campaigns desc', () => {
      return request(app.getHttpServer())
        .get('/api/v1/campaigns?order=desc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should return 401 without auth token', () => {
      return request(app.getHttpServer()).get('/api/v1/campaigns').expect(401);
    });
  });

  /**
   * POST /api/v1/campaigns
   * Create a new campaign
   */
  describe('POST /api/v1/campaigns', () => {
    it('should create campaign successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Campaign Creation',
          number_id: testNumberId,
          public_id: testPublicId,
          messages: [
            {
              message: 'Hello {nome}! This is a test campaign.',
              type: 'text',
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.name).toBe('Test Campaign Creation');
          expect(res.body.data.status).toBe(0); // Pending
          expect(res.body.data.total_contacts).toBe(3); // 3 contacts created in beforeAll
          testCampaignId = res.body.data.id; // Save for other tests
        });
    });

    it('should create campaign with public_id="new" (default public)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Campaign with New Public',
          number_id: testNumberId,
          public_id: 'new',
          messages: [
            {
              message: 'Test message',
              type: 'text',
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.public_id).toBeDefined();
          expect(typeof res.body.data.public_id).toBe('number');
        });
    });

    it('should create scheduled campaign', () => {
      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + 1);

      return request(app.getHttpServer())
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Scheduled Campaign',
          number_id: testNumberId,
          public_id: testPublicId,
          messages: [
            {
              message: 'Scheduled message',
              type: 'text',
            },
          ],
          schedule_date: scheduleDate.toISOString(),
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.status).toBe(3); // Scheduled status
          expect(res.body.data.schedule_date).toBeDefined();
        });
    });

    it('should create campaign with multiple messages', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Multi Message Campaign',
          number_id: testNumberId,
          public_id: testPublicId,
          messages: [
            {
              message: 'First message',
              type: 'text',
            },
            {
              message: 'Second message',
              type: 'text',
            },
            {
              message: 'Third message',
              type: 'text',
            },
          ],
        })
        .expect(201);
    });

    it('should fail without name', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          number_id: testNumberId,
          public_id: testPublicId,
          messages: [{ message: 'Test', type: 'text' }],
        })
        .expect(422)
        .expect((res) => {
          expect(res.body).toHaveProperty('errors');
          expect(res.body.errors).toHaveProperty('name');
        });
    });

    it('should fail without number_id', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Campaign',
          public_id: testPublicId,
          messages: [{ message: 'Test', type: 'text' }],
        })
        .expect(422)
        .expect((res) => {
          expect(res.body).toHaveProperty('errors');
          expect(res.body.errors).toHaveProperty('number_id');
        });
    });

    it('should fail without public_id', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Campaign',
          number_id: testNumberId,
          messages: [{ message: 'Test', type: 'text' }],
        })
        .expect(422)
        .expect((res) => {
          expect(res.body).toHaveProperty('errors');
          expect(res.body.errors).toHaveProperty('public_id');
        });
    });

    it('should fail without messages', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Campaign',
          number_id: testNumberId,
          public_id: testPublicId,
        })
        .expect(422)
        .expect((res) => {
          expect(res.body).toHaveProperty('errors');
          expect(res.body.errors).toHaveProperty('messages');
        });
    });

    it('should fail with empty messages array', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Campaign',
          number_id: testNumberId,
          public_id: testPublicId,
          messages: [],
        })
        .expect(422)
        .expect((res) => {
          expect(res.body).toHaveProperty('errors');
          expect(res.body.errors).toHaveProperty('messages');
          expect(res.body.errors.messages).toContain(
            'Pelo menos uma mensagem é obrigatória.',
          );
        });
    });

    it('should fail with invalid number_id', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Campaign',
          number_id: 99999999,
          public_id: testPublicId,
          messages: [{ message: 'Test', type: 'text' }],
        })
        .expect(404);
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns')
        .send({
          name: 'Test Campaign',
          number_id: testNumberId,
          public_id: testPublicId,
          messages: [{ message: 'Test', type: 'text' }],
        })
        .expect(401);
    });
  });

  /**
   * GET /api/v1/campaigns/:id
   * Get campaign details
   */
  describe('GET /api/v1/campaigns/:id', () => {
    it('should get campaign details successfully', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/campaigns/${testCampaignId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201) // Laravel returns 201
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data.id).toBe(testCampaignId);
          expect(res.body.data).toHaveProperty('name');
          expect(res.body.data).toHaveProperty('messages');
          expect(res.body.data).toHaveProperty('public');
          expect(res.body.data).toHaveProperty('number');
        });
    });

    it('should return 404 for non-existent campaign', () => {
      return request(app.getHttpServer())
        .get('/api/v1/campaigns/99999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 without auth token', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/campaigns/${testCampaignId}`)
        .expect(401);
    });
  });

  /**
   * POST /api/v1/campaigns/:id/cancel
   * Cancel campaign
   */
  describe('POST /api/v1/campaigns/:id/cancel', () => {
    let campaignToCancel: number;

    beforeAll(async () => {
      // Create campaign specifically for cancellation test
      await dataSource.query(`
        INSERT INTO campaigns (user_id, number_id, public_id, name, type, status, total_contacts, date_end, created_at, updated_at)
        VALUES (${testUserId}, ${testNumberId}, ${testPublicId}, 'Campaign to Cancel', 1, 0, 3, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), NOW())
      `);

      const [campaign] = await dataSource.query(
        `SELECT id FROM campaigns WHERE name = 'Campaign to Cancel' AND user_id = ${testUserId} LIMIT 1`,
      );
      campaignToCancel = campaign.id;
    });

    it('should cancel campaign successfully', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/campaigns/${campaignToCancel}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toBe('Campanha cancelada com sucesso.');
        });
    });

    it('should verify campaign was canceled (status=3, canceled=1)', async () => {
      const [campaign] = await dataSource.query(
        `SELECT status, canceled FROM campaigns WHERE id = ${campaignToCancel}`,
      );

      expect(campaign.status).toBe(3);
      expect(campaign.canceled).toBe(1);
    });

    it('should return 404 for non-existent campaign', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/99999999/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 without auth token', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/campaigns/${campaignToCancel}/cancel`)
        .expect(401);
    });
  });

  /**
   * GET /api/v1/campaigns-check
   * Check active campaigns
   */
  describe('GET /api/v1/campaigns-check', () => {
    let activeCampaignId: number;

    beforeAll(async () => {
      // Create active campaign for check test
      await dataSource.query(`
        INSERT INTO campaigns (user_id, number_id, public_id, name, type, status, total_contacts, date_end, created_at, updated_at)
        VALUES (${testUserId}, ${testNumberId}, ${testPublicId}, 'Active Campaign', 1, 0, 5, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), NOW())
      `);

      const [campaign] = await dataSource.query(
        `SELECT id FROM campaigns WHERE name = 'Active Campaign' AND user_id = ${testUserId} LIMIT 1`,
      );
      activeCampaignId = campaign.id;
    });

    it('should list active campaigns successfully', () => {
      return request(app.getHttpServer())
        .get('/api/v1/campaigns-check')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('count');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.count).toBeGreaterThanOrEqual(1);
        });
    });

    it('should return 401 without auth token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/campaigns-check')
        .expect(401);
    });
  });

  /**
   * POST /api/v1/campaigns-check
   * Cancel multiple campaigns
   */
  describe('POST /api/v1/campaigns-check', () => {
    let campaign1Id: number;
    let campaign2Id: number;

    beforeAll(async () => {
      // Create 2 campaigns for bulk cancellation
      await dataSource.query(`
        INSERT INTO campaigns (user_id, number_id, public_id, name, type, status, total_contacts, date_end, created_at, updated_at)
        VALUES
          (${testUserId}, ${testNumberId}, ${testPublicId}, 'Bulk Cancel 1', 1, 0, 5, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), NOW()),
          (${testUserId}, ${testNumberId}, ${testPublicId}, 'Bulk Cancel 2', 1, 0, 5, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), NOW())
      `);

      const campaigns = await dataSource.query(
        `SELECT id FROM campaigns WHERE name LIKE 'Bulk Cancel%' AND user_id = ${testUserId} ORDER BY id`,
      );
      campaign1Id = campaigns[0].id;
      campaign2Id = campaigns[1].id;
    });

    it('should cancel multiple campaigns successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns-check')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaign_ids: [campaign1Id, campaign2Id],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('canceled');
          expect(res.body.canceled).toBe(2);
          expect(res.body.message).toContain('2 campanha(s) cancelada(s)');
        });
    });

    it('should verify campaigns were canceled', async () => {
      const campaigns = await dataSource.query(
        `SELECT status, canceled FROM campaigns WHERE id IN (${campaign1Id}, ${campaign2Id})`,
      );

      campaigns.forEach((c: any) => {
        expect(c.status).toBe(2);
        expect(c.canceled).toBe(1);
      });
    });

    it('should fail with empty campaign_ids array', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns-check')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaign_ids: [],
        })
        .expect(422)
        .expect((res) => {
          expect(res.body.errors).toHaveProperty('campaign_ids');
        });
    });

    it('should fail without campaign_ids field', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns-check')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(422);
    });

    it('should return 401 without auth token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns-check')
        .send({
          campaign_ids: [1, 2],
        })
        .expect(401);
    });
  });

  /**
   * POST /api/v1/campaigns/change-status
   * Change campaign status
   */
  describe('POST /api/v1/campaigns/change-status', () => {
    let campaignForStatusId: number;

    beforeAll(async () => {
      // Create campaign for status change test (status 0 = active)
      await dataSource.query(`
        INSERT INTO campaigns (user_id, number_id, public_id, name, type, status, total_contacts, date_end, created_at, updated_at)
        VALUES (${testUserId}, ${testNumberId}, ${testPublicId}, 'Status Change Campaign', 1, 0, 5, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), NOW())
      `);

      const [campaign] = await dataSource.query(
        `SELECT id FROM campaigns WHERE name = 'Status Change Campaign' AND user_id = ${testUserId} LIMIT 1`,
      );
      campaignForStatusId = campaign.id;
    });

    it('should change status from active (0) to paused (1)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/change-status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaign_id: campaignForStatusId,
          status: 1,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('campaign');
          expect(res.body.campaign.status).toBe(1);
          expect(res.body.campaign.status_formatted).toBe('Pausada');
        });
    });

    it('should change status from paused (1) to active (0)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/change-status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaign_id: campaignForStatusId,
          status: 0,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.campaign.status).toBe(0);
          expect(res.body.campaign.status_formatted).toBe('Ativa');
        });
    });

    it('should change status to canceled (2)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/change-status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaign_id: campaignForStatusId,
          status: 2,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.campaign.status).toBe(2);
          expect(res.body.campaign.status_formatted).toBe('Cancelada');
        });
    });

    it('should fail to change status from canceled (2) to any other', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/change-status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaign_id: campaignForStatusId,
          status: 0,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain(
            'Não é possível alterar o status de uma campanha cancelada',
          );
        });
    });

    it('should fail with invalid status value', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/change-status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaign_id: campaignForStatusId,
          status: 99,
        })
        .expect(422)
        .expect((res) => {
          expect(res.body.errors).toHaveProperty('status');
        });
    });

    it('should fail without campaign_id', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/change-status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 1,
        })
        .expect(422);
    });

    it('should return 404 for non-existent campaign', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/change-status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaign_id: 99999999,
          status: 1,
        })
        .expect(404);
    });

    it('should return 401 without auth token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/campaigns/change-status')
        .send({
          campaign_id: campaignForStatusId,
          status: 1,
        })
        .expect(401);
    });
  });

  /**
   * GET /api/v1/campaigns/custom/public/:id
   * Show custom public details
   */
  describe('GET /api/v1/campaigns/custom/public/:id', () => {
    let customPublicId: number;

    beforeAll(async () => {
      // Create custom public for test
      await dataSource.query(`
        INSERT INTO custom_publics (user_id, number_id, file, status, created_at, updated_at)
        VALUES (${testUserId}, ${testNumberId}, 'uploads/test.xlsx', 0, NOW(), NOW())
      `);

      const [customPublic] = await dataSource.query(
        `SELECT id FROM custom_publics WHERE user_id = ${testUserId} LIMIT 1`,
      );
      customPublicId = customPublic.id;
    });

    it('should get custom public details successfully', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/campaigns/custom/public/${customPublicId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data.id).toBe(customPublicId);
          expect(res.body.data).toHaveProperty('status');
          expect(res.body.data).toHaveProperty('file');
          expect(res.body.data).toHaveProperty('number_id');
        });
    });

    it('should return 404 for non-existent custom public', () => {
      return request(app.getHttpServer())
        .get('/api/v1/campaigns/custom/public/99999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 without auth token', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/campaigns/custom/public/${customPublicId}`)
        .expect(401);
    });
  });
});
