"""
Referee de la course de chevaux (exécuté dans Piston).

Entrée  (stdin) : JSON { "input": "...", "output": "..." }
Sortie  (stdout): JSON { "verdict": "passed|failed", "score": int, "replay": {...} }

Format du cas de test :
  <distance> <N>
  <nom> <vitesse> <endurance>
  ...

Simulation (par pas d'une seconde) :
  - Si endurance > 0 : position += vitesse, endurance -= 1
  - Sinon             : position += vitesse // 2
  - Fin dès que position >= distance.
  Égalité (même seconde) : vitesse décroissante, puis nom alphabétique.

Sortie attendue : noms dans l'ordre d'arrivée, un par ligne.
"""

import sys
import json

data = json.load(sys.stdin)
raw_input  = data.get("input",  "")
raw_output = data.get("output", "").strip()

lines = [l for l in raw_input.splitlines() if l.strip()]
first_parts = lines[0].split()
distance  = int(first_parts[0])
n_horses  = int(first_parts[1])

horses = []
for i in range(1, n_horses + 1):
    parts = lines[i].split()
    horses.append({
        "name":    parts[0],
        "speed":   int(parts[1]),
        "stamina": int(parts[2]),
    })

# ── Simulation ────────────────────────────────────────────────────────────────
positions = [0] * n_horses
staminas  = [h["stamina"] for h in horses]
finished  = [None] * n_horses   # step at which horse i finished

frames       = []
finish_order = []          # names in finish order

t = 0
MAX_STEPS = distance * 10  # safety cap

while len(finish_order) < n_horses and t < MAX_STEPS:
    t += 1
    newly_done = []

    for i in range(n_horses):
        if finished[i] is not None:
            continue
        if staminas[i] > 0:
            positions[i] += horses[i]["speed"]
            staminas[i]  -= 1
        else:
            positions[i] += horses[i]["speed"] // 2

        if positions[i] >= distance:
            finished[i] = t
            newly_done.append(i)

    # Tie-break : vitesse décroissante puis nom alphabétique
    newly_done.sort(key=lambda i: (-horses[i]["speed"], horses[i]["name"]))
    for i in newly_done:
        finish_order.append(horses[i]["name"])

    frames.append({
        "positions": [min(positions[i], distance) for i in range(n_horses)],
        "staminas":  list(staminas),
        "finished":  [horses[i]["name"] for i in newly_done],
    })

# Ranks precomputed for the viewer
rank_map = {name: rank + 1 for rank, name in enumerate(finish_order)}
init = {
    "distance": distance,
    "horses": [
        {
            "name":    h["name"],
            "speed":   h["speed"],
            "stamina": h["stamina"],
            "rank":    rank_map.get(h["name"], n_horses + 1),
        }
        for h in horses
    ],
}

# ── Verdict ───────────────────────────────────────────────────────────────────
player_names = [l.strip() for l in raw_output.splitlines() if l.strip()]
verdict = "passed" if player_names == finish_order else "failed"

print(json.dumps({
    "verdict": verdict,
    "score":   100 if verdict == "passed" else 0,
    "replay":  {"init": init, "frames": frames},
}))
