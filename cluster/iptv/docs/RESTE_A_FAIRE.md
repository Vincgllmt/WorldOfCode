# Reste à faire, et dette connue — Purple IPTV

> Sorti de `CLAUDE.md` le 2026-08-27, qui n'en garde qu'un renvoi : ce fichier
> n'est **pas** chargé automatiquement. La feuille de route des défauts est `audit.md` ; ce fichier porte
> ce qui n'en relève pas — facturation, sécurité, publication, dette.

---

## Reste à faire

Tout ce qui est fait est consigné dans le journal ; seuls les points **ouverts** figurent
ici.

#### Facturation

- [ ] Décider si l'on monte en `billing:9.x` — exige `minSdk 23` côté mobile (`app-mobile`
      est en 21, `app-tv` déjà en 23). La 8.0.0 en place satisfait l'échéance Play du
      31 août 2026 ; la prochaine migration sera exigée vers mi-2027. Cf. §12.
- [ ] **#R9 non vu à l'écran** *(2026-08-30, §67)* — les causes d'échec de facturation sont
      typées et traduites, mais l'écran d'achat n'a pas pu être atteint : l'émulateur AOSP
      TV n'a pas de Play Services (l'échec voulu s'y produirait), seulement la barrière ne
      s'ouvre qu'à la lecture et le catalogue ne charge pas d'ici (§8). Même blocage que
      **B1.5** ci-dessous ; à reprendre dans la même session, sur une build installée
      depuis Play.
- [ ] **B1.5 non observé** : impossible de provoquer un échec de facturation, Play Billing
      sert son cache local. À retenter autrement. Cf. §9.
- [ ] `deliverProduct()` code 30 et 365 jours en dur ; l'échéance réelle exige la Play
      Developer API, donc un serveur. Un abonnement résilié reste donc ouvert jusqu'à
      30 jours. Cf. §5 B1 et §32.

#### Dette et sécurité

- [ ] Trancher **S1** (validation TLS entièrement désactivée dans `buildTrustAllClient`) —
      décision produit, cf. §5 S1.
- [ ] Décider si l'on réécrit l'historique pour purger l'ancien mot de passe de signature
      (§31) — il est désormais **sans valeur**, et la réécriture impose un `push --force`
      sur un dépôt partagé.
- [ ] ⚠️ **Sauvegarder `upload-keystore.jks` hors machine** : il n'existe que sur la
      machine « rigolo ». Le perdre rend toute mise à jour impossible sans reset de clé
      auprès de Google. Plus urgent que la réécriture d'historique (§31).
- [ ] Trancher le sort du parc TV resté sur l'ancienne fiche `com.purple.iptvplayer`
      (build Flutter) : il ne recevra plus aucune mise à jour et ne migrera pas seul vers
      `com.purple.iptvplayer.tv`. Cf. §9.

#### À vérifier sur le Pixel 7 (niveau 3 non fait)

> Ces points sont **corrigés et vérifiés au niveau 1**, et pour certains au niveau 2 sur
> l'émulateur ; il leur manque le passage sur le téléphone, qui exige que l'utilisateur
> le branche. Les reprendre **ensemble** au prochain branchement — c'est une seule session
> d'install + scénarios, pas une par défaut.

- [ ] **#R8** — messages d'échec traduits *(2026-08-30, §66)*. Vérifié sur l'émulateur pour
      `app-tv` (`ContentFailure.NETWORK`, en fr **et** en en) et pour `app-mobile`
      (`SetupFailure.INVALID_INPUT`), l'APK mobile ayant été installé sur l'émulateur TV
      pour l'occasion. **Sur le Pixel, rien.** Scénario : vider le cache
      (`run-as … rm -rf cache/*`), `settings put global http_proxy 127.0.0.1:1`, ouvrir
      Films ou Séries → attendre « Erreur réseau. Vérifiez votre connexion. » Ne pas
      oublier `settings delete global http_proxy`.
- [ ] **#R8, armes non atteintes** — `NOT_FOUND`, `PARSE_ERROR` et `SetupFailure.NETWORK`
      n'ont été exercées sur aucun support. Même mécanisme que les trois armes vues, même
      passe de contrôle ; à confirmer si l'occasion se présente, sans construire un
      montage exprès.

