const fs = require('fs');

const inputFile = 'unavailable_images_products.txt';
const outputFile = 'unavailable_product_names.txt';

const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n').filter(line => line.trim());

const names = lines.map(line => {
  const match = line.match(/^(.+?)\s*\([^)]+\)$/);
  return match ? match[1].trim() : line.trim();
});

fs.writeFileSync(outputFile, names.join('\n'));

console.log(`Extracted ${names.length} product names to ${outputFile}`);