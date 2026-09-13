"""Room extension executed by build_workstation.py with its shared helpers.

Geometry is original. references/7.jpg supplies the composition; the unchanged
references/8.jpg is packed into one window-background plane, not reconstructed.
"""
import random
random.seed(27)

wall=mat('Midnight plaster',(.028,.037,.055),0,.92)
floor_mat=mat('Smoked oak floor',(.024,.027,.034),.03,.66)
fabric=mat('Woven charcoal fabric',(.023,.029,.039),0,.95)
paper=mat('Muted paper edges',(.19,.20,.22),0,.82)
book_blue=mat('Slate book cloth',(.025,.050,.076),0,.8)
leaf_mat=mat('Dark living leaves',(.018,.052,.038),0,.61)
coffee=mat('Coffee surface',(.009,.005,.003),0,.21)
room_materials=[wall,floor_mat,fabric,paper,book_blue,leaf_mat,coffee]
FLOOR=-3.7

def rod(name,a,b,r,material,vertices=16):
    av,bv=Vector(V(a)),Vector(V(b));delta=bv-av
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=delta.length,location=(av+bv)/2)
    ob=bpy.context.object;ob.name=name
    ob.rotation_euler=delta.to_track_quat('Z','Y').to_euler();ob.data.materials.append(material)
    for face in ob.data.polygons:face.use_smooth=True
    return ob

def label(name,value,pos,size,material=silver,side=False):
    cu=bpy.data.curves.new(name,'FONT');cu.body=value;cu.size=size;cu.extrude=.0008;cu.resolution_u=3
    ob=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(ob);ob.location=V(pos)
    ob.rotation_euler=(math.pi/2,0,math.pi/2 if side else 0);ob.data.materials.append(material)
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
    bpy.ops.object.convert(target='MESH');ob.select_set(False)
    return ob

def textured_plane(name,pos,width,height,path,strength=1,unlit=False):
    material=mat(name+' material',(.01,.01,.01),0,.8)
    nt=material.node_tree;im=nt.nodes.new('ShaderNodeTexImage');im.image=bpy.data.images.load(str(path),check_existing=True);im.image.pack()
    if unlit:
        emission=nt.nodes.new('ShaderNodeEmission');emission.inputs['Strength'].default_value=strength
        nt.links.new(im.outputs['Color'],emission.inputs['Color']);nt.links.new(emission.outputs[0],nt.nodes.get('Material Output').inputs['Surface'])
    else:
        bs=nt.nodes.get('Principled BSDF');nt.links.new(im.outputs['Color'],bs.inputs['Base Color']);nt.links.new(im.outputs['Color'],bs.inputs['Emission Color'])
        bs.inputs['Emission Strength'].default_value=strength;bs.inputs['Specular IOR Level'].default_value=.05
    x,y,z=pos
    ob=mesh(name,[(x-width/2,y-height/2,z),(x+width/2,y-height/2,z),(x+width/2,y+height/2,z),(x-width/2,y+height/2,z)],[(0,1,2,3)],material)
    uv=ob.data.uv_layers.new(name='Artwork UV')
    for polygon in ob.data.polygons:
        for li,co in zip(polygon.loop_indices,[(0,0),(1,0),(1,1),(0,1)]):uv.data[li].uv=co
    return ob

# The actual supplied JPEG is the view. Its original 16:9 ratio is preserved.
textured_plane('City_Backdrop',(-.25,3.43,-2.77),10.5,10.5*450/800,ROOT/'references'/'8.jpg',1,True)
box('Back wall below window',(0,-1.63,-2.95),(14,4.0,.25),wall,.025)
box('Back wall above window',(0,7.5,-2.95),(14,2.25,.25),wall,.025)
box('Back wall left pier',(-6.5,3.4,-2.95),(2,6.1,.25),wall,.025)
box('Back wall right pier',(6.15,3.4,-2.95),(2.3,6.1,.25),wall,.025)
box('Left room wall',(-6.65,1.4,1.1),(.24,10.2,8.35),wall,.025)
box('Room floor',(0,FLOOR-.1,1.15),(15,.2,10),floor_mat,0)
for i in range(17):
    box('Oak floor joint',(-7.1+i*.88,FLOOR+.002,1.15),(.012,.006,9.9),rubber,0)
