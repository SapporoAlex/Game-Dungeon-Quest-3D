"""
Dungeon Quest 3D - model builder.
Run headless:   blender -b --python blender/build_models.py -- models/
Builds simple blocky (Minecraft-style) models out of boxes/cylinders and exports each
as a .glb.  Limbs are separate nodes with their pivot at the joint (named arm_L, leg_R,
head, jaw, wing_L ...) so Three.js can animate them by name.
Blender front = -Y  ->  glTF/Three front = +Z.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else './models'
os.makedirs(OUT, exist_ok=True)

MATS = {}

def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def get_mat(color, emit=0.0):
    key = (color, emit)
    if key in MATS:
        return MATS[key]
    r, g, b = [lin(((color >> s) & 255) / 255.0) for s in (16, 8, 0)]
    m = bpy.data.materials.new("m%06x_%s" % (color, emit))
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (r, g, b, 1)
    bsdf.inputs['Roughness'].default_value = 1.0
    try: bsdf.inputs['Specular IOR Level'].default_value = 0.0
    except Exception: pass
    if emit:
        bsdf.inputs['Emission Color'].default_value = (r, g, b, 1)
        bsdf.inputs['Emission Strength'].default_value = emit
    MATS[key] = m
    return m

def link(ob, parent, pivot, rot):
    bpy.context.scene.collection.objects.link(ob)
    ob.location = pivot
    ob.rotation_euler = rot
    if parent:
        ob.parent = parent
    return ob

def grp(name, pivot=(0, 0, 0), parent=None, rot=(0, 0, 0)):
    return link(bpy.data.objects.new(name, None), parent, pivot, rot)

def box(name, size, off=(0, 0, 0), color=0x888888, parent=None, pivot=(0, 0, 0), emit=0.0, rot=(0, 0, 0)):
    sx, sy, sz = size
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * sx + off[0], v.co.y * sy + off[1], v.co.z * sz + off[2]))
    bm.to_mesh(mesh); bm.free()
    mesh.materials.append(get_mat(color, emit))
    return link(bpy.data.objects.new(name, mesh), parent, pivot, rot)

def cyl(name, r, h, off=(0, 0, 0), color=0x888888, parent=None, pivot=(0, 0, 0), seg=8, emit=0.0, rot=(0, 0, 0), r2=None):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    r2 = r if r2 is None else r2
    try:
        bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r2, depth=h)
    except TypeError:
        bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, diameter1=r * 2, diameter2=r2 * 2, depth=h)
    for v in bm.verts:
        v.co += Vector(off)
    bm.to_mesh(mesh); bm.free()
    mesh.materials.append(get_mat(color, emit))
    return link(bpy.data.objects.new(name, mesh), parent, pivot, rot)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()

def export(name):
    for o in bpy.context.scene.objects:
        o.select_set(True)
    path = os.path.join(OUT, name + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=False,
                              export_apply=True, export_cameras=False, export_lights=False,
                              export_yup=True)
    print("exported", path)

def limb(parent, name, pivot, size, color, hand=None):
    g = grp(name, pivot, parent)
    box(name + '_m', size, (0, 0, -size[2] / 2), color, g)
    if hand:
        box(name + '_hand', (size[0] * 1.05, size[1] * 1.05, size[2] * 0.22), (0, 0, -size[2] * 0.89), hand, g)
    return g

# ------------------------------------------------------------------ enemies




# ------------------------------------------------------------------ shopkeeper

# ======================= smooth / organic primitives =======================
def _smooth(mesh):
    mesh.polygons.foreach_set('use_smooth', [True] * len(mesh.polygons))
    mesh.update()

def ball(name, r, off=(0, 0, 0), color=0x888888, parent=None, pivot=(0, 0, 0), scale=(1, 1, 1),
         emit=0.0, rot=(0, 0, 0), seg=16, rings=10, smooth=True):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    try:
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    except TypeError:
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, diameter=r)
    for v in bm.verts:
        v.co = Vector((v.co.x * scale[0] + off[0], v.co.y * scale[1] + off[1], v.co.z * scale[2] + off[2]))
    bm.to_mesh(mesh); bm.free()
    if smooth: _smooth(mesh)
    mesh.materials.append(get_mat(color, emit))
    return link(bpy.data.objects.new(name, mesh), parent, pivot, rot)

def tube(name, r_top, r_bot, h, off=(0, 0, 0), color=0x888888, parent=None, pivot=(0, 0, 0),
         seg=14, emit=0.0, rot=(0, 0, 0), smooth=True):
    """tapered cylinder along local Z, centred on `off`"""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    try:
        bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r_bot, radius2=r_top, depth=h)
    except TypeError:
        bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, diameter1=r_bot * 2, diameter2=r_top * 2, depth=h)
    for v in bm.verts:
        v.co += Vector(off)
    bm.to_mesh(mesh); bm.free()
    if smooth: _smooth(mesh)
    mesh.materials.append(get_mat(color, emit))
    return link(bpy.data.objects.new(name, mesh), parent, pivot, rot)

def spike(name, r, h, off=(0, 0, 0), color=0xe8dfc4, parent=None, pivot=(0, 0, 0), rot=(0, 0, 0), emit=0.0, seg=10):
    """cone, base at local origin, tip at +Z*h (offset by off)"""
    return tube(name, 0.0001, r, h, (off[0], off[1], off[2] + h / 2), color, parent, pivot, seg, emit, rot)

def bone(name, a, b, r1, r2, color, parent):
    """tapered tube from point a (radius r1) to point b (radius r2)"""
    a, b = Vector(a), Vector(b)
    d = b - a
    rot = Vector((0, 0, 1)).rotation_difference(d).to_euler()
    return tube(name, r2, r1, d.length, (0, 0, 0), color, parent, (a + b) / 2, 10, 0.0, tuple(rot))

def sheet(name, verts, faces, color, parent):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    m = get_mat(color)
    m.use_backface_culling = False
    mesh.materials.append(m)
    return link(bpy.data.objects.new(name, mesh), parent, (0, 0, 0), (0, 0, 0))

def arm(parent, name, pivot, length, rt, rb, color, hand_color, hand_r, sleeve=None):
    g = grp(name, pivot, parent)
    ball(name + '_sh', rt * 1.15, (0, 0, 0), color, g)
    tube(name + '_m', rt, rb, length, (0, 0, -length / 2), color, g)
    ball(name + '_hand', hand_r, (0, 0, -length), hand_color, g)
    return g

def leg(parent, name, pivot, length, rt, rb, color, foot_color, foot=(0.11, 0.18, 0.07)):
    g = grp(name, pivot, parent)
    ball(name + '_hip', rt * 1.1, (0, 0, 0), color, g)
    tube(name + '_m', rt, rb, length, (0, 0, -length / 2), color, g)
    ball(name + '_foot', 1.0, (0, -foot[1] * 0.35, -length + foot[2] * 0.4), foot_color, g, scale=foot)
    return g

# ------------------------------------------------------------------ enemies
def goblin():
    reset()
    skin, dskin, cloth, leather = 0x6aa84f, 0x4f8a3a, 0x8a5a32, 0x3a2616
    root = grp('root'); body = grp('body', parent=root)
    for s, n in ((-1, 'leg_L'), (1, 'leg_R')):
        leg(body, n, (s * 0.16, 0, 0.5), 0.5, 0.1, 0.07, dskin, leather, (0.1, 0.17, 0.07))
    ball('belly', 0.34, (0, 0, 0.78), cloth, body, scale=(1.0, 0.85, 1.05))
    ball('chest', 0.27, (0, 0.0, 0.97), skin, body, scale=(1.05, 0.8, 0.9))
    tube('skirt', 0.28, 0.38, 0.28, (0, 0, 0.52), leather, body, seg=12)
    head = grp('head', (0, -0.02, 1.12), body)
    ball('head_m', 0.3, (0, -0.02, 0.2), skin, head, scale=(1.15, 1.0, 0.92))
    for s in (-1, 1):
        spike('ear', 0.11, 0.5, (s * 0.3, 0.02, 0.2), skin, head, rot=(0, s * 1.2, -s * 0.2))
        ball('eye_w', 0.085, (s * 0.13, -0.24, 0.26), 0xf4ee9a, head, emit=1.4)
        ball('pupil', 0.035, (s * 0.13, -0.315, 0.26), 0x120a00, head)
        ball('brow', 0.07, (s * 0.14, -0.25, 0.34), dskin, head, scale=(1.5, 0.7, 0.45), rot=(0, -s * 0.35, 0))
        spike('fang', 0.028, 0.1, (s * 0.09, -0.27, 0.0), 0xf5f0d8, head, rot=(0.0, 0, 0))
    spike('nose', 0.07, 0.24, (0, -0.28, 0.17), dskin, head, rot=(1.9, 0, 0))
    ball('mouth', 0.12, (0, -0.26, 0.055), 0x2a0c0c, head, scale=(1.3, 0.35, 0.4))
    arm(body, 'arm_L', (-0.36, 0, 1.02), 0.5, 0.065, 0.05, skin, dskin, 0.075)
    ar = arm(body, 'arm_R', (0.36, 0, 1.02), 0.5, 0.065, 0.05, skin, dskin, 0.075)
    ball('dagger_blade', 1.0, (0, -0.06, -0.78), 0xcfd5da, ar, scale=(0.04, 0.012, 0.24))
    ball('dagger_guard', 1.0, (0, -0.06, -0.55), 0x4a3320, ar, scale=(0.1, 0.03, 0.03))
    export('goblin')

def skeleton():
    reset()
    bone_c, shade, dark = 0xe8e4d2, 0xc4bfa6, 0x1c1a18
    root = grp('root'); body = grp('body', parent=root)
    for s, n in ((-1, 'leg_L'), (1, 'leg_R')):
        g = grp(n, (s * 0.15, 0, 0.98), body)
        ball(n + '_hip', 0.075, (0, 0, 0), bone_c, g)
        tube(n + '_thigh', 0.055, 0.04, 0.45, (0, 0, -0.225), bone_c, g)
        ball(n + '_knee', 0.065, (0, 0, -0.46), bone_c, g)
        tube(n + '_shin', 0.04, 0.035, 0.42, (0, 0, -0.69), bone_c, g)
        ball(n + '_foot', 1.0, (0, -0.07, -0.9), bone_c, g, scale=(0.07, 0.15, 0.05))
    ball('pelvis', 0.2, (0, 0.01, 1.0), bone_c, body, scale=(1.1, 0.55, 0.65))
    tube('spine', 0.04, 0.045, 0.62, (0, 0.06, 1.33), bone_c, body)
    ball('chest_dark', 0.22, (0, 0.04, 1.42), dark, body, scale=(1.0, 0.7, 1.2))
    for i in range(5):
        w = 1.0 - abs(i - 2) * 0.1
        ball('rib%d' % i, 0.25, (0, -0.02, 1.2 + i * 0.12), bone_c if i % 2 else shade, body, scale=(w, 0.62, 0.1), seg=18, rings=6)
    tube('sternum', 0.03, 0.03, 0.55, (0, -0.15, 1.42), bone_c, body)
    ball('clav', 0.28, (0, 0.0, 1.68), bone_c, body, scale=(1.0, 0.2, 0.1))
    head = grp('head', (0, 0, 1.76), body)
    ball('skull', 0.23, (0, 0.0, 0.2), bone_c, head, scale=(1.0, 1.05, 1.1))
    for s in (-1, 1):
        ball('socket', 0.07, (s * 0.09, -0.19, 0.22), dark, head, scale=(1.0, 0.5, 1.25))
        ball('glow', 0.028, (s * 0.09, -0.225, 0.22), 0xff4a2e, head, emit=4.0)
        ball('cheek', 0.07, (s * 0.14, -0.12, 0.08), bone_c, head)
    spike('nose', 0.035, 0.08, (0, -0.2, 0.15), dark, head, rot=(1.57, 0, 0))
    jaw = grp('jaw', (0, -0.04, 0.06), head)
    ball('jaw_m', 0.14, (0, -0.07, -0.01), shade, jaw, scale=(1.0, 0.95, 0.35))
    for i in range(5):
        spike('tooth', 0.02, 0.06, ((i - 2) * 0.05, -0.17, 0.0), 0xffffff, head, rot=(0, 0, 0))
    arm(body, 'arm_L', (-0.31, 0, 1.68), 0.62, 0.045, 0.035, bone_c, bone_c, 0.05)
    ar = arm(body, 'arm_R', (0.31, 0, 1.68), 0.62, 0.045, 0.035, bone_c, bone_c, 0.05)
    ball('blade', 1.0, (0, -0.04, -1.0), 0x9aa8ae, ar, scale=(0.045, 0.012, 0.42))
    ball('guard', 1.0, (0, -0.04, -0.66), 0x6a4020, ar, scale=(0.16, 0.035, 0.035))
    export('skeleton')

def chaos():
    reset()
    steel, plate, purple, glow, horn = 0x34344a, 0x52526c, 0x8a32c0, 0xff2a2a, 0xe0d8bc
    root = grp('root'); body = grp('body', parent=root)
    for s, n in ((-1, 'leg_L'), (1, 'leg_R')):
        g = leg(body, n, (s * 0.22, 0, 1.0), 1.0, 0.16, 0.12, steel, plate, (0.17, 0.27, 0.11))
        ball(n + '_knee', 0.15, (0, -0.08, -0.5), plate, g, scale=(1.0, 0.8, 1.0))
    ball('hips', 0.33, (0, 0, 1.05), 0x1c1c26, body, scale=(1.3, 0.8, 0.7))
    ball('torso', 0.46, (0, 0, 1.38), plate, body, scale=(1.08, 0.72, 1.0))
    ball('belly', 0.34, (0, -0.02, 1.1), steel, body, scale=(1.0, 0.8, 0.7))
    ball('emblem', 0.13, (0, -0.31, 1.45), purple, body, emit=1.8, scale=(1.0, 0.35, 1.0))
    ball('cape', 0.55, (0, 0.34, 1.15), 0x4a1668, body, scale=(0.95, 0.1, 1.15))
    for s in (-1, 1):
        ball('pauldron', 0.3, (s * 0.58, 0, 1.68), steel, body, scale=(1.0, 0.95, 0.75))
        spike('spike', 0.07, 0.3, (s * 0.58, 0, 1.8), plate, body)
    head = grp('head', (0, 0, 1.74), body)
    ball('helm', 0.3, (0, 0, 0.24), steel, head, scale=(1.0, 1.0, 1.1))
    ball('visor', 0.1, (0, -0.265, 0.24), glow, head, emit=4.0, scale=(2.0, 0.3, 0.3))
    tube('crest', 0.035, 0.05, 0.55, (0, 0, 0), purple, head, pivot=(0, 0, 0.5), rot=(1.5708, 0, 0))
    for s in (-1, 1):
        spike('horn_lo', 0.08, 0.38, (s * 0.26, 0, 0.3), horn, head, rot=(0, s * 1.2, 0))
        spike('horn_hi', 0.06, 0.34, (s * 0.46, 0, 0.42), horn, head, rot=(0, s * 0.45, 0))
    al = arm(body, 'arm_L', (-0.62, 0, 1.62), 0.8, 0.14, 0.11, steel, plate, 0.13)
    tube('shield', 0.4, 0.4, 0.09, (0, 0, 0), 0x40405a, al, pivot=(-0.22, -0.12, -0.55), rot=(1.5708, 0, 0), seg=18)
    ball('shield_gem', 0.15, (-0.22, -0.18, -0.55), purple, al, emit=1.6, scale=(1.0, 0.4, 1.0))
    ar = arm(body, 'arm_R', (0.62, 0, 1.62), 0.8, 0.14, 0.11, steel, plate, 0.13)
    ball('blade', 1.0, (0, -0.02, -1.45), 0xb6bfcc, ar, scale=(0.09, 0.03, 0.55))
    ball('edge', 1.0, (0, -0.02, -1.45), purple, ar, emit=1.2, scale=(0.105, 0.012, 0.54))
    ball('guard', 1.0, (0, 0, -0.9), 0x6a4a1a, ar, scale=(0.3, 0.05, 0.05))
    export('chaos')

def dragon():
    reset()
    red, belly, dark, horn, memb = 0xb3261e, 0xe9b04a, 0x6b1410, 0xe8dfc4, 0x9a2018
    root = grp('root'); body = grp('body', parent=root)
    ball('torso', 1.0, (0, 0, 1.25), red, body, scale=(0.62, 1.15, 0.58), seg=20, rings=12)
    ball('belly', 1.0, (0, -0.04, 1.08), belly, body, scale=(0.5, 1.0, 0.42), seg=20, rings=12)
    for i in range(6):
        spike('dorsal', 0.07, 0.24 - abs(i - 2.5) * 0.02, (0, -0.8 + i * 0.32, 1.72 - abs(i - 2.5) * 0.06), dark, body)
    neck = grp('neck', (0, -0.95, 1.4), body, rot=(-0.5, 0, 0))
    tube('neck_m', 0.2, 0.3, 0.95, (0, 0, 0.47), red, neck, rot=(1.5708, 0, 0))
    ball('neck_ball', 0.3, (0, 0, 0), red, neck)
    head = grp('head', (0, -0.95, 0), neck, rot=(0.65, 0, 0))
    ball('head_m', 0.36, (0, -0.12, 0), red, head, scale=(0.85, 1.15, 0.8))
    ball('snout', 0.22, (0, -0.58, -0.04), red, head, scale=(0.85, 1.7, 0.65))
    for s in (-1, 1):
        ball('nostril', 0.04, (s * 0.09, -0.92, 0.03), 0x300a08, head)
        ball('eye', 0.075, (s * 0.27, -0.16, 0.12), 0xffe21a, head, emit=3.0)
        ball('slit', 0.04, (s * 0.335, -0.16, 0.12), 0x201000, head, scale=(0.3, 0.6, 1.5))
        spike('horn', 0.075, 0.55, (s * 0.2, 0.12, 0.22), horn, head, rot=(-1.1, 0, s * 0.15))
        spike('cheek_spike', 0.05, 0.22, (s * 0.3, -0.05, -0.02), horn, head, rot=(0, s * 1.2, 0))
    jaw = grp('jaw', (0, -0.1, -0.2), head)
    ball('jaw_m', 0.2, (0, -0.4, 0.0), dark, jaw, scale=(0.8, 1.75, 0.35))
    ball('tongue', 0.12, (0, -0.35, 0.05), 0xe0506a, jaw, scale=(0.8, 2.0, 0.25))
    for s in (-1, 1):
        for i in range(4):
            spike('tooth', 0.03, 0.1, (s * 0.15, -0.28 - i * 0.14, 0.04), 0xffffff, jaw)
            spike('utooth', 0.03, 0.1, (s * 0.15, -0.28 - i * 0.14, 0.18), 0xffffff, head, rot=(3.14159, 0, 0))
    legs = {'leg_FL': (-0.5, -0.6), 'leg_FR': (0.5, -0.6), 'leg_BL': (-0.52, 0.65), 'leg_BR': (0.52, 0.65)}
    for n, (x, y) in legs.items():
        g = grp(n, (x, y, 0.95), body)
        ball(n + '_thigh', 0.25, (0, 0, -0.05), red, g, scale=(0.8, 1.0, 1.1))
        tube(n + '_m', 0.15, 0.09, 0.8, (0, 0, -0.45), red, g)
        ball(n + '_foot', 1.0, (0, -0.09, -0.86), dark, g, scale=(0.17, 0.27, 0.08))
        for c in (-1, 0, 1):
            spike('claw', 0.035, 0.14, (c * 0.08, -0.34, -0.86), horn, g, rot=(1.9, 0, 0))
    for s, n in ((-1, 'wing_L'), (1, 'wing_R')):
        w = grp(n, (s * 0.45, 0.1, 1.55), body)
        ball(n + '_sh', 0.14, (0, 0, 0), dark, w)
        wrist = (s * 1.3, -0.05, 0.4)
        bone(n + '_arm', (0, 0, 0), wrist, 0.09, 0.06, dark, w)
        tips = [(s * 2.3, 0.45, 0.25), (s * 1.9, 1.1, 0.05), (s * 1.2, 1.4, -0.05)]
        for i, t in enumerate(tips):
            bone('finger', wrist, t, 0.045, 0.02, dark, w)
        spike('thumb', 0.04, 0.24, wrist, horn, w, rot=(-0.6, 0, s * 0.3))
        verts = [(0, 0.1, 0), wrist] + tips + [(s * 0.15, 1.2, -0.05)]
        sheet(n + '_mem', verts, [tuple(range(len(verts)))], memb, w)
    t1 = grp('tail1', (0, 1.05, 1.15), body)
    tube('tail1_m', 0.3, 0.2, 1.0, (0, 0, 0.5), red, t1, rot=(-1.5708, 0, 0))
    t2 = grp('tail2', (0, 1.0, 0), t1)
    tube('tail2_m', 0.2, 0.12, 0.95, (0, 0, 0.47), red, t2, rot=(-1.5708, 0, 0))
    t3 = grp('tail3', (0, 0.95, 0), t2)
    tube('tail3_m', 0.12, 0.05, 0.8, (0, 0, 0.4), red, t3, rot=(-1.5708, 0, 0))
    spike('tail_tip', 0.12, 0.35, (0, 0.8, 0), dark, t3, rot=(-1.5708, 0, 0))
    export('dragon')

def elf():
    reset()
    skin, hair, green, dgreen, gold, cream = 0xf6d8b8, 0xf2d268, 0x2f9458, 0x207a46, 0xf0c040, 0xf8f0dc
    root = grp('root'); body = grp('body', parent=root)
    tube('skirt', 0.2, 0.46, 0.8, (0, 0, 0.4), green, body, seg=20)
    tube('skirt_trim', 0.455, 0.47, 0.06, (0, 0, 0.04), gold, body, seg=20)
    ball('apron', 1.0, (0, -0.26, 0.38), cream, body, scale=(0.22, 0.04, 0.36))
    for s in (-1, 1):
        ball('boot', 0.1, (s * 0.13, -0.18, 0.05), 0x5a3a20, body, scale=(0.9, 1.4, 0.6))
    ball('bodice', 0.22, (0, 0, 0.98), dgreen, body, scale=(1.0, 0.72, 1.3))
    tube('belt', 0.2, 0.22, 0.07, (0, 0, 0.78), gold, body, seg=16)
    ball('collar', 0.2, (0, 0, 1.2), cream, body, scale=(1.0, 0.8, 0.35))
    ball('pendant', 0.035, (0, -0.15, 1.08), 0x40d0ff, body, emit=2.0)
    head = grp('head', (0, 0, 1.22), body)
    tube('neck', 0.05, 0.055, 0.08, (0, 0, -0.03), skin, head)
    ball('face', 0.23, (0, -0.01, 0.23), skin, head, scale=(0.92, 0.88, 1.05))
    ball('hair_cap', 0.255, (0, 0.04, 0.27), hair, head, scale=(1.0, 1.0, 1.0))
    tube('hair_back', 0.2, 0.12, 0.8, (0, 0.17, -0.12), hair, head, seg=14)
    ball('hair_tip', 0.12, (0, 0.17, -0.52), hair, head, scale=(1.0, 0.7, 0.8))
    ball('bangs', 0.2, (0, -0.1, 0.4), hair, head, scale=(1.05, 0.7, 0.35))
    for s in (-1, 1):
        ball('hair_side', 0.07, (s * 0.2, -0.04, 0.12), hair, head, scale=(0.9, 1.0, 3.0))
        ball('eye_w', 0.05, (s * 0.085, -0.195, 0.23), 0xffffff, head, scale=(1.0, 0.4, 1.35))
        ball('iris', 0.036, (s * 0.085, -0.21, 0.225), 0x2aa05a, head, emit=0.9, scale=(1.0, 0.4, 1.4))
        ball('pupil', 0.016, (s * 0.085, -0.22, 0.225), 0x0a1a10, head, scale=(1.0, 0.4, 1.4))
        ball('blush', 0.035, (s * 0.135, -0.18, 0.15), 0xf4a8a8, head, scale=(1.2, 0.3, 0.7))
        spike('ear', 0.06, 0.34, (s * 0.2, 0.0, 0.26), skin, head, rot=(0, s * 0.95, 0))
    ball('nose', 0.018, (0, -0.22, 0.17), 0xf0c8a4, head)
    ball('mouth', 0.03, (0, -0.205, 0.1), 0xc84458, head, scale=(1.5, 0.4, 0.55))
    tube('circlet', 0.235, 0.235, 0.025, (0, 0, 0.4), gold, head, seg=18)
    ball('gem', 0.03, (0, -0.24, 0.4), 0x40d0ff, head, emit=2.5)
    for s, n in ((-1, 'arm_L'), (1, 'arm_R')):
        g = grp(n, (s * 0.25, 0, 1.15), body)
        ball(n + '_puff', 0.09, (0, 0, -0.04), green, g)
        tube(n + '_arm', 0.045, 0.035, 0.5, (0, 0, -0.27), skin, g)
        ball(n + '_hand', 0.05, (0, 0, -0.55), skin, g)
    export('elf')

def sword():
    reset()
    root = grp('root')
    ball('blade', 1.0, (0, 0, 0.36), 0xe6ebf2, root, scale=(0.065, 0.016, 0.3), emit=0.1)
    spike('tip', 0.065, 0.14, (0, 0, 0.62), 0xe6ebf2, root, seg=4)
    ball('fuller', 1.0, (0, -0.012, 0.34), 0x9aa4b0, root, scale=(0.012, 0.008, 0.24))
    ball('guard', 1.0, (0, 0, 0.07), 0xf0c040, root, scale=(0.15, 0.035, 0.03))
    tube('grip', 0.028, 0.028, 0.18, (0, 0, -0.04), 0x5a3a20, root)
    ball('pommel', 0.045, (0, 0, -0.15), 0xf0c040, root)
    export('sword')

def potion(name, color, shape):
    reset()
    root = grp('root')
    glass = 0xdaf2f6
    L = color
    top = 0.3
    if shape == 'round':
        ball('body', 0.17, (0, 0, 0.17), L, root, emit=0.8)
        ball('label', 0.1, (0, -0.15, 0.17), 0xffffff, root, scale=(1, 0.2, 1))
        box('cross_a', (0.12, 0.02, 0.035), (0, -0.165, 0.17), 0xd02020, root)
        box('cross_b', (0.035, 0.02, 0.12), (0, -0.165, 0.17), 0xd02020, root)
        top = 0.32
    elif shape == 'tall':
        tube('body', 0.1, 0.1, 0.4, (0, 0, 0.22), L, root, emit=0.8)
        ball('cap', 0.1, (0, 0, 0.42), L, root, emit=0.8)
        for s in (-1, 1):
            ball('wing', 1.0, (s * 0.15, 0, 0.28), 0xffffff, root, scale=(0.09, 0.015, 0.05), rot=(0, -s * 0.5, 0))
        top = 0.5
    elif shape == 'flask':
        tube('body', 0.07, 0.2, 0.32, (0, 0, 0.17), L, root, emit=0.8)
        ball('base', 0.2, (0, 0, 0.03), L, root, scale=(1, 1, 0.4), emit=0.8)
        ball('blade', 1.0, (0, -0.15, 0.16), 0xdfe4ea, root, scale=(0.02, 0.01, 0.1))
        ball('blade2', 1.0, (0, -0.15, 0.2), 0xdfe4ea, root, scale=(0.07, 0.01, 0.015))
        top = 0.33
    elif shape == 'heart':
        ball('h1', 0.12, (-0.085, 0, 0.29), L, root, emit=1.0)
        ball('h2', 0.12, (0.085, 0, 0.29), L, root, emit=1.0)
        spike('h3', 0.2, 0.3, (0, 0, 0.0), L, root, pivot=(0, 0, 0.3), rot=(3.14159, 0, 0), emit=1.0, seg=16)
        root.location = (0, 0, 0.0)
        ball('hl', 0.03, (-0.11, -0.1, 0.33), 0xffffff, root, emit=1.0)
    elif shape == 'mana':
        ball('body', 0.18, (0, 0, 0.18), L, root, emit=1.2)
        for i, (x, z) in enumerate(((0.06, 0.22), (-0.07, 0.14), (0.03, 0.12))):
            ball('spark', 0.025, (x, -0.15, z), 0xeaffea, root, emit=3.0)
        top = 0.34
    else:
        ball('body', 0.17, (0, 0, 0.17), L, root, emit=0.8)
        ball('eye_w', 0.07, (0, -0.15, 0.17), 0xffffff, root, scale=(1.4, 0.3, 0.8))
        ball('eye_p', 0.03, (0, -0.17, 0.17), 0x201030, root)
        top = 0.32
    if shape != 'heart':
        tube('neck', 0.055, 0.07, 0.1, (0, 0, top + 0.02), glass, root)
        tube('cork', 0.06, 0.05, 0.07, (0, 0, top + 0.1), 0x8a5a2b, root)
    export(name)


# ------------------------------------------------------------------ props
def crate():
    reset()
    root = grp('root')
    box('body', (0.96, 0.96, 0.96), (0, 0, 0.5), 0xa9783a, root)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box('post', (0.12, 0.12, 1.0), (sx * 0.47, sy * 0.47, 0.5), 0x6b4423, root)
    for z in (0.03, 0.97):
        for sx in (-1, 1):
            box('rail', (0.1, 1.0, 0.1), (sx * 0.47, 0, z), 0x6b4423, root)
            box('rail', (1.0, 0.1, 0.1), (0, sx * 0.47, z), 0x6b4423, root)
    box('brace', (0.1, 0.03, 1.3), (0, -0.495, 0.5), 0x6b4423, root, rot=(0, 0.78, 0))
    box('brace', (0.1, 0.03, 1.3), (0, 0.495, 0.5), 0x6b4423, root, rot=(0, 0.78, 0))
    export('crate')

def barrel():
    reset()
    root = grp('root')
    cyl('body', 0.42, 1.0, (0, 0, 0.5), 0x8a5a2b, root, seg=10)
    cyl('belly', 0.47, 0.5, (0, 0, 0.5), 0x93622f, root, seg=10)
    for z in (0.18, 0.82):
        cyl('band', 0.485, 0.09, (0, 0, z), 0x3d3d44, root, seg=10)
    cyl('lid', 0.4, 0.04, (0, 0, 1.0), 0x5a3a1c, root, seg=10)
    export('barrel')

def chest():
    reset()
    root = grp('root')
    box('base', (1.0, 0.66, 0.5), (0, 0, 0.25), 0x8a5a2b, root)
    box('base_trim', (1.04, 0.7, 0.08), (0, 0, 0.04), 0x5a3a1c, root)
    for s in (-1, 1):
        box('band', (0.1, 0.7, 0.52), (s * 0.34, 0, 0.26), 0xe0b030, root)
    lid = grp('lid', (0, 0.33, 0.5), root)
    box('lid_m', (1.0, 0.66, 0.26), (0, -0.33, 0.13), 0x9a6a33, lid)
    box('lid_top', (0.94, 0.6, 0.08), (0, -0.33, 0.28), 0x9a6a33, lid)
    for s in (-1, 1):
        box('lid_band', (0.1, 0.7, 0.32), (s * 0.34, -0.33, 0.14), 0xe0b030, lid)
    box('lock', (0.14, 0.05, 0.16), (0, -0.67, 0.0), 0xf0c840, lid, emit=0.3)
    box('inside', (0.86, 0.5, 0.02), (0, 0, 0.5), 0xffd860, root, emit=0.6)
    export('chest')

def table():
    reset()
    root = grp('root')
    box('top', (1.9, 0.95, 0.1), (0, 0, 0.85), 0x9a6a33, root)
    box('runner', (1.2, 0.5, 0.02), (0, 0, 0.91), 0x8a1c2c, root)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box('leg', (0.14, 0.14, 0.8), (sx * 0.8, sy * 0.38, 0.4), 0x6b4423, root)
    box('apron', (1.7, 0.8, 0.1), (0, 0, 0.74), 0x7a5230, root)
    export('table')

def door():
    reset()
    root = grp('root')
    for i in range(6):
        c = (0x7a4e26, 0x6e4622, 0x84562c)[i % 3]
        box('plank%d' % i, (0.47, 0.28, 3.0), (-1.25 + i * 0.5, 0, 1.5), c, root)
    for z in (0.5, 1.5, 2.5):
        box('band', (3.0, 0.34, 0.12), (0, 0, z), 0x3a3a42, root)
    for z in (0.5, 1.5, 2.5):
        for x in (-1.3, 1.3):
            box('rivet', (0.08, 0.38, 0.08), (x, 0, z), 0x8c8c94, root)
    box('ring', (0.2, 0.4, 0.2), (0.7, -0.02, 1.4), 0x9c9ca4, root)
    box('ring2', (0.2, 0.4, 0.2), (-0.7, -0.02, 1.4), 0x9c9ca4, root)
    export('door')

def stairs():
    reset()
    root = grp('root')
    for i in range(6):
        box('step%d' % i, (2.4, 0.5, 0.22 * (i + 1)), (0, -1.1 + i * 0.5, 0.11 * (i + 1)), (0x8a8a92, 0x7c7c84)[i % 2], root)
    for s in (-1, 1):
        box('pillar', (0.4, 0.4, 2.7), (s * 1.3, 1.25, 1.35), 0x5a5a64, root)
        box('pillar_cap', (0.5, 0.5, 0.15), (s * 1.3, 1.25, 2.75), 0x4a4a54, root)
    box('lintel', (3.2, 0.45, 0.4), (0, 1.25, 2.75), 0x4a4a54, root)
    box('glow', (2.2, 0.06, 1.5), (0, 1.35, 2.0), 0xfff0b0, root, emit=1.5)
    export('stairs')

def plate():
    reset()
    root = grp('root')
    box('base', (1.2, 1.2, 0.04), (0, 0, 0.02), 0x4a4540, root)
    box('inner', (0.9, 0.9, 0.05), (0, 0, 0.03), 0x39352f, root)
    for i in range(3):
        box('slit', (0.5, 0.06, 0.06), (0, -0.25 + i * 0.25, 0.035), 0x201c18, root)
    export('plate')

def arrow():
    reset()
    root = grp('root')
    box('shaft', (0.04, 0.9, 0.04), (0, 0, 0), 0x8a6a3a, root)
    box('head', (0.09, 0.2, 0.09), (0, -0.55, 0), 0xb8bec6, root)
    for s in (-1, 1):
        box('fletch', (0.01, 0.2, 0.12), (0, 0.4, s * 0.06), 0xd04040, root)
        box('fletch2', (0.12, 0.2, 0.01), (s * 0.06, 0.4, 0), 0xd04040, root)
    export('arrow')

def coin():
    reset()
    root = grp('root')
    cyl('coin', 0.2, 0.05, (0, 0, 0), 0xf6c630, root, seg=10, emit=0.5, rot=(math.pi / 2, 0, 0))
    cyl('rim', 0.21, 0.04, (0, 0, 0), 0xffe070, root, seg=10, emit=0.4, rot=(math.pi / 2, 0, 0))
    box('mark', (0.07, 0.07, 0.07), (0, -0.03, 0), 0xb08410, root)
    export('coin')


def torch():
    reset()
    root = grp('root')
    box('bracket', (0.1, 0.3, 0.05), (0, -0.0, 0.0), 0x3a3a42, root)
    box('stick', (0.1, 0.1, 0.6), (0, -0.15, 0.2), 0x6b4423, root, rot=(0.25, 0, 0))
    box('cup', (0.16, 0.16, 0.1), (0, -0.2, 0.52), 0x3a3a42, root)
    f = grp('flame', (0, -0.2, 0.6), root)
    box('flame1', (0.14, 0.14, 0.24), (0, 0, 0.1), 0xff8a1f, f, emit=3.0)
    box('flame2', (0.08, 0.08, 0.22), (0, 0, 0.22), 0xffe070, f, emit=3.0)
    export('torch')

def shelf():
    reset()
    root = grp('root')
    W, D, H = 2.3, 0.6, 2.3
    for s in (-1, 1):
        box('side', (0.12, D, H), (s * (W / 2), 0, H / 2), 0x6b4423, root)
    box('back', (W, 0.06, H), (0, D / 2 - 0.03, H / 2), 0x4f3319, root)
    for z in (0.12, 0.9, 1.65, H):
        box('board', (W, D, 0.08), (0, 0, z), 0x8a5a2b, root)
    box('board_edge', (W, 0.04, 0.12), (0, -D / 2, 0.9), 0xa87038, root)
    box('board_edge', (W, 0.04, 0.12), (0, -D / 2, 1.65), 0xa87038, root)
    export('shelf')

def counter():
    reset()
    root = grp('root')
    box('body', (3.0, 0.9, 1.0), (0, 0, 0.5), 0x7a5230, root)
    box('top', (3.2, 1.1, 0.1), (0, 0, 1.05), 0xa87038, root)
    for i in range(6):
        box('panel', (0.4, 0.04, 0.7), (-1.25 + i * 0.5, -0.46, 0.5), 0x634122, root)
    box('ledger', (0.4, 0.3, 0.06), (-0.9, 0.0, 1.13), 0x5a1c1c, root, rot=(0, 0, 0.3))
    box('ledger_pages', (0.36, 0.26, 0.04), (-0.9, 0.0, 1.17), 0xf2ead0, root, rot=(0, 0, 0.3))
    cyl('bowl', 0.2, 0.1, (0.95, 0.0, 1.15), 0x6a6a72, root, seg=10)
    for i in range(5):
        cyl('c', 0.07, 0.025, (0.95 + (i % 2) * 0.05 - 0.02, (i - 2) * 0.03, 1.21 + i * 0.026), 0xf6c630, root, seg=8, emit=0.4)
    cyl('bell', 0.07, 0.12, (0.2, 0.2, 1.16), 0xe0b030, root, seg=8, r2=0.03)
    export('counter')

def banner():
    reset()
    root = grp('root')
    box('rod', (1.1, 0.06, 0.06), (0, 0, 2.0), 0x3a3a42, root)
    box('cloth', (0.9, 0.04, 1.5), (0, 0, 1.2), 0x7b1f2a, root)
    box('emblem', (0.4, 0.05, 0.4), (0, -0.01, 1.45), 0xe0b030, root, emit=0.3, rot=(0, math.pi / 4, 0))
    for s in (-1, 1):
        box('tail', (0.28, 0.04, 0.2), (s * 0.31, 0, 0.35), 0x7b1f2a, root)
    export('banner')

for fn in (goblin, skeleton, chaos, dragon, elf, crate, barrel, chest, table, door, stairs,
           plate, arrow, coin, sword, torch, shelf, counter, banner):
    fn()
potion('potion_health', 0xe02030, 'round')
potion('potion_speed', 0x2ee6e6, 'tall')
potion('potion_attack', 0xff8a1f, 'flask')
potion('potion_maxhealth', 0xff4fa3, 'heart')
potion('potion_search', 0xa45cff, 'search')
potion('potion_mana', 0x3ddc5a, 'mana')
