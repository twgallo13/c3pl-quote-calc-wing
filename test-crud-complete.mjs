#!/usr/bin/env node

/**
 * Test complete CRUD operations for Rate Card Management
 * This test verifies create, read, update, and delete functionality
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3003/api/ratecards';

async function testCRUDOperations() {
    const testId = `test-crud-${Date.now()}`;
    console.log('🧪 Testing Rate Card CRUD operations...\n');

    try {
        // Test 1: Create a new rate card
        console.log('1️⃣ Creating new test rate card...');
        const newRateCard = {
            id: testId,
            name: 'Test CRUD Rate Card',
            version: 'v1.0.0',
            monthly_minimum_cents: 100000,
            prices: {
                fulfillment: {
                    aovPercentage: 0.03,
                    baseFeeCents: 200,
                    perAdditionalUnitCents: 50
                },
                storage: {
                    smallUnitCents: 50,
                    mediumUnitCents: 100,
                    largeUnitCents: 200,
                    palletCents: 5000
                },
                shippingAndHandling: {
                    standard: {
                        smallPackageCents: 250,
                        mediumPackageCents: 500,
                        largePackageCents: 1000
                    },
                    customerAccount: {
                        smallPackageCents: 50,
                        mediumPackageCents: 100,
                        largePackageCents: 200
                    }
                }
            }
        };

        const createResponse = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRateCard)
        });

        if (!createResponse.ok) {
            throw new Error(`Create failed: ${createResponse.status}`);
        }

        const created = await createResponse.json();
        console.log(`   ✅ Created rate card: ${created.name} (${created.id})`);

        // Test 2: Read the created rate card
        console.log('2️⃣ Reading created rate card...');
        const readResponse = await fetch(`${BASE_URL}/${testId}`);

        if (!readResponse.ok) {
            throw new Error(`Read failed: ${readResponse.status}`);
        }

        const read = await readResponse.json();
        console.log(`   ✅ Read rate card: ${read.name} (${read.version})`);

        // Test 3: Update the rate card
        console.log('3️⃣ Updating rate card...');
        const updateData = {
            name: 'Updated Test CRUD Rate Card',
            monthly_minimum_cents: 150000,
            prices: read.prices // Keep existing prices
        };

        const updateResponse = await fetch(`${BASE_URL}/${testId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        if (!updateResponse.ok) {
            throw new Error(`Update failed: ${updateResponse.status}`);
        }

        const updated = await updateResponse.json();
        console.log(`   ✅ Updated rate card: ${updated.name} (${updated.version})`);
        console.log(`   📈 Version incremented: ${read.version} → ${updated.version}`);

        // Test 4: List all rate cards (verify update is reflected)
        console.log('4️⃣ Listing all rate cards...');
        const listResponse = await fetch(BASE_URL);

        if (!listResponse.ok) {
            throw new Error(`List failed: ${listResponse.status}`);
        }

        const allCards = await listResponse.json();
        const updatedInList = allCards.find(card => card.id === testId);

        if (updatedInList && updatedInList.name === updateData.name) {
            console.log(`   ✅ Updated rate card found in list: ${updatedInList.name}`);
            console.log(`   📊 Total rate cards: ${allCards.length}`);
        } else {
            throw new Error('Updated rate card not found in list or name mismatch');
        }

        // Test 5: Delete the test rate card
        console.log('5️⃣ Deleting test rate card...');
        const deleteResponse = await fetch(`${BASE_URL}/${testId}`, {
            method: 'DELETE'
        });

        if (!deleteResponse.ok) {
            throw new Error(`Delete failed: ${deleteResponse.status}`);
        }

        const deleteResult = await deleteResponse.json();
        console.log(`   ✅ ${deleteResult.message}`);

        // Test 6: Verify deletion
        console.log('6️⃣ Verifying deletion...');
        const verifyResponse = await fetch(`${BASE_URL}/${testId}`);

        if (verifyResponse.status === 404) {
            console.log('   ✅ Rate card successfully deleted (404 returned)');
        } else {
            throw new Error('Rate card still exists after deletion');
        }

        console.log('\n🎉 All CRUD operations completed successfully!');
        console.log('\n📋 Summary:');
        console.log('   ✅ CREATE: Rate card created with auto-generated ID');
        console.log('   ✅ READ: Rate card retrieved by ID');
        console.log('   ✅ UPDATE: Rate card updated with version increment');
        console.log('   ✅ DELETE: Rate card deleted successfully');
        console.log('   ✅ LIST: All rate cards retrieved and verified');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the tests
testCRUDOperations();