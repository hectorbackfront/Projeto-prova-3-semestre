# Agendamento API

API REST para gerenciamento de agendamentos de serviços. Desenvolvida com Node.js, Express, Sequelize e PostgreSQL.

---

## Containers utilizados

| Container | Imagem | Função |
|---|---|---|
| `agendamento_postgres` | `postgres:17-alpine` | Banco de dados principal |
| `agendamento_app` | `node:24-alpine` (Dockerfile local) | Servidor HTTP Node.js (privado, sem acesso direto) |
| `agendamento_nginx` | `nginx:alpine` | Proxy reverso — único ponto de entrada externo |
| `agendamento_redis` | `redis:7-alpine` | Blacklist de tokens JWT no logout |

Arquitetura de acesso:

```
Host (porta 80) → Nginx → Node.js App (porta 3000, interna) → PostgreSQL
```

O container Node.js não expõe nenhuma porta ao host. Todo acesso externo passa pelo Nginx.

---

## Como executar o projeto com Docker

### Pré-requisitos

- Docker e Docker Compose instalados

### Passo a passo

**1. Clone o repositório e entre na pasta:**

```bash
git clone <https://github.com/hectorbackfront/Projeto-prova-3-semestre.git>
cd agendamento
```

**2. Suba todos os containers:**

```bash
docker compose up --build -d
```

Aguarde os containers ficarem saudáveis (cerca de 15 segundos) e confirme:

```bash
docker compose ps
```

Todos devem aparecer como `Running` ou `Healthy`.

**3. A API estará disponível em:**

```
http://localhost
```

Para derrubar tudo:

```bash
docker compose down
```

Para derrubar e apagar os dados do banco:

```bash
docker compose down -v
```

---

## Como executar as migrations

> **O banco já é inicializado automaticamente com tabelas e dados de seed ao subir os containers — não é necessário rodar migrate em uma instalação limpa.**

Os comandos abaixo são úteis apenas em desenvolvimento, quando há mudanças no modelo:

```bash
docker compose exec app node command.js migrate
```

Para recriar o banco do zero (apaga todos os dados):

```bash
docker compose exec app node command.js migrate:fresh
```

Comandos disponíveis:

| Comando | O que faz |
|---|---|
| `node command.js migrate` | Cria ou atualiza as tabelas sem apagar dados |
| `node command.js migrate:fresh` | Apaga e recria todas as tabelas |

---

## Como realizar login e usar o token JWT

**1. Faça login enviando email e senha:**

```http
POST http://localhost/api/login
Content-Type: application/json

{
  "email": "admin@salao.com",
  "senha": "senha123"
}
```

**2. A resposta retorna o token:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nome": "Admin",
    "email": "admin@salao.com",
    "role": "admin"
  }
}
```

**3. Use o token em todas as outras requisições no header:**

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**4. Para encerrar a sessão (invalida o token via Redis):**

```http
POST http://localhost/api/logout
Authorization: Bearer <token>
```

---

## Documentação Swagger

Com o projeto rodando, acesse:

```
http://localhost/api-docs
```

A documentação lista todas as rotas disponíveis com exemplos de request e response. Você pode testar as rotas diretamente pelo Swagger clicando em "Authorize" e inserindo o token JWT.

---

## Entidades e rotas disponíveis

### Usuários — `/api/usuarios`

| Método | Rota | Ação |
|---|---|---|
| GET | `/api/usuarios` | Lista todos os usuários |
| GET | `/api/usuarios/:id` | Busca usuário por ID |
| POST | `/api/usuarios` | Cria novo usuário |
| PUT | `/api/usuarios/:id` | Atualiza usuário |
| DELETE | `/api/usuarios/:id` | Remove usuário |

### Clientes — `/api/clientes`

| Método | Rota | Ação |
|---|---|---|
| GET | `/api/clientes` | Lista todos os clientes |
| GET | `/api/clientes/:id` | Busca cliente por ID |
| POST | `/api/clientes` | Cria novo cliente |
| PUT | `/api/clientes/:id` | Atualiza cliente |
| DELETE | `/api/clientes/:id` | Remove cliente |

### Serviços — `/api/servicos`

| Método | Rota | Ação |
|---|---|---|
| GET | `/api/servicos` | Lista todos os serviços |
| GET | `/api/servicos/:id` | Busca serviço por ID |
| POST | `/api/servicos` | Cria novo serviço |
| PUT | `/api/servicos/:id` | Atualiza serviço |
| DELETE | `/api/servicos/:id` | Remove serviço |

### Agendamentos — `/api/agendamentos`

| Método | Rota | Ação |
|---|---|---|
| GET | `/api/agendamentos` | Lista todos os agendamentos |
| GET | `/api/agendamentos/:id` | Busca agendamento por ID |
| POST | `/api/agendamentos` | Cria novo agendamento |
| PUT | `/api/agendamentos/:id` | Atualiza agendamento |
| DELETE | `/api/agendamentos/:id` | Cancela agendamento |
| POST | `/api/agendamentos/:agendamento_id/servicos/:servico_id` | Adiciona serviço ao agendamento (tabela pivô) |
| DELETE | `/api/agendamentos/:agendamento_id/servicos/:servico_id` | Remove serviço do agendamento (tabela pivô) |

> **Atenção:** o campo `servico_ids` é obrigatório ao criar um agendamento. Exemplo de body:
>
> ```json
> {
>   "cliente_id": 1,
>   "usuario_id": 2,
>   "data_hora": "2026-08-01T10:00:00Z",
>   "observacao": "Opcional",
>   "servico_ids": [1, 2]
> }
> ```

### Autenticação

| Método | Rota | Ação |
|---|---|---|
| POST | `/api/login` | Gera token JWT |
| POST | `/api/logout` | Invalida o token atual |

---

## Banco de dados

### Tabelas

| Tabela | Descrição |
|---|---|
| `usuarios` | Usuários do sistema (admin / funcionário). Email único, senha com bcrypt |
| `clientes` | Clientes que fazem agendamentos |
| `servicos` | Serviços oferecidos (corte, barba, etc.) |
| `agendamentos` | Registro de cada agendamento (cliente + funcionário + data/hora) |
| `agendamento_servicos` | Tabela pivô — relação N:N entre agendamentos e serviços |

### Relações

- Um `Agendamento` pertence a um `Cliente`
- Um `Agendamento` pertence a um `Usuario` (funcionário responsável)
- Um `Agendamento` pode ter vários `Servicos` e um `Servico` pode estar em vários `Agendamentos` (N:N via `agendamento_servicos`)
