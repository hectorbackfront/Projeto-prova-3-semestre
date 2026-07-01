# Banco de Dados — Avaliação (Prof. Gustavo)

> Este documento cobre os requisitos de banco de dados da disciplina.
> Para a API REST (prof. Luan) consulte o [README.md](./README.md).
> Para infraestrutura Docker (prof. Alê) consulte o [README-ALE.md](./README-ALE.md).

---

## 1. Definição da Arquitetura

### 1.1 Escolha Tecnológica

- **Tipo:** SQL — banco de dados relacional
- **Provedor:** PostgreSQL 17 (`postgres:17-alpine`)
- **Justificativa completa:** [`justificativa/arquitetura.md`](./justificativa/arquitetura.md)

**Resumo da escolha:** O sistema possui dados estruturados com relacionamentos fixos entre entidades (clientes, funcionários, serviços e agendamentos). O modelo relacional com PostgreSQL garante integridade referencial via constraints, transações ACID e tipos nativos adequados (`TIMESTAMPTZ`, `DECIMAL`, `ENUM`). NoSQL não se aplica pois o esquema é estável e os dados não são documentos variáveis.

### 1.2 Requisitos do Sistema

| Item | Detalhe |
|---|---|
| **Objetivo** | Gerenciar agendamentos de um salão de beleza |
| **Entidades** | usuarios, clientes, servicos, agendamentos, agendamento_servicos |
| **Volume estimado** | ~500 agendamentos/mês, ~200 clientes ativos |
| **Usuários simultâneos** | Até 20 (sistema interno) |
| **Consultas críticas** | Agenda por período, histórico por CPF, faturamento mensal, ranking de serviços, ranking de funcionários |

---

## 2. Modelagem e Estrutura

### 2.1 Diagramas

| Diagrama | Arquivo |
|---|---|
| Diagrama Conceitual (DER) | [`modelagem/der.svg`](./modelagem/der.svg) |
| Diagrama Lógico | [`modelagem/modelo_logico.svg`](./modelagem/modelo_logico.svg) |
| Dicionário de Dados | [`modelagem/dicionario_dados.md`](./modelagem/dicionario_dados.md) |

> Para visualizar os diagramas SVG, abra o arquivo no navegador ou em qualquer visualizador de imagens.

### 2.2 Entidades e Relacionamentos

```
USUARIO (1) ──── (N) AGENDAMENTO (N) ──── (N) SERVICO
                       │                    (via tabela pivô)
                      (N)
                       │
                    CLIENTE (1)
```

| Tabela | Tipo | Descrição |
|---|---|---|
| `usuarios` | Entidade | Funcionários e admins do sistema |
| `clientes` | Entidade | Clientes que realizam agendamentos |
| `servicos` | Entidade | Serviços oferecidos pelo salão |
| `agendamentos` | Entidade | Registro de cada atendimento |
| `agendamento_servicos` | **Pivô (N:N)** | Serviços realizados em cada agendamento |

**Relação N:N:** `agendamentos` ↔ `servicos` via `agendamento_servicos`

### 2.3 Script DDL

Arquivo: [`scripts/setup.sql`](./scripts/setup.sql)

Contém:
- `CREATE TYPE` para ENUMs
- `CREATE TABLE IF NOT EXISTS` para todas as 5 tabelas
- Chaves primárias (`SERIAL PRIMARY KEY`)
- Chaves estrangeiras com `ON DELETE RESTRICT / CASCADE`
- Constraints (`NOT NULL`, `UNIQUE`, `CHECK`)
- 6 índices B-Tree para otimização de consultas

### 2.4 Índices

| Índice | Tabela | Campo(s) | Tipo | Motivo |
|---|---|---|---|---|
| idx_clientes_cpf | clientes | cpf | B-Tree | Busca por CPF (consulta mais frequente) |
| idx_clientes_nome | clientes | nome | B-Tree | Ordenação e busca por nome |
| idx_agendamentos_data | agendamentos | data_hora | B-Tree | Filtros por período (agenda do dia/semana) |
| idx_agendamentos_status | agendamentos | status | B-Tree | Filtros por status (concluido, cancelado) |
| idx_agendamentos_cliente | agendamentos | cliente_id | B-Tree | Histórico de agendamentos por cliente |
| idx_agendamentos_cliente_data | agendamentos | cliente_id, data_hora | B-Tree composto | Relatórios por cliente e período |

---

## 3. Modelagem e Normalização

### 1FN — Primeira Forma Normal
Todas as tabelas atendem à 1FN:
- Cada coluna contém apenas **valores atômicos** (sem listas ou arrays em colunas)
- Cada linha é **unicamente identificada** pela chave primária (`id SERIAL`)
- Não há grupos repetidos: a relação N:N entre agendamentos e serviços é resolvida com a tabela pivô `agendamento_servicos`, não com arrays

### 2FN — Segunda Forma Normal
Todas as tabelas atendem à 2FN:
- Nenhuma tabela usa **chave composta** como PK (todas usam `id SERIAL`)
- Portanto, não existe dependência parcial possível — todos os atributos dependem inteiramente da PK
- `agendamento_servicos` (pivô) tem `id` próprio como PK; os campos `agendamento_id` e `servico_id` são FKs, não parte da PK

