-- ============================================================
-- CONSULTAS AVANÇADAS — 5 consultas críticas do sistema
-- Matéria: Banco de Dados
-- ============================================================

-- ============================================================
-- CONSULTA 1: Relatório de agendamentos por período
-- Por que é importante: filtros de agenda por semana/mês
-- Usa: índice idx_agendamentos_data, JOIN com cliente
-- ============================================================
SELECT
    a.id,
    a.data_hora,
    a.status,
    a.valor_total,
    c.nome AS cliente,
    c.telefone,
    u.nome AS funcionario
FROM agendamentos a
INNER JOIN clientes c ON c.id = a.cliente_id
INNER JOIN usuarios u ON u.id = a.usuario_id
WHERE a.data_hora BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY a.data_hora ASC;

-- ============================================================
-- CONSULTA 2: Faturamento por mês (agregação)
-- Por que é importante: relatório financeiro mensal
-- Usa: GROUP BY, SUM, DATE_TRUNC
-- ============================================================
SELECT
    DATE_TRUNC('month', a.data_hora) AS mes,
    COUNT(*) AS total_agendamentos,
    COUNT(*) FILTER (WHERE a.status = 'concluido') AS concluidos,
    SUM(a.valor_total) FILTER (WHERE a.status = 'concluido') AS faturamento
FROM agendamentos a
GROUP BY mes
ORDER BY mes DESC;

-- ============================================================
-- CONSULTA 3: Serviços mais populares
-- Por que é importante: gestão de serviços e marketing
-- Usa: JOIN N:N (agendamento_servicos), GROUP BY, ORDER BY
-- ============================================================
SELECT
    s.nome AS servico,
    s.preco,
    COUNT(ags.id) AS total_realizacoes,
    SUM(ags.preco_aplicado) AS receita_total
FROM servicos s
LEFT JOIN agendamento_servicos ags ON ags.servico_id = s.id
LEFT JOIN agendamentos a ON a.id = ags.agendamento_id AND a.status = 'concluido'
GROUP BY s.id, s.nome, s.preco
ORDER BY total_realizacoes DESC;

-- ============================================================
-- CONSULTA 4: Histórico completo de um cliente por CPF
-- Por que é importante: busca de retorno, índice no CPF
-- Usa: idx_clientes_cpf, JOINs múltiplos, subquery
-- ============================================================
SELECT
    c.nome AS cliente,
    c.cpf,
    c.telefone,
    a.data_hora,
    a.status,
    a.valor_total,
    STRING_AGG(s.nome, ', ') AS servicos_realizados
FROM clientes c
INNER JOIN agendamentos a ON a.cliente_id = c.id
INNER JOIN agendamento_servicos ags ON ags.agendamento_id = a.id
INNER JOIN servicos s ON s.id = ags.servico_id
WHERE c.cpf = '111.111.111-01'  -- substituir pelo CPF desejado
GROUP BY c.id, c.nome, c.cpf, c.telefone, a.id, a.data_hora, a.status, a.valor_total
ORDER BY a.data_hora DESC;

-- ============================================================
-- CONSULTA 5: Ranking de funcionários por atendimentos
-- Por que é importante: gestão de desempenho da equipe
-- Usa: GROUP BY, COUNT, AVG, FILTER
-- ============================================================
SELECT
    u.nome AS funcionario,
    u.role,
    COUNT(a.id) AS total_atendimentos,
    COUNT(a.id) FILTER (WHERE a.status = 'concluido') AS concluidos,
    COUNT(a.id) FILTER (WHERE a.status = 'cancelado') AS cancelados,
    ROUND(AVG(a.valor_total) FILTER (WHERE a.status = 'concluido'), 2) AS ticket_medio,
    SUM(a.valor_total) FILTER (WHERE a.status = 'concluido') AS faturamento_total
FROM usuarios u
LEFT JOIN agendamentos a ON a.usuario_id = u.id
GROUP BY u.id, u.nome, u.role
ORDER BY faturamento_total DESC NULLS LAST;
