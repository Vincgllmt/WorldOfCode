"""
Referee du labyrinthe (exécuté dans Piston).

Entrée  (stdin) : JSON { "input": "<grille>", "output": "<deplacements joueur>" }
Sortie  (stdout): JSON { "verdict": "passed|failed", "score": int, "replay": { "init": {...}, "frames": [...] } }
"""
import sys
import json

data = json.load(sys.stdin)
raw_input = data.get("input", "")
raw_output = data.get("output", "")

lines = [l for l in raw_input.splitlines() if l != ""]
cols, rows = (int(x) for x in lines[0].split()[:2])
grid = lines[1:1 + rows]

walls = []
start = None
goal = None
for y in range(rows):
    row = grid[y] if y < len(grid) else ""
    for x in range(cols):
        c = row[x] if x < len(row) else "."
        if c == "#":
            walls.append([x, y])
        elif c == "S":
            start = [x, y]
        elif c == "G":
            goal = [x, y]

init = {"cols": cols, "rows": rows, "walls": walls, "start": start, "goal": goal}

wall_set = {(w[0], w[1]) for w in walls}
delta = {"U": (0, -1), "D": (0, 1), "L": (-1, 0), "R": (1, 0)}
moves = [c for c in raw_output.upper() if c in delta]

pos = list(start)
frames = [{"pos": list(pos)}]
verdict = "failed"

for m in moves:
    dx, dy = delta[m]
    nx, ny = pos[0] + dx, pos[1] + dy
    if nx < 0 or ny < 0 or nx >= cols or ny >= rows or (nx, ny) in wall_set:
        frames.append({"pos": list(pos), "event": "hit-wall"})
        break
    pos = [nx, ny]
    if pos == goal:
        frames.append({"pos": list(pos), "event": "goal"})
        verdict = "passed"
        break
    frames.append({"pos": list(pos), "event": "move"})

print(json.dumps({
    "verdict": verdict,
    "score": 100 if verdict == "passed" else 0,
    "replay": {"init": init, "frames": frames},
}))
