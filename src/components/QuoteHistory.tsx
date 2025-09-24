import { useKV } from '@github/spark/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClockCounterClockwise, Download, User } from '@phosphor-icons/react';
import type { Quote } from '@/lib/types';
import { formatCurrency } from '@/lib/calculator';

export default function QuoteHistory() {
  const [quotes] = useKV<Quote[]>('quotes', []);

  const exportQuote = (quote: Quote) => {
    const quoteData = {
      client: quote.clientName || 'Prospect',
      rateCard: `${quote.rateCardId} ${quote.rateCardVersion}`,
      date: new Date(quote.createdAt).toLocaleDateString(),
      input: quote.scopeInput,
      calculation: quote.calculation,
      total: formatCurrency(quote.calculation.finalMonthlyCostCents)
    };
    
    const blob = new Blob([JSON.stringify(quoteData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quote-${quote.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!quotes || quotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockCounterClockwise size={24} />
            Quote History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No quotes saved yet. Create your first quote to see it here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockCounterClockwise size={24} />
          Quote History
          <Badge variant="secondary">{quotes.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {quotes.map((quote) => (
            <div key={quote.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {quote.clientName && (
                      <>
                        <User size={16} className="text-muted-foreground" />
                        <span className="font-medium">{quote.clientName}</span>
                      </>
                    )}
                    {!quote.clientName && (
                      <span className="text-muted-foreground">Unnamed Prospect</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(quote.createdAt).toLocaleDateString()} at{' '}
                    {new Date(quote.createdAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {formatCurrency(quote.calculation.finalMonthlyCostCents)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {quote.rateCardId.replace('rc-', '').replace('-2025', '')} plan
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                <div>
                  <div className="text-muted-foreground">Orders/Month</div>
                  <div className="font-medium">{quote.scopeInput.monthlyOrders.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Units/Order</div>
                  <div className="font-medium">{quote.scopeInput.averageUnitsPerOrder}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Avg Order Value</div>
                  <div className="font-medium">${quote.scopeInput.averageOrderValue}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Shipping</div>
                  <div className="font-medium capitalize">{quote.scopeInput.shippingModel}</div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Badge variant="outline" className="text-xs">
                  {quote.rateCardVersion}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportQuote(quote)}
                >
                  <Download size={14} className="mr-1" />
                  Export
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}