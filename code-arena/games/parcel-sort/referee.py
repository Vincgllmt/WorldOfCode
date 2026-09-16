"""
Referee du hangar (tri de colis) — exécuté dans Piston.

Entrée  (stdin) : JSON { "input": "<lot de colis>", "output": "<ids triés par le joueur>" }
Sortie  (stdout): JSON { "verdict": "passed|failed", "score": int, "replay": { "init": {...}, "frames": [...] } }

Le joueur doit renvoyer les id triés par volume croissant (l×w×h) ; à volume égal,
le plus petit id d'abord.
"""
import sys
import json

data = json.load(sys.stdin)
raw_input = data.get("input", "")
raw_output = data.get("output", "")

lines = [l for l in raw_input.splitlines() if l.strip() != ""]
n = int(lines[0].split()[0]) if lines else 0

parcels = []
for i in range(1, 1 + n):
    parts = lines[i].split()
    pid, l, w, h = (int(x) for x in parts[:4])
    parcels.append({"id": pid, "l": l, "w": w, "h": h, "vol": l * w * h})

# Ordre attendu : volume croissant, puis id croissant en cas d'égalité.
expected_ids = [p["id"] for p in sorted(parcels, key=lambda p: (p["vol"], p["id"]))]

# Réponse du joueur : une liste d'entiers séparés par des espaces / retours ligne.
player_ids = [int(x) for x in raw_output.split()] if raw_output.strip() else []

verdict = "passed" if player_ids == expected_ids else "failed"

init = {"parcels": parcels}

# Trace de replay : on pose les colis un par un dans l'ordre choisi par le joueur.
by_id = {p["id"]: p for p in parcels}
frames = [{"placed": []}]
placed = []
for slot, pid in enumerate(player_ids):
    if pid not in by_id:
        # id inconnu → on l'ignore côté animation (le verdict est déjà "failed").
        continue
    placed = placed + [pid]
    frames.append({"placed": list(placed), "current": pid, "slot": slot})

frames.append({"placed": list(placed), "event": verdict, "expected": expected_ids})

print(json.dumps({
    "verdict": verdict,
    "score": 100 if verdict == "passed" else 0,
    "replay": {"init": init, "frames": frames},
}))
