import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Save } from 'lucide-react';
import { ScopeInput, RateCard, QuoteCalculation } from '@/lib/types';
import { calculateQuote } from '@/lib/calculator';
import { sampleRateCards } from '@/lib/sampleData';
import { createRateCard } from '@/lib/api';
import { toast } from 'sonner';

interface ClientHarmonizationToolProps {
    rateCards: RateCard[];
    loading: boolean;
}

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

export default function ClientHarmonizationTool({ rateCards, loading }: ClientHarmonizationToolProps) {
    // State hooks for input data  
    const [targetMonthlyPrice, setTargetMonthlyPrice] = useState<number>(0);
    const [scope, setScope] = useState<ScopeInput>(initialScope);
    const [selectedRateCard, setSelectedRateCard] = useState<RateCard>(rateCards[0] || sampleRateCards[0]);

    // State hooks for results
    const [newCalculatedPrice, setNewCalculatedPrice] = useState<number>(0);
    const [difference, setDifference] = useState<number>(0);
    const [requiredLoyaltyDiscount, setRequiredLoyaltyDiscount] = useState<number>(0);
    const [analysisCompleted, setAnalysisCompleted] = useState<boolean>(false);
    const [scenarioResult, setScenarioResult] = useState<QuoteCalculation | null>(null);
    const [harmonizedRateCard, setHarmonizedRateCard] = useState<RateCard | null>(null);
    const [saving, setSaving] = useState<boolean>(false);

    // Handler Functions for scope changes
    const handleScopeChange = (category: keyof ScopeInput, field: string, value: number | string) => {
        setScope(prevScope => {
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

    // Core harmonization function as specified in the prompt
    const handleHarmonization = () => {
        if (!selectedRateCard || targetMonthlyPrice <= 0) return;

        // Calculate the new price using the calculateScenario engine
        const result = calculateQuote(selectedRateCard, scope);
        const newPriceCents = result.totalMonthlyCostCents;
        const newPrice = newPriceCents / 100; // Convert to dollars

        // Find the delta (difference)
        const delta = newPrice - targetMonthlyPrice;

        // Determine the required discount percentage
        const requiredDiscountPercent = newPrice > 0 ?
            parseFloat(((delta / newPrice) * 100).toFixed(2)) : 0;

        // Create harmonized rate card
        const harmonized: RateCard = {
            ...selectedRateCard,
            id: `harmonized-${Date.now()}`,
            name: `Harmonized ${selectedRateCard.name}`,
            version: 'v1.0.0',
            version_notes: `Harmonized rate card for target price: ${formatCurrency(targetMonthlyPrice)}`,
            // Apply discount adjustments to monthly minimum if needed
            monthly_minimum_cents: Math.max(
                selectedRateCard.monthly_minimum_cents,
                Math.round(targetMonthlyPrice * 100)
            )
        };

        // Update component state to display results
        setNewCalculatedPrice(newPrice);
        setDifference(delta);
        setRequiredLoyaltyDiscount(requiredDiscountPercent);
        setScenarioResult(result);
        setHarmonizedRateCard(harmonized);
        setAnalysisCompleted(true);
    };

    // Helper function to format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    // Handle saving harmonized rate card with flattened payload
    const handleSave = async () => {
        if (!harmonizedRateCard) {
            toast.error('No harmonized rate card to save');
            return;
        }

        try {
            setSaving(true);

            // Create payload with proper nested prices structure that matches API expectations
            const payload = {
                id: harmonizedRateCard.id,
                name: harmonizedRateCard.name,
                version: harmonizedRateCard.version,
                version_notes: harmonizedRateCard.version_notes,
                monthly_minimum_cents: harmonizedRateCard.monthly_minimum_cents,
                prices: harmonizedRateCard.prices // Keep nested structure
            };

            // Send properly structured payload to API
            await createRateCard(payload);

            toast.success('Harmonized rate card saved successfully!');
        } catch (error) {
            console.error('Failed to save harmonized rate card:', error);
            toast.error('Failed to save harmonized rate card: ' + (error as Error).message);
        } finally {
            setSaving(false);
        }
    };

    // Show loading state while rate cards are being fetched
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

    // Show error state if no rate cards are available
    if (!rateCards || rateCards.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">No rate cards available. Please check your connection.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight">Client Harmonization Tool</h1>
                <p className="text-muted-foreground">
                    Migrate existing clients to our new pricing model
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Input Information</h2>

                    {/* Target Monthly Price */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Target Monthly Price</CardTitle>
                            <CardDescription>Enter the client's current monthly bill</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="target-price">Target Monthly Price ($)</Label>
                                <Input
                                    id="target-price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={targetMonthlyPrice}
                                    onChange={e => setTargetMonthlyPrice(parseFloat(e.target.value) || 0)}
                                    placeholder="Enter target monthly price"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Basic Parameters */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Parameters</CardTitle>
                            <CardDescription>Enter the client's business scope</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="monthly-orders">Monthly Orders</Label>
                                    <Input
                                        id="monthly-orders"
                                        type="number"
                                        min="0"
                                        value={scope.monthlyOrders}
                                        onChange={e => handleTopLevelScopeChange('monthlyOrders', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="avg-units">Avg Units per Order</Label>
                                    <Input
                                        id="avg-units"
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={scope.averageUnitsPerOrder}
                                        onChange={e => handleTopLevelScopeChange('averageUnitsPerOrder', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="avg-value">Average Order Value ($)</Label>
                                    <Input
                                        id="avg-value"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={scope.averageOrderValue}
                                        onChange={e => handleTopLevelScopeChange('averageOrderValue', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="shipping-model">Shipping Model</Label>
                                    <Select
                                        value={scope.shippingModel}
                                        onValueChange={value => handleTopLevelScopeChange('shippingModel', value)}
                                    >
                                        <SelectTrigger id="shipping-model">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standard">Standard Rates</SelectItem>
                                            <SelectItem value="customerAccount">Customer Account</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Storage Profile */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Storage Profile</CardTitle>
                            <CardDescription>Average number of units in storage per month</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="small-units">Small Units</Label>
                                    <Input
                                        id="small-units"
                                        type="number"
                                        min="0"
                                        value={scope.storageRequirements.smallUnits}
                                        onChange={e => handleScopeChange('storageRequirements', 'smallUnits', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="medium-units">Medium Units</Label>
                                    <Input
                                        id="medium-units"
                                        type="number"
                                        min="0"
                                        value={scope.storageRequirements.mediumUnits}
                                        onChange={e => handleScopeChange('storageRequirements', 'mediumUnits', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="large-units">Large Units</Label>
                                    <Input
                                        id="large-units"
                                        type="number"
                                        min="0"
                                        value={scope.storageRequirements.largeUnits}
                                        onChange={e => handleScopeChange('storageRequirements', 'largeUnits', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pallets">Pallets</Label>
                                    <Input
                                        id="pallets"
                                        type="number"
                                        min="0"
                                        value={scope.storageRequirements.pallets}
                                        onChange={e => handleScopeChange('storageRequirements', 'pallets', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Shipping Profile */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Shipping Profile</CardTitle>
                            <CardDescription>Percentage mix of package sizes for outgoing orders</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="small-pct">Small (%)</Label>
                                    <Input
                                        id="small-pct"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={scope.shippingSizeMix.small}
                                        onChange={e => handleScopeChange('shippingSizeMix', 'small', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="medium-pct">Medium (%)</Label>
                                    <Input
                                        id="medium-pct"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={scope.shippingSizeMix.medium}
                                        onChange={e => handleScopeChange('shippingSizeMix', 'medium', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="large-pct">Large (%)</Label>
                                    <Input
                                        id="large-pct"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={scope.shippingSizeMix.large}
                                        onChange={e => handleScopeChange('shippingSizeMix', 'large', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Baseline Rate Card Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Baseline Rate Card</CardTitle>
                            <CardDescription>Choose a baseline rate card for calculation</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="rate-card-select">Select Rate Card</Label>
                                <Select
                                    value={selectedRateCard.id}
                                    onValueChange={(value) => {
                                        const rateCard = rateCards.find(rc => rc.id === value);
                                        if (rateCard) handleRateCardChange(rateCard);
                                    }}
                                >
                                    <SelectTrigger id="rate-card-select">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {rateCards.map((rateCard) => (
                                            <SelectItem key={rateCard.id} value={rateCard.id}>
                                                {rateCard.name} {rateCard.version}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Run Analysis Button */}
                    <Card>
                        <CardContent className="pt-6">
                            <Button
                                onClick={handleHarmonization}
                                className="w-full"
                                disabled={targetMonthlyPrice <= 0}
                            >
                                Run Analysis
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Results Section */}
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Analysis Results</h2>

                    {analysisCompleted && scenarioResult ? (
                        <>
                            {/* Detailed Results Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Cost Breakdown Analysis</CardTitle>
                                    <CardDescription>Detailed comparison of service costs under the new pricing model</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Service Category</TableHead>
                                                <TableHead className="text-right">New Model Est. Cost</TableHead>
                                                <TableHead>Notes</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {scenarioResult.lineItems.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.costCents / 100)}</TableCell>
                                                    <TableCell className="text-muted-foreground">-</TableCell>
                                                </TableRow>
                                            ))}
                                            {/* Subtotal Row */}
                                            <TableRow className="border-t-2 font-bold">
                                                <TableCell className="font-bold">Subtotal</TableCell>
                                                <TableCell className="text-right font-bold">{formatCurrency(scenarioResult.totalMonthlyCostCents / 100)}</TableCell>
                                                <TableCell>-</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Summary Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Harmonization Summary</CardTitle>
                                    <CardDescription>Key metrics for pricing migration decision</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="flex justify-between">
                                            <span className="font-medium">New Calculated Price:</span>
                                            <span className="text-lg font-bold">{formatCurrency(newCalculatedPrice)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium">Difference:</span>
                                            <span className={`text-lg font-bold ${difference >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium">Required Loyalty Discount:</span>
                                            <span className={`text-lg font-bold ${requiredLoyaltyDiscount >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {requiredLoyaltyDiscount.toFixed(2)}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Save Harmonized Rate Card Button */}
                                    <div className="pt-4 border-t">
                                        <Button
                                            onClick={handleSave}
                                            disabled={saving || !harmonizedRateCard}
                                            className="w-full"
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            {saving ? 'Saving...' : 'Save Harmonized Rate Card'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* High Discount Warning */}
                            {requiredLoyaltyDiscount > 20 && (
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>High Discount Warning:</strong> The required loyalty discount of {requiredLoyaltyDiscount.toFixed(2)}% exceeds the 20% threshold. This may require management approval.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-muted-foreground">Click "Run Analysis" to see harmonization results</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}