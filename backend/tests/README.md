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

OU 

docker compose exec backend composer run tests
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

| Fichier de Test                  | 🎮 Jeu Vidéo             | Utilisateur(s)                                   | Mot(s) de Passe                       |
|----------------------------------|--------------------------|--------------------------------------------------|---------------------------------------|
| **AuthenticationControllerTest** | 🎮 **Portal 2**          | Chell<br>Wheatley<br>GLaDOS<br>Cave Johnson      | Ap3rtur3Sc!ence<br>—<br>—<br>—        |
| **PostControllerTest**           | 🗡️ **Elden Ring**       | Tarnished<br>Malenia                             | (mock - hashed)                       |
| **UserControllerTest**           | 🚀 **Mass Effect**       | Shepard<br>Garrus                                | (mock - hashed)                       |
| **TechWatchControllerTest**      | 🌃 **Cyberpunk 2077**    | VNightCity<br>JackieWelles                       | Samurai2077!@2024<br>TuMiTiempo!@2024 |
| **CommentControllerTest**        | 🌊 **BioShock**          | JackRyan<br>AndrewRyan                           | (mock - hashed)                       |
| **ConversationControllerTest**   | 🗡️ **Assassin's Creed** | EzioAuditore<br>AltairIbnLaAhad                  | (mock - hashed)                       |
| **FollowControllerTest**         | 🐍 **Metal Gear Solid**  | SolidSnake<br>OtaconEmmerich<br>MerylSilverburgh | (mock - hashed)                       |
| **MessageControllerTest**        | 🐉 **Yakuza**            | KiryuKazuma<br>MajimaGoro                        | (mock - hashed)                       |
| **NotificationControllerTest**   | 🌼 **Undertale**         | FriskDreemurr<br>TorielDreemurr                  | (mock - hashed)                       |
| **ReportControllerTest**         | 🧟 **Resident Evil**     | LeonKennedy<br>AdaWong                           | (mock - hashed)                       |
| **SearchControllerTest**         | ⚔️ **Sekiro**            | WolfShinobi<br>KuroTheDivineHeir                 | (mock - hashed)                       |
| **SkillControllerTest**          | 🩸 **Bloodborne**        | GoodHunter<br>GehrmanFirstHunter                 | (mock - hashed)                       |
| **SuggestionControllerTest**     | 🪓 **God of War**        | KratosGhost<br>FreyrAesir                        | (mock - hashed)                       |
| **TechGroupControllerTest**      | 🔫 **Hotline Miami**     | Jacket<br>Biker                                  | (mock - hashed)                       |
| **UploadControllerTest**         | 🔬 **Half-Life**         | GordonFreeman                                    | (mock - hashed)                       |
| **CorsPreflightControllerTest**  | 🕹️ **Pac-Man**          | PacManYellow<br>GhostBlinky                      | (sans auth)                           |
| **DefaultControllerTest**        | 🗡️ **The Legend of Zelda** | LinkHylian<br>GanondorfDorf                   | (sans auth)                           |
| **PasswordValidatorTest**        | ⚔️ **Dark Souls**         | UndyingUndead<br>SolaireLordran                  | (pas d'auth)                          |
| **NotificationServiceTest**      | 🎯 **Overwatch**          | TraceOxton<br>SoldiersGabe                       | (mock - hashed)                       |
| **TechGroupMembershipServiceTest** | 🧙 **World of Warcraft** | ThrallGoEl<br>JainaProudmoore                   | (mock - hashed)                       |
| **SuggestionServiceTest**        | 🦋 **Hollow Knight**      | TheKnight<br>Hornet<br>Quirrel                   | (mock - hashed)                       |
| **PasswordResetServiceTest**     | 🌟 **Final Fantasy VII**  | CloudStrife<br>AerithGainsborough                | (mock - hashed)                       |
| **TwoFactorServiceTest**         | 🤖 **Deus Ex**            | JCDenton<br>AdamJensen                           | (mock - hashed)                       |
| **RssFetcherServiceTest**        | 🚀 **StarCraft**          | JimRaynor<br>SarahKerrigan                       | (mock - hashed)                       |
| **S3StorageTest**                | ⛏️ **Minecraft**          | SteveBuilder<br>HerobrineVoid                    | (mock - hashed)                       |

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

---

*Dernière mise à jour : 30 mars 2026*

*"Un bon test est un test qui raconte une histoire" - The Tester's Creed*