### 3FN — Terceira Forma Normal
Todas as tabelas atendem à 3FN:
- Não há **dependências transitivas**: nenhum atributo não-chave depende de outro atributo não-chave
- Exemplo: `valor_total` em `agendamentos` é calculado a partir de `agendamento_servicos.preco_aplicado`, mas é armazenado como **dado histórico desnormalizado intencionalmente** (veja abaixo)

**Desnormalização justificada:** `agendamento_servicos.preco_aplicado` armazena o preço do serviço **no momento do agendamento**. Isso é intencional: se o preço do serviço mudar no futuro, o histórico financeiro permanece correto. Referenciar `servicos.preco` diretamente causaria inconsistência retroativa nos relatórios.

---

## 4. Performance

### Estratégia de Indexação

Todos os índices são do tipo **B-Tree**, padrão do PostgreSQL para consultas de igualdade e intervalo:

| Campo | Motivo |
|---|---|
| `clientes.cpf` | Busca de retorno de cliente por CPF é a consulta mais frequente no balcão |
| `agendamentos.data_hora` | Filtros de agenda por dia/semana/mês usam `BETWEEN` — B-Tree ideal |
| `agendamentos.status` | Filtros por `status = 'agendado'` ou `'concluido'` são comuns nos relatórios |
| `agendamentos.cliente_id` | JOIN frequente para histórico do cliente |
| `(cliente_id, data_hora)` composto | Relatório de agendamentos por cliente em período usa ambas as colunas |

### Consultas Críticas

Arquivo: [`queries/consultas_avancadas.sql`](./queries/consultas_avancadas.sql)

| # | Consulta | Por que é importante |
|---|---|---|
| 1 | Agendamentos por período | Agenda da semana — consulta diária dos funcionários |
| 2 | Faturamento mensal | Relatório financeiro do salão |
| 3 | Serviços mais populares | Gestão do portfólio de serviços e marketing |
| 4 | Histórico por CPF | Atendimento ao cliente no balcão — usa índice no CPF |
| 5 | Ranking de funcionários | Gestão de desempenho da equipe |

Arquivo adicional de agregações: [`queries/agregacoes.sql`](./queries/agregacoes.sql)

---

## 5. Dados para Teste

Arquivo: [`scripts/seed/seed.sql`](./scripts/seed/seed.sql)

- **5 usuários** (1 admin + 4 funcionários)
- **10 serviços** (corte, coloração, escova, etc.)
- **50 clientes** com CPF e telefone fictícios
- **60+ agendamentos** com status variados e datas distribuídas
- **100+ vínculos** na tabela pivô `agendamento_servicos`

Total de registros: **100+ registros relevantes** para avaliação de performance de consultas e índices.

Os dados são coerentes com o domínio (salão de beleza): nomes realistas, CPFs válidos, preços plausíveis.

---

## 6. Organização do Repositório

```
.
├── README-GUSTAVO.md               ← este arquivo
├── modelagem/
│   ├── der.svg                     ← Diagrama Conceitual (DER)
│   ├── modelo_logico.svg           ← Diagrama Lógico
│   └── dicionario_dados.md         ← Dicionário de Dados
├── scripts/
│   ├── setup.sql                   ← DDL completo (CREATE TABLE, índices)
│   └── seed/
│       └── seed.sql                ← 100+ registros para testes
├── queries/
│   ├── crud.sql                    ← Operações CRUD básicas
│   ├── consultas_avancadas.sql     ← 5 consultas críticas com JOINs
│   └── agregacoes.sql              ← Agregações e relatórios
└── justificativa/
    └── arquitetura.md              ← Justificativa técnica da escolha do banco
```

---

## 7. Vídeos Explicativos

| # | Membro | Tema | Link |
|---|---|---|---|
| P1 | Hector Marcelo (RA 6125136) | Arquitetura + DER + Modelo Lógico + Dicionário | [Assistir no YouTube](https://youtu.be/sckfRwoRYWo) |
| P2 | Guilherme | DDL + Normalização + Seed | [Assistir no YouTube](https://youtu.be/7YVWjvHhlAQ) |
| P3 | Marcos | Índices + Consultas Críticas + Agregações | [Assistir no YouTube](https://youtu.be/4lVhcHKYLmc) |

---

## Como executar o banco

```bash
# Subir o PostgreSQL com Docker
docker compose up -d postgres

# Executar o DDL (criar tabelas e índices)
docker compose exec postgres psql -U postgres -d agendamento_db -f /docker-entrypoint-initdb.d/setup.sql

# Executar o seed (100+ registros)
docker compose exec postgres psql -U postgres -d agendamento_db -f /scripts/seed.sql

# Rodar uma consulta avançada
docker compose exec postgres psql -U postgres -d agendamento_db -f /queries/consultas_avancadas.sql
```

Ou via `command.js` (Sequelize sync):

```bash
docker compose exec app node command.js migrate
```
