require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const logger = require('./middlewares/logger');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARES GLOBAIS
// ============================================================
app.use(express.json());
app.use(logger);

// ============================================================
// ROTAS
// ============================================================
app.use('/api', require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/servicos', require('./routes/servicos'));
app.use('/api/agendamentos', require('./routes/agendamentos'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// Documentação Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ============================================================
// INICIALIZAÇÃO
// ============================================================
async function iniciar() {
  try {
    await sequelize.authenticate();
    console.log('Banco de dados conectado.');

    // Sincroniza modelos (cria tabelas se não existirem)
    await sequelize.sync({ force: false });
    console.log('Modelos sincronizados.');

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`Swagger: http://localhost/api-docs`);
    });
  } catch (err) {
    console.error('Erro ao iniciar:', err);
    process.exit(1);
  }
}

iniciar();
