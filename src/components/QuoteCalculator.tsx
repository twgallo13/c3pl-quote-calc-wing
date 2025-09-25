// Initial empty state for the form
const initialScope: ScopeInput = {
  monthlyOrders: 0,
  averageUnitsPerOrder: 0,
  averageOrderValue: 0,
  shippingModel: 'standard',
  storageRequirements: {
    smallUnits: 0,
    mediumUnits: 0,
    largeUnits: 0,
    pallets: 0,
  },
  shippingSizeMix: {
    small: 0,
    medium: 0,
    large: 0,
  },
};
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Calculator, FloppyDisk, Download } from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { RateCard, ScopeInput, QuoteCalculation, Quote } from '@/lib/types';
import { calculateQuote, formatCurrency, formatPercentage, normalizeShippingSizeMix } from '@/lib/calculator';
import { sampleRateCards } from '@/lib/sampleData';

// Alias for ScenarioResult to match requested naming
type ScenarioResult = QuoteCalculation;
// Alias for calculateScenario to match requested naming
const calculateScenario = calculateQuote;

export default function QuoteCalculator({ onQuoteCalculated, rateCards, loading }: {
  onQuoteCalculated?: (quote: Quote) => void;
  rateCards: RateCard[];
  loading?: boolean;
}) {
  // State hooks as requested
  const [scope, setScope] = useState<ScopeInput>(initialScope);
  const [selectedRateCard, setSelectedRateCard] = useState<RateCard>(sampleRateCards[0]);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);

  // Additional state for UI functionality
  const [normalizationHint, setNormalizationHint] = useState<string>('');
  const [shippingMixTotal, setShippingMixTotal] = useState<number>(100);
  const [clientName, setClientName] = useState<string>('');
  const [quotes, setQuotes] = useState<Quote[]>([]);

  // Calculation effect - recalculate whenever scope or selectedRateCard changes
  useEffect(() => {
    if (!selectedRateCard) return;

    // Calculate shipping mix total
    const total = scope.shippingSizeMix.small + scope.shippingSizeMix.medium + scope.shippingSizeMix.large;
    setShippingMixTotal(total);

    // Check shipping mix normalization
    const normalized = normalizeShippingSizeMix(scope.shippingSizeMix);
    if (normalized.wasNormalized) {
      setNormalizationHint(`Shipping percentages auto-normalized from ${total.toFixed(1)}% to 100%`);
    } else if (total < 99.5 || total > 100.5) {
      setNormalizationHint(`Warning: Shipping percentages total ${total.toFixed(1)}% (should be 100%)`);
    } else {
      setNormalizationHint('');
    }

    const result = calculateScenario(selectedRateCard, scope);
    setScenarioResult(result);
  }, [selectedRateCard, scope]);

  // Handler Functions as requested
  const handleScopeChange = (category: keyof ScopeInput, field: string, value: number | string) => {
    setScope(prevScope => {
      // If the category is an object, spread it; otherwise, just set the value
      if (typeof prevScope[category] === 'object' && prevScope[category] !== null) {
        return {
          ...prevScope,
          [category]: {
            ...prevScope[category],
            [field]: value
          }
        };
      } else {
        return {
          ...prevScope,
          [category]: value
        };
      }
    });
  };

  const handleTopLevelScopeChange = (field: keyof ScopeInput, value: number | string) => {
    setScope(prevScope => ({
      ...prevScope,
      [field]: value
    }));
  };

  const handleRateCardChange = (rateCard: RateCard) => {
    setSelectedRateCard(rateCard);
  };

  const saveQuote = () => {
    if (!scenarioResult || !selectedRateCard) return;

    const quote: Quote = {
      id: Date.now().toString(),
      clientName: clientName || undefined,
      createdAt: new Date().toISOString(),
      rateCardId: selectedRateCard.id,
      rateCardVersion: selectedRateCard.version,
      scopeInput: scope,
      calculation: scenarioResult
    };

    setQuotes(current => [quote, ...current]);
    onQuoteCalculated?.(quote);
    toast.success('Quote saved successfully');
  };

  const exportQuote = () => {
    if (!scenarioResult || !selectedRateCard) return;

    const quoteData = {
      client: clientName || 'Prospect',
      rateCard: `${selectedRateCard.name} ${selectedRateCard.version}`,
      date: new Date().toLocaleDateString(),
      input: scope,
      calculation: scenarioResult,
      total: formatCurrency(scenarioResult.finalMonthlyCostCents)
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
    <div className="grid md:grid-cols-2 gap-8 p-4 md:p-8">
      {/* Column 1: Inputs */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator size={24} />
              <CardTitle>Quote Calculator</CardTitle>
            </div>
            <Button variant="outline" onClick={() => setScope(initialScope)}>
              Reset
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Info */}
            <div className="space-y-2">
              <Label htmlFor="client-name">Client Name (Optional)</Label>
              <Input
                id="client-name"
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                aria-label="Client Name"
              />
            </div>
            {/* Basic Parameters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly-orders">Monthly Orders</Label>
                <Input
                  id="monthly-orders"
                  type="number"
                  min="0"
                  value={scope.monthlyOrders}
                  onChange={e => handleTopLevelScopeChange('monthlyOrders', parseInt(e.target.value) || 0)}
                  aria-describedby="monthly-orders-hint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="units-per-order">Average Units per Order</Label>
                <Input
                  id="units-per-order"
                  type="number"
                  step="0.1"
                  min="0"
                  value={scope.averageUnitsPerOrder}
                  onChange={e => handleTopLevelScopeChange('averageUnitsPerOrder', parseFloat(e.target.value) || 0)}
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
                value={scope.averageOrderValue}
                onChange={e => handleTopLevelScopeChange('averageOrderValue', parseFloat(e.target.value) || 0)}
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
                value={scope.shippingModel}
                onValueChange={value => handleTopLevelScopeChange('shippingModel', value)}
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
          </CardContent>
        </Card>
        {/* Storage Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Profile</CardTitle>
            <CardDescription>Enter the average number of units in storage per month.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="small-units" className="text-sm">Small Units</Label>
                <Input
                  id="small-units"
                  type="number"
                  min="0"
                  value={scope.storageRequirements.smallUnits}
                  onChange={e => handleScopeChange('storageRequirements', 'smallUnits', parseInt(e.target.value) || 0)}
                  aria-describedby="small-units-hint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medium-units" className="text-sm">Medium Units</Label>
                <Input
                  id="medium-units"
                  type="number"
                  min="0"
                  value={scope.storageRequirements.mediumUnits}
                  onChange={e => handleScopeChange('storageRequirements', 'mediumUnits', parseInt(e.target.value) || 0)}
                  aria-describedby="medium-units-hint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="large-units" className="text-sm">Large Units</Label>
                <Input
                  id="large-units"
                  type="number"
                  min="0"
                  value={scope.storageRequirements.largeUnits}
                  onChange={e => handleScopeChange('storageRequirements', 'largeUnits', parseInt(e.target.value) || 0)}
                  aria-describedby="large-units-hint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pallets" className="text-sm">Pallets</Label>
                <Input
                  id="pallets"
                  type="number"
                  min="0"
                  value={scope.storageRequirements.pallets}
                  onChange={e => handleScopeChange('storageRequirements', 'pallets', parseInt(e.target.value) || 0)}
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
          </CardContent>
        </Card>
        {/* Shipping Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Shipping Profile</CardTitle>
            <CardDescription>Enter the percentage mix of package sizes for outgoing orders.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
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
                <Label htmlFor="small-mix" className="text-sm">Small (%)</Label>
                <Input
                  id="small-mix"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={scope.shippingSizeMix.small}
                  onChange={e => handleScopeChange('shippingSizeMix', 'small', parseFloat(e.target.value) || 0)}
                  aria-describedby="shipping-mix-hint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medium-mix" className="text-sm">Medium (%)</Label>
                <Input
                  id="medium-mix"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={scope.shippingSizeMix.medium}
                  onChange={e => handleScopeChange('shippingSizeMix', 'medium', parseFloat(e.target.value) || 0)}
                  aria-describedby="shipping-mix-hint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="large-mix" className="text-sm">Large (%)</Label>
                <Input
                  id="large-mix"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={scope.shippingSizeMix.large}
                  onChange={e => handleScopeChange('shippingSizeMix', 'large', parseFloat(e.target.value) || 0)}
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
          </CardContent>
        </Card>
        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={saveQuote} disabled={!scenarioResult} className="flex-1">
            <FloppyDisk size={16} className="mr-2" />
            Save Quote
          </Button>
          <Button onClick={exportQuote} disabled={!scenarioResult} variant="outline">
            <Download size={16} className="mr-2" />
            Export
          </Button>
        </div>
      </div>
      {/* Column 2: Results */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Quote Estimate</CardTitle>
            <div className="space-y-2">
              <Label htmlFor="rate-card-select">Select Rate Card</Label>
              <Select
                value={selectedRateCard.id}
                onValueChange={(value) => {
                  const rateCard = sampleRateCards.find(rc => rc.id === value);
                  if (rateCard) handleRateCardChange(rateCard);
                }}
              >
                <SelectTrigger id="rate-card-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sampleRateCards.map((rateCard) => (
                    <SelectItem key={rateCard.id} value={rateCard.id}>
                      {rateCard.name} {rateCard.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          {scenarioResult && (
            <CardContent className="space-y-4">
              {/* Final Total Display */}
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-primary" aria-live="polite" aria-label="Total monthly cost">
                  {formatCurrency(scenarioResult.finalMonthlyCostCents)}
                </div>
                <div className="text-sm text-muted-foreground">per month</div>
              </div>
              
              {/* Cost Breakdown Table */}
              <Table>
                <TableBody>
                  {scenarioResult.lineItems.map((item, index) => (
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
                      {formatCurrency(scenarioResult.totalMonthlyCostCents)}
                    </TableCell>
                  </TableRow>
                  {scenarioResult.finalMonthlyCostCents > scenarioResult.totalMonthlyCostCents && (
                    <TableRow className="text-accent">
                      <TableCell>Monthly Minimum Applied</TableCell>
                      <TableCell className="text-right font-medium" aria-live="polite" aria-label="Monthly minimum adjustment">
                        +{formatCurrency(scenarioResult.finalMonthlyCostCents - scenarioResult.totalMonthlyCostCents)}
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
                      {formatCurrency(scenarioResult.breakdown.fulfillment.selectedBranchCents)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Shipping</div>
                    <div className="font-medium" aria-live="polite" aria-label="Shipping cost per order">
                      {formatCurrency(scenarioResult.breakdown.shipping.blendedCostPerOrderCents)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}