# Sistema de Agendamento de Serviços

API REST para gerenciamento de agendamentos em salões de beleza e barbearias.

**Caminho escolhido:** Opção A — Docker / Orquestração Local

**Grupo:**

| Nome | Responsabilidade |
|------|-----------------|
| Hector | Dev Web + Infraestrutura |
| Guilherme | Banco de Dados |
| Marcos | Dev Web + Infraestrutura |

UNIFAAT — ADS 3º Semestre — 2026

---

## Descrição do Sistema

O sistema permite o cadastro de clientes, serviços e funcionários, além do gerenciamento completo de agendamentos. Um agendamento pode conter múltiplos serviços (relação N:N), realizado por um funcionário cadastrado.

---

## Entidades, Tabelas e Relacionamentos

```
usuarios           (id, nome, email*, senha[bcrypt], role, createdAt, updatedAt)
clientes           (id, nome, telefone, cpf*, email, createdAt, updatedAt)
servicos           (id, nome, descricao, preco, duracao_min, ativo, createdAt, updatedAt)
agendamentos       (id, cliente_id, usuario_id, data_hora, status, observacao, valor_total, createdAt, updatedAt)
agendamento_servicos (id, agendamento_id, servico_id, preco_aplicado)  ← TABELA PIVÔ
```

**Relações:**
- `agendamentos` → `clientes` (N:1)
- `agendamentos` → `usuarios` (N:1)
- `agendamentos` ↔ `servicos` via `agendamento_servicos` **(N:N)**

**Tabela pivô:** `agendamento_servicos` resolve a relação N:N entre agendamentos e serviços, armazenando também o `preco_aplicado` no momento do agendamento.

---

## CRUD das Entidades Principais

Cada entidade possui as 5 rotas básicas:

```
GET    /api/usuarios            # listar
GET    /api/usuarios/:id        # buscar por id
POST   /api/usuarios            # criar
PUT    /api/usuarios/:id        # atualizar
DELETE /api/usuarios/:id        # remover

GET    /api/clientes            # listar
GET    /api/clientes/:id        # buscar por id
POST   /api/clientes            # criar
PUT    /api/clientes/:id        # atualizar
DELETE /api/clientes/:id        # remover

GET    /api/servicos            # listar
GET    /api/servicos/:id        # buscar por id
POST   /api/servicos            # criar
PUT    /api/servicos/:id        # atualizar
DELETE /api/servicos/:id        # remover

GET    /api/agendamentos        # listar
GET    /api/agendamentos/:id    # buscar por id
POST   /api/agendamentos        # criar
PUT    /api/agendamentos/:id    # atualizar
DELETE /api/agendamentos/:id    # remover

POST   /api/login               # login (rota pública)

POST   /api/agendamentos/:id/servicos          # adicionar serviço ao agendamento
DELETE /api/agendamentos/:id/servicos/:sid     # remover serviço do agendamento
```

---

## Bibliotecas Utilizadas

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

## Containers Utilizados

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

## Pré-requisitos

- Docker Desktop instalado e rodando
- Git

---

## Como Executar o Projeto

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/agendamento-api.git
cd agendamento-api/agendamento
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

Para rodar em segundo plano:

```bash
docker compose up -d --build
```

---

## Migrations

O servidor sincroniza as tabelas automaticamente ao iniciar.
Para rodar manualmente:

```bash
# Criar/atualizar tabelas
docker compose exec app node command.js migrate

# Recriar tudo do zero (apaga dados — só em dev)
docker compose exec app node command.js migrate:fresh
```

---

## Dados de Teste (Seed)

```bash
# Seed automático via setup.sql (executado na criação do container)
docker compose exec postgres psql -U postgres -d agendamento_db -f /docker-entrypoint-initdb.d/setup.sql

# Seed com 100+ registros
docker compose exec -T postgres psql -U postgres -d agendamento_db < scripts/seed/seed.sql
```

---

## Login e uso do JWT

### Realizar login

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

Todas as rotas são protegidas por JWT, exceto `POST /api/login`.

---

## Documentação Swagger

```
http://localhost/api-docs
```

No Swagger, clique em **Authorize** e cole o token JWT para testar as rotas protegidas.

A documentação cobre todas as entidades com as rotas: list, get, create, update, delete e rotas da tabela pivô.

---

## Detalhamento Técnico da Infraestrutura

### Otimização de Imagens (Dockerfile)

O Dockerfile usa **Multi-stage build** em duas etapas:
1. **Stage `builder`:** instala as dependências com `npm ci`
2. **Stage `runtime`:** copia apenas o necessário, sem devDependencies

