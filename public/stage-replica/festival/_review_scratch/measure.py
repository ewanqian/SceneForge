import numpy as np
from PIL import Image
import sys, os

R = r"E:\wip\2610 Stage Replica\sceneforge\public\stage-replica\festival\_review_scratch"

def load(p):
    return np.asarray(Image.open(os.path.join(R, p)).convert("RGB")).astype(np.float32)

def bright_cols(img, y0, y1, x0, x1):
    sub = img[y0:y1, x0:x1].mean(axis=2)
    return sub.mean(axis=0)

def centroid(img, y0, y1, x0, x1, thresh=25):
    sub = img[y0:y1, x0:x1].mean(axis=2)
    m = sub > thresh
    if m.sum() == 0:
        return None
    ys, xs = np.nonzero(m)
    return (x0 + xs.mean(), y0 + ys.mean(), m.sum(), sub.max())

# ---- HUD-free body region only (avoid HUD box bottom-left, quad top-right)
for name, y0, y1 in [("FOH_WIDE_t4", 340, 560), ("FOH_WIDE_t12", 340, 560), ("FOH_WIDE_t20", 340, 560), ("FOH_WIDE_t28", 340, 560)]:
    img = load(f"live\\{name}.png")
    # screen bands
    L = img[350:550, 320:740].mean(axis=2)
    Rr = img[350:550, 885:1300].mean(axis=2)
    print(name, "meanL=%.2f meanR=%.2f maxL=%.0f maxR=%.0f" % (L.mean(), Rr.mean(), L.max(), Rr.max()))
    # vertical white grid-line row positions on left screen (column x=400)
    col = img[330:570, 400].mean(axis=1)
    peaks = [330+i for i in range(1, len(col)-1) if col[i] > 60 and col[i] >= col[i-1] and col[i] > col[i+1]]
    print("   left-screen bright rows @x=400:", peaks[:14])
