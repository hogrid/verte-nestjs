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
  // Schema feature flags (detected at runtime)
  const flags = {
    hasPbcCampaignId: false,
    hasMbcCampaignId: false,
    hasMbcError: false,
    hasMbcSend: false,
    hasMbcDelivered: false,
    hasMbcRead: false,
    hasPbcSend: false,
    hasPbcRead: false,
    hasPbcHasError: false,
  } as Record<string, boolean>;

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
    const messageByContactRepository =
      dataSource.getRepository(MessageByContact);
    const publicByContactRepository = dataSource.getRepository(PublicByContact);

    // Helper: check if a column exists in current DB
    async function columnExists(table: string, column: string) {
      const db = (dataSource.options as any).database;
      const rows = await dataSource.query(
        'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
        [db, table, column],
      );
      return Array.isArray(rows) && rows.length > 0;
    }
    const hasPbcCampaignId = await columnExists('public_by_contacts', 'campaign_id');
    const hasMbcCampaignId = await columnExists('message_by_contacts', 'campaign_id');
    const hasMbcNumber = await columnExists('message_by_contacts', 'number');
    const hasMbcError = await columnExists('message_by_contacts', 'error');
    const hasMbcSend = await columnExists('message_by_contacts', 'send');
    const hasMbcDelivered = await columnExists('message_by_contacts', 'delivered');
    const hasMbcRead = await columnExists('message_by_contacts', 'read');
    const hasPbcSend = await columnExists('public_by_contacts', 'send');
    const hasPbcRead = await columnExists('public_by_contacts', 'read');
    const hasPbcHasError = await columnExists('public_by_contacts', 'has_error');

    Object.assign(flags, {
      hasPbcCampaignId,
      hasMbcCampaignId,
      hasMbcError,
      hasMbcSend,
      hasMbcDelivered,
      hasMbcRead,
      hasPbcSend,
      hasPbcRead,
      hasPbcHasError,
    });

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

    // Create minimal message for foreign key
    const [msgIdRow] = await dataSource.query(
      `INSERT INTO messages (user_id, campaign_id, type, message, created_at, updated_at)
       VALUES (?, ?, 1, 'Teste', NOW(), NOW()); SELECT LAST_INSERT_ID() AS id;`,
      [testUser.id, testCampaign.id],
    ).catch(async () => {
      // Some MariaDB configs don't allow multi; fallback to two queries
      await dataSource.query(
        `INSERT INTO messages (user_id, campaign_id, type, message, created_at, updated_at)
         VALUES (?, ?, 1, 'Teste', NOW(), NOW())`,
        [testUser.id, testCampaign.id],
      );
      const [row] = await dataSource.query(
        `SELECT id FROM messages WHERE user_id = ? AND campaign_id = ? ORDER BY id DESC LIMIT 1`,
        [testUser.id, testCampaign.id],
      );
      return [row];
    });
    const testMessageId = (msgIdRow as any).id;

    // Create test message by contact (raw SQL to evitar colunas inexistentes)
    {
      const cols: string[] = ['user_id', 'message_id', 'contact_id'];
      const vals: any[] = [testUser.id, testMessageId, testContact.id];
      if (hasMbcCampaignId) {
        cols.push('campaign_id');
        vals.splice(2, 0, testCampaign.id); // after message_id
      }
      if (hasMbcSend) cols.push('`send`');
      if (hasMbcDelivered) cols.push('delivered');
      if (hasMbcRead) cols.push('`read`');
      cols.push('created_at', 'updated_at');
      // Build placeholders
      const placeholders: string[] = [];
      const dynamicVals: any[] = [];
      // user_id
      placeholders.push('?');
      dynamicVals.push(testUser.id);
      // message_id
      placeholders.push('?');
      dynamicVals.push(testMessageId);
      // maybe campaign_id
      if (hasMbcCampaignId) {
        placeholders.push('?');
        dynamicVals.push(testCampaign.id);
      }
      // contact_id
      placeholders.push('?');
      dynamicVals.push(testContact.id);
      // send/delivered/read values (use 0 when present)
      if (hasMbcSend) placeholders.push('0');
      if (hasMbcDelivered) placeholders.push('0');
      if (hasMbcRead) placeholders.push('0');
      // timestamps
      placeholders.push('NOW()', 'NOW()');

      const sql = `INSERT INTO message_by_contacts (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`;
      await dataSource.query(sql, dynamicVals);
    }
    {
      const [mbc] = await dataSource.query(
        `SELECT * FROM message_by_contacts WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [testUser.id],
      );
      testMessageByContact = mbc as any;
    }

    // Create test public by contact (raw SQL)
    {
      const cols: string[] = ['user_id', 'public_id', 'contact_id'];
      const vals: any[] = [testUser.id, testPublic.id, testContact.id];
      if (hasPbcCampaignId) {
        cols.push('campaign_id');
        vals.push(testCampaign.id);
      }
      if (hasPbcSend) cols.push('`send`');
      if (hasPbcRead) cols.push('`read`');
      if (hasPbcHasError) cols.push('has_error');
      cols.push('created_at', 'updated_at');

      const placeholders: string[] = [];
      const dynamicVals: any[] = [];
      // user_id, public_id, contact_id
      placeholders.push('?', '?', '?');
      dynamicVals.push(testUser.id, testPublic.id, testContact.id);
      if (hasPbcCampaignId) {
        placeholders.push('?');
        dynamicVals.push(testCampaign.id);
      }
      if (hasPbcSend) placeholders.push('0');
      if (hasPbcRead) placeholders.push('0');
      if (hasPbcHasError) placeholders.push('0');
      placeholders.push('NOW()', 'NOW()');

      const sql = `INSERT INTO public_by_contacts (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`;
      await dataSource.query(sql, dynamicVals);
    }
    {
      const [pbc] = await dataSource.query(
        `SELECT * FROM public_by_contacts WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [testUser.id],
      );
      testPublicByContact = pbc as any;
    }
  }

  /**
   * Helper: Cleanup test data
   */
  async function cleanupTestData() {
    if (!testUser) return;

    const publicByContactRepository = dataSource.getRepository(PublicByContact);
    const messageByContactRepository =
      dataSource.getRepository(MessageByContact);
    const campaignRepository = dataSource.getRepository(Campaign);
    const publicRepository = dataSource.getRepository(Public);
    const contactRepository = dataSource.getRepository(Contact);
    const numberRepository = dataSource.getRepository(Number);
    const userRepository = dataSource.getRepository(User);

    // Delete in order (foreign key constraints)
    await publicByContactRepository.delete({ user_id: testUser.id });
    await messageByContactRepository.delete({ user_id: testUser.id });
    // Messages must be removed before campaigns due to FK
    await dataSource.query('DELETE FROM messages WHERE user_id = ?', [
      testUser.id,
    ]);
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
    // Reload via raw queries to contornar diferenças de schema
    const [mbc] = await dataSource.query(
      `SELECT id${flags.hasMbcError ? ', error' : ''}${
        flags.hasMbcSend ? ', `send`' : ''
      }${
        flags.hasMbcDelivered ? ', delivered' : ''
      }${flags.hasMbcRead ? ', `read`' : ''} FROM message_by_contacts WHERE id = ? LIMIT 1`,
      [testMessageByContact.id],
    );
    testMessageByContact = (mbc || {}) as any;

    const [pbc] = await dataSource.query(
      `SELECT id${flags.hasPbcSend ? ', `send`' : ''}${
        flags.hasPbcRead ? ', `read`' : ''
      }${flags.hasPbcHasError ? ', has_error' : ''} FROM public_by_contacts WHERE id = ? LIMIT 1`,
      [testPublicByContact.id],
    );
    testPublicByContact = (pbc || {}) as any;

    const numberRepository = dataSource.getRepository(Number);
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
      // Verify MessageByContact was updated (if column exists)
      if (flags.hasMbcError) {
        expect(testMessageByContact.error).toBe('Erro ao enviar mensagem');
      }
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

      if (flags.hasMbcSend) expect(testMessageByContact.send).toBe(1);
      if (flags.hasMbcDelivered) expect(testMessageByContact.delivered).toBe(0);
      if (flags.hasMbcRead) expect(testMessageByContact.read).toBe(0);
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

      if (flags.hasMbcSend) expect(testMessageByContact.send).toBe(1);
      if (flags.hasMbcDelivered) expect(testMessageByContact.delivered).toBe(1);
      if (flags.hasMbcRead) expect(testMessageByContact.read).toBe(0);
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

      if (flags.hasMbcSend) expect(testMessageByContact.send).toBe(1);
      if (flags.hasMbcDelivered) expect(testMessageByContact.delivered).toBe(1);
      if (flags.hasMbcRead) expect(testMessageByContact.read).toBe(1);

      // PublicByContact should also be updated
      if (flags.hasPbcRead) expect(testPublicByContact.read).toBe(1);
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
      // Reset status (if columns exist)
      if (flags.hasMbcSend || flags.hasMbcDelivered || flags.hasMbcRead) {
        const cols: string[] = [];
        const sets: string[] = [];
        if (flags.hasMbcSend) sets.push('`send` = 0');
        if (flags.hasMbcDelivered) sets.push('delivered = 0');
        if (flags.hasMbcRead) sets.push('`read` = 0');
        if (sets.length > 0) {
          await dataSource.query(
            `UPDATE message_by_contacts SET ${sets.join(', ')} WHERE id = ?`,
            [testMessageByContact.id],
          );
        }
      }
      if (flags.hasPbcSend || flags.hasPbcHasError) {
        const sets: string[] = [];
        const params: any[] = [];
        if (flags.hasPbcSend) sets.push('`send` = 0');
        if (flags.hasPbcHasError) sets.push('has_error = 0');
        if (sets.length > 0) {
          await dataSource.query(
            `UPDATE public_by_contacts SET ${sets.join(', ')} WHERE id = ?`,
            [testPublicByContact.id],
          );
        }
      }

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

      if (flags.hasMbcSend) expect(testMessageByContact.send).toBe(1);
      if (flags.hasPbcSend) expect(testPublicByContact.send).toBe(1);
      if (flags.hasPbcHasError) expect(testPublicByContact.has_error).toBe(0);
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
