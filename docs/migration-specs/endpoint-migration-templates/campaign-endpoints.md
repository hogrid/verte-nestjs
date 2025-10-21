# TEMPLATE DE MIGRAÇÃO - ENDPOINTS DE CAMPANHAS

## ENDPOINTS DO MÓDULO CAMPAIGNS

### 1. GET /api/campaigns

#### Laravel Original
```php
// Route
Route::get('/api/campaigns', [CampaignController::class, 'index'])
     ->middleware(['auth:sanctum']);

// Controller
public function index(Request $request)
{
    $campaigns = Campaign::where('user_id', auth()->id())
                        ->with(['number', 'public'])
                        ->when($request->status, function($query, $status) {
                            return $query->where('status', $status);
                        })
                        ->when($request->type, function($query, $type) {
                            return $query->where('type', $type);
                        })
                        ->orderBy('created_at', 'desc')
                        ->paginate(15);

    return response()->json([
        'data' => CampaignResource::collection($campaigns->items()),
        'pagination' => [
            'current_page' => $campaigns->currentPage(),
            'last_page' => $campaigns->lastPage(),
            'per_page' => $campaigns->perPage(),
            'total' => $campaigns->total()
        ]
    ], 200);
}
```

#### NestJS Target
```typescript
// campaign.controller.ts
@Controller('api/campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService
  ) {}

  @Get()
  @HttpCode(200)
  async index(
    @Request() req,
    @Query() query: GetCampaignsDto
  ): Promise<CampaignListResponse> {
    const result = await this.campaignService.findAll(req.user.id, query);
    
    return {
      data: result.data.map(campaign => this.transformCampaign(campaign)),
      pagination: {
        current_page: result.meta.page,
        last_page: result.meta.pageCount,
        per_page: result.meta.take,
        total: result.meta.itemCount
      }
    };
  }

  private transformCampaign(campaign: Campaign): any {
    return {
      id: campaign.id,
      name: campaign.name,
      type: campaign.type,
      status: campaign.status,
      progress: campaign.progress,
      schedule_date: campaign.schedule_date,
      number: campaign.number ? {
        id: campaign.number.id,
        instance: campaign.number.instance,
        status_connection: campaign.number.status_connection
      } : null,
      public: campaign.public ? {
        id: campaign.public.id,
        name: campaign.public.name
      } : null,
      created_at: campaign.created_at,
      updated_at: campaign.updated_at
    };
  }
}

// DTOs
export class GetCampaignsDto {
  @IsOptional()
  @IsNumberString({}, { message: 'O campo status deve ser um número.' })
  status?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'O campo type deve ser um número.' })
  type?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'O campo page deve ser um número.' })
  page?: string = '1';
}
```

### 2. POST /api/campaigns

#### Laravel Original
```php
// Route
Route::post('/api/campaigns', [CampaignController::class, 'store'])
     ->middleware(['auth:sanctum']);

// Controller
public function store(CreateCampaignRequest $request)
{
    $campaignData = $request->validated();
    $campaignData['user_id'] = auth()->id();
    
    $campaign = Campaign::create($campaignData);
    
    // Create messages for campaign
    foreach ($request->messages as $messageData) {
        $campaign->messages()->create($messageData);
    }
    
    event(new CampaignCreated($campaign));
    
    return response()->json([
        'data' => new CampaignResource($campaign->load(['messages', 'number', 'public'])),
        'message' => 'Campanha criada com sucesso'
    ], 201);
}

// FormRequest
class CreateCampaignRequest extends FormRequest
{
    public function rules()
    {
        return [
            'name' => 'required|string|max:255',
            'type' => 'required|integer|in:1,2,3,4',
            'public_id' => 'required|exists:publics,id',
            'number_id' => 'required|exists:numbers,id',
            'schedule_date' => 'nullable|date|after:now',
            'messages' => 'required|array|min:1',
            'messages.*.content' => 'required|string',
            'messages.*.delay' => 'required|integer|min:0',
            'messages.*.type_message' => 'required|integer|in:1,2,3,4',
            'messages.*.media_path' => 'nullable|string'
        ];
    }
    
    public function messages()
    {
        return [
            'name.required' => 'O campo nome é obrigatório.',
            'type.required' => 'O campo tipo é obrigatório.',
            'type.in' => 'O campo tipo deve ser 1, 2, 3 ou 4.',
            'public_id.required' => 'O campo público é obrigatório.',
            'public_id.exists' => 'O público selecionado não existe.',
            'number_id.required' => 'O campo número é obrigatório.',
            'number_id.exists' => 'O número selecionado não existe.',
            'schedule_date.after' => 'A data de agendamento deve ser futura.',
            'messages.required' => 'Pelo menos uma mensagem é obrigatória.',
            'messages.min' => 'Pelo menos uma mensagem é obrigatória.',
            'messages.*.content.required' => 'O conteúdo da mensagem é obrigatório.',
            'messages.*.delay.required' => 'O delay da mensagem é obrigatório.',
            'messages.*.type_message.required' => 'O tipo da mensagem é obrigatório.'
        ];
    }
}
```

