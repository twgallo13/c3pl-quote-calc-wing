// JS seed runner fallback if ts-node has issues
import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const prisma = new PrismaClient()

async function main() {
    const seedPath = path.resolve(__dirname, '..', 'seeds', 'ratecards_seed.json')
    const raw = await fs.readFile(seedPath, 'utf-8')
    const data = JSON.parse(raw)

    for (const rc of data) {
        await prisma.rateCard.upsert({
            where: { id: rc.id },
            update: {
                name: rc.name,
                version: rc.version,
                monthly_minimum_cents: rc.monthly_minimum_cents,
                prices: rc.prices,
            },
            create: {
                id: rc.id,
                name: rc.name,
                version: rc.version,
                monthly_minimum_cents: rc.monthly_minimum_cents,
                prices: rc.prices,
            },
        })
    }

    console.log(`Seeded ${data.length} ratecards`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
