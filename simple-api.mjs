#!/usr/bin/env node

// Simple API server that works with the generated Prisma client
import express from './apps/api/node_modules/express/index.js';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ ok: true, version: 'v3.0.0' });
});

// Rate cards endpoints
app.get('/api/ratecards', async (req, res) => {
    try {
        const rateCards = await prisma.rateCard.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(rateCards);
    } catch (error) {
        console.error('Error fetching rate cards:', error);
        res.status(500).json({ error: 'Failed to fetch rate cards' });
    }
});

app.get('/api/ratecards/:id', async (req, res) => {
    try {
        const rateCard = await prisma.rateCard.findUnique({
            where: { id: req.params.id }
        });
        if (!rateCard) {
            return res.status(404).json({ error: 'Rate card not found' });
        }
        res.json(rateCard);
    } catch (error) {
        console.error('Error fetching rate card:', error);
        res.status(500).json({ error: 'Failed to fetch rate card' });
    }
});

const port = process.env.PORT || 3003;
app.listen(port, '0.0.0.0', () => {
    console.log(`[api] Simple server listening on 0.0.0.0:${port}`);
});