#### NestJS Target
```typescript
// campaign.controller.ts
@Post()
@HttpCode(201)
async store(
  @Request() req,
  @Body() createCampaignDto: CreateCampaignDto
): Promise<CampaignResponse> {
  const campaign = await this.campaignService.create(req.user.id, createCampaignDto);
  
  // Emit event
  this.eventEmitter.emit('campaign.created', campaign);
  
  return {
    data: this.transformCampaign(campaign),
    message: 'Campanha criada com sucesso'
  };
}

// DTOs
export class CreateCampaignDto {
  @IsNotEmpty({ message: 'O campo nome é obrigatório.' })
  @IsString({ message: 'O campo nome deve ser uma string.' })
  @MaxLength(255, { message: 'O campo nome não pode ter mais de 255 caracteres.' })
  name: string;

  @IsNotEmpty({ message: 'O campo tipo é obrigatório.' })
  @IsInt({ message: 'O campo tipo deve ser um número inteiro.' })
  @IsIn([1, 2, 3, 4], { message: 'O campo tipo deve ser 1, 2, 3 ou 4.' })
  type: number;

  @IsNotEmpty({ message: 'O campo público é obrigatório.' })
  @IsInt({ message: 'O campo público deve ser um número inteiro.' })
  @IsExists(['Publics', 'id'], { message: 'O público selecionado não existe.' })
  public_id: number;

  @IsNotEmpty({ message: 'O campo número é obrigatório.' })
  @IsInt({ message: 'O campo número deve ser um número inteiro.' })
  @IsExists(['Number', 'id'], { message: 'O número selecionado não existe.' })
  number_id: number;

  @IsOptional()
  @IsDateString({}, { message: 'A data de agendamento deve ser válida.' })
  @IsAfterNow({ message: 'A data de agendamento deve ser futura.' })
  schedule_date?: string;

  @IsNotEmpty({ message: 'Pelo menos uma mensagem é obrigatória.' })
  @IsArray({ message: 'Mensagens devem ser um array.' })
  @ArrayMinSize(1, { message: 'Pelo menos uma mensagem é obrigatória.' })
  @ValidateNested({ each: true })
  @Type(() => CreateMessageDto)
  messages: CreateMessageDto[];
}

export class CreateMessageDto {
  @IsNotEmpty({ message: 'O conteúdo da mensagem é obrigatório.' })
  @IsString({ message: 'O conteúdo da mensagem deve ser uma string.' })
  content: string;

  @IsNotEmpty({ message: 'O delay da mensagem é obrigatório.' })
  @IsInt({ message: 'O delay deve ser um número inteiro.' })
  @Min(0, { message: 'O delay deve ser maior ou igual a 0.' })
  delay: number;

  @IsNotEmpty({ message: 'O tipo da mensagem é obrigatório.' })
  @IsInt({ message: 'O tipo da mensagem deve ser um número inteiro.' })
  @IsIn([1, 2, 3, 4], { message: 'O tipo da mensagem deve ser 1, 2, 3 ou 4.' })
  type_message: number;

  @IsOptional()
  @IsString({ message: 'O caminho da mídia deve ser uma string.' })
  media_path?: string;
}

// campaign.service.ts
@Injectable()
export class CampaignService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>
  ) {}

  async create(userId: number, createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    return this.campaignRepository.manager.transaction(async manager => {
      // Create campaign
      const campaign = manager.create(Campaign, {
        ...createCampaignDto,
        user_id: userId,
        status: 1, // pending
        progress: 0
      });
      
      const savedCampaign = await manager.save(campaign);
      
      // Create messages
      const messages = createCampaignDto.messages.map(messageDto => 
        manager.create(Message, {
          ...messageDto,
          campaign_id: savedCampaign.id
        })
      );
      
      await manager.save(messages);
      
      // Load relations
      return manager.findOne(Campaign, {
        where: { id: savedCampaign.id },
        relations: ['messages', 'number', 'public']
      });
    });
  }

  async findAll(userId: number, query: GetCampaignsDto): Promise<any> {
    const page = parseInt(query.page) || 1;
    const limit = 15;
    
    const queryBuilder = this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.number', 'number')
      .leftJoinAndSelect('campaign.public', 'public')
      .where('campaign.user_id = :userId', { userId })
      .orderBy('campaign.created_at', 'DESC');
    
    if (query.status) {
      queryBuilder.andWhere('campaign.status = :status', { status: parseInt(query.status) });
    }
    
    if (query.type) {
      queryBuilder.andWhere('campaign.type = :type', { type: parseInt(query.type) });
    }
    
    return queryBuilder.paginate({
      page,
      limit
    });
  }
}
```

