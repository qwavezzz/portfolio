import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRMaterialsUnlit } from '@gltf-transform/extensions';
import { dedup, prune, weld, quantize, getBounds } from '@gltf-transform/functions';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const file = 'public/models/workstation.glb';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const before = (await stat(file)).size;
const document = await io.read(file);
await document.transform(weld(), dedup(), prune(), quantize({ quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14 }));
const root = document.getRoot();
const unlit = document.createExtension(KHRMaterialsUnlit);
for (const name of ['Screen', 'City_Backdrop', 'Portrait_Display']) {
  const node = root.listNodes().find(node => node.getName() === name);
  if (!node) throw new Error(`Missing required node: ${name}`);
  const display = node.getMesh().listPrimitives()[0].getMaterial();
  display.setBaseColorTexture(display.getEmissiveTexture() ?? display.getBaseColorTexture())
    .setBaseColorFactor([1, 1, 1, 1]).setEmissiveTexture(null).setEmissiveFactor([0, 0, 0])
    .setMetallicFactor(0).setRoughnessFactor(1)
    .setExtension('KHR_materials_unlit', unlit.createUnlit());
}
const city = root.listNodes().find(node => node.getName() === 'City_Backdrop');
const material = city.getMesh().listPrimitives()[0].getMaterial();
const hash = data => createHash('sha256').update(data).digest('hex');
const supplied = await readFile('references/8.jpg');
const cityTexture = material.getBaseColorTexture() ?? material.getEmissiveTexture();
if (!cityTexture) throw new Error('The city backdrop requires its unlit photograph.');
// Blender may re-encode a packed image during export. Embed the source bytes
// directly so the shipped background is precisely the user's supplied JPEG.
cityTexture.setImage(supplied).setMimeType('image/jpeg');
const screen = root.listNodes().find(node => node.getName() === 'Screen');
const bounds = getBounds(screen);
const expected = { min: [-2.55, .855, -.004], max: [1.47, 3.105, -.004] };
for (const side of ['min', 'max']) for (let axis = 0; axis < 3; axis++) {
  if (Math.abs(bounds[side][axis] - expected[side][axis]) > .001) throw new Error('Primary screen moved during optimization.');
}
let triangles = 0;
for (const mesh of root.listMeshes()) for (const primitive of mesh.listPrimitives()) {
  triangles += (primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION').getCount()) / 3;
}
await io.write(file, document);
const verified = await io.read(file);
const packedMaterial = verified.getRoot().listNodes().find(node => node.getName() === 'City_Backdrop').getMesh().listPrimitives()[0].getMaterial();
const packedCity = (packedMaterial.getBaseColorTexture() ?? packedMaterial.getEmissiveTexture()).getImage();
if (hash(packedCity) !== hash(supplied)) throw new Error('City JPEG changed during packaging.');
const report = {
  source: 'assets-source/build_workstation.py + room_details.py',
  beforeBytes: before, bytes: (await stat(file)).size,
  meshes: root.listMeshes().length, materials: root.listMaterials().length,
  triangles, textures: root.listTextures().map(texture => ({ name: texture.getName(), mime: texture.getMimeType(), size: texture.getSize(), bytes: texture.getImage()?.byteLength })),
  citySource: 'references/8.jpg', citySHA256: hash(supplied), cityOriginalBytesPreserved: true,
  optimization: ['weld', 'dedup', 'prune', 'quantize'], decoderRequired: false, screenBounds: bounds,
};
await writeFile('assets-source/model-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
