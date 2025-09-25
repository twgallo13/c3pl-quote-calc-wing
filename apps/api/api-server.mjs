#!/usr/bin/env node

// Minimal API server based on working test pattern
import 'dotenv/config';
import express from 'express';

// Use default import to work around CommonJS/ES module issues
import prismaPackage from '@prisma/client';
const { PrismaClient } = prismaPackage;

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
    res.json({ ok: true, version: 'v3.1.0' });
});

// Rate cards endpoint - exact copy of working test logic
app.get('/api/ratecards', async (req, res) => {
    try {
        console.log('Fetching rate cards...');
        const rateCards = await prisma.rateCard.findMany({
            orderBy: { name: 'asc' }
        });
        console.log(`Found ${rateCards.length} rate cards`);
        res.json(rateCards);
    } catch (error) {
        console.error('Error fetching rate cards:', error);
        res.status(500).json({ error: 'Failed to fetch rate cards', details: error.message });
    }
});

// Get single rate card by ID
app.get('/api/ratecards/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Fetching rate card: ${id}`);

        const rateCard = await prisma.rateCard.findUnique({
            where: { id }
        });

        if (!rateCard) {
            return res.status(404).json({ error: 'Rate card not found' });
        }

        console.log(`Found rate card: ${rateCard.name}`);
        res.json(rateCard);
    } catch (error) {
        console.error('Error fetching rate card:', error);
        res.status(500).json({ error: 'Failed to fetch rate card', details: error.message });
    }
});

// Create new rate card
app.post('/api/ratecards', async (req, res) => {
    try {
        console.log('Creating new rate card...');
        const rateCardData = req.body;

        // Validate required fields
        if (!rateCardData.id || !rateCardData.name) {
            return res.status(400).json({ error: 'ID and name are required' });
        }

        // Check if ID already exists
        const existingCard = await prisma.rateCard.findUnique({
            where: { id: rateCardData.id }
        });

        if (existingCard) {
            return res.status(409).json({ error: 'Rate card with this ID already exists' });
        }

        const rateCard = await prisma.rateCard.create({
            data: {
                id: rateCardData.id,
                name: rateCardData.name,
                version: rateCardData.version || 'v1.0.0',
                monthly_minimum_cents: rateCardData.monthly_minimum_cents || 0,
                prices: rateCardData.prices
            }
        });

        console.log(`Created rate card: ${rateCard.name} (${rateCard.id})`);
        res.status(201).json(rateCard);
    } catch (error) {
        console.error('Error creating rate card:', error);
        res.status(500).json({ error: 'Failed to create rate card', details: error.message });
    }
});

// Update existing rate card
app.put('/api/ratecards/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        console.log(`Updating rate card: ${id}`);

        // Check if rate card exists
        const existingCard = await prisma.rateCard.findUnique({
            where: { id }
        });

        if (!existingCard) {
            return res.status(404).json({ error: 'Rate card not found' });
        }

        // Auto-increment version for updates
        const currentVersion = existingCard.version || 'v1.0.0';
        const versionMatch = currentVersion.match(/v(\d+)\.(\d+)\.(\d+)/);
        let newVersion = 'v1.0.1';

        if (versionMatch) {
            const [, major, minor, patch] = versionMatch;
            newVersion = `v${major}.${minor}.${parseInt(patch) + 1}`;
        }

        const updatedRateCard = await prisma.rateCard.update({
            where: { id },
            data: {
                name: updateData.name || existingCard.name,
                version: newVersion,
                monthly_minimum_cents: updateData.monthly_minimum_cents ?? existingCard.monthly_minimum_cents,
                prices: updateData.prices || existingCard.prices
            }
        });

        console.log(`Updated rate card: ${updatedRateCard.name} (${id}) to version ${newVersion}`);
        res.json(updatedRateCard);
    } catch (error) {
        console.error('Error updating rate card:', error);
        res.status(500).json({ error: 'Failed to update rate card', details: error.message });
    }
});

// Delete rate card
app.delete('/api/ratecards/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Deleting rate card: ${id}`);

        // Check if rate card exists
        const existingCard = await prisma.rateCard.findUnique({
            where: { id }
        });

        if (!existingCard) {
            return res.status(404).json({ error: 'Rate card not found' });
        }

        await prisma.rateCard.delete({
            where: { id }
        });

        console.log(`Deleted rate card: ${existingCard.name} (${id})`);
        res.json({ message: 'Rate card deleted successfully' });
    } catch (error) {
        console.error('Error deleting rate card:', error);
        res.status(500).json({ error: 'Failed to delete rate card', details: error.message });
    }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3003;

app.listen(port, '0.0.0.0', () => {
    console.log(`[api] listening on 0.0.0.0:${port} — v3.0.0`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down API server...');
    await prisma.$disconnect();
    process.exit(0);
});