# ===========================================
# STAGE 1: Build
# ===========================================
FROM node:20-alpine AS builder

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

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Install apenas production dependencies
RUN npm ci --only=production

# Copiar build da stage anterior
COPY --from=builder /app/dist ./dist

# Criar diretório para uploads
RUN mkdir -p uploads

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Executar aplicação
CMD ["node", "dist/main"]
