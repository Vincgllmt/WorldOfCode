"""
Referee de « Caméléon Caméléon » (exécuté dans Piston).

Entrée  (stdin) : JSON { "input": "<grille>", "output": "<actions joueur>" }
Sortie  (stdout): JSON { "verdict": "passed|failed", "score": int,
                         "replay": { "init": {...}, "frames": [...] } }

Règle du combo croissant : les fruits mangés forment des séries de tailles
1, 2, 3, …  Chaque série est monochrome (couleur libre d'une série à l'autre).
Manger un fruit de la mauvaise couleur au milieu d'une série casse le combo.
"""
import sys
import json

MAX_SCORE = 150
COLORS = ("R", "G", "B")
DELTA = {"U": (0, -1), "D": (0, 1), "L": (-1, 0), "R": (1, 0)}

data = json.load(sys.stdin)
raw_input = data.get("input", "")
raw_output = data.get("output", "")

# --- Parsing de la grille -------------------------------------------------
lines = [l for l in raw_input.splitlines() if l.strip() != ""]
header = lines[0].split()
cols, rows, budget, target = (int(x) for x in header[:4])
grid = lines[1:1 + rows]

walls = []
start = [0, 0]
fruits = []          # [{ "pos": [x, y], "color": "R" }]
fruit_map = {}       # (x, y) -> "R"
for y in range(rows):
    row = grid[y] if y < len(grid) else ""
    for x in range(cols):
        c = row[x] if x < len(row) else "."
        if c == "#":
            walls.append([x, y])
        elif c == "S":
            start = [x, y]
        elif c in COLORS:
            fruits.append({"pos": [x, y], "color": c})
            fruit_map[(x, y)] = c

init = {
    "cols": cols,
    "rows": rows,
    "walls": walls,
    "start": start,
    "fruits": fruits,
    "target": target,
    "budget": budget,
}

wall_set = {(w[0], w[1]) for w in walls}

# --- Parsing des actions joueur -------------------------------------------
actions = []
for line in raw_output.upper().splitlines():
    parts = line.split()
    if len(parts) < 2:
        continue
    verb, arg = parts[0], parts[1]
    if verb == "MOVE" and arg in DELTA:
        actions.append(("MOVE", arg))
    elif verb == "SKIN" and arg in COLORS:
        actions.append(("SKIN", arg))

# --- Simulation -----------------------------------------------------------
pos = list(start)
skin = None
eaten = set()

target_size = 1      # taille de la série en cours de constitution
series_color = None  # couleur fixée par le 1er fruit de la série
series_count = 0     # fruits mangés dans la série courante
completed = 0        # séries entièrement complétées
broken = False       # le combo a-t-il été cassé ?


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
        "series": {
            "target": target_size,
            "count": series_count,
            "color": series_color,
            "completed": completed,
        },
        "score": current_score(),
    }


def try_eat():
    """Mange le fruit sous le caméléon si la peau correspond. Retourne sa couleur ou None."""
    global series_color, series_count, target_size, completed, broken
    key = (pos[0], pos[1])
    if key not in fruit_map or key in eaten or skin != fruit_map[key]:
        return None

    eaten.add(key)
    color = fruit_map[key]

    if not broken:
        if series_count == 0:
            series_color = color
            series_count = 1
        elif color == series_color:
            series_count += 1
        else:
            broken = True  # mauvaise couleur en pleine série → combo cassé

        if not broken and series_count == target_size:
            completed += 1
            target_size += 1
            series_count = 0
            series_color = None
    return color


frames = [frame("start")]

for i, (verb, arg) in enumerate(actions):
    if i >= budget:
        break

    if verb == "SKIN":
        skin = arg
        color = try_eat()  # changer de peau sur un fruit peut le manger aussitôt
        frames.append(frame("eat" if color else "skin", pos if color else None, color))

    else:  # MOVE
        dx, dy = DELTA[arg]
        nx, ny = pos[0] + dx, pos[1] + dy
        if nx < 0 or ny < 0 or nx >= cols or ny >= rows or (nx, ny) in wall_set:
            frames.append(frame("blocked"))
            continue
        pos = [nx, ny]
        color = try_eat()
        frames.append(frame("eat" if color else "move", pos if color else None, color))

verdict = "passed" if completed >= target else "failed"

print(json.dumps({
    "verdict": verdict,
    "score": current_score(),
    "replay": {"init": init, "frames": frames},
}))
