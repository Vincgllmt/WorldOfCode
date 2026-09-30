"""
Referee du Maitre du Sudoku (execute dans Piston).

Entree  (stdin) : JSON { "input": "<9 lignes, '.' = vide>", "output": "<grille du joueur>" }
Sortie  (stdout): JSON { "verdict": "passed|failed", "score": int, "replay": { "init": {...}, "frames": [...] } }

On verifie la grille du joueur sans jamais renvoyer la solution : en cas d'echec, le
replay ne montre que les conflits (comme un vrai verificateur de sudoku).
"""
import sys
import json


def units():
    """Les 27 groupes de 9 cases (lignes, colonnes, carres), en index 0..80."""
    groups = []
    for r in range(9):
        groups.append([r * 9 + c for c in range(9)])
    for c in range(9):
        groups.append([r * 9 + c for r in range(9)])
    for br in range(0, 9, 3):
        for bc in range(0, 9, 3):
            groups.append([(br + i) * 9 + bc + j for i in range(3) for j in range(3)])
    return groups


UNITS = units()
PEERS = [set() for _ in range(81)]
for u in UNITS:
    for i in u:
        PEERS[i].update(j for j in u if j != i)


def solve(grid):
    """Backtracking, case la plus contrainte d'abord (sert au score partiel)."""
    best, best_cands = -1, None
    for i in range(81):
        if grid[i] == ".":
            used = {grid[j] for j in PEERS[i]}
            cands = [d for d in "123456789" if d not in used]
            if best_cands is None or len(cands) < len(best_cands):
                best, best_cands = i, cands
                if not cands:
                    return None
    if best < 0:
        return "".join(grid)
    for d in best_cands:
        grid[best] = d
        res = solve(grid)
        if res:
            return res
    grid[best] = "."
    return None


data = json.load(sys.stdin)
raw_input = data.get("input", "")
raw_output = data.get("output", "")

in_rows = [l.strip() for l in raw_input.splitlines() if l.strip() != ""]
givens = "".join((in_rows[r] if r < len(in_rows) else "")[:9].ljust(9, ".") for r in range(9))

# Lignes du joueur : on ne garde que les chiffres (espaces et separateurs toleres),
# et on ignore les lignes sans aucun chiffre (traits de separation, par exemple).
rows = []
for line in raw_output.splitlines():
    digits = "".join(ch for ch in line if ch.isdigit())
    if digits:
        rows.append(digits)
    if len(rows) == 9:
        break
format_ok = len(rows) == 9 and all(len(r) == 9 for r in rows)
player = "".join((rows[r] if r < len(rows) else "")[:9].ljust(9, ".") for r in range(9))
player = "".join(ch if ch in "123456789" else "." for ch in player)

# Indice modifie = un AUTRE chiffre ecrit a sa place (une ligne absente n'est pas une modification).
changed = [i for i in range(81) if givens[i] != "." and player[i] != "." and player[i] != givens[i]]
invalid = [i for i in range(81) if player[i] == "."]
conflicts = set()
for u in UNITS:
    seen = {}
    for i in u:
        if player[i] != ".":
            seen.setdefault(player[i], []).append(i)
    for idxs in seen.values():
        if len(idxs) > 1:
            conflicts.update(idxs)

passed = format_ok and not changed and not invalid and not conflicts

init = {"givens": givens, "player": player}
frames = [{"event": "start"}]
for r in range(9):
    frames.append({"event": "row", "row": r})
if passed:
    frames.append({"event": "passed"})
else:
    frames.append({
        "event": "failed",
        "changed": changed,
        "invalid": invalid,
        "conflicts": sorted(conflicts),
        "rowsGot": len(rows),
    })

solution = solve(list(givens)) or givens
empties = [i for i in range(81) if givens[i] == "."]
right = sum(1 for i in empties if player[i] == solution[i])
# Un indice modifie annule une case juste : on ne gagne rien a reecrire la grille.
score = 100 if passed else min(99, round(100 * max(0, right - len(changed)) / max(1, len(empties))))

print(json.dumps({
    "verdict": "passed" if passed else "failed",
    "score": score,
    "replay": {"init": init, "frames": frames},
}))
