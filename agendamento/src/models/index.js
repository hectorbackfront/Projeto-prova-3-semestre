const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Cliente = require('./Cliente');
const Servico = require('./Servico');
const Agendamento = require('./Agendamento');
const AgendamentoServico = require('./AgendamentoServico');

// ============================================================
// ASSOCIAÇÕES
// ============================================================

// Agendamento pertence a um Cliente
Agendamento.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Cliente.hasMany(Agendamento, { foreignKey: 'cliente_id', as: 'agendamentos' });

// Agendamento pertence a um Usuario (funcionario)
Agendamento.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'funcionario' });
Usuario.hasMany(Agendamento, { foreignKey: 'usuario_id', as: 'agendamentos' });

// N:N — Agendamento <-> Servico via tabela pivô
Agendamento.belongsToMany(Servico, {
  through: AgendamentoServico,
  foreignKey: 'agendamento_id',
  otherKey: 'servico_id',
  as: 'servicos',
});
Servico.belongsToMany(Agendamento, {
  through: AgendamentoServico,
  foreignKey: 'servico_id',
  otherKey: 'agendamento_id',
  as: 'agendamentos',
});

// Chaves estrangeiras na tabela pivô
AgendamentoServico.belongsTo(Agendamento, { foreignKey: 'agendamento_id' });
AgendamentoServico.belongsTo(Servico, { foreignKey: 'servico_id' });

module.exports = { sequelize, Usuario, Cliente, Servico, Agendamento, AgendamentoServico };
