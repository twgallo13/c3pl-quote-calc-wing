import { APP_VERSION } from '@momentum/version';

export interface QuoteBreakdown {
  perOrder: { fulfillmentCents: number; shippingHandlingCents: number };
  monthly: { fulfillmentCents: number; shippingHandlingCents: number };
  notes?: string[];
}

export async function fetchQuotePreview(scope: any, rateCardId: string) {
  const res = await fetch('/api/quotes/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope, rateCardId })
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<{ rateCardId: string; version: string; appVersion: string; breakdown: QuoteBreakdown }>;
}