Resultado: imagem final baseada em `node:20-alpine` (~150 MB vs ~900 MB da imagem padrão).
O `.dockerignore` exclui `node_modules`, `.env`, logs e pasta `.git`.

### Persistência de Dados (Named Volumes)

Uso de **Named Volumes** (`postgres_data` e `redis_data`). Os dados sobrevivem à remoção/reinicialização dos containers.

```bash
# Prova de persistência:
docker compose down          # para os containers
docker compose up -d         # sobe novamente
docker compose exec postgres psql -U postgres -d agendamento_db -c "SELECT COUNT(*) FROM clientes;"
# Os dados continuam lá
```

### Rede e Comunicação (Custom Bridge Network)

Todos os serviços compartilham a rede `app_network` (bridge customizada).
A comunicação ocorre por **DNS interno** (nome do serviço), sem IPs estáticos:
- `app` conecta em `postgres:5432` e `redis:6379`
- `nginx` roteia para `app:3000`

```bash
# Verificar DNS interno e resolução de rede:
docker inspect agendamento_app | grep -A5 Networks
docker network inspect agendamento_app_network
```

### Segurança

- Senhas armazenadas com **bcrypt** (salt 10)
- Autenticação via **JWT** em todas as rotas
- Container `app` **sem porta exposta** ao host
- Variáveis sensíveis em `.env` (nunca commitado)
- Middleware de autenticação aplicado em todas as rotas exceto `/login`

---

## Gestão de Segredos e Configurações

Nunca commite o arquivo `.env` com senhas reais. Use o `.env.example` como template:

```env
DB_PASSWORD=postgres123   # trocar em produção
JWT_SECRET=supersecret    # usar uma string longa e aleatória
```

---

## Evidências de Funcionamento e Verificação

```bash
# Status dos containers
docker compose ps

# Logs da aplicação
docker compose logs app

# Logs do banco
docker compose logs postgres

# Testar conexão com o banco
docker compose exec postgres psql -U postgres -d agendamento_db -c "\dt"

# Verificar rede Bridge e DNS interno
docker inspect agendamento_app
docker network inspect agendamento_app_network

# Verificar volumes (persistência)
docker volume ls | grep agendamento

# Verificar serviços rodando no Swarm (se aplicável)
docker service ps agendamento_app
```

**URL da API:** `http://localhost/api`
**Swagger:** `http://localhost/api-docs`

---

## Troubleshooting e Limpeza

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
# APAGA todos os dados — só use em dev
```

**Parar e remover containers (mantendo volumes/dados):**
```bash
docker compose down
```

**Parar, remover containers E volumes (apaga todos os dados):**
```bash
docker compose down -v
```

**Remover imagem gerada:**
```bash
docker rmi agendamento-api-app
```

---

## Definição da Arquitetura de Banco de Dados

### 1.1 Escolha Tecnológica

**Banco escolhido:** PostgreSQL 16
**Tipo:** SQL (Relacional)

**Justificativa:**
O sistema de agendamentos possui dados altamente relacionais: um agendamento pertence a um cliente, é atendido por um funcionário e contém múltiplos serviços. Esse modelo se encaixa naturalmente em um banco relacional, onde as constraints de integridade referencial (FOREIGN KEY) garantem consistência dos dados. O PostgreSQL foi escolhido por ser robusto, open-source, suportar transações ACID e ser amplamente utilizado em produção.

### 1.2 Requisitos do Sistema

**Objetivo:** Sistema de agendamento para salão de beleza/barbearia

**Principais entidades:**
- Usuários (funcionários e admins)
- Clientes
- Serviços
- Agendamentos
- AgendamentoServicos (pivô N:N)

**Volume estimado:**
- 500–2000 clientes ativos
- 1000–5000 agendamentos/mês
- 10–20 serviços cadastrados
- 3–10 funcionários

**Principais consultas realizadas:**
- Agenda do dia / semana por funcionário
- Histórico de cliente por CPF
- Relatório financeiro mensal
- Serviços mais realizados

---

## Modelagem e Normalização

### 1FN — Primeira Forma Normal

Todas as tabelas possuem:
- Chave primária definida (SERIAL PRIMARY KEY)
- Atributos atômicos (sem campos com múltiplos valores)
- Sem grupos de repetição

*Exemplo:* Um agendamento não armazena os serviços em uma coluna como "serviço1, serviço2". Em vez disso, usa a tabela pivô `agendamento_servicos`.

### 2FN — Segunda Forma Normal

- Todas as tabelas têm chave primária simples (sem chave composta), portanto 2FN é satisfeita automaticamente
- Nenhum atributo não-chave depende parcialmente da chave

### 3FN — Terceira Forma Normal

Não existem dependências transitivas:
- `clientes` armazena apenas dados do cliente
- `servicos` armazena apenas dados do serviço
- `agendamentos` armazena apenas a transação, referenciando cliente e funcionário por FK

**Desnormalização intencional:** O campo `preco_aplicado` na tabela pivô `agendamento_servicos` armazena o preço no momento do agendamento. Isso viola 3FN em teoria (o preço poderia ser buscado em `servicos`), mas é uma desnormalização justificada: o preço de um serviço pode mudar ao longo do tempo, e o histórico financeiro precisa refletir o valor cobrado na data do serviço.

---

## Estratégia de Indexação

| Campo | Tabela | Tipo de Índice | Motivo |
|---|---|---|---|
| cpf | clientes | B-Tree | Busca frequente por CPF |
| nome | clientes | B-Tree | Ordenação e filtro por nome |
| data_hora | agendamentos | B-Tree | Filtros por período (consulta mais comum) |
| status | agendamentos | B-Tree | Filtros por status da agenda |
| cliente_id | agendamentos | B-Tree | Histórico do cliente |
| (cliente_id, data_hora) | agendamentos | B-Tree composto | Relatórios por cliente em período |

---

## Consultas Críticas

As consultas relevantes estão em `queries/consultas_avancadas.sql`. Abaixo as 5 principais:

**1. Agenda do dia por funcionário (JOIN + filtro por data)**
```sql
SELECT a.id, c.nome AS cliente, u.nome AS funcionario,
       a.data_hora, a.status,
       array_agg(s.nome) AS servicos