### 3. GET /api/campaigns/:id

#### Laravel Original
```php
// Route
Route::get('/api/campaigns/{id}', [CampaignController::class, 'show'])
     ->middleware(['auth:sanctum']);

// Controller
public function show($id)
{
    $campaign = Campaign::where('user_id', auth()->id())
                       ->with(['messages', 'number', 'public'])
                       ->findOrFail($id);

    return response()->json([
        'data' => new CampaignResource($campaign)
    ], 200);
}
```

#### NestJS Target
```typescript
// campaign.controller.ts
@Get(':id')
@HttpCode(200)
async show(
  @Request() req,
  @Param('id', ParseIntPipe) id: number
): Promise<{ data: any }> {
  const campaign = await this.campaignService.findOne(req.user.id, id);
  
  if (!campaign) {
    throw new NotFoundException('Campanha não encontrada');
  }
  
  return {
    data: this.transformCampaign(campaign)
  };
}

// campaign.service.ts
async findOne(userId: number, id: number): Promise<Campaign | null> {
  return this.campaignRepository.findOne({
    where: { 
      id, 
      user_id: userId 
    },
    relations: ['messages', 'number', 'public']
  });
}
```

### 4. PUT /api/campaigns/:id

#### Laravel Original
```php
// Route
Route::put('/api/campaigns/{id}', [CampaignController::class, 'update'])
     ->middleware(['auth:sanctum']);

// Controller
public function update(UpdateCampaignRequest $request, $id)
{
    $campaign = Campaign::where('user_id', auth()->id())->findOrFail($id);
    
    if ($campaign->status !== 1) {
        return response()->json([
            'message' => 'Campanha não pode ser editada',
            'errors' => ['status' => ['Campanha não está em status editável']]
        ], 422);
    }
    
    $campaign->update($request->validated());
    
    // Update messages if provided
    if ($request->has('messages')) {
        $campaign->messages()->delete();
        
        foreach ($request->messages as $messageData) {
            $campaign->messages()->create($messageData);
        }
    }
    
    return response()->json([
        'data' => new CampaignResource($campaign->load(['messages', 'number', 'public'])),
        'message' => 'Campanha atualizada com sucesso'
    ], 200);
}
```

