# Règles pour les Tests Unitaires en PHP

Ce document définit les règles et bonnes pratiques à respecter pour écrire et maintenir les tests unitaires dans ce projet.

## 🎯 Objectifs
- Vérifier automatiquement le bon fonctionnement du code.
- Garantir la stabilité lors des évolutions et refactorings.
- Fournir une documentation vivante du comportement attendu des fonctions.

---

## 🛠️ Outils
- **WebTestCase** : outil symfony de tests unitaires.

## Lancer les tests

**Important** : les tests doivent être lancés **dans le conteneur Docker**, pas en local.

```bash
# Lancer tous les tests
docker compose exec backend bash -c "rm -rf var/cache/test var/test.db && php vendor/bin/phpunit tests/Service/ --testdox"

# Lancer un fichier de test spécifique
docker compose exec backend bash -c "rm -rf var/cache/test var/test.db && php vendor/bin/phpunit tests/Service/TechWatchControllerTest.php --testdox"
```

## Règles et bonne pratique

- On teste le plus de cas possible, au moins un OK et un NOK (plusieurs NOK c'est cool aussi)
- Le nom des fonctions doit être explicite

---

## 🎮 Convention de Nommage des Utilisateurs de Test

**RÈGLE OBLIGATOIRE** : Les credentials des utilisateurs de test DOIVENT être des références à des jeux vidéo iconiques. Pas de noms génériques !

### Pourquoi ?
- 🎯 Rend les tests plus mémorables et agréables à lire
- 🎨 Ajoute une touche de créativité au code
- 🔍 Facilite l'identification rapide de chaque fichier de test
- 😄 Apporte un peu de fun dans les tests

### Tableau de Références Actuelles

| Fichier de Test                  | 🎮 Jeu Vidéo                | Utilisateur(s)              | Mot(s) de Passe                              |
|----------------------------------|-----------------------------|-----------------------------|----------------------------------------------|
| **AuthenticationControllerTest** | 🐉 **Yakuza**               | KiryuKazuma                 | DragonOfDojima!@2024                         |
| **PostControllerTest**           | ⚔️ **The Witcher**          | GeraltOfRivia               | WhiteWolf1234!@2024                          |
| **CommentControllerTest**        | ☀️ **Dark Souls**           | SolairOfAstora              | PraiseTheSun!@2024                           |
| **TechGroupControllerTest**      | 🎮 **Metal Gear Solid**     | SolidSnake                  | FoxhoundUnit!@2024                           |
| **UserControllerTest**           | 🗡️ **Final Fantasy VII**   | CloudStrife                 | Buster5word!@2024                            |
| **FollowControllerTest**         | 🎭 **Persona 5**            | JokerAkira<br>RyujiSakamoto | PhantomThief!@2024<br>SkullForReal!@2024     |
| **ConversationControllerTest**   | 🗡️ **The Legend of Zelda** | LinkHyrule<br>ZeldaPrincess | MasterSword!@2024<br>TriforceWisdom!@2024    |
| **MessageControllerTest**        | ⚡ **Hades**                 | Zagreus<br>Thanatos         | EscapeFromHell!@2024<br>DeathIncarnate!@2024 |
| **ReportControllerTest**         | 🪓 **God of War**           | Kratos<br>Atreus            | GhostOfSparta!@2024<br>BoyOfWar!@2024        |
| **TechWatchControllerTest**      | 🌃 **Cyberpunk 2077**       | VNightCity<br>JackieWelles  | Samurai2077!@2024<br>TuMiTiempo!@2024        |

### Comment Choisir une Référence ?

Lors de la création d'un nouveau test :

1. ✅ **Choisir un jeu vidéo iconique** (AAA, indie culte, classique, etc.)
2. ✅ **Utiliser des personnages reconnaissables** du jeu choisi
3. ✅ **Créer un mot de passe en rapport** avec le personnage ou le jeu
4. ✅ **Vérifier qu'aucun autre test** n'utilise déjà ce jeu
5. ✅ **Mettre à jour ce tableau** avec la nouvelle référence

### Exemples de Bonnes Références

```php
// ✅ BON - Référence claire et fun
private $userData = [
    'username' => 'MasterChief',
    'password' => 'Halo117Spartan',
];

// ❌ MAUVAIS - Nom générique
private $userData = [
    'username' => 'TestUser1',
    'password' => 'Password123',
];

// ❌ MAUVAIS - Pas de référence culturelle
private $userData = [
    'username' => 'JohnDoe',
    'password' => 'MyPassword',
];
```

### Suggestions pour Futurs Tests

Voici quelques idées de jeux vidéo à utiliser pour de nouveaux tests :

- 🎮 **Hollow Knight** : TheKnight / ShadeOfHallownest
- 🎮 **Assassin's Creed** : EzioAuditore / NothingIsTrue
- 🎮 **Portal** : Chell / CakeIsALie
- 🎮 **Bioshock** : JackRyan / WouldYouKindly
- 🎮 **Undertale** : FriskDreemurr / DeterminedSoul
- 🎮 **Mass Effect** : Shepard / N7Commander
- 🎮 **Elden Ring** : Tarnished / ErdtreeAwaits
- 🎮 **Resident Evil** : LeonKennedy / RaccoonCity
- 🎮 **Sekiro** : WolfShinobi / ShadowsDieTwice
- 🎮 **Bloodborne** : GoodHunter / PalebloodMoon
- 🎮 **Hotline Miami** : Jacket / 50Blades

---

*Dernière mise à jour : 19 mars 2026*

*"Un bon test est un test qui raconte une histoire" - The Tester's Creed*
