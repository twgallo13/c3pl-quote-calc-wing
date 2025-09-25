import { APP_VERSION } from '../version';
import { RateCard } from './types';

// API base URL - use environment variable in Codespaces, fallback to relative paths
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface QuoteBreakdown {
  perOrder: { fulfillmentCents: number; shippingHandlingCents: number };
  monthly: { fulfillmentCents: number; shippingHandlingCents: number };
  notes?: string[];
}

export async function fetchQuotePreview(scope: any, rateCardId: string) {
  const res = await fetch(`${API_BASE_URL}/api/quotes/preview`, {
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
    const res = await fetch(`${API_BASE_URL}/api/ratecards`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    return { rateCards: data, appVersion: APP_VERSION };
  } catch (error) {
    console.error('Failed to fetch rate cards:', error);
    return { rateCards: [], appVersion: APP_VERSION };
  }
}

export async function fetchRateCard(id: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ratecards/${id}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const rateCard = await res.json();
    return { rateCard, appVersion: APP_VERSION };
  } catch (error) {
    console.error('Failed to fetch rate card:', error);
    throw error;
  }
}

export async function createRateCard(rateCard: RateCard & { versionNotes?: string }) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ratecards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rateCard)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `API error ${res.status}`);
    }
    const createdRateCard = await res.json();
    return { rateCard: createdRateCard, appVersion: APP_VERSION };
  } catch (error) {
    console.error('Failed to create rate card:', error);
    throw error;
  }
}

export async function updateRateCard(id: string, updates: Partial<RateCard> & { versionNotes?: string }) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ratecards/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `API error ${res.status}`);
    }
    const updatedRateCard = await res.json();
    return { rateCard: updatedRateCard, appVersion: APP_VERSION };
  } catch (error) {
    console.error('Failed to update rate card:', error);
    throw error;
  }
}

export async function deleteRateCard(id: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ratecards/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `API error ${res.status}`);
    }
    const result = await res.json();
    return { message: result.message, appVersion: APP_VERSION };
  } catch (error) {
    console.error('Failed to delete rate card:', error);
    throw error;
  }
}