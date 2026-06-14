const { Cliente } = require('../models');

exports.listar = async (req, res) => {
  try {
    const clientes = await Cliente.findAll({ order: [['nome', 'ASC']] });
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.buscar = async (req, res) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado' });
    res.json(cliente);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const { nome, telefone, cpf, email } = req.body;
    const cliente = await Cliente.create({ nome, telefone, cpf, email });
    res.status(201).json(cliente);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ erro: 'CPF já cadastrado' });
    }
    res.status(500).json({ erro: err.message });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado' });
    const { nome, telefone, cpf, email } = req.body;
    await cliente.update({ nome, telefone, cpf, email });
    res.json(cliente);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.deletar = async (req, res) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado' });
    await cliente.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
