# ============================================================
# STAGE 1: builder — instala dependências e prepara o app
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copia apenas os manifests primeiro (otimiza cache de camadas)
COPY package*.json ./

# Instala somente dependências de produção
RUN npm install --omit=dev

# ============================================================
# STAGE 2: runtime — imagem final leve e segura
# ============================================================
FROM node:20-alpine AS runtime

WORKDIR /app

# Cria usuário não-root para segurança
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copia dependências do builder
COPY --from=builder /app/node_modules ./node_modules

# Copia código-fonte
COPY src/ ./src/
COPY package*.json ./

# Ajusta permissões
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

CMD ["node", "src/server.js"]
