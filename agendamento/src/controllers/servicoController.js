const { Servico } = require('../models');

exports.listar = async (req, res) => {
  try {
    const servicos = await Servico.findAll({ where: { ativo: true }, order: [['nome', 'ASC']] });
    res.json(servicos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.buscar = async (req, res) => {
  try {
    const servico = await Servico.findByPk(req.params.id);
    if (!servico) return res.status(404).json({ erro: 'Serviço não encontrado' });
    res.json(servico);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const { nome, descricao, preco, duracao_min } = req.body;
    const servico = await Servico.create({ nome, descricao, preco, duracao_min });
    res.status(201).json(servico);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const servico = await Servico.findByPk(req.params.id);
    if (!servico) return res.status(404).json({ erro: 'Serviço não encontrado' });
    const { nome, descricao, preco, duracao_min, ativo } = req.body;
    await servico.update({ nome, descricao, preco, duracao_min, ativo });
    res.json(servico);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.deletar = async (req, res) => {
  try {
    const servico = await Servico.findByPk(req.params.id);
    if (!servico) return res.status(404).json({ erro: 'Serviço não encontrado' });
    // Soft delete — desativa ao invés de remover
    await servico.update({ ativo: false });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
