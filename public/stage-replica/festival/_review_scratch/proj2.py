import numpy as np, math
from PIL import Image
import os

R = r"E:\wip\2610 Stage Replica\sceneforge\public\stage-replica\festival\_review_scratch"

def cam_basis(pos, target, fov_deg, W, H):
    f = np.array(target, float) - np.array(pos, float); f /= np.linalg.norm(f)
    up = np.array([0.0, 1.0, 0.0])
    r = np.cross(f, up); r /= np.linalg.norm(r)
    u = np.cross(r, f)
    t = math.tan(math.radians(fov_deg) / 2); ar = W / H
    return dict(C=np.array(pos, float), f=f, u=u, r=r, t=t, ar=ar)

def project(P, c, W, H):
    d = np.asarray(P, float) - c["C"]
    D = d @ c["f"]
    if D <= 1e-3: return None
    x = (d @ c["u"]) / (c["t"] * c["ar"] * D)
    y = (d @ c["r"]) / (c["t"] * D)
    return ((x + 1) * 0.5 * W, (1 - (y + 1) * 0.5) * H)

SCR = {
 "SCREEN_L": dict(pos=np.array([-13.,4.5,-10.]), rot=math.radians(18.), w=18., h=9.),
 "SCREEN_R": dict(pos=np.array([ 13.,4.5,-10.]), rot=math.radians(-18.), w=18., h=9.),
}
def wall_pt(s, u_, v_):
    p = SCR[s]
    lx = (u_ - 0.5) * p["w"]; ly = (v_ - 0.5) * p["h"]
    c, sn = math.cos(p["rot"]), math.sin(p["rot"])
    return p["pos"] + np.array([c * lx, ly, -sn * lx])

c = cam_basis([0,6.5,30],[0,5,-9],58,1600,900)
print("SCREEN_L corners (wall_u,wall_v):")
for k,(u_,v_) in {"bl":(0,0),"br":(1,0),"tl":(0,1),"tr":(1,1)}.items():
    print("  ",k, np.round(project(wall_pt("SCREEN_L",u_,v_),c,1600,900),1))
print("expected from calib.png: bl=(370,500) br=(713,487) tl=(367,324) tr=(715,337)")

# right wall viewed from the front: its local +u points to -x (away from centre)
print("SCREEN_R corners:")
for k,(u_,v_) in {"bl":(0,0),"br":(1,0),"tl":(0,1),"tr":(1,1)}.items():
    print("  ",k, np.round(project(wall_pt("SCREEN_R",u_,v_),c,1600,900),1))
print("expected from calib.png: bl=(863,487) br=(1206,500) tl=(861,337) tr=(1209,324)")

print("\n3D-checks: 1m blue cube at origin (floor), 5m bar z=8, screen top y=9")
print("  origin(y=0.5) ->", np.round(project([0,0.5,0],c,1600,900),1), " calib blue square centre ~ (790,519)")
print("  bar end (-2.5,0.03,8) ->", np.round(project([-2.5,0.03,8],c,1600,900),1))
print("  bar end (+2.5,0.03,8) ->", np.round(project([ 2.5,0.03,8],c,1600,900),1))
print("  calib white bar x 707-868 y~587")
