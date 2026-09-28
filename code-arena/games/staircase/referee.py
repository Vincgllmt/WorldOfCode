"""
Referee de l'Escalier de briques (execute dans Piston).

Entree  (stdin) : JSON { "input": "<N>", "output": "<rangees du joueur>" }
Sortie  (stdout): JSON { "verdict": "passed|failed", "score": int, "replay": { "init": {...}, "frames": [...] } }

La rangee i (de 1 a N) doit contenir exactement i caracteres '#'.
"""
import sys
import json

data = json.load(sys.stdin)
raw_input = data.get("input", "")
raw_output = data.get("output", "")

n = int(raw_input.split()[0])

# Les espaces en fin de ligne sont ignores (invisibles), pas ceux du debut :
# une rangee decalee n'est pas posee au bon endroit.
lines = [l.rstrip() for l in raw_output.splitlines() if l.strip() != ""]

# Le viewer affiche les lignes du joueur dans un petit terminal.
init = {"n": n, "lines": [l[:24] for l in lines[:n + 1]]}

frames = [{"row": 0, "event": "start"}]
good = 0
broken = False

for i in range(1, n + 1):
    if i > len(lines):
        frames.append({"row": i, "event": "missing"})
        broken = True
        break
    got = lines[i - 1]
    if got != "#" * i:
        frames.append({"row": i, "event": "wrong", "got": got[:24]})
        broken = True
        break
    good += 1
    frames.append({"row": i, "event": "row", "got": got})

if not broken and len(lines) > n:
    frames.append({"row": n + 1, "event": "extra", "got": lines[n][:24]})
    broken = True

passed = not broken
if passed:
    # L'ouvrier grimpe les marches, puis plante son drapeau au sommet.
    frames.append({"row": n, "event": "climb"})
    frames.append({"row": n, "event": "flag"})

score = 100 if passed else min(99, round(100 * good / max(1, n)))

print(json.dumps({
    "verdict": "passed" if passed else "failed",
    "score": score,
    "replay": {"init": init, "frames": frames},
}))
