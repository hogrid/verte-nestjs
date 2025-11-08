import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserStatus, UserProfile } from '../../src/database/entities/user.entity';
import { Number } from '../../src/database/entities/number.entity';
import { Contact } from '../../src/database/entities/contact.entity';
import { MessageByContact } from '../../src/database/entities/message-by-contact.entity';
import { PublicByContact } from '../../src/database/entities/public-by-contact.entity';
import { Campaign } from '../../src/database/entities/campaign.entity';
import { Public } from '../../src/database/entities/public.entity';
import * as bcrypt from 'bcryptjs';
import { MessageAckStatus } from '../../src/whatsapp/dto/webhook-event.dto';

/**
 * WhatsApp Webhooks E2E Tests
 * Valida processamento de eventos WAHA em tempo real
 *
 * Eventos testados:
 * 1. message.ack - Confirmações de mensagem (ACK 0-5)
 * 2. message.sent - Mensagem enviada com sucesso
 * 3. session.status - Mudança de status de conexão
 * 4. message.any - Mensagem recebida (apenas log)
 */
describe('WhatsApp Webhooks (e2e) - WAHA Event Processing', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testUser: User;
  let testNumber: Number;
  let testContact: Contact;
  let testCampaign: Campaign;
  let testPublic: Public;
  let testMessageByContact: MessageByContact;
  let testPublicByContact: PublicByContact;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Enable class-validator to use NestJS dependency injection
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    // Apply same validation pipe as production
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

    // Create test data
    await createTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await app.close();
  });

  /**
   * Helper: Create test data
   */
  async function createTestData() {
    const userRepository = dataSource.getRepository(User);
    const numberRepository = dataSource.getRepository(Number);
    const contactRepository = dataSource.getRepository(Contact);
    const campaignRepository = dataSource.getRepository(Campaign);
    const publicRepository = dataSource.getRepository(Public);
    const messageByContactRepository = dataSource.getRepository(MessageByContact);
    const publicByContactRepository = dataSource.getRepository(PublicByContact);

    // Delete existing test data if exists
    await userRepository.delete({ email: 'webhook-test@verte.com' });

    // Create test user
    testUser = userRepository.create({
      name: 'Webhook',
      last_name: 'Test',
      email: 'webhook-test@verte.com',
      password: await bcrypt.hash('password123', 10),
      status: UserStatus.ACTIVED,
      profile: UserProfile.USER,
      confirmed_mail: 1,
      active: 1,
      cel: '11999999999',
      cpfCnpj: '52998224725',
    });
    testUser = await userRepository.save(testUser);

    // Create test number
    testNumber = numberRepository.create({
      user_id: testUser.id,
      name: 'Test Instance',
      instance: 'test_webhook_instance',
      status: 1,
      status_connection: 1,
      cel: '5511999999999',
    });
    testNumber = await numberRepository.save(testNumber);

    // Create test contact
    testContact = contactRepository.create({
      user_id: testUser.id,
      name: 'Test Contact',
      number: '5511988887777',
      status: 1,
    });
    testContact = await contactRepository.save(testContact);

    // Create test public
    testPublic = publicRepository.create({
      user_id: testUser.id,
      name: 'Test Public',
      status: 1,
    });
    testPublic = await publicRepository.save(testPublic);

    // Create test campaign
    testCampaign = campaignRepository.create({
      user_id: testUser.id,
      number_id: testNumber.id,
      public_id: testPublic.id,
      name: 'Test Campaign',
      status: 0,
      total_contacts: 1,
    });
    testCampaign = await campaignRepository.save(testCampaign);

    // Create test message by contact
    testMessageByContact = messageByContactRepository.create({
      user_id: testUser.id,
      campaign_id: testCampaign.id,
      contact_id: testContact.id,
      number: testContact.number,
      send: 0,
      delivered: 0,
      read: 0,
    });
    testMessageByContact = await messageByContactRepository.save(testMessageByContact);

    // Create test public by contact
    testPublicByContact = publicByContactRepository.create({
      user_id: testUser.id,
      public_id: testPublic.id,
      contact_id: testContact.id,
      campaign_id: testCampaign.id,
      send: 0,
      read: 0,
      has_error: 0,
    });
    testPublicByContact = await publicByContactRepository.save(testPublicByContact);
  }

  /**
   * Helper: Cleanup test data
   */
  async function cleanupTestData() {
    if (!testUser) return;

    const publicByContactRepository = dataSource.getRepository(PublicByContact);
    const messageByContactRepository = dataSource.getRepository(MessageByContact);
    const campaignRepository = dataSource.getRepository(Campaign);
    const publicRepository = dataSource.getRepository(Public);
    const contactRepository = dataSource.getRepository(Contact);
    const numberRepository = dataSource.getRepository(Number);
    const userRepository = dataSource.getRepository(User);

    // Delete in order (foreign key constraints)
    await publicByContactRepository.delete({ user_id: testUser.id });
    await messageByContactRepository.delete({ user_id: testUser.id });
    await campaignRepository.delete({ user_id: testUser.id });
    await publicRepository.delete({ user_id: testUser.id });
    await contactRepository.delete({ user_id: testUser.id });
    await numberRepository.delete({ user_id: testUser.id });
    await userRepository.delete({ id: testUser.id });
  }

  /**
   * Helper: Reload entities from database
   */
  async function reloadEntities() {
    const messageByContactRepository = dataSource.getRepository(MessageByContact);
    const publicByContactRepository = dataSource.getRepository(PublicByContact);
    const numberRepository = dataSource.getRepository(Number);

    testMessageByContact = (await messageByContactRepository.findOne({
      where: { id: testMessageByContact.id },
    })) as MessageByContact;

    testPublicByContact = (await publicByContactRepository.findOne({
      where: { id: testPublicByContact.id },
    })) as PublicByContact;

    testNumber = (await numberRepository.findOne({
      where: { id: testNumber.id },
    })) as Number;
  }

  /**
   * ===========================================
   * 1. POST /api/v1/webhook-whatsapp
   * Event: message.ack (ACK 0 - ERROR)
   * ===========================================
   */
  describe('POST /api/v1/webhook-whatsapp - message.ack (ERROR)', () => {
    it('should process ACK 0 (ERROR) and set error message', async () => {
      const webhookPayload = {
        event: 'message.ack',
        session: testNumber.instance,
        payload: {
          id: 'msg_123',
          from: testNumber.cel + '@c.us',
          to: testContact.number + '@c.us',
          ack: MessageAckStatus.ERROR,
          timestamp: Date.now(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhook-whatsapp')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Webhook processado',
      });

      // Reload entities to check updates
      await reloadEntities();

      // Verify MessageByContact was updated
      expect(testMessageByContact.error).toBe('Erro ao enviar mensagem');
    });
  });

  /**
   * ===========================================
   * 2. POST /api/v1/webhook-whatsapp
   * Event: message.ack (ACK 2 - SERVER_ACK)
   * ===========================================
   */
  describe('POST /api/v1/webhook-whatsapp - message.ack (SERVER_ACK)', () => {
    it('should process ACK 2 (SERVER_ACK) and mark as sent', async () => {
      const webhookPayload = {
        event: 'message.ack',
        session: testNumber.instance,
        payload: {
          id: 'msg_123',
          from: testNumber.cel + '@c.us',
          to: testContact.number + '@c.us',
          ack: MessageAckStatus.SERVER_ACK,
          timestamp: Date.now(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhook-whatsapp')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Webhook processado',
      });

      await reloadEntities();

      expect(testMessageByContact.send).toBe(1);
      expect(testMessageByContact.delivered).toBe(0);
      expect(testMessageByContact.read).toBe(0);
    });
  });

  /**
   * ===========================================
   * 3. POST /api/v1/webhook-whatsapp
   * Event: message.ack (ACK 3 - DELIVERY_ACK)
   * ===========================================
   */
  describe('POST /api/v1/webhook-whatsapp - message.ack (DELIVERY_ACK)', () => {
    it('should process ACK 3 (DELIVERY_ACK) and mark as delivered', async () => {
      const webhookPayload = {
        event: 'message.ack',
        session: testNumber.instance,
        payload: {
          id: 'msg_123',
          from: testNumber.cel + '@c.us',
          to: testContact.number + '@c.us',
          ack: MessageAckStatus.DELIVERY_ACK,
          timestamp: Date.now(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhook-whatsapp')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);

      await reloadEntities();

      expect(testMessageByContact.send).toBe(1);
      expect(testMessageByContact.delivered).toBe(1);
      expect(testMessageByContact.read).toBe(0);
    });
  });

  /**
   * ===========================================
   * 4. POST /api/v1/webhook-whatsapp
   * Event: message.ack (ACK 4 - READ)
   * ===========================================
   */
  describe('POST /api/v1/webhook-whatsapp - message.ack (READ)', () => {
    it('should process ACK 4 (READ) and mark as read', async () => {
      const webhookPayload = {
        event: 'message.ack',
        session: testNumber.instance,
        payload: {
          id: 'msg_123',
          from: testNumber.cel + '@c.us',
          to: testContact.number + '@c.us',
          ack: MessageAckStatus.READ,
          timestamp: Date.now(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhook-whatsapp')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);

      await reloadEntities();

      expect(testMessageByContact.send).toBe(1);
      expect(testMessageByContact.delivered).toBe(1);
      expect(testMessageByContact.read).toBe(1);

      // PublicByContact should also be updated
      expect(testPublicByContact.read).toBe(1);
    });
  });

  /**
   * ===========================================
   * 5. POST /api/v1/webhook-whatsapp
   * Event: message.sent
   * ===========================================
   */
  describe('POST /api/v1/webhook-whatsapp - message.sent', () => {
    it('should process message.sent and mark as sent', async () => {
      // Reset status
      await dataSource.getRepository(MessageByContact).update(
        { id: testMessageByContact.id },
        { send: 0, delivered: 0, read: 0 },
      );
      await dataSource.getRepository(PublicByContact).update(
        { id: testPublicByContact.id },
        { send: 0, has_error: 0 },
      );

      const webhookPayload = {
        event: 'message.sent',
        session: testNumber.instance,
        payload: {
          id: 'msg_456',
          from: testNumber.cel + '@c.us',
          to: testContact.number + '@c.us',
          timestamp: Date.now(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhook-whatsapp')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);

      await reloadEntities();

      expect(testMessageByContact.send).toBe(1);
      expect(testPublicByContact.send).toBe(1);
      expect(testPublicByContact.has_error).toBe(0);
    });
  });

  /**
   * ===========================================
   * 6. POST /api/v1/webhook-whatsapp
   * Event: session.status (WORKING)
   * ===========================================
   */
  describe('POST /api/v1/webhook-whatsapp - session.status (WORKING)', () => {
    it('should process session.status WORKING and update connection', async () => {
      const webhookPayload = {
        event: 'session.status',
        session: testNumber.instance,
        payload: {
          status: 'WORKING',
          me: {
            id: '5511999998888',
            pushName: 'Test User',
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhook-whatsapp')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);

      await reloadEntities();

      expect(testNumber.status_connection).toBe(1);
      expect(testNumber.cel).toBe('5511999998888');
    });
  });

  /**
   * ===========================================
   * 7. POST /api/v1/webhook-whatsapp
   * Event: session.status (SCAN_QR_CODE)
   * ===========================================
   */
  describe('POST /api/v1/webhook-whatsapp - session.status (DISCONNECTED)', () => {
    it('should process session.status SCAN_QR_CODE and mark as disconnected', async () => {
      const webhookPayload = {
        event: 'session.status',
        session: testNumber.instance,
        payload: {
          status: 'SCAN_QR_CODE',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhook-whatsapp')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);

      await reloadEntities();

      expect(testNumber.status_connection).toBe(0);
    });
  });

  /**
   * ===========================================
   * 8. POST /api/v1/webhook-whatsapp
   * Event: message.any (ignored)
   * ===========================================
   */
  describe('POST /api/v1/webhook-whatsapp - message.any', () => {
    it('should process message.any and return success (no action)', async () => {
      const webhookPayload = {
        event: 'message.any',
        session: testNumber.instance,
        payload: {
          id: 'msg_789',
          from: testContact.number + '@c.us',
          to: testNumber.cel + '@c.us',
          body: 'Test message',
          timestamp: Date.now(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhook-whatsapp')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Webhook processado',
      });
    });
  });

  /**
   * ===========================================
   * 9. POST /api/v1/webhook-whatsapp
   * Invalid structure
   * ===========================================
   */
  describe('POST /api/v1/webhook-whatsapp - Invalid Structure', () => {
    it('should reject webhook with invalid structure', async () => {
      const invalidPayload = {
        invalid: 'structure',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhook-whatsapp')
        .send(invalidPayload)
        .expect(200); // Still 200, but success: false

      expect(response.body).toEqual({
        success: false,
        message: 'Estrutura de webhook inválida',
      });
    });
  });

  /**
   * ===========================================
   * 10. POST /api/v1/webhook-whatsapp
   * Unknown event type
   * ===========================================
   */
  describe('POST /api/v1/webhook-whatsapp - Unknown Event', () => {
    it('should process unknown event and return success', async () => {
      const webhookPayload = {
        event: 'unknown.event',
        session: testNumber.instance,
        payload: {
          data: 'some data',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhook-whatsapp')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Webhook processado',
      });
    });
  });
});