#### Couverture

- [ ] `DownloadRepository` et `PlayerService` : aucune couverture.
- [ ] Tests instrumentés (Compose UI) : désormais possibles, un émulateur TV existe (§11).

#### Publication

- [ ] **Téléverser `app-mobile` 15 / 1.2.0** : l'AAB est produit et signé, les textes de
      « Nouveautés » sont prêts dans [`docs/RELEASE_NOTES.md`](docs/RELEASE_NOTES.md). Le
      téléversement est **manuel** (pas d'accès à la Play Developer API, §9). ⚠️ Passer par
      la **piste de test interne** avant la production : aucune build minifiée n'a été
      exercée, tout n'a été vérifié qu'en debug. Cf. §51.
- [ ] **`app-tv` n'est pas publiée sur le Play Store** : la build 11 / 1.3.0 n'existe qu'en
      chargement latéral. Tout le travail TV (deux panneaux, carte EPG, VF/VOSTFR, les
      correctifs de focus, les 28 défauts du D-pad, conservation d'état) n'est donc pas
      distribué. Cf. §41, §51.
- [ ] Réactiver `NullSafeMutableLiveData` dans `app-tv/build.gradle.kts` le jour où les
      versions de lint s'alignent (désactivé pour débloquer la release, §31).

#### Sorti de la liste — ne pas reproposer

- ~~Bouton de simulation de fin d'essai derrière `BuildConfig.DEBUG`~~ — **annulé par
  l'utilisateur le 2026-08-20.** Le besoin reste couvert hors UI par `mkprefs.py` +
  `run-as` (§3).
- ~~Cast d'une chaîne TV : son sans image~~ — **sorti par l'utilisateur le 2026-08-20.**
  Le récepteur est seul juge du format, la compatibilité n'est pas connaissable côté
  client (§34, §36).

---


## Dette connue, non bloquante

- ⚠️ **Les artefacts de build sont suivis par git** : `native/.gradle/`,
  `native/*/build/`, `native/.kotlin/`. Une simple exécution de `./gradlew` salit **279
  fichiers** (verrous, caches binaires, `classes.jar`), qui noient les vraies
  modifications dans `git status` et provoquent des conflits à chaque `pull`. Toute
  commande de commit doit viser les fichiers explicitement — **jamais `git add -A`**.
  À sortir du suivi (`git rm -r --cached`) et à ajouter au `.gitignore`.
- `client/current_build.dart` (Flutter, legacy) : fragment de code orphelin de
  733 lignes, non rattaché à `lib/`, qui produit à lui seul **611 des 717 erreurs**
  de `flutter analyze`. Rend toute barrière qualité impossible côté Flutter.
  À supprimer si l'on décide de maintenir `client/`.
- `client/lib/utils/text_utils.dart` · `decodeIfNeeded()` : détection base64 par
  heuristique, avec repli `latin1` qui n'échoue jamais. Corrompt des noms courants —
  vérifié : `"SPORTSHD"` → `"HóM!Ã"`, `"KIDSZONE"` → `"(ÒdãD"`, `"Aventure"` → `"÷§¶êÞ"`.
  Le `decodeIfNeeded` de `M3uParserService` (Kotlin) est sain, lui — pas de devinette
  base64 : ne pas « réaligner » le natif sur le Flutter. ⚠️ Attention à ne pas étendre
  ce constat à tout le natif : `XtreamApiClient.decodeBase64OrSelf` portait exactement
  le même défaut sur les libellés EPG (cf. §5 P5, corrigé).
- `BillingRepository.kt:50,53` : warnings d'opt-in `@ExperimentalCoroutinesApi`.
- `MainScreen.kt:163-181` : le bandeau n'est masqué que si `isPro`, c'est-à-dire pour le
  seul achat « à vie ». Un abonné **mensuel ou annuel** — donc payant — se voit annoncer
  « **Essai gratuit** : 30 jours restants. » avec un bouton « ACTIVER ». Formulation
  fausse pour un client à jour de paiement. Le correctif naturel est de tester
  `isPremium()` plutôt que `isPro`, mais **ne pas y toucher avant la vérification B1** :
  c'est précisément ce bandeau qui sert d'instrument de mesure pour B1.4 (cf. §9).

---
