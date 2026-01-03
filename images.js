const { MongoClient } = require('mongodb');
const fs = require('fs');

const MONGO_URL = "mongodb://localhost:27017/off";

async function generateImages() {
  const mongoClient = new MongoClient(MONGO_URL);

  try {
    await mongoClient.connect();
    const db = mongoClient.db('off_india');
    const collection = db.collection('products');

    const products = await collection
      .find({
        $and: [
          {
            $or: [
              { countries: /india/i },
              { countries_tags: "en:india" },
              { countries_hierarchy: "en:india" },
            ],
          },
          { product_name: { $exists: true, $ne: "", $not: /fake/i } },
          { lang: { $in: ['en', 'hi'] } },
        ],
      })
      .toArray();

    console.log(`Found ${products.length} products to process.`);

    // Clear the files
    fs.writeFileSync('images.txt', '');
    fs.writeFileSync('available_images_products.txt', '');
    fs.writeFileSync('unavailable_images_products.txt', '');

    let availableCount = 0;
    let unavailableCount = 0;
    let totalImages = 0;

    for (const p of products) {
      const code = p.code;
      if (!code || code.length !== 13) continue;

      // Split code: e.g., 8908024057357 -> 890/802/405/7357
      const codeSplit = code.match(/^(\d{3})(\d{3})(\d{3})(\d{4})$/);
      if (!codeSplit) continue;
      const codePath = codeSplit.slice(1).join('/');

      const baseUrl = 'https://images.openfoodfacts.org/images/products';
      const selectedImages = p.images?.selected || {};

      let output = `\n========================================\n`;
      output += `Product: ${p.product_name || 'Unknown'} (${code})\n`;
      output += `========================================\n`;

      const types = ['front', 'ingredients', 'nutrition', 'packaging'];
      let imageUrls = [];

      // Existing logic for selected images
      for (const type of types) {
        if (selectedImages[type]) {
          for (const lang of Object.keys(selectedImages[type])) {
            const imgData = selectedImages[type][lang];
            if (imgData && imgData.rev) {
              const url = `${baseUrl}/${codePath}/${type}_${lang}.${imgData.rev}.full.jpg`;
              imageUrls.push({ label: `${type.charAt(0).toUpperCase() + type.slice(1)} (${lang})`, url });
            }
          }
        }
      }

      // Additional logic for direct images in p.images
      for (const key of Object.keys(p.images || {})) {
        if (key === 'selected') continue;
        const imgData = p.images[key];
        if (imgData && imgData.sizes && imgData.sizes.full) {
          let url;
          let label;
          if (imgData.rev) {
            // Selected style direct key
            url = `${baseUrl}/${codePath}/${key}.${imgData.rev}.full.jpg`;
            label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          } else {
            // Raw image
            url = `${baseUrl}/${codePath}/${key}.full.jpg`;
            label = `Raw ${key}`;
          }
          imageUrls.push({ label, url });
        }
      }

      let hasImages = imageUrls.length > 0;
      let imageCountForProduct = imageUrls.length;

      for (const item of imageUrls) {
        output += `${item.label}: ${item.url}\n`;
      }

      if (hasImages) {
        availableCount++;
        totalImages += imageCountForProduct;
        fs.appendFileSync('available_images_products.txt', `${p.product_name || 'Unknown'} (${code})\n`);
        fs.appendFileSync('images.txt', output);
      } else {
        unavailableCount++;
        fs.appendFileSync('unavailable_images_products.txt', `${p.product_name || 'Unknown'} (${code})\n`);
      }
    }

    console.log(`Available products: ${availableCount}, Total images: ${totalImages}`);
    console.log(`Unavailable products: ${unavailableCount}`);
    console.log("Image URLs generated and saved to images.txt.");
    console.log("Available products list saved to available_images_products.txt.");
    console.log("Unavailable products list saved to unavailable_images_products.txt.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoClient.close();
  }
}

generateImages();
