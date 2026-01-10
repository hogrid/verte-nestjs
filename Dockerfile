# ===========================================
# STAGE 1: Build
# ===========================================
FROM node:20-alpine AS builder

# Instalar dependências de build nativas
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# ===========================================
# STAGE 2: Production
# ===========================================
FROM node:20-alpine AS production

# Instalar dependências de runtime nativas (para bcrypt, etc)
RUN apk add --no-cache libgcc

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Install apenas production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copiar build da stage anterior
COPY --from=builder /app/dist ./dist

# Criar diretórios necessários com permissões corretas
RUN mkdir -p uploads && \
    chown -R nestjs:nodejs /app

# Trocar para usuário não-root
USER nestjs

# Expor porta
EXPOSE 3006

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3006/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Executar aplicação
CMD ["node", "dist/main"]
