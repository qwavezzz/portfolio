import sharp from 'sharp';
import { mkdir, copyFile, access } from 'node:fs/promises';

// Reproducible encodings of our own Blender render. No generative editing.
await mkdir('assets-source/renders', { recursive: true });
let source = 'assets-source/renders/monitor-poster.png';
try {
  await access('public/images/monitor-poster.png');
  await copyFile('public/images/monitor-poster.png', source);
} catch { /* The retained source can be encoded without rerunning Blender. */ }
await Promise.all([
  sharp(source).resize(1600).webp({ quality: 82 }).toFile('public/images/monitor-poster.webp'),
  sharp(source).resize(800).webp({ quality: 78 }).toFile('public/images/monitor-poster-mobile.webp'),
]);
