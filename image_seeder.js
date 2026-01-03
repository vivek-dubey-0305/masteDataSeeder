const { MongoClient } = require("mongodb");
const { Client } = require("pg");

const IMAGES_MONGO_URL = "mongodb://localhost:27017/product_images";
const SUPABASE_URL =
  "postgresql://postgres.ccryowfcskylkctgszkj:Nityazo-dev@aws-1-ap-south-1.pooler.supabase.com:6543/postgres";

async function seedImagesTempOnly() {
  const mongoClient = new MongoClient(IMAGES_MONGO_URL);
  const pgClient = new Client({ connectionString: SUPABASE_URL });

  try {
    await mongoClient.connect();
    await pgClient.connect();

    const db = mongoClient.db("product_images");
    const collection = db.collection("products");

    const cursor = collection.find({
      uid: { $exists: true },
      imageUrls: { $exists: true, $ne: [] },
      uid: { $regex: /^0/ },
    });

    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    for await (const doc of cursor) {
      const uid = doc.uid;
      const images = doc.imageUrls;

      // Since uid is padded, get original barcode by removing leading zeros
      const barcode = uid.replace(/^0+/, '');

      if (!Array.isArray(images) || images.length === 0) {
        skipped++;
        continue;
      }

      const res = await pgClient.query(
        `
        UPDATE products
        SET
          images_temp = $1,
          updated_at = now()
        WHERE barcode = $2
        RETURNING id
        `,
        [JSON.stringify(images), barcode],
      );

      if (res.rowCount === 0) {
        notFound++;
      } else {
        updated++;
      }
    }

    console.log("✅ images_temp seeding completed");
    console.log("Updated products:", updated);
    console.log("Skipped (no images):", skipped);
    console.log("Barcode not found:", notFound);
  } catch (err) {
    console.error("❌ Image seeding failed:", err);
  } finally {
    await mongoClient.close();
    await pgClient.end();
  }
}

seedImagesTempOnly();
