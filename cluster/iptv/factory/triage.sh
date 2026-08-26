#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Tri des tickets d'audit — décider quoi traiter, et dans quel ordre.
#
#  L'audit produit plus de tickets que l'usine ne peut raisonnablement en
#  traiter. Tout corriger n'est pas un objectif : une MR par libellé mal
#  accordé noie les MR qui corrigent un crash.
#
#  Ce script ne décide rien. Il présente, et il écrit l'ordre retenu dans
#  USER_PRIORITIES.md — que vous restez libre de réordonner à la main.
#
#  Usage :
#    ./triage.sh                 # tableau par gravité et périmètre
#    ./triage.sh --plan MAJEUR   # met les MAJEUR en file, dans cet ordre
#    ./triage.sh --plan CRITIQUE,MAJEUR
# ---------------------------------------------------------------------------
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
source "$FACTORY_DIR/lib/queue.sh"

PLAN=""
[ "${1:-}" = "--plan" ] && PLAN="${2:-MAJEUR}"

command -v glab >/dev/null 2>&1 || die "glab introuvable."
brut="$STATE_DIR/triage.json"
glab issue list --opened -P 200 --output json > "$brut" 2>/dev/null \
  || die "Impossible de lister les issues."

# La gravité et le périmètre sont dans la description, posés par audit.sh sous
# la forme « Gravité annoncée : **MAJEUR** » et « périmètre `app-tv/home` ».
python3 - "$brut" "${PLAN}" <<'PY'
import json, re, sys, collections

issues = json.load(open(sys.argv[1], encoding="utf-8"))
plan = [g.strip().upper() for g in sys.argv[2].split(",") if g.strip()]

RANG = {"CRITIQUE": 0, "MAJEUR": 1, "MINEUR": 2, "?": 3}
lignes = []
for i in issues:
    d = i.get("description") or ""
    g = (re.search(r"Gravité annoncée\s*:\s*\*\*(\w+)\*\*", d) or [None, "?"])[1]
    p = (re.search(r"périmètre\s*`([^`]+)`", d) or [None, "—"])[1]
    lignes.append({"iid": i["iid"], "titre": i["title"], "gravite": g, "perimetre": p})

lignes.sort(key=lambda x: (RANG.get(x["gravite"], 3), x["perimetre"], x["iid"]))

if not plan:
    par_g = collections.Counter(l["gravite"] for l in lignes)
    par_p = collections.Counter(l["perimetre"] for l in lignes)
    print(f"\n  {len(lignes)} ticket(s) ouvert(s)\n")
    print("  Par gravité")
    for g in ("CRITIQUE", "MAJEUR", "MINEUR", "?"):
        if par_g.get(g):
            print(f"    {g:9s} {par_g[g]:3d}")
    print("\n  Par périmètre")
    for p, n in sorted(par_p.items(), key=lambda x: -x[1]):
        print(f"    {p:22s} {n:3d}")
    print("\n  Détail\n")
    courant = None
    for l in lignes:
        if l["gravite"] != courant:
            courant = l["gravite"]
            print(f"  ── {courant} " + "─" * (60 - len(courant)))
        print(f"    #{l['iid']:<4} [{l['perimetre']:20s}] {l['titre'][:70]}")
    print("\n  Pour mettre les majeurs en file :  ./triage.sh --plan MAJEUR\n")
    raise SystemExit

retenus = [l for l in lignes if l["gravite"] in plan]
print(f"RETENUS {len(retenus)}")
for l in retenus:
    print(f"{l['iid']}\t{l['titre']}")
PY

[ -z "$PLAN" ] && exit 0

# --- Écriture de la file --------------------------------------------------
retenus="$(python3 - "$brut" "$PLAN" <<'PY'
import json, re, sys
issues = json.load(open(sys.argv[1], encoding="utf-8"))
plan = [g.strip().upper() for g in sys.argv[2].split(",")]
RANG = {"CRITIQUE": 0, "MAJEUR": 1, "MINEUR": 2, "?": 3}
out = []
for i in issues:
    d = i.get("description") or ""
    g = (re.search(r"Gravité annoncée\s*:\s*\*\*(\w+)\*\*", d) or [None, "?"])[1]
    p = (re.search(r"périmètre\s*`([^`]+)`", d) or [None, "—"])[1]
    if g in plan:
        out.append((RANG.get(g, 3), p, i["iid"], i["title"]))
out.sort()
for _, _, iid, t in out:
    print(f"- [ ] #{iid} — {t}")
PY
)"
n="$(wc -l <<< "$retenus")"

# On réécrit la file active, on ne touche NI aux tâches cochées, NI à la
# section bloquée : c'est l'historique de ce qui a été livré et de ce qui a
# résisté, il ne se réordonne pas.
tmp="$(mktemp)"
awk -v bloc="$retenus" '
  /^##[[:space:]]*File active/ { print; print ""; print bloc; print ""; dans=1; next }
  /^##[[:space:]]/             { dans=0 }
  dans && /^[[:space:]]*-[[:space:]]*\[[[:space:]]\]/ { next }
  dans && /^[[:space:]]+[^[:space:]]/                 { next }
  { print }
' "$PRIORITIES_FILE" > "$tmp" && mv "$tmp" "$PRIORITIES_FILE"

log_ok "$n ticket(s) mis en file ($PLAN). Réordonnez à la main si besoin, puis :"
log    "  ./start_factory.sh          # jusqu'à vider la file"
