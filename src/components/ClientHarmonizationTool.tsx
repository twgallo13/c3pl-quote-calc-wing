import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTriangle, Check, Download, ArrowLeftRight, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { fetchQuotePreview } from '@/lib/api';
import { APP_VERSION } from '@momentum/version';

interface RateCard {
    id: string;
    name: string;
    version: string;
    monthly_minimum_cents: number;
    prices: {
        fulfillment: {
            aovPercentage: number;
            baseFeeCents: number;
            perAdditionalUnitCents: number;
        };
        storage: {
            smallUnitCents: number;
            mediumUnitCents: number;
            largeUnitCents: number;
            palletCents: number;
        };
        shippingAndHandling: {
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
        };
    };
}

interface ScopeInput {
    monthlyOrders: number;
    averageUnitsPerOrder: number;
    averageOrderValue: number;
    shippingModel: 'standard' | 'customerAccount';
    shippingSizeMix: {
        small: number;
        medium: number;
        large: number;
    };
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

const SAMPLE_RATE_CARDS: RateCard[] = [
    {
        id: "rc-startup-2025",
        name: "Startup Plan 2025",
        version: "v1.0.0",
        monthly_minimum_cents: 150000,
        prices: {
            fulfillment: { aovPercentage: 0.05, baseFeeCents: 275, perAdditionalUnitCents: 95 },
            storage: { smallUnitCents: 80, mediumUnitCents: 160, largeUnitCents: 275, palletCents: 8500 },
            shippingAndHandling: {
                standard: { smallPackageCents: 325, mediumPackageCents: 650, largePackageCents: 1250 },
                customerAccount: { smallPackageCents: 100, mediumPackageCents: 150, largePackageCents: 275 }
            }
        }
    },
    {
        id: "rc-growth-2025",
        name: "Growth Plan 2025",
        version: "v1.0.0",
        monthly_minimum_cents: 300000,
        prices: {
            fulfillment: { aovPercentage: 0.05, baseFeeCents: 250, perAdditionalUnitCents: 75 },
            storage: { smallUnitCents: 75, mediumUnitCents: 150, largeUnitCents: 250, palletCents: 7500 },
            shippingAndHandling: {
                standard: { smallPackageCents: 300, mediumPackageCents: 600, largePackageCents: 1200 },
                customerAccount: { smallPackageCents: 75, mediumPackageCents: 125, largePackageCents: 250 }
            }
        }
    },
    {
        id: "rc-enterprise-2025",
        name: "Enterprise Plan 2025",
        version: "v1.0.0",
        monthly_minimum_cents: 750000,
        prices: {
            fulfillment: { aovPercentage: 0.04, baseFeeCents: 200, perAdditionalUnitCents: 50 },
            storage: { smallUnitCents: 60, mediumUnitCents: 120, largeUnitCents: 200, palletCents: 6000 },
            shippingAndHandling: {
                standard: { smallPackageCents: 285, mediumPackageCents: 585, largePackageCents: 1185 },
                customerAccount: { smallPackageCents: 50, mediumPackageCents: 100, largePackageCents: 225 }
            }
        }
    }
];

const DEFAULT_SCOPE: ScopeInput = {
    monthlyOrders: 1000,
    averageUnitsPerOrder: 2.5,
    averageOrderValue: 45.00,
    shippingModel: 'standard',
    shippingSizeMix: { small: 60, medium: 30, large: 10 }
};

const DEFAULT_DISCOUNT_SETTINGS: DiscountSettings = {
    global: 15, // 15% warning threshold
    fulfillment: 20,
    storage: 25,
    shippingAndHandling: 30
};

export function ClientHarmonizationTool() {
    const [sourceRateCard, setSourceRateCard] = useState<string>('');
    const [targetRateCard, setTargetRateCard] = useState<string>('');
    const [scope, setScope] = useState<ScopeInput>(DEFAULT_SCOPE);
    const [discountSettings, setDiscountSettings] = useState<DiscountSettings>(DEFAULT_DISCOUNT_SETTINGS);
    const [customDiscounts, setCustomDiscounts] = useState<Partial<DiscountSettings>>({});
    const [sourceQuote, setSourceQuote] = useState<QuoteBreakdown | null>(null);
    const [targetQuote, setTargetQuote] = useState<QuoteBreakdown | null>(null);
    const [harmonizedQuote, setHarmonizedQuote] = useState<QuoteBreakdown | null>(null);
    const [harmonizedRateCard, setHarmonizedRateCard] = useState<RateCard | null>(null);
    const [loading, setLoading] = useState(false);
    const [clientName, setClientName] = useState('');
    const [notes, setNotes] = useState('');

    const sourceCard = SAMPLE_RATE_CARDS.find(card => card.id === sourceRateCard);
    const targetCard = SAMPLE_RATE_CARDS.find(card => card.id === targetRateCard);

    // Calculate quotes when rate cards or scope changes
    useEffect(() => {
        if (sourceRateCard && scope) {
            calculateQuote(sourceRateCard, setSourceQuote);
        }
    }, [sourceRateCard, scope]);

    useEffect(() => {
        if (targetRateCard && scope) {
            calculateQuote(targetRateCard, setTargetQuote);
        }
    }, [targetRateCard, scope]);

    const calculateQuote = async (rateCardId: string, setQuote: (quote: QuoteBreakdown) => void) => {
        try {
            setLoading(true);
            const result = await fetchQuotePreview(scope, rateCardId);
            setQuote(result.breakdown);
        } catch (error) {
            console.error('Failed to calculate quote:', error);
        } finally {
            setLoading(false);
        }
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

        const warningsList = [];

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
                                        {SAMPLE_RATE_CARDS.map((card) => (
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
                                        {SAMPLE_RATE_CARDS.map((card) => (
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
                                            <Badge
                                                variant={Math.abs(discountAnalysis.fulfillment) > discountSettings.fulfillment ? "destructive" : "secondary"}
                                                className="ml-2"
                                            >
                                                {formatPercentage(discountAnalysis.fulfillment)}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Storage:</span>
                                        <div className="text-right">
                                            <span>{formatCurrency(targetQuote.storageCostCents)}</span>
                                            <Badge
                                                variant={Math.abs(discountAnalysis.storage) > discountSettings.storage ? "destructive" : "secondary"}
                                                className="ml-2"
                                            >
                                                {formatPercentage(discountAnalysis.storage)}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Shipping & Handling:</span>
                                        <div className="text-right">
                                            <span>{formatCurrency(targetQuote.shippingAndHandlingCostCents)}</span>
                                            <Badge
                                                variant={Math.abs(discountAnalysis.shippingAndHandling) > discountSettings.shippingAndHandling ? "destructive" : "secondary"}
                                                className="ml-2"
                                            >
                                                {formatPercentage(discountAnalysis.shippingAndHandling)}
                                            </Badge>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-semibold">
                                        <span>Total Monthly Cost:</span>
                                        <div className="text-right">
                                            <span>{formatCurrency(targetQuote.totalMonthlyCostCents)}</span>
                                            <Badge
                                                variant={Math.abs(discountAnalysis.total) > discountSettings.global ? "destructive" : "secondary"}
                                                className="ml-2"
                                            >
                                                {formatPercentage(discountAnalysis.total)}
                                            </Badge>
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

                            <div className="flex justify-center">
                                <Button onClick={generateHarmonizedRateCard} disabled={!sourceRateCard || !targetRateCard}>
                                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                                    Generate Harmonized Rate Card
                                </Button>
                            </div>
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
                                        <Button onClick={downloadHarmonizationReport}>
                                            <Download className="h-4 w-4 mr-2" />
                                            Download Report (JSON)
                                        </Button>
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