for x in (-5.52,5.02):box('Window side frame',(x,3.43,-2.52),(.14,6.06,.25),black,.016)
for y in (.42,6.44):box('Window horizontal frame',(-.25,y,-2.52),(10.67,.16,.25),black,.016)
for x in (-2.04,1.47):
    box('Window mullion',(x,3.43,-2.49),(.085,5.89,.25),black,.012)
    box('Mullion edge',(x+.044,3.43,-2.37),(.01,5.89,.015),edge,.002)
box('Deep window sill',(-.25,.34,-2.40),(10.9,.14,.81),desk,.025)
box('Wall skirting',(0,FLOOR+.14,-2.70),(13.2,.23,.10),black,.01)

# Desk legs, under-desk tray and a drawer pedestal, with actual recessed gaps.
for x in (-4.8,4.8):
    for z in (-1.03,1.70):box('Desk steel leg',(x,-1.72,z),(.17,3.90,.17),black,.023)
    box('Desk foot crossbar',(x,FLOOR+.12,.32),(.20,.16,3.00),black,.026)
box('Rear desk brace',(0,-.02,-1.08),(9.7,.18,.18),black,.015)
box('Cable management tray',(0,.07,-1.06),(5.7,.16,.57),black,.012)
box('Drawer cabinet',(4.08,-1.67,.32),(2.05,3.57,2.7),desk,.042)
for index in range(3):
    yy=-.49-index*1.05
    box('Drawer front',(4.08,yy,1.704),(1.93,.99,.048),black,.019)
    box('Recessed drawer pull',(4.08,yy+.30,1.735),(.59,.065,.025),rubber,.01)
    box('Drawer pull lip',(4.08,yy+.265,1.753),(.52,.013,.02),edge,.004)
box('Large woven desk mat',(-.25,.489,.78),(4.60,.016,1.99),fabric,.065,4)
cable('Keyboard USB cable',[(-.55,.55,.63),(-1.3,.50,.38),(-2.0,.50,-.3),(-2.0,.13,-1.09)],.010)
cable('Tower power run',[(4.43,.58,-.72),(3.3,.49,-1.30),(1.2,.09,-1.14)],.018)

# Tall secondary monitor: original terminal-like display, no borrowed UI image.
W,H=640,1080;pixels=bytearray([7,11,15])*(W*H)
rect(0,0,W,38,(25,32,43));text('QWAVE / WORKSPACE',20,12,2,177)
rect(0,39,133,H-39,(10,15,21));text('FILES',14,69,2,131)
for i,s in enumerate(('SRC','PUBLIC','ASSETS','TESTS')):text(s,14,118+i*37,2,107)
text('PORTFOLIO',156,68,3,190);rect(150,108,465,1,(47,58,73))
for row in range(43):
    yy=133+row*15;indent=(row%7 in (2,3,4))*28
    if row in (8,16,24,32,40):continue
    x=156+indent
    for col in range(random.randint(3,6)):
        length=random.randint(16,74);color=random.choice([(85,111,130),(133,149,164),(120,150,141),(101,128,157)])
        rect(x,yy,length,3,color);x+=length+10
        if x>555:break
rect(145,815,470,1,(53,65,78));text('QWAVE / PERSONAL OS',154,842,2,143)
for row in range(10):
    text('> ',153,884+row*16,1,113)
    rect(171,886+row*16,random.randint(100,390),2,(73,104,93))
raw=b''.join(b'\x00'+bytes(pixels[y*W*3:(y+1)*W*3]) for y in range(H))
secondary_path=SOURCE/'secondary-display.png'
secondary_path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!IIBBBBB',W,H,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b''))
PX=-3.70;PY=2.01
box('Portrait monitor chassis',(PX,PY,-.08),(1.68,2.94,.12),edge,.031,3)
box('Portrait monitor bezel',(PX,PY,-.001),(1.635,2.895,.065),rubber,.023,3)
textured_plane('Portrait_Display',(PX,PY,.035),1.52,2.73,secondary_path,.75)
box('Portrait monitor base',(PX,.513,-.10),(.79,.075,.61),black,.035,3)
box('Portrait monitor neck',(PX,.73,-.18),(.11,.50,.09),edge,.018)
box('Portrait status indicator',(PX+.71,.59,.042),(.016,.008,.004),white,.001)

# Ergonomic chair: the back is actual open mesh, not a solid slab or opacity map.
CX=-2.68;CZ=3.39
def back_point(u,t):
    return (CX+u*(.91+.13*math.sin(math.pi*t)),-1.37+2.95*t,CZ+.36*t-.26*(1-u*u)*math.sin(math.pi*t))
