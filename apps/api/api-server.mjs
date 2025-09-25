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
    res.json({ ok: true, version: 'v3.0.0' });
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