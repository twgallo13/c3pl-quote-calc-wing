import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Check, Download, ArrowLeftRight, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QuoteCalculation, ScopeInput, RateCard } from '@/lib/types';
import { calculateQuote } from '@/lib/calculator';
import { APP_VERSION } from '@momentum/version';

interface ClientHarmonizationToolProps {
    rateCards: RateCard[];
    loading: boolean;
}

interface DiscountSettings {
    global: number;
    fulfillment: number;
    storage: number;
    shippingAndHandling: number;
}

interface QuoteBreakdown {
    fulfillmentCostCents: number;
    storageCostCents: number;
    shippingAndHandlingCostCents: number;
    totalMonthlyCostCents: number;
    effectiveMinimumCents: number;
}

interface DiscountWarning {
    type: 'high-discount';
    category: string;
    discount: number;
    threshold: number;
}



const DEFAULT_SCOPE: ScopeInput = {
    monthlyOrders: 1000,
    averageUnitsPerOrder: 2.5,
    averageOrderValue: 45.00,
    shippingModel: 'standard',
    shippingSizeMix: { small: 60, medium: 30, large: 10 },
    storageRequirements: { smallUnits: 100, mediumUnits: 50, largeUnits: 25, pallets: 2 }
};

const DEFAULT_DISCOUNT_SETTINGS: DiscountSettings = {
    global: 15, // 15% warning threshold
    fulfillment: 20,
    storage: 25,
    shippingAndHandling: 30
};

