import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import quotesRoutes from './routes/quotes';
import ratecardsRoutes from './routes/ratecards';
import { APP_VERSION } from '@momentum/version';

const app = express();
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, version: APP_VERSION });
});

app.use('/api/quotes', quotesRoutes);
app.use('/api/rate-cards', ratecardsRoutes);

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
// Error handling: always return JSON
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));
import type { NextFunction } from 'express';
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`[api] listening on 0.0.0.0:${port} — ${APP_VERSION}`);
});