"""Build src/data/discovery_basemap.json for /discovery (one-time, checked in).

Pre-projects the world outline (Natural Earth 110m via world-atlas@2, ISC)
and the interior US state borders (us-atlas@3 states-10m, ISC; Census
public-domain geometry) into the page's base map frame, so the page ships
static SVG paths and needs no mapping library at runtime.

Projection: Natural Earth I (same polynomial as d3.geoNaturalEarth1), fitted
to a 960 x 560 frame with a 20 px margin. The page zooms to its preset views
with an affine transform of this frame, so the projection lives here and in
src/data/discovery.ts (project()) only. Keep the two in step.

Run (inputs are the published npm files, fetched once):
  curl -o countries-110m.json https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json
  curl -o states-10m.json     https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json
  py scripts/build_discovery_basemap.py countries-110m.json states-10m.json
"""
import json
import math
import sys
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "src" / "data" / "discovery_basemap.json"
W0, H0, PAD = 960, 560, 20


def ne1(lon, lat):
    lam, phi = math.radians(lon), math.radians(lat)
    p2 = phi * phi
    p4 = p2 * p2
    x = lam * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)))
    y = phi * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)))
    return x, y


# Fit the sphere to the frame (d3 fitExtent on {type: 'Sphere'}).
XMAX = ne1(180, 0)[0]
YMAX = ne1(0, 90)[1]
K = min((W0 - 2 * PAD) / (2 * XMAX), (H0 - 2 * PAD) / (2 * YMAX))
TX, TY = W0 / 2, H0 / 2


def project(lon, lat):
    x, y = ne1(lon, lat)
    return TX + K * x, TY - K * y


def decode(topo):
    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)
    return arcs


def arc_pts(arcs, i):
    return arcs[i] if i >= 0 else arcs[~i][::-1]


def ring(arcs, idx):
    out = []
    for i in idx:
        pts = arc_pts(arcs, i)
        out.extend(pts if not out else pts[1:])
    return out


def unwrap(pts):
    """Keep a ring that crosses the antimeridian on one side, clamped at 180."""
    if not any(abs(pts[k][0] - pts[k - 1][0]) > 180 for k in range(1, len(pts))):
        return pts
    east = sum(1 for p in pts if p[0] > 0) >= len(pts) / 2
    fixed = []
    for lon, lat in pts:
        if east and lon < 0:
            lon = 180.0
        elif not east and lon > 0:
            lon = -180.0
        fixed.append((lon, lat))
    return fixed


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    n = math.hypot(dx, dy) or 1e-12
    best, bi = -1.0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / n
        if d > best:
            best, bi = d, i
    if best <= eps:
        return [pts[0], pts[-1]]
    return rdp(pts[: bi + 1], eps)[:-1] + rdp(pts[bi:], eps)


def path(pts, close, eps, dp=2):
    xy = [project(lon, lat) for lon, lat in pts]
    # A closed ring starts and ends on one point, which leaves RDP no chord:
    # split it in two halves first.
    mid = len(xy) // 2
    xy = rdp(xy[: mid + 1], eps)[:-1] + rdp(xy[mid:], eps) if len(xy) > 3 else xy
    if len(xy) < (4 if close else 2):
        return ""
    s = "M" + "L".join(f"{x:.{dp}f},{y:.{dp}f}" for x, y in xy)
    return s + ("Z" if close else "")


def main(world_path, states_path):
    world = json.load(open(world_path, encoding="utf-8"))
    arcs = decode(world)
    land = []
    for g in world["objects"]["countries"]["geometries"]:
        if g.get("id") == "010":          # Antarctica: no zones, and it eats the frame
            continue
        polys = [g["arcs"]] if g["type"] == "Polygon" else g["arcs"] if g["type"] == "MultiPolygon" else []
        d = "".join(path(unwrap(ring(arcs, r)), True, 0.08, 1) for poly in polys for r in poly)
        if d:
            land.append(d)

    us = json.load(open(states_path, encoding="utf-8"))
    uarcs = decode(us)
    # Interior borders only: arcs shared by two states (topojson.mesh a !== b).
    use = Counter()
    for g in us["objects"]["states"]["geometries"]:
        polys = [g["arcs"]] if g["type"] == "Polygon" else g["arcs"]
        seen = set()
        for poly in polys:
            for r in poly:
                for i in r:
                    seen.add(i if i >= 0 else ~i)
        for i in seen:
            use[i] += 1
    borders = []
    for i, n in use.items():
        if n < 2:
            continue
        pts = uarcs[i]
        if all(-130 < lon < -60 and 23 < lat < 50 for lon, lat in pts):
            d = path(pts, False, 0.015)
            if d:
                borders.append(d)

    OUT.write_text(json.dumps({
        "frame": [W0, H0],
        "note": "Natural Earth 110m (world-atlas@2) and us-atlas@3 state borders, pre-projected (Natural Earth I). Built by scripts/build_discovery_basemap.py.",
        "land": land,
        "usBorders": "".join(borders),
    }, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size:,} bytes; {len(land)} countries, {len(borders)} border arcs)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
