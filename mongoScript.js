const { MongoClient } = require('mongodb');

const MONGO_URL = "mongodb://localhost:27017/off";

async function feedProductImages() {
  const mongoClient = new MongoClient(MONGO_URL);

  try {
    await mongoClient.connect();
    const sourceDb = mongoClient.db('off_india');
    const sourceCollection = sourceDb.collection('products');

    const targetDb = mongoClient.db('product_images');
    const targetCollection = targetDb.collection('products');

    // Clear the target collection
    await targetCollection.deleteMany({});

    const products = await sourceCollection
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

    let insertedCount = 0;

    for (const p of products) {
      const code = p.code;
      if (!code) continue;
      let paddedCode = code;
      if (code.length < 13) {
        paddedCode = code.padStart(13, '0');
      }
      if (paddedCode.length !== 13) continue;

      // Split code: e.g., 8908024057357 -> 890/802/405/7357
      const codeSplit = paddedCode.match(/^(\d{3})(\d{3})(\d{3})(\d{4})$/);
      if (!codeSplit) continue;
      const codePath = codeSplit.slice(1).join('/');

      const baseUrl = 'https://images.openfoodfacts.org/images/products';
      const selectedImages = p.images?.selected || {};

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

      // Only insert if there are images
      if (imageUrls.length > 0) {
        const doc = {
          uid: paddedCode,
          product_name: p.product_name || 'Unknown Product',
          imageUrls: imageUrls,
        };

        await targetCollection.insertOne(doc);
        insertedCount++;
      }
    }

    console.log(`Inserted ${insertedCount} documents into product_images.products collection.`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoClient.close();
  }
}

feedProductImages();