for u in (-1,1):cable('Chair curved outer frame',[back_point(u,i/20) for i in range(21)],.074,black)
for t in (0,1):cable('Chair frame end',[back_point(-1+i/12*2,t) for i in range(13)],.074,black)
for i in range(1,21):cable('Chair horizontal mesh',[back_point(-1+j/8*2,i/21) for j in range(9)],.0075,fabric)
for i in range(1,18):cable('Chair vertical mesh',[back_point(-1+i/18*2,j/12) for j in range(13)],.0075,fabric)
cable('Chair lumbar support',[back_point(-.96+j/12*1.92,.32) for j in range(13)],.045,black)
box('Chair cushioned seat',(CX,-1.30,2.46),(2.22,.28,1.87),fabric,.19,5)
box('Chair seat base',(CX,-1.51,2.57),(1.73,.17,1.44),black,.12,4)
rod('Chair spine',(CX,-1.53,2.78),(CX,-.74,CZ+.035),.07,edge)
for side in (-1,1):
    x=CX+side*1.27
    box('Chair padded arm',(x,-.49,2.66),(.29,.18,1.42),black,.085,4)
    cable('Chair arm support',[(CX+side*.82,-1.51,2.94),(x,-1.18,2.90),(x,-.61,2.88)],.060,black)
rod('Chair gas lift',(CX,FLOOR+.30,2.68),(CX,-1.50,2.68),.105,edge,24)
rod('Chair lift sleeve',(CX,FLOOR+.30,2.68),(CX,FLOOR+1.24,2.68),.14,black,24)
for index in range(5):
    angle=index*math.tau/5
    x=CX+1.32*math.cos(angle);z=2.68+1.32*math.sin(angle)
    cable('Chair five-star base',[(CX,FLOOR+.48,2.68),(CX+.70*math.cos(angle),FLOOR+.34,2.68+.70*math.sin(angle)),(x,FLOOR+.20,z)],.085,black)
    for offset in (-.10,.10):sphere('Chair twin caster',(x+offset,FLOOR+.15,z),(.083,.15,.15),rubber)
box('Chair adjustment lever',(CX+.83,-1.57,2.36),(.38,.05,.10),black,.025)

# Cup with a real open rim, inner surface and separate coffee disk.
UX=1.88;UZ=1.08
verts=[];N=40
for radius,yy in ((.237,.503),(.264,1.14),(.227,1.14),(.212,.555)):
    verts.extend([(UX+radius*math.cos(i*math.tau/N),yy,UZ+radius*math.sin(i*math.tau/N)) for i in range(N)])
faces=[]
for ring in range(3):
    faces.extend([(ring*N+i,ring*N+(i+1)%N,(ring+1)*N+(i+1)%N,(ring+1)*N+i) for i in range(N)])
cup=mesh('Open ceramic mug',verts,faces,black)
for face in cup.data.polygons:face.use_smooth=True
cable('Mug handle',[(UX+.30+.18*math.cos(i*math.tau/32),.83+.235*math.sin(i*math.tau/32),UZ) for i in range(33)],.047,black)
rod('Coffee inside mug',(UX,1.10,UZ),(UX,1.106,UZ),.225,coffee,40)
label('Mug qwave label','qwave',(UX-.16,.79,UZ+.253),.125,paper)

# Over-ear headphones resting beside the keyboard.
HX=3.14;HZ=1.11
for side in (-1,1):
    sphere('Headphone cushion',(HX+side*.43,.65,HZ),(.17,.15,.32),rubber)
    sphere('Headphone shell',(HX+side*.54,.69,HZ),(.08,.17,.29),black)
    cable('Headphone hinge',[(HX+side*.55,.69,HZ-.09),(HX+side*.57,.86,HZ-.16),(HX+side*.50,.94,HZ-.18)],.035,edge)
arc=[(HX+.56*math.cos(i*math.pi/24),.81+.51*math.sin(i*math.pi/24),HZ-.19) for i in range(25)]
cable('Headphone metal band',arc,.051,edge)
cable('Headphone padded band',[(x,y-.055,z) for x,y,z in arc[3:-3]],.073,black)
cable('Headphone lead',[(HX+.53,.59,HZ),(3.72,.496,1.33),(3.88,.496,.77),(4.33,.55,.42)],.008,rubber)

