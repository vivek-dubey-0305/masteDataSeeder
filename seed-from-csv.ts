import fs from 'fs';
import csv from 'csv-parser';
import { db } from './packages/db/src/client.js';
import { categories, products, groceryDetails } from './packages/db/src/schema/index.js';

async function main() {
  console.log('Starting seed from CSV...');

  // Clear tables
  console.log('Clearing tables...');
  await db.delete(groceryDetails);
  await db.delete(products);
  await db.delete(categories);
  console.log('Tables cleared.');

  // Note: Categories table remains empty as requested
  // Products will have categoryId set to null

  // Read and parse CSV
  console.log('Reading CSV...');
  const productsData: any[] = [];
  fs.createReadStream('./Supabase Snippet List All Products (1) - stock_81.csv')
    .pipe(csv())
    .on('data', (row) => {
      // Skip header row
      if (row.Code === 'Code') return;

      const barcode = row.Barcode || '';
      const gtin = barcode.replace(/^\[M\]/, ''); // Remove [M] prefix if present

      productsData.push({
        code: row.Code,
        name: row['Product Name'],
        mrp: parseFloat(row['M.R.P.']) || 0,
        displayPrice: parseFloat(row['Sales Price']) || 0,
        brand: row.Company === '-BLANK-' ? null : row.Company,
        barcode: barcode,
        gtin: gtin,
        categoryId: null, // Categories table is empty
        baseUnit: 'unit',
        isActive: true,
        isSubscribable: false,
        isVerified: false,
      });
    })
    .on('end', async () => {
      console.log(`Parsed ${productsData.length} products from CSV.`);

      // Insert products in batches to avoid memory issues
      const batchSize = 100;
      for (let i = 0; i < productsData.length; i += batchSize) {
        const batch = productsData.slice(i, i + batchSize);
        await db.insert(products).values(batch);
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}`);
      }

      console.log('Seeding completed successfully.');
      process.exit(0);
    })
    .on('error', (error) => {
      console.error('Error reading CSV:', error);
      process.exit(1);
    });
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});