// // Seed file to seed the master product data from the off_india database containing about 7000 Indian products

// const { MongoClient } = require('mongodb');
// const { Client } = require('pg');

// const MONGO_URL = "mongodb://localhost:27017/off";
// const SUPABASE_URL = "postgresql://postgres:Nityazo@db.mxrctpircmmzizstrwoh.supabase.co:5432/postgres";

// const PLACEHOLDER_IMAGE = "https://via.placeholder.com/300x300?text=No+Image";

// function mapNutrition(product) {
//   const n = product.nutriments || {};

//   return {
//     per: "100g",
//     energy: {
//       kcal: n["energy-kcal_100g"] ?? null,
//       kj: n["energy_100g"] ?? null,
//     },
//     macros: {
//       protein: n["proteins_100g"] ?? null,
//       fat: n["fat_100g"] ?? null,
//       saturated_fat: n["saturated-fat_100g"] ?? null,
//       carbohydrates: n["carbohydrates_100g"] ?? null,
//       sugars: n["sugars_100g"] ?? null,
//       fiber: n["fiber_100g"] ?? null,
//       salt: n["salt_100g"] ?? null,
//     },
//     micros: {
//       sodium: n["sodium_100g"] ?? null,
//     },
//     source: "openfoodfacts",
//     last_updated: new Date().toISOString(),
//   };
// }

// function mapCategory(offProduct) {
//   // Use categories_hierarchy or categories
//   const cat = offProduct.categories_hierarchy?.[0] || offProduct.categories || "Grocery";
//   // Clean it, e.g., "en:snacks" -> "Snacks"
//   return cat.replace(/^en:/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
// }

// function parseQuantity(q) {
//   if (!q || typeof q !== 'string') return { value: 1, unit: 'unit' };
//   const match = q.match(/^(\d+(?:\.\d+)?)\s*(\w+)$/);
//   if (match) {
//     return { value: parseFloat(match[1]), unit: match[2].toLowerCase() };
//   }
//   return { value: 1, unit: 'unit' };
// }

// async function seedData() {
//   const mongoClient = new MongoClient(MONGO_URL);
//   const pgClient = new Client({ connectionString: SUPABASE_URL });

//   try {
//     await mongoClient.connect();
//     await pgClient.connect();

//     const db = mongoClient.db('off_india');
//     const collection = db.collection('products'); // Assuming collection name is 'products'

//     const products = await collection.find({
//       $and: [
//         {
//           $or: [
//             { countries: /india/i },
//             { countries_tags: "en:india" },
//             { countries_hierarchy: "en:india" },
//           ],
//         },
//         { product_name: { $exists: true, $ne: "", $not: /fake/i } },
//       ],
//     }).toArray();

//     console.log(`Found ${products.length} products to seed.`);

//     for (const p of products) {
//       try {
//         // Determine category
//         const categoryName = mapCategory(p);
//         let categoryId;

//         // Find or insert category
//         const categoryQuery = `SELECT id FROM categories WHERE name = $1`;
//         let res = await pgClient.query(categoryQuery, [categoryName]);
//         if (res.rows.length === 0) {
//           const insertCat = `INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id`;
//           res = await pgClient.query(insertCat, [categoryName]);
//           if (res.rows.length > 0) {
//             categoryId = res.rows[0].id;
//           } else {
//             // If conflict, get existing
//             res = await pgClient.query(categoryQuery, [categoryName]);
//             categoryId = res.rows[0].id;
//           }
//         } else {
//           categoryId = res.rows[0].id;
//         }

//         // Map nutritional info
//         const nutrition = mapNutrition(p);

//         // Parse quantity
//         const qtyParsed = parseQuantity(p.quantity);
//         let base_unit = p.product_quantity_unit || qtyParsed.unit;
//         let unit_value = p.product_quantity || qtyParsed.value;

//         // Insert product
//         const productQuery = `
//           INSERT INTO products (
//             barcode, gtin, sku, category_id, name, brand, manufacturer,
//             image_url, thumbnail_url, description, base_unit, unit_value,
//             display_price, mrp, ingredients, allergens, nutritional_info,
//             fssai_license, is_subscribable, is_active, is_verified, keywords
//           ) VALUES (
//             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
//             $15, $16, $17, $18, $19, $20, $21, $22
//           ) RETURNING id
//         `;
//         const productValues = [
//           p.code,
//           p.code,
//           `OFF-${p.code}`,
//           categoryId,
//           p.product_name || "Unknown Product",
//           p.brands || null,
//           p.manufacturing_places || null,
//           PLACEHOLDER_IMAGE,
//           PLACEHOLDER_IMAGE,
//           p.generic_name || null,
//           base_unit,
//           unit_value,
//           0,
//           null,
//           p.ingredients_text || null,
//           [], // allergens, assuming empty or parse if needed
//           nutrition,
//           null,
//           false,
//           true,
//           false,
//           p._keywords || []
//         ];
//         const productRes = await pgClient.query(productQuery, productValues);
//         const productId = productRes.rows[0].id;

//         // Insert grocery_details
//         const groceryQuery = `
//           INSERT INTO grocery_details (
//             product_id, shelf_life_days, package_size, package_type,
//             country_of_origin, custom_fields
//           ) VALUES ($1, $2, $3, $4, $5, $6)
//         `;
//         const groceryValues = [
//           productId,
//           null,
//           p.quantity || null,
//           "packet",
//           "India",
//           {
//             openfoodfacts_id: p.code,
//             data_source: "openfoodfacts"
//           }
//         ];
//         await pgClient.query(groceryQuery, groceryValues);

//         console.log(`Seeded product: ${p.product_name}`);
//       } catch (err) {
//         console.error(`Error seeding product ${p.code}:`, err.message);
//         // Continue to next product
//       }
//     }

