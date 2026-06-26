-- ============================================================
-- SETUP.SQL — DDL completo do sistema de agendamentos
-- Matéria: Banco de Dados
-- ============================================================

-- Cria extensão para UUID (opcional, usando SERIAL aqui)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tipos ENUM alinhados com os modelos Sequelize
DO $$ BEGIN
  CREATE TYPE "enum_usuarios_role" AS ENUM('admin', 'funcionario');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "enum_agendamentos_status" AS ENUM('agendado', 'confirmado', 'concluido', 'cancelado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- TABELA: usuarios
-- Funcionários e admins do sistema
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    senha       VARCHAR(255) NOT NULL,
    role        "enum_usuarios_role" NOT NULL DEFAULT 'funcionario',
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: clientes
-- Clientes que realizam agendamentos
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL,
    telefone    VARCHAR(20) NOT NULL,
    cpf         VARCHAR(14) NOT NULL UNIQUE,
    email       VARCHAR(150),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: servicos
-- Serviços oferecidos pelo estabelecimento
-- ============================================================
CREATE TABLE IF NOT EXISTS servicos (
    id           SERIAL PRIMARY KEY,
    nome         VARCHAR(100) NOT NULL,
    descricao    TEXT,
    preco        DECIMAL(10,2) NOT NULL CHECK (preco > 0),
    duracao_min  INTEGER NOT NULL CHECK (duracao_min > 0),
    ativo        BOOLEAN DEFAULT TRUE,
    "createdAt"  TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt"  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: agendamentos
-- Agendamentos realizados pelos clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS agendamentos (
    id           SERIAL PRIMARY KEY,
    cliente_id   INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    data_hora    TIMESTAMPTZ NOT NULL,
    status       "enum_agendamentos_status" NOT NULL DEFAULT 'agendado',
    observacao   TEXT,
    valor_total  DECIMAL(10,2),
    "createdAt"  TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt"  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA PIVÔ: agendamento_servicos
-- Relação N:N entre agendamentos e serviços
-- ============================================================
CREATE TABLE IF NOT EXISTS agendamento_servicos (
    id              SERIAL PRIMARY KEY,
    agendamento_id  INTEGER NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
    servico_id      INTEGER NOT NULL REFERENCES servicos(id) ON DELETE RESTRICT,
    preco_aplicado  DECIMAL(10,2) NOT NULL
);

-- ============================================================
-- ÍNDICES — otimização de consultas frequentes
-- ============================================================

-- Índice no CPF para busca rápida de clientes
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(cpf);

-- Índice no nome para ordenação/busca
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);

-- Índice na data_hora para filtros por período
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data_hora);

-- Índice no status para filtros por status
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);

-- Índice no cliente_id para buscar agendamentos por cliente
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON agendamentos(cliente_id);

-- Índice composto para relatórios (cliente + período)
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente_data ON agendamentos(cliente_id, data_hora);
