import type { RateCard, ScopeInput, QuoteCalculation } from './types';

// Round half-up to nearest cent (MOM-3 resolution)
function roundHalfUp(cents: number): number {
  return Math.floor(cents + 0.5);
}

// Normalize shipping size mix percentages (MOM-4 resolution)
export function normalizeShippingSizeMix(mix: { small: number; medium: number; large: number }) {
  const total = mix.small + mix.medium + mix.large;
  
  // Auto-normalize if between 99.5% and 100.5%
  if (total >= 99.5 && total <= 100.5) {
    return {
      small: (mix.small / total) * 100,
      medium: (mix.medium / total) * 100,
      large: (mix.large / total) * 100,
      wasNormalized: total !== 100
    };
  }
  
  return {
    small: mix.small,
    medium: mix.medium,
    large: mix.large,
    wasNormalized: false
  };
}

// Calculate fulfillment cost per order (MOM-2 resolution)
function calculateFulfillmentCost(
  utp: number,
  aovDollars: number,
  pricing: RateCard['prices']['fulfillment']
): { aovBranchCents: number; baseBranchCents: number; selectedBranchCents: number } {
  // AOV branch: percentage of order value
  const aovBranchCents = roundHalfUp(aovDollars * 100 * pricing.aovPercentage);
  
  // Base branch: base fee + additional unit fees
  const baseBranchCents = pricing.baseFeeCents + (pricing.perAdditionalUnitCents * (utp - 1));
  
  // Select maximum of both branches
  const selectedBranchCents = Math.max(aovBranchCents, baseBranchCents);
  
  return {
    aovBranchCents,
    baseBranchCents,
    selectedBranchCents
  };
}

// Calculate blended S&H cost per order (MOM-1 resolution)
function calculateShippingCost(
  shippingModel: ScopeInput['shippingModel'],
  sizeMix: { small: number; medium: number; large: number },
  pricing: RateCard['prices']['shippingAndHandling']
): { blendedCostPerOrderCents: number } {
  // Select rate set based on shipping model
  const rates = pricing[shippingModel];
  
  // Calculate weighted average, rounding each term before summing
  const smallWeightedCents = roundHalfUp((sizeMix.small / 100) * rates.smallPackageCents);
  const mediumWeightedCents = roundHalfUp((sizeMix.medium / 100) * rates.mediumPackageCents);
  const largeWeightedCents = roundHalfUp((sizeMix.large / 100) * rates.largePackageCents);
  
  const blendedCostPerOrderCents = smallWeightedCents + mediumWeightedCents + largeWeightedCents;
  
  return { blendedCostPerOrderCents };
}

// Main calculation function
export function calculateQuote(rateCard: RateCard, input: ScopeInput): QuoteCalculation {
  // Normalize shipping size mix
  const normalizedMix = normalizeShippingSizeMix(input.shippingSizeMix);
  
  // Calculate fulfillment cost per order
  const fulfillment = calculateFulfillmentCost(
    input.averageUnitsPerOrder,
    input.averageOrderValue,
    rateCard.prices.fulfillment
  );
  
  // Calculate S&H cost per order
  const shipping = calculateShippingCost(
    input.shippingModel,
    normalizedMix,
    rateCard.prices.shippingAndHandling
  );
  
  // Calculate monthly totals
  const fulfillmentCostCents = fulfillment.selectedBranchCents * input.monthlyOrders;
  const shippingCostCents = shipping.blendedCostPerOrderCents * input.monthlyOrders;
  const totalMonthlyCostCents = fulfillmentCostCents + shippingCostCents;
  
  // Apply monthly minimum
  const finalMonthlyCostCents = Math.max(totalMonthlyCostCents, rateCard.monthly_minimum_cents);
  
  return {
    fulfillmentCostCents,
    shippingCostCents,
    totalMonthlyCostCents,
    finalMonthlyCostCents,
    breakdown: {
      fulfillment,
      shipping: {
        blendedCostPerOrderCents: shipping.blendedCostPerOrderCents,
        totalShippingCents: shippingCostCents
      },
      monthlyMinimumCents: rateCard.monthly_minimum_cents
    }
  };
}

// Utility functions for display
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

export function formatPercentage(decimal: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(decimal / 100);
}