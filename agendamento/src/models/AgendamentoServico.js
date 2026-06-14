const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Tabela pivô — relação N:N entre Agendamento e Servico
const AgendamentoServico = sequelize.define('AgendamentoServico', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  agendamento_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  servico_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  preco_aplicado: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Preço no momento do agendamento (pode mudar depois)',
  },
}, {
  tableName: 'agendamento_servicos',
  timestamps: false,
});

module.exports = AgendamentoServico;
