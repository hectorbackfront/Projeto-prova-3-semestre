const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/agendamentoController');
const auth = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Agendamentos
 *   description: Gerenciamento de agendamentos
 */

/**
 * @swagger
 * /agendamentos:
 *   get:
 *     summary: Lista todos os agendamentos
 *     tags: [Agendamentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de agendamentos com cliente e serviços
 */
router.get('/', auth, ctrl.listar);

/**
 * @swagger
 * /agendamentos/{id}:
 *   get:
 *     summary: Busca agendamento por ID
 *     tags: [Agendamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Agendamento encontrado
 *       404:
 *         description: Não encontrado
 */
router.get('/:id', auth, ctrl.buscar);

/**
 * @swagger
 * /agendamentos:
 *   post:
 *     summary: Cria novo agendamento
 *     tags: [Agendamentos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cliente_id:
 *                 type: integer
 *               usuario_id:
 *                 type: integer
 *               data_hora:
 *                 type: string
 *                 format: date-time
 *               observacao:
 *                 type: string
 *               servico_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Agendamento criado
 */
router.post('/', auth, ctrl.criar);

/**
 * @swagger
 * /agendamentos/{id}:
 *   put:
 *     summary: Atualiza agendamento
 *     tags: [Agendamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data_hora:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [agendado, confirmado, concluido, cancelado]
 *               observacao:
 *                 type: string
 *     responses:
 *       200:
 *         description: Atualizado
 */
router.put('/:id', auth, ctrl.atualizar);

/**
 * @swagger
 * /agendamentos/{id}:
 *   delete:
 *     summary: Cancela agendamento
 *     tags: [Agendamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Cancelado
 */
router.delete('/:id', auth, ctrl.deletar);

/**
 * @swagger
 * /agendamentos/{agendamento_id}/servicos/{servico_id}:
 *   post:
 *     summary: Adiciona serviço a um agendamento (tabela pivô N:N)
 *     tags: [Agendamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agendamento_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: servico_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Serviço adicionado
 */
router.post('/:agendamento_id/servicos/:servico_id', auth, ctrl.adicionarServico);

/**
 * @swagger
 * /agendamentos/{agendamento_id}/servicos/{servico_id}:
 *   delete:
 *     summary: Remove serviço de um agendamento (tabela pivô N:N)
 *     tags: [Agendamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agendamento_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: servico_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Removido
 */
router.delete('/:agendamento_id/servicos/:servico_id', auth, ctrl.removerServico);

module.exports = router;
