import numpy as np
from PIL import Image
import os

R = r"E:\wip\2610 Stage Replica\sceneforge\public\stage-replica\festival\_review_scratch"

def load(p):
    return np.asarray(Image.open(os.path.join(R, p)).convert("RGB")).astype(np.float32)

def runs(row, thresh=150):
    idx = np.nonzero(row > thresh)[0]
    if len(idx) == 0:
        return []
    out, s, p = [], idx[0], idx[0]
    for i in idx[1:]:
        if i > p + 2:
            out.append((s, p))
            s = i
        p = i
    out.append((s, p))
    return out

# Find the row with the most bright pixels => ellipse horizontal diameter
for name in ["FOH_WIDE_t4", "FOH_WIDE_t12", "FOH_WIDE_t20", "FOH_WIDE_t28"]:
    img = load(f"live\\{name}.png")
    g = img.mean(axis=2)
    best = None
    for y in range(350, 560):
        row = g[y, 320:1310]
        n = int((row > 150).sum())
        if best is None or n > best[1]:
            best = (y, n)
    y = best[0]
    print(f"--- {name}: busiest row y={y} (nBright={best[1]})")
    for (a, b) in runs(g[y, :], 150):
        print(f"    x {a}-{b}  (w={b-a+1})")
