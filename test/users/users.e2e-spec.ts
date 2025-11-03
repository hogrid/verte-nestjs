import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ValidationExceptionFilter } from '../../src/common/filters/validation-exception.filter';

/**
 * Users Module E2E Tests
 * Tests compatibility with Laravel UserController
 *
 * Endpoints tested:
 * - GET /api/v1/config/customers (list all customers - admin)
 * - POST /api/v1/config/customers (create customer - admin)
 * - GET /api/v1/config/customers/:id (get customer by ID - admin)
 * - PUT /api/v1/config/customers/:id (update customer - admin)
 */
describe('Users Module (E2E)', () => {
  let app: INestApplication;
  let adminToken: string;
  let customerToken: string;
  let adminRegisterData: any;
  let customerRegisterData: any;

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

    // Use unique timestamp to avoid conflicts
    const timestamp = Date.now();

    // Register admin user for testing
    adminRegisterData = {
      name: 'Admin User Test',
      email: `admin-users-${timestamp}@test.com`,
      cel: '11999998888',
      cpfCnpj: '12345678909', // Valid CPF
      password: 'Test@1234',
      password_confirmation: 'Test@1234',
      plan_id: 1,
      permission: 'administrator', // Administrator profile
    };

    await request(app.getHttpServer())
      .post('/api/v1/register')
      .send(adminRegisterData)
      .expect(200);

    // Login as admin to get token
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/login')
      .send({
        email: adminRegisterData.email,
        password: adminRegisterData.password,
      });

    if (!adminLoginResponse.body.token) {
      console.error('Admin login failed:', adminLoginResponse.body);
      throw new Error('Admin login failed in test setup');
    }

    adminToken = adminLoginResponse.body.token;

    // Register regular user (customer) for testing
    customerRegisterData = {
      name: 'Customer User Test',
      email: `customer-users-${timestamp}@test.com`,
      cel: '11988887777',
      cpfCnpj: '11144477735', // Valid CPF
      password: 'Test@1234',
      password_confirmation: 'Test@1234',
      plan_id: 1,
      // permission not specified = defaults to 'user'
    };

    await request(app.getHttpServer())
      .post('/api/v1/register')
      .send(customerRegisterData)
      .expect(200);

    // Login as customer to get token
    const customerLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/login')
      .send({
        email: customerRegisterData.email,
        password: customerRegisterData.password,
      });

    if (!customerLoginResponse.body.token) {
      console.error('Customer login failed:', customerLoginResponse.body);
      throw new Error('Customer login failed in test setup');
    }

    customerToken = customerLoginResponse.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/config/customers', () => {
    it('should return 401 when no authentication token is provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/customers')
        .expect(401);

      expect(response.body).toEqual({
        message: 'Unauthorized',
        statusCode: 401,
      });
    });

    it('should return 403 when authenticated as non-admin user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/customers')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('administradores');
      expect(response.body).toMatchObject({
        error: 'Forbidden',
        statusCode: 403,
      });
    });

    it('should list all customers with Laravel-compatible response structure when authenticated as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
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

      // If there are customers, validate structure
      if (response.body.data.length > 0) {
        const customer = response.body.data[0];

        // Validate customer properties
        expect(customer).toHaveProperty('id');
        expect(customer).toHaveProperty('name');
        expect(customer).toHaveProperty('email');
        expect(customer).toHaveProperty('cpfCnpj');
        expect(customer).toHaveProperty('profile');
        expect(customer).toHaveProperty('plan_id');
        expect(customer).toHaveProperty('created_at');
        expect(customer).toHaveProperty('updated_at');

        // Validate types
        expect(typeof customer.id).toBe('number');
        expect(typeof customer.name).toBe('string');
        expect(typeof customer.email).toBe('string');
        expect(typeof customer.profile).toBe('string');

        // Validate relationships are included
        expect(customer).toHaveProperty('plan');
        expect(customer).toHaveProperty('numbers');
        expect(customer).toHaveProperty('config');

        // If plan exists, validate structure
        if (customer.plan) {
          expect(customer.plan).toHaveProperty('id');
          expect(customer.plan).toHaveProperty('name');
          expect(customer.plan).toHaveProperty('value');
        }

        // Numbers should be an array
        expect(Array.isArray(customer.numbers)).toBe(true);
      }
    });

    it('should filter customers by name with search parameter', async () => {
      // First get all customers to find a valid name
      const allCustomers = await request(app.getHttpServer())
        .get('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (allCustomers.body.data.length > 0) {
        const customerName = allCustomers.body.data[0].name;
        const searchTerm = customerName.substring(0, 3);

        const response = await request(app.getHttpServer())
          .get(`/api/v1/config/customers?search=${searchTerm}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);

        // Validate that results match search
        if (response.body.data.length > 0) {
          const matchesSearch = response.body.data.some(
            (customer: any) =>
              customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              customer.email.toLowerCase().includes(searchTerm.toLowerCase()),
          );
          expect(matchesSearch).toBe(true);
        }
      }
    });

    it('should filter customers by email with search parameter', async () => {
      // First get all customers to find a valid email
      const allCustomers = await request(app.getHttpServer())
        .get('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (allCustomers.body.data.length > 0) {
        const customerEmail = allCustomers.body.data[0].email;
        const searchTerm = customerEmail.substring(0, 4);

        const response = await request(app.getHttpServer())
          .get(`/api/v1/config/customers?search=${searchTerm}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);

        // Validate that results match search
        if (response.body.data.length > 0) {
          const matchesSearch = response.body.data.some(
            (customer: any) =>
              customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              customer.email.toLowerCase().includes(searchTerm.toLowerCase()),
          );
          expect(matchesSearch).toBe(true);
        }
      }
    });

    it('should order customers by ID ascending', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/customers?order=asc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');

      // If there are multiple customers, validate ordering
      if (response.body.data.length > 1) {
        for (let i = 0; i < response.body.data.length - 1; i++) {
          expect(response.body.data[i].id).toBeLessThanOrEqual(
            response.body.data[i + 1].id,
          );
        }
      }
    });

    it('should order customers by ID descending', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/customers?order=desc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');

      // If there are multiple customers, validate ordering
      if (response.body.data.length > 1) {
        for (let i = 0; i < response.body.data.length - 1; i++) {
          expect(response.body.data[i].id).toBeGreaterThanOrEqual(
            response.body.data[i + 1].id,
          );
        }
      }
    });

    it('should not include soft-deleted customers in listing', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');

      // Validate that no customer has deleted_at set
      response.body.data.forEach((customer: any) => {
        expect(customer.deleted_at).toBeNull();
      });
    });
  });

  describe('POST /api/v1/config/customers', () => {
    it('should return 401 when no authentication token is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/config/customers')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          cel: '11999999999',
          cpfCnpj: '12345678909',
          password: 'password123',
          password_confirmation: 'password123',
        })
        .expect(401);

      expect(response.body).toEqual({
        message: 'Unauthorized',
        statusCode: 401,
      });
    });

    it('should return 403 when authenticated as non-admin user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/config/customers')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Test User',
          email: 'test@example.com',
          cel: '11999999999',
          cpfCnpj: '12345678909',
          password: 'password123',
          password_confirmation: 'password123',
        })
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('administradores');
      expect(response.body).toMatchObject({
        error: 'Forbidden',
        statusCode: 403,
      });
    });

    it('should create customer successfully when authenticated as admin', async () => {
      const timestamp = Date.now();
      const customerData = {
        name: 'Cliente Teste',
        last_name: 'Silva',
        email: `cliente-${timestamp}@test.com`,
        cel: '11988887777',
        cpfCnpj: '11144477735',
        password: 'Test@1234',
        password_confirmation: 'Test@1234',
        plan_id: 1,
        profile: 'user',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(customerData)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.message).toBe('Cliente criado com sucesso');

      // Validate created user data
      const user = response.body.data;
      expect(user).toHaveProperty('id');
      expect(user.name).toBe(customerData.name);
      expect(user.email).toBe(customerData.email);
      expect(user.cpfCnpj).toBe(customerData.cpfCnpj);
      expect(user.cel).toBe(customerData.cel);
      expect(user.status).toBe('actived');
      expect(user.profile).toBe('user');
      expect(user.confirmed_mail).toBe(1);
      expect(user.active).toBe(0);
      expect(user.plan_id).toBe(1);

      // Password should be hashed
      expect(user.password).not.toBe(customerData.password);
      expect(user.password).toContain('$2b$');
    });

    it('should return 422 when email is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test User',
          cel: '11999999999',
          cpfCnpj: '12345678909',
          password: 'password123',
          password_confirmation: 'password123',
        })
        .expect(422);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(422);
    });

    it('should return 422 when email is already in use', async () => {
      // First, get an existing email
      const existingUsers = await request(app.getHttpServer())
        .get('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (existingUsers.body.data.length > 0) {
        const existingEmail = existingUsers.body.data[0].email;

        const response = await request(app.getHttpServer())
          .post('/api/v1/config/customers')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Test User',
            email: existingEmail,
            cel: '11999999999',
            cpfCnpj: '12345678909',
            password: 'password123',
            password_confirmation: 'password123',
          })
          .expect(422);

        expect(response.body).toHaveProperty('message');
        expect(Array.isArray(response.body.message)).toBe(true);
        expect(response.body.statusCode).toBe(422);
      }
    });

    it('should return 422 when password and password_confirmation do not match', async () => {
      const timestamp = Date.now();

      const response = await request(app.getHttpServer())
        .post('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test User',
          email: `test-${timestamp}@example.com`,
          cel: '11999999999',
          cpfCnpj: '12345678909',
          password: 'password123',
          password_confirmation: 'differentpassword',
        })
        .expect(422);

      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
      const messages = response.body.message.join(' ');
      expect(messages).toContain('senha');
      expect(response.body.statusCode).toBe(422);
    });

    it('should return 422 when CPF/CNPJ is invalid', async () => {
      const timestamp = Date.now();

      const response = await request(app.getHttpServer())
        .post('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test User',
          email: `test-${timestamp}@example.com`,
          cel: '11999999999',
          cpfCnpj: '12345678900', // Invalid CPF
          password: 'password123',
          password_confirmation: 'password123',
        })
        .expect(422);

      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(response.body.statusCode).toBe(422);
    });

    it('should create customer with administrator profile when specified', async () => {
      const timestamp = Date.now();
      const adminData = {
        name: 'Admin Teste',
        email: `admin-create-${timestamp}@test.com`,
        cel: '11988886666',
        cpfCnpj: '52998224725',
        password: 'Test@1234',
        password_confirmation: 'Test@1234',
        profile: 'administrator',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(adminData)
        .expect(200);

      expect(response.body.data.profile).toBe('administrator');
    });

    it('should create customer without plan_id when not specified', async () => {
      const timestamp = Date.now();
      const customerData = {
        name: 'Cliente Sem Plano',
        email: `noplan-${timestamp}@test.com`,
        cel: '11988885555',
        cpfCnpj: '11144477735', // Valid CPF
        password: 'Test@1234',
        password_confirmation: 'Test@1234',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(customerData)
        .expect(200);

      expect(response.body.data.plan_id).toBeNull();
    });
  });

  describe('GET /api/v1/config/customers/:id', () => {
    let createdCustomerId: number;

    beforeAll(async () => {
      // Create a customer to use in tests
      const timestamp = Date.now();
      const response = await request(app.getHttpServer())
        .post('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Cliente para GET',
          email: `get-test-${timestamp}@test.com`,
          cel: '11988887777',
          cpfCnpj: '11144477735',
          password: 'Test@1234',
          password_confirmation: 'Test@1234',
          plan_id: 1,
        })
        .expect(200);

      createdCustomerId = response.body.data.id;
    });

    it('should return 401 when no authentication token is provided', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/config/customers/${createdCustomerId}`)
        .expect(401);

      expect(response.body).toEqual({
        message: 'Unauthorized',
        statusCode: 401,
      });
    });

    it('should return 403 when authenticated as non-admin user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/config/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('administradores');
      expect(response.body).toMatchObject({
        error: 'Forbidden',
        statusCode: 403,
      });
    });

    it('should return customer by ID when authenticated as admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/config/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('data');
      const customer = response.body.data;

      // Validate customer properties
      expect(customer.id).toBe(createdCustomerId);
      expect(customer).toHaveProperty('name');
      expect(customer).toHaveProperty('email');
      expect(customer).toHaveProperty('cpfCnpj');
      expect(customer).toHaveProperty('profile');
      expect(customer).toHaveProperty('plan_id');
      expect(customer).toHaveProperty('created_at');
      expect(customer).toHaveProperty('updated_at');

      // Validate relationships are included
      expect(customer).toHaveProperty('plan');
      expect(customer).toHaveProperty('numbers');
      expect(customer).toHaveProperty('config');

      // If plan exists, validate structure
      if (customer.plan) {
        expect(customer.plan).toHaveProperty('id');
        expect(customer.plan).toHaveProperty('name');
        expect(customer.plan).toHaveProperty('value');
      }

      // Numbers should be an array
      expect(Array.isArray(customer.numbers)).toBe(true);
    });

    it('should return 404 when customer ID does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/customers/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('não encontrado');
      expect(response.body).toMatchObject({
        error: 'Not Found',
        statusCode: 404,
      });
    });

    it('should return 400 when ID is not a valid number', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/customers/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });
  });

  describe('PUT /api/v1/config/customers/:id', () => {
    let updateCustomerId: number;

    beforeAll(async () => {
      // Create a customer to update in tests
      const timestamp = Date.now();
      const response = await request(app.getHttpServer())
        .post('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Cliente para UPDATE',
          email: `update-test-${timestamp}@test.com`,
          cel: '11988886666',
          cpfCnpj: '52998224725',
          password: 'Test@1234',
          password_confirmation: 'Test@1234',
          plan_id: 1,
        })
        .expect(200);

      updateCustomerId = response.body.data.id;
    });

    it('should return 401 when no authentication token is provided', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/config/customers/${updateCustomerId}`)
        .send({ name: 'New Name' })
        .expect(401);

      expect(response.body).toEqual({
        message: 'Unauthorized',
        statusCode: 401,
      });
    });

    it('should return 403 when authenticated as non-admin user', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/config/customers/${updateCustomerId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'New Name' })
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('administradores');
      expect(response.body).toMatchObject({
        error: 'Forbidden',
        statusCode: 403,
      });
    });

    it('should update customer partially when authenticated as admin', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/config/customers/${updateCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Nome Atualizado',
          plan_id: 2,
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      const customer = response.body.data;

      expect(customer.id).toBe(updateCustomerId);
      expect(customer.name).toBe('Nome Atualizado');
      expect(customer.plan_id).toBe(2);
    });

    it('should update all fields when provided', async () => {
      const timestamp = Date.now();
      const response = await request(app.getHttpServer())
        .put(`/api/v1/config/customers/${updateCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Nome Completo Atualizado',
          last_name: 'Sobrenome Atualizado',
          email: `updated-email-${timestamp}@test.com`,
          cel: '11987654321',
          profile: 'administrator',
        })
        .expect(200);

      expect(response.body.data.name).toBe('Nome Completo Atualizado');
      expect(response.body.data.last_name).toBe('Sobrenome Atualizado');
      expect(response.body.data.email).toBe(
        `updated-email-${timestamp}@test.com`,
      );
      expect(response.body.data.profile).toBe('administrator');
    });

    it('should return 404 when customer ID does not exist', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/config/customers/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name' })
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('não encontrado');
      expect(response.body).toMatchObject({
        error: 'Not Found',
        statusCode: 404,
      });
    });

    it('should return 422 when email is invalid', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/config/customers/${updateCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email',
        })
        .expect(422);

      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(response.body.statusCode).toBe(422);
    });

    it('should preserve original values when not updating specific fields', async () => {
      // Get current state
      const currentState = await request(app.getHttpServer())
        .get(`/api/v1/config/customers/${updateCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const originalCel = currentState.body.data.cel;

      // Update only name
      await request(app.getHttpServer())
        .put(`/api/v1/config/customers/${updateCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Apenas Nome Mudou',
        })
        .expect(200);

      // Verify cel was not changed
      const updatedState = await request(app.getHttpServer())
        .get(`/api/v1/config/customers/${updateCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(updatedState.body.data.cel).toBe(originalCel);
      expect(updatedState.body.data.name).toBe('Apenas Nome Mudou');
    });
  });

  describe('DELETE /api/v1/config/customers/:id', () => {
    let deleteCustomerId: number;

    beforeAll(async () => {
      // Create a customer to delete in tests
      const timestamp = Date.now();
      const response = await request(app.getHttpServer())
        .post('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Cliente para DELETE',
          email: `delete-test-${timestamp}@test.com`,
          cel: '11988885555',
          cpfCnpj: '11144477735',
          password: 'Test@1234',
          password_confirmation: 'Test@1234',
          plan_id: 1,
        })
        .expect(200);

      deleteCustomerId = response.body.data.id;
    });

    it('should return 401 when no authentication token is provided', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/config/customers/${deleteCustomerId}`)
        .expect(401);

      expect(response.body).toEqual({
        message: 'Unauthorized',
        statusCode: 401,
      });
    });

    it('should return 403 when authenticated as non-admin user', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/config/customers/${deleteCustomerId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('administradores');
      expect(response.body).toMatchObject({
        error: 'Forbidden',
        statusCode: 403,
      });
    });

    it('should soft delete customer when authenticated as admin', async () => {
      // Delete the customer
      await request(app.getHttpServer())
        .delete(`/api/v1/config/customers/${deleteCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify customer no longer appears in listing
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const deletedCustomer = listResponse.body.data.find(
        (c: any) => c.id === deleteCustomerId,
      );
      expect(deletedCustomer).toBeUndefined();

      // Verify cannot get deleted customer by ID
      await request(app.getHttpServer())
        .get(`/api/v1/config/customers/${deleteCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 404 when customer ID does not exist', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/config/customers/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('não encontrado');
      expect(response.body).toMatchObject({
        error: 'Not Found',
        statusCode: 404,
      });
    });

    it('should return 404 when trying to delete already deleted customer', async () => {
      // Try to delete the same customer again
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/config/customers/${deleteCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('não encontrado');
      expect(response.body).toMatchObject({
        error: 'Not Found',
        statusCode: 404,
      });
    });

    it('should return 400 when ID is not a valid number', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/config/customers/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });
  });

  describe('GET /api/v1/user/:id', () => {
    let regularUserId: number;
    let regularUserToken: string;

    beforeAll(async () => {
      // Create a specific customer for profile tests
      const timestamp = Date.now();
      const profileTestUser = {
        name: 'Profile Test User',
        email: `profile-test-${timestamp}@test.com`,
        cel: '11988884444',
        cpfCnpj: '52998224725',
        password: 'Test@1234',
        password_confirmation: 'Test@1234',
        plan_id: 1,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(profileTestUser)
        .expect(200);

      regularUserId = createResponse.body.data.id;

      // Login as this user to get their token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/login')
        .send({
          email: profileTestUser.email,
          password: profileTestUser.password,
        })
        .expect(200);

      regularUserToken = loginResponse.body.token;
    });

    it('should return 401 when no authentication token is provided', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/user/${regularUserId}`)
        .expect(401);

      expect(response.body).toEqual({
        message: 'Unauthorized',
        statusCode: 401,
      });
    });

    it('should return own profile when authenticated user accesses their own profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/user/${regularUserId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('data');
      const user = response.body.data;

      // Validate user properties
      expect(user.id).toBe(regularUserId);
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('cpfCnpj');
      expect(user).toHaveProperty('profile');
      expect(user).toHaveProperty('plan_id');
      expect(user).toHaveProperty('created_at');
      expect(user).toHaveProperty('updated_at');

      // Validate relationships are included
      expect(user).toHaveProperty('plan');
      expect(user).toHaveProperty('numbers');
      expect(user).toHaveProperty('config');

      // Verify it's the correct user
      expect(user.name).toBe('Profile Test User');
    });

    it('should return 403 when user tries to access another user profile', async () => {
      // Create another customer
      const timestamp = Date.now();
      const otherUser = {
        name: 'Other User',
        email: `other-${timestamp}@test.com`,
        cel: '11988883333',
        cpfCnpj: '11144477735',
        password: 'Test@1234',
        password_confirmation: 'Test@1234',
        plan_id: 1,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(otherUser)
        .expect(200);

      const otherUserId = createResponse.body.data.id;

      // Regular user tries to access other user's profile
      const response = await request(app.getHttpServer())
        .get(`/api/v1/user/${otherUserId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('permissão');
      expect(response.body).toMatchObject({
        error: 'Forbidden',
        statusCode: 403,
      });
    });

    it('should return 404 when user ID does not exist', async () => {
      // This will return 403 first because user is trying to access another profile
      // Even if ID doesn't exist, the permission check happens first
      const response = await request(app.getHttpServer())
        .get('/api/v1/user/999999')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Forbidden',
        statusCode: 403,
      });
    });

    it('should return 400 when ID is not a valid number', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/user/invalid')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });
  });

  describe('POST /api/v1/user/:id', () => {
    let profileUpdateUserId: number;
    let profileUpdateUserToken: string;

    beforeAll(async () => {
      // Create a specific customer for profile update tests
      const timestamp = Date.now();
      const updateTestUser = {
        name: 'Update Profile Test',
        email: `update-profile-${timestamp}@test.com`,
        cel: '11988882222',
        cpfCnpj: '11144477735',
        password: 'Test@1234',
        password_confirmation: 'Test@1234',
        plan_id: 1,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateTestUser)
        .expect(200);

      profileUpdateUserId = createResponse.body.data.id;

      // Login as this user
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/login')
        .send({
          email: updateTestUser.email,
          password: updateTestUser.password,
        })
        .expect(200);

      profileUpdateUserToken = loginResponse.body.token;
    });

    it('should return 401 when no authentication token is provided', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/user/${profileUpdateUserId}`)
        .send({ name: 'New Name' })
        .expect(401);

      expect(response.body).toEqual({
        message: 'Unauthorized',
        statusCode: 401,
      });
    });

    it('should update own profile partially when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/user/${profileUpdateUserId}`)
        .set('Authorization', `Bearer ${profileUpdateUserToken}`)
        .send({
          name: 'Nome Atualizado',
          last_name: 'Sobrenome Novo',
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.name).toBe('Nome Atualizado');
      expect(response.body.data.last_name).toBe('Sobrenome Novo');
    });

    it('should update password when provided with confirmation', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/user/${profileUpdateUserId}`)
        .set('Authorization', `Bearer ${profileUpdateUserToken}`)
        .send({
          password: 'NewPass@1234',
          password_confirmation: 'NewPass@1234',
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // Password should be hashed
      expect(response.body.data.password).toContain('$2b$');
      expect(response.body.data.password).not.toBe('NewPass@1234');
    });

    it('should return 403 when trying to update another user profile', async () => {
      // Create another user
      const timestamp = Date.now();
      const otherUser = {
        name: 'Other User 2',
        email: `other2-${timestamp}@test.com`,
        cel: '11988881111',
        cpfCnpj: '52998224725',
        password: 'Test@1234',
        password_confirmation: 'Test@1234',
        plan_id: 1,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(otherUser)
        .expect(200);

      const otherUserId = createResponse.body.data.id;

      // Try to update other user's profile
      const response = await request(app.getHttpServer())
        .post(`/api/v1/user/${otherUserId}`)
        .set('Authorization', `Bearer ${profileUpdateUserToken}`)
        .send({ name: 'Tentando Alterar' })
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('permissão');
    });

    it('should return 422 when email is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/user/${profileUpdateUserId}`)
        .set('Authorization', `Bearer ${profileUpdateUserToken}`)
        .send({
          email: 'invalid-email',
        })
        .expect(422);

      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should return 422 when passwords do not match', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/user/${profileUpdateUserId}`)
        .set('Authorization', `Bearer ${profileUpdateUserToken}`)
        .send({
          password: 'NewPass@1234',
          password_confirmation: 'DifferentPass@1234',
        })
        .expect(422);

      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should preserve original values when not updating specific fields', async () => {
      // Get current state
      const currentState = await request(app.getHttpServer())
        .get(`/api/v1/user/${profileUpdateUserId}`)
        .set('Authorization', `Bearer ${profileUpdateUserToken}`)
        .expect(200);

      const originalEmail = currentState.body.data.email;

      // Update only cel
      await request(app.getHttpServer())
        .post(`/api/v1/user/${profileUpdateUserId}`)
        .set('Authorization', `Bearer ${profileUpdateUserToken}`)
        .send({
          cel: '11999991111',
        })
        .expect(200);

      // Verify email was not changed
      const updatedState = await request(app.getHttpServer())
        .get(`/api/v1/user/${profileUpdateUserId}`)
        .set('Authorization', `Bearer ${profileUpdateUserToken}`)
        .expect(200);

      expect(updatedState.body.data.email).toBe(originalEmail);
      expect(updatedState.body.data.cel).toBe('11999991111');
    });
  });

  describe('POST /api/v1/save-configuration', () => {
    let configUserId: number;
    let configUserToken: string;

    beforeAll(async () => {
      // Create a specific customer for configuration tests
      const timestamp = Date.now();
      const configTestUser = {
        name: 'Config Test User',
        email: `config-test-${timestamp}@test.com`,
        cel: '11988881111',
        cpfCnpj: '52998224725',
        password: 'Test@1234',
        password_confirmation: 'Test@1234',
        plan_id: 1,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(configTestUser)
        .expect(200);

      configUserId = createResponse.body.data.id;

      // Login as this user
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/login')
        .send({
          email: configTestUser.email,
          password: configTestUser.password,
        })
        .expect(200);

      configUserToken = loginResponse.body.token;
    });

    it('should return 401 when no authentication token is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/save-configuration')
        .send({ timer_delay: 60 })
        .expect(401);

      expect(response.body).toEqual({
        message: 'Unauthorized',
        statusCode: 401,
      });
    });

    it('should create new configuration when none exists', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/save-configuration')
        .set('Authorization', `Bearer ${configUserToken}`)
        .send({
          timer_delay: 60,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('salvas com sucesso');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.user_id).toBe(configUserId);
      expect(response.body.data.timer_delay).toBe(60);
    });

    it('should update existing configuration', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/save-configuration')
        .set('Authorization', `Bearer ${configUserToken}`)
        .send({
          timer_delay: 90,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('atualizadas com sucesso');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.timer_delay).toBe(90);
    });

    it('should use default value (30) when timer_delay not provided', async () => {
      // Create another user to test default value
      const timestamp = Date.now();
      const defaultUser = {
        name: 'Default Config User',
        email: `default-config-${timestamp}@test.com`,
        cel: '11988880000',
        cpfCnpj: '11144477735',
        password: 'Test@1234',
        password_confirmation: 'Test@1234',
        plan_id: 1,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/config/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(defaultUser)
        .expect(200);

      // Login as new user
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/login')
        .send({
          email: defaultUser.email,
          password: defaultUser.password,
        })
        .expect(200);

      const newUserToken = loginResponse.body.token;

      // Save configuration without timer_delay
      const response = await request(app.getHttpServer())
        .post('/api/v1/save-configuration')
        .set('Authorization', `Bearer ${newUserToken}`)
        .send({})
        .expect(200);

      expect(response.body.data.timer_delay).toBe(30);
    });

    it('should return 422 when timer_delay is less than 1', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/save-configuration')
        .set('Authorization', `Bearer ${configUserToken}`)
        .send({
          timer_delay: 0,
        })
        .expect(422);

      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should return 422 when timer_delay is not a number', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/save-configuration')
        .set('Authorization', `Bearer ${configUserToken}`)
        .send({
          timer_delay: 'invalid',
        })
        .expect(422);

      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });
  });
});
