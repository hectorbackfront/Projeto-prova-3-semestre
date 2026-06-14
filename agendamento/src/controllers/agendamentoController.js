const { Agendamento, Cliente, Usuario, Servico, AgendamentoServico } = require('../models');

exports.listar = async (req, res) => {
  try {
    const agendamentos = await Agendamento.findAll({
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'nome', 'telefone'] },
        { model: Usuario, as: 'funcionario', attributes: ['id', 'nome'] },
        { model: Servico, as: 'servicos', attributes: ['id', 'nome', 'preco'], through: { attributes: ['preco_aplicado'] } },
      ],
      order: [['data_hora', 'DESC']],
    });
    res.json(agendamentos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.buscar = async (req, res) => {
  try {
    const agendamento = await Agendamento.findByPk(req.params.id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Usuario, as: 'funcionario', attributes: ['id', 'nome'] },
        { model: Servico, as: 'servicos', through: { attributes: ['preco_aplicado'] } },
      ],
    });
    if (!agendamento) return res.status(404).json({ erro: 'Agendamento não encontrado' });
    res.json(agendamento);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const { cliente_id, usuario_id, data_hora, observacao, servico_ids } = req.body;

    if (!servico_ids || servico_ids.length === 0) {
      return res.status(400).json({ erro: 'Informe ao menos um serviço' });
    }

    const servicos = await Servico.findAll({ where: { id: servico_ids } });
    const valor_total = servicos.reduce((acc, s) => acc + parseFloat(s.preco), 0);

    const agendamento = await Agendamento.create({
      cliente_id, usuario_id, data_hora, observacao, valor_total,
    });

    // Insere na tabela pivô
    await Promise.all(servicos.map(s =>
      AgendamentoServico.create({
        agendamento_id: agendamento.id,
        servico_id: s.id,
        preco_aplicado: s.preco,
      })
    ));

    const resultado = await Agendamento.findByPk(agendamento.id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Servico, as: 'servicos', through: { attributes: ['preco_aplicado'] } },
      ],
    });

    res.status(201).json(resultado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const agendamento = await Agendamento.findByPk(req.params.id);
    if (!agendamento) return res.status(404).json({ erro: 'Agendamento não encontrado' });
    const { data_hora, status, observacao } = req.body;
    await agendamento.update({ data_hora, status, observacao });
    res.json(agendamento);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.deletar = async (req, res) => {
  try {
    const agendamento = await Agendamento.findByPk(req.params.id);
    if (!agendamento) return res.status(404).json({ erro: 'Agendamento não encontrado' });
    await agendamento.update({ status: 'cancelado' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

// Rota extra: adicionar serviço a agendamento (relação N:N)
exports.adicionarServico = async (req, res) => {
  try {
    const { agendamento_id, servico_id } = req.params;
    const servico = await Servico.findByPk(servico_id);
    if (!servico) return res.status(404).json({ erro: 'Serviço não encontrado' });

    const pivô = await AgendamentoServico.create({
      agendamento_id,
      servico_id,
      preco_aplicado: servico.preco,
    });
    res.status(201).json(pivô);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

exports.removerServico = async (req, res) => {
  try {
    const { agendamento_id, servico_id } = req.params;
    const pivô = await AgendamentoServico.findOne({
      where: { agendamento_id, servico_id },
    });
    if (!pivô) return res.status(404).json({ erro: 'Relação não encontrada' });
    await pivô.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
