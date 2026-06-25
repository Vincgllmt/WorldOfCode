import sys
import json

data = json.load(sys.stdin)
raw_input  = data.get("input", "")
raw_output = data.get("output", "").strip()

lines = [l for l in raw_input.splitlines() if l.strip() != ""]
problem_type = lines[0].strip().upper() if lines else ""
args         = lines[1].strip() if len(lines) > 1 else ""

expected = ""

if problem_type == "SUCCESSOR":
    expected = str(int(args) + 1)
elif problem_type == "IS_NEGATIVE":
    expected = "True" if int(args) < 0 else "False"
elif problem_type == "ABS":
    expected = str(abs(int(args)))
elif problem_type == "MIN":
    a, b = map(int, args.split())
    expected = str(min(a, b))
elif problem_type == "SUM":
    expected = str(sum(map(int, args.split())))
elif problem_type == "REVERSE":
    expected = " ".join(reversed(args.split()))
elif problem_type == "UNIQUE":
    seen = []
    for n in args.split():
        if n not in seen:
            seen.append(n)
    expected = " ".join(seen)
elif problem_type == "SORT":
    expected = " ".join(map(str, sorted(map(int, args.split()))))

verdict = "passed" if raw_output == expected else "failed"

init = {
    "problemType": problem_type,
    "inputData":   args,
    "obstacleX":   0.5,
}

frames = []

for i in range(7):
    frames.append({"cameleonX": round(0.05 + i * 0.05, 2), "cameleonY": 0.0, "event": "walk"})

if verdict == "passed":
    frames.append({"cameleonX": 0.40, "cameleonY":  0.0,  "event": "walk"})
    frames.append({"cameleonX": 0.44, "cameleonY":  0.0,  "event": "walk"})
    frames.append({"cameleonX": 0.47, "cameleonY":  0.0,  "event": "walk"})
    # Arc en sinus : y = -0.80 * sin(pi * t) pour t dans [1/6 .. 5/6]
    frames.append({"cameleonX": 0.49, "cameleonY": -0.40, "event": "jump"})
    frames.append({"cameleonX": 0.52, "cameleonY": -0.69, "event": "jump"})
    frames.append({"cameleonX": 0.55, "cameleonY": -0.80, "event": "jump"})
    frames.append({"cameleonX": 0.58, "cameleonY": -0.69, "event": "jump"})
    frames.append({"cameleonX": 0.61, "cameleonY": -0.40, "event": "jump"})
    frames.append({"cameleonX": 0.63, "cameleonY":  0.0,  "event": "land"})
    for i in range(7):
        frames.append({"cameleonX": round(0.65 + i * 0.045, 2), "cameleonY": 0.0, "event": "walk"})
    frames.append({"cameleonX": 0.97, "cameleonY": 0.0, "event": "goal"})
else:
    frames.append({"cameleonX": 0.42, "cameleonY":  0.0,  "event": "hit"})
    frames.append({"cameleonX": 0.36, "cameleonY": -0.2,  "event": "fall"})
    frames.append({"cameleonX": 0.32, "cameleonY":  0.0,  "event": "dead"})

print(json.dumps({
    "verdict": verdict,
    "score": 100 if verdict == "passed" else 0,
    "replay": {"init": init, "frames": frames},
}))