#### NestJS Target
```typescript
// campaign.controller.ts
@Put(':id')
@HttpCode(200)
async update(
  @Request() req,
  @Param('id', ParseIntPipe) id: number,
  @Body() updateCampaignDto: UpdateCampaignDto
): Promise<CampaignResponse> {
  const campaign = await this.campaignService.update(req.user.id, id, updateCampaignDto);
  
  return {
    data: this.transformCampaign(campaign),
    message: 'Campanha atualizada com sucesso'
  };
}

// campaign.service.ts
async update(userId: number, id: number, updateCampaignDto: UpdateCampaignDto): Promise<Campaign> {
  const campaign = await this.campaignRepository.findOne({
    where: { id, user_id: userId }
  });
  
  if (!campaign) {
    throw new NotFoundException('Campanha não encontrada');
  }
  
  if (campaign.status !== 1) {
    throw new BadRequestException({
      message: 'Campanha não pode ser editada',
      errors: {
        status: ['Campanha não está em status editável']
      }
    });
  }
  
  return this.campaignRepository.manager.transaction(async manager => {
    // Update campaign
    await manager.update(Campaign, id, updateCampaignDto);
    
    // Update messages if provided
    if (updateCampaignDto.messages) {
      await manager.delete(Message, { campaign_id: id });
      
      const messages = updateCampaignDto.messages.map(messageDto => 
        manager.create(Message, {
          ...messageDto,
          campaign_id: id
        })
      );
      
      await manager.save(messages);
    }
    
    // Return updated campaign
    return manager.findOne(Campaign, {
      where: { id },
      relations: ['messages', 'number', 'public']
    });
  });
}
```

### 5. DELETE /api/campaigns/:id

#### Laravel Original
```php
// Route
Route::delete('/api/campaigns/{id}', [CampaignController::class, 'destroy'])
     ->middleware(['auth:sanctum']);

// Controller
public function destroy($id)
{
    $campaign = Campaign::where('user_id', auth()->id())->findOrFail($id);
    
    if (in_array($campaign->status, [2, 3])) { // running or processing
        return response()->json([
            'message' => 'Campanha não pode ser excluída',
            'errors' => ['status' => ['Campanha está em execução']]
        ], 422);
    }
    
    $campaign->delete();
    
    return response()->json([
        'message' => 'Campanha excluída com sucesso'
    ], 200);
}
```

#### NestJS Target
```typescript
// campaign.controller.ts
@Delete(':id')
@HttpCode(200)
async destroy(
  @Request() req,
  @Param('id', ParseIntPipe) id: number
): Promise<{ message: string }> {
  await this.campaignService.delete(req.user.id, id);
  
  return {
    message: 'Campanha excluída com sucesso'
  };
}

// campaign.service.ts
async delete(userId: number, id: number): Promise<void> {
  const campaign = await this.campaignRepository.findOne({
    where: { id, user_id: userId }
  });
  
  if (!campaign) {
    throw new NotFoundException('Campanha não encontrada');
  }
  
  if ([2, 3].includes(campaign.status)) {
    throw new BadRequestException({
      message: 'Campanha não pode ser excluída',
      errors: {
        status: ['Campanha está em execução']
      }
    });
  }
  
  await this.campaignRepository.softDelete(id);
}
```

### 6. POST /api/campaigns/:id/start

#### Laravel Original
```php
// Route
Route::post('/api/campaigns/{id}/start', [CampaignController::class, 'start'])
     ->middleware(['auth:sanctum']);

// Controller
public function start($id)
{
    $campaign = Campaign::where('user_id', auth()->id())->findOrFail($id);
    
    if ($campaign->status !== 1) {
        return response()->json([
            'message' => 'Campanha não pode ser iniciada',
            'errors' => ['status' => ['Status inválido para iniciar campanha']]
        ], 422);
    }
    
    // Check if number is connected
    if (!$campaign->number->status_connection) {
        return response()->json([
            'message' => 'Número não está conectado',
            'errors' => ['number' => ['WhatsApp não está conectado']]
        ], 422);
    }
    
    $campaign->update(['status' => 2]); // running
    
    // Dispatch job to process campaign
    dispatch(new ProcessCampaignJob($campaign));
    
    return response()->json([
        'data' => new CampaignResource($campaign),
        'message' => 'Campanha iniciada com sucesso'
    ], 200);
}
```

