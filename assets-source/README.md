# qwave night-room asset

An editable Blender room built around the original qwave monitor. `references/7.jpg` supplies the requested atmosphere and object inventory. The exact bytes of the user-provided `references/8.jpg` are embedded as the window view; there is no city geometry.

## Source and outputs

- `build_workstation.py`: reproducible entry point; main computer, materials, cameras, export and both poster renders.
- `room_details.py`: desk and drawers, portrait monitor, mesh office chair, mug, headphones, books, shelving, plant, original wall prints, floor, rug and window.
- `workstation.blend`: editable source with packed images and lighting.
- `screen-artwork.png`, `secondary-display.png`: original decorative display textures, generated from code.
- `workstation-metadata.json`: screen bounds, desktop/mobile cameras and scene bounds.
- `model-report.json`: measured size, triangles, textures, screen-bound verification and city-image SHA-256 after optimization.
- `renders/`: desktop and portrait poster sources. The mobile image is rendered with its own camera, not resized from the landscape view.
- `../public/models/workstation.glb`: optimized browser scene, with all images embedded.
- `../public/images/monitor-poster*.webp`: loading, reduced-motion and unavailable-WebGL fallbacks.

## Rebuild

From the project directory:

```powershell
& 'C:\Program Files (x86)\Steam\steamapps\common\Blender\blender.exe' --background --factory-startup --python assets-source/build_workstation.py
node scripts/optimize-model.mjs
node scripts/optimize-poster.mjs
```

Blender creates a fresh background scene; it does not modify the scene open in the Blender UI. Cycles renders two images at 32 samples with denoising. The saved `.blend` retains the desktop camera. `render_transparent_poster.py` can re-render that saved desktop view.

glTF Transform welds vertices, removes duplicates and unused data, and quantizes attributes. Quantization is decoded natively by Three.js without an external decoder. The optimizer checks the main screen's world bounds within 0.001 units and reopens the written GLB to verify the city JPEG byte for byte. Both monitor displays and the photograph use unlit materials so room lights cannot wash out their content.

## Runtime contract

Y up, +Z toward the viewer. Main screen center `[-0.54, 1.98, -0.004]`, width `4.02`, height `2.25`; it remains a separate `Screen` node. `Portrait_Display` and `City_Backdrop` also have stable names. Other geometry is joined by shared material. Camera configurations are read directly from `workstation-metadata.json` by the browser.

One canvas uses demand rendering, a DPR cap of 1.5 and one cached 2048px shadow map. Lighting is dynamic PBR for the room, unlit for the screens/photo. All objects and lights are stationary, so the shadow map does not need recomputing when the camera moves. No collision system or physics is needed for the fixed camera path. The portrait camera crops peripheral furniture to keep the main display legible.

## Provenance

Furniture, accessories, original print graphics and both display textures were authored procedurally for this project. `qwave` was supplied by the user. The city photograph was supplied by the user as `references/8.jpg`; no claim of original authorship is made for it. Reference 7 informs the composition and is not copied into the shipped scene. Poster images are Blender renders of this geometry and photograph; WebP files carry sidecar provenance.
