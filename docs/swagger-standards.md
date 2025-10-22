# Padrões de Documentação Swagger/OpenAPI

## Visão Geral

Este documento define os padrões obrigatórios para documentação de API usando Swagger/OpenAPI no projeto Verte NestJS.

## Acesso à Documentação

- **URL Desenvolvimento**: http://localhost:3000/api/docs
- **URL Produção**: https://api.verte.com.br/api/docs

## Padrões Obrigatórios

### 1. Controller - Decoradores Essenciais

```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('NomeDoModulo')  // OBRIGATÓRIO: Tag para agrupar endpoints
@Controller('api/v1')
export class ExemploController {
  // ...
}
```

### 2. Endpoints - Documentação Completa

Cada endpoint DEVE ter:

#### a) ApiOperation (Obrigatório)
```typescript
@ApiOperation({
  summary: 'Título curto e descritivo',
  description: 'Descrição detalhada do que o endpoint faz',
})
```

#### b) ApiBody (Se POST/PUT/PATCH)
```typescript
@ApiBody({ type: SeuDto })
```

#### c) ApiResponse (Mínimo 2 responses)
```typescript
@ApiResponse({
  status: 200,
  description: 'Descrição do sucesso',
  schema: {
    example: {
      // Exemplo REAL da response
    },
  },
})
@ApiResponse({
  status: 400,  // ou 401, 404, etc.
  description: 'Descrição do erro',
  schema: {
    example: {
      message: 'Mensagem de erro em português',
      error: 'Bad Request',
      statusCode: 400,
    },
  },
})
```

#### d) ApiBearerAuth (Se protegido por JWT)
```typescript
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
```

### 3. DTOs - ApiProperty em Todos os Campos

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExemploDto {
  @ApiProperty({
    description: 'Descrição clara do campo',
    example: 'valor-exemplo-realista',
    type: String,                  // ou Number, Boolean
    minLength: 3,                  // Validações relevantes
    maxLength: 50,
  })
  @IsNotEmpty()
  campoObrigatorio: string;

  @ApiPropertyOptional({
    description: 'Campo opcional',
    example: 'valor-opcional',
    type: String,
    default: 'valor-padrao',
  })
  @IsOptional()
  campoOpcional?: string;

  // Para enums
  @ApiProperty({
    description: 'Status do usuário',
    enum: ['actived', 'inactived'],
    example: 'actived',
  })
  status: string;
}
```

### 4. Exemplos - SEMPRE Realistas

❌ **NÃO FAÇA**:
```typescript
example: 'string',
example: 123,
example: {},
```

✅ **FAÇA**:
```typescript
example: 'joao.silva@exemplo.com',
example: 52998224725,  // CPF válido
example: { id: 1, name: 'João' },
```

### 5. Mensagens em Português

Todas as descrições, summaries e mensagens de erro devem estar em português brasileiro:

```typescript
@ApiOperation({
  summary: 'Login de usuário',  // ✅ Português
  description: 'Autentica um usuário com email e senha',  // ✅ Português
})
```

## Checklist por Endpoint

Antes de considerar um endpoint documentado, verifique:

- [ ] `@ApiTags` no controller
- [ ] `@ApiOperation` com summary e description
- [ ] `@ApiBody` se necessário (POST/PUT/PATCH)
- [ ] `@ApiResponse` para status 200/201
- [ ] `@ApiResponse` para status de erro (400/401/404)
- [ ] `@ApiBearerAuth` se protegido
- [ ] Todos os campos do DTO têm `@ApiProperty` ou `@ApiPropertyOptional`
- [ ] Exemplos são realistas e válidos
- [ ] Descrições em português
- [ ] Testado na interface Swagger

## Exemplo Completo

```typescript
// DTO
export class CriarCampanhaDto {
  @ApiProperty({
    description: 'Nome da campanha',
    example: 'Promoção Black Friday 2024',
    type: String,
    minLength: 3,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  name: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada da campanha',
    example: 'Campanha promocional para a Black Friday com 50% de desconto',
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

// Controller
@ApiTags('Campaigns')
@Controller('api/v1/campaigns')
export class CampaignsController {
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Criar nova campanha',
    description: 'Cria uma nova campanha de marketing para o usuário autenticado.',
  })
  @ApiBody({ type: CriarCampanhaDto })
  @ApiResponse({
    status: 201,
    description: 'Campanha criada com sucesso',
    schema: {
      example: {
        message: 'Campanha criada com sucesso',
        data: {
          id: 1,
          name: 'Promoção Black Friday 2024',
          status: 'draft',
          created_at: '2024-10-22T10:00:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado',
    schema: {
      example: {
        message: 'Token inválido ou expirado',
        error: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  async create(@Body() dto: CriarCampanhaDto, @Request() req) {
    return this.campaignsService.create(dto, req.user);
  }
}
```

## Configuração do Swagger (main.ts)

A configuração do Swagger já está em `src/main.ts`. Ao adicionar novos módulos, atualize as tags:

```typescript
const config = new DocumentBuilder()
  .setTitle('Verte API - NestJS')
  .setDescription('...')
  .addTag('NovoModulo', 'Descrição do módulo')
  // ...
  .build();
```

## Validação

Para validar se sua documentação está correta:

1. Inicie o servidor: `npm run start:dev`
2. Acesse: http://localhost:3000/api/docs
3. Teste cada endpoint diretamente no Swagger
4. Verifique se os exemplos funcionam
5. Confirme que as validações estão corretas

## Laravel Compatibility

Como estamos migrando do Laravel, mantenha:

- ✅ Mesmos status codes do Laravel
- ✅ Mesma estrutura de responses
- ✅ Mensagens de erro em português
- ✅ Mesmas validações

## Referências

- [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [Swagger Specification](https://swagger.io/specification/)
- [OpenAPI Examples](https://swagger.io/docs/specification/adding-examples/)

---

**Última atualização**: 22/10/2024
**Autor**: Equipe Verte - Migration Team
