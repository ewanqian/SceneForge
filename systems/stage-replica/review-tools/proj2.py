import math

W, H = 1600.0, 900.0
CAM = (0.0, 1.6, 12.0)
TGT = (0.0, 3.0, 0.0)


def proj(P, vfov_deg, cam=CAM, tgt=TGT):
    fy, fz = tgt[1] - cam[1], tgt[2] - cam[2]
    L = math.hypot(fy, fz)
    fy, fz = fy / L, fz / L
    uy, uz = -fz, fy  # screen-up = forward rotated +90deg about +x
    v = [P[0] - cam[0], P[1] - cam[1], P[2] - cam[2]]
    d = v[1] * fy + v[2] * fz
    uu = v[1] * uy + v[2] * uz
    return H / 2 - (uu / d) / math.tan(math.radians(vfov_deg) / 2) * H / 2


for vf in (35.75, 37.35, 44.0):
    print("vfov", vf)
    print("   ground directly below cam (0,0,12) ->", round(proj((0, 0, 12), vf), 1))
    print("   ground 1m ahead (0,0,11)          ->", round(proj((0, 0, 11), vf), 1))
    print("   capsule base (0,0.9,0)            ->", round(proj((0, 0.9, 0), vf), 1))
    print("   capsule top  (0,2.32,0)           ->", round(proj((0, 2.32, 0), vf), 1))
    print("   stage front edge (0,0.9,4)        ->", round(proj((0, 0.9, 4), vf), 1))
    print("   stage back edge  (0,0.9,-4)       ->", round(proj((0, 0.9, -4), vf), 1))
    print("   floor r=17,z=0 (0,0,0)            ->", round(proj((0, 0, 0), vf), 1))
    print("   dome apex (0,25,0)                ->", round(proj((0, 25, 0), vf), 1))
    print("   eye-level far point (0,1.6,-1000) ->", round(proj((0, 1.6, -1000), vf), 1))
