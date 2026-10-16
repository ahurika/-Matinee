import crypto from 'node:crypto';
import { env } from '../../config/env.js';

export class PaystackClient {
  private secretKey: string;

  constructor(secretKey = env.PAYSTACK_SECRET_KEY || 'sk_test_mock') {
    this.secretKey = secretKey;
  }

  verifyWebhookSignature(rawBody: string, signature: string | null | undefined): boolean {
    if (!signature) return false;
    try {
      const computed = crypto
        .createHmac('sha512', this.secretKey)
        .update(rawBody)
        .digest('hex');

      const sigBuf = Buffer.from(signature, 'utf8');
      const compBuf = Buffer.from(computed, 'utf8');
      if (sigBuf.length !== compBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, compBuf);
    } catch {
      return false;
    }
  }

  signPayload(payload: string): string {
    return crypto.createHmac('sha512', this.secretKey).update(payload).digest('hex');
  }

  async initializeTransaction(p: {
    email: string;
    amountKobo: number;
    reference: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ checkoutUrl: string; accessCode: string; reference: string }> {
    // If real Paystack key provided and not in test/mock mode
    if (this.secretKey.startsWith('sk_live_')) {
      const res = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: p.email,
          amount: p.amountKobo,
          reference: p.reference,
          metadata: p.metadata,
        }),
      });

      if (!res.ok) {
        throw new Error(`Paystack initialize failed: ${res.statusText}`);
      }
      const data = (await res.json()) as any;
      return {
        checkoutUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
        reference: p.reference,
      };
    }

    // Default test mode: return deterministic test checkout URL
    return {
      checkoutUrl: `${env.APP_BASE_URL}/test-checkout?reference=${encodeURIComponent(p.reference)}&amount=${p.amountKobo}`,
      accessCode: `acc_${p.reference}`,
      reference: p.reference,
    };
  }
}

export const paystackClient = new PaystackClient();
