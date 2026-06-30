process.env.JWT_SECRET = 'test-secret';

jest.mock('../src/config/redis', () => ({
  connect: jest.fn().mockResolvedValue(true),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  on: jest.fn(),
}));

const mockClienteInstance = {
  id: 1,
  nome: 'Maria Silva',
  telefone: '11999999999',
  cpf: '123.456.789-00',
  email: 'maria@email.com',
  update: jest.fn(),
  destroy: jest.fn(),
};

const mockClienteModel = {
  findAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
};

jest.mock('../src/models', () => ({
  sequelize: { authenticate: jest.fn(), sync: jest.fn() },
  Usuario: { findOne: jest.fn(), findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Cliente: mockClienteModel,
  Servico: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Agendamento: { findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  AgendamentoServico: { findOne: jest.fn(), create: jest.fn() },
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const token = jwt.sign(
  { id: 1, email: 'admin@test.com', role: 'admin', jti: 'jti-clientes' },
  'test-secret',
  { expiresIn: '1h' },
);

const auth = { Authorization: `Bearer ${token}` };

beforeEach(() => jest.clearAllMocks());

describe('GET /api/clientes', () => {
  it('lista todos os clientes', async () => {
    mockClienteModel.findAll.mockResolvedValue([mockClienteInstance]);

    const res = await request(app).get('/api/clientes').set(auth);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].nome).toBe('Maria Silva');
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/clientes');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/clientes/:id', () => {
  it('retorna cliente pelo id', async () => {
    mockClienteModel.findByPk.mockResolvedValue(mockClienteInstance);

    const res = await request(app).get('/api/clientes/1').set(auth);

    expect(res.status).toBe(200);
    expect(res.body.cpf).toBe('123.456.789-00');
  });

  it('retorna 404 para id inexistente', async () => {
    mockClienteModel.findByPk.mockResolvedValue(null);

    const res = await request(app).get('/api/clientes/999').set(auth);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/clientes', () => {
  it('cria novo cliente e retorna 201', async () => {
    mockClienteModel.create.mockResolvedValue(mockClienteInstance);

    const res = await request(app)
      .post('/api/clientes')
      .set(auth)
      .send({ nome: 'Maria Silva', telefone: '11999999999', cpf: '123.456.789-00', email: 'maria@email.com' });

    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Maria Silva');
  });

  it('retorna 409 para CPF duplicado', async () => {
    const err = new Error('CPF duplicado');
    err.name = 'SequelizeUniqueConstraintError';
    mockClienteModel.create.mockRejectedValue(err);

    const res = await request(app)
      .post('/api/clientes')
      .set(auth)
      .send({ nome: 'Outro', cpf: '123.456.789-00' });

    expect(res.status).toBe(409);
    expect(res.body.erro).toMatch(/CPF/i);
  });
});

describe('PUT /api/clientes/:id', () => {
  it('atualiza cliente existente', async () => {
    const clienteAtualizado = { ...mockClienteInstance, nome: 'Maria Souza' };
    mockClienteInstance.update.mockResolvedValue(clienteAtualizado);
    mockClienteModel.findByPk.mockResolvedValue(mockClienteInstance);

    const res = await request(app)
      .put('/api/clientes/1')
      .set(auth)
      .send({ nome: 'Maria Souza' });

    expect(res.status).toBe(200);
    expect(mockClienteInstance.update).toHaveBeenCalled();
  });

  it('retorna 404 para cliente inexistente', async () => {
    mockClienteModel.findByPk.mockResolvedValue(null);

    const res = await request(app).put('/api/clientes/999').set(auth).send({ nome: 'X' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/clientes/:id', () => {
  it('remove cliente e retorna 204', async () => {
    mockClienteInstance.destroy.mockResolvedValue(true);
    mockClienteModel.findByPk.mockResolvedValue(mockClienteInstance);

    const res = await request(app).delete('/api/clientes/1').set(auth);

    expect(res.status).toBe(204);
    expect(mockClienteInstance.destroy).toHaveBeenCalled();
  });

  it('retorna 404 para cliente inexistente', async () => {
    mockClienteModel.findByPk.mockResolvedValue(null);

    const res = await request(app).delete('/api/clientes/999').set(auth);

    expect(res.status).toBe(404);
  });
});
