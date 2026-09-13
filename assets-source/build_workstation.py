"""Original qwave workstation. Run with Blender --background --python this_file.

All model helpers use glTF-style coordinates: X right, Y up, Z toward viewer.
The procedural pixel display is original artwork, not a screenshot of a UI.
"""
from pathlib import Path
import bpy, math, json, struct, zlib
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets-source'
MODELS = ROOT / 'public' / 'models'
IMAGES = ROOT / 'public' / 'images'
for folder in (SOURCE, MODELS, IMAGES): folder.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

# A small authored bitmap font keeps the in-world display unmistakably pixel based.
GLYPHS = {
 'A':['01110','10001','10001','11111','10001','10001','10001'],
 'B':['11110','10001','10001','11110','10001','10001','11110'],
 'C':['01111','10000','10000','10000','10000','10000','01111'],
 'D':['11110','10001','10001','10001','10001','10001','11110'],
 'E':['11111','10000','10000','11110','10000','10000','11111'],
 'F':['11111','10000','10000','11110','10000','10000','10000'],
 'G':['01111','10000','10000','10111','10001','10001','01111'],
 'H':['10001','10001','10001','11111','10001','10001','10001'],
 'I':['11111','00100','00100','00100','00100','00100','11111'],
 'J':['00111','00010','00010','00010','10010','10010','01100'],
 'K':['10001','10010','10100','11000','10100','10010','10001'],
 'L':['10000','10000','10000','10000','10000','10000','11111'],
 'M':['10001','11011','10101','10101','10001','10001','10001'],
 'N':['10001','11001','10101','10011','10001','10001','10001'],
 'O':['01110','10001','10001','10001','10001','10001','01110'],
 'P':['11110','10001','10001','11110','10000','10000','10000'],
 'Q':['01110','10001','10001','10001','10101','10010','01101'],
 'R':['11110','10001','10001','11110','10100','10010','10001'],
 'S':['01111','10000','10000','01110','00001','00001','11110'],
 'T':['11111','00100','00100','00100','00100','00100','00100'],
 'U':['10001','10001','10001','10001','10001','10001','01110'],
 'V':['10001','10001','10001','10001','10001','01010','00100'],
 'W':['10001','10001','10001','10101','10101','10101','01010'],
 'X':['10001','10001','01010','00100','01010','10001','10001'],
 'Y':['10001','10001','01010','00100','00100','00100','00100'],
 'Z':['11111','00001','00010','00100','01000','10000','11111'],
 'q':['00000','00000','01110','10010','10010','01110','00010'],
 'w':['00000','00000','10001','10001','10101','10101','01010'],
 'a':['00000','00000','01110','00001','01111','10001','01111'],
 'v':['00000','00000','10001','10001','10001','01010','00100'],
 'e':['00000','00000','01110','10001','11111','10000','01111'],
 '.':['00000','00000','00000','00000','00000','00100','00100'],
 ':':['00000','00100','00100','00000','00100','00100','00000'],
 '-':['00000','00000','00000','11111','00000','00000','00000'],
 '=':['00000','00000','11111','00000','11111','00000','00000'],
 '+':['00000','00100','00100','11111','00100','00100','00000'],
 '*':['00000','10101','01110','11111','01110','10101','00000'],
 '#':['01010','01010','11111','01010','11111','01010','01010'],
 '%':['11001','11010','00100','00100','01000','10110','00110'],
 '@':['01110','10001','10111','10101','10111','10000','01111'],
 '/':['00001','00010','00010','00100','01000','01000','10000'],
 '>':['10000','01000','00100','00010','00100','01000','10000'],
}
W,H=1536,864
pixels=bytearray([8,8,8])*(W*H)
def rect(x,y,w,h,c):
    c=(c,c,c) if isinstance(c,int) else c
    row=bytes(c)*max(0,min(w,W-x))
    for yy in range(max(0,y),min(H,y+h)):
        pixels[(yy*W+x)*3:(yy*W+x)*3+len(row)]=row
