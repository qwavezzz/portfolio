import sharp from 'sharp';
import { mkdir, copyFile, access, writeFile } from 'node:fs/promises';

// Reproducible encodings of our own Blender render. No generative editing.
await mkdir('assets-source/renders', { recursive: true });
let source = 'assets-source/renders/monitor-poster.png';
try {
  await access('public/images/monitor-poster.png');
  await copyFile('public/images/monitor-poster.png', source);
} catch { /* The retained source can be encoded without rerunning Blender. */ }
await Promise.all([
  sharp(source).resize(1600).webp({ quality: 82 }).toFile('public/images/monitor-poster.webp'),
  sharp('assets-source/renders/monitor-poster-mobile.png').resize(800).webp({ quality: 80 }).toFile('public/images/monitor-poster-mobile.webp'),
]);
for (const name of ['monitor-poster.webp', 'monitor-poster-mobile.webp']) {
  const origin = { prompt: `ORIGIN: Blender render of original qwave room geometry (assets-source/build_workstation.py and room_details.py), incorporating the user-supplied references/8.jpg as the window photo. Composition reference: references/7.jpg. ${name.includes('mobile') ? 'Dedicated portrait camera.' : 'Desktop camera.'} Encoded by scripts/optimize-poster.mjs.`, createdAt: new Date().toISOString() };
  await writeFile(`public/images/${name}.json`, JSON.stringify(origin, null, 2) + '\n');
}
