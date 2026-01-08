import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserStatus, UserProfile } from '../../src/database/entities';
import { Contact } from '../../src/database/entities/contact.entity';
import { Campaign } from '../../src/database/entities/campaign.entity';
import { Public } from '../../src/database/entities/public.entity';
import * as bcrypt from 'bcryptjs';

/**
 * Export Module E2E Tests
 * Validates 100% Laravel compatibility for all 2 export endpoints
 *
 * Endpoints tested:
 * 1. GET /api/v1/export-contacts-csv
 * 2. GET /api/v1/export-campaign-report
 */
describe('Export Module (e2e) - Laravel Compatibility Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testUser: User;
  let testPublic: Public;
  let testContact1: Contact;
  let testContact2: Contact;
  let testCampaign: Campaign;
  let testNumber: any; // Number entity

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

    // Clean up any orphaned data from previous tests
    const userRepository = dataSource.getRepository(User);
    const existingUser = await userRepository.findOne({
      where: { email: 'export-test@verte.com' },
    });

    if (existingUser) {
      // Delete contacts first (foreign key constraint)
      const contactRepository = dataSource.getRepository(Contact);
      await contactRepository.delete({ user_id: existingUser.id });

      const campaignRepository = dataSource.getRepository(Campaign);
      await campaignRepository.delete({ user_id: existingUser.id });

      const publicRepository = dataSource.getRepository(Public);
      await publicRepository.delete({ user_id: existingUser.id });

      const numberRepository = dataSource.getRepository('numbers');
      await numberRepository.delete({ user_id: existingUser.id });

      await userRepository.delete({ id: existingUser.id });
    }

    await createTestUser();
    await loginTestUser();
    await createTestData();
  });

  afterAll(async () => {
    if (testUser) {
      const contactRepository = dataSource.getRepository(Contact);
      await contactRepository.delete({ user_id: testUser.id });

      const campaignRepository = dataSource.getRepository(Campaign);
      await campaignRepository.delete({ user_id: testUser.id });

      const publicRepository = dataSource.getRepository(Public);
      await publicRepository.delete({ user_id: testUser.id });

      const numberRepository = dataSource.getRepository('numbers');
      await numberRepository.delete({ user_id: testUser.id });

      await dataSource.getRepository(User).delete({ id: testUser.id });
    }
    await app.close();
  });

  async function createTestUser() {
    const userRepository = dataSource.getRepository(User);

    await userRepository.delete({ email: 'export-test@verte.com' });

    testUser = userRepository.create({
      name: 'Export',
      last_name: 'Tester',
      email: 'export-test@verte.com',
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
        email: 'export-test@verte.com',
        password: 'password123',
      });

    authToken = response.body.token;
  }

  async function createTestData() {
    // Create a number first (required for campaign)
    const numberRepository = dataSource.getRepository('numbers');
    testNumber = numberRepository.create({
      user_id: testUser.id,
      name: 'Número Teste Export',
      instance: 'instance-export-test', // Laravel requires instance field
      status: 1,
      status_connection: 1,
    });
    testNumber = await numberRepository.save(testNumber);

    // Create a public
    const publicRepository = dataSource.getRepository(Public);
    testPublic = publicRepository.create({
      user_id: testUser.id,
      name: 'Público de Teste Export',
      status: 0,
    });
    testPublic = await publicRepository.save(testPublic);

    const contactRepository = dataSource.getRepository(Contact);

    testContact1 = contactRepository.create({
      user_id: testUser.id,
      public_id: testPublic.id,
      name: 'João Silva',
      number: '5511999999999',
      cel_owner: 'joao@email.com',
      labels: 'cliente-vip',
      status: 1,
      created_at: new Date(), // Explicit timestamp for testing
    });
    testContact1 = await contactRepository.save(testContact1);

    testContact2 = contactRepository.create({
      user_id: testUser.id,
      public_id: testPublic.id,
      name: 'Maria Santos',
      number: '5511988888888',
      cel_owner: 'maria@email.com',
      labels: 'prospect',
      status: 0,
      created_at: new Date(), // Explicit timestamp for testing
    });
    testContact2 = await contactRepository.save(testContact2);

    // Create campaign (requires public_id and number_id)
    const campaignRepository = dataSource.getRepository(Campaign);
    testCampaign = campaignRepository.create({
      user_id: testUser.id,
      public_id: testPublic.id, // Laravel requires public_id
      number_id: testNumber.id, // Laravel requires valid number_id
      name: 'Campanha Teste Export',
      status: 0,
      total_contacts: 100,
      progress: 0,
    });
    testCampaign = await campaignRepository.save(testCampaign);
  }

  /**
   * ===========================================
   * 1. GET /api/v1/export-contacts-csv
   * ===========================================
   */
  describe('GET /api/v1/export-contacts-csv', () => {
    it('should export all contacts to CSV', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export-contacts-csv')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Validate CSV headers
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('contatos_');

      // Validate CSV content
      const csvContent = response.text;
      expect(csvContent).toContain(
        'ID,Nome,Telefone,Responsável,Etiquetas,Status,Criado em',
      );
      expect(csvContent).toContain('João Silva');
      expect(csvContent).toContain('Maria Santos');

      // Validate UTF-8 BOM
      expect(csvContent.charCodeAt(0)).toBe(0xfeff);
    });

    it('should filter contacts by specific IDs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export-contacts-csv')
        .query({ contact_ids: `${testContact1.id}` })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const csvContent = response.text;
      expect(csvContent).toContain('João Silva');
      expect(csvContent).not.toContain('Maria Santos');
    });

    it('should filter contacts by label', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export-contacts-csv')
        .query({ label: 'cliente-vip' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const csvContent = response.text;
      expect(csvContent).toContain('João Silva');
    });

    it('should filter contacts by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export-contacts-csv')
        .query({ status: 1 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const csvContent = response.text;
      expect(csvContent).toContain('João Silva');
      expect(csvContent).toContain('Ativo');
    });

    it('should search contacts by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export-contacts-csv')
        .query({ search: 'João' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const csvContent = response.text;
      expect(csvContent).toContain('João Silva');
    });

    it('should handle multiple contact IDs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export-contacts-csv')
        .query({ contact_ids: `${testContact1.id},${testContact2.id}` })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const csvContent = response.text;
      expect(csvContent).toContain('João Silva');
      expect(csvContent).toContain('Maria Santos');
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/export-contacts-csv')
        .expect(401);
    });
  });

  /**
   * ===========================================
   * 2. GET /api/v1/export-campaign-report
   * ===========================================
   */
  describe('GET /api/v1/export-campaign-report', () => {
    it('should export campaign report to CSV', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export-campaign-report')
        .query({ campaign_id: testCampaign.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Validate CSV headers
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain(
        `relatorio_campanha_${testCampaign.id}`,
      );

      // Validate CSV content
      const csvContent = response.text;
      expect(csvContent).toContain('Relatório de Campanha');
      expect(csvContent).toContain('Campanha Teste Export');

      // Validate UTF-8 BOM
      expect(csvContent.charCodeAt(0)).toBe(0xfeff);
    });

    it('should include messages when requested', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export-campaign-report')
        .query({
          campaign_id: testCampaign.id,
          include_messages: true,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const csvContent = response.text;
      expect(csvContent).toContain('Relatório de Campanha');
    });

    it('should validate required campaign_id', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export-campaign-report')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent campaign', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/export-campaign-report')
        .query({ campaign_id: 999999 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/export-campaign-report')
        .query({ campaign_id: testCampaign.id })
        .expect(401);
    });
  });

  /**
   * ===========================================
   * Laravel Compatibility Validation
   * ===========================================
   */
  describe('Laravel Compatibility Checks', () => {
    it('should use UTF-8 BOM for Excel compatibility', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export-contacts-csv')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.text.charCodeAt(0)).toBe(0xfeff);
    });

    it('should set correct CSV headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export-contacts-csv')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should maintain Laravel date format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export-contacts-csv')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Validate date format DD/MM/YYYY
      expect(response.text).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });
});
