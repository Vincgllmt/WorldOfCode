#!/usr/bin/env python3
"""Contrôle de parité et de codage en dur des libellés — §17, §45, §48, §65.

Quatre passes, chacune née d'un défaut réellement livré :

1. **Parité `<string>`** — la campagne du §17. Une clé présente d'un seul côté donne un
   écran mi-français mi-anglais.
2. **Parité `<plurals>`** — ajoutée en §48 : le contrôle d'origine ne les voyait pas, et
   `« 3 day(s) remaining »` contournait le pluriel au lieu de le résoudre.
3. **Littéraux passés en libellé nommé** — ajoutée en §45. La détection d'origine cherchait
   des caractères **accentués** ; « Petit », « Moyen », « Grand », « Blanc », « Jaune »
   n'en portent aucun et sont restés en français dans une interface anglaise des mois.
4. **Littéraux rendus depuis le code** — ajoutée en §65, après **#R8**. Les trois premières
   passes ne regardent que les paramètres *nommés* (`label = "…"`). Elles étaient donc
   aveugles aux deux formes qui ont réellement livré le défaut :
   `Text("Network error…")` en argument positionnel, et l'arme de `when`
   `ContentFailure.NETWORK -> "Network error…"`. C'est la **deuxième** fois qu'un libellé
   échappe au contrôle en vivant dans du Kotlin (cf. §17) ; la passe ferme les deux formes.

Usage : python3 tools/check_strings.py [racine]   (défaut : native/)
Sortie : 0 si la parité est bonne, 1 sinon. **Les littéraux sont des avertissements** :
certains sont légitimes (marque, glyphes, unités), c'est à la lecture de trancher.
"""
import os
import re
import sys

MODULES = ("app-tv", "app-mobile", "core")
LABEL_PARAMS = ("label", "name", "title", "text", "hint", "message")

# Passe 4. Deux formes, celles par lesquelles #R8 est passé.
#   a) littéral en 1er argument positionnel d'un composable qui rend du texte
#   b) arme de `when` renvoyant une phrase — au moins deux lettres et une espace,
#      ce qui écarte les clés techniques ("movie", "vod") sans écarter « Direct TV ».
RENDERED = (
    re.compile(r'\b(?:Basic)?Text\s*\(\s*"([^"$]{3,})"'),
    re.compile(r'->\s*"([^"$]*[A-Za-zÀ-ÿ]{2,}[^"$]* [^"$]*)"'),
)


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


def kotlin_lines(root, module):
    """Chaque ligne de Kotlin du module, hors lignes déjà passées en ressource."""
    base = f"{root}/{module}/src/main/kotlin"
    for dirpath, _, files in os.walk(base):
        for f in sorted(files):
            if not f.endswith(".kt"):
                continue
            p = os.path.join(dirpath, f)
            for n, line in enumerate(open(p, encoding="utf-8"), 1):
                if "stringResource" in line or "contentDescription" in line:
                    continue
                yield os.path.relpath(p, root), n, line


def check_literals(root, module):
    """Signale tout littéral passé en paramètre de libellé, accentué ou non."""
    pattern = re.compile(rf'\b({"|".join(LABEL_PARAMS)})\s*=\s*"([^"$]{{3,}})"')
    problems = []
    for rel, n, line in kotlin_lines(root, module):
        m = pattern.search(line)
        if m:
            problems.append(f'{rel}:{n}: littéral en {m.group(1)} = "{m.group(2)}"')
    return problems


def check_rendered(root, module):
    """Signale un littéral rendu par un composable ou renvoyé par une arme de `when`."""
    problems = []
    for rel, n, line in kotlin_lines(root, module):
        for pattern in RENDERED:
            m = pattern.search(line)
            if m:
                problems.append(f'{rel}:{n}: littéral rendu = "{m.group(1)}"')
                break
    return problems


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else "native"
    problems = []

    print("Parité des ressources :")
    for module in ("app-tv", "app-mobile"):
        problems += check_parity(root, module, "string", "strings.xml")
        problems += check_parity(root, module, "plurals", "plurals.xml")

    for titre, passe in (("Libellés codés en dur :", check_literals),
                         ("Libellés rendus depuis le code :", check_rendered)):
        print(f"\n{titre}")
        found = []
        for module in MODULES:
            found += passe(root, module)
        for l in found:
            print(f"  ⚠️  {l}")
        if not found:
            print("  aucun  ✓")

    if problems:
        print("\nDéfauts de parité :")
        for p in problems:
            print(f"  ✗ {p}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
