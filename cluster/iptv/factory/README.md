# Usine logicielle locale — Purple IPTV

Pas de framework, pas d'appel API. Des scripts Bash qui pilotent des
sous-sessions `claude -p` sur votre abonnement Pro, à partir des issues GitLab
qui vous sont assignées.

```
  glab ──► USER_PRIORITIES.md ──► start_factory.sh
                                        │
                                        ├─ branche ai/issue-N-slug
                                        ├─ claude -p  (worker éphémère)
                                        ├─ ./gradlew  ◄── relancé PAR L'ORCHESTRATEUR
                                        ├─ contrôle d'intégrité de la suite
                                        └─ commit ─► push ─► glab mr create ─► note
```

## Mise en route

```bash
cd cluster/iptv/factory
./install_jdk.sh          # JDK 17 durable, sans sudo (une fois)
./sync_gitlab.sh          # remplit ../USER_PRIORITIES.md
./start_factory.sh --once # une tâche, pour voir
./start_factory.sh        # jusqu'à vider la file
touch state/STOP          # arrêt propre en fin de tâche courante
```

Prérequis : `glab` authentifié (`glab auth login --hostname rendu-git.etna-alternance.net`),
`jq`, et la branche `iptv` sortie.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `install_jdk.sh` | JDK 17 Temurin dans `~/.local/share/purple-factory/jdk-17`. |
| `sync_gitlab.sh` | **Étape 1** — `glab` → `USER_PRIORITIES.md`, par **fusion**. |
| `start_factory.sh` | **Étape 2** — l'orchestrateur. |
| `prompts/worker.md` | **Étape 3** — la consigne initiale du worker éphémère. |
| `prompts/retry.md` | La consigne de rattrapage, avec la sortie Gradle. |
| `lib/common.sh` | Journalisation, verrou, JDK, pré-vol, Gradle, empreintes. |
| `lib/queue.sh` | Lecture/écriture de `USER_PRIORITIES.md`. |
| `lib/gitops.sh` | **Étape 4** — branche, commit, push, MR, commentaire. |
| `state/` | Journaux, verrou, sessions. Gitignoré. |

## `USER_PRIORITIES.md` vous appartient

Grammaire volontairement minimale :

```markdown
- [ ] #12 — Corriger le focus D-pad sur la fiche série
      https://rendu-git…/-/issues/12
      Le focus s'échappe vers le rail en fin de liste.
```

**L'ordre du fichier est l'ordre de traitement.** Réordonner les lignes à la
main est donc l'acte de repriorisation — c'est tout l'intérêt du nom. `[x]` =
livré, ignoré. La section `## Bloqué` n'est jamais reprise automatiquement.

`sync_gitlab.sh` **fusionne** : il ajoute les nouvelles issues en fin de file,
retire celles qui ont été fermées, et ne touche ni à votre ordre, ni aux cases,
ni à la section bloquée. Un `sync` qui écrase ferait de ce fichier un simple
miroir de GitLab, donc un fichier inutile.

## Les trois principes de l'orchestrateur

**1. On ne croit jamais le worker sur parole.** Il annonce `statut: VERT` ;
l'orchestrateur relance Gradle lui-même, et c'est ce verdict-là qui décide. Un
test qui ne peut pas échouer ne prouve rien (`CLAUDE.md` §8.3).

**2. Le rattrapage reprend la session, il ne repart pas à froid.**
`claude -p --output-format json` rend un `session_id` ; les tentatives 2 et 3
l'utilisent avec `--resume`. L'agent sait déjà ce qu'il a essayé — le lui faire
redécouvrir coûte du quota pour rien. La tentative 4 repart d'une session
**neuve** : si l'agent s'est enfermé dans une impasse, lui redonner son propre
contexte l'y maintient.

**3. L'échec est un état de sortie, pas une boucle.**

## L'échelle de rattrapage

| Situation | Réponse |
|---|---|
| Build rouge, tentatives 1→2 | `--resume` + sortie Gradle condensée |
| Tentative 3 | `--resume` une dernière fois |
| Tentative 4 | session **neuve et froide** |
| Toujours rouge | **quarantaine** |
| `timeout` mural dépassé | worker tué, compte pour une tentative |
| Quota Pro épuisé | **pas un échec** : sommeil par tranches de 30 min, reprise sans consommer de tentative |
| Panne d'environnement | arrêt total avant tout appel — **aucun jeton brûlé** |

**Quarantaine** : la branche est poussée, une MR **brouillon** est ouverte, le
ticket reçoit une note, et la tâche passe en `## Bloqué`. Rien n'est perdu, rien
n'est répété à l'infini.

