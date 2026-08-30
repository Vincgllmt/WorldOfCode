#!/usr/bin/env python3
"""Encode un fichier DataStore Preferences (.preferences_pb) minimal.

Schema (androidx.datastore.preferences.protobuf) :
  PreferenceMap { map<string, Value> preferences = 1; }
  Value { bool boolean=1; float float=2; int32 integer=3; int64 long=4;
          string string=5; StringSet string_set=6; double double=7; bytes bytes=8; }

Un map<K,V> est encode comme une suite de messages { key=1, value=2 }.
"""
import sys, base64

def varint(n):
    out = b""
    while True:
        b = n & 0x7F
        n >>= 7
        out += bytes([b | (0x80 if n else 0)])
        if not n:
            return out

def tag(field, wire):  return varint((field << 3) | wire)
def ld(field, payload): return tag(field, 2) + varint(len(payload)) + payload

def value_long(v):  return tag(4, 0) + varint(v)
def value_bool(v):  return tag(1, 0) + varint(1 if v else 0)
def value_str(v):   return ld(5, v.encode())

def entry(key, value_payload):
    return ld(1, ld(1, key.encode()) + ld(2, value_payload))

_ENCODERS = {"long": value_long, "bool": value_bool, "string": value_str}

def build(pairs):
    out = b""
    for k, kind, v in pairs:
        out += entry(k, _ENCODERS[kind](v))
    return out


def recents(items):
    """Blob `watch_progress` : la vitrine « Reprendre la lecture » et ses positions.

    [items] est une liste de dicts au format de `RecentItemsCodec` ; chaque entrée
    reçoit aussi ses clés `progress_<id>` / `duration_<id>`, sans quoi la vitrine
    afficherait une barre pleine et la reprise repartirait de zéro.
    """
    import json
    pairs = [("recent_items_json", "string", json.dumps(items, ensure_ascii=False))]
    for it in items:
        pairs.append((f"progress_{it['id']}", "long", int(it["progress"])))
        pairs.append((f"duration_{it['id']}", "long", int(it["duration"])))
    return build(pairs)

if __name__ == "__main__":
    import time

    # `mkprefs.py recents [n]` → blob watch_progress avec n entrées de démonstration.
    if len(sys.argv) > 1 and sys.argv[1] == "recents":
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 3
        now = int(time.time() * 1000)
        demo = []
        for i in range(n):
            serie = (i % 3 == 2)
            demo.append({
                "id":        (f"90{i}_1{i}" if serie else f"80{i}"),
                "url":       f"http://127.0.0.1:1/v{i}.mkv",
                "title":     (f"Série de test {i}" if serie else f"Film de test {i}"),
                "cover":     "",
                "type":      ("series" if serie else "movie"),
                "progress":  600_000 + i * 60_000,
                "duration":  5_400_000,
                "timestamp": now - i * 3_600_000,
            })
        sys.stdout.write(base64.b64encode(recents(demo)).decode())
        raise SystemExit(0)

    # essai demarre il y a N jours (defaut 10 -> largement expire, essai = 3 jours)
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    started = int(time.time() * 1000) - days * 86_400_000
    blob = build([("trial_start_date", "long", started)])
    sys.stdout.write(base64.b64encode(blob).decode())
