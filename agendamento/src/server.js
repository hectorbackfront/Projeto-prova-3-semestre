require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const redis = require('./config/redis');

const PORT = process.env.PORT || 3000;

async function iniciar() {
  try {
    await redis.connect();

    await sequelize.authenticate();
    console.log('Banco de dados conectado.');

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
