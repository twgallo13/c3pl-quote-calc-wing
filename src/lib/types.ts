// Core Pricing Structures within a Rate Card
export interface FulfillmentPricing {
  aovPercentage: number;
  baseFeeCents: number;
  perAdditionalUnitCents: number;
}

export interface StoragePricing {
  smallUnitCents: number;
  mediumUnitCents: number;
  largeUnitCents: number;
  palletCents: number;
}

// Holds both standard and customer-account S&H rates
export interface SandHPricing {
  standard: {
    smallPackageCents: number;
    mediumPackageCents: number;
    largePackageCents: number;
  };
  customerAccount: {
    smallPackageCents: number;
    mediumPackageCents: number;
    largePackageCents: number;
  };
}

// Main Rate Card Structure
export interface RateCard {
  id: string;
  name: string;
  version: string;
  monthly_minimum_cents: number;
  prices: {
    fulfillment: FulfillmentPricing;
    storage: StoragePricing;
    shippingAndHandling: SandHPricing;
  };
}

// User Input Structure
export interface ScopeInput {
  monthlyOrders: number;
  averageUnitsPerOrder: number; // UTP
  averageOrderValue: number; // AOV, in dollars
  shippingModel: 'standard' | 'customerAccount';
  shippingSizeMix: { 
    small: number; 
    medium: number; 
    large: number; 
  }; // percentages
}

// Quote calculation results
export interface QuoteCalculation {
  fulfillmentCostCents: number;
  shippingCostCents: number;
  totalMonthlyCostCents: number;
  finalMonthlyCostCents: number; // After applying minimum
  breakdown: {
    fulfillment: {
      aovBranchCents: number;
      baseBranchCents: number;
      selectedBranchCents: number;
    };
    shipping: {
      blendedCostPerOrderCents: number;
      totalShippingCents: number;
    };
    monthlyMinimumCents: number;
  };
}

// Saved Quote
export interface Quote {
  id: string;
  clientName?: string;
  createdAt: string;
  rateCardId: string;
  rateCardVersion: string;
  scopeInput: ScopeInput;
  calculation: QuoteCalculation;
}