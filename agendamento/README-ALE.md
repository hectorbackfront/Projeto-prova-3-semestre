# README — Infraestrutura de Sistemas Web (Avaliação Alê)

> Este documento cobre os requisitos de infraestrutura da disciplina de Implementação de Servidores.
> Para a documentação da API (rotas, autenticação, banco), consulte o [README.md](./README.md).

---

## 1. Identificação do Projeto

**Título:** Agendamento API

**Descrição:** API REST para gerenciamento de agendamentos de serviços (salão de beleza). Permite cadastro de clientes, serviços, usuários e agendamentos com autenticação JWT.

**Caminho Escolhido: Opção A — Docker / Orquestração Local**

A infraestrutura é totalmente baseada em contêineres Docker orquestrados via `docker-compose.yml`, seguindo os princípios de Multi-stage Build, Custom Bridge Networks, Named Volumes e isolamento de serviços.

---

## 2. Pré-requisitos

Ferramentas necessárias instaladas no ambiente (WSL2 ou Linux nativo):

| Ferramenta | Versão mínima | Finalidade |
|---|---|---|
| Docker Engine | 24.x | Runtime dos contêineres |
| Docker Compose | 2.x (plugin) | Orquestração local |
| Git | qualquer | Clonar o repositório |

Verificar instalação:

```bash
docker --version
docker compose version
git --version
```

> Para Docker Swarm (modo produção), o Docker Engine já inclui o daemon do Swarm — nenhuma instalação adicional necessária.

---

## 3. Guia de Instalação e Execução ("How to Up")

### 3.1 Clonar o repositório

```bash
git clone https://github.com/hectorbackfront/Projeto-prova-3-semestre.git
cd agendamento
```

### 3.2 Configurar variáveis de ambiente

```bash
cp .env.example .env
```

> Edite o `.env` com suas credenciais reais antes de subir. **Nunca commite o arquivo `.env` com senhas reais.**

### 3.3 Subir a infraestrutura completa

```bash
docker compose up --build -d
```

Aguarde os healthchecks (aproximadamente 15 segundos) e confirme:

```bash
docker compose ps
```

Todos os serviços devem aparecer como `Running` ou `Healthy`.

### 3.4 Acessar a aplicação

```
http://localhost
```

### 3.5 Derrubar o ambiente

```bash
# Derruba sem apagar dados persistidos
docker compose down

# Derruba e remove todos os volumes (apaga dados do banco)
docker compose down -v
```

---

## 4. Detalhamento Técnico da Infraestrutura

### 4.1 Otimização de Imagens (Dockerfile)

O `Dockerfile` utiliza **Multi-stage Build** com dois estágios:

```
STAGE 1 (builder): node:24-alpine
  → Copia apenas package*.json
  → Executa npm install (dependências isoladas nesta camada)

STAGE 2 (runtime): node:24-alpine
  → Copia apenas node_modules do builder (sem cache npm)
  → Copia o código-fonte
  → Executa como usuário não-root (appuser)
```

**Por que isso importa:**
- A imagem final não carrega ferramentas de build
- O cache de camadas é aproveitado: se o código muda mas o `package.json` não, o `npm install` não roda novamente
- Imagem leve baseada em Alpine Linux (~150MB vs ~900MB da imagem padrão)
- Usuário não-root reduz a superfície de ataque caso o contêiner seja comprometido

O `.dockerignore` exclui `node_modules`, `.env`, `.git` e outros arquivos desnecessários, reduzindo o contexto de build enviado ao daemon.

### 4.2 Persistência de Dados (Named Volumes)

```yaml
volumes:
  postgres_data:   # dados do PostgreSQL
  redis_data:      # dados do Redis
```

**Named Volumes** são gerenciados pelo Docker Engine — não dependem de um caminho do host. Isso significa que:
- Os dados **sobrevivem** a `docker compose down` (sem `-v`)
- Os dados **sobrevivem** à deleção e recriação do contêiner
- O Docker garante o isolamento e o ciclo de vida do volume

Bind mounts (`./scripts/setup.sql`) são usados **apenas para inicialização** (scripts SQL que rodam uma única vez), nunca para dados persistentes de produção.

### 4.3 Rede e Comunicação Interna (Custom Bridge)

```yaml
networks:
  app_network:
    driver: bridge
```

Todos os serviços estão na mesma rede customizada `app_network`. O Docker Engine provê **DNS interno automático**: cada serviço é resolvido pelo seu nome declarado no Compose.

