const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const port = 3000;
const MONGO_URL = "mongodb://localhost:27017/product_images";

app.use(express.static('public'));

app.get('/api/products', async (req, res) => {
  const client = new MongoClient(MONGO_URL);
  try {
    await client.connect();
    const db = client.db('product_images');
    const collection = db.collection('products');
    const products = await collection.find({}).toArray();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await client.close();
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});