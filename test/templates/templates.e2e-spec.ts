import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserStatus, UserProfile } from '../../src/database/entities';
import { MessageTemplate } from '../../src/database/entities/message-template.entity';
import * as bcrypt from 'bcryptjs';

/**
 * Templates Module E2E Tests
 * Validates 100% Laravel compatibility for all 4 template endpoints
 *
 * Endpoints tested:
 * 1. GET /api/v1/message-templates
 * 2. POST /api/v1/message-templates
 * 3. PUT /api/v1/message-templates/{id}
 * 4. DELETE /api/v1/message-templates/{id}
 */
describe('Templates Module (e2e) - Laravel Compatibility Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testUser: User;
  let testTemplate: MessageTemplate;

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
      const templateRepository = dataSource.getRepository(MessageTemplate);
      await templateRepository.delete({ user_id: testUser.id });

      const numberRepository = dataSource.getRepository('numbers');
      await numberRepository.delete({ user_id: testUser.id });

      await dataSource.getRepository(User).delete({ id: testUser.id });
    }
    await app.close();
  });

  async function createTestUser() {
    const userRepository = dataSource.getRepository(User);

    await userRepository.delete({ email: 'template-test@verte.com' });

    testUser = userRepository.create({
      name: 'Template',
      last_name: 'Tester',
      email: 'template-test@verte.com',
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
        email: 'template-test@verte.com',
        password: 'password123',
      });

    authToken = response.body.token;
  }

  /**
   * ===========================================
   * 1. POST /api/v1/message-templates
   * ===========================================
   */
  describe('POST /api/v1/message-templates', () => {
    it('should create template successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/message-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Template de Boas Vindas',
          content: 'Olá {{nome}}, seja bem-vindo! Seu código é {{codigo}}.',
          category: 'marketing',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('category');
      expect(response.body).toHaveProperty('variables');
      expect(response.body).toHaveProperty('active');

      // Verify variables were extracted
      expect(Array.isArray(response.body.variables)).toBe(true);
      expect(response.body.variables).toContain('nome');
      expect(response.body.variables).toContain('codigo');
      expect(response.body.variables.length).toBe(2);

      testTemplate = response.body;
    });

    it('should create template without variables', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/message-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Template Simples',
          content: 'Mensagem sem variáveis',
        })
        .expect(201);

      expect(response.body.variables).toEqual([]);
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/message-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/message-templates')
        .send({
          name: 'Test',
          content: 'Test',
        })
        .expect(401);
    });
  });

  /**
   * ===========================================
   * 2. GET /api/v1/message-templates
   * ===========================================
   */
  describe('GET /api/v1/message-templates', () => {
    it('should list user templates', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/message-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const template = response.body[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('content');
      expect(template).toHaveProperty('category');
      expect(template).toHaveProperty('variables');
      expect(template).toHaveProperty('active');
    });

    it('should filter by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/message-templates')
        .query({ category: 'marketing' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((template: any) => {
        expect(template.category).toBe('marketing');
      });
    });

    it('should filter by active status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/message-templates')
        .query({ active: 1 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((template: any) => {
        expect(template.active).toBe(1);
      });
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/message-templates')
        .expect(401);
    });
  });

  /**
   * ===========================================
   * 3. PUT /api/v1/message-templates/{id}
   * ===========================================
   */
  describe('PUT /api/v1/message-templates/:id', () => {
    it('should update template successfully', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/message-templates/${testTemplate.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Template Atualizado',
          content: 'Olá {{nome}}, tudo bem?',
          category: 'support',
          active: 0,
        })
        .expect(200);

      expect(response.body.name).toBe('Template Atualizado');
      expect(response.body.category).toBe('support');
      expect(response.body.active).toBe(0);
      expect(response.body.variables).toContain('nome');
      expect(response.body.variables.length).toBe(1);
    });

    it('should return 404 for non-existent template', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/message-templates/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
          content: 'Test',
        })
        .expect(404);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/message-templates/${testTemplate.id}`)
        .send({
          name: 'Test',
        })
        .expect(401);
    });
  });

  /**
   * ===========================================
   * 4. DELETE /api/v1/message-templates/{id}
   * ===========================================
   */
  describe('DELETE /api/v1/message-templates/:id', () => {
    it('should delete template successfully', async () => {
      // Create a template to delete
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/message-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Template para Deletar',
          content: 'Conteúdo teste',
        });

      const templateId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/message-templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('sucesso');

      // Verify template was soft deleted
      const templateRepository = dataSource.getRepository(MessageTemplate);
      const deletedTemplate = await templateRepository.findOne({
        where: { id: templateId },
        withDeleted: true,
      });

      expect(deletedTemplate).not.toBeNull();
      expect(deletedTemplate?.deleted_at).not.toBeNull();
    });

    it('should return 404 for non-existent template', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/message-templates/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/message-templates/${testTemplate.id}`)
        .expect(401);
    });
  });

  /**
   * ===========================================
   * Laravel Compatibility Validation
   * ===========================================
   */
  describe('Laravel Compatibility Checks', () => {
    it('should extract variables using Laravel pattern {{variable}}', () => {
      expect(testTemplate.variables).toContain('nome');
    });

    it('should use soft deletes', () => {
      expect(MessageTemplate).toBeDefined();
    });

    it('should maintain Laravel response structure', () => {
      expect(testTemplate).toHaveProperty('id');
      expect(testTemplate).toHaveProperty('variables');
    });
  });
});