export function ClientHarmonizationTool({ rateCards, loading }: ClientHarmonizationToolProps) {
    const [sourceRateCard, setSourceRateCard] = useState<string>('');
    const [targetRateCard, setTargetRateCard] = useState<string>('');
    const [scope, setScope] = useState<ScopeInput>(DEFAULT_SCOPE);
    const [discountSettings, setDiscountSettings] = useState<DiscountSettings>(DEFAULT_DISCOUNT_SETTINGS);
    const [customDiscounts, setCustomDiscounts] = useState<Partial<DiscountSettings>>({});
    const [sourceQuote, setSourceQuote] = useState<QuoteBreakdown | null>(null);
    const [targetQuote, setTargetQuote] = useState<QuoteBreakdown | null>(null);
    const [harmonizedQuote, setHarmonizedQuote] = useState<QuoteBreakdown | null>(null);
    const [harmonizedRateCard, setHarmonizedRateCard] = useState<RateCard | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [clientName, setClientName] = useState('');
    const [notes, setNotes] = useState('');
    
    // Additional state variables as specified in the prompt
    const [newPrice, setNewPrice] = useState<number>(0);
    const [delta, setDelta] = useState<number>(0);
    const [requiredDiscount, setRequiredDiscount] = useState<number>(0);

    const sourceCard = rateCards.find(card => card.id === sourceRateCard);
    const targetCard = rateCards.find(card => card.id === targetRateCard);

    // Calculate quotes when rate cards or scope changes
    useEffect(() => {
        if (sourceRateCard && scope) {
            calculateQuoteLocal(sourceRateCard, setSourceQuote);
        }
    }, [sourceRateCard, scope, rateCards]);

    useEffect(() => {
        if (targetRateCard && scope) {
            calculateQuoteLocal(targetRateCard, setTargetQuote);
        }
    }, [targetRateCard, scope, rateCards]);

    const calculateQuoteLocal = (rateCardId: string, setQuote: (quote: QuoteBreakdown) => void) => {
        try {
            setActionLoading(true);
            const rateCard = rateCards.find(card => card.id === rateCardId);
            if (!rateCard) return;

            const result = calculateQuote(rateCard, scope);

            // Convert calculator response to our expected format
            const adaptedQuote: QuoteBreakdown = {
                fulfillmentCostCents: result.fulfillmentCostCents,
                storageCostCents: result.storageCostCents,
                shippingAndHandlingCostCents: result.shippingCostCents,
                totalMonthlyCostCents: result.totalMonthlyCostCents,
                effectiveMinimumCents: result.finalMonthlyCostCents
            };

            setQuote(adaptedQuote);
        } catch (error) {
            console.error('Failed to calculate quote:', error);
        } finally {
            setActionLoading(false);
        }
    };

    // Core harmonization logic as specified in the prompt
    const handleHarmonization = () => {
        const targetPrice = targetQuote?.totalMonthlyCostCents || 0;
        const clientScope = scope;
        const baselineRateCard = rateCards.find(card => card.id === sourceRateCard);
        
        if (!baselineRateCard || !targetPrice || !clientScope) return;

        // Convert target price to cents (already in cents)
        const targetPriceCents = targetPrice;

        // Call the calculateQuote function using the scope and baseline card
        const result = calculateQuote(baselineRateCard, clientScope);

        // From the result, get the newPriceCents
        const newPriceCents = result.totalMonthlyCostCents;

        // Calculate the difference
        const deltaCents = newPriceCents - targetPriceCents;

        // Calculate the required discount percentage (handle division by zero)
        const requiredDiscountPercent = newPriceCents > 0 ? 
            parseFloat(((deltaCents / newPriceCents) * 100).toFixed(2)) : 0;

        // Update the component's state with all the new values
        setNewPrice(newPriceCents / 100); // Convert to dollars for display
        setDelta(deltaCents / 100); // Convert to dollars for display
        setRequiredDiscount(requiredDiscountPercent);

        // Create a new harmonizedRateCard object by deep-copying the baselineRateCard
        const harmonized: RateCard = {
            ...baselineRateCard,
            id: `rc-harmonized-${Date.now()}`,
            name: `${clientName || 'Custom'} Harmonized Plan`,
            version: 'v1.0.0',
            // Add a "Loyalty Transition Discount" by adjusting the monthly minimum
            monthly_minimum_cents: Math.max(0, baselineRateCard.monthly_minimum_cents + deltaCents)
        };

        setHarmonizedRateCard(harmonized);
    };

    // Calculate discount percentages
    const discountAnalysis = useMemo(() => {
        if (!sourceQuote || !targetQuote) return null;

        const fulfillmentDiscount = ((sourceQuote.fulfillmentCostCents - targetQuote.fulfillmentCostCents) / sourceQuote.fulfillmentCostCents) * 100;
        const storageDiscount = ((sourceQuote.storageCostCents - targetQuote.storageCostCents) / sourceQuote.storageCostCents) * 100;
        const shippingDiscount = ((sourceQuote.shippingAndHandlingCostCents - targetQuote.shippingAndHandlingCostCents) / sourceQuote.shippingAndHandlingCostCents) * 100;
        const totalDiscount = ((sourceQuote.totalMonthlyCostCents - targetQuote.totalMonthlyCostCents) / sourceQuote.totalMonthlyCostCents) * 100;

        return {
            fulfillment: fulfillmentDiscount,
            storage: storageDiscount,
            shippingAndHandling: shippingDiscount,
            total: totalDiscount
        };
    }, [sourceQuote, targetQuote]);

    // Check for warning flags
    const warnings = useMemo(() => {
        if (!discountAnalysis) return [];

        const warningsList: DiscountWarning[] = [];

        if (Math.abs(discountAnalysis.total) > discountSettings.global) {
            warningsList.push({
                type: 'high-discount',
                category: 'Total',
                discount: discountAnalysis.total,
                threshold: discountSettings.global
            });
        }

        if (Math.abs(discountAnalysis.fulfillment) > discountSettings.fulfillment) {
            warningsList.push({
                type: 'high-discount',
                category: 'Fulfillment',
                discount: discountAnalysis.fulfillment,
                threshold: discountSettings.fulfillment
            });
        }

        if (Math.abs(discountAnalysis.storage) > discountSettings.storage) {
            warningsList.push({
                type: 'high-discount',
                category: 'Storage',
                discount: discountAnalysis.storage,
                threshold: discountSettings.storage
            });
        }

        if (Math.abs(discountAnalysis.shippingAndHandling) > discountSettings.shippingAndHandling) {
            warningsList.push({
                type: 'high-discount',
                category: 'Shipping & Handling',
                discount: discountAnalysis.shippingAndHandling,
                threshold: discountSettings.shippingAndHandling
            });
        }

        return warningsList;
    }, [discountAnalysis, discountSettings]);

    // Generate harmonized rate card
    const generateHarmonizedRateCard = () => {
        if (!sourceCard || !targetCard || !sourceQuote || !targetQuote) return;

        // Create a new rate card based on the source but adjusted to match target pricing
        const harmonized: RateCard = {
            id: `rc-harmonized-${Date.now()}`,
            name: `${clientName || 'Custom'} Harmonized Plan`,
            version: 'v1.0.0',
            monthly_minimum_cents: targetCard.monthly_minimum_cents,
            prices: {
                fulfillment: {
                    aovPercentage: targetCard.prices.fulfillment.aovPercentage * (1 - (customDiscounts.fulfillment || 0) / 100),
                    baseFeeCents: Math.round(targetCard.prices.fulfillment.baseFeeCents * (1 - (customDiscounts.fulfillment || 0) / 100)),
                    perAdditionalUnitCents: Math.round(targetCard.prices.fulfillment.perAdditionalUnitCents * (1 - (customDiscounts.fulfillment || 0) / 100))
                },
                storage: {
                    smallUnitCents: Math.round(targetCard.prices.storage.smallUnitCents * (1 - (customDiscounts.storage || 0) / 100)),
                    mediumUnitCents: Math.round(targetCard.prices.storage.mediumUnitCents * (1 - (customDiscounts.storage || 0) / 100)),
                    largeUnitCents: Math.round(targetCard.prices.storage.largeUnitCents * (1 - (customDiscounts.storage || 0) / 100)),
                    palletCents: Math.round(targetCard.prices.storage.palletCents * (1 - (customDiscounts.storage || 0) / 100))
                },
                shippingAndHandling: {
                    standard: {
                        smallPackageCents: Math.round(targetCard.prices.shippingAndHandling.standard.smallPackageCents * (1 - (customDiscounts.shippingAndHandling || 0) / 100)),
                        mediumPackageCents: Math.round(targetCard.prices.shippingAndHandling.standard.mediumPackageCents * (1 - (customDiscounts.shippingAndHandling || 0) / 100)),
                        largePackageCents: Math.round(targetCard.prices.shippingAndHandling.standard.largePackageCents * (1 - (customDiscounts.shippingAndHandling || 0) / 100))
                    },
                    customerAccount: {
                        smallPackageCents: Math.round(targetCard.prices.shippingAndHandling.customerAccount.smallPackageCents * (1 - (customDiscounts.shippingAndHandling || 0) / 100)),
                        mediumPackageCents: Math.round(targetCard.prices.shippingAndHandling.customerAccount.mediumPackageCents * (1 - (customDiscounts.shippingAndHandling || 0) / 100)),
                        largePackageCents: Math.round(targetCard.prices.shippingAndHandling.customerAccount.largePackageCents * (1 - (customDiscounts.shippingAndHandling || 0) / 100))
                    }
                }
            }
        };

        setHarmonizedRateCard(harmonized);

        // Calculate quote for harmonized rate card (simulate)
        // In a real implementation, this would use the actual calculation engine
        const harmonizedBreakdown: QuoteBreakdown = {
            fulfillmentCostCents: Math.round(targetQuote.fulfillmentCostCents * (1 - (customDiscounts.fulfillment || 0) / 100)),
            storageCostCents: Math.round(targetQuote.storageCostCents * (1 - (customDiscounts.storage || 0) / 100)),
            shippingAndHandlingCostCents: Math.round(targetQuote.shippingAndHandlingCostCents * (1 - (customDiscounts.shippingAndHandling || 0) / 100)),
            totalMonthlyCostCents: 0,
            effectiveMinimumCents: harmonized.monthly_minimum_cents
        };

        harmonizedBreakdown.totalMonthlyCostCents = harmonizedBreakdown.fulfillmentCostCents +
            harmonizedBreakdown.storageCostCents + harmonizedBreakdown.shippingAndHandlingCostCents;

        setHarmonizedQuote(harmonizedBreakdown);
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(cents / 100);
    };

    const formatPercentage = (value: number) => {
        return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    };

    // Show loading state while rate cards are being fetched
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                    <ArrowLeftRight className="h-12 w-12 text-muted-foreground mx-auto animate-pulse" />
                    <p className="text-muted-foreground">Loading rate cards...</p>
                </div>
            </div>
        );
    }

    const downloadHarmonizationReport = () => {
        if (!harmonizedRateCard || !sourceQuote || !targetQuote || !harmonizedQuote) return;

        const report = {
            clientName: clientName || 'Unnamed Client',
            timestamp: new Date().toISOString(),
            appVersion: APP_VERSION,
            sourceRateCard: sourceCard?.name,
            targetRateCard: targetCard?.name,
            harmonizedRateCard: harmonizedRateCard.name,
            scope,
            originalCost: formatCurrency(sourceQuote.totalMonthlyCostCents),
            targetCost: formatCurrency(targetQuote.totalMonthlyCostCents),
            harmonizedCost: formatCurrency(harmonizedQuote.totalMonthlyCostCents),
            discountAnalysis,
            warnings,
            notes,
            customDiscounts
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `harmonization-report-${clientName || 'client'}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const exportHarmonizationSummary = () => {
        if (!sourceCard || !targetCard || !sourceQuote || !targetQuote || !discountAnalysis) return;

        const currentDate = new Date().toLocaleDateString();
        const currentTime = new Date().toLocaleTimeString();

        const htmlReport = `
<!DOCTYPE html>
<html>
<head>
    <title>Client Harmonization Summary Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
        .section { margin: 20px 0; }
        .section-title { color: #007bff; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .comparison-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .comparison-table th, .comparison-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .comparison-table th { background-color: #f8f9fa; font-weight: bold; }
        .warning { color: #dc3545; font-weight: bold; }
        .success { color: #28a745; }
        .info-box { background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 15px 0; }
        .discount-high { background-color: #fff3cd; border-left: 4px solid #ffc107; }
        .discount-critical { background-color: #f8d7da; border-left: 4px solid #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Client Harmonization Summary Report</h1>
        <p><strong>Client:</strong> ${clientName || 'Unnamed Client'} | <strong>Generated:</strong> ${currentDate} at ${currentTime}</p>
        <p><strong>App Version:</strong> ${APP_VERSION}</p>
    </div>

    <div class="section">
        <div class="section-title">Rate Card Comparison</div>
        <table class="comparison-table">
            <tr>
                <th>Attribute</th>
                <th>Source Rate Card</th>
                <th>Target Rate Card</th>
                <th>Discount %</th>
                <th>Status</th>
            </tr>
            <tr>
                <td><strong>Rate Card Name</strong></td>
                <td>${sourceCard.name} (${sourceCard.version})</td>
                <td>${targetCard.name} (${targetCard.version})</td>
                <td>-</td>
                <td>-</td>
            </tr>
            <tr>
                <td><strong>Fulfillment Cost</strong></td>
                <td>${formatCurrency(sourceQuote.fulfillmentCostCents)}</td>
                <td>${formatCurrency(targetQuote.fulfillmentCostCents)}</td>
                <td>${formatPercentage(discountAnalysis.fulfillment)}</td>
                <td class="${Math.abs(discountAnalysis.fulfillment) > discountSettings.fulfillment ? 'warning' : 'success'}">
                    ${Math.abs(discountAnalysis.fulfillment) > discountSettings.fulfillment ? '⚠️ Above Threshold' : '✅ Within Limits'}
                </td>
            </tr>
            <tr>
                <td><strong>Storage Cost</strong></td>
                <td>${formatCurrency(sourceQuote.storageCostCents)}</td>
                <td>${formatCurrency(targetQuote.storageCostCents)}</td>
                <td>${formatPercentage(discountAnalysis.storage)}</td>
                <td class="${Math.abs(discountAnalysis.storage) > discountSettings.storage ? 'warning' : 'success'}">
                    ${Math.abs(discountAnalysis.storage) > discountSettings.storage ? '⚠️ Above Threshold' : '✅ Within Limits'}
                </td>
            </tr>
            <tr>
                <td><strong>Shipping & Handling</strong></td>
                <td>${formatCurrency(sourceQuote.shippingAndHandlingCostCents)}</td>
                <td>${formatCurrency(targetQuote.shippingAndHandlingCostCents)}</td>
                <td>${formatPercentage(discountAnalysis.shippingAndHandling)}</td>
                <td class="${Math.abs(discountAnalysis.shippingAndHandling) > discountSettings.shippingAndHandling ? 'warning' : 'success'}">
                    ${Math.abs(discountAnalysis.shippingAndHandling) > discountSettings.shippingAndHandling ? '⚠️ Above Threshold' : '✅ Within Limits'}
                </td>
            </tr>
            <tr style="font-weight: bold; background-color: #f8f9fa;">
                <td><strong>Total Monthly Cost</strong></td>
                <td>${formatCurrency(sourceQuote.totalMonthlyCostCents)}</td>
                <td>${formatCurrency(targetQuote.totalMonthlyCostCents)}</td>
                <td>${formatPercentage(discountAnalysis.total)}</td>
                <td class="${Math.abs(discountAnalysis.total) > discountSettings.global ? 'warning' : 'success'}">
                    ${Math.abs(discountAnalysis.total) > discountSettings.global ? '⚠️ Above Threshold' : '✅ Within Limits'}
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Client Scope Parameters</div>
        <div class="info-box">
            <p><strong>Monthly Orders:</strong> ${scope.monthlyOrders.toLocaleString()}</p>
            <p><strong>Average Units per Order:</strong> ${scope.averageUnitsPerOrder}</p>
            <p><strong>Average Order Value:</strong> $${scope.averageOrderValue}</p>
            <p><strong>Shipping Model:</strong> ${scope.shippingModel}</p>
            <p><strong>Shipping Size Mix:</strong> Small: ${scope.shippingSizeMix.small}%, Medium: ${scope.shippingSizeMix.medium}%, Large: ${scope.shippingSizeMix.large}%</p>
        </div>
    </div>

    ${warnings.length > 0 ? `
    <div class="section">
        <div class="section-title">⚠️ High Discount Warnings</div>
        ${warnings.map(warning => `
        <div class="${Math.abs(warning.discount) > warning.threshold * 1.5 ? 'info-box discount-critical' : 'info-box discount-high'}">
            <strong>${warning.category}:</strong> ${formatPercentage(warning.discount)} discount exceeds threshold of ${warning.threshold}%
        </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="section">
        <div class="section-title">Applied Custom Discounts</div>
        <div class="info-box">
            <p><strong>Fulfillment Discount:</strong> ${customDiscounts.fulfillment || 0}%</p>
            <p><strong>Storage Discount:</strong> ${customDiscounts.storage || 0}%</p>
            <p><strong>Shipping & Handling Discount:</strong> ${customDiscounts.shippingAndHandling || 0}%</p>
            <p><strong>Global Discount:</strong> ${customDiscounts.global || 0}%</p>
        </div>
    </div>

    ${notes ? `
    <div class="section">
        <div class="section-title">Migration Notes</div>
        <div class="info-box">
            <p>${notes}</p>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <div class="section-title">Discount Threshold Configuration</div>
        <div class="info-box">
            <p><strong>Global Warning Threshold:</strong> ${discountSettings.global}%</p>
            <p><strong>Fulfillment Warning Threshold:</strong> ${discountSettings.fulfillment}%</p>
            <p><strong>Storage Warning Threshold:</strong> ${discountSettings.storage}%</p>
            <p><strong>Shipping & Handling Warning Threshold:</strong> ${discountSettings.shippingAndHandling}%</p>
        </div>
    </div>

    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
        <p>Generated by C3PL Quote Calculator ${APP_VERSION} on ${currentDate} at ${currentTime}</p>
    </footer>
</body>
</html>`;

        const blob = new Blob([htmlReport], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `harmonization-summary-${clientName || 'client'}-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Client Harmonization Tool</h1>
                    <p className="text-muted-foreground">
                        Strategic tool for migrating clients with side-by-side comparison and precision discounting
                    </p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-2" />
                            Discount Settings
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>High Discount Warning Thresholds</DialogTitle>
                            <DialogDescription>
                                Configure warning thresholds for discount percentages (MOM-6 Resolution)
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="global-threshold">Global Default (%)</Label>
                                <Input
                                    id="global-threshold"
                                    type="number"
                                    value={discountSettings.global}
                                    onChange={(e) => setDiscountSettings(prev => ({ ...prev, global: Number(e.target.value) }))}
                                />
                            </div>
                            <div>
                                <Label htmlFor="fulfillment-threshold">Fulfillment (%)</Label>
                                <Input
                                    id="fulfillment-threshold"
                                    type="number"
                                    value={discountSettings.fulfillment}
                                    onChange={(e) => setDiscountSettings(prev => ({ ...prev, fulfillment: Number(e.target.value) }))}
                                />
                            </div>
                            <div>
                                <Label htmlFor="storage-threshold">Storage (%)</Label>
                                <Input
                                    id="storage-threshold"
                                    type="number"
                                    value={discountSettings.storage}
                                    onChange={(e) => setDiscountSettings(prev => ({ ...prev, storage: Number(e.target.value) }))}
                                />
                            </div>
                            <div>
                                <Label htmlFor="shipping-threshold">Shipping & Handling (%)</Label>
                                <Input
                                    id="shipping-threshold"
                                    type="number"
                                    value={discountSettings.shippingAndHandling}
                                    onChange={(e) => setDiscountSettings(prev => ({ ...prev, shippingAndHandling: Number(e.target.value) }))}
                                />
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Client Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="client-name">Client Name</Label>
                            <Input
                                id="client-name"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="Enter client name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Input
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Migration notes"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Warning Flags */}
            {warnings.length > 0 && (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>High Discount Warnings:</strong>
                        <ul className="mt-2 space-y-1">
                            {warnings.map((warning, index) => (
                                <li key={index}>
                                    {warning.category}: {formatPercentage(warning.discount)}
                                    (threshold: {warning.threshold}%)
                                </li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="comparison" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="comparison">Side-by-Side Comparison</TabsTrigger>
                    <TabsTrigger value="tuning">Interactive Tuning</TabsTrigger>
                    <TabsTrigger value="output">Harmonization Output</TabsTrigger>
                </TabsList>

                <TabsContent value="comparison" className="space-y-6">
                    {/* Rate Card Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    Source Rate Card
                                    <Badge variant="secondary">Current</Badge>
                                </CardTitle>
                                <CardDescription>Client's current rate card</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Select value={sourceRateCard} onValueChange={setSourceRateCard}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select source rate card" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {rateCards.map((card) => (
                                            <SelectItem key={card.id} value={card.id}>
                                                {card.name} ({card.version})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    Target Rate Card
                                    <Badge variant="outline">Migration Target</Badge>
                                </CardTitle>
                                <CardDescription>Desired rate card for migration</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Select value={targetRateCard} onValueChange={setTargetRateCard}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select target rate card" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {rateCards.map((card) => (
                                            <SelectItem key={card.id} value={card.id}>
                                                {card.name} ({card.version})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Scope Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Client Scope Parameters</CardTitle>
                            <CardDescription>Configure the client's shipping and order profile</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="monthly-orders">Monthly Orders</Label>
                                    <Input
                                        id="monthly-orders"
                                        type="number"
                                        value={scope.monthlyOrders}
                                        onChange={(e) => setScope(prev => ({ ...prev, monthlyOrders: Number(e.target.value) }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="avg-units">Avg Units per Order</Label>
                                    <Input
                                        id="avg-units"
                                        type="number"
                                        step="0.1"
                                        value={scope.averageUnitsPerOrder}
                                        onChange={(e) => setScope(prev => ({ ...prev, averageUnitsPerOrder: Number(e.target.value) }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="avg-value">Avg Order Value ($)</Label>
                                    <Input
                                        id="avg-value"
                                        type="number"
                                        step="0.01"
                                        value={scope.averageOrderValue}
                                        onChange={(e) => setScope(prev => ({ ...prev, averageOrderValue: Number(e.target.value) }))}
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <Label>Shipping Model</Label>
                                <Select
                                    value={scope.shippingModel}
                                    onValueChange={(value: 'standard' | 'customerAccount') =>
                                        setScope(prev => ({ ...prev, shippingModel: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="standard">Standard</SelectItem>
                                        <SelectItem value="customerAccount">Customer Account</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="mt-4 space-y-3">
                                <Label>Shipping Size Mix (%)</Label>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label className="text-sm">Small: {scope.shippingSizeMix.small}%</Label>
                                        <Slider
                                            value={[scope.shippingSizeMix.small]}
                                            onValueChange={([value]) =>
                                                setScope(prev => ({
                                                    ...prev,
                                                    shippingSizeMix: { ...prev.shippingSizeMix, small: value }
                                                }))
                                            }
                                            max={100}
                                            step={1}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm">Medium: {scope.shippingSizeMix.medium}%</Label>
                                        <Slider
                                            value={[scope.shippingSizeMix.medium]}
                                            onValueChange={([value]) =>
                                                setScope(prev => ({
                                                    ...prev,
                                                    shippingSizeMix: { ...prev.shippingSizeMix, medium: value }
                                                }))
                                            }
                                            max={100}
                                            step={1}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm">Large: {scope.shippingSizeMix.large}%</Label>
                                        <Slider
                                            value={[scope.shippingSizeMix.large]}
                                            onValueChange={([value]) =>
                                                setScope(prev => ({
                                                    ...prev,
                                                    shippingSizeMix: { ...prev.shippingSizeMix, large: value }
                                                }))
                                            }
                                            max={100}
                                            step={1}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Export Summary Button for Comparison */}
                    {sourceQuote && targetQuote && discountAnalysis && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Export Comparison Report</CardTitle>
                                <CardDescription>Generate a summary report of the rate card comparison and discount analysis</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={exportHarmonizationSummary} className="w-full">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export Summary Report (HTML)
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Cost Comparison */}
                    {sourceQuote && targetQuote && discountAnalysis && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Source Quote Breakdown</CardTitle>
                                    <CardDescription>{sourceCard?.name}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between">
                                        <span>Fulfillment:</span>
                                        <span>{formatCurrency(sourceQuote.fulfillmentCostCents)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Storage:</span>
                                        <span>{formatCurrency(sourceQuote.storageCostCents)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Shipping & Handling:</span>
                                        <span>{formatCurrency(sourceQuote.shippingAndHandlingCostCents)}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-semibold">
                                        <span>Total Monthly Cost:</span>
                                        <span>{formatCurrency(sourceQuote.totalMonthlyCostCents)}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Target Quote Breakdown</CardTitle>
                                    <CardDescription>{targetCard?.name}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between">
                                        <span>Fulfillment:</span>
                                        <div className="text-right">
                                            <span>{formatCurrency(targetQuote.fulfillmentCostCents)}</span>
                                            <div className="flex items-center gap-1 ml-2">
                                                {Math.abs(discountAnalysis.fulfillment) > discountSettings.fulfillment && (
                                                    <AlertTriangle className="h-3 w-3 text-destructive" />
                                                )}
                                                <Badge
                                                    variant={Math.abs(discountAnalysis.fulfillment) > discountSettings.fulfillment ? "destructive" : "secondary"}
                                                >
                                                    {formatPercentage(discountAnalysis.fulfillment)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Storage:</span>
                                        <div className="text-right">
                                            <span>{formatCurrency(targetQuote.storageCostCents)}</span>
                                            <div className="flex items-center gap-1 ml-2">
                                                {Math.abs(discountAnalysis.storage) > discountSettings.storage && (
                                                    <AlertTriangle className="h-3 w-3 text-destructive" />
                                                )}
                                                <Badge
                                                    variant={Math.abs(discountAnalysis.storage) > discountSettings.storage ? "destructive" : "secondary"}
                                                >
                                                    {formatPercentage(discountAnalysis.storage)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Shipping & Handling:</span>
                                        <div className="text-right">
                                            <span>{formatCurrency(targetQuote.shippingAndHandlingCostCents)}</span>
                                            <div className="flex items-center gap-1 ml-2">
                                                {Math.abs(discountAnalysis.shippingAndHandling) > discountSettings.shippingAndHandling && (
                                                    <AlertTriangle className="h-3 w-3 text-destructive" />
                                                )}
                                                <Badge
                                                    variant={Math.abs(discountAnalysis.shippingAndHandling) > discountSettings.shippingAndHandling ? "destructive" : "secondary"}
                                                >
                                                    {formatPercentage(discountAnalysis.shippingAndHandling)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-semibold">
                                        <span>Total Monthly Cost:</span>
                                        <div className="text-right">
                                            <span>{formatCurrency(targetQuote.totalMonthlyCostCents)}</span>
                                            <div className="flex items-center gap-1 ml-2">
                                                {Math.abs(discountAnalysis.total) > discountSettings.global && (
                                                    <AlertTriangle className="h-3 w-3 text-destructive" />
                                                )}
                                                <Badge
                                                    variant={Math.abs(discountAnalysis.total) > discountSettings.global ? "destructive" : "secondary"}
                                                >
                                                    {formatPercentage(discountAnalysis.total)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="tuning" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Precision Discounting Controls</CardTitle>
                            <CardDescription>Fine-tune discounts for each service category</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label>Fulfillment Discount: {customDiscounts.fulfillment || 0}%</Label>
                                    <Slider
                                        value={[customDiscounts.fulfillment || 0]}
                                        onValueChange={([value]) =>
                                            setCustomDiscounts(prev => ({ ...prev, fulfillment: value }))
                                        }
                                        max={50}
                                        step={0.5}
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label>Storage Discount: {customDiscounts.storage || 0}%</Label>
                                    <Slider
                                        value={[customDiscounts.storage || 0]}
                                        onValueChange={([value]) =>
                                            setCustomDiscounts(prev => ({ ...prev, storage: value }))
                                        }
                                        max={50}
                                        step={0.5}
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label>Shipping & Handling Discount: {customDiscounts.shippingAndHandling || 0}%</Label>
                                    <Slider
                                        value={[customDiscounts.shippingAndHandling || 0]}
                                        onValueChange={([value]) =>
                                            setCustomDiscounts(prev => ({ ...prev, shippingAndHandling: value }))
                                        }
                                        max={50}
                                        step={0.5}
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label>Global Discount: {customDiscounts.global || 0}%</Label>
                                    <Slider
                                        value={[customDiscounts.global || 0]}
                                        onValueChange={([value]) =>
                                            setCustomDiscounts(prev => ({ ...prev, global: value }))
                                        }
                                        max={50}
                                        step={0.5}
                                        className="mt-2"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-center gap-4">
                                <Button onClick={handleHarmonization} disabled={!sourceRateCard || !targetRateCard}>
                                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                                    Calculate Harmonization
                                </Button>
                                <Button onClick={generateHarmonizedRateCard} disabled={!sourceRateCard || !targetRateCard} variant="outline">
                                    Generate Rate Card
                                </Button>
                            </div>

                            {/* Harmonization Results */}
                            {(newPrice > 0 || delta !== 0 || requiredDiscount !== 0) && (
                                <Card className="mt-6">
                                    <CardHeader>
                                        <CardTitle>Harmonization Analysis</CardTitle>
                                        <CardDescription>Calculated harmonization metrics</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="text-center">
                                                <Label className="text-sm text-muted-foreground">New Price</Label>
                                                <div className="text-2xl font-bold">{formatCurrency(newPrice * 100)}</div>
                                            </div>
                                            <div className="text-center">
                                                <Label className="text-sm text-muted-foreground">Delta</Label>
                                                <div className={`text-2xl font-bold ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {delta >= 0 ? '+' : ''}{formatCurrency(delta * 100)}
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <Label className="text-sm text-muted-foreground">Required Discount</Label>
                                                <div className={`text-2xl font-bold ${requiredDiscount >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {requiredDiscount.toFixed(2)}%
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="output" className="space-y-6">
                    {harmonizedRateCard && harmonizedQuote ? (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Check className="h-5 w-5 text-green-600" />
                                        Harmonized Rate Card Generated
                                    </CardTitle>
                                    <CardDescription>
                                        Client-specific rate card: {harmonizedRateCard.name}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="font-semibold mb-3">Rate Card Details</h4>
                                            <div className="space-y-2 text-sm">
                                                <div><strong>ID:</strong> {harmonizedRateCard.id}</div>
                                                <div><strong>Version:</strong> {harmonizedRateCard.version}</div>
                                                <div><strong>Monthly Minimum:</strong> {formatCurrency(harmonizedRateCard.monthly_minimum_cents)}</div>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-3">Cost Breakdown</h4>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <span>Fulfillment:</span>
                                                    <span>{formatCurrency(harmonizedQuote.fulfillmentCostCents)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Storage:</span>
                                                    <span>{formatCurrency(harmonizedQuote.storageCostCents)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Shipping & Handling:</span>
                                                    <span>{formatCurrency(harmonizedQuote.shippingAndHandlingCostCents)}</span>
                                                </div>
                                                <Separator />
                                                <div className="flex justify-between font-semibold">
                                                    <span>Total Monthly Cost:</span>
                                                    <span>{formatCurrency(harmonizedQuote.totalMonthlyCostCents)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Harmonization Summary Report</CardTitle>
                                    <CardDescription>Export detailed report for audit purposes (PDF generation)</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Generate a comprehensive report including all discount analysis,
                                                rate card comparisons, and harmonization decisions.
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={exportHarmonizationSummary} variant="default">
                                                <Download className="h-4 w-4 mr-2" />
                                                Export Summary (HTML)
                                            </Button>
                                            <Button onClick={downloadHarmonizationReport} variant="outline">
                                                <Download className="h-4 w-4 mr-2" />
                                                Download Report (JSON)
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Card>
                            <CardContent className="flex items-center justify-center py-12">
                                <div className="text-center space-y-4">
                                    <ArrowLeftRight className="h-12 w-12 text-muted-foreground mx-auto" />
                                    <div>
                                        <h3 className="font-semibold">No Harmonized Rate Card</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Use the Interactive Tuning tab to generate a harmonized rate card
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}