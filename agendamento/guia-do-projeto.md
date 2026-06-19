# Guia do Projeto — Como cada arquivo funciona

Este documento explica o papel de cada pasta e arquivo do projeto de agendamento.

---

## Estrutura geral

```
agendamento/
├── src/                    ← código da aplicação Node.js
│   ├── server.js           ← ponto de entrada do servidor
│   ├── config/             ← configurações (banco, swagger)
│   ├── controllers/        ← lógica de cada rota
│   ├── middlewares/        ← funções que rodam antes das rotas
│   ├── models/             ← representação das tabelas do banco
│   └── routes/             ← definição das URLs da API
├── scripts/                ← SQL para criar e popular o banco
├── queries/                ← consultas SQL para documentação/testes
├── nginx/                  ← configuração do proxy reverso
├── justificativa/          ← documento de arquitetura (Prof. Gustavo)
├── Dockerfile              ← receita para criar a imagem do Node.js
├── docker-compose.yml      ← orquestra todos os containers juntos
├── command.js              ← CLI para rodar migrations pelo terminal
├── package.json            ← lista de bibliotecas do projeto
├── .env.example            ← modelo das variáveis de ambiente
├── .dockerignore           ← arquivos que o Docker deve ignorar
├── .gitignore              ← arquivos que o Git deve ignorar
└── README.md               ← documentação principal do projeto
```

---

## Arquivos da raiz

### `src/server.js`
É o **coração do servidor**. Quando o Docker sobe o container do Node.js, este é o primeiro arquivo que roda.

O que ele faz:
1. Liga o Express (servidor HTTP)
2. Registra os middlewares globais (logger e leitura de JSON)
3. Conecta todas as rotas da API no caminho `/api`
4. Sobe o Swagger em `/api-docs`
5. Conecta no banco de dados e inicializa o servidor na porta 3000

```js
// exemplo do que acontece quando você faz docker compose up
app.use('/api/clientes', require('./routes/clientes'));  // registra a rota
await sequelize.authenticate();                          // conecta no banco
app.listen(3000)                                         // sobe o servidor
```

---

### `command.js`
É a **CLI do projeto** — um script que roda pelo terminal para gerenciar o banco, sem precisar abrir o servidor.

```bash
node command.js migrate        # cria/atualiza as tabelas no banco
node command.js migrate:fresh  # apaga tudo e recria do zero
```

A diferença entre os dois:
- `migrate` — usa `alter: true`, ou seja, atualiza as tabelas sem apagar dados
- `migrate:fresh` — usa `force: true`, apaga tudo e recria (só em desenvolvimento)

---

### `package.json`
Lista todas as **bibliotecas que o projeto usa**. Quando você roda `npm install`, o Node baixa tudo que está listado aqui.

| Biblioteca | Para que serve |
|---|---|
| express | cria o servidor e gerencia as rotas |
| sequelize | ORM — fala com o banco usando JavaScript em vez de SQL |
| pg / pg-hstore | driver que conecta o Sequelize no PostgreSQL |
| bcryptjs | criptografa as senhas antes de salvar no banco |
| jsonwebtoken | gera e valida os tokens JWT |
| dotenv | lê as variáveis do arquivo `.env` |
| swagger-ui-express | serve a página visual do Swagger |
| swagger-jsdoc | lê os comentários do código e gera a documentação |

---

### `.env.example`
Modelo das **variáveis de ambiente** do projeto. Contém as configurações sensíveis como senha do banco e chave do JWT.

```env
DB_HOST=postgres        ← nome do container do banco (DNS interno do Docker)
DB_PASSWORD=postgres123 ← senha do banco
JWT_SECRET=supersecret  ← chave para assinar os tokens JWT
PORT=3000               ← porta onde o Node roda
```

O arquivo `.env` real nunca vai para o Git (está no `.gitignore`). O `.env.example` serve para qualquer pessoa saber quais variáveis precisa configurar.

---

### `Dockerfile`
**Receita para montar a imagem do Node.js**. Usa Multi-stage build em dois estágios:

**Estágio 1 — builder:**
```dockerfile
FROM node:20-alpine AS builder
COPY package*.json ./
RUN npm install --omit=dev   ← instala só as dependências de produção
```

