import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { APP_VERSION } from '@momentum/version';

const prisma = new PrismaClient();
const r: Router = Router();

// Validation schemas
const PricingSchema = z.object({
    fulfillment: z.object({
        aovPercentage: z.number().min(0).max(1),
        baseFeeCents: z.number().int().min(0),
        perAdditionalUnitCents: z.number().int().min(0)
    }),
    storage: z.object({
        smallUnitCents: z.number().int().min(0),
        mediumUnitCents: z.number().int().min(0),
        largeUnitCents: z.number().int().min(0),
        palletCents: z.number().int().min(0)
    }),
    shippingAndHandling: z.object({
        standard: z.object({
            smallPackageCents: z.number().int().min(0),
            mediumPackageCents: z.number().int().min(0),
            largePackageCents: z.number().int().min(0)
        }),
        customerAccount: z.object({
            smallPackageCents: z.number().int().min(0),
            mediumPackageCents: z.number().int().min(0),
            largePackageCents: z.number().int().min(0)
        })
    })
});

const CreateRateCardSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    version: z.string().min(1),
    monthly_minimum_cents: z.number().int().min(0),
    prices: PricingSchema,
    versionNotes: z.string().optional()
});

const UpdateRateCardSchema = z.object({
    name: z.string().min(1).optional(),
    monthly_minimum_cents: z.number().int().min(0).optional(),
    prices: PricingSchema.optional(),
    versionNotes: z.string().min(1)
});

// GET /api/rate-cards - List all rate cards
r.get('/', async (req: Request, res: Response) => {
    try {
        const rateCards = await prisma.rateCard.findMany({
            orderBy: { name: 'asc' }
        });

        res.json({ rateCards, appVersion: APP_VERSION });
    } catch (error) {
        console.error('Error fetching rate cards:', error);
        res.status(500).json({ error: 'Failed to fetch rate cards' });
    }
});

// GET /api/rate-cards/:id - Get specific rate card
r.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const rateCard = await prisma.rateCard.findUnique({
            where: { id }
        });

        if (!rateCard) {
            return res.status(404).json({ error: 'Rate card not found' });
        }

        res.json({ rateCard, appVersion: APP_VERSION });
    } catch (error) {
        console.error('Error fetching rate card:', error);
        res.status(500).json({ error: 'Failed to fetch rate card' });
    }
});

// POST /api/rate-cards - Create new rate card
r.post('/', async (req: Request, res: Response) => {
    try {
        const parsed = CreateRateCardSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const { id, name, version, monthly_minimum_cents, prices, versionNotes } = parsed.data;

        // Check if rate card ID already exists
        const existingRateCard = await prisma.rateCard.findUnique({ where: { id } });
        if (existingRateCard) {
            return res.status(409).json({ error: 'Rate card with this ID already exists' });
        }

        // Create new rate card
        const rateCard = await prisma.rateCard.create({
            data: {
                id,
                name,
                version,
                monthly_minimum_cents,
                prices: prices as any
            }
        });

        // Log the creation with version notes (in a real app, this would go to an audit table)
        console.log(`Rate card created: ${id} v${version}`, { versionNotes });

        res.status(201).json({ rateCard, appVersion: APP_VERSION });
    } catch (error) {
        console.error('Error creating rate card:', error);
        res.status(500).json({ error: 'Failed to create rate card' });
    }
});

// PUT /api/rate-cards/:id - Update rate card
r.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const parsed = UpdateRateCardSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const { name, monthly_minimum_cents, prices, versionNotes } = parsed.data;

        // Check if rate card exists
        const existingRateCard = await prisma.rateCard.findUnique({ where: { id } });
        if (!existingRateCard) {
            return res.status(404).json({ error: 'Rate card not found' });
        }

        // Generate new version number (increment patch version)
        const versionParts = existingRateCard.version.replace('v', '').split('.');
        const major = parseInt(versionParts[0] || '1');
        const minor = parseInt(versionParts[1] || '0');
        const patch = parseInt(versionParts[2] || '0') + 1;
        const newVersion = `v${major}.${minor}.${patch}`;

        // Update rate card
        const updatedData: any = {
            version: newVersion
        };

        if (name !== undefined) updatedData.name = name;
        if (monthly_minimum_cents !== undefined) updatedData.monthly_minimum_cents = monthly_minimum_cents;
        if (prices !== undefined) updatedData.prices = prices;

        const rateCard = await prisma.rateCard.update({
            where: { id },
            data: updatedData
        });

        // Log the update with version notes (in a real app, this would go to an audit table)
        console.log(`Rate card updated: ${id} ${existingRateCard.version} -> ${newVersion}`, { versionNotes });

        res.json({ rateCard, previousVersion: existingRateCard.version, appVersion: APP_VERSION });
    } catch (error) {
        console.error('Error updating rate card:', error);
        res.status(500).json({ error: 'Failed to update rate card' });
    }
});

// DELETE /api/rate-cards/:id - Delete rate card
r.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if rate card exists
        const existingRateCard = await prisma.rateCard.findUnique({ where: { id } });
        if (!existingRateCard) {
            return res.status(404).json({ error: 'Rate card not found' });
        }

        // Check if rate card is being used by any quotes
        const quotesUsingRateCard = await prisma.quote.count({
            where: { rateCardId: id }
        });

        if (quotesUsingRateCard > 0) {
            return res.status(409).json({
                error: 'Cannot delete rate card that is referenced by existing quotes',
                quotesCount: quotesUsingRateCard
            });
        }

        // Delete rate card
        await prisma.rateCard.delete({ where: { id } });

        // Log the deletion
        console.log(`Rate card deleted: ${id} v${existingRateCard.version}`);

        res.json({ message: 'Rate card deleted successfully', appVersion: APP_VERSION });
    } catch (error) {
        console.error('Error deleting rate card:', error);
        res.status(500).json({ error: 'Failed to delete rate card' });
    }
});

export default r;