Exemplo: a aplicação Node.js conecta no banco com `DB_HOST=postgres` — sem IP fixo, sem configuração manual. O Docker resolve `postgres` para o IP interno do contêiner em tempo de execução (Service Discovery nativo).

**Isolamento:** o contêiner `app` não expõe nenhuma porta ao host. Todo o tráfego externo passa obrigatoriamente pelo Nginx (porta 80), que atua como proxy reverso. Isso forma a camada de segurança perimetral.

```
Internet → Nginx (porta 80) → app (porta 3000, interna) → postgres / redis
```

### 4.4 Segurança

| Medida | Implementação |
|---|---|
| Usuário não-root | `appuser` criado no Dockerfile, processo Node roda sem privilégios |
| App sem porta exposta | Nenhum `ports:` no serviço `app` — inacessível diretamente |
| Proxy reverso obrigatório | Nginx é o único ponto de entrada externo |
| Credenciais via variável de ambiente | Senhas no `.env` (nunca hardcoded no código) |
| Blacklist de tokens JWT | Redis invalida tokens no logout sem depender do banco |

### 4.5 Compose vs. Swarm (Single-host vs. Multi-host)

O `docker-compose.yml` define a arquitetura declarativa para **ambiente single-host** (desenvolvimento/testes). Para **produção multi-host**, o mesmo arquivo pode ser promovido a uma Stack do Docker Swarm:

```bash
# Inicializar o nó como manager do Swarm
docker swarm init

# Deploy como Stack (lê a seção deploy: do compose)
docker stack deploy -c docker-compose.yml agendamento
```

Os serviços já possuem a seção `deploy:` configurada com réplicas e política de restart, o que habilita:
- **Alta disponibilidade** com múltiplas réplicas da aplicação
- **Autorrecuperação** automática em caso de falha do contêiner
- **Rolling updates** sem downtime

---

## 5. Gestão de Segredos e Configurações

O arquivo `.env.example` serve como template. O avaliador deve:

```bash
cp .env.example .env
# Editar .env com os valores reais
```

Conteúdo do `.env.example`:

```env
DB_HOST=postgres
DB_PORT=5432
DB_NAME=agendamento_db
DB_USER=postgres
DB_PASSWORD=postgres123

JWT_SECRET=supersecretjwtkey2024
JWT_EXPIRES_IN=1d

PORT=3000
NODE_ENV=development

POSTGRES_PASSWORD=postgres123
```

> **AVISO IMPORTANTE:** Nunca commite o arquivo `.env` com senhas ou chaves reais no repositório. O `.gitignore` já exclui o `.env`.

---

## 6. Evidências de Funcionamento e Verificação

### 6.1 Verificar contêineres em execução

```bash
docker compose ps
```

### 6.2 Inspecionar a rede bridge e confirmar DNS interno

```bash
docker inspect agendamento_app_network
```

A saída mostrará todos os contêineres conectados com seus nomes e IPs internos atribuídos automaticamente pelo Docker.

### 6.3 Confirmar que o banco NÃO é acessível externamente

```bash
# Tenta conectar no banco diretamente pela porta do host — deve FALHAR
curl -v http://localhost:5432
# Resultado esperado: "Connection refused" — o banco só é acessível internamente
```

### 6.4 Verificar logs dos serviços

```bash
docker compose logs app
docker compose logs postgres
docker compose logs nginx
```

### 6.5 Confirmar resolução DNS interna (Service Discovery)

```bash
# Acessa o shell do contêiner app e testa o DNS interno
docker compose exec app sh -c "ping -c 2 postgres"
docker compose exec app sh -c "ping -c 2 redis"
```

### 6.6 URL de acesso à aplicação

```
http://localhost          → API principal
http://localhost/api-docs → Documentação Swagger
```

---

## 7. PoC — Prova de Conceito

### 7.1 Persistência de Dados

Prova de que os dados sobrevivem à reinicialização do contêiner:

```bash
# 1. Subir o ambiente e criar um agendamento (via API)
docker compose up -d

# 2. Reiniciar o contêiner do banco
docker compose restart postgres

# 3. Aguardar o healthcheck
docker compose ps

# 4. Consultar os dados — devem estar intactos
curl http://localhost/api/agendamentos
```

Os dados persistem porque estão no Named Volume `postgres_data`, não no sistema de arquivos efêmero do contêiner.

### 7.2 Segurança — Isolamento de Rede

Prova de que o banco é inacessível diretamente:

