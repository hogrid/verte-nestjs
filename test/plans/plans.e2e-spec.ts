import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ValidationExceptionFilter } from '../../src/common/filters/validation-exception.filter';

/**
 * Plans Module E2E Tests
 * Tests compatibility with Laravel PlansController
 *
 * Endpoints tested:
 * - GET /api/v1/config/plans (list all plans)
 * - GET /api/v1/config/plans/:id (get plan by ID)
 */
describe('Plans Module (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Enable class-validator to use NestJS dependency injection
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    // Apply Laravel-compatible validation exception filter
    app.useGlobalFilters(new ValidationExceptionFilter());

    // Apply same configuration as main.ts
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/config/plans', () => {
    it('should list all plans with Laravel-compatible response structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/plans')
        .expect(200);

      // Validate Laravel response structure
      expect(response.body).toHaveProperty('meta');
      expect(response.body).toHaveProperty('data');

      // Validate meta structure (Laravel pagination format)
      expect(response.body.meta).toEqual({
        current_page: 0,
        from: 0,
        to: 0,
        per_page: 0,
        total: 0,
        last_page: 0,
      });

      // Validate data is array
      expect(Array.isArray(response.body.data)).toBe(true);

      // If there are plans, validate structure
      if (response.body.data.length > 0) {
        const plan = response.body.data[0];

        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('value');
        expect(plan).toHaveProperty('value_promotion');
        expect(plan).toHaveProperty('unlimited');
        expect(plan).toHaveProperty('medias');
        expect(plan).toHaveProperty('reports');
        expect(plan).toHaveProperty('schedule');
        expect(plan).toHaveProperty('created_at');
        expect(plan).toHaveProperty('updated_at');

        // Validate types
        expect(typeof plan.id).toBe('number');
        expect(typeof plan.name).toBe('string');
        expect(typeof plan.value).toBe('number');
        expect(typeof plan.value_promotion).toBe('number');
      }
    });

    it('should filter plans by search parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/plans')
        .query({ search: 'Básico' })
        .expect(200);

      expect(response.body).toHaveProperty('data');

      // If results found, verify they match search
      if (response.body.data.length > 0) {
        response.body.data.forEach((plan: any) => {
          expect(plan.name.toLowerCase()).toContain('básico');
        });
      }
    });

    it('should order plans by asc (default)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/plans')
        .query({ order: 'asc' })
        .expect(200);

      expect(response.body).toHaveProperty('data');

      // If multiple plans, verify ascending order
      if (response.body.data.length > 1) {
        const ids = response.body.data.map((plan: any) => plan.id);
        const sortedIds = [...ids].sort((a, b) => a - b);
        expect(ids).toEqual(sortedIds);
      }
    });

    it('should order plans by desc', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/plans')
        .query({ order: 'desc' })
        .expect(200);

      expect(response.body).toHaveProperty('data');

      // If multiple plans, verify descending order
      if (response.body.data.length > 1) {
        const ids = response.body.data.map((plan: any) => plan.id);
        const sortedIds = [...ids].sort((a, b) => b - a);
        expect(ids).toEqual(sortedIds);
      }
    });

    it('should work without authentication (public endpoint)', async () => {
      // No auth token provided - should still work
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/plans')
        .expect(200);

      expect(response.body).toHaveProperty('meta');
      expect(response.body).toHaveProperty('data');
    });

    it('should return empty array when search finds no results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/plans')
        .query({ search: 'NonExistentPlanNameXYZ123' })
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('should handle both search and order parameters together', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/plans')
        .query({ search: 'Plano', order: 'desc' })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/config/plans/:id', () => {
    it('should return a specific plan by ID with Laravel-compatible structure', async () => {
      // First, get all plans to find a valid ID
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/config/plans')
        .expect(200);

      // Skip test if no plans exist
      if (listResponse.body.data.length === 0) {
        console.warn('⚠️  No plans found in database - skipping test');
        return;
      }

      const planId = listResponse.body.data[0].id;

      // Get specific plan
      const response = await request(app.getHttpServer())
        .get(`/api/v1/config/plans/${planId}`)
        .expect(200);

      // Validate Laravel response structure (data wrapper)
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBeDefined();

      const plan = response.body.data;

      // Validate all required fields
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('value');
      expect(plan).toHaveProperty('value_promotion');
      expect(plan).toHaveProperty('unlimited');
      expect(plan).toHaveProperty('medias');
      expect(plan).toHaveProperty('reports');
      expect(plan).toHaveProperty('schedule');
      expect(plan).toHaveProperty('created_at');
      expect(plan).toHaveProperty('updated_at');

      // Validate types
      expect(typeof plan.id).toBe('number');
      expect(typeof plan.name).toBe('string');
      expect(typeof plan.value).toBe('number');
      expect(typeof plan.value_promotion).toBe('number');

      // Validate correct ID
      expect(plan.id).toBe(planId);
    });

    it('should return 404 for non-existent plan ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/plans/999999')
        .expect(404);

      // Validate error structure
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body.message).toContain('Plan with ID 999999 not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/plans/invalid-id')
        .expect(400);

      // Validate error structure
      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should work without authentication (public endpoint)', async () => {
      // First, get a valid plan ID
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/config/plans')
        .expect(200);

      // Skip if no plans
      if (listResponse.body.data.length === 0) {
        console.warn('⚠️  No plans found in database - skipping test');
        return;
      }

      const planId = listResponse.body.data[0].id;

      // No auth token provided - should still work
      const response = await request(app.getHttpServer())
        .get(`/api/v1/config/plans/${planId}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.id).toBe(planId);
    });

    it('should return plan with all nullable fields', async () => {
      // Get any plan
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/config/plans')
        .expect(200);

      if (listResponse.body.data.length === 0) {
        console.warn('⚠️  No plans found in database - skipping test');
        return;
      }

      const planId = listResponse.body.data[0].id;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/config/plans/${planId}`)
        .expect(200);

      const plan = response.body.data;

      // Validate nullable fields exist (even if null)
      expect(plan).toHaveProperty('code_mp');
      expect(plan).toHaveProperty('code_product');
      expect(plan).toHaveProperty('deleted_at');
    });
  });

  describe('POST /api/v1/config/plans', () => {
    let adminToken: string;
    let userToken: string;

    beforeAll(async () => {
      // Create and login as admin to get JWT token
      const timestamp = Date.now();
      const adminRegisterData = {
        name: 'Admin Test Plans',
        email: `admin-plans-${timestamp}@test.com`,
        cel: '11999998888', // Required field
        cpfCnpj: '12345678909', // Valid CPF with correct check digits
        password: 'Test@1234',
        password_confirmation: 'Test@1234',
        plan_id: 1,
        permission: 'administrator',
      };

      const adminRegister = await request(app.getHttpServer())
        .post('/api/v1/register')
        .send(adminRegisterData);

      // Check if register was successful
      if (adminRegister.status !== 200) {
        console.error('Admin registration failed:', adminRegister.body);
        throw new Error('Admin registration failed');
      }

      const adminLoginResponse = await request(app.getHttpServer())
        .post('/api/v1/login')
        .send({
          email: adminRegisterData.email,
          password: adminRegisterData.password,
        });

      if (!adminLoginResponse.body.token) {
        console.error('Admin login failed:', adminLoginResponse.body);
        throw new Error('Admin login failed');
      }

      adminToken = adminLoginResponse.body.token;

      // Create and login as regular user (non-admin)
      const timestamp2 = Date.now() + 1;
      const userRegisterData = {
        name: 'User Test Plans',
        email: `user-plans-${timestamp2}@test.com`,
        cel: '11988887777', // Required field
        cpfCnpj: '11144477735', // Valid CPF with correct check digits
        password: 'Test@1234',
        password_confirmation: 'Test@1234',
        plan_id: 1,
        permission: 'user',
      };

      const userRegister = await request(app.getHttpServer())
        .post('/api/v1/register')
        .send(userRegisterData);

      if (userRegister.status !== 200) {
        console.error('User registration failed:', userRegister.body);
        throw new Error('User registration failed');
      }

      const userLoginResponse = await request(app.getHttpServer())
        .post('/api/v1/login')
        .send({
          email: userRegisterData.email,
          password: userRegisterData.password,
        });

      if (!userLoginResponse.body.token) {
        console.error('User login failed:', userLoginResponse.body);
        throw new Error('User login failed');
      }

      userToken = userLoginResponse.body.token;
    });

    it('should create a new plan with admin authentication', async () => {
      const newPlan = {
        name: 'Plano E2E Test',
        value: 199.9,
        value_promotion: 149.9,
        unlimited: 0,
        medias: 5,
        reports: 10,
        schedule: 1,
        popular: 0,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/config/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newPlan)
        .expect(201);

      // Validate Laravel response structure
      expect(response.body).toHaveProperty('data');
      const plan = response.body.data;

      // Validate all fields
      expect(plan).toHaveProperty('id');
      expect(typeof plan.id).toBe('number');
      expect(plan.name).toBe(newPlan.name);
      expect(plan.value).toBe(newPlan.value);
      expect(plan.value_promotion).toBe(newPlan.value_promotion);
      expect(plan.unlimited).toBe(newPlan.unlimited);
      expect(plan.medias).toBe(newPlan.medias);
      expect(plan.reports).toBe(newPlan.reports);
      expect(plan.schedule).toBe(newPlan.schedule);
      expect(plan.popular).toBe(newPlan.popular);
      expect(plan).toHaveProperty('created_at');
      expect(plan).toHaveProperty('updated_at');
    });

    it('should create plan with optional fields (code_mp, code_product, popular)', async () => {
      const newPlan = {
        name: 'Plano Completo E2E',
        value: 299.9,
        value_promotion: 249.9,
        unlimited: 1,
        medias: 10,
        reports: 20,
        schedule: 1,
        popular: 1,
        code_mp: 'MP-TEST-001',
        code_product: 'PROD-TEST-001',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/config/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newPlan)
        .expect(201);

      const plan = response.body.data;

      expect(plan.code_mp).toBe(newPlan.code_mp);
      expect(plan.code_product).toBe(newPlan.code_product);
      expect(plan.popular).toBe(newPlan.popular);
    });

    it('should return 401 when not authenticated', async () => {
      const newPlan = {
        name: 'Plano Sem Auth',
        value: 99.9,
        value_promotion: 79.9,
        unlimited: 0,
        medias: 1,
        reports: 1,
        schedule: 0,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/config/plans')
        .send(newPlan)
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 403 when user is not admin', async () => {
      const newPlan = {
        name: 'Plano User Comum',
        value: 99.9,
        value_promotion: 79.9,
        unlimited: 0,
        medias: 1,
        reports: 1,
        schedule: 0,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/config/plans')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newPlan)
        .expect(403);

      expect(response.body).toHaveProperty('statusCode', 403);
      expect(response.body.message).toContain('administradores');
    });

    it('should return 422 for missing required fields', async () => {
      const invalidPlan = {
        name: 'Plano Incompleto',
        // Missing: value, value_promotion, unlimited, medias, reports, schedule
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/config/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPlan)
        .expect(422);

      expect(response.body).toHaveProperty('statusCode', 422);
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should return 422 for invalid field types', async () => {
      const invalidPlan = {
        name: 'Plano Tipos Errados',
        value: 'not-a-number', // Should be number
        value_promotion: 149.9,
        unlimited: 0,
        medias: 5,
        reports: 10,
        schedule: 1,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/config/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPlan)
        .expect(422);

      expect(response.body).toHaveProperty('statusCode', 422);
      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('value')]),
      );
    });

    it('should return 422 for invalid values (negative numbers)', async () => {
      const invalidPlan = {
        name: 'Plano Valores Negativos',
        value: -100, // Should be >= 0
        value_promotion: 149.9,
        unlimited: 0,
        medias: 5,
        reports: 10,
        schedule: 1,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/config/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPlan)
        .expect(422);

      expect(response.body).toHaveProperty('statusCode', 422);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('value deve ser maior ou igual a 0'),
        ]),
      );
    });

    it('should return 422 for invalid unlimited value (not 0 or 1)', async () => {
      const invalidPlan = {
        name: 'Plano Unlimited Inválido',
        value: 199.9,
        value_promotion: 149.9,
        unlimited: 2, // Should be 0 or 1
        medias: 5,
        reports: 10,
        schedule: 1,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/config/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPlan)
        .expect(422);

      expect(response.body).toHaveProperty('statusCode', 422);
      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('unlimited deve ser 0 ou 1')]),
      );
    });

    it('should return 422 for name too short', async () => {
      const invalidPlan = {
        name: 'AB', // Min length is 3
        value: 199.9,
        value_promotion: 149.9,
        unlimited: 0,
        medias: 5,
        reports: 10,
        schedule: 1,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/config/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPlan)
        .expect(422);

      expect(response.body).toHaveProperty('statusCode', 422);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('name deve ter no mínimo 3 caracteres'),
        ]),
      );
    });
  });
});
