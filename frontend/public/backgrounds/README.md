# Fonds de bandeaux de niveau

Les assets finis (produits **hors app**) se déposent ici, un fichier par palier.

## Convention de nommage

```
niveau-01.riv   niveau-02.webm   niveau-10.png   ...
```

- Numéro de palier sur **2 chiffres** (tri propre).
- Extension libre : `.riv` (animé/interactif), `.webm`/`.mp4` (vidéo), ou
  `.png`/`.jpg`/`.webp`/`.svg` (image). Le type de rendu est déduit de
  l'extension par `backgroundKind()`.

## Pour activer un fond

1. Déposer le fichier ici (ex: `niveau-10.riv`).
2. Renseigner `file: 'niveau-10.riv'` dans
   `src/lib/level-backgrounds.ts` pour le palier concerné.

Tant qu'aucun `file` n'est renseigné, le **dégradé de secours** du mapping est
affiché — il n'y a jamais de bandeau vide.

Aucune modification du composant `LevelBackground` n'est nécessaire.
