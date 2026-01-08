# SUÍTE DE TESTES DE COMPATIBILIDADE LARAVEL → NESTJS

## VISÃO GERAL

Esta suíte de testes garante que a migração Laravel → NestJS mantenha 100% de compatibilidade funcional, estrutural e comportamental.

## ESTRUTURA DE TESTES

### 1. Testes de Unidade (Unit Tests)
- Validadores customizados
- Serviços de negócio
- Utilitários e helpers
- Transformações de dados

### 2. Testes de Integração (Integration Tests)
- Repositórios e banco de dados
- Serviços externos (WAHA, Stripe, MercadoPago)
- Sistema de filas (Bull/Redis)
- Cache e sessões

### 3. Testes End-to-End (E2E Tests)
- Compatibilidade de endpoints
- Fluxos completos de usuário
- Autenticação e autorização
- Validações e mensagens de erro

## CONFIGURAÇÃO DOS TESTES

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.module.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 30000,
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/e2e/**/*.spec.ts'],
    },
    {
      displayName: 'compatibility',
      testMatch: ['<rootDir>/test/compatibility/**/*.spec.ts'],
    },
  ],
};
```

### Test Database Setup
```typescript
// test/setup.ts
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export let testDataSource: DataSource;

beforeAll(async () => {
  // Create test database connection
  testDataSource = new DataSource({
    type: 'mysql',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT) || 3306,
    username: process.env.TEST_DB_USERNAME || 'test',
    password: process.env.TEST_DB_PASSWORD || 'test',
    database: process.env.TEST_DB_DATABASE || 'verte_test',
    entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
    synchronize: true,
    dropSchema: true,
    logging: false,
  });

  await testDataSource.initialize();
});

afterAll(async () => {
  await testDataSource.destroy();
});

beforeEach(async () => {
  // Clean database before each test
  const entities = testDataSource.entityMetadatas;
  
  for (const entity of entities) {
    const repository = testDataSource.getRepository(entity.name);
    await repository.query(`DELETE FROM ${entity.tableName}`);
  }
});
```

## TESTES DE COMPATIBILIDADE DE ENDPOINTS

### Teste Base de Endpoint
```typescript
// test/compatibility/endpoint-compatibility.base.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ValidationExceptionFilter } from '../../src/filters/validation-exception.filter';

export abstract class EndpointCompatibilityBase {
  protected app: INestApplication;
  protected authToken: string;

  async beforeEach() {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    
    // Configure exactly like Laravel
    this.app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));
    
    this.app.useGlobalFilters(new ValidationExceptionFilter());
    
    await this.app.init();
    
    // Get auth token for protected routes
    this.authToken = await this.getAuthToken();
  }

  async afterEach() {
    await this.app.close();
  }

  private async getAuthToken(): Promise<string> {
    // Create test user and get token
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      password_confirmation: 'password123'
    };

    const response = await request(this.app.getHttpServer())
      .post('/api/auth/register')
      .send(userData);

    return response.body.data.token;
  }

  // Helper methods for common assertions
  protected expectLaravelCompatibleResponse(response: any, expectedStatus: number) {
    expect(response.status).toBe(expectedStatus);
    
    if (expectedStatus >= 200 && expectedStatus < 300) {
      expect(response.body).toHaveProperty('data');
      if (response.body.message) {
        expect(typeof response.body.message).toBe('string');
      }
    } else if (expectedStatus === 422) {
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Os dados fornecidos são inválidos.');
    }
  }

  protected expectLaravelPagination(response: any) {
    expect(response.body).toHaveProperty('pagination');
    expect(response.body.pagination).toHaveProperty('current_page');
    expect(response.body.pagination).toHaveProperty('last_page');
    expect(response.body.pagination).toHaveProperty('per_page');
    expect(response.body.pagination).toHaveProperty('total');
  }

  protected expectLaravelTimestamps(data: any) {
    expect(data).toHaveProperty('created_at');
    expect(data).toHaveProperty('updated_at');
    
    // Validate timestamp format (Laravel format)
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
    expect(data.created_at).toMatch(timestampRegex);
    expect(data.updated_at).toMatch(timestampRegex);
  }
}
```

### Testes de Autenticação
```typescript
// test/compatibility/auth.compatibility.spec.ts
import { EndpointCompatibilityBase } from './endpoint-compatibility.base';
import * as request from 'supertest';

