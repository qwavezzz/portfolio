# qwave workstation asset

Original procedural 3D scene built for the qwave Personal OS portfolio. The reference at `references/1.png` informed the restrained black metal materials and lighting; no reference pixels, third-party scene, personal claims, or third-party branding are included.

## Files

- `build_workstation.py`: complete reproducible generator, including original pixel font, projected ASCII torus, geometry, materials, lights, and camera.
- `screen-artwork.png`: original offline display texture; packed into the blend and GLB.
- `workstation.blend`: editable Blender source. Studio lights and ground are retained here.
- `workstation-metadata.json`: exact runtime bounds, screen coordinates, and camera.
- `../public/models/workstation.glb`: browser asset; geometry and packed texture only.
- `../public/images/monitor-poster.png`: matching 1600 × 1000 RGBA studio render for loading, no-WebGL and reduced-motion fallbacks; transparent background and hidden floor.

## Rebuild

Run Blender in background mode from the project directory:

```powershell
& 'C:\Program Files (x86)\Steam\steamapps\common\Blender\blender.exe' -b --factory-startup --python assets-source/build_workstation.py
```

The generator owns only the output paths above. It creates a fresh background scene and does not touch a scene open in the Blender UI. Rendering uses Cycles, 48 samples and denoising.

## Browser integration

The GLB uses Y up with the monitor facing +Z. The desk rests at Y=0. Static geometry is joined by material to minimize draw calls; the display remains a separate mesh named `Screen`. Materials use standard glTF metal/rough PBR, with an emissive display. No external decoder or HDR environment is required.

Screen center is `[-0.54, 1.98, -0.004]`, size `4.02 × 2.25`. The poster camera is `[5, 3.8, 7]`, looking at `[0, 1.5, 0]`, with approximately `29.99°` vertical FOV at 1.6 aspect. The screen is decorative; all content and navigation must also exist in HTML.

The poster studio uses large soft area lights; browser lighting can use a neutral ambient fill and three directional lights to reveal graphite edges. The poster uses native alpha with the studio floor hidden, matching the transparent WebGL canvas. The floor remains editable in the Blender source and is excluded from the GLB. Exact min/max bounds are in the JSON metadata. The final GLB has 8 meshes, 8 materials, 35,366 triangles, and one embedded PNG texture; it requires no external decoder.

## Provenance

Model, bitmap font, and display artwork were authored procedurally for this project by Codex. The raster origin is `assets-source/build_workstation.py`; raster provenance is embedded with Impeccable's `embed-prompt` command after generation. The string `qwave` was supplied by the user. `PERSONAL OS`, `WORK`, `ABOUT`, and `CONTACT` describe the fictional display shell and are not personal facts.
