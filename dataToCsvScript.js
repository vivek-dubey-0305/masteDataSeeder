const { MongoClient } = require('mongodb');
const fs = require('fs');

const MONGO_URL = "mongodb://localhost:27017/product_images";

async function exportToCSV() {
  const client = new MongoClient(MONGO_URL);

  try {
    await client.connect();
    const db = client.db('product_images');
    const collection = db.collection('products');

    const products = await collection.find({}).toArray();

    console.log(`Found ${products.length} products to export.`);

    // Prepare CSV content
    let csvContent = 'barcode,product_name,front_image,ingredients_image,nutrition_image,packaging_image\n';

    for (const product of products) {
      const barcode = product.uid || '';
      const productName = (product.product_name || '').replace(/"/g, '""'); // Escape quotes

      // Group images by type
      const imageGroups = {
        front: [],
        ingredients: [],
        nutrition: [],
        packaging: []
      };

      if (product.imageUrls) {
        for (const img of product.imageUrls) {
          const label = img.label.toLowerCase();
          if (label.includes('front')) {
            imageGroups.front.push(img.url);
          } else if (label.includes('ingredients')) {
            imageGroups.ingredients.push(img.url);
          } else if (label.includes('nutrition')) {
            imageGroups.nutrition.push(img.url);
          } else if (label.includes('packaging')) {
            imageGroups.packaging.push(img.url);
          }
        }
      }

      const frontImages = imageGroups.front.join(';');
      const ingredientsImages = imageGroups.ingredients.join(';');
      const nutritionImages = imageGroups.nutrition.join(';');
      const packagingImages = imageGroups.packaging.join(';');

      // Escape commas and quotes in productName
      const escapedProductName = `"${productName}"`;

      csvContent += `${barcode},${escapedProductName},"${frontImages}","${ingredientsImages}","${nutritionImages}","${packagingImages}"\n`;
    }

    // Write to file
    fs.writeFileSync('products_images.csv', csvContent);

    console.log('CSV file "products_images.csv" has been created successfully.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

exportToCSV();