//     console.log("Seeding completed.");
//   } catch (err) {
//     console.error("Seeding failed:", err);
//   } finally {
//     await mongoClient.close();
//     await pgClient.end();
//   }
// }

// seedData();





const { MongoClient } = require("mongodb");
const { Client } = require("pg");

const MONGO_URL = "mongodb://localhost:27017/off";
const SUPABASE_URL =
  "postgresql://postgres:Nityazo@db.mxrctpircmmzizstrwoh.supabase.co:5432/postgres";

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/300x300?text=No+Image";

function mapNutrition(product) {
  const n = product.nutriments || {};

  return {
    per: "100g",
    energy: {
      kcal: n["energy-kcal_100g"] ?? null,
      kj: n["energy_100g"] ?? null,
    },
    macros: {
      protein: n["proteins_100g"] ?? null,
      fat: n["fat_100g"] ?? null,
      saturated_fat: n["saturated-fat_100g"] ?? null,
      carbohydrates: n["carbohydrates_100g"] ?? null,
      sugars: n["sugars_100g"] ?? null,
      fiber: n["fiber_100g"] ?? null,
      salt: n["salt_100g"] ?? null,
    },
    micros: {
      sodium: n["sodium_100g"] ?? null,
    },
    source: "openfoodfacts",
    last_updated: new Date().toISOString(),
  };
}

function mapCategory(offProduct) {
  // Use categories_hierarchy or categories
  const cat =
    offProduct.categories_hierarchy?.[0] || offProduct.categories || "Grocery";
  // Clean it, e.g., "en:snacks" -> "Snacks"
  return cat
    .replace(/^en:/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function parseQuantity(q) {
  if (!q || typeof q !== "string") return { value: 1, unit: "unit" };
  const match = q.match(/^(\d+(?:\.\d+)?)\s*(\w+)$/);
  if (match) {
    return { value: parseFloat(match[1]), unit: match[2].toLowerCase() };
  }
  return { value: 1, unit: "unit" };
}

async function seedData() {
  const mongoClient = new MongoClient(MONGO_URL);
  const pgClient = new Client({ connectionString: SUPABASE_URL });

  try {
    await mongoClient.connect();
    await pgClient.connect();

    const db = mongoClient.db("off_india");
    const collection = db.collection("products"); // Assuming collection name is 'products'

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

    console.log(`Found ${products.length} products to seed.`);

    for (const p of products) {
      try {
        // Determine category
        const categoryName = mapCategory(p);
        let categories_hierarchy = p.categories_hierarchy || [`en:${categoryName.toLowerCase().replace(/ /g, '-')}`];
        let compared_to_category = p.compared_to_category || `en:${categoryName.toLowerCase().replace(/ /g, '-')}`;
        let categories = categoryName;
        let categoryId;

        // Find or insert category
        const categoryQuery = `SELECT id FROM categories WHERE name = $1`;
        let res = await pgClient.query(categoryQuery, [categoryName]);
        if (res.rows.length === 0) {
          const insertCat = `INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id`;
          res = await pgClient.query(insertCat, [categoryName]);
          if (res.rows.length > 0) {
            categoryId = res.rows[0].id;
          } else {
            // If conflict, get existing
            res = await pgClient.query(categoryQuery, [categoryName]);
            categoryId = res.rows[0].id;
          }
        } else {
          categoryId = res.rows[0].id;
        }

        // Map nutritional info
        const nutrition = mapNutrition(p);

        // Parse quantity
        const qtyParsed = parseQuantity(p.quantity);
        let base_unit = p.product_quantity_unit || qtyParsed.unit;
        let unit_value = p.product_quantity || qtyParsed.value;

        // Insert product
        const productQuery = `
          INSERT INTO products (
            barcode, gtin, sku, category_id, name, brand, manufacturer,
            image_url, thumbnail_url, description, base_unit, unit_value,
            display_price, mrp, ingredients, allergens, nutritional_info,
            fssai_license, is_subscribable, is_active, is_verified, keywords,
            categories, compared_to_category, categories_hierarchy
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
          ) RETURNING id
        `;
        const productValues = [
          p.code,
          p.code,
          `OFF-${p.code}`,
          categoryId,
          p.product_name || "Unknown Product",
          p.brands || null,
          p.manufacturing_places || null,
          PLACEHOLDER_IMAGE,
          PLACEHOLDER_IMAGE,
          p.generic_name || null,
          base_unit,
          unit_value,
          0,
          null,
          p.ingredients_text || null,
          [], // allergens, assuming empty or parse if needed
          nutrition,
          null,
          false,
          true,
          false,
          p._keywords || [],
          categories,
          compared_to_category,
          JSON.stringify(categories_hierarchy),
        ];
        const productRes = await pgClient.query(productQuery, productValues);
        const productId = productRes.rows[0].id;

        // Insert grocery_details
        const groceryQuery = `
          INSERT INTO grocery_details (
            product_id, shelf_life_days, package_size, package_type,
            country_of_origin, custom_fields
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `;
        const groceryValues = [
          productId,
          null,
          p.quantity || null,
          "packet",
          "India",
          {
            openfoodfacts_id: p.code,
            data_source: "openfoodfacts",
          },
        ];
        await pgClient.query(groceryQuery, groceryValues);

        console.log(`Seeded product: ${p.product_name}`);
      } catch (err) {
        console.error(`Error seeding product ${p.code}:`, err.message);
        // Continue to next product
      }
    }

    console.log("Seeding completed.");
  } catch (err) {
    console.error("Seeding failed:", err);
  } finally {
    await mongoClient.close();
    await pgClient.end();
  }
}

seedData();
