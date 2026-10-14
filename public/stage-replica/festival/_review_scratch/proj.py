import numpy as np, math
from PIL import Image
import os

R = r"E:\wip\2610 Stage Replica\sceneforge\public\stage-replica\festival\_review_scratch"

SCREENS = {
    "SCREEN_L": dict(pos=np.array([-13.0, 4.5, -10.0]), rot=math.radians(18.0), w=18.0, h=9.0),
    "SCREEN_R": dict(pos=np.array([13.0, 4.5, -10.0]), rot=math.radians(-18.0), w=18.0, h=9.0),
}

def cam_basis(pos, target, fov_deg, W, H):
    f = np.array(target) - np.array(pos)
    f = f / np.linalg.norm(f)
    up = np.array([0.0, 1.0, 0.0])
    r = np.cross(f, up); r /= np.linalg.norm(r)
    u = np.cross(r, f)
    r = -r  # empirical: Three.js lookAt produces screen-up = -(f x worldUp)
    t = math.tan(math.radians(fov_deg) / 2)
    ar = W / H
    return np.array(pos), f, u, r, t, ar

def project(P, cam, W, H):
    C, f, u, r, t, ar = cam
    d = P - C
    D = d @ f
    if D <= 0.01: return None
    x = -((d @ u) / (t * D))
    y = -((d @ r) / (t * ar * D))
    return ((x + 1) * 0.5 * W, (1 - (y + 1) * 0.5) * H)

def wall_point(s, u_, v_):
    # u_ 0..1 left..right of the wall face in its local frame; v_ 0..1 bottom..top
    p = SCREENS[s]
    x = (u_ - 0.5) * p["w"]
    y = (v_ - 0.5) * p["h"]
    c, sn = math.cos(p["rot"]), math.sin(p["rot"])
    wx = c * x + sn * 0.0
    wz = -sn * x + c * 0.0
    return p["pos"] + np.array([wx, y, wz])

cam = cam_basis([0, 6.5, 30], [0, 5, -9], 58, 1600, 900)

print("=== FOH_WIDE camera check ===")
for s in SCREENS:
    for (u_, v_) in [(0, 0), (1, 0), (0, 1), (1, 1), (0.5, 0.5)]:
        print(s, (u_, v_), np.round(project(wall_point(s, u_, v_), cam, 1600, 900), 1))

JOIN = 0.5  # half-range per wall when joined
# landmark ellipse in source uv: centre (0.5,0.5), radius u 0.13, v 0.30
print("\n=== landmark ellipse endpoint screen positions (FOH_WIDE) ===")
for s in SCREENS:
    if s == "SCREEN_L":
        off = (0.0, 0.0)
    else:
        off = (0.5, 0.0)
    for label, (a, b) in [("centre", (0.5, 0.5)), ("u-min", (0.37, 0.5)), ("u-max", (0.63, 0.5)),
                          ("v-min", (0.5, 0.20)), ("v-max", (0.5, 0.80))]:
        # texture uv -> wall uv: wall_u = (tex_u - off_u)/scale_u ; scale_u=0.5
        wu = (a - off[0]) / 0.5
        wv = (b - off[1]) / 1.0
        P = wall_point(s, wu, wv)
        scr = project(P, cam, 1600, 900)
        print(f"{s:9s} {label:7s} tex=({a:.2f},{b:.2f}) wall_u={wu:6.3f} wall_v={wv:5.2f} screen={None if scr is None else np.round(scr,1)}")

# INDEPENDENT state ellipse extents
print("\n=== INDEPENDENT (t=4) ellipse extents ===")
IND = {"SCREEN_L": dict(scale=(1.0, 1.0), off=(0.0, 0.0)),
       "SCREEN_R": dict(scale=(0.58, 0.58), off=(0.21, 0.30))}
for s, cfg in IND.items():
    su, sv = cfg["scale"]; ou, ov = cfg["off"]
    for label, (a, b) in [("centre", (0.5, 0.5)), ("u-min", (0.37, 0.5)), ("u-max", (0.63, 0.5))]:
        wu = (a - ou) / su
        wv = (b - ov) / sv
        scr = project(wall_point(s, wu, wv), cam, 1600, 900)
        vis = 0.0 <= wu <= 1.0
        print(f"{s:9s} {label:7s} wall_u={wu:6.3f} visible={vis} screen={None if scr is None else np.round(scr,1)}")

print("\n=== inner gap ===")
for s, sign in [("SCREEN_L", +1), ("SCREEN_R", -1)]:
    e = project(wall_point(s, 1.0 if s == "SCREEN_L" else 0.0, 0.5), cam, 1600, 900)
    print(s, "inner edge screen x=", round(float(e[0]), 1))
