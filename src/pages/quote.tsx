import { useState } from 'react';
import { fetchQuotePreview, QuoteBreakdown } from '../lib/api';
import { APP_VERSION } from '../version';

export default function QuotePage() {
  const [result, setResult] = useState<null | any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePreview() {
    setLoading(true);
    setError(null);
    try {
      const scope = {
        monthlyOrders: 1000,
        averageUnitsPerOrder: 2,
        averageOrderValue: 50,
        shippingModel: 'standard',
        shippingSizeMix: { small: 60, medium: 30, large: 10 }
      };
      const data = await fetchQuotePreview(scope, 'rc-growth-2025');
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Quote Preview</h1>
      <button onClick={handlePreview} disabled={loading}>
        {loading ? 'Loading…' : 'Preview Quote'}
      </button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {result && (
        <div>
          <h2>RateCard {result.rateCardId} v{result.version}</h2>
          <p>App Version: {result.appVersion} / {APP_VERSION}</p>
          <h3>Per Order</h3>
          <pre>{JSON.stringify(result.breakdown.perOrder, null, 2)}</pre>
          <h3>Monthly</h3>
          <pre>{JSON.stringify(result.breakdown.monthly, null, 2)}</pre>
          {result.breakdown.notes?.length > 0 && (
            <div>
              <h4>Notes</h4>
              <ul>{result.breakdown.notes.map((n: string, i: number) => <li key={i}>{n}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}