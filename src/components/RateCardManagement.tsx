import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Plus, Edit, Trash2, Save, X, Shield, Database, ChevronRight, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { fetchRateCards, fetchRateCard, createRateCard, updateRateCard, deleteRateCard } from '@/lib/api';
import { RateCard, FulfillmentPricing, StoragePricing, SandHPricing } from '@/lib/types';
import { APP_VERSION } from '@momentum/version';

interface RateCardFormData {
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

const DEFAULT_RATE_CARD: RateCardFormData = {
    id: '',
    name: '',
    version: 'v1.0.0',
    monthly_minimum_cents: 0,
    prices: {
        fulfillment: {
            aovPercentage: 0.05,
            baseFeeCents: 250,
            perAdditionalUnitCents: 75
        },
        storage: {
            smallUnitCents: 75,
            mediumUnitCents: 150,
            largeUnitCents: 250,
            palletCents: 7500
        },
        shippingAndHandling: {
            standard: {
                smallPackageCents: 300,
                mediumPackageCents: 600,
                largePackageCents: 1200
            },
            customerAccount: {
                smallPackageCents: 75,
                mediumPackageCents: 125,
                largePackageCents: 250
            }
        }
    }
};

interface RateCardManagementProps {
    rateCards: RateCard[];
    loading: boolean;
    onRateCardsChange: () => void;
}

export function RateCardManagement({ rateCards, loading, onRateCardsChange }: RateCardManagementProps) {
    const [selectedRateCard, setSelectedRateCard] = useState<RateCard | null>(null);
    const [formData, setFormData] = useState<RateCardFormData>(DEFAULT_RATE_CARD);
    const [versionNotes, setVersionNotes] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const loadRateCard = async (id: string) => {
        try {
            setActionLoading(true);
            const response = await fetchRateCard(id);
            setSelectedRateCard(response.rateCard);
            setFormData(response.rateCard);
        } catch (error) {
            toast.error('Failed to load rate card: ' + (error as Error).message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateNew = () => {
        setMode('create');
        setFormData(DEFAULT_RATE_CARD);
        setVersionNotes('');
        setSelectedRateCard(null);
    };

    const handleEdit = (rateCard: RateCard) => {
        setMode('edit');
        setFormData(rateCard);
        setSelectedRateCard(rateCard);
        setVersionNotes('');
    };

    const handleDuplicate = (rateCard: RateCard) => {
        setMode('create');
        setFormData({
            ...rateCard,
            id: '',
            name: `${rateCard.name} (Copy)`,
            version: 'v1.0.0'
        });
        setVersionNotes('Duplicated from ' + rateCard.name);
        setSelectedRateCard(null);
    };

    const handleCancel = () => {
        setMode('view');
        setFormData(DEFAULT_RATE_CARD);
        setVersionNotes('');
        setSelectedRateCard(null);
    };

    const handleSubmit = async () => {
        try {
            setActionLoading(true);

            if (mode === 'create') {
                if (!formData.id || !formData.name) {
                    toast.error('ID and Name are required');
                    return;
                }

                await createRateCard({ ...formData, versionNotes });
                toast.success('Rate card created successfully');
            } else if (mode === 'edit') {
                if (!versionNotes.trim()) {
                    toast.error('Version notes are required for updates');
                    return;
                }

                await updateRateCard(formData.id, {
                    name: formData.name,
                    monthly_minimum_cents: formData.monthly_minimum_cents,
                    prices: formData.prices,
                    versionNotes
                });
                toast.success('Rate card updated successfully');
            }

            onRateCardsChange();
            setMode('view');
            setFormData(DEFAULT_RATE_CARD);
            setVersionNotes('');
            setSelectedRateCard(null);
        } catch (error) {
            toast.error('Failed to save rate card: ' + (error as Error).message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            setActionLoading(true);
            await deleteRateCard(id);
            toast.success('Rate card deleted successfully');
            onRateCardsChange();
            setDeleteConfirmId(null);
            if (selectedRateCard?.id === id) {
                setSelectedRateCard(null);
            }
        } catch (error) {
            toast.error('Failed to delete rate card: ' + (error as Error).message);
        } finally {
            setActionLoading(false);
        }
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(cents / 100);
    };

    const formatPercentage = (decimal: number) => {
        return `${(decimal * 100).toFixed(1)}%`;
    };

    const updateFormField = (path: string, value: any) => {
        setFormData(prev => {
            const newData = { ...prev };
            const keys = path.split('.');
            let current: any = newData;

            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }

            current[keys[keys.length - 1]] = value;
            return newData;
        });
    };

    if (loading && rateCards.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                    <Database className="h-12 w-12 text-muted-foreground mx-auto animate-pulse" />
                    <p className="text-muted-foreground">Loading rate cards...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Shield className="h-8 w-8 text-blue-600" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Rate Card Management</h1>
                        <p className="text-muted-foreground">
                            Administrative interface for managing pricing rate cards
                        </p>
                    </div>
                </div>

                <Button onClick={handleCreateNew} disabled={loading || actionLoading}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Rate Card
                </Button>
            </div>

            <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                    <strong>Administrator Access Required:</strong> This module provides full CRUD operations for rate cards.
                    All changes are versioned and logged for audit purposes.
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Rate Cards List */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Rate Cards ({rateCards.length})</CardTitle>
                        <CardDescription>Select a rate card to view or manage</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-96 overflow-y-auto">
                            {rateCards.map((card) => (
                                <div
                                    key={card.id}
                                    className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedRateCard?.id === card.id ? 'bg-muted' : ''
                                        }`}
                                    onClick={() => {
                                        if (mode === 'view') {
                                            loadRateCard(card.id);
                                        }
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{card.name}</p>
                                            <p className="text-sm text-muted-foreground">{card.id}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-xs">
                                                    {card.version}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    Min: {formatCurrency(card.monthly_minimum_cents)}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                            ))}

                            {rateCards.length === 0 && (
                                <div className="p-4 text-center text-muted-foreground">
                                    No rate cards found
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Rate Card Details/Form */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>
                                    {mode === 'create' && 'Create New Rate Card'}
                                    {mode === 'edit' && 'Edit Rate Card'}
                                    {mode === 'view' && (selectedRateCard ? selectedRateCard.name : 'Rate Card Details')}
                                </CardTitle>
                                <CardDescription>
                                    {mode === 'create' && 'Enter details for the new rate card'}
                                    {mode === 'edit' && 'Modify rate card settings - version will be incremented automatically'}
                                    {mode === 'view' && (selectedRateCard ? 'View and manage rate card details' : 'Select a rate card to view details')}
                                </CardDescription>
                            </div>

                            {mode === 'view' && selectedRateCard && (
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleDuplicate(selectedRateCard)}>
                                        <Copy className="h-4 w-4 mr-2" />
                                        Duplicate
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(selectedRateCard)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                    <Dialog open={deleteConfirmId === selectedRateCard.id} onOpenChange={(open) =>
                                        setDeleteConfirmId(open ? selectedRateCard.id : null)
                                    }>
                                        <DialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Delete Rate Card</DialogTitle>
                                                <DialogDescription>
                                                    Are you sure you want to delete "{selectedRateCard.name}"?
                                                    This action cannot be undone and will fail if the rate card is referenced by existing quotes.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                                                    Cancel
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => handleDelete(selectedRateCard.id)}
                                                    disabled={actionLoading}
                                                >
                                                    Delete
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            )}

                            {(mode === 'create' || mode === 'edit') && (
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={handleCancel} disabled={actionLoading}>
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSubmit} disabled={actionLoading}>
                                        <Save className="h-4 w-4 mr-2" />
                                        {mode === 'create' ? 'Create' : 'Update'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent>
                        {!selectedRateCard && mode === 'view' ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center space-y-4">
                                    <Database className="h-12 w-12 text-muted-foreground mx-auto" />
                                    <p className="text-muted-foreground">Select a rate card to view details</p>
                                </div>
                            </div>
                        ) : (
                            <Tabs defaultValue="basic" className="w-full">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                                    <TabsTrigger value="fulfillment">Fulfillment</TabsTrigger>
                                    <TabsTrigger value="storage">Storage</TabsTrigger>
                                    <TabsTrigger value="shipping">Shipping</TabsTrigger>
                                </TabsList>

                                <TabsContent value="basic" className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="id">Rate Card ID</Label>
                                            <Input
                                                id="id"
                                                value={formData.id}
                                                onChange={(e) => updateFormField('id', e.target.value)}
                                                placeholder="e.g., rc-enterprise-2025"
                                                disabled={mode === 'edit' || actionLoading}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="name">Name</Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => updateFormField('name', e.target.value)}
                                                placeholder="e.g., Enterprise Plan 2025"
                                                disabled={mode === 'view' || actionLoading}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="version">Version</Label>
                                            <Input
                                                id="version"
                                                value={formData.version}
                                                onChange={(e) => updateFormField('version', e.target.value)}
                                                placeholder="e.g., v1.0.0"
                                                disabled={mode === 'edit' || mode === 'view' || actionLoading}
                                            />
                                            {mode === 'edit' && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Version will be auto-incremented on update
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <Label htmlFor="minimum">Monthly Minimum ($)</Label>
                                            <Input
                                                id="minimum"
                                                type="number"
                                                value={formData.monthly_minimum_cents / 100}
                                                onChange={(e) => updateFormField('monthly_minimum_cents', Math.round(Number(e.target.value) * 100))}
                                                placeholder="0"
                                                disabled={mode === 'view' || actionLoading}
                                            />
                                        </div>
                                    </div>

                                    {(mode === 'create' || mode === 'edit') && (
                                        <div>
                                            <Label htmlFor="versionNotes">Version Notes {mode === 'edit' && <span className="text-red-500">*</span>}</Label>
                                            <Textarea
                                                id="versionNotes"
                                                value={versionNotes}
                                                onChange={(e) => setVersionNotes(e.target.value)}
                                                placeholder={mode === 'create' ? 'Initial version' : 'Describe the changes made in this update...'}
                                                rows={3}
                                                disabled={actionLoading}
                                            />
                                            {mode === 'edit' && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Required for audit trail when updating rate cards
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="fulfillment" className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="aovPercentage">AOV Percentage (%)</Label>
                                            <Input
                                                id="aovPercentage"
                                                type="number"
                                                step="0.1"
                                                value={formData.prices.fulfillment.aovPercentage * 100}
                                                onChange={(e) => updateFormField('prices.fulfillment.aovPercentage', Number(e.target.value) / 100)}
                                                disabled={mode === 'view' || actionLoading}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="baseFeeCents">Base Fee ($)</Label>
                                            <Input
                                                id="baseFeeCents"
                                                type="number"
                                                step="0.01"
                                                value={formData.prices.fulfillment.baseFeeCents / 100}
                                                onChange={(e) => updateFormField('prices.fulfillment.baseFeeCents', Math.round(Number(e.target.value) * 100))}
                                                disabled={mode === 'view' || actionLoading}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="perAdditionalUnitCents">Per Additional Unit ($)</Label>
                                            <Input
                                                id="perAdditionalUnitCents"
                                                type="number"
                                                step="0.01"
                                                value={formData.prices.fulfillment.perAdditionalUnitCents / 100}
                                                onChange={(e) => updateFormField('prices.fulfillment.perAdditionalUnitCents', Math.round(Number(e.target.value) * 100))}
                                                disabled={mode === 'view' || actionLoading}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="storage" className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <Label htmlFor="smallUnitCents">Small Unit ($)</Label>
                                            <Input
                                                id="smallUnitCents"
                                                type="number"
                                                step="0.01"
                                                value={formData.prices.storage.smallUnitCents / 100}
                                                onChange={(e) => updateFormField('prices.storage.smallUnitCents', Math.round(Number(e.target.value) * 100))}
                                                disabled={mode === 'view' || actionLoading}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="mediumUnitCents">Medium Unit ($)</Label>
                                            <Input
                                                id="mediumUnitCents"
                                                type="number"
                                                step="0.01"
                                                value={formData.prices.storage.mediumUnitCents / 100}
                                                onChange={(e) => updateFormField('prices.storage.mediumUnitCents', Math.round(Number(e.target.value) * 100))}
                                                disabled={mode === 'view' || actionLoading}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="largeUnitCents">Large Unit ($)</Label>
                                            <Input
                                                id="largeUnitCents"
                                                type="number"
                                                step="0.01"
                                                value={formData.prices.storage.largeUnitCents / 100}
                                                onChange={(e) => updateFormField('prices.storage.largeUnitCents', Math.round(Number(e.target.value) * 100))}
                                                disabled={mode === 'view' || actionLoading}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="palletCents">Pallet ($)</Label>
                                            <Input
                                                id="palletCents"
                                                type="number"
                                                step="0.01"
                                                value={formData.prices.storage.palletCents / 100}
                                                onChange={(e) => updateFormField('prices.storage.palletCents', Math.round(Number(e.target.value) * 100))}
                                                disabled={mode === 'view' || actionLoading}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="shipping" className="space-y-6">
                                    <div>
                                        <h4 className="font-semibold mb-3">Standard Shipping</h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <Label htmlFor="standardSmall">Small Package ($)</Label>
                                                <Input
                                                    id="standardSmall"
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.prices.shippingAndHandling.standard.smallPackageCents / 100}
                                                    onChange={(e) => updateFormField('prices.shippingAndHandling.standard.smallPackageCents', Math.round(Number(e.target.value) * 100))}
                                                    disabled={mode === 'view' || actionLoading}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="standardMedium">Medium Package ($)</Label>
                                                <Input
                                                    id="standardMedium"
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.prices.shippingAndHandling.standard.mediumPackageCents / 100}
                                                    onChange={(e) => updateFormField('prices.shippingAndHandling.standard.mediumPackageCents', Math.round(Number(e.target.value) * 100))}
                                                    disabled={mode === 'view' || actionLoading}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="standardLarge">Large Package ($)</Label>
                                                <Input
                                                    id="standardLarge"
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.prices.shippingAndHandling.standard.largePackageCents / 100}
                                                    onChange={(e) => updateFormField('prices.shippingAndHandling.standard.largePackageCents', Math.round(Number(e.target.value) * 100))}
                                                    disabled={mode === 'view' || actionLoading}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div>
                                        <h4 className="font-semibold mb-3">Customer Account Shipping</h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <Label htmlFor="customerSmall">Small Package ($)</Label>
                                                <Input
                                                    id="customerSmall"
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.prices.shippingAndHandling.customerAccount.smallPackageCents / 100}
                                                    onChange={(e) => updateFormField('prices.shippingAndHandling.customerAccount.smallPackageCents', Math.round(Number(e.target.value) * 100))}
                                                    disabled={mode === 'view' || actionLoading}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="customerMedium">Medium Package ($)</Label>
                                                <Input
                                                    id="customerMedium"
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.prices.shippingAndHandling.customerAccount.mediumPackageCents / 100}
                                                    onChange={(e) => updateFormField('prices.shippingAndHandling.customerAccount.mediumPackageCents', Math.round(Number(e.target.value) * 100))}
                                                    disabled={mode === 'view' || actionLoading}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="customerLarge">Large Package ($)</Label>
                                                <Input
                                                    id="customerLarge"
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.prices.shippingAndHandling.customerAccount.largePackageCents / 100}
                                                    onChange={(e) => updateFormField('prices.shippingAndHandling.customerAccount.largePackageCents', Math.round(Number(e.target.value) * 100))}
                                                    disabled={mode === 'view' || actionLoading}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}