**Estágio 2 — runtime:**
```dockerfile
FROM node:20-alpine AS runtime
COPY --from=builder /app/node_modules ./node_modules  ← pega só o necessário do builder
COPY src/ ./src/
CMD ["node", "src/server.js"]  ← comando que inicia o servidor
```

O resultado é uma imagem leve (~150 MB) porque o `node_modules` de desenvolvimento não entra.

---

### `docker-compose.yml`
**Orquestra todos os containers juntos**. Define 4 serviços que sobem ao mesmo tempo:

| Serviço | Container | Função |
|---|---|---|
| postgres | agendamento_postgres | banco de dados |
| redis | agendamento_redis | cache |
| app | agendamento_app | API Node.js (sem porta exposta) |
| nginx | agendamento_nginx | proxy reverso na porta 80 |

Também define a rede `app_network` (Bridge) que permite os containers se comunicarem pelo nome, e os volumes `postgres_data` e `redis_data` que guardam os dados mesmo se o container for reiniciado.

---

### `.dockerignore`
Lista de arquivos que o Docker **ignora ao montar a imagem**, tornando o build mais rápido e seguro:

```
node_modules    ← não envia, o npm install instala dentro do container
.env            ← nunca envia senhas para dentro da imagem
.git            ← histórico do git não precisa estar na imagem
*.md            ← documentação não precisa estar na imagem
```

---

### `.gitignore`
Lista de arquivos que o Git **não rastreia**, protegendo dados sensíveis:
- `node_modules/` — muito pesado, qualquer um pode instalar com `npm install`
- `.env` — contém senhas reais que não podem ir para o repositório

---

## Pasta `src/config/`

### `src/config/database.js`
Cria e exporta **a conexão com o banco PostgreSQL** usando o Sequelize.

Lê as variáveis do `.env` para saber o host, usuário, senha e nome do banco. O `pool` define que o sistema pode ter no máximo 10 conexões abertas ao mesmo tempo.

```js
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,   // "postgres" — nome do container no Docker
  dialect: 'postgres',
  pool: { max: 10 }
});
```

### `src/config/swagger.js`
Configura o **Swagger**, que gera automaticamente a documentação da API lendo os comentários dos arquivos de rotas. Quando você acessa `http://localhost/api-docs`, é esse arquivo que define o que aparece lá.

---

## Pasta `src/models/`

Cada model representa **uma tabela do banco de dados**. O Sequelize usa esses arquivos para criar as tabelas e para você interagir com os dados em JavaScript.

### `src/models/Usuario.js`
Representa a tabela `usuarios`. Tem um comportamento especial:

```js
hooks: {
  beforeCreate: async (usuario) => {
    usuario.senha = await bcrypt.hash(usuario.senha, 10);
  }
}
```

O `hook beforeCreate` roda **automaticamente antes de salvar** qualquer usuário. Ele pega a senha em texto puro e transforma em hash bcrypt. Você nunca precisa se lembrar de criptografar — o model faz isso sozinho.

Também tem um método `verificarSenha` que compara a senha digitada no login com o hash salvo no banco.

### `src/models/Cliente.js` / `Servico.js` / `Agendamento.js` / `AgendamentoServico.js`
Cada um define os campos de sua respectiva tabela, os tipos de dados, e as validações (ex: campo obrigatório, formato de email, valores permitidos).

### `src/models/index.js`
**Arquivo mais importante dos models**. Ele importa todos os models e define os **relacionamentos entre eles**:

```js
// N:N — um agendamento tem vários serviços, um serviço aparece em vários agendamentos
Agendamento.belongsToMany(Servico, {
  through: AgendamentoServico,  // via tabela pivô
  foreignKey: 'agendamento_id',
});
```

É aqui que o Sequelize aprende que `Agendamento` se conecta com `Servico` pela tabela pivô `agendamento_servicos`. Sem esse arquivo, os JOINs não funcionariam.

---

## Pasta `src/middlewares/`

Middlewares são **funções que rodam no meio do caminho** — entre a requisição chegar e a rota responder.

### `src/middlewares/auth.js`
**Protege todas as rotas com JWT**. Antes de qualquer rota executar, este middleware:

