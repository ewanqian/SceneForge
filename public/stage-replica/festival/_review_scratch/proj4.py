import numpy as np, math

W, H = 1600, 900
AR = W / H

def project(P, pos, target, fov, W=W, H=H):
    P = np.asarray(P, float); C = np.asarray(pos, float)
    f = np.asarray(target, float) - C; f /= np.linalg.norm(f)
    up = np.array([0., 1., 0.])
    r = np.cross(f, up); r /= np.linalg.norm(r)
    u = np.cross(r, f)
    t = math.tan(math.radians(fov) / 2)
    d = P - C; D = float(d @ f)
    x = (d @ r) / (t * (W / H) * D)
    y = (d @ u) / (t * D)
    return np.array([(x + 1) * 0.5 * W, (1 - (y + 1) * 0.5) * H])

def wall(side, u_, v_, w=18., h=9.):
    cx = -13. if side == "L" else 13.
    rot = math.radians(18. if side == "L" else -18.)
    lx = (u_ - 0.5) * w; ly = (v_ - 0.5) * h
    c, s = math.cos(rot), math.sin(rot)
    return np.array([cx, 4.5, -10.]) + np.array([c * lx, ly, -s * lx])

FOH = ([0, 6.5, 30], [0, 5, -9], 58)
def P(p): return project(p, *FOH)

def chk():
    print("SCREEN_L corners:", {k: np.round(P(wall("L", u_, v_)), 1).tolist()
          for k, (u_, v_) in {"bl": (0, 0), "br": (1, 0), "tl": (0, 1), "tr": (1, 1)}.items()})
    print("  calib.png expects bl=(372,499) br=(714,487) tl=(368,324) tr=(716,337)")
chk()

print("\n=== SCALE REFERENCES (FOH_WIDE, 1600x900) ===")
rows = [
    ("screens: 18 m width", wall("L", 0, 0.5), wall("L", 1, 0.5)),
    ("screens: 9 m height", wall("L", 0.5, 0), wall("L", 0.5, 1)),
    ("performer 1.7 m", [0, 0.9, 0], [0, 2.6, 0]),
    ("5 m scale bar (z=8)", [-2.5, 0.03, 8], [2.5, 0.03, 8]),
    ("grid cell 4 m (z=-4)", [-2, 0.01, -4], [2, 0.01, -4]),
    ("gap between inner edges", wall("L", 1, 0.5), wall("R", 0, 0.5)),
    ("full stage floor 44 m (z=-6)", [-22, 0, -6], [22, 0, -6]),
    ("stage depth 20 m (x=0)", [0, 0, -16], [0, 0, 4]),
]
for name, a, b in rows:
    pa, pb = P(a), P(b)
    print(f"  {name:28s} {abs(pb[0]-pa[0]):7.1f} px wide / {abs(pb[1]-pa[1]):7.1f} px tall   "
          f"({np.round(pa,0).tolist()} -> {np.round(pb,0).tolist()})")

print("\n=== JOINED (peak, join=1) landmark ellipse ===")
for side, off in (("L", 0.0), ("R", 0.5)):
    print(f" SCREEN_{side}")
    for k, (a, b) in {"centre": (0.5, 0.5), "tex_left": (0.37, 0.5), "tex_right": (0.63, 0.5),
                      "tex_bottom": (0.5, 0.2), "tex_top": (0.5, 0.8)}.items():
        wu = (a - off) / 0.5; wv = b
        p = P(wall(side, wu, wv))
        print(f"   {k:11s} wall_u={wu:+.3f} vis={0<=wu<=1}  {np.round(p,1).tolist()}")

print("\n=== INDEPENDENT (low, join=0.05) landmark ellipse ===")
IND = {"L": (1.0, 1.0, 0.0, 0.0), "R": (0.58, 0.58, 0.21, 0.30)}
for side, (su, sv, ou, ov) in IND.items():
    print(f" SCREEN_{side} scale=({su},{sv}) off=({ou},{ov})")
    for k, (a, b) in {"centre": (0.5, 0.5), "tex_left": (0.37, 0.5), "tex_right": (0.63, 0.5),
                      "tex_bottom": (0.5, 0.2), "tex_top": (0.5, 0.8)}.items():
        wu = (a - ou) / su; wv = (b - ov) / sv
        p = P(wall(side, wu, wv))
        print(f"   {k:11s} wall_u={wu:+.3f} wall_v={wv:+.3f} vis={0<=wu<=1 and 0<=wv<=1}  {np.round(p,1).tolist()}")

print("\n=== the SAME 4 horizontal grid-line rows, both walls, at PEAK ===")
for side in "LR":
    ys = [P(wall(side, 0.5, v))[1] for v in np.linspace(0.05, 0.95, 6)]
    print(f"  SCREEN_{side} wall_v 0.05..0.95 screen y: {np.round(ys,1).tolist()}")

print("\n=== what the camera can actually see ===")
for name, pt in [("stage floor near edge z=+4 (x=0)", [0, 0, 4]),
                 ("stage floor far edge z=-16 (x=0)", [0, 0, -16]),
                 ("FOH camera ground point z=30", [0, 0, 30]),
                 ("stage floor left edge x=-22,z=-6", [-22, 0, -6])]:
    print(f"  {name:36s} -> {np.round(P(pt),0).tolist() if (np.asarray(pt,float)-np.array([0,6.5,30])) @ np.array([0,-0.1601,-0.9871]) > 0 else 'BEHIND/off'}")
