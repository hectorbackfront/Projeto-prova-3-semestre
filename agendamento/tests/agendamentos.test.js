process.env.JWT_SECRET = 'test-secret';

const mockRedisSet = jest.fn().mockResolvedValue('OK');
const mockRedisDel = jest.fn().mockResolvedValue(1);

jest.mock('../src/config/redis', () => ({
  connect: jest.fn().mockResolvedValue(true),
  get: jest.fn().mockResolvedValue(null),
  set: mockRedisSet,
  del: mockRedisDel,
  on: jest.fn(),
}));

const mockAgendamentoInstance = {
  id: 1,
  cliente_id: 1,
  usuario_id: 1,
  data_hora: '2026-07-01T10:00:00.000Z',
  status: 'agendado',
  valor_total: 50.0,
  update: jest.fn(),
};

const mockServico = { id: 1, nome: 'Corte', preco: '50.00' };

const mockAgendamentoModel = {
  findAll: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
};

const mockServicoModel = {
  findAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
};

const mockAgendamentoServicoModel = {
  findOne: jest.fn(),
  create: jest.fn(),
};

jest.mock('../src/models', () => ({
  sequelize: { authenticate: jest.fn(), sync: jest.fn() },
  Usuario: { findOne: jest.fn(), findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Cliente: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Servico: mockServicoModel,
  Agendamento: mockAgendamentoModel,
  AgendamentoServico: mockAgendamentoServicoModel,
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const token = jwt.sign(
  { id: 1, email: 'admin@test.com', role: 'admin', jti: 'jti-agendamentos' },
  'test-secret',
  { expiresIn: '1h' },
);

const auth = { Authorization: `Bearer ${token}` };

beforeEach(() => jest.clearAllMocks());

describe('GET /api/agendamentos', () => {
  it('lista todos os agendamentos', async () => {
    mockAgendamentoModel.findAll.mockResolvedValue([mockAgendamentoInstance]);

    const res = await request(app).get('/api/agendamentos').set(auth);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/agendamentos');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/agendamentos/:id', () => {
  it('retorna agendamento pelo id', async () => {
    mockAgendamentoModel.findByPk.mockResolvedValue(mockAgendamentoInstance);

    const res = await request(app).get('/api/agendamentos/1').set(auth);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('agendado');
  });

  it('retorna 404 para id inexistente', async () => {
    mockAgendamentoModel.findByPk.mockResolvedValue(null);

    const res = await request(app).get('/api/agendamentos/999').set(auth);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/agendamentos', () => {
  it('cria agendamento e adquire lock distribuído no Redis', async () => {
    mockRedisSet.mockResolvedValue('OK'); // lock adquirido
    mockAgendamentoModel.findOne.mockResolvedValue(null); // sem conflito
    mockServicoModel.findAll.mockResolvedValue([mockServico]);
    mockAgendamentoModel.create.mockResolvedValue({ ...mockAgendamentoInstance });
    mockAgendamentoServicoModel.create.mockResolvedValue({});
    mockAgendamentoModel.findByPk.mockResolvedValue(mockAgendamentoInstance);

    const res = await request(app)
      .post('/api/agendamentos')
      .set(auth)
      .send({
        cliente_id: 1,
        usuario_id: 1,
        data_hora: '2026-07-01T10:00:00.000Z',
        servico_ids: [1],
      });

    expect(res.status).toBe(201);
    expect(mockRedisSet).toHaveBeenCalledWith(
      expect.stringContaining('lock:agendamento:'),
      '1',
      'NX',
      'EX',
      10,
    );
    expect(mockRedisDel).toHaveBeenCalled(); // lock liberado
  });

  it('retorna 400 sem servicos', async () => {
    const res = await request(app)
      .post('/api/agendamentos')
      .set(auth)
      .send({ cliente_id: 1, usuario_id: 1, data_hora: '2026-07-01T10:00:00.000Z', servico_ids: [] });

    expect(res.status).toBe(400);
  });

  it('retorna 409 quando lock não é adquirido (horário em disputa)', async () => {
    mockRedisSet.mockResolvedValue(null); // lock ocupado

    const res = await request(app)
      .post('/api/agendamentos')
      .set(auth)
      .send({ cliente_id: 1, usuario_id: 1, data_hora: '2026-07-01T10:00:00.000Z', servico_ids: [1] });

    expect(res.status).toBe(409);
  });

  it('retorna 409 quando funcionário já tem agendamento no horário', async () => {
    mockRedisSet.mockResolvedValue('OK');
    mockAgendamentoModel.findOne.mockResolvedValue(mockAgendamentoInstance); // conflito

    const res = await request(app)
      .post('/api/agendamentos')
      .set(auth)
      .send({ cliente_id: 1, usuario_id: 1, data_hora: '2026-07-01T10:00:00.000Z', servico_ids: [1] });

    expect(res.status).toBe(409);
    expect(mockRedisDel).toHaveBeenCalled(); // lock liberado mesmo com conflito
  });
});

describe('PUT /api/agendamentos/:id', () => {
  it('atualiza status do agendamento', async () => {
    mockAgendamentoInstance.update.mockResolvedValue({ ...mockAgendamentoInstance, status: 'confirmado' });
    mockAgendamentoModel.findByPk.mockResolvedValue(mockAgendamentoInstance);

    const res = await request(app)
      .put('/api/agendamentos/1')
      .set(auth)
      .send({ status: 'confirmado' });

    expect(res.status).toBe(200);
    expect(mockAgendamentoInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmado' }),
    );
  });

  it('retorna 404 para agendamento inexistente', async () => {
    mockAgendamentoModel.findByPk.mockResolvedValue(null);

    const res = await request(app).put('/api/agendamentos/999').set(auth).send({ status: 'cancelado' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/agendamentos/:id', () => {
  it('cancela agendamento (status → cancelado) e retorna 204', async () => {
    mockAgendamentoInstance.update.mockResolvedValue(true);
    mockAgendamentoModel.findByPk.mockResolvedValue(mockAgendamentoInstance);

    const res = await request(app).delete('/api/agendamentos/1').set(auth);

    expect(res.status).toBe(204);
    expect(mockAgendamentoInstance.update).toHaveBeenCalledWith({ status: 'cancelado' });
  });
});
