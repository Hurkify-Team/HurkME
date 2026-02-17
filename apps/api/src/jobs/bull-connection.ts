import type { ConnectionOptions } from 'bullmq';

export function buildBullConnectionOptions(
  redisUrlRaw = process.env.REDIS_URL ?? 'redis://localhost:6379',
): ConnectionOptions {
  const redisUrl = new URL(redisUrlRaw);
  const inferredPort = redisUrl.protocol === 'rediss:' ? 6380 : 6379;
  const dbRaw = redisUrl.pathname && redisUrl.pathname !== '/' ? Number(redisUrl.pathname.slice(1)) : 0;

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || inferredPort),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: Number.isFinite(dbRaw) ? dbRaw : 0,
    maxRetriesPerRequest: null,
    ...(redisUrl.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}
