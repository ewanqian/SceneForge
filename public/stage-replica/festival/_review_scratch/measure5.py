import numpy as np
from PIL import Image
import os

R = r"E:\wip\2610 Stage Replica\sceneforge\public\stage-replica\festival"
def arr(p): return np.asarray(Image.open(os.path.join(R, p)).convert("RGB")).astype(np.float32)

def bbox(mask, label):
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        print(f"  {label}: none"); return
    print(f"  {label}: x {xs.min()}..{xs.max()} (w={xs.max()-xs.min()+1}) "
          f"y {ys.min()}..{ys.max()} (h={ys.max()-ys.min()+1}) centre=({xs.mean():.0f},{ys.mean():.0f}) n={len(xs)}")

print("=== DJ_FRONT at PEAK: performer vs platform ===")
a = arr(r"live\..\_review_scratch\live\DJ_FRONT_t20.png") if False else arr(r"_review_scratch\live\DJ_FRONT_t20.png")
r, g, b = a[..., 0], a[..., 1], a[..., 2]
perf = (r > 120) & (g > 80) & (g < 200) & (b < 130) & (r > b + 40)
bbox(perf, "performer capsule (warm)")

# platform: darker-than-surroundings block below the performer, in the central band
band = a[560:660, 500:1000].mean(axis=2)
dark = band < 30
bbox(dark, "dark platform silhouette (raw)")
# print row-wise extents of the dark blob
for yy in range(0, band.shape[0], 8):
    idx = np.nonzero(dark[yy])[0]
    if len(idx):
        print(f"    y={560+yy}: x {500+idx.min()}..{500+idx.max()} (w={idx.max()-idx.min()+1})")

print("\n=== FOH_WIDE at PEAK: performer and platform ===")
c = arr(r"_review_scratch\live\FOH_WIDE_t20.png")
r2, g2, b2 = c[..., 0], c[..., 1], c[..., 2]
perf2 = (r2 > 120) & (g2 > 80) & (g2 < 200) & (b2 < 130) & (r2 > b2 + 40)
bbox(perf2, "performer capsule (warm)")
band2 = c[555:640, 600:1000].mean(axis=2)
dark2 = band2 < 30
for yy in range(0, band2.shape[0], 6):
    idx = np.nonzero(dark2[yy])[0]
    if len(idx):
        print(f"    y={555+yy}: x {600+idx.min()}..{600+idx.max()} (w={idx.max()-idx.min()+1})")

print("\n=== source texture resolution claim: canvas is 1280x720 (main.js), badge says 2048x1024 ===")
print("  scene.json raster.master =", 2048, "x", 1024)
print("\n=== 5 m scale bar on screen, FOH_WIDE ===")
row = c[654:657, 400:1200].mean(axis=(0, 2))
idx = np.nonzero(row > 90)[0]
if len(idx):
    print(f"  white bar x {400+idx.min()}..{400+idx.max()}  width={idx.max()-idx.min()+1} px")
    print(f"  -> so 1 m on the deck at z=8 = {(idx.max()-idx.min()+1)/5:.1f} px")