## Le garde-fou anti-triche

C'est le vrai risque du dispositif. Un agent à qui l'on dit « corrige-toi
jusqu'au vert » et qui reste coincé finira par **affaiblir le test** : le
commenter, l'annoter `@Ignore`, le supprimer. Le build passe, l'usine ouvre une
MR, et la couverture recule sans que personne ne le voie.

L'empreinte de la suite est donc relevée avant et après :

- aucun fichier `*Test.kt` ne doit disparaître ;
- le nombre total de `@Test` ne doit pas baisser ;
- aucun `@Ignore` ne doit apparaître dans le diff.

Si l'un des trois tombe, le travail est **annulé sans nouvelle tentative** et le
ticket commenté. Ce n'est pas un échec à réessayer : c'est une régression
déguisée en succès, et la réessayer ne fait que la répéter.

La consigne du worker le lui dit explicitement, et lui dit aussi que **rendre un
échec honnête est un résultat acceptable**.

## Séparation des rôles

Le worker code et teste. Il **ne touche pas à git** — `--disallowedTools` lui
refuse `git commit`, `push`, `checkout`, `branch`, `add`, `reset` et `glab`.
L'orchestrateur seul écrit dans git. C'est ce qui garantit que le lien de MR
posté sur le ticket désigne le travail réellement validé par Gradle.

Le worker n'a pas non plus accès à `client/` (Flutter legacy), ni à
`local.properties`, ni à `keystore.properties`.

## Deux garde-fous hérités du projet

**Arbre propre exigé.** L'usine prend le contrôle de l'arbre de travail ; du
travail humain en cours serait happé dans sa MR et attribué à un agent. Le
pré-vol refuse de démarrer sur un arbre sale, sans option pour passer outre —
partager l'arbre n'a pas de version sûre.

**Jamais `git add -A`.** `native/build/reports/configuration-cache/` est encore
suivi par git (21 fichiers, reliquat du nettoyage §31 : le `.gitignore` couvre
`native/*/build/` mais pas `native/build/`). Un ajout global transformerait une
correction de trois lignes en diff de milliers de fichiers. `gitops_changed_files`
filtre `/build/`, `/.gradle/`, `/.kotlin/` et les fichiers de secrets, et le
commit ne porte que sur des chemins explicites.

## Réglages

| Variable | Défaut | Effet |
|---|---|---|
| `FACTORY_BRANCH` | `iptv` | Branche cible. ⚠️ Sur `dev` et `main`, `cluster/iptv/` est gitignoré. |
| `FACTORY_LABEL` | *(vide)* | Ne synchroniser que ce label. |
| `FACTORY_MAX_ATTEMPTS` | `4` | Tentatives avant quarantaine. |
| `FACTORY_WORKER_TIMEOUT` | `3600` | Borne murale du worker (`claude` n'a pas de `--max-turns`). |
| `FACTORY_COOLDOWN` | `60` | Pause entre deux tâches. |
| `FACTORY_QUOTA_SLICE` | `1800` | Tranche de sommeil sur quota. |
| `FACTORY_GRADLE_TASKS` | `:core:testDebugUnitTest :app-tv:testDebugUnitTest` | Le juge de paix. |
| `FACTORY_MODEL` | *(défaut CLI)* | Modèle du worker. |
| `FACTORY_EFFORT` | *(défaut CLI)* | `low`…`max`. Baisser réduit le coût **et** la qualité. |

## Coût et optimisation

Mesuré sur une issue de refactoring bien bornée : **1,90 $** et 8 min 24 pour un
cycle complet (27 tours de worker).

L'optimisation la plus rentable est déjà faite, et elle est contre-intuitive :
**`CLAUDE.md` est chargé automatiquement** dans la session du worker (vérifié —
avec tous les outils désactivés, le modèle en cite le contenu). Lui demander de
le lire provoquait donc un appel d'outil inutile *et* dupliquait ~10 k jetons
déjà présents. La consigne le lui dit maintenant explicitement.

`docs/JOURNAL.md` (226 Ko), lui, n'est **pas** chargé : le worker n'en ouvre que
la section indexée au §9 qui concerne son sujet.

## Ce que l'usine ne fait pas

- **Elle ne fusionne pas** et **ne clôture pas les tickets** : c'est la fusion
  qui ferme, pas la proposition.
- **Elle ne vérifie rien à l'écran.** Les tests JVM ne disent rien du focus
  D-pad ni du rendu Compose (`CLAUDE.md` §8.14) : tout défaut TV reste à
  vérifier sur l'AVD `purple_tv`.
- **Elle ne travaille pas sur `client/`** (Flutter legacy).