describe('Auth Endpoints Compatibility', () => {
  let testSuite: EndpointCompatibilityBase;

  beforeEach(async () => {
    testSuite = new (class extends EndpointCompatibilityBase {})();
    await testSuite.beforeEach();
  });

  afterEach(async () => {
    await testSuite.afterEach();
  });

  describe('POST /api/auth/login', () => {
    it('should return identical Laravel login response structure', async () => {
      // First create user
      const userData = {
        name: 'Test User',
        email: 'login@example.com',
        password: 'password123',
        password_confirmation: 'password123'
      };

      await request(testSuite.app.getHttpServer())
        .post('/api/auth/register')
        .send(userData);

      // Test login
      const loginData = {
        email: 'login@example.com',
        password: 'password123'
      };

      const response = await request(testSuite.app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData);

      testSuite.expectLaravelCompatibleResponse(response, 200);
      expect(response.body.message).toBe('Login realizado com sucesso');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('token_type');
      expect(response.body.data).toHaveProperty('expires_in');
      expect(response.body.data.token_type).toBe('Bearer');
      
      testSuite.expectLaravelTimestamps(response.body.data.user);
    });

    it('should return identical validation errors', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: ''
      };

      const response = await request(testSuite.app.getHttpServer())
        .post('/api/auth/login')
        .send(invalidData);

      testSuite.expectLaravelCompatibleResponse(response, 422);
      expect(response.body.errors.email).toContain('O campo email deve ser um email válido.');
      expect(response.body.errors.password).toContain('O campo password é obrigatório.');
    });

    it('should return correct error for invalid credentials', async () => {
      const invalidCredentials = {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      };

      const response = await request(testSuite.app.getHttpServer())
        .post('/api/auth/login')
        .send(invalidCredentials);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Credenciais inválidas');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should create user with Laravel-compatible response', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        password_confirmation: 'password123'
      };

      const response = await request(testSuite.app.getHttpServer())
        .post('/api/auth/register')
        .send(userData);

      testSuite.expectLaravelCompatibleResponse(response, 201);
      expect(response.body.message).toBe('Usuário registrado com sucesso');
      expect(response.body.data.user.name).toBe('New User');
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.user).not.toHaveProperty('password');
      
      testSuite.expectLaravelTimestamps(response.body.data.user);
    });

    it('should validate unique email', async () => {
      const userData = {
        name: 'User 1',
        email: 'duplicate@example.com',
        password: 'password123',
        password_confirmation: 'password123'
      };

      // Create first user
      await request(testSuite.app.getHttpServer())
        .post('/api/auth/register')
        .send(userData);

      // Try to create second user with same email
      const duplicateData = {
        ...userData,
        name: 'User 2'
      };

      const response = await request(testSuite.app.getHttpServer())
        .post('/api/auth/register')
        .send(duplicateData);

      testSuite.expectLaravelCompatibleResponse(response, 422);
      expect(response.body.errors.email).toContain('O campo email já está sendo utilizado.');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return authenticated user data', async () => {
      const response = await request(testSuite.app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testSuite.authToken}`);

      testSuite.expectLaravelCompatibleResponse(response, 200);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).not.toHaveProperty('password');
      
      testSuite.expectLaravelTimestamps(response.body.data);
    });

    it('should require authentication', async () => {
      const response = await request(testSuite.app.getHttpServer())
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });
});
```

### Testes de Campanhas
```typescript
// test/compatibility/campaigns.compatibility.spec.ts
describe('Campaigns Endpoints Compatibility', () => {
  let testSuite: EndpointCompatibilityBase;

  beforeEach(async () => {
    testSuite = new (class extends EndpointCompatibilityBase {})();
    await testSuite.beforeEach();
    
    // Create test data (user, number, public)
    await testSuite.createTestData();
  });

  afterEach(async () => {
    await testSuite.afterEach();
  });

  describe('GET /api/campaigns', () => {
    it('should return paginated campaigns with Laravel structure', async () => {
      // Create test campaigns
      await testSuite.createTestCampaigns(3);

      const response = await request(testSuite.app.getHttpServer())
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${testSuite.authToken}`);

      testSuite.expectLaravelCompatibleResponse(response, 200);
      testSuite.expectLaravelPagination(response);
      
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const campaign = response.body.data[0];
        expect(campaign).toHaveProperty('id');
        expect(campaign).toHaveProperty('name');
        expect(campaign).toHaveProperty('type');
        expect(campaign).toHaveProperty('status');
        expect(campaign).toHaveProperty('progress');
        
        testSuite.expectLaravelTimestamps(campaign);
      }
    });

    it('should filter campaigns by status', async () => {
      await testSuite.createTestCampaigns(5, { status: 1 });
      await testSuite.createTestCampaigns(3, { status: 2 });

      const response = await request(testSuite.app.getHttpServer())
        .get('/api/campaigns?status=1')
        .set('Authorization', `Bearer ${testSuite.authToken}`);

      testSuite.expectLaravelCompatibleResponse(response, 200);
      
      response.body.data.forEach(campaign => {
        expect(campaign.status).toBe(1);
      });
    });
  });

  describe('POST /api/campaigns', () => {
    it('should create campaign with Laravel-compatible response', async () => {
      const campaignData = {
        name: 'Test Campaign',
        type: 1,
        public_id: testSuite.testPublicId,
        number_id: testSuite.testNumberId,
        messages: [{
          content: 'Test message',
          delay: 10,
          type_message: 1
        }]
      };

      const response = await request(testSuite.app.getHttpServer())
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${testSuite.authToken}`)
        .send(campaignData);

      testSuite.expectLaravelCompatibleResponse(response, 201);
      expect(response.body.message).toBe('Campanha criada com sucesso');
      expect(response.body.data.name).toBe('Test Campaign');
      expect(response.body.data.type).toBe(1);
      expect(response.body.data.status).toBe(1); // pending
      expect(response.body.data.progress).toBe(0);
      
      testSuite.expectLaravelTimestamps(response.body.data);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '',
        type: 99,
        public_id: 999999,
        messages: []
      };

      const response = await request(testSuite.app.getHttpServer())
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${testSuite.authToken}`)
        .send(invalidData);

      testSuite.expectLaravelCompatibleResponse(response, 422);
      expect(response.body.errors.name).toContain('O campo nome é obrigatório.');
      expect(response.body.errors.type).toContain('O campo tipo deve ser 1, 2, 3 ou 4.');
      expect(response.body.errors.public_id).toContain('O público selecionado não existe.');
      expect(response.body.errors.messages).toContain('Pelo menos uma mensagem é obrigatória.');
    });
  });
});
```

### Testes de Performance
```typescript
// test/performance/response-time.spec.ts
describe('Performance Compatibility', () => {
  let app: INestApplication;
  let authToken: string;

  beforeEach(async () => {
    // Setup app
  });

  describe('Response Times', () => {
    it('should match Laravel response times for authentication', async () => {
      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should be under 1 second
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(totalTime).toBeLessThan(5000); // All requests under 5 seconds
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during heavy operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform 100 operations
      for (let i = 0; i < 100; i++) {
        await request(app.getHttpServer())
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});
```

## FERRAMENTAS DE TESTE

### Utilitários de Comparação
```typescript
// test/utils/laravel-comparison.util.ts
export class LaravelComparisonUtil {
  /**
   * Compare NestJS response with expected Laravel format
   */
  static compareResponse(actual: any, expected: any): boolean {
    // Deep comparison with specific Laravel patterns
    return this.deepCompare(actual, expected);
  }

  /**
   * Validate Laravel timestamp format
   */
  static isLaravelTimestamp(timestamp: string): boolean {
    const laravelFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
    return laravelFormat.test(timestamp);
  }

  /**
   * Compare validation error structure
   */
  static compareValidationErrors(nestErrors: any, laravelErrors: any): boolean {
    if (!nestErrors.message || nestErrors.message !== 'Os dados fornecidos são inválidos.') {
      return false;
    }

    if (!nestErrors.errors || typeof nestErrors.errors !== 'object') {
      return false;
    }

    // Compare field-level errors
    for (const field in laravelErrors) {
      if (!nestErrors.errors[field]) {
        return false;
      }

      if (!Array.isArray(nestErrors.errors[field])) {
        return false;
      }

      // Check if all Laravel errors are present
      for (const error of laravelErrors[field]) {
        if (!nestErrors.errors[field].includes(error)) {
          return false;
        }
      }
    }

    return true;
  }

  private static deepCompare(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    
    if (obj1 == null || obj2 == null) return false;
    
    if (typeof obj1 !== typeof obj2) return false;
    
    if (typeof obj1 === 'object') {
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);
      
      if (keys1.length !== keys2.length) return false;
      
      for (const key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!this.deepCompare(obj1[key], obj2[key])) return false;
      }
    }
    
    return true;
  }
}
```

### Factory de Dados de Teste
```typescript
// test/factories/user.factory.ts
export class UserFactory {
  static create(overrides?: Partial<any>): any {
    return {
      name: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      password_confirmation: 'password123',
      status: 'active',
      profile: 'user',
      plan_id: 1,
      ...overrides
    };
  }

  static createMany(count: number, overrides?: Partial<any>): any[] {
    return Array(count).fill(null).map((_, index) => 
      this.create({
        email: `test${Date.now()}_${index}@example.com`,
        ...overrides
      })
    );
  }
}

// test/factories/campaign.factory.ts
export class CampaignFactory {
  static create(overrides?: Partial<any>): any {
    return {
      name: `Test Campaign ${Date.now()}`,
      type: 1,
      status: 1,
      progress: 0,
      public_id: 1,
      number_id: 1,
      messages: [
        {
          content: 'Test message',
          delay: 10,
          type_message: 1
        }
      ],
      ...overrides
    };
  }
}
```

## SCRIPTS DE EXECUÇÃO

### Package.json Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=src/.*\\.spec\\.ts$",
    "test:integration": "jest --testPathPattern=test/integration",
    "test:e2e": "jest --testPathPattern=test/e2e",
    "test:compatibility": "jest --testPathPattern=test/compatibility",
    "test:performance": "jest --testPathPattern=test/performance",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e && npm run test:compatibility"
  }
}
```

### Script de Teste Automatizado
```bash
#!/bin/bash
# test-compatibility.sh

echo "🧪 EXECUTANDO SUÍTE COMPLETA DE TESTES DE COMPATIBILIDADE"
echo "═══════════════════════════════════════════════════════════"

# Configurar ambiente de teste
export NODE_ENV=test
export TEST_DB_HOST=localhost
export TEST_DB_PORT=3306
export TEST_DB_USERNAME=test
export TEST_DB_PASSWORD=test
export TEST_DB_DATABASE=verte_test

# Executar testes em ordem
echo "📋 1. Testes de Unidade..."
npm run test:unit

if [ $? -ne 0 ]; then
    echo "❌ Testes de unidade falharam"
    exit 1
fi

echo "🔗 2. Testes de Integração..."
npm run test:integration

if [ $? -ne 0 ]; then
    echo "❌ Testes de integração falharam"
    exit 1
fi

echo "🌐 3. Testes End-to-End..."
npm run test:e2e

if [ $? -ne 0 ]; then
    echo "❌ Testes E2E falharam"
    exit 1
fi

echo "⚡ 4. Testes de Compatibilidade..."
npm run test:compatibility

if [ $? -ne 0 ]; then
    echo "❌ Testes de compatibilidade falharam"
    exit 1
fi

echo "🏃 5. Testes de Performance..."
npm run test:performance

if [ $? -ne 0 ]; then
    echo "❌ Testes de performance falharam"
    exit 1
fi

echo "✅ TODOS OS TESTES PASSARAM!"
echo "📊 Gerando relatório de cobertura..."
npm run test:coverage

echo "🎉 SUÍTE DE TESTES CONCLUÍDA COM SUCESSO!"
```

## RELATÓRIOS E MÉTRICAS

### Coverage Report
```typescript
// jest.config.js - Coverage configuration
module.exports = {
  // ... other config
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
};
```

### Metrics Collection
```typescript
// test/utils/metrics.util.ts
export class TestMetrics {
  private static metrics: any = {};

  static record(testName: string, metric: string, value: number) {
    if (!this.metrics[testName]) {
      this.metrics[testName] = {};
    }
    this.metrics[testName][metric] = value;
  }

  static getReport(): any {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      summary: this.generateSummary()
    };
  }

  private static generateSummary() {
    const responseTimeMetrics = [];
    
    Object.keys(this.metrics).forEach(test => {
      if (this.metrics[test].responseTime) {
        responseTimeMetrics.push(this.metrics[test].responseTime);
      }
    });

    return {
      averageResponseTime: responseTimeMetrics.length > 0 
        ? responseTimeMetrics.reduce((a, b) => a + b) / responseTimeMetrics.length 
        : 0,
      maxResponseTime: Math.max(...responseTimeMetrics),
      minResponseTime: Math.min(...responseTimeMetrics),
      totalTests: Object.keys(this.metrics).length
    };
  }
}
```

## CHECKLIST DE COMPATIBILIDADE

### ✅ Estrutural
- [ ] Todos os endpoints respondem com estrutura Laravel
- [ ] Paginação idêntica (current_page, last_page, per_page, total)
- [ ] Timestamps no formato Laravel (Y-m-d\TH:i:s.u\Z)
- [ ] Soft deletes funcionando identicamente
- [ ] Relacionamentos carregados corretamente

### ✅ Funcional
- [ ] Validações retornam mensagens idênticas em português
- [ ] Status codes preservados (200, 201, 422, 403, 404, 500)
- [ ] Autenticação JWT compatível com Sanctum
- [ ] Sistema de permissões funcionando
- [ ] Filtros e busca operacionais

### ✅ Performance
- [ ] Tempos de resposta equivalentes ou superiores
- [ ] Uso de memória estável
- [ ] Suporte a requisições concorrentes
- [ ] Cache funcionando corretamente

### ✅ Integrações
- [ ] APIs externas (WAHA, Stripe, MercadoPago) funcionais
- [ ] Sistema de filas operacional
- [ ] Email e notificações funcionando
- [ ] File upload/download preservado

### ✅ Dados
- [ ] Migração de dados sem perda
- [ ] Relacionamentos preservados
- [ ] Constraints e validações de banco
- [ ] Backup e restore funcionais

**OBJETIVO**: 100% dos testes passando antes de considerar a migração completa.