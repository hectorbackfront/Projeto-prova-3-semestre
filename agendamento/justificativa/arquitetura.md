# Justificativa de Arquitetura — Banco de Dados

## 1. Definição da Arquitetura

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

**Volume estimado de dados:**
- 500–2000 clientes ativos
- 1000–5000 agendamentos/mês
- 10–20 serviços cadastrados

**Quantidade estimada de usuários:** 3–10 funcionários simultâneos

**Principais consultas realizadas:**
- Agenda do dia / semana por funcionário
- Histórico de cliente por CPF
- Relatório financeiro mensal
- Serviços mais realizados

---

## 2. Modelagem e Estrutura

### Modelagem

**Diagrama Lógico:**
```
usuarios             (id PK, nome, email UNIQUE, senha[bcrypt], role, createdAt, updatedAt)
clientes             (id PK, nome, telefone, cpf UNIQUE, email, createdAt, updatedAt)
servicos             (id PK, nome, descricao, preco, duracao_min, ativo, createdAt, updatedAt)
agendamentos         (id PK, cliente_id FK, usuario_id FK, data_hora, status, observacao, valor_total, createdAt, updatedAt)
agendamento_servicos (id PK, agendamento_id FK, servico_id FK, preco_aplicado)  ← TABELA PIVÔ
```

**Relações:**
- `agendamentos` → `clientes` (N:1)
- `agendamentos` → `usuarios` (N:1)
- `agendamentos` ↔ `servicos` via `agendamento_servicos` **(N:N)**

### Implementação

Scripts DDL completos em `scripts/setup.sql`.

**Chaves Primárias:** todas as tabelas usam `SERIAL PRIMARY KEY`

**Chaves Estrangeiras:**
- `agendamentos.cliente_id` → `clientes.id`
- `agendamentos.usuario_id` → `usuarios.id`
- `agendamento_servicos.agendamento_id` → `agendamentos.id`
- `agendamento_servicos.servico_id` → `servicos.id`

**Constraints:**
- `usuarios.email` — UNIQUE
- `clientes.cpf` — UNIQUE
- `agendamentos.status` — CHECK IN ('pendente', 'confirmado', 'concluido', 'cancelado')

---

## 3. Modelagem e Normalização

### 1FN — Primeira Forma Normal

Todas as tabelas possuem:
- Chave primária definida (SERIAL PRIMARY KEY)
- Atributos atômicos (sem campos com múltiplos valores)
- Sem grupos de repetição

*Exemplo:* Um agendamento não armazena os serviços em uma coluna como "serviço1, serviço2". Em vez disso, usa a tabela pivô `agendamento_servicos`.

### 2FN — Segunda Forma Normal

Todas as tabelas têm chave primária simples (sem chave composta), portanto 2FN é satisfeita automaticamente. Nenhum atributo não-chave depende parcialmente da chave.

### 3FN — Terceira Forma Normal

Não existem dependências transitivas:
- `clientes` armazena apenas dados do cliente
- `servicos` armazena apenas dados do serviço
- `agendamentos` armazena apenas a transação, referenciando cliente e funcionário por FK

**Desnormalização intencional:** O campo `preco_aplicado` na tabela pivô `agendamento_servicos` armazena o preço no momento do agendamento. Isso viola 3FN em teoria (o preço poderia ser buscado em `servicos`), mas é uma desnormalização justificada: o preço de um serviço pode mudar ao longo do tempo, e o histórico financeiro precisa refletir o valor cobrado na data do serviço.

---

## 4. Performance

### Estratégia de Indexação

| Campo | Tabela | Tipo de Índice | Motivo |
|---|---|---|---|
| cpf | clientes | B-Tree | Busca frequente por CPF |
| nome | clientes | B-Tree | Ordenação e filtro por nome |
| data_hora | agendamentos | B-Tree | Filtros por período (consulta mais comum) |
| status | agendamentos | B-Tree | Filtros por status da agenda |
| cliente_id | agendamentos | B-Tree | Histórico do cliente |
| (cliente_id, data_hora) | agendamentos | B-Tree composto | Relatórios por cliente em período |

### Consultas Críticas

Consultas completas em `queries/consultas_avancadas.sql`. As 5 principais:

**1. Agenda do dia por funcionário (JOIN complexo + filtro por data)**
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
*Importância: consulta executada várias vezes por dia. Usa índice em `data_hora`.*

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
*Importância: busca direta por CPF. Usa índice em `clientes.cpf`.*

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
*Importância: relatório gerencial mensal. Usa índice em `status` e `data_hora`.*

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
*Importância: identifica serviços mais rentáveis para tomada de decisão.*

**5. Agendamentos por status no período (filtro por data)**
```sql
SELECT status, COUNT(*) AS quantidade
FROM agendamentos
WHERE data_hora BETWEEN '2026-01-01' AND '2026-12-31'
GROUP BY status
ORDER BY quantidade DESC;
```
*Importância: visão operacional do volume de agendamentos. Usa índice composto.*

---

## 5. Dados para Teste

Scripts com 100+ registros em `scripts/seed/seed.sql`.

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
