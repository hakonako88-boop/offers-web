import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const root = path.join(process.cwd(), 'public');
const svg = fs.readFileSync(path.join(root, 'brand-mark-2026.svg'));
for (const size of [48, 192, 512]) {
  await sharp(svg).resize(size, size).png().toFile(path.join(root, `favicon-${size}.png`));
}
const png = fs.readFileSync(path.join(root, 'favicon-48.png'));
const ico = Buffer.alloc(22);
ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
ico[6] = 48; ico[7] = 48;
ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(png.length, 14); ico.writeUInt32LE(22, 18);
fs.writeFileSync(path.join(root, 'favicon.ico'), Buffer.concat([ico, png]));
console.log('Brand icons generated: SVG, PNG 48/192/512 and ICO 48.');
