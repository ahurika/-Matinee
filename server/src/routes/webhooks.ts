import crypto from 'node:crypto';
import { Hono } from 'hono';
import { paystackClient } from '../integrations/paystack/paystackClient.js';
import { processWebhookEvent } from '../jobs/webhookJob.js';
import { pool } from '../lib/db.js';

export const webhooksRoute = new Hono();

webhooksRoute.post('/paystack', async (c) => {
  const rawBody = await c.req.raw.text();
  const signature = c.req.header('x-paystack-signature');

  // 1. Cryptographic HMAC-SHA512 verification (T9)
  const isValid = paystackClient.verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    console.warn('[PaystackWebhook] Invalid webhook signature received.');
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' } }, 401);
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON payload' } }, 400);
  }

  const eventId = String(
    event.data?.id || `${event.event || 'unknown'}:${event.data?.reference || crypto.randomUUID()}`,
  );

  // 2. Ingest into webhook_events with duplicate suppression
  const insertRes = await pool.query(
    `INSERT INTO webhook_events (id, provider, event_id, payload, status)
     VALUES ($1, 'paystack', $2, $3, 'received')
     ON CONFLICT (provider, event_id) DO NOTHING
     RETURNING id`,
    [`whe_${crypto.randomUUID()}`, eventId, rawBody],
  );

  // 3. Process event if newly received
  if (insertRes.rowCount && insertRes.rowCount > 0) {
    await processWebhookEvent(event);
  }

  // Always return 200 to acknowledge receipt
  return c.json({ received: true }, 200);
});
