import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Number } from '../../src/database/entities/number.entity';
import {
  User,
  UserStatus,
  UserProfile,
} from '../../src/database/entities/user.entity';
import { ContactsService } from '../../src/contacts/contacts.service';

// Mock ContactsService para verificar chamadas de sync
const mockContactsService = {
  syncFromEvolution: jest.fn().mockResolvedValue({ total: 10, imported: 10 }),
};

describe('Evolution API Webhooks (e2e)', () => {
  let app: INestApplication;
  let numberRepository: Repository<Number>;
  let userRepository: Repository<User>;
  let testUser: User;
  let testNumber: Number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ContactsService)
      .useValue(mockContactsService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    numberRepository = moduleFixture.get<Repository<Number>>(
      getRepositoryToken(Number),
    );
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );

    // Setup Test User - Clean up first
    const existingUser = await userRepository.findOne({
      where: { email: 'evo@test.com' },
    });
    if (existingUser) {
      await numberRepository.delete({ user_id: existingUser.id });
      await userRepository.delete({ id: existingUser.id });
    }

    testUser = userRepository.create({
      name: 'Evolution User',
      email: 'evo@test.com',
      password: 'password',
      profile: UserProfile.ADMINISTRATOR,
      status: UserStatus.ACTIVED,
    });
    await userRepository.save(testUser);

    // Setup Test Number
    testNumber = numberRepository.create({
      user_id: testUser.id,
      name: 'Evolution WhatsApp',
      instance: 'evolution_instance_1',
      status: 1,
      status_connection: 0, // Começa desconectado
    });
    await numberRepository.save(testNumber);
  });

  afterAll(async () => {
    if (testUser) {
      await numberRepository.delete({ user_id: testUser.id });
      await userRepository.delete({ id: testUser.id });
    }
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const reloadEntities = async () => {
    testNumber = await numberRepository.findOne({
      where: { id: testNumber.id },
    });
  };

  it('should process connection.update (open) and trigger contact sync', async () => {
    const webhookPayload = {
      event: 'connection.update',
      instance: testNumber.instance,
      data: {
        state: 'open',
        statusReason: 200,
      },
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/whatsapp/webhook') // Endpoint correto para Evolution? O controller usa este prefixo?
      // Nota: O controller principal pode ser /api/v1/webhook-whatsapp (WAHA) ou /api/v1/whatsapp/webhook (Evolution)
      // Verificando WhatsappController... parece que o endpoint unificado é 'webhook' no WhatsappController
      // ou existe um endpoint específico. Vou assumir o padrão e ajustar se falhar.
      // No código lido anteriormente:
      // @Post('webhook') -> prefixo do controller 'whatsapp'?
      // Vou checar o controller depois. Vamos tentar /api/v1/whatsapp/webhook
      .send(webhookPayload)
      .expect(200); // Webhooks geralmente retornam 200 ou 201

    expect(response.body.success).toBe(true);

    // Aguardar um pouco para processamento assíncrono
    await new Promise((resolve) => setTimeout(resolve, 100));

    await reloadEntities();

    // Verifica status de conexão
    expect(testNumber.status_connection).toBe(1);

    // Verifica se sync de contatos foi chamado
    expect(mockContactsService.syncFromEvolution).toHaveBeenCalledWith(
      testUser.id,
    );
  });

  it('should process connection.update (close) and mark disconnected', async () => {
    // Primeiro conecta
    await numberRepository.update(testNumber.id, { status_connection: 1 });

    const webhookPayload = {
      event: 'connection.update',
      instance: testNumber.instance,
      data: {
        state: 'close',
        statusReason: 401,
      },
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/whatsapp/webhook')
      .send(webhookPayload)
      .expect(200);

    expect(response.body.success).toBe(true);

    await reloadEntities();

    expect(testNumber.status_connection).toBe(0);
  });

  it('should process qrcode.updated and save qrcode', async () => {
    const qrCodeBase64 = 'base64_qr_code_content';
    const webhookPayload = {
      event: 'qrcode.updated',
      instance: testNumber.instance,
      data: {
        qrcode: {
          base64: qrCodeBase64,
        },
      },
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/whatsapp/webhook')
      .send(webhookPayload)
      .expect(200);

    expect(response.body.success).toBe(true);

    await reloadEntities();

    expect(testNumber.qrcode).toBe(qrCodeBase64);
  });
});
