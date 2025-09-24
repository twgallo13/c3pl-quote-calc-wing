import { useState, useEffect } from 'react';
import { useKV } from '@github/spark/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calculator, FloppyDisk, Download } from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { RateCard, ScopeInput, QuoteCalculation, Quote } from '@/lib/types';
import { calculateQuote, formatCurrency, formatPercentage, normalizeShippingSizeMix } from '@/lib/calculator';
import { sampleRateCards } from '@/lib/sampleData';

interface QuoteCalculatorProps {
  onQuoteCalculated?: (quote: Quote) => void;
}

export default function QuoteCalculator({ onQuoteCalculated }: QuoteCalculatorProps) {
  const [rateCards] = useKV<RateCard[]>('rate-cards', sampleRateCards);
  const [, setQuotesKV] = useKV<Quote[]>('quotes', []);
  
  const setQuotes = (updater: (current: Quote[]) => Quote[]) => {
    setQuotesKV(current => updater(current || []));
  };
  
  const [selectedRateCardId, setSelectedRateCardId] = useState<string>('rc-growth-2025');
  const [clientName, setClientName] = useState('');
  const [scopeInput, setScopeInput] = useState<ScopeInput>({
    monthlyOrders: 1000,
    averageUnitsPerOrder: 2,
    averageOrderValue: 75,
    shippingModel: 'standard',
    shippingSizeMix: { small: 60, medium: 30, large: 10 }
  });
  
  const [calculation, setCalculation] = useState<QuoteCalculation | null>(null);
  const [normalizationHint, setNormalizationHint] = useState<string>('');

  const selectedRateCard = rateCards?.find(rc => rc.id === selectedRateCardId);

  // Recalculate whenever inputs change
  useEffect(() => {
    if (!selectedRateCard) return;
    
    // Check shipping mix normalization
    const normalized = normalizeShippingSizeMix(scopeInput.shippingSizeMix);
    if (normalized.wasNormalized) {
      setNormalizationHint('Shipping percentages were auto-normalized to total 100%');
    } else {
      setNormalizationHint('');
    }
    
    const result = calculateQuote(selectedRateCard, scopeInput);
    setCalculation(result);
  }, [selectedRateCard, scopeInput]);

  const updateScopeInput = (updates: Partial<ScopeInput>) => {
    setScopeInput(prev => ({ ...prev, ...updates }));
  };

  const updateShippingMix = (size: keyof ScopeInput['shippingSizeMix'], value: number) => {
    updateScopeInput({
      shippingSizeMix: {
        ...scopeInput.shippingSizeMix,
        [size]: value
      }
    });
  };

  const saveQuote = () => {
    if (!calculation || !selectedRateCard) return;
    
    const quote: Quote = {
      id: Date.now().toString(),
      clientName: clientName || undefined,
      createdAt: new Date().toISOString(),
      rateCardId: selectedRateCard.id,
      rateCardVersion: selectedRateCard.version,
      scopeInput,
      calculation
    };
    
    setQuotes(current => [quote, ...current]);
    onQuoteCalculated?.(quote);
    toast.success('Quote saved successfully');
  };

  const exportQuote = () => {
    if (!calculation || !selectedRateCard) return;
    
    const quoteData = {
      client: clientName || 'Prospect',
      rateCard: `${selectedRateCard.name} ${selectedRateCard.version}`,
      date: new Date().toLocaleDateString(),
      input: scopeInput,
      calculation,
      total: formatCurrency(calculation.finalMonthlyCostCents)
    };
    
    const blob = new Blob([JSON.stringify(quoteData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quote-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Quote exported');
  };

  if (!rateCards) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator size={24} />
            Quote Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client Info */}
          <div className="space-y-2">
            <Label htmlFor="client-name">Client Name (Optional)</Label>
            <Input
              id="client-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter client name"
            />
          </div>

          {/* Rate Card Selection */}
          <div className="space-y-2">
            <Label>Rate Card</Label>
            <Select value={selectedRateCardId} onValueChange={setSelectedRateCardId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rateCards.map(card => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name} - {formatCurrency(card.monthly_minimum_cents)} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Order Volume */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthly-orders">Monthly Orders</Label>
              <Input
                id="monthly-orders"
                type="number"
                value={scopeInput.monthlyOrders}
                onChange={(e) => updateScopeInput({ monthlyOrders: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="units-per-order">Units per Order</Label>
              <Input
                id="units-per-order"
                type="number"
                step="0.1"
                value={scopeInput.averageUnitsPerOrder}
                onChange={(e) => updateScopeInput({ averageUnitsPerOrder: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Order Value */}
          <div className="space-y-2">
            <Label htmlFor="order-value">Average Order Value ($)</Label>
            <Input
              id="order-value"
              type="number"
              step="0.01"
              value={scopeInput.averageOrderValue}
              onChange={(e) => updateScopeInput({ averageOrderValue: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {/* Shipping Model */}
          <div className="space-y-2">
            <Label>Shipping Model</Label>
            <Select 
              value={scopeInput.shippingModel} 
              onValueChange={(value: 'standard' | 'customerAccount') => updateScopeInput({ shippingModel: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Rates</SelectItem>
                <SelectItem value="customerAccount">Customer Account</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shipping Size Mix */}
          <div className="space-y-4">
            <Label>Shipping Size Mix (%)</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="small-mix" className="text-sm">Small</Label>
                <Input
                  id="small-mix"
                  type="number"
                  step="0.1"
                  value={scopeInput.shippingSizeMix.small}
                  onChange={(e) => updateShippingMix('small', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medium-mix" className="text-sm">Medium</Label>
                <Input
                  id="medium-mix"
                  type="number"
                  step="0.1"
                  value={scopeInput.shippingSizeMix.medium}
                  onChange={(e) => updateShippingMix('medium', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="large-mix" className="text-sm">Large</Label>
                <Input
                  id="large-mix"
                  type="number"
                  step="0.1"
                  value={scopeInput.shippingSizeMix.large}
                  onChange={(e) => updateShippingMix('large', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            {normalizationHint && (
              <Badge variant="secondary" className="text-xs">
                {normalizationHint}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={saveQuote} disabled={!calculation} className="flex-1">
              <FloppyDisk size={16} className="mr-2" />
              Save Quote
            </Button>
            <Button onClick={exportQuote} disabled={!calculation} variant="outline">
              <Download size={16} className="mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {calculation && selectedRateCard && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {formatCurrency(calculation.finalMonthlyCostCents)}
              <span className="text-base font-normal text-muted-foreground ml-2">
                / month
              </span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Using {selectedRateCard.name} {selectedRateCard.version}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cost Breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Fulfillment</span>
                <span className="font-medium">{formatCurrency(calculation.fulfillmentCostCents)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Shipping & Handling</span>
                <span className="font-medium">{formatCurrency(calculation.shippingCostCents)}</span>
              </div>
              <hr />
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(calculation.totalMonthlyCostCents)}</span>
              </div>
              {calculation.finalMonthlyCostCents > calculation.totalMonthlyCostCents && (
                <div className="flex justify-between items-center text-accent">
                  <span>Monthly Minimum Applied</span>
                  <span className="font-medium">
                    +{formatCurrency(calculation.finalMonthlyCostCents - calculation.totalMonthlyCostCents)}
                  </span>
                </div>
              )}
            </div>

            {/* Per-Order Breakdown */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Per Order Costs</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Fulfillment</div>
                  <div className="font-medium">
                    {formatCurrency(calculation.breakdown.fulfillment.selectedBranchCents)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Shipping</div>
                  <div className="font-medium">
                    {formatCurrency(calculation.breakdown.shipping.blendedCostPerOrderCents)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}