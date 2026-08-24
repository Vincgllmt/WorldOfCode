# Priorités — Purple IPTV

> **Ce fichier vous appartient.** L'usine (`factory/start_factory.sh`) traite les
> tâches **dans l'ordre où elles apparaissent ici** : réordonner les lignes est
> l'acte de repriorisation. Une ligne cochée `[x]` est livrée et ignorée.
>
> `factory/sync_gitlab.sh` fusionne — il ajoute et retire, il ne réordonne
> jamais. Vous pouvez donc éditer librement.

## File active

- [x] #1 — core : extraire les décisions de DownloadRepository en objet pur et les couvrir de tests
      https://rendu-git.etna-alternance.net/module-10020/activity-53631/group-1056963/-/work_items/1
      labels: ai-factory
      ## Contexte
      
      `CLAUDE.md` §6 liste `DownloadRepository` comme **sans aucune couverture de test**.
      Or il porte plusieurs décisions métier qui ne sont vérifiées nulle part, dans
      `core/src/main/kotlin/com/purple/iptvplayer/core/data/DownloadRepository.kt`.
      
      Le projet a une règle pour exactement ce cas (§4) :
      
      > On ne teste pas un Repository à travers Android ; on extrait sa décision en
      > objet pur et on teste celui-ci.
      
      C'est le motif déjà appliqué à `TrialPolicy`, `CachePolicy`, `RecentPolicy`,
      `AccessState` et `RecentItemsCodec`.
      
      ## Demande
      
      Extraire les décisions de `DownloadRepository` dans un objet pur — sans aucune
      dépendance à Android — et le couvrir de tests JVM.
      
      Au moins ces deux règles, qui sont aujourd'hui noyées dans le Repository :
      
      1. **Reprise après redémarrage** (bloc `init`) : un téléchargement laissé en
         `DOWNLOADING` par une session précédente est remis en `QUEUED`, avec
         `downloadedBytes` remis à zéro. Un processus tué en cours de route ne doit
         pas laisser une entrée définitivement bloquée.
      2. **Idempotence de `enqueue`** : ré-empiler un identifiant déjà présent est
         sans effet, **sauf** si l'entrée existante est en `FAILED` — auquel cas elle
         est remplacée et repart en `QUEUED`.
      
      ## Critères d'acceptation
      
      - [ ] Un objet pur (ex. `DownloadPolicy`) dans `core/.../core/data/`, sans
            import `android.*`.
      - [ ] `DownloadRepository` appelle cet objet au lieu de porter les règles en
            ligne. Comportement inchangé — c'est un refactoring, pas un changement.
      - [ ] Un `DownloadPolicyTest.kt` dans
            `core/src/test/kotlin/com/purple/iptvplayer/core/data/`, couvrant les deux
            règles ci-dessus **et** leurs cas limites (liste vide, entrée absente,
            statuts autres que `DOWNLOADING`/`FAILED`).
      - [ ] `./gradlew :core:testDebugUnitTest` au vert.
      
      ## Hors périmètre
      
      - La logique de téléchargement réseau (`drain`, OkHttp, écriture sur disque).
      - `PlayerService`, listé au même endroit mais qui fera l'objet d'un autre ticket.
      - Toute modification de `app-mobile` ou `app-tv`.

## Bloqué