def book(name,center,size,cover=black):
    x,y,z=center;w,h,d=size
    box(name+' pages',center,(w-.035,h-.028,d-.022),paper,.006,1)
    for dy in (-h/2,h/2):box(name+' cover',(x,y+dy,z),(w,.018,d),cover,.006,1)
    box(name+' spine',(x,y,z+d/2),(w,h,.024),cover,.008,1)

for i in range(3):
    book('Desk book',(-4.89,.585+i*.177,.95),(1.05,.145,.73),book_blue if i==1 else black)
    label('Book spine title',('FORM & CODE','PERSONAL SPACE','NOTES')[i],(-5.34,.556+i*.177,1.334),.085,silver)

# Steel shelving to the right of the window, with books, a speaker and plant.
SX=4.72;SZ=-2.04
box('Shelf dark backing',(SX,1.08,SZ-.69),(1.84,9.52,.055),black,.01)
for x in (SX-.80,SX+.80):
    for z in (SZ-.62,SZ+.62):box('Shelf upright',(x,1.08,z),(.075,9.52,.075),black,.01)
for yy in (-3.30,-1.32,.65,2.62,4.60):box('Shelf board',(SX,yy,SZ),(1.68,.09,1.40),desk,.015)
for i in range(6):
    x=SX-.58+i*.20;hh=random.uniform(.71,1.02)
    box('Shelf upright book',(x,.735+hh/2,SZ+.17),(.17,hh,.77),book_blue if i%3==0 else black,.008)
    for yy in (.91,.98):box('Book binding mark',(x,yy,SZ+.565),(.09,.009,.005),silver,0)
box('Shelf speaker',(SX,-.61,SZ),(1.00,1.31,.77),black,.06,3)
for yy,rr in ((-.35,.20),(-.87,.31)):
    speaker=sphere('Speaker cone',(SX,yy,SZ+.39),(rr,rr,.028),rubber)
    sphere('Speaker dustcap',(SX,yy,SZ+.415),(rr*.36,rr*.36,.024),black)
for i in range(2):book('Shelf laid book',(SX+.02,2.76+i*.18,SZ), (1.22,.145,.86),black)
rod('Plant ceramic pot',(SX,4.66,SZ),(SX,5.20,SZ),.33,black,32)
rod('Plant pot soil',(SX,5.205,SZ),(SX,5.215,SZ),.31,rubber,32)
for i in range(17):
    angle=i*2.4;reach=random.uniform(.38,.84);rise=random.uniform(.42,1.04)
    a=(SX,5.21,SZ);b=(SX+reach*.46*math.cos(angle),5.21+rise*.72,SZ+reach*.46*math.sin(angle));c=(SX+reach*math.cos(angle),5.21+rise,SZ+reach*math.sin(angle))
    cable('Plant stem',[a,b,c],.008,leaf_mat)
    tangent=Vector((math.cos(angle),.18,math.sin(angle)));normal=Vector((-math.sin(angle),0,math.cos(angle)))
    center=Vector(c);leafverts=[tuple(center-tangent*.23),tuple(center+normal*.17),tuple(center+tangent*.40+Vector((0,-.10,0))),tuple(center-normal*.17),tuple(center+Vector((0,.06,0)))]
    mesh('Curved leaf',leafverts,[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],leaf_mat)

# Two framed, original line prints on the side wall; no copied poster artwork.
for index,zz in enumerate((-.65,1.75)):
    box('Print frame',(-6.49,2.90,zz),(.10,3.10,1.78),black,.015)
    box('Print paper',(-6.425,2.90,zz),(.012,2.97,1.65),rubber,0)
    label('Print title',('MAKE IT\nPERSONAL.','YOUR OWN\nSPACE.')[index],(-6.408,3.72,zz+.67),.185,paper,True)
    for j in range(11):
        points=[]
        for k in range(25):
            u=-.73+k*1.46/24;yy=2.0+j*.07+.35*math.sin(u*2.4+j*.065)+.13*math.sin(u*5.4)
            points.append((-6.407,yy,zz-u))
        cable('Print contour',points,.0045,book_blue)
    label('Print footer','qwave / studio',(-6.408,1.51,zz+.65),.09,silver,True)

# Rug grounds the chair in the room. Fine real weave stays cheap after joining.
box('Charcoal rug',(-1.68,FLOOR+.029,2.72),(6.18,.056,4.93),fabric,.04,2)
for i in range(80):
    box('Rug weave',(-4.69+i*.076,FLOOR+.060,2.72),(.012,.006,4.84),fabric,0)
