const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/usuarioController');
const auth = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Gerenciamento de usuários do sistema
 */

/**
 * @swagger
 * /usuarios:
 *   get:
 *     summary: Lista todos os usuários
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários
 */
router.get('/', auth, ctrl.listar);

/**
 * @swagger
 * /usuarios/{id}:
 *   get:
 *     summary: Busca usuário por ID
 *     tags: [Usuarios]
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
 *         description: Usuário encontrado
 *       404:
 *         description: Não encontrado
 */
router.get('/:id', auth, ctrl.buscar);

/**
 * @swagger
 * /usuarios:
 *   post:
 *     summary: Cria novo usuário
 *     tags: [Usuarios]
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
 *               email:
 *                 type: string
 *               senha:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, funcionario]
 *     responses:
 *       201:
 *         description: Usuário criado
 */
router.post('/', auth, ctrl.criar);

/**
 * @swagger
 * /usuarios/{id}:
 *   put:
 *     summary: Atualiza usuário
 *     tags: [Usuarios]
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
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Atualizado com sucesso
 */
router.put('/:id', auth, ctrl.atualizar);

/**
 * @swagger
 * /usuarios/{id}:
 *   delete:
 *     summary: Remove usuário
 *     tags: [Usuarios]
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
 *         description: Removido com sucesso
 */
router.delete('/:id', auth, ctrl.deletar);

module.exports = router;
