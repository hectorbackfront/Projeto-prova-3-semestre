# Dicionário de Dados — Sistema de Agendamentos

## Tabela: `usuarios`

| Coluna | Tipo | Nulo | Padrão | Constraint | Descrição |
|---|---|---|---|---|---|
| id | SERIAL | NÃO | auto | PK | Identificador único do usuário |
| nome | VARCHAR(100) | NÃO | — | NOT NULL | Nome completo do funcionário/admin |
| email | VARCHAR(150) | NÃO | — | NOT NULL, UNIQUE | E-mail de login (único no sistema) |
| senha | VARCHAR(255) | NÃO | — | NOT NULL | Hash bcrypt da senha |
| role | ENUM | NÃO | 'funcionario' | NOT NULL | Papel: `admin` ou `funcionario` |
| createdAt | TIMESTAMPTZ | NÃO | NOW() | — | Data de criação do registro |
| updatedAt | TIMESTAMPTZ | NÃO | NOW() | — | Data da última atualização |

---

## Tabela: `clientes`

| Coluna | Tipo | Nulo | Padrão | Constraint | Descrição |
|---|---|---|---|---|---|
| id | SERIAL | NÃO | auto | PK | Identificador único do cliente |
| nome | VARCHAR(100) | NÃO | — | NOT NULL | Nome completo do cliente |
| telefone | VARCHAR(20) | NÃO | — | NOT NULL | Telefone para contato |
| cpf | VARCHAR(14) | NÃO | — | NOT NULL, UNIQUE | CPF formatado (xxx.xxx.xxx-xx) |
| email | VARCHAR(150) | SIM | NULL | — | E-mail do cliente (opcional) |
| createdAt | TIMESTAMPTZ | NÃO | NOW() | — | Data de criação do registro |
| updatedAt | TIMESTAMPTZ | NÃO | NOW() | — | Data da última atualização |

**Índices:** `idx_clientes_cpf` (B-Tree), `idx_clientes_nome` (B-Tree)

---

## Tabela: `servicos`

| Coluna | Tipo | Nulo | Padrão | Constraint | Descrição |
|---|---|---|---|---|---|
| id | SERIAL | NÃO | auto | PK | Identificador único do serviço |
| nome | VARCHAR(100) | NÃO | — | NOT NULL | Nome do serviço (ex: Corte Feminino) |
| descricao | TEXT | SIM | NULL | — | Descrição detalhada do serviço |
| preco | DECIMAL(10,2) | NÃO | — | NOT NULL, CHECK > 0 | Preço base do serviço |
| duracao_min | INTEGER | NÃO | — | NOT NULL, CHECK > 0 | Duração em minutos |
| ativo | BOOLEAN | NÃO | TRUE | — | Se o serviço está disponível |
| createdAt | TIMESTAMPTZ | NÃO | NOW() | — | Data de criação do registro |
| updatedAt | TIMESTAMPTZ | NÃO | NOW() | — | Data da última atualização |

---

## Tabela: `agendamentos`

| Coluna | Tipo | Nulo | Padrão | Constraint | Descrição |
|---|---|---|---|---|---|
| id | SERIAL | NÃO | auto | PK | Identificador único do agendamento |
| cliente_id | INTEGER | NÃO | — | FK → clientes.id, ON DELETE RESTRICT | Cliente que fez o agendamento |
| usuario_id | INTEGER | NÃO | — | FK → usuarios.id, ON DELETE RESTRICT | Funcionário responsável |
| data_hora | TIMESTAMPTZ | NÃO | — | NOT NULL | Data e hora do atendimento |
| status | ENUM | NÃO | 'agendado' | NOT NULL | Estado: `agendado`, `confirmado`, `concluido`, `cancelado` |
| observacao | TEXT | SIM | NULL | — | Observações adicionais |
| valor_total | DECIMAL(10,2) | SIM | NULL | — | Valor total calculado dos serviços |
| createdAt | TIMESTAMPTZ | NÃO | NOW() | — | Data de criação do registro |
| updatedAt | TIMESTAMPTZ | NÃO | NOW() | — | Data da última atualização |

**Índices:** `idx_agendamentos_data` (B-Tree), `idx_agendamentos_status` (B-Tree), `idx_agendamentos_cliente` (B-Tree), `idx_agendamentos_cliente_data` (B-Tree composto)

---

## Tabela: `agendamento_servicos` *(tabela pivô)*

| Coluna | Tipo | Nulo | Padrão | Constraint | Descrição |
|---|---|---|---|---|---|
| id | SERIAL | NÃO | auto | PK | Identificador único do vínculo |
| agendamento_id | INTEGER | NÃO | — | FK → agendamentos.id, ON DELETE CASCADE | Agendamento vinculado |
| servico_id | INTEGER | NÃO | — | FK → servicos.id, ON DELETE RESTRICT | Serviço realizado |
| preco_aplicado | DECIMAL(10,2) | NÃO | — | NOT NULL | Preço real cobrado no momento do agendamento |

> **Nota:** `ON DELETE CASCADE` em `agendamento_id` garante que ao excluir um agendamento, todos os seus vínculos de serviços são removidos automaticamente. `preco_aplicado` registra o preço histórico, independente de alterações futuras no cadastro do serviço.

---

## Resumo dos Índices

| Índice | Tabela | Campo(s) | Tipo | Motivo |
|---|---|---|---|---|
| idx_clientes_cpf | clientes | cpf | B-Tree | Busca rápida de cliente por CPF |
| idx_clientes_nome | clientes | nome | B-Tree | Ordenação e busca por nome |
| idx_agendamentos_data | agendamentos | data_hora | B-Tree | Filtros por período (semana/mês) |
| idx_agendamentos_status | agendamentos | status | B-Tree | Filtros por estado do agendamento |
| idx_agendamentos_cliente | agendamentos | cliente_id | B-Tree | Histórico de agendamentos por cliente |
| idx_agendamentos_cliente_data | agendamentos | cliente_id, data_hora | B-Tree composto | Relatórios por cliente e período |
