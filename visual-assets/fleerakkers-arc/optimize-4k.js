#!/usr/bin/env node
const sharp = require('./node_modules/sharp');
const path = require('path');

const src  = path.join(__dirname, 'image-source');
const dest = path.join(__dirname, 'images-optimized');

const images = [
  { file: 'image_01.png', name: 'image_01' },
  { file: 'image_02.png', name: 'image_02' },
  { file: 'image_03.png', name: 'image_03' },
  { file: 'image_06.jpg', name: 'image_06' },
  { file: 'image_09.png', name: 'image_09' },
];

const WIDTH = 3840;

async function run() {
  for (const img of images) {
    const input = path.join(src, img.file);
    console.log(`Processing ${img.file}...`);

    const base = sharp(input).resize({ width: WIDTH, withoutEnlargement: true });

    await sharp(input).resize({ width: WIDTH, withoutEnlargement: true })
      .avif({ quality: 60 })
      .toFile(path.join(dest, `${img.name}-3840w.avif`));
    console.log(`  → ${img.name}-3840w.avif`);

    await sharp(input).resize({ width: WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(dest, `${img.name}-3840w.webp`));
    console.log(`  → ${img.name}-3840w.webp`);
  }
  console.log('Done.');
}

run().catch(err => { console.error(err); process.exit(1); });
