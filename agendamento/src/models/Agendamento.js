const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Agendamento = sequelize.define('Agendamento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  cliente_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  data_hora: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('agendado', 'confirmado', 'concluido', 'cancelado'),
    defaultValue: 'agendado',
  },
  observacao: {
    type: DataTypes.TEXT,
  },
  valor_total: {
    type: DataTypes.DECIMAL(10, 2),
  },
}, {
  tableName: 'agendamentos',
  timestamps: true,
  indexes: [
    { fields: ['data_hora'] },
    { fields: ['status'] },
    { fields: ['cliente_id'] },
  ],
});

module.exports = Agendamento;
