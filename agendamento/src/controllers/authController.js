const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { Usuario } = require('../models');
const redis = require('../config/redis');

exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    const usuario = await Usuario.findOne({ where: { email } });

    if (!usuario || !(await usuario.verificarSenha(senha))) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const jti = randomUUID();
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, role: usuario.role, jti },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' },
    );

    return res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role },
    });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno', detalhe: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const { jti, exp } = req.usuario;
    const ttl = exp - Math.floor(Date.now() / 1000);

    if (ttl > 0) {
      await redis.set(`blacklist:${jti}`, '1', 'EX', ttl);
    }

    return res.json({ mensagem: 'Logout realizado com sucesso.' });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno', detalhe: err.message });
  }
};
