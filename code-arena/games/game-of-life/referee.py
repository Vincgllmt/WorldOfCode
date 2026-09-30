"""
Referee de la Boite de Petri (execute dans Piston).

Entree  (stdin) : JSON { "input": "<l h G puis la grille>", "output": "<grille du joueur>" }
Sortie  (stdout): JSON { "verdict": "passed|failed", "score": int, "replay": { "init": {...}, "frames": [...] } }

Jeu de la vie de Conway (naissance a 3 voisines, survie a 2 ou 3), bords morts.
"""
import sys
import json


def step(grid, cols, rows):
    nxt = []
    for y in range(rows):
        line = []
        for x in range(cols):
            n = 0
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if (dx or dy) and 0 <= y + dy < rows and 0 <= x + dx < cols and grid[y + dy][x + dx] == "#":
                        n += 1
            alive = grid[y][x] == "#"
            line.append("#" if n == 3 or (alive and n == 2) else ".")
        nxt.append("".join(line))
    return nxt


def alive_cells(grid, cols):
    return [y * cols + x for y, row in enumerate(grid) for x, ch in enumerate(row) if ch == "#"]


data = json.load(sys.stdin)
raw_input = data.get("input", "")
raw_output = data.get("output", "")

lines = [l.rstrip() for l in raw_input.splitlines() if l.strip() != ""]
cols, rows, gens = (int(v) for v in lines[0].split()[:3])
grid = [(lines[1 + y] if 1 + y < len(lines) else "").ljust(cols, ".")[:cols] for y in range(rows)]

init = {"cols": cols, "rows": rows, "gens": gens}

# Evolution reelle, generation par generation (pour la visualisation).
frames = [{"event": "gen", "gen": 0, "alive": alive_cells(grid, cols)}]
for g in range(1, gens + 1):
    grid = step(grid, cols, rows)
    frames.append({"event": "gen", "gen": g, "alive": alive_cells(grid, cols)})
expected = grid
# Courbe de population (une valeur par generation), tracee par le viewer.
init["population"] = [len(f["alive"]) for f in frames]

answer = [l.rstrip() for l in raw_output.splitlines() if l.strip() != ""]
passed = answer == expected

# Comparaison case par case : une ligne absente ou trop courte compte comme morte.
missing = []  # devrait vivre, morte chez le joueur
extra = []  # devrait mourir, vivante chez le joueur
for y in range(rows):
    got = answer[y] if y < len(answer) else ""
    for x in range(cols):
        want_alive = expected[y][x] == "#"
        got_alive = x < len(got) and got[x] == "#"
        if want_alive and not got_alive:
            missing.append(y * cols + x)
        elif got_alive and not want_alive:
            extra.append(y * cols + x)

frames.append({
    "event": "compare",
    "gen": gens,
    "alive": alive_cells(expected, cols),
    "missing": missing,
    "extra": extra,
    "rowsGot": len(answer),
    "passed": passed,
})

# Score partiel sur les cellules vivantes (une grille vide ne doit pas rapporter de points) :
# bien predites / (bien predites + oubliees + en trop).
found = len(frames[-1]["alive"]) - len(missing)
denom = found + len(missing) + len(extra)
if passed:
    score = 100
elif denom == 0:
    score = 0
else:
    score = min(99, round(100 * found / denom))

print(json.dumps({
    "verdict": "passed" if passed else "failed",
    "score": score,
    "replay": {"init": init, "frames": frames},
}))
