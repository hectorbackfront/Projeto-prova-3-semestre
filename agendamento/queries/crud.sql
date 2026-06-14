-- ============================================================
-- CRUD BÁSICO — operações padrão de cada entidade
-- ============================================================

-- USUARIOS
SELECT * FROM usuarios;
INSERT INTO usuarios (nome, email, senha, role) VALUES ('Novo User', 'novo@email.com', 'hash', 'funcionario');
UPDATE usuarios SET nome = 'Nome Atualizado' WHERE id = 1;
DELETE FROM usuarios WHERE id = 1;

-- CLIENTES
SELECT * FROM clientes ORDER BY nome;
INSERT INTO clientes (nome, telefone, cpf) VALUES ('Novo Cliente', '(11)99999-9999', '000.000.000-00');
UPDATE clientes SET telefone = '(11)88888-8888' WHERE id = 1;
DELETE FROM clientes WHERE id = 1;

-- SERVICOS
SELECT * FROM servicos WHERE ativo = true;
INSERT INTO servicos (nome, preco, duracao_min) VALUES ('Novo Serviço', 50.00, 45);
UPDATE servicos SET preco = 55.00 WHERE id = 1;
UPDATE servicos SET ativo = false WHERE id = 1; -- soft delete

-- AGENDAMENTOS
SELECT * FROM agendamentos WHERE status = 'agendado' ORDER BY data_hora;
INSERT INTO agendamentos (cliente_id, usuario_id, data_hora, valor_total) VALUES (1, 2, NOW() + INTERVAL '2 days', 60.00);
UPDATE agendamentos SET status = 'confirmado' WHERE id = 1;
UPDATE agendamentos SET status = 'cancelado' WHERE id = 1;

-- AGENDAMENTO_SERVICOS (tabela pivô)
SELECT * FROM agendamento_servicos WHERE agendamento_id = 1;
INSERT INTO agendamento_servicos (agendamento_id, servico_id, preco_aplicado) VALUES (1, 1, 60.00);
DELETE FROM agendamento_servicos WHERE agendamento_id = 1 AND servico_id = 1;
