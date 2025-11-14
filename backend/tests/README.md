# Règles pour les Tests Unitaires en PHP

Ce document définit les règles et bonnes pratiques à respecter pour écrire et maintenir les tests unitaires dans ce projet.

## 🎯 Objectifs
- Vérifier automatiquement le bon fonctionnement du code.
- Garantir la stabilité lors des évolutions et refactorings.
- Fournir une documentation vivante du comportement attendu des fonctions.

---

## 🛠️ Outils
- **WebTestCase** : outil symfony de tests unitaires.

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

| Fichier de Test                  | 🎮 Jeu Vidéo                | Utilisateur(s)              | Mot(s) de Passe                  |
|----------------------------------|-----------------------------|-----------------------------|----------------------------------|
| **AuthenticationControllerTest** | 🐉 **Yakuza**               | KiryuKazuma                 | DragonOfDojima                   |
| **PostControllerTest**           | ⚔️ **The Witcher**          | GeraltOfRivia               | WhiteWolf1234                    |
| **CommentControllerTest**        | ☀️ **Dark Souls**           | SolairOfAstora              | PraiseTheSun                     |
| **TechGroupControllerTest**      | 🎮 **Metal Gear Solid**     | SolidSnake                  | FoxhoundUnit                     |
| **UserControllerTest**           | 🗡️ **Final Fantasy VII**   | CloudStrife                 | Buster5word                      |
| **FollowControllerTest**         | 🎭 **Persona 5**            | JokerAkira<br>RyujiSakamoto | PhantomThief<br>SkullForReal     |
| **ConversationControllerTest**   | 🗡️ **The Legend of Zelda** | LinkHyrule<br>ZeldaPrincess | MasterSword<br>TriforceWisdom    |
| **MessageControllerTest**        | ⚡ **Hades**                 | Zagreus<br>Thanatos         | EscapeFromHell<br>DeathIncarnate |
| **ReportControllerTest**         | 🪓 **God of War**           | Kratos<br>Atreus            | GhostOfSparta<br>BoyOfWar        |

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

*Dernière mise à jour : 7 novembre 2025*

*"Un bon test est un test qui raconte une histoire" - The Tester's Creed*
