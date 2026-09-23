"""
Referee de la Route des feux (execute dans Piston).

Entree  (stdin) : JSON { "input": "<N puis N couleurs>", "output": "<ordres du joueur>" }
Sortie  (stdout): JSON { "verdict": "passed|failed", "score": int, "replay": { "init": {...}, "frames": [...] } }

A chaque feu son ordre : VERT -> PASSE, ORANGE -> RALENTIS, ROUGE -> STOP.
"""
import sys
import json

ORDRES = {"VERT": "PASSE", "ORANGE": "RALENTIS", "ROUGE": "STOP"}

data = json.load(sys.stdin)
raw_input = data.get("input", "")
raw_output = data.get("output", "")

tokens = raw_input.split()
n = int(tokens[0])
colors = [c.upper() for c in tokens[1:1 + n]]

init = {"lights": colors}

# Une ligne non vide = un ordre. Casse et espaces autour toleres ("stop" passe).
orders = [l.strip().upper() for l in raw_output.splitlines() if l.strip() != ""]

frames = [{"light": -1, "event": "start"}]
good = 0
broken = False

for i, color in enumerate(colors):
    if i >= len(orders):
        # Plus d'ordre : la voiture reste plantee devant le feu.
        frames.append({"light": i, "color": color, "event": "missing", "expected": ORDRES[color]})
        broken = True
        break
    order = orders[i]
    if order != ORDRES[color]:
        frames.append({
            "light": i,
            "color": color,
            "order": order[:14],
            "event": "wrong",
            "expected": ORDRES[color],
        })
        broken = True
        break
    good += 1
    frames.append({"light": i, "color": color, "order": order, "event": "drive"})

# Tous les feux respectes, mais des ordres en trop apres le dernier.
if not broken and len(orders) > len(colors):
    frames.append({"light": len(colors), "event": "extra", "order": orders[len(colors)][:14]})
    broken = True

passed = not broken
if passed:
    frames.append({"light": len(colors), "event": "arrived"})

score = 100 if passed else min(99, round(100 * good / max(1, len(colors))))

print(json.dumps({
    "verdict": "passed" if passed else "failed",
    "score": score,
    "replay": {"init": init, "frames": frames},
}))
