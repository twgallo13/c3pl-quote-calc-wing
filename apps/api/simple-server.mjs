#!/usr/bin/env node

// Simple API server that works around Prisma import issues
import express from 'express';
import pkg from '@prisma/client';

const { PrismaClient } = pkg;
const app = express();
const prisma = new PrismaClient();

// CORS middleware for Codespaces
app.use((req, res, next) => {
    const frontendUrl = 'https://laughing-funicular-jjw559vq6r95hq5v6-5002.app.github.dev';
    res.header('Access-Control-Allow-Origin', frontendUrl);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
    res.json({ ok: true, version: 'v3.0.0' });
});

// Simple rate cards endpoint
app.get('/api/rate-cards', async (req, res) => {
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

// Get single rate card by ID
app.get('/api/rate-cards/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const rateCard = await prisma.rateCard.findUnique({
            where: { id }
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

// Create new rate card
app.post('/api/rate-cards', async (req, res) => {
    try {
        const rateCardData = req.body;
        if (!rateCardData.id || !rateCardData.name) {
            return res.status(400).json({ error: 'ID and name are required' });
        }

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
                version_notes: rateCardData.version_notes || 'Initial version',
                monthly_minimum_cents: rateCardData.monthly_minimum_cents || 0,
                prices: rateCardData.prices
            }
        });
        res.status(201).json(rateCard);
    } catch (error) {
        console.error('Error creating rate card:', error);
        res.status(500).json({ error: 'Failed to create rate card' });
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