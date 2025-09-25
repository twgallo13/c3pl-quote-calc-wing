import { APP_VERSION } from '@momentum/version';
import { RateCard } from './types';

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

// Rate Card Management API functions
export async function fetchRateCards() {
  try {
    const res = await fetch('/api/ratecards');
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    return { rateCards: data, appVersion: APP_VERSION };
  } catch (error) {
    console.error('Failed to fetch rate cards:', error);
    return { rateCards: [], appVersion: APP_VERSION };
  }
}

export async function fetchRateCard(id: string) {
  const res = await fetch(`/api/ratecards/${id}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<{ rateCard: RateCard; appVersion: string }>;
}

export async function createRateCard(rateCard: RateCard & { versionNotes?: string }) {
  const res = await fetch('/api/ratecards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rateCard)
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `API error ${res.status}`);
  }
  return res.json() as Promise<{ rateCard: RateCard; appVersion: string }>;
}

export async function updateRateCard(id: string, updates: Partial<RateCard> & { versionNotes: string }) {
  const res = await fetch(`/api/ratecards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `API error ${res.status}`);
  }
  return res.json() as Promise<{ rateCard: RateCard; previousVersion: string; appVersion: string }>;
}

export async function deleteRateCard(id: string) {
  const res = await fetch(`/api/ratecards/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `API error ${res.status}`);
  }
  return res.json() as Promise<{ message: string; appVersion: string }>;
}