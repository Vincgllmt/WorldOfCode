"""
Referee du Message secret (execute dans Piston).

Entree  (stdin) : JSON { "input": "<indice>\\n<message chiffre>", "output": "<message dechiffre du joueur>" }
Sortie  (stdout): JSON { "verdict": "passed|failed", "score": int, "replay": { "init": {...}, "frames": [...] } }

Code de Cesar : chaque lettre A-Z est decalee de k rangs ; le reste ne bouge pas.
Le bon decalage est celui qui fait apparaitre l'indice dans le message en clair.
"""
import sys
import json


def shift(text, k):
    out = []
    for ch in text:
        if "A" <= ch <= "Z":
            out.append(chr((ord(ch) - 65 + k) % 26 + 65))
        else:
            out.append(ch)
    return "".join(out)


data = json.load(sys.stdin)
raw_input = data.get("input", "")
raw_output = data.get("output", "")

lines = [l.rstrip("\r") for l in raw_input.split("\n")]
hint = lines[0].strip().upper()
cipher = lines[1].rstrip() if len(lines) > 1 else ""

k = next((j for j in range(26) if hint in shift(cipher, -j)), 0)
expected = shift(cipher, -k)

# Premiere ligne non vide de la sortie ; la casse est toleree.
answer = next((l.rstrip() for l in raw_output.splitlines() if l.strip() != ""), "")
player = answer.upper()

passed = player == expected
correct = sum(1 for i, ch in enumerate(expected) if i < len(player) and player[i] == ch)

init = {
    "hint": hint,
    "cipher": cipher,
    "shift": k,
    "expected": expected,
    "player": player[: len(cipher) + 12],
}

# Un mot = un groupe de caracteres sans espace : la feuille se devoile mot par mot.
words = [w for w in cipher.split(" ") if w != ""]
frames = [{"event": "start"}, {"event": "wheel"}]
for w in range(len(words)):
    frames.append({"event": "word", "word": w})
frames.append({"event": "passed" if passed else "failed", "word": len(words) - 1})

score = 100 if passed else min(99, round(100 * correct / max(1, len(expected))))

print(json.dumps({
    "verdict": "passed" if passed else "failed",
    "score": score,
    "replay": {"init": init, "frames": frames},
}))
