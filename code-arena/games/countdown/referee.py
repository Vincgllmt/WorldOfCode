"""
Referee du Grand Feu d'artifice (execute dans Piston).

Entree  (stdin) : JSON { "input": "<N>", "output": "<compte a rebours du joueur>" }
Sortie  (stdout): JSON { "verdict": "passed|failed", "score": int, "replay": { "init": {...}, "frames": [...] } }

Le joueur doit ecrire N, N-1, ..., 1 (un nombre par ligne) puis FEU.
"""
import sys
import json

data = json.load(sys.stdin)
raw_input = data.get("input", "")
raw_output = data.get("output", "")

n = int(raw_input.split()[0])
expected = [str(k) for k in range(n, 0, -1)] + ["FEU"]

init = {"n": n, "sequence": expected}

# Une ligne non vide = une annonce. On tolere la casse et les espaces autour
# ("feu" passe), mais chaque annonce doit etre exactement la bonne.
lines = [l.strip().upper() for l in raw_output.splitlines() if l.strip() != ""]

# step = nombre d'annonces correctes deja faites (pilote les pastilles du viewer).
frames = [{"step": 0, "event": "ready"}]
good = 0
broken = False

for line in lines:
    if good >= len(expected):
        # Tout etait juste, mais le joueur continue d'ecrire apres FEU.
        frames.append({"step": good, "event": "extra", "shown": line[:12]})
        broken = True
        break
    if line != expected[good]:
        frames.append({"step": good, "event": "wrong", "shown": line[:12], "expected": expected[good]})
        broken = True
        break
    good += 1
    if line == "FEU":
        frames.append({"step": good, "event": "launch"})
    else:
        frames.append({"step": good, "event": "tick", "shown": line})

# Trop court : le compte a rebours s'arrete avant la mise a feu.
if not broken and good < len(expected):
    frames.append({"step": good, "event": "fizzle", "expected": expected[good]})
    broken = True

passed = not broken and good == len(expected)
if passed:
    # Le spectacle : deux salves puis le bouquet final.
    frames.append({"step": good, "event": "burst", "wave": 1})
    frames.append({"step": good, "event": "burst", "wave": 2})
    frames.append({"step": good, "event": "finale"})

score = 100 if passed else min(99, round(100 * good / len(expected)))

print(json.dumps({
    "verdict": "passed" if passed else "failed",
    "score": score,
    "replay": {"init": init, "frames": frames},
}))
