const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cliente = sequelize.define('Cliente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  telefone: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  cpf: {
    type: DataTypes.STRING(14),
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING(150),
    validate: { isEmail: true },
  },
}, {
  tableName: 'clientes',
  timestamps: true,
  indexes: [
    { fields: ['cpf'] },
    { fields: ['nome'] },
  ],
});

module.exports = Cliente;
