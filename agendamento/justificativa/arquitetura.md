# Justificativa de Arquitetura — Banco de Dados

## 1. Tipo de Banco Escolhido

**SQL — Banco de dados relacional**

## 2. Provedor Utilizado

**PostgreSQL 17** (imagem Docker `postgres:17-alpine`)

## 3. Justificativa Técnica

### Por que SQL e não NoSQL?

O sistema de agendamentos possui dados com **estrutura bem definida e estável**: clientes, serviços, funcionários e agendamentos. Os relacionamentos entre essas entidades são fixos e previsíveis:

- Um agendamento **sempre** pertence a um cliente e a um funcionário
- Um agendamento **sempre** tem pelo menos um serviço vinculado (N:N)
- O preço de um serviço pode mudar, mas o histórico precisa ser preservado (`preco_aplicado`)

Essas características indicam um modelo relacional: dados estruturados, relacionamentos bem definidos e necessidade de consistência transacional (ACID).

NoSQL seria indicado para cenários como catálogos de produtos com atributos variáveis, dados sem esquema fixo ou volumes massivos com necessidade de escala horizontal — nenhum desses casos se aplica aqui.

### Por que PostgreSQL?

| Critério | Decisão |
|---|---|
| **ACID completo** | Transações garantem que um agendamento nunca é criado sem seus serviços vinculados |
| **Tipos nativos avançados** | `TIMESTAMPTZ` para datas com fuso horário, `DECIMAL(10,2)` para valores monetários sem arredondamento de ponto flutuante, `ENUM` para status e roles |
| **Índices B-Tree** | Filtros por data (`data_hora`), CPF e status são consultas frequentes — indexação nativa eficiente |
| **Constraints declarativas** | `CHECK (preco > 0)`, `UNIQUE (email)`, `ON DELETE RESTRICT/CASCADE` garantem integridade sem lógica extra na aplicação |
| **Ecossistema maduro** | Driver `pg` para Node.js, suporte nativo no Sequelize ORM, imagem oficial Docker estável |
| **Open source e gratuito** | Sem custo de licença para ambiente acadêmico e de produção |

### Por que não MySQL ou SQL Server?

- **MySQL**: não suporta `TIMESTAMPTZ` (sem fuso horário nativo), `ENUM` com comportamento diferente, menos robusto em transações complexas
- **SQL Server**: proprietário (custo de licença), não disponível como imagem Docker leve para desenvolvimento

### Por que não MongoDB?

O sistema não tem documentos variáveis — todos os agendamentos têm os mesmos campos obrigatórios. Usar MongoDB exigiria validação de esquema manual que o PostgreSQL faz nativamente via constraints. Além disso, a relação N:N entre agendamentos e serviços é naturalmente expressa como tabela pivô no modelo relacional.

## 4. Requisitos do Sistema

| Requisito | Detalhe |
|---|---|
| **Objetivo** | Gerenciar agendamentos de um salão de beleza: clientes, serviços, funcionários e histórico de atendimentos |
| **Entidades principais** | usuarios, clientes, servicos, agendamentos, agendamento_servicos (pivô) |
| **Volume estimado** | ~500 agendamentos/mês, ~200 clientes ativos, ~15 serviços, ~10 funcionários |
| **Usuários simultâneos** | Até 20 (sistema interno de salão, não público) |
| **Consultas críticas** | Agenda do dia/semana, histórico por cliente (CPF), faturamento mensal, ranking de serviços |

## 5. Estratégia de Escalabilidade

Para o volume atual, uma instância única do PostgreSQL em container Docker é suficiente. Se o volume crescer:

- **Read replicas**: PostgreSQL suporta replicação nativa para distribuir leitura
- **Connection pooling**: PgBouncer pode ser adicionado ao Docker Compose
- **Particionamento**: A tabela `agendamentos` pode ser particionada por `data_hora` (RANGE partitioning) para manter performance em volumes maiores