FROM agendamentos a
JOIN clientes c ON c.id = a.cliente_id
JOIN usuarios u ON u.id = a.usuario_id
JOIN agendamento_servicos ags ON ags.agendamento_id = a.id
JOIN servicos s ON s.id = ags.servico_id
WHERE DATE(a.data_hora) = CURRENT_DATE
GROUP BY a.id, c.nome, u.nome, a.data_hora, a.status
ORDER BY a.data_hora;
```

**2. Histórico do cliente por CPF (JOIN + filtro)**
```sql
SELECT a.id, a.data_hora, a.status, a.valor_total,
       array_agg(s.nome) AS servicos
FROM agendamentos a
JOIN clientes c ON c.id = a.cliente_id
JOIN agendamento_servicos ags ON ags.agendamento_id = a.id
JOIN servicos s ON s.id = ags.servico_id
WHERE c.cpf = '123.456.789-00'
GROUP BY a.id, a.data_hora, a.status, a.valor_total
ORDER BY a.data_hora DESC;
```

**3. Relatório financeiro mensal (agregação)**
```sql
SELECT DATE_TRUNC('month', data_hora) AS mes,
       COUNT(*) AS total_agendamentos,
       SUM(valor_total) AS receita_total,
       AVG(valor_total) AS ticket_medio
FROM agendamentos
WHERE status = 'concluido'
GROUP BY mes
ORDER BY mes DESC;
```

**4. Serviços mais realizados (agregação + ranking)**
```sql
SELECT s.nome, COUNT(ags.id) AS total_realizados,
       SUM(ags.preco_aplicado) AS receita_gerada
FROM servicos s
JOIN agendamento_servicos ags ON ags.servico_id = s.id
JOIN agendamentos a ON a.id = ags.agendamento_id
WHERE a.status = 'concluido'
GROUP BY s.nome
ORDER BY total_realizados DESC;
```

**5. Agendamentos por status no período (filtro por data)**
```sql
SELECT status, COUNT(*) AS quantidade
FROM agendamentos
WHERE data_hora BETWEEN '2026-01-01' AND '2026-12-31'
GROUP BY status
ORDER BY quantidade DESC;
```

---

## Dados para Teste

Scripts com 100+ registros estão em `scripts/seed/seed.sql`.

```bash
# Carregar seed no banco
docker compose exec -T postgres psql -U postgres -d agendamento_db < scripts/seed/seed.sql

# Verificar contagem após seed
docker compose exec postgres psql -U postgres -d agendamento_db -c "
  SELECT 'usuarios' AS tabela, COUNT(*) FROM usuarios
  UNION ALL SELECT 'clientes', COUNT(*) FROM clientes
  UNION ALL SELECT 'servicos', COUNT(*) FROM servicos
  UNION ALL SELECT 'agendamentos', COUNT(*) FROM agendamentos
  UNION ALL SELECT 'agendamento_servicos', COUNT(*) FROM agendamento_servicos;
"
```