def text(s,x,y,size=2,c=210):
    for ch in s:
        for yy,line in enumerate(GLYPHS.get(ch,['00000']*7)):
            for xx,bit in enumerate(line):
                if bit=='1': rect(x+xx*size,y+yy*size,size,size,c)
        x+=6*size
def outline(x,y,w,h,c=130,t=2):
    rect(x,y,w,t,c);rect(x,y+h-t,w,t,c);rect(x,y,t,h,c);rect(x+w-t,y,t,h,c)

# Header, left shortcut rail and a deliberate empty field around the signal.
text('qwave',52,14,7,232)
text('PERSONAL OS',1194,39,3,170)
rect(48,88,1440,1,73)
icon_x=64
for k,label in enumerate(('WORK','ABOUT','CONTACT')):
    yy=160+k*152
    if k==0:
        outline(icon_x,yy+12,62,42,210,3);rect(icon_x,yy,27,12,210)
    elif k==1:
        outline(icon_x+18,yy,25,25,210,4);outline(icon_x+7,yy+34,47,30,210,4)
    else:
        outline(icon_x,yy+5,62,42,210,3)
        for q in range(15):
            rect(icon_x+q*2,yy+8+q,3,3,210);rect(icon_x+58-q*2,yy+8+q,3,3,210)
    text(label,icon_x-2,yy+76,2,160)

# Project a lit, tilted torus into an ASCII depth buffer.
cols,rows=98,43
depth=[-1e9]*(cols*rows); brightness=[None]*(cols*rows)
A,B=0.92,-0.38
for ai in range(460):
    a=ai*math.tau/460
    for bi in range(170):
        b=bi*math.tau/170
        x=(1.6+0.66*math.cos(b))*math.cos(a)
        y=(1.6+0.66*math.cos(b))*math.sin(a)
        z=.66*math.sin(b)
        nx,ny,nz=math.cos(b)*math.cos(a),math.cos(b)*math.sin(a),math.sin(b)
        ya,za=y*math.cos(A)-z*math.sin(A),y*math.sin(A)+z*math.cos(A)
        nya,nza=ny*math.cos(A)-nz*math.sin(A),ny*math.sin(A)+nz*math.cos(A)
        xx,yy=x*math.cos(B)-ya*math.sin(B),x*math.sin(B)+ya*math.cos(B)
        nxx,nyy=nx*math.cos(B)-nya*math.sin(B),nx*math.sin(B)+nya*math.cos(B)
        ix=int(cols/2+xx*20.1);iy=int(rows/2-yy*10.8)
        if 0<=ix<cols and 0<=iy<rows and za>depth[iy*cols+ix]:
            depth[iy*cols+ix]=za
            brightness[iy*cols+ix]=max(0.13,min(1,.37+nxx*-.40+nyy*.47+nza*.55))
chars='.:--=+*#%@'
for yy in range(rows):
    for xx in range(cols):
        level=brightness[yy*cols+xx]
        if level is not None:
            text(chars[min(9,int(level*9))],330+xx*11,122+yy*14,1,int(75+level*173))
text('qwave',335,690,13,230)
text('A PERSONAL SPACE ON THE WEB',808,756,2,135)
rect(48,818,1440,1,70)
text('WORK / ABOUT / CONTACT',51,835,2,154)
text('EXPLORE >',1380,835,2,200)

raw=b''.join(b'\x00'+bytes(pixels[y*W*3:(y+1)*W*3]) for y in range(H))
def chunk(kind,data):
    return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
screen_path=SOURCE/'screen-artwork.png'
screen_path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!IIBBBBB',W,H,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b''))

def V(p): return (p[0],-p[2],p[1])
def mat(name,color,metal=0,rough=.4):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
    return m
black=mat('Ceramic graphite',(.023,.025,.029),.58,.29)
desk=mat('Dark machined aluminum',(.019,.022,.026),.72,.31)
edge=mat('Anodized edge highlights',(.18,.195,.215),.82,.28)
rubber=mat('Rubber and cable',(.008,.009,.011),.05,.52)
keys=mat('Keycaps',(.045,.047,.052),.1,.4)
silver=mat('Laser markings',(.40,.42,.45),.35,.44)
white=mat('Power light',(.70,.75,.80),.0,.3)
bs=white.node_tree.nodes.get('Principled BSDF');bs.inputs['Emission Color'].default_value=(.7,.75,.8,1);bs.inputs['Emission Strength'].default_value=1.8

