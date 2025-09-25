/*
  Seed script to insert RateCards from seeds/ratecards_seed.json
*/
import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

type RateCardSeed = {
    id: string
    name: string
    version: string
    monthly_minimum_cents: number
    prices: unknown
}

async function main() {
    const seedPath = path.resolve(process.cwd(), 'seeds', 'ratecards_seed.json')
    const raw = await fs.readFile(seedPath, 'utf-8')
    const data: RateCardSeed[] = JSON.parse(raw)

    for (const rc of data) {
        await prisma.rateCard.upsert({
            where: { id: rc.id },
            update: {
                name: rc.name,
                version: rc.version,
                monthly_minimum_cents: rc.monthly_minimum_cents,
                prices: rc.prices as any,
            },
            create: {
                id: rc.id,
                name: rc.name,
                version: rc.version,
                monthly_minimum_cents: rc.monthly_minimum_cents,
                prices: rc.prices as any,
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
