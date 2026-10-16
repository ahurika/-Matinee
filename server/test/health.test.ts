import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('health endpoint', () => {
  it('GET /health returns 200 with ok status and x-request-id header', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { status: string; service: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(body.service).toBe('matinee-server');
    expect(typeof body.timestamp).toBe('string');

    const requestId = res.headers.get('x-request-id');
    expect(requestId).toBeTruthy();
  });
});