def box(name,pos,size,material,bevel=.015,segments=2):
    bpy.ops.mesh.primitive_cube_add(size=1,location=V(pos));o=bpy.context.object;o.name=name
    o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material)
    if bevel:
        mod=o.modifiers.new('Precisely eased edges','BEVEL');mod.width=bevel;mod.segments=segments
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        norm=o.modifiers.new('Weighted highlights','WEIGHTED_NORMAL');norm.keep_sharp=True
        bpy.ops.object.modifier_apply(modifier=norm.name)
    return o
def sphere(name,pos,scale,material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=V(pos));o=bpy.context.object;o.name=name
    o.scale=(scale[0],scale[2],scale[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=True
    return o
def cable(name,pts,r=.015,material=rubber):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=10;curve.bevel_depth=r;curve.bevel_resolution=2
    sp=curve.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
    for p,co in zip(sp.bezier_points,pts):p.co=V(co);p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.data.materials.append(material)
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
    return o
def mesh(name,verts,faces,material):
    me=bpy.data.meshes.new(name);me.from_pydata([V(p) for p in verts],[],faces);me.update()
    o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(material);return o

# Low architectural desk/plinth with real milled channels on top and fluted sides.
box('Desk core',(0,.23,0),(6,.46,2.85),desk,.025,3)
box('Desk lower shadow reveal',(0,.055,0),(5.91,.10,2.77),rubber,.015)
box('Front silver rail',(0,.443,1.424),(6,.032,.020),edge,.006)
box('Right silver rail',(2.991,.443,0),(.019,.032,2.85),edge,.005)
for i in range(93):
    xx=-2.95+i*5.90/92
    box('Desk milled rib',(xx,.469,0),(.013,.017,2.76),edge,.003,1)
    box('Front vertical flute',(xx,.265,1.432),(.012,.337,.019),desk,.004,1)
for i in range(43):
    zz=-1.34+i*2.68/42
    box('Right vertical flute',(3.005,.265,zz),(.015,.337,.012),desk,.003,1)

# Large thin monitor; a contrasting metal gasket outlines the black bezel.
MX=-.54;CY=1.98
box('Monitor aluminum chassis',(MX,CY,-.12),(4.19,2.44,.135),edge,.037,4)
box('Monitor rear cover',(MX,CY,-.202),(4.10,2.35,.089),black,.055,4)
box('Monitor black bezel',(MX,CY,-.037),(4.155,2.405,.055),rubber,.024,3)
screenmat=mat('Screen artwork',(.008,.008,.008),0,.55)
nt=screenmat.node_tree;bs=nt.nodes.get('Principled BSDF');im=nt.nodes.new('ShaderNodeTexImage');im.image=bpy.data.images.load(str(screen_path));im.image.pack()
nt.links.new(im.outputs['Color'],bs.inputs['Base Color']);nt.links.new(im.outputs['Color'],bs.inputs['Emission Color']);bs.inputs['Emission Strength'].default_value=.85
bs.inputs['Specular IOR Level'].default_value=.08
screen=mesh('Screen',[(MX-2.01,CY-1.125,-.004),(MX+2.01,CY-1.125,-.004),(MX+2.01,CY+1.125,-.004),(MX-2.01,CY+1.125,-.004)],[(0,1,2,3)],screenmat)
uv=screen.data.uv_layers.new(name='Display UV')
for poly in screen.data.polygons:
    for li,co in zip(poly.loop_indices,[(0,0),(1,0),(1,1),(0,1)]):uv.data[li].uv=co
for i in range(70):
    box('Upper monitor vents',(MX-1.99+i*.0577,3.183,-.13),(.024,.013,.074),rubber,.004,1)
for xx in (-2.50,1.4):sphere('Bezel fastener',(xx,.802,-.002),(.012,.012,.003),black)
box('Stand foot',(MX,.499,-.01),(1.06,.049,.74),edge,.048,4)
box('Stand inset',(MX,.527,-.16),(.9,.012,.29),black,.012,2)
profile=[(-.24,.515),(-.17,.52),(-.28,.85),(-.24,1.37),(-.35,1.40),(-.40,.86)]
verts=[(MX+side,y,z) for side in (-.19,.19) for z,y in profile]
n=len(profile);faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
stand=mesh('Sculpted monitor stand',verts,faces,edge)
bpy.context.view_layer.objects.active=stand;stand.select_set(True)
be=stand.modifiers.new('Stand eased corners','BEVEL');be.width=.025;be.segments=3;bpy.ops.object.modifier_apply(modifier=be.name);stand.select_set(False)
box('Monitor tiny power light',(MX+1.94,.805,-.005),(.025,.005,.009),white,.002)

# Compact keyboard with individually profiled keycaps and modest engraved legends.
KX=-.55;KZ=.96
box('Keyboard chassis',(KX,.539,KZ),(1.93,.105,.66),edge,.03,4)
box('Keyboard top plate',(KX,.601,KZ),(1.88,.024,.615),black,.014,3)
for row in range(5):
    for col in range(15):
        if row==4 and 3<=col<=10:continue
        xx=KX-.865+col*.123;zz=KZ-.237+row*.116
        box('Sculpted key',(xx,.633,zz),(.109,.045,.100),keys,.008,2)
        if row<4:
            box('Key legend',(xx-.023,.658,zz-.023),(.012,.0018,.011),silver,.001,1)
            if (col+row)%3==0:box('Second key legend',(xx-.008,.658,zz-.023),(.005,.0018,.011),silver,0)
box('Space bar',(KX-.05,.633,KZ+.227),(.975,.045,.10),keys,.009,3)
box('Escape key',(KX-.865,.635,KZ-.237),(.109,.047,.10),silver,.008,2)

# Split shell mouse and tactile wheel sit on a slim woven-black desk pad.
box('Mouse pad',(1.02,.490,.88),(.65,.018,.89),rubber,.043,4)
sphere('Mouse lower shell',(1.03,.554,.88),(.157,.055,.25),edge)
sphere('Mouse upper shell',(1.03,.590,.88),(.153,.088,.24),black)
box('Mouse button seam',(1.03,.663,.757),(.009,.012,.193),rubber,.004)
box('Mouse wheel',(1.03,.681,.749),(.032,.029,.065),edge,.010,3)
for i in range(7):box('Wheel ribs',(1.03,.697,.724+i*.008),(.034,.003,.002),rubber,.001,1)
cable('Mouse cable',[(1.03,.54,.65),(1.05,.494,.51),(1.34,.493,.25),(1.40,.49,-.34),(1.83,.495,-.49)],.009)
cable('Monitor power cable',[(MX,.68,-.29),(MX+.32,.485,-.54),(.62,.485,-.6),(1.79,.50,-.62)],.014)

# Side tower: beveled enclosure, inset side panel, recessed front vents and ports.
TX=2.16;TZ=-.26
box('Tower feet',(TX,.513,TZ),(.65,.085,.86),rubber,.025,3)
box('Tower chassis',(TX,1.36,TZ),(.80,1.63,1.08),black,.041,4)
box('Tower side inset',(TX+.405,1.38,TZ),(.015,1.47,.91),desk,.014,3)
box('Tower front plate',(TX,1.35,TZ+.548),(.707,1.44,.029),desk,.022,3)
for i in range(25):
    box('Tower front ventilation',(TX,1.10+i*.035,TZ+.566),(.558,.008,.007),rubber,.003,1)
box('Tower lower slot',(TX,.766,TZ+.57),(.51,.057,.012),rubber,.010)
box('Tower power button',(TX-.232,1.989,TZ+.575),(.065,.065,.015),edge,.014,3)
box('Tower status light',(TX-.232,1.989,TZ+.585),(.025,.005,.003),white,.001)
for xx in (TX+.03,TX+.155):box('Tower USB recess',(xx,1.986,TZ+.576),(.072,.025,.013),rubber,.004)
for i in range(18):box('Tower top vents',(TX-.305+i*.036,2.182,TZ-.06),(.013,.006,.52),rubber,.003,1)

# Join only shared-material static geometry: retain Screen for interaction/transition.
bpy.ops.object.select_all(action='DESELECT')
for material in (black,desk,edge,rubber,keys,silver,white):
    objs=[o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.materials)==1 and o.data.materials[0]==material]
    if len(objs)>1:
        for o in objs:o.select_set(True)
        bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();bpy.context.object.name=material.name.replace(' ','_')
        bpy.ops.object.select_all(action='DESELECT')

scene=bpy.context.scene
scene.world=bpy.data.worlds.new('Near black studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.10,.11,.13,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.24
def area(name,pos,power,size,target,color=(1,1,1)):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=V(pos)
    o.rotation_euler=(Vector(V(target))-o.location).to_track_quat('-Z','Y').to_euler()
area('Large softbox',(-3,6,4),1050,5,(0,1.1,0))
area('Right rim',(4.5,4,-2.5),1150,3.6,(0,1.1,0))
area('Front bounce',(1,2.8,5),200,4,(0,1.7,0))
area('Top strip',(-.8,5,-1.2),450,2.5,(0,.5,0))

# The ground belongs to the render only; the GLB has a clean compact envelope.
groundmat=mat('Studio ground',(.005,.006,.008),.15,.5)
ground=box('Render-only ground',(0,-.056,0),(2000,.1,2000),groundmat,0)
ground.hide_render=True
wn=scene.world.node_tree.nodes;wl=scene.world.node_tree.links
camera_bg=wn.new('ShaderNodeBackground');camera_bg.inputs[0].default_value=(.001,.001,.001,1)
camera_ray=wn.new('ShaderNodeLightPath');background_mix=wn.new('ShaderNodeMixShader')
wl.new(camera_ray.outputs['Is Camera Ray'],background_mix.inputs[0]);wl.new(wn['Background'].outputs[0],background_mix.inputs[1]);wl.new(camera_bg.outputs[0],background_mix.inputs[2]);wl.new(background_mix.outputs[0],wn['World Output'].inputs['Surface'])
camera_pos=(5,3.8,7);target=(0,1.5,0)
camdata=bpy.data.cameras.new('Poster camera');cam=bpy.data.objects.new('Poster camera',camdata);scene.collection.objects.link(cam)
cam.location=V(camera_pos);cam.rotation_euler=(Vector(V(target))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.lens=42;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.35
scene.render.filepath=str(IMAGES/'monitor-poster.png')

modelobjs=[o for o in scene.objects if o.type=='MESH' and o!=ground]
bounds=[(o.matrix_world@Vector(c)) for o in modelobjs for c in o.bound_box]
mins=[min(v[i] for v in bounds) for i in range(3)];maxs=[max(v[i] for v in bounds) for i in range(3)]
gmin=[mins[0],mins[2],-maxs[1]];gmax=[maxs[0],maxs[2],-mins[1]]
metadata={'coordinate_system':'Y up, +Z front','bounds':{'min':gmin,'max':gmax},'screen':{'name':'Screen','center':[MX,CY,-.004],'width':4.02,'height':2.25},'camera':{'position':camera_pos,'target':target,'lens_mm':42,'vertical_fov_degrees':math.degrees(2*math.atan(36/1.6/(2*42)))},'poster':{'width':1600,'height':1000},'mesh_count':len(modelobjs)}
(SOURCE/'workstation-metadata.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf8')
bpy.ops.object.select_all(action='DESELECT')
for o in modelobjs:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(MODELS/'workstation.glb'),export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False,export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'workstation.blend'))
bpy.ops.render.render(write_still=True)
print('QWAVE_ASSETS_COMPLETE',json.dumps(metadata))
