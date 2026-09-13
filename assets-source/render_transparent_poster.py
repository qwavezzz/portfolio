"""Re-render the saved workstation with alpha, without modifying the GLB."""
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'assets-source' / 'workstation.blend'))
scene = bpy.context.scene
ground = scene.objects.get('Render-only ground')
if ground:
    ground.hide_render = True
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.filepath = str(ROOT / 'public' / 'images' / 'monitor-poster.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'assets-source' / 'workstation.blend'))
bpy.ops.render.render(write_still=True)
print('TRANSPARENT_POSTER_COMPLETE')
