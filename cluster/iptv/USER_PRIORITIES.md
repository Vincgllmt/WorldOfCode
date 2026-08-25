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

- [x] #2 — core : rendre testable la construction de la liste de pistes de PlayerService
      https://rendu-git.etna-alternance.net/module-10020/activity-53631/group-1056963/-/work_items/2
      labels: ai-factory
      ## Contexte
      
      `CLAUDE.md` §6 liste `PlayerService` comme **sans aucune couverture**. La classe est pourtant déjà bien factorisée : `PlayerStatusPolicy`, `VersionPolicy` et `TrackPolicy` en sont sortis et sont testés.
      
      Il reste **une** décision non couverte, dans `refreshTracks()` : la construction de la liste de pistes à partir des `Tracks` de Media3. Elle est aujourd'hui inextricable du type Android, donc intestable en JVM.
      
      ## Demande
      
      Extraire **uniquement** cette décision, selon le motif habituel du projet (§4) :
      
      1. Un descripteur neutre (ex. `RawTrack`) — index de groupe, index de piste, type audio/texte, langue, libellé, drapeau « forcé », pris en charge, sélectionné. Aucun type `androidx.media3`.
      2. Un objet pur (ex. `TrackListBuilder`) qui prend une `List<RawTrack>` et rend les listes audio et texte de `TrackInfo`, plus la piste audio et la piste texte actuellement sélectionnées.
      3. `PlayerService.refreshTracks()` se réduit à convertir `Tracks` en `RawTrack`, puis à appeler l'objet pur et à alimenter les `StateFlow` comme aujourd'hui.
      
      ## Critères d'acceptation
      
      - [ ] L'objet pur n'importe **rien** de `androidx.*` ni de `android.*`.
      - [ ] Comportement identique : identifiants `"groupe:piste"`, groupes autres qu'audio/texte ignorés, ordre des pistes conservé.
      - [ ] `VersionPolicy.availableModes` et `VersionPolicy.detect` continuent d'être alimentés exactement par les mêmes valeurs.
      - [ ] Un test JVM couvrant : liste vide ; un groupe audio seul ; audio et texte ; un groupe d'un autre type ignoré ; piste forcée correctement marquée ; piste non prise en charge conservée dans la liste mais marquée ; détection de la piste sélectionnée quand il y en a une, et `null` sinon.
      - [ ] `./gradlew :core:testDebugUnitTest :app-tv:testDebugUnitTest` au vert.
      
      ## Hors périmètre
      
      - Toute autre partie de `PlayerService` (lecture, seek, playlist, progression).
      - `TrackPolicy`, `VersionPolicy`, `PlayerStatusPolicy` : déjà extraits et testés, ne pas y toucher.
      - L'UI des deux applications.

- [x] #3 — app-tv : le focus est invisible dans Téléchargements et Connexion (ordre des modificateurs)
      https://rendu-git.etna-alternance.net/module-10020/activity-53631/group-1056963/-/work_items/3
      labels: ai-factory
      ## Symptôme
      
      Sur l'app TV, dans **Téléchargements** et dans l'écran de **connexion**, on ne voit pas ce qui est sélectionné : aucune carte ne s'éclaire quand on la parcourt à la télécommande. Le focus existe — les touches agissent — mais rien ne le montre à l'écran.
      
      ## Cause racine (établie, pas supposée)
      
      L'ordre des modificateurs Compose est inversé. Un `FocusEventModifierNode` n'observe que les cibles de focus placées **après** lui :
      
      ```kotlin
      .focusable()
      .onFocusChanged { isFocused = it.isFocused }   // ← jamais appelé
      ```
      
      `isFocused` reste donc faux en permanence, et le fond, la bordure et le liseré ne changent jamais.
      
      C'est **exactement** le piège du §49.2, déjà rencontré quatre fois. `TvPurchaseScreen.kt:218` porte d'ailleurs l'avertissement écrit après la dernière occurrence — la règle est connue, elle a juste été appliquée à un endroit et pas aux autres.
      
      ## Occurrences (6)
      
      - `app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/downloads/TvDownloadsScreen.kt:321`
      - `…/downloads/TvDownloadsScreen.kt:372`
      - `…/downloads/TvDownloadsScreen.kt:411`
      - `…/downloads/TvDownloadsScreen.kt:449`
      - `app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/setup/TvSetupScreen.kt:312`
      - `…/setup/TvSetupScreen.kt:465`
      
      Référence de l'ordre correct : `…/purchase/TvPurchaseScreen.kt:218-224`.
      
      ## Critères d'acceptation
      
      - [ ] Dans les 6 occurrences, `onFocusChanged` précède `focusable()`.
      - [ ] Aucun autre changement de comportement : c'est une correction d'ordre, pas une refonte.
      - [ ] **Un test instrumenté** dans `app-tv/src/androidTest/` qui échouerait aujourd'hui : il compose un élément avec l'ordre correct, lui donne le focus, et vérifie que l'état `isFocused` bascule bien à vrai. Le test doit décrire le symptôme — « l'élément focalisé doit se signaler » — et non l'implémentation.
      - [ ] `./gradlew :core:testDebugUnitTest :app-tv:testDebugUnitTest` au vert.
      - [ ] `./gradlew :app-tv:connectedDebugAndroidTest` au vert sur l'AVD `purple_tv`.
      
      ## Notes
      
      Ce défaut est **invisible aux tests JVM** : il ne se voit que sur un rendu réel. L'outillage instrumenté a été mis en place pour ce genre de cas — voir `app-tv/src/androidTest/…/TvFocusInstrumentedTest.kt`.
      
      ⚠️ L'émulateur doit être lancé en `-gpu swiftshader_indirect` : `-gpu host` est refusé sous Wayland et l'app ne dessine alors rien.

## Bloqué