```bash
# Tentar acessar o PostgreSQL diretamente pelo host — deve ser recusado
psql -h localhost -p 5432 -U postgres
# Erro esperado: "Connection refused"

# A única forma de acessar é pelo proxy interno
docker compose exec app sh -c "nc -zv postgres 5432"
# Resultado: "postgres (172.x.x.x:5432) open" — funciona internamente
```

---

## 8. Pipeline CI/CD — Automação (GitHub Actions + ECR)

O arquivo `.github/workflows/docker-ecr.yml` implementa o pipeline completo:

| Fase | O que faz |
|---|---|
| **Test** | Roda `npm test` (32 testes com Jest) — falha aqui aborta o pipeline |
| **Build** | Gera a imagem otimizada via Dockerfile Multi-stage |
| **Tag** | Versiona a imagem com o SHA do commit e `latest` |
| **ECR Push** | Envia a imagem para o registro privado na AWS |
| **Deploy** | Atualiza o serviço ECS consumindo a nova imagem |

O pipeline é disparado automaticamente a cada push na branch `main`.

Para executar o pipeline, configure os seguintes secrets no repositório GitHub:

| Secret | Descrição |
|---|---|
| `AWS_ACCESS_KEY_ID` | Chave de acesso IAM (CI only) |
| `AWS_SECRET_ACCESS_KEY` | Chave secreta IAM (CI only) |
| `AWS_REGION` | Região AWS (ex: `us-east-1`) |
| `ECR_REPOSITORY` | Nome do repositório ECR |
| `ECS_CLUSTER` | Nome do cluster ECS |
| `ECS_SERVICE` | Nome do serviço ECS |

> As credenciais ficam nos Secrets do GitHub — nunca no código ou em arquivos de configuração.

---

## 9. Testes Automatizados

A suite de testes usa **Jest + Supertest** e cobre as rotas da API sem precisar de banco de dados ou Docker rodando — os modelos Sequelize e o Redis são simulados via mocks.

### 9.1 Instalar dependências de teste

```bash
npm install
```

### 9.2 Rodar os testes

```bash
npm test
```

Resultado esperado:

```
Test Suites: 4 passed, 4 total
Tests:       32 passed, 32 total
```

### 9.3 O que é testado

| Arquivo | Testes | Cobertura |
|---|---|---|
| `tests/health.test.js` | 1 | Endpoint `/health` retorna `{ status: 'ok' }` |
| `tests/auth.test.js` | 8 | Login válido/inválido, logout, blacklist JWT no Redis, middleware de auth |
| `tests/clientes.test.js` | 10 | CRUD completo de clientes + 401 sem token + 404 + 409 CPF duplicado |
| `tests/agendamentos.test.js` | 13 | CRUD de agendamentos + lock distribuído no Redis + conflito de horário |

### 9.4 Por que não precisa do Docker

Os testes utilizam `jest.mock()` para substituir:
- `src/models` — evita qualquer conexão com o PostgreSQL
- `src/config/redis` — evita conexão com o Redis

Isso permite validar toda a lógica de negócio e as rotas de forma isolada, rápida e reproduzível em qualquer ambiente.

---

## 10. Vídeos de Apresentação

| Parte | Membro | Tema | Link |
|---|---|---|---|
| P1 | Hector Marcelo Pedroso dos Santos (RA: 6125136) | Dockerfile + Docker Compose + Rede | [Assistir](https://youtu.be/rXl7rmR8kjA) |
| P2 | Guilherme | Persistência + Segurança | [Assistir](https://youtu.be/aJKX0gdQWhw?si=nRwwlmtfVTN9sDjD) |
| P3 | Marcos | CI/CD + Swarm | [Assistir](https://youtu.be/3fkza8NmT_A) |

---

## 11. Troubleshooting e Limpeza

### Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Contêiner `app` reinicia em loop | Banco ainda não está pronto | Aguardar o healthcheck do postgres |
| Porta 80 em uso | Outro serviço usando a porta | `sudo lsof -i :80` e encerrar o processo |
| Volume com dados corrompidos | Shutdown abrupto | `docker compose down -v && docker compose up -d` |
| Imagem desatualizada | Build com cache antigo | `docker compose build --no-cache` |

### Limpeza completa após avaliação

```bash
# Remove contêineres e rede (mantém volumes/dados)
docker compose down

# Remove contêineres, rede E volumes (apaga todos os dados)
docker compose down -v

# Remove também as imagens buildadas localmente
docker compose down -v --rmi local

# Limpeza geral do Docker (imagens, volumes e redes não utilizados)
docker system prune -a --volumes
```
