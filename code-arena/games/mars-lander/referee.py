"""
Referee Mars Lander — Épisode 2 (exécuté dans Piston).

Entrée  (stdin) : JSON { "input": "<surface + état initial>", "output": "<commandes joueur>" }
Sortie  (stdout): JSON { "verdict": "passed|failed", "score": int, "replay": { "init": {...}, "frames": [...] } }

Modèle batch (pas de boucle interactive) : le joueur fournit la SÉQUENCE COMPLÈTE de
commandes `rotate power` (une par tour). Le referee simule la descente tour par tour avec
la physique de Mars (g = 3.711 m/s²) et juge l'atterrissage.
"""
import sys
import json
import math

G = 3.711
WIDTH = 7000
HEIGHT = 3000
MAX_TURNS = 1200  # garde-fou : une descente réaliste tient en quelques centaines de tours

data = json.load(sys.stdin)
raw_input = data.get("input", "")
raw_output = data.get("output", "")

# --- Entrée : surface puis état initial ---
lines = [l.strip() for l in raw_input.splitlines() if l.strip() != ""]
n = int(lines[0].split()[0])
surface = []
for i in range(1, 1 + n):
    xs, ys = lines[i].split()[:2]
    surface.append((float(xs), float(ys)))
init = lines[1 + n].split()
X, Y = float(init[0]), float(init[1])
hs, vs = float(init[2]), float(init[3])
fuel = int(float(init[4]))
rotate = int(float(init[5]))
power = int(float(init[6]))

# --- Zone d'atterrissage : segment plat le plus large ---
land_seg = -1
land_x1 = land_x2 = land_y = None
best_w = -1.0
for i in range(n - 1):
    (ax_, ay_), (bx_, by_) = surface[i], surface[i + 1]
    if ay_ == by_ and abs(bx_ - ax_) > best_w:
        best_w = abs(bx_ - ax_)
        land_seg = i
        land_x1, land_x2 = min(ax_, bx_), max(ax_, bx_)
        land_y = ay_

# --- Commandes du joueur (rotate power par ligne) ---
commands = []
for line in raw_output.splitlines():
    parts = line.split()
    if len(parts) < 2:
        continue
    try:
        commands.append((int(float(parts[0])), int(float(parts[1]))))
    except ValueError:
        continue

replay_init = {
    "width": WIDTH,
    "height": HEIGHT,
    "gravity": G,
    "surface": [[int(x), int(y)] for (x, y) in surface],
    "landing": {
        "x1": int(land_x1) if land_x1 is not None else None,
        "x2": int(land_x2) if land_x2 is not None else None,
        "y": int(land_y) if land_y is not None else None,
    },
}


def make_frame(t, event=None):
    # Valeurs entières (précision native du jeu, affichage type cockpit) : garde
    # le replay compact pour rester sous la limite de sortie du sandbox.
    f = {
        "time": t,
        "x": round(X), "y": round(Y),
        "hSpeed": round(hs), "vSpeed": round(vs),
        "fuel": int(fuel), "rotate": int(rotate), "power": int(power),
    }
    if event:
        f["event"] = event
    return f


def seg_cross(p1, p2, p3, p4):
    """Point d'intersection (x, y, t) des segments p1p2 et p3p4, sinon None."""
    x1, y1 = p1
    x2, y2 = p2
    x3, y3 = p3
    x4, y4 = p4
    denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if denom == 0:
        return None
    t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    u = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / denom
    if 0 <= t <= 1 and 0 <= u <= 1:
        return (x1 + t * (x2 - x1), y1 + t * (y2 - y1), t)
    return None


frames = [make_frame(0)]
verdict = "failed"
event = "out-of-commands"
turns = min(len(commands), MAX_TURNS)

for i in range(turns):
    req_r = max(-90, min(90, commands[i][0]))
    req_p = max(0, min(4, commands[i][1]))
    # variation effective limitée à +/-15° et +/-1 par tour
    rotate = max(rotate - 15, min(rotate + 15, req_r))
    power = max(power - 1, min(power + 1, req_p))
    if power > fuel:
        power = int(fuel)
    fuel -= power

    rad = math.radians(rotate)
    ax = -math.sin(rad) * power
    ay = math.cos(rad) * power - G
    nX = X + hs + 0.5 * ax
    nY = Y + vs + 0.5 * ay
    nhs = hs + ax
    nvs = vs + ay

    # collision sol : premier segment touché par le déplacement (X,Y) -> (nX,nY)
    hit = None
    hit_seg = -1
    for s in range(n - 1):
        c = seg_cross((X, Y), (nX, nY), surface[s], surface[s + 1])
        if c is not None and (hit is None or c[2] < hit[2]):
            hit = c
            hit_seg = s

    if hit is not None:
        X, Y = hit[0], hit[1]
        hs, vs = nhs, nvs
        on_flat = hit_seg == land_seg
        ok = on_flat and rotate == 0 and abs(round(vs)) <= 40 and abs(round(hs)) <= 20
        if ok:
            verdict, event = "passed", "landed"
        else:
            verdict, event = "failed", ("landed-bad" if on_flat else "crashed")
        frames.append(make_frame(i + 1, event))
        break

    X, Y, hs, vs = nX, nY, nhs, nvs

    # sortie de la zone de jeu = perdu
    if X < 0 or X >= WIDTH or Y >= HEIGHT:
        verdict, event = "failed", "lost"
        frames.append(make_frame(i + 1, event))
        break

    frames.append(make_frame(i + 1))
else:
    # plus de commandes (ou aucune) sans atterrissage ni crash
    frames[-1]["event"] = event

print(json.dumps({
    "verdict": verdict,
    "score": 100 if verdict == "passed" else 0,
    "replay": {"init": replay_init, "frames": frames},
}))
