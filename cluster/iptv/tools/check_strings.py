#!/usr/bin/env python3
"""Contrôle de parité et de codage en dur des libellés — §17, §45, §48.

Trois passes, chacune née d'un défaut réellement livré :

1. **Parité `<string>`** — la campagne du §17. Une clé présente d'un seul côté donne un
   écran mi-français mi-anglais.
2. **Parité `<plurals>`** — ajoutée en §48 : le contrôle d'origine ne les voyait pas, et
   `« 3 day(s) remaining »` contournait le pluriel au lieu de le résoudre.
3. **Littéraux passés en libellé** — ajoutée en §45. La détection d'origine cherchait des
   caractères **accentués** ; « Petit », « Moyen », « Grand », « Blanc », « Jaune » n'en
   portent aucun et sont restés en français dans une interface anglaise pendant des mois.

Usage : python3 tools/check_strings.py [racine]   (défaut : native/)
Sortie : 0 si tout est propre, 1 sinon.
"""
import os
import re
import sys

MODULES = ("app-tv", "app-mobile", "core")
LABEL_PARAMS = ("label", "name", "title", "text", "hint", "message")


def keys(path, tag):
    if not os.path.exists(path):
        return set()
    return set(re.findall(rf'<{tag} name="([^"]+)"', open(path, encoding="utf-8").read()))


def check_parity(root, module, tag, filename):
    en = keys(f"{root}/{module}/src/main/res/values/{filename}", tag)
    fr = keys(f"{root}/{module}/src/main/res/values-fr/{filename}", tag)
    if not en and not fr:
        return []
    problems = []
    for k in sorted(en - fr):
        problems.append(f"{module}: <{tag}> '{k}' absent de values-fr/")
    for k in sorted(fr - en):
        problems.append(f"{module}: <{tag}> '{k}' absent de values/")
    if not problems:
        print(f"  {module:11s} {tag:8s} {len(en):3d}/{len(fr):3d}  ✓")
    return problems


def check_literals(root, module):
    """Signale tout littéral passé en paramètre de libellé, accentué ou non."""
    pattern = re.compile(
        rf'\b({"|".join(LABEL_PARAMS)})\s*=\s*"([^"$]{{3,}})"'
    )
    problems = []
    base = f"{root}/{module}/src/main/kotlin"
    for dirpath, _, files in os.walk(base):
        for f in files:
            if not f.endswith(".kt"):
                continue
            p = os.path.join(dirpath, f)
            for n, line in enumerate(open(p, encoding="utf-8"), 1):
                if "stringResource" in line or "contentDescription" in line:
                    continue
                m = pattern.search(line)
                if m:
                    rel = os.path.relpath(p, root)
                    problems.append(f'{rel}:{n}: littéral en {m.group(1)} = "{m.group(2)}"')
    return problems


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else "native"
    problems = []

    print("Parité des ressources :")
    for module in ("app-tv", "app-mobile"):
        problems += check_parity(root, module, "string", "strings.xml")
        problems += check_parity(root, module, "plurals", "plurals.xml")

    print("\nLibellés codés en dur :")
    literals = []
    for module in MODULES:
        literals += check_literals(root, module)
    if literals:
        for l in literals:
            print(f"  ⚠️  {l}")
    else:
        print("  aucun  ✓")

    if problems:
        print("\nDéfauts de parité :")
        for p in problems:
            print(f"  ✗ {p}")
    # Les littéraux sont un avertissement : certains sont légitimes (glyphes, unités).
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
