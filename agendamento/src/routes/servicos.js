const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/servicoController');
const auth = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Servicos
 *   description: Gerenciamento de serviços oferecidos
 */

/**
 * @swagger
 * /servicos:
 *   get:
 *     summary: Lista todos os serviços ativos
 *     tags: [Servicos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de serviços
 */
router.get('/', auth, ctrl.listar);

/**
 * @swagger
 * /servicos/{id}:
 *   get:
 *     summary: Busca serviço por ID
 *     tags: [Servicos]
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
 *         description: Serviço encontrado
 */
router.get('/:id', auth, ctrl.buscar);

/**
 * @swagger
 * /servicos:
 *   post:
 *     summary: Cadastra novo serviço
 *     tags: [Servicos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               descricao:
 *                 type: string
 *               preco:
 *                 type: number
 *               duracao_min:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Serviço criado
 */
router.post('/', auth, ctrl.criar);

/**
 * @swagger
 * /servicos/{id}:
 *   put:
 *     summary: Atualiza serviço
 *     tags: [Servicos]
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
 *     responses:
 *       200:
 *         description: Atualizado
 */
router.put('/:id', auth, ctrl.atualizar);

/**
 * @swagger
 * /servicos/{id}:
 *   delete:
 *     summary: Desativa serviço (soft delete)
 *     tags: [Servicos]
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
 *         description: Desativado
 */
router.delete('/:id', auth, ctrl.deletar);

module.exports = router;
