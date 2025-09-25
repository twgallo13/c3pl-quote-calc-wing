import { useEffect, useState } from 'react';
import type { RateCard } from '@/lib/types';

export function useRateCards() {
    const [data, setData] = useState<RateCard[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        fetch('/api/ratecards')
            .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load')))
            .then(setData)
            .catch(setError)
            .finally(() => setLoading(false));
    }, []);

    return { data, loading, error };
}