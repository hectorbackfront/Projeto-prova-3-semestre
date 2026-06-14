const { Usuario } = require('../models');

exports.listar = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: { exclude: ['senha'] },
    });
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.buscar = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      attributes: { exclude: ['senha'] },
    });
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const { nome, email, senha, role } = req.body;
    const usuario = await Usuario.create({ nome, email, senha, role });
    const { senha: _, ...dados } = usuario.toJSON();
    res.status(201).json(dados);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ erro: 'Email já cadastrado' });
    }
    res.status(500).json({ erro: err.message });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
    const { nome, email, role } = req.body;
    await usuario.update({ nome, email, role });
    const { senha: _, ...dados } = usuario.toJSON();
    res.json(dados);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.deletar = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
    await usuario.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
