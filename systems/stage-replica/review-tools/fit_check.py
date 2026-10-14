import math

W, H = 1600.0, 900.0


def proj(P, cam=(0.0, 1.6, 12.0), tgt=(0.0, 3.0, 0.0), vfov_deg=37.35):
    fy, fz = tgt[1] - cam[1], tgt[2] - cam[2]
    L = math.hypot(fy, fz)
    fy, fz = fy / L, fz / L
    uy, uz = -fz, fy
    v = [P[0] - cam[0], P[1] - cam[1], P[2] - cam[2]]
    d = v[1] * fy + v[2] * fz
    uu = v[1] * uy + v[2] * uz
    return H / 2 - (uu / d) / math.tan(math.radians(vfov_deg) / 2) * H / 2


print("sanity: capsule base (0,0.9,0) ->", round(proj((0, 0.9, 0)), 1), " top (0,2.32,0) ->", round(proj((0, 2.32, 0)), 1))
print("sanity: horizon-ish ground far away (0,0,-1000) ->", round(proj((0, 0, -1000)), 1))

# what world height y at z=0 lands on the measured capsule base row 572 and top row 475?
for row, label in ((572, "base"), (475, "top")):
    best = None
    for i in range(0, 4000):
        y = 0.2 + i * 0.001
        e = abs(proj((0, y, 0)) - row)
        if best is None or e < best[0]:
            best = (e, y)
    print("row", row, "(", label, ") corresponds to world y", round(best[1], 3), "at z=0 (err %.2f px)" % best[0])

# what would that mean for performer height if the capsule stood on the stage at z=0?
b = proj((0, 0.9, 0))
t = proj((0, 2.6, 0))
print("projected performer height px (z=0):", round(b - t, 1))
# and at z=-4 (back of stage)
b4 = proj((0, 0.9, -4))
t4 = proj((0, 2.6, -4))
print("projected performer height px (z=-4):", round(b4 - t4, 1), "base row", round(b4, 1), "top row", round(t4, 1))