#### NestJS Target
```typescript
// campaign.controller.ts
@Post(':id/start')
@HttpCode(200)
async start(
  @Request() req,
  @Param('id', ParseIntPipe) id: number
): Promise<CampaignResponse> {
  const campaign = await this.campaignService.start(req.user.id, id);
  
  return {
    data: this.transformCampaign(campaign),
    message: 'Campanha iniciada com sucesso'
  };
}

// campaign.service.ts
async start(userId: number, id: number): Promise<Campaign> {
  const campaign = await this.campaignRepository.findOne({
    where: { id, user_id: userId },
    relations: ['number']
  });
  
  if (!campaign) {
    throw new NotFoundException('Campanha não encontrada');
  }
  
  if (campaign.status !== 1) {
    throw new BadRequestException({
      message: 'Campanha não pode ser iniciada',
      errors: {
        status: ['Status inválido para iniciar campanha']
      }
    });
  }
  
  if (!campaign.number.status_connection) {
    throw new BadRequestException({
      message: 'Número não está conectado',
      errors: {
        number: ['WhatsApp não está conectado']
      }
    });
  }
  
  // Update status
  await this.campaignRepository.update(id, { status: 2 });
  
  // Dispatch job
  await this.campaignQueue.add('process-campaign', { campaignId: id });
  
  return this.campaignRepository.findOne({
    where: { id },
    relations: ['messages', 'number', 'public']
  });
}
```

## VALIDADORES CUSTOMIZADOS NECESSÁRIOS

### IsExists Validator
```typescript
// validators/is-exists.validator.ts
import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@ValidatorConstraint({ name: 'isExists', async: true })
@Injectable()
export class IsExistsConstraint implements ValidatorConstraintInterface {
  constructor(private dataSource: DataSource) {}

  async validate(value: any, args: ValidationArguments) {
    const [entityClass, field] = args.constraints;
    const repository = this.dataSource.getRepository(entityClass);
    
    const entity = await repository.findOne({
      where: { [field]: value }
    });
    
    return !!entity;
  }

  defaultMessage(args: ValidationArguments) {
    const [entityClass, field] = args.constraints;
    return `O ${args.property} selecionado não existe.`;
  }
}

export function IsExists(constraints: [string, string], validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: constraints,
      validator: IsExistsConstraint,
    });
  };
}
```

### IsAfterNow Validator
```typescript
// validators/is-after-now.validator.ts
import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'isAfterNow', async: false })
export class IsAfterNowConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const date = new Date(value);
    const now = new Date();
    return date > now;
  }

  defaultMessage(args: ValidationArguments) {
    return 'A data de agendamento deve ser futura.';
  }
}

export function IsAfterNow(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsAfterNowConstraint,
    });
  };
}
```

## ENTIDADES RELACIONADAS

### Campaign Entity
```typescript
// entities/campaign.entity.ts
@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  number_id: number;

  @Column()
  public_id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'int' })
  type: number;

  @Column({ type: 'int', default: 1 })
  status: number;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'datetime', nullable: true })
  schedule_date?: Date;

  @Column({ type: 'json', nullable: true })
  settings?: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at?: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Number)
  @JoinColumn({ name: 'number_id' })
  number: Number;

  @ManyToOne(() => Publics)
  @JoinColumn({ name: 'public_id' })
  public: Publics;

  @OneToMany(() => Message, message => message.campaign)
  messages: Message[];
}
```

