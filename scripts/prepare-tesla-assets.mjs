import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
// Reproducible asset optimization; originals remain under their own licences.
const directory = new URL('../public/images/tesla/', import.meta.url);
await mkdir(directory, { recursive: true });
const vehicles = [
  ['model-3', 'https://upload.wikimedia.org/wikipedia/commons/6/69/Tesla_Model_3_%27Highland%27_%282024%29.jpg'],
  ['model-y', 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Tesla_Model_Y_Juniper_First_Edition_RWD_Ultra_Red_02.jpg'],
];
for (const [name, url] of vehicles) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw Error(`Vehicle image ${name}: ${response.status}`);
  await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize({ width: 900, withoutEnlargement: true }).webp({ quality: 84 }).toFile(fileURLToPath(new URL(`${name}.webp`, directory)));
  console.log(`Prepared vehicle image: ${name}`);
}
