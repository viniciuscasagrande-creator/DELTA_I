export interface DeltaAppConfig {
  nodeEnv: 'development' | 'staging' | 'production';
  apiPort: number;
  apiPrefix: string;
  databaseUrl: string;
  redisHost: string;
  redisPort: number;
}

export function loadDeltaConfig(): DeltaAppConfig {
  return {
    nodeEnv: (process.env.NODE_ENV as DeltaAppConfig['nodeEnv']) || 'development',
    apiPort: Number(process.env.API_PORT || 3001),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    databaseUrl: process.env.DATABASE_URL || '',
    redisHost: process.env.REDIS_HOST || 'localhost',
    redisPort: Number(process.env.REDIS_PORT || 6379),
  };
}
