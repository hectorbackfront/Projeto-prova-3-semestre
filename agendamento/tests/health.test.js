process.env.JWT_SECRET = 'test-secret';

jest.mock('../src/config/redis', () => ({
  connect: jest.fn().mockResolvedValue(true),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  on: jest.fn(),
}));

jest.mock('../src/models', () => ({
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(true),
    sync: jest.fn().mockResolvedValue(true),
  },
  Usuario: { findOne: jest.fn(), findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Cliente: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Servico: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Agendamento: { findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  AgendamentoServico: { findOne: jest.fn(), create: jest.fn() },
}));

const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  it('retorna status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
