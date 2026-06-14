require('dotenv').config();
const { sequelize } = require('./src/models');

const comando = process.argv[2];

async function migrate() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: false, alter: true });
    console.log('Migrations executadas com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('Erro na migration:', err);
    process.exit(1);
  }
}

async function migrateFresh() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    console.log('Banco recriado do zero!');
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
}

switch (comando) {
  case 'migrate':
    migrate();
    break;
  case 'migrate:fresh':
    migrateFresh();
    break;
  default:
    console.log('Comandos disponíveis:');
    console.log('  node command.js migrate       — Cria/atualiza tabelas');
    console.log('  node command.js migrate:fresh — Recria tudo do zero');
    process.exit(0);
}
