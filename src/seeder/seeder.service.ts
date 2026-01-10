import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../database/entities/plan.entity';
import {
  User,
  UserProfile,
  UserStatus,
} from '../database/entities/user.entity';
import { Server } from '../database/entities/server.entity';
import { Number } from '../database/entities/number.entity';
import { Configuration } from '../database/entities/configuration.entity';
import { Setting } from '../database/entities/setting.entity';
import { Label } from '../database/entities/label.entity';
import { Publics } from '../database/entities/publics.entity';
import { Contact } from '../database/entities/contact.entity';
import { MessageTemplate } from '../database/entities/message-template.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Server)
    private readonly serverRepository: Repository<Server>,
    @InjectRepository(Number)
    private readonly numberRepository: Repository<Number>,
    @InjectRepository(Configuration)
    private readonly configurationRepository: Repository<Configuration>,
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
    @InjectRepository(Label)
    private readonly labelRepository: Repository<Label>,
    @InjectRepository(Publics)
    private readonly publicsRepository: Repository<Publics>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(MessageTemplate)
    private readonly messageTemplateRepository: Repository<MessageTemplate>,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureAdminUser();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao garantir usuário admin: ${msg}`);
    }
  }

  async seed() {
    this.logger.log('🌱 Starting database seeding...');

    // 1. Seed independent tables first
    const plans = await this.seedPlans();
    await this.seedSettings();
    const servers = await this.seedServers();

    // 2. Seed users (depends on plans)
    const users = await this.seedUsers(plans);

    // 3. Seed tables that depend on users
    const numbers = await this.seedNumbers(users, servers);
    await this.seedConfigurations(users);
    await this.seedMessageTemplates(users);

    // 4. Seed tables that depend on users and numbers
    await this.seedLabels(users, numbers);
    const publics = await this.seedPublics(users, numbers);

    // 5. Seed contacts (depends on users, numbers, publics)
    await this.seedContacts(users, numbers, publics);

    this.logger.log('✅ Seeding completed successfully.');
  }

  /**
   * Fresh seed - clears all data and reseeds from scratch
   */
  async fresh() {
    this.logger.log(
      '🔄 Starting FRESH database seeding (clearing all data)...',
    );

    // Clear tables in reverse dependency order (child tables first)
    await this.clearAllTables();

    // Now seed with fresh data (force mode)
    await this.seedFresh();

    this.logger.log('✅ Fresh seeding completed successfully.');
  }

  private async clearAllTables() {
    this.logger.log('🗑️ Clearing all seeded tables...');

    // Order matters! Clear tables with foreign keys first
    const tablesToClear = [
      { name: 'contacts', repo: this.contactRepository },
      { name: 'publics', repo: this.publicsRepository },
      { name: 'labels', repo: this.labelRepository },
      { name: 'configurations', repo: this.configurationRepository },
      { name: 'numbers', repo: this.numberRepository },
      { name: 'users', repo: this.userRepository },
      { name: 'servers', repo: this.serverRepository },
      { name: 'plans', repo: this.planRepository },
    ];

    for (const table of tablesToClear) {
      try {
        // Use query builder to delete all records (bypasses soft delete)
        await table.repo.createQueryBuilder().delete().execute();
        this.logger.log(`🗑️ Cleared table: ${table.name}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`⚠️ Could not clear ${table.name}: ${msg}`);
      }
    }
  }

  private async seedFresh() {
    this.logger.log('🌱 Inserting fresh seed data...');

    // 1. Seed independent tables first
    const plans = await this.seedPlansForce();
    await this.seedSettings();
    const servers = await this.seedServersForce();

    // 2. Seed users (depends on plans)
    const users = await this.seedUsersForce(plans);

    // 3. Seed tables that depend on users
    const numbers = await this.seedNumbersForce(users, servers);
    await this.seedConfigurationsForce(users);
    await this.seedMessageTemplates(users);

    // 4. Seed tables that depend on users and numbers
    await this.seedLabelsForce(users, numbers);
    const publics = await this.seedPublicsForce(users, numbers);

    // 5. Seed contacts (depends on users, numbers, publics)
    await this.seedContactsForce(users, numbers, publics);
  }

  // ==================== FORCE SEED METHODS (no existence check) ====================

  private async seedPlansForce(): Promise<Plan[]> {
    try {
      const plansToCreate = [
        {
          name: 'Plano Gratuito',
          value: 0,
          unlimited: 0,
          medias: 1,
          reports: 0,
          schedule: 0,
        },
        {
          name: 'Plano Básico',
          value: 49.9,
          unlimited: 0,
          medias: 1,
          reports: 1,
          schedule: 1,
        },
        {
          name: 'Plano Profissional',
          value: 99.9,
          unlimited: 1,
          medias: 1,
          reports: 1,
          schedule: 1,
          popular: 1,
        },
      ];

      const createdPlans: Plan[] = [];
      for (const planData of plansToCreate) {
        const newPlan = this.planRepository.create(planData);
        const savedPlan = await this.planRepository.save(newPlan);
        createdPlans.push(savedPlan);
        this.logger.log(`✅ Created plan: ${savedPlan.name}`);
      }
      return createdPlans;
    } catch (error) {
      this.logger.warn('⚠️ Plans table error, skipping seeding.');
      return [];
    }
  }

  private async seedServersForce(): Promise<Server[]> {
    try {
      const serversToCreate = [
        {
          ip: 'localhost:8080',
          limit: 50,
          total: 0,
          type: 'evolution',
        },
        {
          ip: 'api.evolution.local',
          limit: 100,
          total: 0,
          type: 'evolution',
        },
      ];

      const createdServers: Server[] = [];
      for (const serverData of serversToCreate) {
        const newServer = this.serverRepository.create(serverData);
        const savedServer = await this.serverRepository.save(newServer);
        createdServers.push(savedServer);
        this.logger.log(`✅ Created server: ${savedServer.ip}`);
      }
      return createdServers;
    } catch (error) {
      this.logger.warn('⚠️ Servers table error, skipping seeding.');
      return [];
    }
  }

  private async seedUsersForce(plans: Plan[]): Promise<User[]> {
    try {
      const proPlan = plans.find((p) => p.name === 'Plano Profissional');
      const basicPlan = plans.find((p) => p.name === 'Plano Básico');
      const freePlan = plans.find((p) => p.name === 'Plano Gratuito');

      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash('123456', salt);

      const usersToCreate = [
        {
          name: 'Admin',
          last_name: 'Verte',
          email: 'admin@verte.com',
          cel: '5511999999999',
          password: hashedPassword,
          profile: UserProfile.ADMINISTRATOR,
          status: UserStatus.ACTIVED,
          plan_id: proPlan?.id || null,
          confirmed_mail: 1,
          active: 1,
        },
        {
          name: 'Usuário Pro',
          last_name: 'Teste',
          email: 'pro@verte.com',
          cel: '5511988888888',
          password: hashedPassword,
          profile: UserProfile.USER,
          status: UserStatus.ACTIVED,
          plan_id: proPlan?.id || null,
          confirmed_mail: 1,
          active: 1,
        },
        {
          name: 'Usuário Básico',
          last_name: 'Teste',
          email: 'basico@verte.com',
          cel: '5511977777777',
          password: hashedPassword,
          profile: UserProfile.USER,
          status: UserStatus.ACTIVED,
          plan_id: basicPlan?.id || null,
          confirmed_mail: 1,
          active: 1,
        },
        {
          name: 'Usuário Grátis',
          last_name: 'Teste',
          email: 'free@verte.com',
          cel: '5511966666666',
          password: hashedPassword,
          profile: UserProfile.USER,
          status: UserStatus.ACTIVED,
          plan_id: freePlan?.id || null,
          confirmed_mail: 1,
          active: 1,
        },
      ];

      const createdUsers: User[] = [];
      for (const userData of usersToCreate) {
        const newUser = this.userRepository.create(userData);
        const savedUser = await this.userRepository.save(newUser);
        createdUsers.push(savedUser);
        this.logger.log(`✅ Created user: ${savedUser.email}`);
      }
      return createdUsers;
    } catch (error) {
      this.logger.warn('⚠️ Users table error, skipping seeding.');
      return [];
    }
  }

  private async seedNumbersForce(
    users: User[],
    servers: Server[],
  ): Promise<Number[]> {
    try {
      if (users.length === 0) {
        this.logger.log('📱 No users to create numbers for, skipping.');
        return [];
      }

      const defaultServer = servers[0];
      const createdNumbers: Number[] = [];

      for (const user of users) {
        const cel = user.cel || `551199999${String(user.id).padStart(4, '0')}`;
        const cleanCel = cel.replace(/\D/g, '');

        const numberData = {
          user_id: user.id,
          server_id: defaultServer?.id || null,
          name: 'Número Principal',
          cel: cleanCel,
          instance: `WPP_${cleanCel}_${user.id}`,
          status: 1,
          status_connection: 0,
          extra: 0,
          chat_sync: 0,
          labels_active: 1,
        };

        const newNumber = this.numberRepository.create(numberData);
        const savedNumber = await this.numberRepository.save(newNumber);
        createdNumbers.push(savedNumber);
        this.logger.log(
          `✅ Created number for user ${user.email}: ${savedNumber.cel}`,
        );
      }
      return createdNumbers;
    } catch (error) {
      this.logger.warn('⚠️ Numbers table error, skipping seeding.');
      return [];
    }
  }

  private async seedConfigurationsForce(
    users: User[],
  ): Promise<Configuration[]> {
    try {
      if (users.length === 0) {
        this.logger.log('🔧 No users to create configurations for, skipping.');
        return [];
      }

      const createdConfigs: Configuration[] = [];
      for (const user of users) {
        const configData = {
          user_id: user.id,
          timer_delay: 30,
        };

        const newConfig = this.configurationRepository.create(configData);
        const savedConfig = await this.configurationRepository.save(newConfig);
        createdConfigs.push(savedConfig);
        this.logger.log(`✅ Created configuration for user ${user.email}`);
      }
      return createdConfigs;
    } catch (error) {
      this.logger.warn('⚠️ Configurations table error, skipping seeding.');
      return [];
    }
  }

  private async seedLabelsForce(
    users: User[],
    numbers: Number[],
  ): Promise<Label[]> {
    try {
      if (users.length === 0 || numbers.length === 0) {
        this.logger.log('🏷️ No users/numbers to create labels for, skipping.');
        return [];
      }

      const labelNames = [
        'Cliente VIP',
        'Lead Quente',
        'Lead Frio',
        'Pendente',
        'Finalizado',
        'Interessado',
        'Não Perturbe',
        'Novo',
      ];

      const createdLabels: Label[] = [];
      for (const user of users) {
        const userNumber = numbers.find((n) => n.user_id === user.id);
        if (!userNumber) continue;

        for (const labelName of labelNames) {
          const labelData = {
            user_id: user.id,
            number_id: userNumber.id,
            name: labelName,
          };

          const newLabel = this.labelRepository.create(labelData);
          const savedLabel = await this.labelRepository.save(newLabel);
          createdLabels.push(savedLabel);
        }
        this.logger.log(
          `✅ Created ${labelNames.length} labels for user ${user.email}`,
        );
      }
      return createdLabels;
    } catch (error) {
      this.logger.warn('⚠️ Labels table error, skipping seeding.');
      return [];
    }
  }

  private async seedPublicsForce(
    users: User[],
    numbers: Number[],
  ): Promise<Publics[]> {
    try {
      if (users.length === 0) {
        this.logger.log('👥 No users to create publics for, skipping.');
        return [];
      }

      const publicNames = [
        'Todos os Contatos',
        'Clientes Ativos',
        'Leads',
        'Newsletter',
        'VIP',
      ];

      const createdPublics: Publics[] = [];
      for (const user of users) {
        const userNumber = numbers.find((n) => n.user_id === user.id);

        for (const [index, publicName] of publicNames.entries()) {
          const publicData = {
            user_id: user.id,
            number_id: userNumber?.id || null,
            name: publicName,
            status: index === 0 ? 1 : 0,
            from_chat: 0,
            from_tag: 0,
          };

          const newPublic = this.publicsRepository.create(publicData);
          const savedPublic = await this.publicsRepository.save(newPublic);
          createdPublics.push(savedPublic);
        }
        this.logger.log(
          `✅ Created ${publicNames.length} publics for user ${user.email}`,
        );
      }
      return createdPublics;
    } catch (error) {
      this.logger.warn('⚠️ Publics table error, skipping seeding.');
      return [];
    }
  }

  private async seedContactsForce(
    users: User[],
    numbers: Number[],
    publics: Publics[],
  ): Promise<Contact[]> {
    try {
      if (users.length === 0) {
        this.logger.log('📇 No users to create contacts for, skipping.');
        return [];
      }

      const contactsData = [
        { name: 'João Silva', number: '5511911111111' },
        { name: 'Maria Santos', number: '5511922222222' },
        { name: 'Pedro Oliveira', number: '5511933333333' },
        { name: 'Ana Costa', number: '5511944444444' },
        { name: 'Carlos Pereira', number: '5511955555555' },
        { name: 'Juliana Lima', number: '5521911111111' },
        { name: 'Rafael Souza', number: '5521922222222' },
        { name: 'Fernanda Alves', number: '5521933333333' },
        { name: 'Lucas Mendes', number: '5531911111111' },
        { name: 'Camila Rodrigues', number: '5531922222222' },
      ];

      const createdContacts: Contact[] = [];
      for (const user of users) {
        const userNumber = numbers.find((n) => n.user_id === user.id);
        const userPublic = publics.find(
          (p) => p.user_id === user.id && p.name === 'Todos os Contatos',
        );
        const celOwner = userNumber?.cel || '';

        for (const [index, contactData] of contactsData.entries()) {
          const contact = {
            user_id: user.id,
            number_id: userNumber?.id || null,
            public_id: userPublic?.id || null,
            name: contactData.name,
            number: contactData.number,
            cel_owner: celOwner,
            status: 1,
            type: 1,
            labelsName:
              index < 3 ? 'Cliente VIP' : index < 6 ? 'Lead Quente' : 'Novo',
          };

          const newContact = this.contactRepository.create(contact);
          const savedContact = await this.contactRepository.save(newContact);
          createdContacts.push(savedContact);
        }
        this.logger.log(
          `✅ Created ${contactsData.length} contacts for user ${user.email}`,
        );
      }
      return createdContacts;
    } catch (error) {
      this.logger.warn('⚠️ Contacts table error, skipping seeding.');
      return [];
    }
  }

  // ==================== PLANS ====================
  private async seedPlans(): Promise<Plan[]> {
    try {
      const existingPlans = await this.planRepository.find();
      if (existingPlans.length > 0) {
        this.logger.log('📋 Plans table is not empty, skipping seeding.');
        return existingPlans;
      }

      const plansToCreate = [
        {
          name: 'Plano Gratuito',
          value: 0,
          unlimited: 0,
          medias: 1,
          reports: 0,
          schedule: 0,
        },
        {
          name: 'Plano Básico',
          value: 49.9,
          unlimited: 0,
          medias: 1,
          reports: 1,
          schedule: 1,
        },
        {
          name: 'Plano Profissional',
          value: 99.9,
          unlimited: 1,
          medias: 1,
          reports: 1,
          schedule: 1,
          popular: 1,
        },
      ];

      const createdPlans: Plan[] = [];
      for (const planData of plansToCreate) {
        const newPlan = this.planRepository.create(planData);
        const savedPlan = await this.planRepository.save(newPlan);
        createdPlans.push(savedPlan);
        this.logger.log(`✅ Created plan: ${savedPlan.name}`);
      }
      return createdPlans;
    } catch (error) {
      this.logger.warn('⚠️ Plans table error, skipping seeding.');
      return [];
    }
  }

  // ==================== SETTINGS ====================
  private async seedSettings(): Promise<Setting[]> {
    try {
      const existingSettings = await this.settingRepository.find();
      if (existingSettings.length > 0) {
        this.logger.log('⚙️ Settings table is not empty, skipping seeding.');
        return existingSettings;
      }

      const settingsToCreate = [
        {
          timer_normal: 30,
          timer_fast: 10,
          number_value: 49.9,
          limit_campaign: 1000,
          hour_open: '08:00',
          hour_close: '18:00',
        },
      ];

      const createdSettings: Setting[] = [];
      for (const settingData of settingsToCreate) {
        const newSetting = this.settingRepository.create(settingData);
        const savedSetting = await this.settingRepository.save(newSetting);
        createdSettings.push(savedSetting);
        this.logger.log(`✅ Created setting: ${savedSetting.id}`);
      }
      return createdSettings;
    } catch (error) {
      this.logger.warn('⚠️ Settings table schema mismatch, skipping seeding.');
      return [];
    }
  }

  // ==================== SERVERS ====================
  private async seedServers(): Promise<Server[]> {
    try {
      const existingServers = await this.serverRepository.find();
      if (existingServers.length > 0) {
        this.logger.log('🖥️ Servers table is not empty, skipping seeding.');
        return existingServers;
      }

      const serversToCreate = [
        {
          ip: 'localhost:8080',
          limit: 50,
          total: 0,
          type: 'evolution',
        },
        {
          ip: 'api.evolution.local',
          limit: 100,
          total: 0,
          type: 'evolution',
        },
      ];

      const createdServers: Server[] = [];
      for (const serverData of serversToCreate) {
        const newServer = this.serverRepository.create(serverData);
        const savedServer = await this.serverRepository.save(newServer);
        createdServers.push(savedServer);
        this.logger.log(`✅ Created server: ${savedServer.ip}`);
      }
      return createdServers;
    } catch (error) {
      this.logger.warn('⚠️ Servers table error, skipping seeding.');
      return [];
    }
  }

  // ==================== USERS ====================
  private async seedUsers(plans: Plan[]): Promise<User[]> {
    try {
      const existingUsers = await this.userRepository.find();
      if (existingUsers.length > 0) {
        this.logger.log('👤 Users table is not empty, skipping seeding.');
        return existingUsers;
      }

      const proPlan = plans.find((p) => p.name === 'Plano Profissional');
      const basicPlan = plans.find((p) => p.name === 'Plano Básico');
      const freePlan = plans.find((p) => p.name === 'Plano Gratuito');

      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash('123456', salt);

      const usersToCreate = [
        {
          name: 'Admin',
          last_name: 'Verte',
          email: 'admin@verte.com',
          cel: '5511999999999',
          password: hashedPassword,
          profile: UserProfile.ADMINISTRATOR,
          status: UserStatus.ACTIVED,
          plan_id: proPlan?.id || null,
          confirmed_mail: 1,
          active: 1,
        },
        {
          name: 'Usuário Pro',
          last_name: 'Teste',
          email: 'pro@verte.com',
          cel: '5511988888888',
          password: hashedPassword,
          profile: UserProfile.USER,
          status: UserStatus.ACTIVED,
          plan_id: proPlan?.id || null,
          confirmed_mail: 1,
          active: 1,
        },
        {
          name: 'Usuário Básico',
          last_name: 'Teste',
          email: 'basico@verte.com',
          cel: '5511977777777',
          password: hashedPassword,
          profile: UserProfile.USER,
          status: UserStatus.ACTIVED,
          plan_id: basicPlan?.id || null,
          confirmed_mail: 1,
          active: 1,
        },
        {
          name: 'Usuário Grátis',
          last_name: 'Teste',
          email: 'free@verte.com',
          cel: '5511966666666',
          password: hashedPassword,
          profile: UserProfile.USER,
          status: UserStatus.ACTIVED,
          plan_id: freePlan?.id || null,
          confirmed_mail: 1,
          active: 1,
        },
      ];

      const createdUsers: User[] = [];
      for (const userData of usersToCreate) {
        const newUser = this.userRepository.create(userData);
        const savedUser = await this.userRepository.save(newUser);
        createdUsers.push(savedUser);
        this.logger.log(`✅ Created user: ${savedUser.email}`);
      }
      return createdUsers;
    } catch (error) {
      this.logger.warn('⚠️ Users table error, skipping seeding.');
      return [];
    }
  }

  // ==================== NUMBERS (WhatsApp Instances) ====================
  private async seedNumbers(
    users: User[],
    servers: Server[],
  ): Promise<Number[]> {
    try {
      const existingNumbers = await this.numberRepository.find();
      if (existingNumbers.length > 0) {
        this.logger.log('📱 Numbers table is not empty, skipping seeding.');
        return existingNumbers;
      }

      if (users.length === 0) {
        this.logger.log('📱 No users to create numbers for, skipping.');
        return [];
      }

      const defaultServer = servers[0];
      const createdNumbers: Number[] = [];

      for (const user of users) {
        const cel = user.cel || `551199999${String(user.id).padStart(4, '0')}`;
        const cleanCel = cel.replace(/\D/g, '');

        const numberData = {
          user_id: user.id,
          server_id: defaultServer?.id || null,
          name: 'Número Principal',
          cel: cleanCel,
          instance: `WPP_${cleanCel}_${user.id}`,
          status: 1,
          status_connection: 0,
          extra: 0,
          chat_sync: 0,
          labels_active: 1,
        };

        const newNumber = this.numberRepository.create(numberData);
        const savedNumber = await this.numberRepository.save(newNumber);
        createdNumbers.push(savedNumber);
        this.logger.log(
          `✅ Created number for user ${user.email}: ${savedNumber.cel}`,
        );
      }
      return createdNumbers;
    } catch (error) {
      this.logger.warn('⚠️ Numbers table error, skipping seeding.');
      return [];
    }
  }

  // ==================== CONFIGURATIONS ====================
  private async seedConfigurations(users: User[]): Promise<Configuration[]> {
    try {
      const existingConfigs = await this.configurationRepository.find();
      if (existingConfigs.length > 0) {
        this.logger.log(
          '🔧 Configurations table is not empty, skipping seeding.',
        );
        return existingConfigs;
      }

      if (users.length === 0) {
        this.logger.log('🔧 No users to create configurations for, skipping.');
        return [];
      }

      const createdConfigs: Configuration[] = [];
      for (const user of users) {
        const configData = {
          user_id: user.id,
          timer_delay: 30,
        };

        const newConfig = this.configurationRepository.create(configData);
        const savedConfig = await this.configurationRepository.save(newConfig);
        createdConfigs.push(savedConfig);
        this.logger.log(`✅ Created configuration for user ${user.email}`);
      }
      return createdConfigs;
    } catch (error) {
      this.logger.warn('⚠️ Configurations table error, skipping seeding.');
      return [];
    }
  }

  // ==================== MESSAGE TEMPLATES ====================
  private async seedMessageTemplates(
    users: User[],
  ): Promise<MessageTemplate[]> {
    try {
      const existingTemplates = await this.messageTemplateRepository.find();
      if (existingTemplates.length > 0) {
        this.logger.log(
          '📝 Message templates table is not empty, skipping seeding.',
        );
        return existingTemplates;
      }

      const adminUser =
        users.find((u) => u.profile === UserProfile.ADMINISTRATOR) || users[0];
      if (!adminUser) {
        this.logger.log('📝 No admin user to create templates for, skipping.');
        return [];
      }

      const templatesToCreate = [
        {
          user_id: adminUser.id,
          name: 'Boas-vindas',
          message:
            'Olá {{nome}}! Seja bem-vindo(a) à nossa comunidade. Estamos felizes em ter você conosco!',
          category: 'boas-vindas',
          status: 1,
          active: 1,
          variables: JSON.stringify(['nome']),
        },
        {
          user_id: adminUser.id,
          name: 'Promoção',
          message:
            'Olá {{nome}}! Temos uma promoção especial para você: {{desconto}}% de desconto em todos os produtos. Aproveite!',
          category: 'marketing',
          status: 1,
          active: 1,
          variables: JSON.stringify(['nome', 'desconto']),
        },
        {
          user_id: adminUser.id,
          name: 'Lembrete',
          message:
            'Olá {{nome}}! Este é um lembrete sobre {{assunto}}. Não esqueça!',
          category: 'lembrete',
          status: 1,
          active: 1,
          variables: JSON.stringify(['nome', 'assunto']),
        },
        {
          user_id: adminUser.id,
          name: 'Agradecimento',
          message:
            'Olá {{nome}}! Muito obrigado pela sua compra. Seu pedido #{{pedido}} está sendo processado.',
          category: 'pos-venda',
          status: 1,
          active: 1,
          variables: JSON.stringify(['nome', 'pedido']),
        },
        {
          user_id: adminUser.id,
          name: 'Aniversário',
          message:
            'Feliz Aniversário, {{nome}}! Que seu dia seja repleto de alegrias!',
          category: 'especial',
          status: 1,
          active: 1,
          variables: JSON.stringify(['nome']),
        },
      ];

      const createdTemplates: MessageTemplate[] = [];
      for (const templateData of templatesToCreate) {
        const newTemplate = this.messageTemplateRepository.create(templateData);
        const savedTemplate =
          await this.messageTemplateRepository.save(newTemplate);
        createdTemplates.push(savedTemplate);
        this.logger.log(`✅ Created template: ${savedTemplate.name}`);
      }
      return createdTemplates;
    } catch (error) {
      this.logger.warn('⚠️ Message templates table error, skipping seeding.');
      return [];
    }
  }

  // ==================== LABELS ====================
  private async seedLabels(users: User[], numbers: Number[]): Promise<Label[]> {
    try {
      const existingLabels = await this.labelRepository.find();
      if (existingLabels.length > 0) {
        this.logger.log('🏷️ Labels table is not empty, skipping seeding.');
        return existingLabels;
      }

      if (users.length === 0 || numbers.length === 0) {
        this.logger.log('🏷️ No users/numbers to create labels for, skipping.');
        return [];
      }

      const labelNames = [
        'Cliente VIP',
        'Lead Quente',
        'Lead Frio',
        'Pendente',
        'Finalizado',
        'Interessado',
        'Não Perturbe',
        'Novo',
      ];

      const createdLabels: Label[] = [];
      for (const user of users) {
        const userNumber = numbers.find((n) => n.user_id === user.id);
        if (!userNumber) continue;

        for (const labelName of labelNames) {
          const labelData = {
            user_id: user.id,
            number_id: userNumber.id,
            name: labelName,
          };

          const newLabel = this.labelRepository.create(labelData);
          const savedLabel = await this.labelRepository.save(newLabel);
          createdLabels.push(savedLabel);
        }
        this.logger.log(
          `✅ Created ${labelNames.length} labels for user ${user.email}`,
        );
      }
      return createdLabels;
    } catch (error) {
      this.logger.warn('⚠️ Labels table error, skipping seeding.');
      return [];
    }
  }

  // ==================== PUBLICS (Contact Groups) ====================
  private async seedPublics(
    users: User[],
    numbers: Number[],
  ): Promise<Publics[]> {
    try {
      const existingPublics = await this.publicsRepository.find();
      if (existingPublics.length > 0) {
        this.logger.log('👥 Publics table is not empty, skipping seeding.');
        return existingPublics;
      }

      if (users.length === 0) {
        this.logger.log('👥 No users to create publics for, skipping.');
        return [];
      }

      const publicNames = [
        'Todos os Contatos',
        'Clientes Ativos',
        'Leads',
        'Newsletter',
        'VIP',
      ];

      const createdPublics: Publics[] = [];
      for (const user of users) {
        const userNumber = numbers.find((n) => n.user_id === user.id);

        for (const [index, publicName] of publicNames.entries()) {
          const publicData = {
            user_id: user.id,
            number_id: userNumber?.id || null,
            name: publicName,
            status: index === 0 ? 1 : 0,
            from_chat: 0,
            from_tag: 0,
          };

          const newPublic = this.publicsRepository.create(publicData);
          const savedPublic = await this.publicsRepository.save(newPublic);
          createdPublics.push(savedPublic);
        }
        this.logger.log(
          `✅ Created ${publicNames.length} publics for user ${user.email}`,
        );
      }
      return createdPublics;
    } catch (error) {
      this.logger.warn('⚠️ Publics table error, skipping seeding.');
      return [];
    }
  }

  // ==================== CONTACTS ====================
  private async seedContacts(
    users: User[],
    numbers: Number[],
    publics: Publics[],
  ): Promise<Contact[]> {
    try {
      const existingContacts = await this.contactRepository.find();
      if (existingContacts.length > 0) {
        this.logger.log('📇 Contacts table is not empty, skipping seeding.');
        return existingContacts;
      }

      if (users.length === 0) {
        this.logger.log('📇 No users to create contacts for, skipping.');
        return [];
      }

      const contactsData = [
        { name: 'João Silva', number: '5511911111111' },
        { name: 'Maria Santos', number: '5511922222222' },
        { name: 'Pedro Oliveira', number: '5511933333333' },
        { name: 'Ana Costa', number: '5511944444444' },
        { name: 'Carlos Pereira', number: '5511955555555' },
        { name: 'Juliana Lima', number: '5521911111111' },
        { name: 'Rafael Souza', number: '5521922222222' },
        { name: 'Fernanda Alves', number: '5521933333333' },
        { name: 'Lucas Mendes', number: '5531911111111' },
        { name: 'Camila Rodrigues', number: '5531922222222' },
      ];

      const createdContacts: Contact[] = [];
      for (const user of users) {
        const userNumber = numbers.find((n) => n.user_id === user.id);
        const userPublic = publics.find(
          (p) => p.user_id === user.id && p.name === 'Todos os Contatos',
        );
        const celOwner = userNumber?.cel || '';

        for (const [index, contactData] of contactsData.entries()) {
          const contact = {
            user_id: user.id,
            number_id: userNumber?.id || null,
            public_id: userPublic?.id || null,
            name: contactData.name,
            number: contactData.number,
            cel_owner: celOwner,
            status: 1,
            type: 1,
            labelsName:
              index < 3 ? 'Cliente VIP' : index < 6 ? 'Lead Quente' : 'Novo',
          };

          const newContact = this.contactRepository.create(contact);
          const savedContact = await this.contactRepository.save(newContact);
          createdContacts.push(savedContact);
        }
        this.logger.log(
          `✅ Created ${contactsData.length} contacts for user ${user.email}`,
        );
      }
      return createdContacts;
    } catch (error) {
      this.logger.warn('⚠️ Contacts table error, skipping seeding.');
      return [];
    }
  }

  // ==================== ENSURE ADMIN USER ====================
  private async ensureAdminUser() {
    const email = 'admin@verte.com';
    const existing = await this.userRepository.findOne({ where: { email } });
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash('123456', salt);

    let proPlan: Plan | null = null;
    try {
      proPlan = await this.planRepository.findOne({
        where: { name: 'Plano Profissional' },
      });
    } catch {
      proPlan = null;
    }

    if (existing) {
      existing.password = hashedPassword;
      existing.profile = UserProfile.ADMINISTRATOR;
      existing.status = UserStatus.ACTIVED;
      existing.plan_id = proPlan?.id ?? existing.plan_id ?? null;
      existing.confirmed_mail = 1;
      existing.active = 1;
      await this.userRepository.save(existing);
      this.logger.log('Admin garantido e atualizado: admin@verte.com');
      return;
    }

    const newAdmin = this.userRepository.create({
      name: 'Admin',
      last_name: 'Verte',
      email,
      cel: '5511999999999',
      password: hashedPassword,
      profile: UserProfile.ADMINISTRATOR,
      status: UserStatus.ACTIVED,
      plan_id: proPlan?.id ?? null,
      confirmed_mail: 1,
      active: 1,
    });
    await this.userRepository.save(newAdmin);
    this.logger.log('Admin criado: admin@verte.com');
  }
}
