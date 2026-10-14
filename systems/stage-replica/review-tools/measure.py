import math, sys
from PIL import Image

def scan(path, xc_frac=0.5, band=30):
    im = Image.open(path).convert("L")
    w, h = im.size
    px = im.load()
    xc = int(w * xc_frac)
    rows = []
    for y in range(h):
        s = 0
        n = 0
        for x in range(max(0, xc - band), min(w, xc + band)):
            s += px[x, y]
            n += 1
        rows.append(s / n)
    return w, h, rows

def edges(rows, thr):
    out = []
    inside = False
    for y, v in enumerate(rows):
        if v > thr and not inside:
            inside = True
            out.append(("enter", y, round(v, 1)))
        elif v <= thr and inside:
            inside = False
            out.append(("leave", y, round(v, 1)))
    return out

def screen_y_for_elev(elev_deg, cam_y, cam_z, W, H, fovx_deg):
    # exact-ish: march the ray from the camera along +z-ish toward the dome, find hit, project
    th = math.radians(elev_deg)
    d = (math.cos(th), math.sin(th))  # (horizontal-forward, up) from camera looking at (0,3,0)
    # camera looks at (0,3,0) from (0,1.6,12): forward dir in the y-z plane
    fwd = (0.0 - 0.0, 3.0 - cam_y, 0.0 - cam_z)
    fl = math.hypot(fwd[1], fwd[2]); fwd = (fwd[1] / fl, fwd[2] / fl)  # (y,z) normalized
    # ray dir in (forward, up-ish) basis
    dir_y = fwd[0] * math.cos(th) + fwd[1] * math.sin(th)
    dir_z = fwd[1] * math.cos(th) - fwd[0] * math.sin(th)
    # intersect sphere x=0 plane circle: y^2+z^2 = R^2, start (y0,z0)=(cam_y, cam_z)
    R = 25.0
    a = dir_y * dir_y + dir_z * dir_z
    b = 2 * (cam_y * dir_y + cam_z * dir_z)
    c = cam_y * cam_y + cam_z * cam_z - R * R
    disc = b * b - 4 * a * c
    if disc < 0:
        return None
    t = (-b + math.sqrt(disc)) / (2 * a)
    hy, hz = cam_y + t * dir_y, cam_z + t * dir_z
    # camera basis
    cy, cz = fwd
    rel_y, rel_z = hy - cam_y, hz - cam_z
    along = rel_y * cy + rel_z * cz
    up = -rel_y * cz + rel_z * cy  # signed perpendicular
    fovy = 2 * math.degrees(math.atan(math.tan(math.radians(fovx_deg) / 2) * (H / W)))
    ndc = (up / along) / math.tan(math.radians(fovy) / 2)
    return H / 2 - ndc * H / 2, (hy, hz)

if __name__ == "__main__":
    files = sys.argv[1:]
    for f in files:
        W, H, rows = scan(f)
        print("==", f, W, "x", H)
        print("  rows>12 :", edges(rows, 12)[:8])
        print("  rows>25 :", edges(rows, 25)[:8])
        print("  rows>45 :", edges(rows, 45)[:8])
    print("-- predicted screen y (1600x900, fovx=62) for AUDIENCE_CENTER (0,1.6,12):")
    for e in (12.4, 17.2, 22.5, 49.3, 35.5, 62.0, 70.0):
        r = screen_y_for_elev(e, 1.6, 12.0, 1600, 900, 62)
        print("   elev", e, "-> y", None if r is None else round(r[0], 1), "hit", None if r is None else (round(r[1][0], 1), round(r[1][1], 1)))
    print("-- ENCLOSE fovx=70 (frame 1578x802):")
    for e in (30.0, 40.0, 49.3, 60.0, 70.0):
        r = screen_y_for_elev(e, 1.6, 12.0, 1578, 802, 70)
        print("   elev", e, "-> y", None if r is None else round(r[0], 1))