### Message Entity
```typescript
// entities/message.entity.ts
@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  campaign_id: number;

  @Column({ type: 'int' })
  delay: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  media_path?: string;

  @Column({ type: 'int' })
  type_message: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at?: Date;

  // Relations
  @ManyToOne(() => Campaign, campaign => campaign.messages)
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;
}
```

## JOBS/QUEUES

### Campaign Processor
```typescript
// processors/campaign.processor.ts
@Processor('campaign')
export class CampaignProcessor {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly whatsappService: WhatsappService
  ) {}

  @Process('process-campaign')
  async processCampaign(job: Job<{ campaignId: number }>) {
    const { campaignId } = job.data;
    
    try {
      const campaign = await this.campaignService.findOne(campaignId);
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      // Update status to processing
      await this.campaignService.updateStatus(campaignId, 3);
      
      // Process campaign messages
      await this.processCampaignMessages(campaign);
      
      // Update status to completed
      await this.campaignService.updateStatus(campaignId, 4);
      
    } catch (error) {
      // Update status to failed
      await this.campaignService.updateStatus(campaignId, 5);
      throw error;
    }
  }

  private async processCampaignMessages(campaign: Campaign) {
    // Implementation for processing campaign messages
    // This would interact with WhatsApp API through WAHA service
  }
}
```

## TESTES DE COMPATIBILIDADE

### Campaign E2E Tests
```typescript
// campaign.e2e-spec.ts
describe('Campaign Module Compatibility (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeEach(async () => {
    // Setup app and get auth token
  });

  describe('GET /api/campaigns', () => {
    it('should return paginated campaigns list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('current_page');
      expect(response.body.pagination).toHaveProperty('last_page');
      expect(response.body.pagination).toHaveProperty('per_page');
      expect(response.body.pagination).toHaveProperty('total');
    });
  });

  describe('POST /api/campaigns', () => {
    it('should create campaign with identical Laravel response', async () => {
      const campaignData = {
        name: 'Test Campaign',
        type: 1,
        public_id: 1,
        number_id: 1,
        messages: [{
          content: 'Test message',
          delay: 10,
          type_message: 1
        }]
      };

      const response = await request(app.getHttpServer())
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(campaignData)
        .expect(201);

      expect(response.body.message).toBe('Campanha criada com sucesso');
      expect(response.body.data.name).toBe('Test Campaign');
      expect(response.body.data.type).toBe(1);
    });

    it('should return validation errors for invalid data', async () => {
      const invalidData = {
        name: '',
        type: 99,
        public_id: 999999,
        messages: []
      };

      const response = await request(app.getHttpServer())
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(422);

      expect(response.body.message).toBe('Os dados fornecidos são inválidos.');
      expect(response.body.errors.name).toContain('O campo nome é obrigatório.');
      expect(response.body.errors.messages).toContain('Pelo menos uma mensagem é obrigatória.');
    });
  });
});
```

## CHECKLIST DE VALIDAÇÃO

- [ ] ✅ GET /api/campaigns implementado
- [ ] ✅ POST /api/campaigns implementado
- [ ] ✅ GET /api/campaigns/:id implementado
- [ ] ✅ PUT /api/campaigns/:id implementado
- [ ] ✅ DELETE /api/campaigns/:id implementado
- [ ] ✅ POST /api/campaigns/:id/start implementado
- [ ] ✅ Validações idênticas ao Laravel
- [ ] ✅ Mensagens de erro em português
- [ ] ✅ Response structure idêntica
- [ ] ✅ Status codes corretos
- [ ] ✅ Paginação funcionando
- [ ] ✅ Filtros por status e type
- [ ] ✅ Relacionamentos carregados
- [ ] ✅ Soft deletes funcionando
- [ ] ✅ Transações para criação/atualização
- [ ] ✅ Validators customizados (IsExists, IsAfterNow)
- [ ] ✅ Jobs/Queue para processamento
- [ ] ✅ Guards de autenticação aplicados
- [ ] ✅ Verificação de ownership (user_id)
- [ ] ✅ Testes E2E passando