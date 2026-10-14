import math
from PIL import Image

R = 25.0

def ray_table(cam, target, W, H, fovx_deg, xcols):
    """For each screen column x in xcols and every row y, return elevation of the dome hit."""
    cy, cz = cam[1], cam[2]
    ty, tz = target[1], target[2]
    fy, fz = ty - cy, tz - cz
    fl = math.hypot(fy, fz); fy, fz = fy / fl, fz / fl
    fovy = 2 * math.degrees(math.atan(math.tan(math.radians(fovx_deg) / 2) * H / W))
    tany = math.tan(math.radians(fovy) / 2)
    tanx = math.tan(math.radians(fovx_deg) / 2)
    out = {}
    for x in xcols:
        sx = (2 * (x + 0.5) / W - 1) * tanx
        col = []
        for y in range(H):
            sy = (1 - 2 * (y + 0.5) / H) * tany
            # ray dir = forward + sx * right + sy * up ; camera at x=0 so right = (1,0,0)
            dy = fy + sy * fz
            dz = fz - sy * fy
            a = dy * dy + dz * dz
            b = 2 * (cy * dy + cz * dz)
            c = cy * cy + cz * cz - R * R
            disc = b * b - 4 * a * c
            if disc < 0:
                col.append(None)
                continue
            t = (-b + math.sqrt(disc)) / (2 * a)
            hy, hz = cy + t * dy, cz + t * dz
            # elevation is measured from the dome CENTER (that is what the shader uses)
            elev = math.degrees(math.asin(max(0.0, min(1.0, hy / R))))
            az = math.degrees(math.atan2(math.hypot(0, 0), 1))  # unused
            col.append(elev)
        out[x] = col
    return out

def report(path, cam, target, fovx, cols_frac=(0.5, 0.42, 0.58), thrs=(6, 10, 14, 20, 30)):
    im = Image.open(path).convert("L")
    W, H = im.size
    px = im.load()
    cols = [int(W * f) for f in cols_frac]
    tab = ray_table(cam, target, W, H, fovx, cols)
    print("==", path.split("\\")[-1], W, "x", H, "cam", cam, "fovx", fovx)
    for x, col in tab.items():
        prof = [px[x, y] for y in range(H)]
        hits = []
        for thr in thrs:
            top = None
            for y in range(H):
                if col[y] is None:
                    continue
                if prof[y] >= thr:
                    top = (y, round(col[y], 1))
                    break
            hits.append((thr, top))
        print("   col x=%d  lit-top(row, dome-elev-deg): %s" % (x, hits))

if __name__ == "__main__":
    base = r"E:\wip\2610 Stage Replica\sceneforge\public\stage-replica\sphere"
    report(base + r"\stills\v1-horizon.png", (0, 1.6, 12), (0, 3, 0), 62)
    report(base + r"\stills\v1-enclose.png", (0, 1.6, 12), (0, 3, 0), 62)
    report(base + r"\stills\v1-full-field.png", (0, 1.6, 12), (0, 3, 0), 62)
    report(base + r"\stills\v1-aperture.png", (0, 1.6, 12), (0, 3, 0), 62)
    report(base + r"\_review_frames\f4.png", (0, 1.6, 12), (0, 3, 0), 62)
    report(base + r"\_review_frames\f12.png", (0, 1.6, 12), (0, 3, 0), 62)
