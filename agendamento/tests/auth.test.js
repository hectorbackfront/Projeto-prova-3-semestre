process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

const mockRedisGet = jest.fn().mockResolvedValue(null);
const mockRedisSet = jest.fn().mockResolvedValue('OK');

jest.mock('../src/config/redis', () => ({
  connect: jest.fn().mockResolvedValue(true),
  get: mockRedisGet,
  set: mockRedisSet,
  del: jest.fn().mockResolvedValue(1),
  on: jest.fn(),
}));

const mockUsuarioBD = {
  id: 1,
  nome: 'Admin Teste',
  email: 'admin@test.com',
  role: 'admin',
  verificarSenha: jest.fn(),
};

const mockUsuarioModel = { findOne: jest.fn() };

jest.mock('../src/models', () => ({
  sequelize: { authenticate: jest.fn(), sync: jest.fn() },
  Usuario: mockUsuarioModel,
  Cliente: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Servico: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Agendamento: { findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  AgendamentoServico: { findOne: jest.fn(), create: jest.fn() },
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

beforeEach(() => {
  jest.clearAllMocks();
  mockRedisGet.mockResolvedValue(null);
  mockRedisSet.mockResolvedValue('OK');
});

describe('POST /api/login', () => {
  it('retorna token JWT com credenciais válidas', async () => {
    mockUsuarioBD.verificarSenha.mockResolvedValue(true);
    mockUsuarioModel.findOne.mockResolvedValue(mockUsuarioBD);

    const res = await request(app)
      .post('/api/login')
      .send({ email: 'admin@test.com', senha: '123456' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.usuario.email).toBe('admin@test.com');
  });

  it('retorna 401 com senha incorreta', async () => {
    mockUsuarioBD.verificarSenha.mockResolvedValue(false);
    mockUsuarioModel.findOne.mockResolvedValue(mockUsuarioBD);

    const res = await request(app)
      .post('/api/login')
      .send({ email: 'admin@test.com', senha: 'senha-errada' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('erro');
  });

  it('retorna 401 para email inexistente', async () => {
    mockUsuarioModel.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/login')
      .send({ email: 'nao@existe.com', senha: '123456' });

    expect(res.status).toBe(401);
  });

  it('retorna 400 sem email ou senha', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'admin@test.com' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/logout', () => {
  const gerarToken = (extra = {}) =>
    jwt.sign(
      { id: 1, email: 'admin@test.com', role: 'admin', jti: 'jti-test-123', ...extra },
      'test-secret',
      { expiresIn: '1h' },
    );

  it('realiza logout e adiciona token na blacklist do Redis', async () => {
    const token = gerarToken();
    mockRedisGet.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('mensagem');
    expect(mockRedisSet).toHaveBeenCalledWith(
      expect.stringContaining('blacklist:'),
      '1',
      'EX',
      expect.any(Number),
    );
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/logout');
    expect(res.status).toBe(401);
  });

  it('retorna 401 com token revogado (blacklist)', async () => {
    const token = gerarToken({ jti: 'jti-revogado' });
    mockRedisGet.mockResolvedValue('1');

    const res = await request(app)
      .post('/api/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.erro).toMatch(/revogado/i);
  });

  it('retorna 401 com token inválido', async () => {
    const res = await request(app)
      .post('/api/logout')
      .set('Authorization', 'Bearer token-invalido-xyz');

    expect(res.status).toBe(401);
  });
});

describe('Middleware de autenticação', () => {
  it('bloqueia rota protegida sem Authorization header', async () => {
    const res = await request(app).get('/api/clientes');
    expect(res.status).toBe(401);
    expect(res.body.erro).toMatch(/token/i);
  });

  it('bloqueia rota protegida com token expirado', async () => {
    const token = jwt.sign(
      { id: 1, email: 'admin@test.com', jti: 'jti-exp' },
      'test-secret',
      { expiresIn: '-1s' },
    );

    const res = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});
