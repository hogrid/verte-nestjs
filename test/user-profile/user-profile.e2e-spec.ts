import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserStatus, UserProfile } from '../../src/database/entities';
import * as bcrypt from 'bcryptjs';

/**
 * User Profile Module E2E Tests
 * Validates 100% Laravel compatibility for all 2 user profile endpoints
 *
 * Endpoints tested:
 * 1. GET /api/v1/profile
 * 2. PUT /api/v1/profile
 */
describe('User Profile Module (e2e) - Laravel Compatibility Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testUser: User;

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
      const numberRepository = dataSource.getRepository('numbers');
      await numberRepository.delete({ user_id: testUser.id });

      await dataSource.getRepository(User).delete({ id: testUser.id });
    }
    await app.close();
  });

  async function createTestUser() {
    const userRepository = dataSource.getRepository(User);

    await userRepository.delete({ email: 'profile-test@verte.com' });

    testUser = userRepository.create({
      name: 'Profile',
      last_name: 'Tester',
      email: 'profile-test@verte.com',
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
        email: 'profile-test@verte.com',
        password: 'password123',
      });

    authToken = response.body.token;
  }

  /**
   * ===========================================
   * 1. GET /api/v1/profile
   * ===========================================
   */
  describe('GET /api/v1/profile', () => {
    it('should get user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Validate Laravel-compatible response structure
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('last_name');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('cel');
      expect(response.body).toHaveProperty('cpfCnpj');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('profile');
      expect(response.body).toHaveProperty('confirmed_mail');
      expect(response.body).toHaveProperty('active');

      // Validate data
      expect(response.body.email).toBe('profile-test@verte.com');
      expect(response.body.name).toBe('Profile');

      // Should not include password
      expect(response.body).not.toHaveProperty('password');
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/profile')
        .expect(401);
    });
  });

  /**
   * ===========================================
   * 2. PUT /api/v1/profile
   * ===========================================
   */
  describe('PUT /api/v1/profile', () => {
    it('should update user profile without password', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          last_name: 'Updated Lastname',
          cel: '11988887777',
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Updated Name');
      expect(response.body.last_name).toBe('Updated Lastname');
      expect(response.body.cel).toBe('11988887777');
    });

    it('should update password with confirmation', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          password: 'newpassword123',
          password_confirmation: 'newpassword123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');

      // Verify password was changed by trying to login with new password
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/login')
        .send({
          email: 'profile-test@verte.com',
          password: 'newpassword123',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');

      // Reset password back
      await request(app.getHttpServer())
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'password123',
          password_confirmation: 'password123',
        })
        .expect(200);
    });

    it('should reject password change without confirmation', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
          password: 'newpassword123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('senhas');
    });

    it('should reject password change with mismatched confirmation', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
          password: 'newpassword123',
          password_confirmation: 'different',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('senhas');
    });

    it('should validate email uniqueness if trying to change', async () => {
      // Create another user
      const userRepository = dataSource.getRepository(User);
      const anotherUser = userRepository.create({
        name: 'Another',
        email: 'another@verte.com',
        password: await bcrypt.hash('password123', 10),
        status: UserStatus.ACTIVED,
        profile: UserProfile.USER,
        confirmed_mail: 1,
        active: 1,
        cel: '11999999998',
        cpfCnpj: '12345678902',
      });
      await userRepository.save(anotherUser);

      // Try to change email to existing one
      const response = await request(app.getHttpServer())
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'another@verte.com',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');

      // Cleanup
      const numberRepository = dataSource.getRepository('numbers');
      await numberRepository.delete({ user_id: anotherUser.id });
      await userRepository.delete({ id: anotherUser.id });
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/profile')
        .send({
          name: 'Test',
        })
        .expect(401);
    });
  });

  /**
   * ===========================================
   * Laravel Compatibility Validation
   * ===========================================
   */
  describe('Laravel Compatibility Checks', () => {
    it('should maintain Laravel response structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify all expected fields
      const requiredFields = [
        'id',
        'name',
        'email',
        'status',
        'profile',
        'confirmed_mail',
        'active',
      ];

      requiredFields.forEach((field) => {
        expect(response.body).toHaveProperty(field);
      });
    });

    it('should not expose password field', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).not.toHaveProperty('password');
    });

    it('should validate password confirmation in Portuguese', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'test',
          password_confirmation: 'different',
        })
        .expect(400);

      expect(response.body.message).toContain('senhas');
    });
  });
});
