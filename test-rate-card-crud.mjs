#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRateCardCRUD() {
    console.log('🧪 Testing Rate Card CRUD operations...\n');

    try {
        // Test 1: List existing rate cards
        console.log('1️⃣ Listing existing rate cards...');
        const existingCards = await prisma.rateCard.findMany();
        console.log(`   Found ${existingCards.length} existing rate cards`);

        if (existingCards.length > 0) {
            console.log('   Sample rate card:', existingCards[0].name);
        }

        // Test 2: Create a new test rate card
        console.log('\n2️⃣ Creating new test rate card...');
        const testCard = {
            id: 'rc-test-crud-' + Date.now(),
            name: 'Test CRUD Rate Card',
            version: 'v1.0.0',
            monthly_minimum_cents: 100000,
            prices: {
                fulfillment: {
                    aovPercentage: 0.05,
                    baseFeeCents: 250,
                    perAdditionalUnitCents: 75
                },
                storage: {
                    smallUnitCents: 75,
                    mediumUnitCents: 150,
                    largeUnitCents: 250,
                    palletCents: 7500
                },
                shippingAndHandling: {
                    standard: {
                        smallPackageCents: 300,
                        mediumPackageCents: 600,
                        largePackageCents: 1200
                    },
                    customerAccount: {
                        smallPackageCents: 75,
                        mediumPackageCents: 125,
                        largePackageCents: 250
                    }
                }
            }
        };

        const createdCard = await prisma.rateCard.create({ data: testCard });
        console.log(`   ✅ Created rate card: ${createdCard.id}`);

        // Test 3: Read the created rate card
        console.log('\n3️⃣ Reading created rate card...');
        const readCard = await prisma.rateCard.findUnique({
            where: { id: createdCard.id }
        });
        console.log(`   ✅ Read rate card: ${readCard?.name} (${readCard?.version})`);

        // Test 4: Update the rate card
        console.log('\n4️⃣ Updating rate card...');
        const updatedCard = await prisma.rateCard.update({
            where: { id: createdCard.id },
            data: {
                name: 'Updated Test CRUD Rate Card',
                version: 'v1.0.1',
                monthly_minimum_cents: 150000
            }
        });
        console.log(`   ✅ Updated rate card: ${updatedCard.name} (${updatedCard.version})`);

        // Test 5: Delete the rate card
        console.log('\n5️⃣ Deleting test rate card...');
        await prisma.rateCard.delete({
            where: { id: createdCard.id }
        });
        console.log(`   ✅ Deleted rate card: ${createdCard.id}`);

        console.log('\n🎉 All Rate Card CRUD operations completed successfully!');

    } catch (error) {
        console.error('❌ Error during testing:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testRateCardCRUD();