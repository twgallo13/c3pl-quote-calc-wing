#!/usr/bin/env node

// Simple API server that works around Prisma import issues
import express from 'express';
import pkg from '@prisma/client';

const { PrismaClient } = pkg;
const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
    res.json({ ok: true, version: 'v3.0.0' });
});

// Simple rate cards endpoint
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

// Simple quotes endpoint  
app.get('/api/quotes', async (req, res) => {
    try {
        const quotes = await prisma.quote.findMany({
            include: { rateCard: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(quotes);
    } catch (error) {
        console.error('Error fetching quotes:', error);
        res.status(500).json({ error: 'Failed to fetch quotes' });
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

process.on('SIGTERM', async () => {
    console.log('\nShutting down API server...');
    await prisma.$disconnect();
    process.exit(0);
});