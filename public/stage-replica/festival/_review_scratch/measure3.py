import numpy as np
from PIL import Image
import os

R = r"E:\wip\2610 Stage Replica\sceneforge\public\stage-replica\festival\_review_scratch"
X0, X1 = 330, 1300   # both screens, excluding quad overlay (x>=1000 is right screen... note quad starts y<530)
YB0, YB1 = 360, 540

def load(p):
    return np.asarray(Image.open(os.path.join(R, p)).convert("RGB")).astype(np.float32)

def runs(row, thresh):
    idx = np.nonzero(row > thresh)[0]
    if len(idx) == 0:
        return []
    out, s, p = [], idx[0], idx[0]
    for i in idx[1:]:
        if i > p + 2:
            out.append((s, p)); s = i
        p = i
    out.append((s, p))
    return out

for name in ["FOH_WIDE_t4", "FOH_WIDE_t12", "FOH_WIDE_t20", "FOH_WIDE_t28"]:
    img = load(f"live\\{name}.png")
    g = img.mean(axis=2)
    for th in (120, 200):
        best = None
        for y in range(YB0, YB1):
            n = int((g[y, X0:X1] > th).sum())
            if best is None or n > best[1]:
                best = (y, n)
        y = best[0]
        rs = [(a, b) for (a, b) in runs(g[y, :], th) if a >= X0 and b <= X1]
        print(f"{name} th={th}: y={y} n={best[1]} runs={rs}")
    print()
