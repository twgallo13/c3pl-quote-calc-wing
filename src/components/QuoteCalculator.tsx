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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, FloppyDisk, Download, Warning } from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { RateCard, ScopeInput, QuoteCalculation, Quote } from '@/lib/types';
import { calculateQuote, formatCurrency, formatPercentage, normalizeShippingSizeMix } from '@/lib/calculator';
import { useRateCards } from '@/hooks/useRateCards';

// Alias for ScenarioResult to match requested naming
type ScenarioResult = QuoteCalculation;
// Alias for calculateScenario to match requested naming
const calculateScenario = calculateQuote;

export default function QuoteCalculator({ onQuoteCalculated }: {
  onQuoteCalculated?: (quote: Quote) => void;
}) {
  // Use the rate cards hook
  const { data: rateCards, loading, error } = useRateCards();

  // State hooks as requested
  const [scope, setScope] = useState<ScopeInput>(initialScope);
  const [selectedRateCard, setSelectedRateCard] = useState<RateCard | null>(null);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);

  // Additional state for UI functionality
  const [normalizationHint, setNormalizationHint] = useState<string>('');
  const [shippingMixTotal, setShippingMixTotal] = useState<number>(100);
  const [clientName, setClientName] = useState<string>('');
  const [quotes, setQuotes] = useState<Quote[]>([]);

  // Initialize selected rate card when data loads
  useEffect(() => {
    if (rateCards && rateCards.length > 0 && !selectedRateCard) {
      setSelectedRateCard(rateCards[0]);
    }
  }, [rateCards, selectedRateCard]);

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

  // Handle loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-muted border-t-primary"></div>
          <p className="text-muted-foreground">Loading rate cards...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <Alert className="max-w-md">
          <Warning className="h-4 w-4" />
          <AlertDescription>
            Failed to load rate cards. Please refresh the page to try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Handle empty state
  if (!rateCards || rateCards.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Alert className="max-w-md">
          <Warning className="h-4 w-4" />
          <AlertDescription>
            No rate cards available. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 md:p-6">
      {/* Left: Form */}
      <div className="space-y-4">
        <div className="rounded-2xl border p-4 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calculator size={20} />
              Quote Calculator
            </h3>
            <Button variant="outline" size="sm" onClick={() => setScope(initialScope)}>
              Reset
            </Button>
          </div>

          {/* Rate Card selector at top */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Select Rate Card</label>
            <Select
              value={selectedRateCard?.id || ''}
              onValueChange={(value) => {
                const rateCard = rateCards?.find(rc => rc.id === value);
                if (rateCard) handleRateCardChange(rateCard);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a rate card" />
              </SelectTrigger>
              <SelectContent>
                {(rateCards ?? []).map(rc => (
                  <SelectItem key={rc.id} value={rc.id}>
                    {rc.name}{rc.version ? ` v${rc.version}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loading && <p className="text-xs text-gray-500 mt-1">Loading rate cards…</p>}
            {error && <p className="text-xs text-red-600 mt-1">Couldn't load rate cards.</p>}
          </div>

          {/* Client Name */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Client Name (Optional)</label>
            <Input
              type="text"
              className="w-full px-3 py-2"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Enter client name"
            />
          </div>

          {/* Compact grid for the small fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Monthly Orders</label>
              <Input
                type="number"
                className="w-full px-3 py-2"
                min="0"
                value={scope.monthlyOrders}
                onChange={e => handleTopLevelScopeChange('monthlyOrders', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Avg Units / Order</label>
              <Input
                type="number"
                className="w-full px-3 py-2"
                step="0.1"
                min="0"
                value={scope.averageUnitsPerOrder}
                onChange={e => handleTopLevelScopeChange('averageUnitsPerOrder', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Avg Order Value ($)</label>
              <Input
                type="number"
                className="w-full px-3 py-2"
                step="0.01"
                min="0"
                value={scope.averageOrderValue}
                onChange={e => handleTopLevelScopeChange('averageOrderValue', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Shipping Model row */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Shipping Model</label>
              <Select
                value={scope.shippingModel}
                onValueChange={value => handleTopLevelScopeChange('shippingModel', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Rates</SelectItem>
                  <SelectItem value="customerAccount">Customer Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Storage inputs in a tight grid */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Storage Requirements</label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Small Units</label>
                <Input
                  type="number"
                  className="w-full px-3 py-2"
                  min="0"
                  value={scope.storageRequirements.smallUnits}
                  onChange={e => handleScopeChange('storageRequirements', 'smallUnits', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Medium Units</label>
                <Input
                  type="number"
                  className="w-full px-3 py-2"
                  min="0"
                  value={scope.storageRequirements.mediumUnits}
                  onChange={e => handleScopeChange('storageRequirements', 'mediumUnits', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Large Units</label>
                <Input
                  type="number"
                  className="w-full px-3 py-2"
                  min="0"
                  value={scope.storageRequirements.largeUnits}
                  onChange={e => handleScopeChange('storageRequirements', 'largeUnits', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Pallets</label>
                <Input
                  type="number"
                  className="w-full px-3 py-2"
                  min="0"
                  value={scope.storageRequirements.pallets}
                  onChange={e => handleScopeChange('storageRequirements', 'pallets', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Shipping Size Mix */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Shipping Size Mix (%)</label>
              <span
                className={`text-xs font-medium ${Math.abs(shippingMixTotal - 100) < 0.1
                  ? 'text-green-600'
                  : shippingMixTotal >= 99.5 && shippingMixTotal <= 100.5
                    ? 'text-amber-600'
                    : 'text-red-600'
                  }`}
              >
                Total: {shippingMixTotal.toFixed(1)}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Small (%)</label>
                <Input
                  type="number"
                  className="w-full px-3 py-2"
                  step="0.1"
                  min="0"
                  max="100"
                  value={scope.shippingSizeMix.small}
                  onChange={e => handleScopeChange('shippingSizeMix', 'small', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Medium (%)</label>
                <Input
                  type="number"
                  className="w-full px-3 py-2"
                  step="0.1"
                  min="0"
                  max="100"
                  value={scope.shippingSizeMix.medium}
                  onChange={e => handleScopeChange('shippingSizeMix', 'medium', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Large (%)</label>
                <Input
                  type="number"
                  className="w-full px-3 py-2"
                  step="0.1"
                  min="0"
                  max="100"
                  value={scope.shippingSizeMix.large}
                  onChange={e => handleScopeChange('shippingSizeMix', 'large', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            {normalizationHint && (
              <p className="text-xs text-gray-500 mt-1">{normalizationHint}</p>
            )}
          </div>

          {/* Action buttons */}
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
      </div>

      {/* Right: Estimate card */}
      <div className="lg:sticky lg:top-4">
        <Card>
          <CardHeader>
            <CardTitle>Quote Estimate</CardTitle>
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