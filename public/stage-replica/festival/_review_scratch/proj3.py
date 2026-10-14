import numpy as np, math

W, H = 1600, 900
def cam(pos, target, fov):
    f = np.array(target, float) - np.array(pos, float); f /= np.linalg.norm(f)
    up = np.array([0., 1., 0.])
    r = np.cross(f, up); r /= np.linalg.norm(r)
    u = np.cross(r, f)
    return dict(C=np.array(pos, float), f=f, u=u, r=r, t=math.tan(math.radians(fov) / 2))

def pr(P, c):
    d = np.asarray(P, float) - c["C"]; D = d @ c["f"]
    if D <= 1e-3: return None
    x = (d @ c["u"]) / (c["t"] * (W / H) * D); y = (d @ c["r"]) / (c["t"] * D)
    return np.array([(x + 1) * 0.5 * W, (1 - (y + 1) * 0.5) * H])

def wall(side, u_, v_, w=18., h=9.):
    cx = -13. if side == "L" else 13.
    rot = math.radians(18. if side == "L" else -18.)
    lx = (u_ - 0.5) * w; ly = (v_ - 0.5) * h
    c, s = math.cos(rot), math.sin(rot)
    # screen-local +u axis in world = (cos rot, 0, -sin rot); +v = world +y
    p = np.array([cx, 4.5, -10.]) + np.array([c * lx, ly, -s * lx])
    return p

FOH = cam([0, 6.5, 30], [0, 5, -9], 58)

print("== seam / gap, FOH_WIDE ==")
for side in "LR":
    e = "R" if side == "L" else "L"
    u_in = 1.0 if side == "L" else 0.0
    u_out = 0.0 if side == "L" else 1.0
    pin = pr(wall(side, u_in, 0.5), FOH); pout = pr(wall(side, u_out, 0.5), FOH)
    print(f"  SCREEN_{side} inner-edge screen x = {pin[0]:.1f}   outer-edge x = {pout[0]:.1f}  "
          f"centre y={pin[1]:.0f}")
print("  -> screen-space gap between wall inner edges: 0 px (they touch at the same x!)")

print("\n== landmark ellipse, JOINED (peak): texture to wall mapping ==")
# joined: wall_u = (tex_u - off)/0.5, wall_v = tex_v
for side in "LR":
    off = 0.0 if side == "L" else 0.5
    pts = {"tex_centre(.5,.5)": (0.5, 0.5), "tex_left(.37,.5)": (0.37, 0.5), "tex_right(.63,.5)": (0.63, 0.5),
           "tex_bot(.5,.2)": (0.5, 0.2), "tex_top(.5,.8)": (0.5, 0.8)}
    print(f" SCREEN_{side}:")
    for k, (a, b) in pts.items():
        wu = (a - off) / 0.5; wv = b
        p = pr(wall(side, wu, wv), FOH)
        vis = 0.0 <= wu <= 1.0
        print(f"   {k}: wall_u={wu:+.3f} visible={vis} screen={np.round(p,1) if p is not None else None}")

print("\n== landmark ellipse, INDEPENDENT (low) ==")
IND = {"L": (1.0, 1.0, 0.0, 0.0), "R": (0.58, 0.58, 0.21, 0.30)}
for side, (su, sv, ou, ov) in IND.items():
    print(f" SCREEN_{side}: scale=({su},{sv}) offset=({ou},{ov})")
    for k, (a, b) in {"tex_centre(.5,.5)": (0.5, 0.5), "tex_left(.37,.5)": (0.37, 0.5),
                      "tex_right(.63,.5)": (0.63, 0.5), "tex_bot(.5,.2)": (0.5, 0.2),
                      "tex_top(.5,.8)": (0.5, 0.8)}.items():
        wu = (a - ou) / su; wv = (b - ov) / sv
        p = pr(wall(side, wu, wv), FOH)
        print(f"   {k}: wall_u={wu:+.3f} wall_v={wv:+.3f} screen={np.round(p,1) if p is not None else None}")

print("\n== scale references, FOH_WIDE ==")
for side in "LR":
    p = pr(wall(side, 0.5, 0.0), FOH); q = pr(wall(side, 0.5, 1.0), FOH)
    print(f"  SCREEN_{side} full 9 m height in pixels: {abs(q[1]-p[1]):.1f}px")
pl = pr([0, 0.9, 0], FOH); ph = pr([0, 0.9 + 1.7, 0], FOH)
print(f"  performer 1.7 m at origin: {abs(ph[1]-pl[1]):.1f} px tall, screen y {pl[1]:.0f}..{ph[1]:.0f}")
b1 = pr([-2.5, 0.03, 8], FOH); b2 = pr([2.5, 0.03, 8], FOH)
print(f"  5 m scale bar at z=8: {abs(b2[0]-b1[0]):.1f} px wide, at y={b1[1]:.0f}")
g1 = pr([-2, 0.01, -6 + 2], FOH); g2 = pr([2, 0.01, -6 + 2], FOH)
print(f"  4 m of grid (gridSpacingM=4) at world z=-4: {abs(g2[0]-g1[0]):.1f} px")
print(f"  stage floor 44x20m far edge z=-16 -> screen y {pr([0,0,-16], FOH)[1]:.0f}")
print(f"  stage floor 44x20m near edge z=+4  -> screen y {pr([0,0,4], FOH)[1]:.0f}")
print(f"  FOH camera is at z=+30; floor near edge is {30-4} m in front of it, uncovered black")
