const fs = require('fs');
const path = require('path');
const axios = require('axios');
const puppeteer = require('puppeteer');

const inputFile = 'unavailable_product_names.txt';
const outputFolder = 'product_images';
const IMAGES_PER_PRODUCT = 1; // Blinkit-style: 1 clean image
const THROTTLE = 1200;

const sleep = ms => new Promise(r => setTimeout(r, ms));

if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder);

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

async function downloadImage(url, filepath) {
  const res = await axios.get(url, { responseType: 'stream', timeout: 20000 });
  await new Promise((resolve, reject) => {
    res.data.pipe(fs.createWriteStream(filepath))
      .on('finish', resolve)
      .on('error', reject);
  });
}

async function getImageUrls(page, query, limit) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' product packshot white background')}&tbm=isch`;
  
  await page.goto(searchUrl, { waitUntil: 'networkidle2' });
  
  // Selectors for thumbnails (try multiple common ones)
  const thumbSelector = 'div.isv-r a, div[data-ri] a';
  await page.waitForSelector(thumbSelector, { timeout: 5000 }).catch(() => console.log('  No thumbnails found'));

  const urls = new Set();
  const thumbs = await page.$$(thumbSelector);
  
  // Try up to 5 thumbnails to find 1 good image
  for (let i = 0; i < Math.min(thumbs.length, 5) && urls.size < limit; i++) {
    try {
      await thumbs[i].click();
      
      // Wait for the full image to load in the side panel
      // We look for an image that is NOT a data URI and NOT a google thumbnail
      const imgUrl = await page.evaluate(async () => {
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        let attempts = 0;
        while (attempts < 10) { // Wait up to 2 seconds
          const images = Array.from(document.querySelectorAll('img[src^="http"]'));
          // Find the largest image that looks like a product photo
          const bestImg = images.find(img => {
            const src = img.src;
            return !src.includes('encrypted-tbn0') && 
                   !src.includes('google.com') &&
                   !src.includes('gstatic.com') &&
                   img.naturalWidth > 200; // Ensure it's a decent size
          });
          
          if (bestImg) return bestImg.src;
          await sleep(200);
          attempts++;
        }
        return null;
      });

      if (imgUrl) {
        urls.add(imgUrl);
        console.log(`  Found URL: ${imgUrl.substring(0, 50)}...`);
      }
    } catch (e) {
      // Ignore click errors
    }
  }

  return Array.from(urls);
}

async function processProduct(browser, product) {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
  );

  try {
    const urls = await getImageUrls(page, product, IMAGES_PER_PRODUCT);
    if (!urls.length) {
      console.warn(`❌ No images for: ${product}`);
      return;
    }

    for (let i = 0; i < urls.length; i++) {
      const ext = path.extname(new URL(urls[i]).pathname) || '.jpg';
      const file = path.join(outputFolder, `${slugify(product)}${ext}`);
      await downloadImage(urls[i], file);
      console.log(`✅ Saved: ${file}`);
    }
  } catch (e) {
    console.error(`⚠️ Error: ${product}`, e.message);
  } finally {
    await page.close();
  }
}

async function main() {
  const products = fs
    .readFileSync(inputFile, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const browser = await puppeteer.launch({
    headless: false, // IMPORTANT
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const product of products) {
    console.log(`🔍 ${product}`);
    await processProduct(browser, product);
    await sleep(THROTTLE);
  }

  await browser.close();
  console.log('🎉 DONE');
}

main();
