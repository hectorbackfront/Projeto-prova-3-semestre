# 💇 Sistema de Agendamento de Serviços

API REST para gerenciamento de agendamentos em salões de beleza e barbearias.

---

## 📋 Descrição do Sistema

O sistema permite o cadastro de clientes, serviços e funcionários, além do gerenciamento completo de agendamentos. Um agendamento pode conter múltiplos serviços (relação N:N), realizado por um funcionário cadastrado.

**Caminho de Infraestrutura:** Opção A — Docker / Orquestração Local

---

## 🗃️ Entidades, Tabelas e Relacionamentos

```
usuarios (id, nome, email, senha, role, createdAt, updatedAt)
clientes (id, nome, telefone, cpf*, email, createdAt, updatedAt)
servicos (id, nome, descricao, preco, duracao_min, ativo, createdAt, updatedAt)
agendamentos (id, cliente_id, usuario_id, data_hora, status, observacao, valor_total, createdAt, updatedAt)
agendamento_servicos (id, agendamento_id, servico_id, preco_aplicado)  ← TABELA PIVÔ
```

**Relações:**
- `agendamentos` → `clientes` (N:1)
- `agendamentos` → `usuarios` (N:1)
- `agendamentos` ↔ `servicos` via `agendamento_servicos` **(N:N)**

**Tabela pivô:** `agendamento_servicos` — resolve a relação N:N entre agendamentos e serviços, armazenando também o `preco_aplicado` no momento do agendamento.

---

## 🐳 Containers Utilizados

| Container | Imagem | Função |
|---|---|---|
| `agendamento_postgres` | postgres:16-alpine | Banco de dados PostgreSQL |
| `agendamento_redis` | redis:7-alpine | Cache |
| `agendamento_app` | node:20-alpine (multi-stage) | API Node.js (sem porta exposta ao host) |
| `agendamento_nginx` | nginx:alpine | Proxy reverso (porta 80) |

**Arquitetura de rede:**
```
Host → Nginx (porta 80) → app:3000 → postgres:5432
                                    → redis:6379
```

O container `app` não tem porta exposta ao host. O acesso externo ocorre exclusivamente via Nginx.

---

## 📦 Bibliotecas Utilizadas

| Biblioteca | Finalidade |
|---|---|
| express | Servidor HTTP / roteamento |
| sequelize | ORM para PostgreSQL |
| pg / pg-hstore | Driver PostgreSQL |
| bcryptjs | Hash de senhas |
| jsonwebtoken | Autenticação JWT |
| swagger-ui-express | Interface da documentação |
| swagger-jsdoc | Geração automática do Swagger |
| dotenv | Variáveis de ambiente |

---

## ⚙️ Pré-requisitos

- Docker Desktop instalado e rodando
- Git

---

## 🚀 Como Executar o Projeto

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/agendamento-api.git
cd agendamento-api
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env se quiser mudar senhas/configurações
```

### 3. Suba todos os containers

```bash
docker compose up --build
```

A API estará disponível em `http://localhost/api`  
O Swagger estará em `http://localhost/api-docs`

---

## 🔄 Migrations

O servidor sincroniza as tabelas automaticamente ao iniciar.  
Para rodar manualmente:

```bash
# Criar/atualizar tabelas
docker compose exec app node command.js migrate

# Recriar tudo do zero
docker compose exec app node command.js migrate:fresh
```

### Carregar dados de teste (seed)

```bash
docker compose exec postgres psql -U postgres -d agendamento_db -f /docker-entrypoint-initdb.d/setup.sql
# Para o seed com 100+ registros:
docker compose exec -T postgres psql -U postgres -d agendamento_db < scripts/seed/seed.sql
```

---

## 🔐 Como realizar Login e usar o JWT

### Login

```bash
POST http://localhost/api/login
Content-Type: application/json

{
  "email": "admin@salao.com",
  "senha": "senha123"
}
```

**Resposta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": { "id": 1, "nome": "Admin Sistema", "email": "admin@salao.com", "role": "admin" }
}
```

### Usar o token nas rotas protegidas

Adicione o header em todas as requisições:

```
Authorization: Bearer <seu_token_aqui>
```

---

## 📖 Documentação Swagger

Acesse após subir o projeto:

```
http://localhost/api-docs
```

No Swagger, clique em **Authorize** e cole o token JWT para testar as rotas protegidas.

---

## 🏗️ Detalhamento Técnico da Infraestrutura

### Otimização de Imagens (Dockerfile)

O Dockerfile usa **Multi-stage build** em duas etapas:
1. **Stage `builder`:** instala as dependências com `npm ci`
2. **Stage `runtime`:** copia apenas o necessário, sem devDependencies

Resultado: imagem final baseada em `node:20-alpine` (~150MB vs ~900MB da imagem padrão).  
O `.dockerignore` exclui `node_modules`, `.env`, logs e pasta `.git`.

### Persistência de Dados

Uso de **Named Volumes** (`postgres_data` e `redis_data`). Os dados sobrevivem à remoção/reinicialização dos containers.

```bash
# Provar persistência:
docker compose down          # para os containers
docker compose up -d         # sobe novamente
docker compose exec postgres psql -U postgres -d agendamento_db -c "SELECT COUNT(*) FROM clientes;"
# Os dados continuam lá ✅
```

### Rede e Comunicação (Custom Bridge Network)

Todos os serviços compartilham a rede `app_network` (bridge customizada).  
A comunicação ocorre por **DNS interno** (nome do serviço), sem IPs estáticos:
- `app` conecta em `postgres:5432` e `redis:6379`
- `nginx` roteia para `app:3000`

```bash
# Verificar DNS interno:
docker inspect agendamento_app | grep -A5 Networks
```

### Segurança

- Senhas armazenadas com **bcrypt** (salt 10)
- Autenticação via **JWT** em todas as rotas
- Container `app` **sem porta exposta** ao host
- Variáveis sensíveis em `.env` (nunca commitado)

---

## 🔒 Gestão de Segredos

Nunca commite o arquivo `.env` com senhas reais.

Use o `.env.example` como template:

```env
DB_PASSWORD=postgres123   # ⚠️ trocar em produção
JWT_SECRET=supersecret    # ⚠️ usar uma string longa e aleatória
```

---

## ✅ Comandos de Verificação

```bash
# Status dos containers
docker compose ps

# Logs da aplicação
docker compose logs app

# Logs do banco
docker compose logs postgres

# Testar conexão com o banco
docker compose exec postgres psql -U postgres -d agendamento_db -c "\dt"

# Verificar rede Bridge e DNS
docker inspect agendamento_app

# Verificar volumes (persistência)
docker volume ls | grep agendamento
```

**URL da API:** `http://localhost/api`  
**Swagger:** `http://localhost/api-docs`

---

## 🧹 Limpeza dos Recursos

```bash
# Para e remove containers, mantendo volumes (dados)
docker compose down

# Para, remove containers E volumes (apaga dados)
docker compose down -v

# Remove imagens geradas
docker rmi agendamento-api-app
```

---

## ❓ Troubleshooting

**Porta 80 em uso:**
```bash
sudo lsof -i :80
# ou mude para outra porta no docker-compose.yml: "8080:80"
```

**Banco não conecta:**
```bash
docker compose logs postgres
# Aguarde o healthcheck ficar healthy antes do app subir
```

**Migrations com erro:**
```bash
docker compose exec app node command.js migrate:fresh
# ⚠️ APAGA todos os dados — só use em dev
```
