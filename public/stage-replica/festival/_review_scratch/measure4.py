import numpy as np
from PIL import Image
import os

R = r"E:\wip\2610 Stage Replica\sceneforge\public\stage-replica\festival\_review_scratch"
def load(p): return np.asarray(Image.open(os.path.join(R, p)).convert("RGB")).astype(np.float32)

print("=== vertical grid-line (column) positions at the seam, PEAK ===")
img = load(r"live\FOH_WIDE_t20.png"); g = img.mean(axis=2)
for x in range(700, 900):
    col = g[380:520, x]
    n = int((col > 60).sum())
    if n > 80:
        print(f"   bright column x={x} ({n}/140 rows bright)")
print("  (left wall ends x=716, right wall starts x=884 per projection)")

print("\n=== horizontal grid-line (row) positions, same rows on both walls? ===")
img2 = load(r"live\FOH_WIDE_t12.png"); g2 = img2.mean(axis=2)
def rowpeaks(x0, x1):
    s = g2[350:545, x0:x1].mean(axis=1)
    pk = [350 + i for i in range(1, len(s) - 1) if s[i] > 55 and s[i] >= s[i-1] and s[i] > s[i+1]]
    return pk
print("  LEFT wall rows:", rowpeaks(360, 480))
print("  RIGHT wall rows:", rowpeaks(920, 1040))

print("\n=== screen luminance, VIDEO states (source region only) ===")
for t in (4, 8, 12, 16, 20, 24, 28, 31):
    v = load(f"vid\\t{t}.png"); gv = v.mean(axis=2)
    # video is 1578x802, HUD panel bottom-left, quad bottom-right
    L = gv[330:470, 370:700]
    Rr = gv[330:470, 860:1190]
    print(f"  t={t:2d}: left mean={L.mean():6.2f} max={L.max():5.0f} | right mean={Rr.mean():6.2f} max={Rr.max():5.0f}")

print("\n=== delivered stills: size / brightness ===")
for f in ["stills\\v1-low.png", "stills\\v1-peak.png", "stills\\v1-dj-peak.png"]:
    im = Image.open(os.path.join(R, f))
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    print(f"  {f}: {im.size} mean={a.mean():.2f} max={a.max():.0f}")
