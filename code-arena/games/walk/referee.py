"""
Referee de la Promenade du Cameleon (execute dans Piston).

Entree  (stdin) : JSON { "input": "<distance>", "output": "<lignes AVANCE>" }
Sortie  (stdout): JSON { "verdict": "passed|failed", "score": int, "replay": { "init": {...}, "frames": [...] } }
"""
import sys
import json

data = json.load(sys.stdin)
raw_input = data.get("input", "")
raw_output = data.get("output", "")

# L'entree tient en un seul nombre : la distance jusqu'a la fraise.
distance = int(raw_input.split()[0])

init = {"distance": distance}

# Une ligne non vide = un ordre. On tolere la casse et les espaces autour,
# mais chaque ligne doit etre exactement "AVANCE" : le format se decouvre vite.
ordres = [l.strip().upper() for l in raw_output.splitlines() if l.strip() != ""]

# Garde-fou : meme si le joueur imprime 100 000 lignes, le replay reste court.
MAX_FRAMES = distance + 3

pos = 0
frames = [{"pos": 0}]
verdict = "passed"
faute = None

for ordre in ordres:
    if ordre != "AVANCE":
        faute = ordre[:20]
        frames.append({"pos": pos, "event": "unknown"})
        verdict = "failed"
        break

    pos += 1
    if pos <= MAX_FRAMES:
        frames.append({"pos": pos, "event": "goal" if pos == distance else "walk"})

# Trop court : le cameleon s'arrete avant la fraise. Trop long : il la depasse.
if verdict == "passed" and pos != distance:
    frames.append({"pos": min(pos, MAX_FRAMES), "event": "miss"})
    verdict = "failed"

if verdict == "passed":
    score = 100
elif faute is not None or pos > distance:
    score = 0
else:
    # Score indicatif : la fraction du chemin parcourue avant de s'arreter.
    score = round(100 * pos / distance) if distance > 0 else 0

print(json.dumps({
    "verdict": verdict,
    "score": score,
    "replay": {"init": init, "frames": frames},
}))
