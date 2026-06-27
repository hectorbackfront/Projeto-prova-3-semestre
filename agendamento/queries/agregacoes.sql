-- ============================================================
-- AGREGACOES.SQL — Consultas de agregação e relatórios
-- Matéria: Banco de Dados
-- ============================================================

-- ============================================================
-- AGR 1: Faturamento total por mês
-- Agrupa agendamentos concluídos por mês e soma o valor total
-- ============================================================
SELECT
    DATE_TRUNC('month', a.data_hora)         AS mes,
    COUNT(*)                                  AS total_agendamentos,
    COUNT(*) FILTER (WHERE a.status = 'concluido') AS concluidos,
    SUM(a.valor_total) FILTER (WHERE a.status = 'concluido') AS faturamento_mensal
FROM agendamentos a
GROUP BY mes
ORDER BY mes DESC;

-- ============================================================
-- AGR 2: Receita e total de atendimentos por serviço
-- Identifica quais serviços geram mais receita
-- ============================================================
SELECT
    s.nome                        AS servico,
    s.preco                       AS preco_base,
    COUNT(ags.id)                 AS total_realizacoes,
    SUM(ags.preco_aplicado)       AS receita_total,
    ROUND(AVG(ags.preco_aplicado), 2) AS ticket_medio
FROM servicos s
LEFT JOIN agendamento_servicos ags ON ags.servico_id = s.id
LEFT JOIN agendamentos a ON a.id = ags.agendamento_id AND a.status = 'concluido'
GROUP BY s.id, s.nome, s.preco
ORDER BY receita_total DESC NULLS LAST;

-- ============================================================
-- AGR 3: Ranking de funcionários por desempenho
-- Total de atendimentos, faturamento e ticket médio por funcionário
-- ============================================================
SELECT
    u.nome                                                    AS funcionario,
    u.role,
    COUNT(a.id)                                               AS total_atendimentos,
    COUNT(a.id) FILTER (WHERE a.status = 'concluido')        AS concluidos,
    COUNT(a.id) FILTER (WHERE a.status = 'cancelado')        AS cancelados,
    SUM(a.valor_total) FILTER (WHERE a.status = 'concluido') AS faturamento_total,
    ROUND(AVG(a.valor_total) FILTER (WHERE a.status = 'concluido'), 2) AS ticket_medio
FROM usuarios u
LEFT JOIN agendamentos a ON a.usuario_id = u.id
GROUP BY u.id, u.nome, u.role
ORDER BY faturamento_total DESC NULLS LAST;

-- ============================================================
-- AGR 4: Distribuição de agendamentos por status
-- Visão geral do pipeline de atendimentos
-- ============================================================
SELECT
    status,
    COUNT(*)                              AS quantidade,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentual
FROM agendamentos
GROUP BY status
ORDER BY quantidade DESC;

-- ============================================================
-- AGR 5: Média de serviços por agendamento
-- Indica o comportamento de consumo dos clientes
-- ============================================================
SELECT
    ROUND(AVG(total_servicos), 2)  AS media_servicos_por_agendamento,
    MIN(total_servicos)            AS minimo,
    MAX(total_servicos)            AS maximo
FROM (
    SELECT agendamento_id, COUNT(*) AS total_servicos
    FROM agendamento_servicos
    GROUP BY agendamento_id
) sub;

-- ============================================================
-- AGR 6: Clientes com maior volume de agendamentos
-- Identifica clientes frequentes para ações de fidelização
-- ============================================================
SELECT
    c.nome                                                        AS cliente,
    c.telefone,
    COUNT(a.id)                                                   AS total_agendamentos,
    COUNT(a.id) FILTER (WHERE a.status = 'concluido')            AS concluidos,
    SUM(a.valor_total) FILTER (WHERE a.status = 'concluido')     AS total_gasto
FROM clientes c
LEFT JOIN agendamentos a ON a.cliente_id = c.id
GROUP BY c.id, c.nome, c.telefone
ORDER BY total_agendamentos DESC
LIMIT 10;
