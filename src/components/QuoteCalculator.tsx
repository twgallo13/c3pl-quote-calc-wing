import { useState, useEffect } from 'react';
import { useKV } from '@github/spark/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Calculator, FloppyDisk, Download } from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { RateCard, ScopeInput, QuoteCalculation, Quote } from '@/lib/types';
import { calculateQuote, formatCurrency, formatPercentage, normalizeShippingSizeMix } from '@/lib/calculator';

interface QuoteCalculatorProps {
  onQuoteCalculated?: (quote: Quote) => void;
  rateCards: RateCard[];
  loading: boolean;
}

export default function QuoteCalculator({ onQuoteCalculated, rateCards, loading }: QuoteCalculatorProps) {
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
    shippingSizeMix: { small: 60, medium: 30, large: 10 },
    storageRequirements: { smallUnits: 100, mediumUnits: 50, largeUnits: 25, pallets: 2 }
  });

  const [calculation, setCalculation] = useState<QuoteCalculation | null>(null);
  const [normalizationHint, setNormalizationHint] = useState<string>('');
  const [shippingMixTotal, setShippingMixTotal] = useState<number>(100);

  const selectedRateCard = rateCards?.find(rc => rc.id === selectedRateCardId);

  // Recalculate whenever inputs change
  useEffect(() => {
    if (!selectedRateCard) return;

    // Calculate shipping mix total
    const total = scopeInput.shippingSizeMix.small + scopeInput.shippingSizeMix.medium + scopeInput.shippingSizeMix.large;
    setShippingMixTotal(total);

    // Check shipping mix normalization
    const normalized = normalizeShippingSizeMix(scopeInput.shippingSizeMix);
    if (normalized.wasNormalized) {
      setNormalizationHint(`Shipping percentages auto-normalized from ${total.toFixed(1)}% to 100%`);
    } else if (total < 99.5 || total > 100.5) {
      setNormalizationHint(`Warning: Shipping percentages total ${total.toFixed(1)}% (should be 100%)`);
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

  if (loading || !rateCards) {
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
              aria-describedby="client-name-hint"
            />
            <p id="client-name-hint" className="text-xs text-muted-foreground">
              Optional: Client name will appear on saved quotes and exports
            </p>
          </div>

          {/* Rate Card Selection */}
          <div className="space-y-2">
            <Label htmlFor="rate-card">Rate Card</Label>
            <Select value={selectedRateCardId} onValueChange={setSelectedRateCardId}>
              <SelectTrigger id="rate-card" aria-describedby="rate-card-hint">
                <SelectValue placeholder="Select a rate card" />
              </SelectTrigger>
              <SelectContent>
                {rateCards.map(card => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name} - {formatCurrency(card.monthly_minimum_cents)} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p id="rate-card-hint" className="text-xs text-muted-foreground">
              Select the pricing structure to use for this quote calculation
            </p>
          </div>

          {/* Order Volume */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthly-orders">Monthly Orders</Label>
              <Input
                id="monthly-orders"
                type="number"
                min="0"
                value={scopeInput.monthlyOrders}
                onChange={(e) => updateScopeInput({ monthlyOrders: parseInt(e.target.value) || 0 })}
                aria-describedby="monthly-orders-hint"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="units-per-order">Units per Order</Label>
              <Input
                id="units-per-order"
                type="number"
                step="0.1"
                min="0"
                value={scopeInput.averageUnitsPerOrder}
                onChange={(e) => updateScopeInput({ averageUnitsPerOrder: parseFloat(e.target.value) || 0 })}
                aria-describedby="units-per-order-hint"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <p id="monthly-orders-hint">Number of orders expected per month</p>
            <p id="units-per-order-hint">Average number of items per order</p>
          </div>

          {/* Order Value */}
          <div className="space-y-2">
            <Label htmlFor="order-value">Average Order Value ($)</Label>
            <Input
              id="order-value"
              type="number"
              step="0.01"
              min="0"
              value={scopeInput.averageOrderValue}
              onChange={(e) => updateScopeInput({ averageOrderValue: parseFloat(e.target.value) || 0 })}
              aria-describedby="order-value-hint"
            />
            <p id="order-value-hint" className="text-xs text-muted-foreground">
              Total dollar value of typical customer order
            </p>
          </div>

          {/* Shipping Model */}
          <div className="space-y-2">
            <Label htmlFor="shipping-model">Shipping Model</Label>
            <Select
              value={scopeInput.shippingModel}
              onValueChange={(value: 'standard' | 'customerAccount') => updateScopeInput({ shippingModel: value })}
            >
              <SelectTrigger id="shipping-model" aria-describedby="shipping-model-hint">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Rates</SelectItem>
                <SelectItem value="customerAccount">Customer Account</SelectItem>
              </SelectContent>
            </Select>
            <p id="shipping-model-hint" className="text-xs text-muted-foreground">
              Choose between standard shipping rates or customer's own shipping account
            </p>
          </div>

          {/* Shipping Size Mix */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Shipping Size Mix (%)</Label>
              <span
                className={`text-sm font-medium ${Math.abs(shippingMixTotal - 100) < 0.1
                  ? 'text-green-600'
                  : shippingMixTotal >= 99.5 && shippingMixTotal <= 100.5
                    ? 'text-amber-600'
                    : 'text-red-600'
                  }`}
                aria-live="polite"
                aria-label={`Shipping mix total: ${shippingMixTotal.toFixed(1)} percent`}
              >
                Total: {shippingMixTotal.toFixed(1)}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="small-mix" className="text-sm">Small</Label>
                <Input
                  id="small-mix"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={scopeInput.shippingSizeMix.small}
                  onChange={(e) => updateShippingMix('small', parseFloat(e.target.value) || 0)}
                  aria-describedby="shipping-mix-hint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medium-mix" className="text-sm">Medium</Label>
                <Input
                  id="medium-mix"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={scopeInput.shippingSizeMix.medium}
                  onChange={(e) => updateShippingMix('medium', parseFloat(e.target.value) || 0)}
                  aria-describedby="shipping-mix-hint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="large-mix" className="text-sm">Large</Label>
                <Input
                  id="large-mix"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={scopeInput.shippingSizeMix.large}
                  onChange={(e) => updateShippingMix('large', parseFloat(e.target.value) || 0)}
                  aria-describedby="shipping-mix-hint"
                />
              </div>
            </div>
            {normalizationHint && (
              <Badge
                id="shipping-mix-hint"
                variant={
                  normalizationHint.includes('auto-normalized')
                    ? 'default'
                    : normalizationHint.includes('Warning')
                      ? 'destructive'
                      : 'secondary'
                }
                className="text-xs"
                aria-live="polite"
              >
                {normalizationHint}
              </Badge>
            )}
            <p className="text-xs text-muted-foreground">
              Percentages between 99.5% and 100.5% will be auto-normalized to total 100%
            </p>
          </div>

          {/* Storage Requirements */}
          <div className="space-y-4">
            <Label>Monthly Storage Requirements</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="small-units" className="text-sm">Small Units</Label>
                <Input
                  id="small-units"
                  type="number"
                  min="0"
                  value={scopeInput.storageRequirements.smallUnits}
                  onChange={(e) => updateScopeInput({
                    storageRequirements: {
                      ...scopeInput.storageRequirements,
                      smallUnits: parseInt(e.target.value) || 0
                    }
                  })}
                  aria-describedby="small-units-hint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medium-units" className="text-sm">Medium Units</Label>
                <Input
                  id="medium-units"
                  type="number"
                  min="0"
                  value={scopeInput.storageRequirements.mediumUnits}
                  onChange={(e) => updateScopeInput({
                    storageRequirements: {
                      ...scopeInput.storageRequirements,
                      mediumUnits: parseInt(e.target.value) || 0
                    }
                  })}
                  aria-describedby="medium-units-hint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="large-units" className="text-sm">Large Units</Label>
                <Input
                  id="large-units"
                  type="number"
                  min="0"
                  value={scopeInput.storageRequirements.largeUnits}
                  onChange={(e) => updateScopeInput({
                    storageRequirements: {
                      ...scopeInput.storageRequirements,
                      largeUnits: parseInt(e.target.value) || 0
                    }
                  })}
                  aria-describedby="large-units-hint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pallets" className="text-sm">Pallets</Label>
                <Input
                  id="pallets"
                  type="number"
                  min="0"
                  value={scopeInput.storageRequirements.pallets}
                  onChange={(e) => updateScopeInput({
                    storageRequirements: {
                      ...scopeInput.storageRequirements,
                      pallets: parseInt(e.target.value) || 0
                    }
                  })}
                  aria-describedby="pallets-hint"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <p id="small-units-hint">Number of small units stored monthly</p>
              <p id="medium-units-hint">Number of medium units stored monthly</p>
              <p id="large-units-hint">Number of large units stored monthly</p>
              <p id="pallets-hint">Number of pallets stored monthly</p>
            </div>
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
            <CardTitle className="text-2xl" aria-live="polite" aria-label="Total monthly cost">
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
            {/* Cost Breakdown Table */}
            <Table>
              <TableBody>
                {calculation.lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right font-medium" aria-live="polite">
                      {formatCurrency(item.costCents)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell className="font-medium">Subtotal</TableCell>
                  <TableCell className="text-right font-medium" aria-live="polite" aria-label="Subtotal cost">
                    {formatCurrency(calculation.totalMonthlyCostCents)}
                  </TableCell>
                </TableRow>
                {calculation.finalMonthlyCostCents > calculation.totalMonthlyCostCents && (
                  <TableRow className="text-accent">
                    <TableCell>Monthly Minimum Applied</TableCell>
                    <TableCell className="text-right font-medium" aria-live="polite" aria-label="Monthly minimum adjustment">
                      +{formatCurrency(calculation.finalMonthlyCostCents - calculation.totalMonthlyCostCents)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Per-Order Breakdown */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Per Order Costs</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Fulfillment</div>
                  <div className="font-medium" aria-live="polite" aria-label="Fulfillment cost per order">
                    {formatCurrency(calculation.breakdown.fulfillment.selectedBranchCents)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Shipping</div>
                  <div className="font-medium" aria-live="polite" aria-label="Shipping cost per order">
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