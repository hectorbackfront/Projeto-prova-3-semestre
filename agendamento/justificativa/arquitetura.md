# Justificativa de Arquitetura

## Escolha Tecnológica

**Banco escolhido:** PostgreSQL 16  
**Tipo:** SQL (Relacional)

**Justificativa:**
O sistema de agendamentos possui dados altamente relacionais: um agendamento pertence a um cliente,
é atendido por um funcionário e contém múltiplos serviços. Esse modelo se encaixa naturalmente em
um banco relacional, onde as constraints de integridade referencial (FOREIGN KEY) garantem consistência
dos dados. O PostgreSQL foi escolhido por ser robusto, open-source, suportar transações ACID e ser
amplamente utilizado em produção.

---

## Normalização Aplicada

### 1FN — Primeira Forma Normal
Todas as tabelas possuem:
- Chave primária definida (SERIAL PRIMARY KEY)
- Atributos atômicos (sem campos com múltiplos valores)
- Sem grupos de repetição

*Exemplo:* Um agendamento não armazena os serviços em uma coluna como "serviço1, serviço2".
Em vez disso, usa a tabela pivô `agendamento_servicos`.

### 2FN — Segunda Forma Normal
- Todas as tabelas têm chave primária simples (sem chave composta), portanto 2FN é satisfeita automaticamente
- Nenhum atributo não-chave depende parcialmente da chave

### 3FN — Terceira Forma Normal
Não existem dependências transitivas:
- `clientes` armazena apenas dados do cliente
- `servicos` armazena apenas dados do serviço
- `agendamentos` armazena apenas a transação, referenciando cliente e funcionário por FK

**Desnormalização intencional:** O campo `preco_aplicado` na tabela pivô `agendamento_servicos`
armazena o preço no momento do agendamento. Isso viola 3FN em teoria (o preço poderia ser buscado
em `servicos`), mas é uma desnormalização justificada: o preço de um serviço pode mudar ao longo
do tempo, e o histórico financeiro precisa refletir o valor cobrado na data do serviço.

---

## Estratégia de Indexação

| Campo | Tabela | Tipo | Motivo |
|---|---|---|---|
| cpf | clientes | B-Tree | Busca frequente por CPF |
| nome | clientes | B-Tree | Ordenação e filtro por nome |
| data_hora | agendamentos | B-Tree | Filtros por período (consulta mais comum) |
| status | agendamentos | B-Tree | Filtros por status da agenda |
| cliente_id | agendamentos | B-Tree | Histórico do cliente |
| (cliente_id, data_hora) | agendamentos | B-Tree composto | Relatórios por cliente em período |

---

## Requisitos do Sistema

**Objetivo:** Sistema de agendamento para salão de beleza/barbearia

**Entidades principais:**
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

**Consultas mais frequentes:**
- Agenda do dia / semana por funcionário
- Histórico de cliente por CPF
- Relatório financeiro mensal
- Serviços mais realizados
