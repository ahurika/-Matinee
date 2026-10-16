import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, '../', '');
  const localEnv = loadEnv(mode, process.cwd(), '');
  return {
    test: {
      env: {
        ...rootEnv,
        ...localEnv,
        NODE_ENV: 'test',
        DATABASE_URL: rootEnv.DATABASE_URL_TEST || 'postgres://postgres:postgres@localhost:5432/matinee_test',
      },
      testTimeout: 60000,
      fileParallelism: false,
    },
  };
});
