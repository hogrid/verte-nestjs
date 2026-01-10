# ===========================================
# STAGE 1: Build
# ===========================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ===========================================
# STAGE 2: Production
# ===========================================
FROM node:20-alpine

# Runtime dependencies para bcrypt
RUN apk add --no-cache libgcc

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Criar diretório de uploads e setar permissões
RUN mkdir -p uploads && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3006

CMD ["node", "dist/main"]
