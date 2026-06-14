module.exports = (req, res, next) => {
  const inicio = Date.now();
  const { method, url } = req;

  res.on('finish', () => {
    const duracao = Date.now() - inicio;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${method} ${url} — ${res.statusCode} (${duracao}ms)`);
  });

  next();
};
