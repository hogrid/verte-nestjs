# Verte NestJS Backend

Backend da aplicação Verte, migrado de Laravel 8 para NestJS. Este projeto fornece a API para o frontend [verte-front](https://github.com/example/verte-front).

## Funcionalidades Principais

*   Autenticação de Usuários (JWT)
*   Gerenciamento de Planos e Pagamentos (Stripe)
*   Integração com WhatsApp via Evolution API (Multi-sessão)
*   Agendamento e Envio de Campanhas (BullMQ)
*   CRUD de Contatos, Templates, etc.

## Setup do Ambiente de Desenvolvimento

### Pré-requisitos

*   **Node.js**: v22.x ou superior
*   **Docker** e **Docker Compose**: Para rodar os serviços de dependência (banco de dados, Redis, etc.)
*   **npm** (geralmente incluído com Node.js)

### 1. Clonar o Repositório

```bash
git clone https://github.com/example/verte-nestjs.git
cd verte-nestjs
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo `.env.example` para um novo arquivo chamado `.env`.

```bash
cp .env.example .env
```

**⚠️ Importante:** O arquivo `.env` já vem com valores padrão para um ambiente de desenvolvimento local. Revise e altere se necessário, especialmente a chave `EVOLUTION_API_KEY`.

### 3. Iniciar os Serviços de Dependência

Este comando irá iniciar os containers Docker para o banco de dados **MySQL**, **PostgreSQL** (usado pela Evolution API) e **Redis**.

```bash
docker-compose up -d
```

### 4. Instalar as Dependências do Projeto

```bash
npm install
```

### 5. Popular o Banco de Dados (Seeding)

Para ter dados de teste (planos, usuários, etc.), execute o seeder via CLI:

```bash
# Seed incremental (pula tabelas que já tem dados)
npm run seed

# Seed fresh (limpa TUDO e recria do zero)
npm run seed:fresh
```

O seeder é idempotente: se as tabelas já tiverem dados, ele não recria. Use `seed:fresh` para limpar e recriar todos os dados.

Isso irá popular o banco de dados com:
*   3 planos de exemplo (Gratuito, Básico, Profissional)
*   2 servidores Evolution API
*   4 contas de usuário para teste
*   Labels, Publics e Contacts para cada usuário

### Credenciais de Acesso (Desenvolvimento)

| Email               | Senha    | Perfil          | Plano         |
| ------------------- | -------- | --------------- | ------------- |
| `admin@verte.com`   | `123456` | Administrador   | Profissional  |
| `pro@verte.com`     | `123456` | Usuário Padrão  | Profissional  |
| `basico@verte.com`  | `123456` | Usuário Padrão  | Básico        |
| `free@verte.com`    | `123456` | Usuário Padrão  | Gratuito      |

### 6. Iniciar a Aplicação NestJS

Agora você pode iniciar a aplicação em modo de desenvolvimento.

```bash
npm run start:dev
```

A API estará disponível em `http://localhost:3000`. Você pode ver a documentação da API em `http://localhost:3000/api/docs`.

---

Parabéns! O ambiente de desenvolvimento está configurado e pronto para uso.
