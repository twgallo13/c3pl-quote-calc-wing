import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { ScopeInputSchema } from '../schemas';
import { quoteBreakdown } from '@momentum/calc';
import { PrismaClient } from '@prisma/client';
import { APP_VERSION } from '@momentum/version';

const prisma = new PrismaClient();
const r: Router = Router();

const PreviewBody = z.object({
    scope: ScopeInputSchema,
    rateCardId: z.string().min(1)
});

r.post('/preview', async (req: Request, res: Response) => {
    const parsed = PreviewBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { scope, rateCardId } = parsed.data;
    const rc = await prisma.rateCard.findUnique({ where: { id: rateCardId } });
    if (!rc) return res.status(404).json({ error: 'RateCard not found' });

    const breakdown = quoteBreakdown(scope as any, rc as any);
    res.json({ rateCardId, version: rc.version, appVersion: APP_VERSION, breakdown });
});

export default r;