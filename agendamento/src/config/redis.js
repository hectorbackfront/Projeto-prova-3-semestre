const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  lazyConnect: true,
});

redis.on('error', (err) => console.error('[Redis] erro de conexão:', err.message));
redis.on('connect', () => console.log('[Redis] conectado.'));

module.exports = redis;
