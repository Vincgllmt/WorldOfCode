"""
Referee de « Caméléon Gourmand » (exécuté dans Piston) — modèle « ordre + couleur ».

Le joueur ne gère PAS le déplacement : il indique seulement quelle peau prendre
(SKIN) et quel fruit manger (EAT <numéro>). Le moteur (ce referee) déplace le
caméléon jusqu'au fruit via le plus court chemin (BFS, en contournant les
obstacles) et anime le tout.

Entrée (stdin) : JSON { "input": "<niveau>", "output": "<actions joueur>" }

  Format du niveau :
    cols rows cible
    <nbFruits>
    fx fy couleur        (une ligne par fruit ; le numéro = l'ordre, à partir de 0)
    <nbObstacles>
    ox oy                (une ligne par obstacle)

  Le caméléon démarre toujours en (0,0).

Sortie (stdout) : JSON { "verdict", "score", "replay": { "init", "frames" } }
"""
import sys
import json
from collections import deque

MAX_SCORE = 200
COLORS = ("R", "G", "B")
DELTA = ((0, -1), (0, 1), (-1, 0), (1, 0))

data = json.load(sys.stdin)
raw_input = data.get("input", "")
raw_output = data.get("output", "")

lines = [l for l in raw_input.splitlines() if l.strip() != ""]
cols, rows, target = (int(x) for x in lines[0].split()[:3])

idx = 1
n_fruits = int(lines[idx]); idx += 1
fruits = []  # [{ "pos": [x, y], "color": "R" }]
for _ in range(n_fruits):
    p = lines[idx].split(); idx += 1
    fruits.append({"pos": [int(p[0]), int(p[1])], "color": p[2]})

walls = []
if idx < len(lines):
    n_obst = int(lines[idx]); idx += 1
    for _ in range(n_obst):
        if idx < len(lines):
            p = lines[idx].split(); idx += 1
            walls.append([int(p[0]), int(p[1])])

start = [0, 0]
wall_set = {(w[0], w[1]) for w in walls}

init = {
    "cols": cols,
    "rows": rows,
    "walls": walls,
    "start": start,
    "fruits": fruits,
    "target": target,
    "budget": 0,
}


def bfs(src, dst, avoid=frozenset()):
    """Plus court chemin (liste de cases, src incluse) entre deux cases, ou None.
    `avoid` = cases à ne pas traverser (ex. les fruits non ciblés)."""
    if src == dst:
        return [list(src)]
    prev = {(src[0], src[1]): None}
    q = deque([(src[0], src[1])])
    while q:
        x, y = q.popleft()
        for dx, dy in DELTA:
            nx, ny = x + dx, y + dy
            if 0 <= nx < cols and 0 <= ny < rows and (nx, ny) not in wall_set and (nx, ny) not in avoid and (nx, ny) not in prev:
                prev[(nx, ny)] = (x, y)
                if [nx, ny] == dst:
                    path = [(nx, ny)]
                    cur = (x, y)
                    while cur is not None:
                        path.append(cur)
                        cur = prev[cur]
                    path.reverse()
                    return [list(p) for p in path]
                q.append((nx, ny))
    return None


# --- Parsing des actions joueur (SKIN <couleur> / EAT <numéro>) ----------
actions = []
for line in raw_output.upper().splitlines():
    p = line.split()
    if len(p) < 2:
        continue
    if p[0] == "SKIN" and p[1] in COLORS:
        actions.append(("SKIN", p[1]))
    elif p[0] == "EAT" and p[1].lstrip("-").isdigit():
        actions.append(("EAT", int(p[1])))

# --- Simulation -----------------------------------------------------------
pos = list(start)
skin = None
eaten = set()
target_size = 1
series_color = None
series_count = 0
completed = 0
broken = False


def current_score():
    if target <= 0:
        return 0
    return round(MAX_SCORE * min(completed, target) / target)


def frame(event, eaten_cell=None, eaten_color=None):
    return {
        "pos": list(pos),
        "skin": skin,
        "event": event,
        "eaten": list(eaten_cell) if eaten_cell else None,
        "eatenColor": eaten_color,
        "series": {"target": target_size, "count": series_count, "color": series_color, "completed": completed},
        "score": current_score(),
    }


frames = [frame("start")]

for verb, arg in actions:
    if verb == "SKIN":
        skin = arg
        frames.append(frame("skin"))
        continue

    # EAT <numéro>
    i = arg
    if i < 0 or i >= n_fruits or i in eaten:
        continue
    color = fruits[i]["color"]
    if skin != color:  # mauvaise peau → on ne peut pas manger
        continue
    # On contourne les autres fruits non mangés (on ne traverse que la cible).
    occupied = {(fruits[j]["pos"][0], fruits[j]["pos"][1]) for j in range(n_fruits) if j not in eaten}
    occupied.discard((fruits[i]["pos"][0], fruits[i]["pos"][1]))
    path = bfs(pos, fruits[i]["pos"], occupied)
    if path is None:
        path = bfs(pos, fruits[i]["pos"])  # repli si encerclé : peut traverser
    if path is None:
        continue

    steps = path[1:]
    for cell in steps[:-1]:
        pos = list(cell)
        frames.append(frame("move"))
    if steps:
        pos = list(steps[-1])

    eaten.add(i)
    if not broken:
        if series_count == 0:
            series_color = color
            series_count = 1
        elif color == series_color:
            series_count += 1
        else:
            broken = True
        if not broken and series_count == target_size:
            completed += 1
            target_size += 1
            series_count = 0
            series_color = None

    frames.append(frame("eat", pos, color))

verdict = "passed" if completed >= target else "failed"

print(json.dumps({
    "verdict": verdict,
    "score": current_score(),
    "replay": {"init": init, "frames": frames},
}))