1. Lê o header `Authorization: Bearer <token>`
2. Verifica se o token é válido usando a `JWT_SECRET`
3. Se válido: deixa passar e coloca os dados do usuário em `req.usuario`
4. Se inválido ou ausente: retorna erro 401 (não autorizado)

```js
const token = authHeader.split(' ')[1];
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.usuario = decoded;  // agora qualquer rota sabe quem está logado
next();                 // libera para a rota continuar
```

### `src/middlewares/logger.js`
**Registra no terminal todas as requisições** que chegam no servidor:

```
[2026-06-18T10:30:00.000Z] GET /api/clientes — 200 (45ms)
[2026-06-18T10:30:01.000Z] POST /api/login — 401 (12ms)
```

Mostra o método HTTP, a rota, o código de resposta e quanto tempo levou. Útil para debugar problemas.

---

## Pasta `src/routes/`

Cada arquivo de rota **define quais URLs existem** e qual controller chama. Também aplica o middleware de autenticação nas rotas protegidas.

### `src/routes/auth.js`
Define a única rota pública (sem JWT):
```
POST /api/login   ← qualquer um pode acessar
```

### `src/routes/clientes.js` (e usuarios, servicos, agendamentos)
Define as 5 rotas de cada entidade, todas protegidas pelo middleware `auth`:
```
GET    /api/clientes        → clienteController.listar
GET    /api/clientes/:id    → clienteController.buscar
POST   /api/clientes        → clienteController.criar
PUT    /api/clientes/:id    → clienteController.atualizar
DELETE /api/clientes/:id    → clienteController.deletar
```

---

## Pasta `src/controllers/`

Os controllers têm a **lógica de cada operação**. Recebem a requisição, falam com o banco via model, e devolvem a resposta.

### `src/controllers/authController.js`
Lógica do login:
1. Recebe email e senha
2. Busca o usuário no banco pelo email
3. Compara a senha com o hash usando `usuario.verificarSenha()`
4. Se correto, gera um token JWT e devolve

### `src/controllers/clienteController.js` (e os outros)
Cada controller tem 5 funções correspondendo às 5 rotas. Exemplo do `criar`:
```js
exports.criar = async (req, res) => {
  const cliente = await Cliente.create(req.body);  // salva no banco
  return res.status(201).json(cliente);             // retorna o criado
};
```

---

## Pasta `nginx/`

### `nginx/nginx.conf`
Configuração do **proxy reverso**. O Nginx recebe todas as requisições na porta 80 e repassa para o Node.js na porta 3000 (que fica invisível para o mundo externo).

```
Navegador → porta 80 (Nginx) → porta 3000 (Node.js, interno)
```

Isso garante que ninguém acessa o Node.js diretamente — tudo passa pelo Nginx.

---

## Pasta `scripts/`

### `scripts/setup.sql`
Script SQL que roda **automaticamente quando o container do PostgreSQL sobe pela primeira vez**. Cria as tabelas, índices e insere dados iniciais (usuário admin, alguns serviços).

### `scripts/seed/seed.sql`
Script com **100+ registros fictícios** para popular o banco com dados realistas para testes e para o professor Gustavo avaliar performance das consultas.

```bash
# para rodar:
docker compose exec -T postgres psql -U postgres -d agendamento_db < scripts/seed/seed.sql
```

---

## Pasta `queries/`

Arquivos SQL **apenas para documentação e apresentação**. Não são executados automaticamente pelo sistema.

### `queries/crud.sql`
Exemplos de SELECT, INSERT, UPDATE e DELETE direto no banco — prova que você domina SQL além da API.

### `queries/consultas_avancadas.sql`
As 5 consultas complexas exigidas pelo Prof. Gustavo: JOINs entre múltiplas tabelas, agregações (`SUM`, `COUNT`, `AVG`), filtros por data e rankings.

---

## Pasta `justificativa/`

### `justificativa/arquitetura.md`
Documento específico exigido pelo **Prof. Gustavo** com:
- Justificativa da escolha do PostgreSQL
- Normalização (1FN, 2FN, 3FN)
- Tabela de índices com motivos
- As 5 consultas críticas com explicação
- Scripts de dados de teste
