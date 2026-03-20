# Tests Frontend - World of Code

## Approche de test

Les tests frontend suivent une approche **unitaire et d'integration legere** :

- **Tests unitaires de services** : chaque fonction de service (auth, user, group, post) est testee en isolation avec un mock de `fetch` / `fetchWithAuth`. On verifie les appels API (URL, methode, body), le parsing des reponses, et la gestion des erreurs.
- **Tests unitaires de hooks** : les hooks React (`useAuth`, `useRegister`, `useResetPassword`) sont testes via `renderHook` de React Testing Library, avec les providers necessaires (QueryClient, AuthContext) injectes en wrapper. Les mutations TanStack Query sont declenchees puis on verifie les effets (toasts, redirections, state).
- **Tests unitaires du contexte (AuthProvider)** : le flux complet d'authentification est teste (init depuis cookie, login avec/sans 2FA, verify2FA avec redirection conditionnelle, logout, mise a jour theme/avatar) via un composant consommateur qui expose le contexte.
- **Tests de composants** : les composants React (pages et sidebars) sont rendus avec `render` de React Testing Library. Les dependances externes (hooks, services, router, composants UI) sont mockees via `jest.mock`. On teste le rendu conditionnel, les interactions utilisateur (`fireEvent`), la validation de formulaires (`react-hook-form`), et la navigation.
- **Tests du middleware** : le middleware Next.js est teste en mockant `NextRequest` et `NextResponse` pour verifier la logique de protection des routes (redirections, acces public/prive).

Chaque fichier de test est autonome : il declare ses propres mocks et ne depend d'aucun autre test.

## Commandes

```bash
# Lancer tous les tests
npm test

# Mode watch (relance auto quand un fichier change)
npm run test:watch

# Avec rapport de couverture
npm run test:coverage

# Lancer un seul fichier de test
npx jest src/__tests__/services/authService.test.ts
```

## Stack de test

| Outil | Role |
|---|---|
| **Jest** | Framework de test (runner, assertions, mocks) |
| **React Testing Library** | Rendu et interaction avec les composants React |
| **@testing-library/user-event** | Simulation d'interactions utilisateur (clics, saisie) |
| **@testing-library/jest-dom** | Matchers DOM (`toBeInTheDocument`, `toHaveValue`, etc.) |
| **identity-obj-proxy** | Mock des imports CSS/SCSS |

## Structure

```
src/__tests__/
  services/
    authService.test.ts        # Service d'authentification (18 tests)
    registerService.test.ts    # Service d'inscription (3 tests)
    fetchWithAuth.test.ts      # Wrapper fetch avec JWT (5 tests)
    userService.test.ts        # Service utilisateurs CRUD (14 tests)
    groupService.test.ts       # Service groupes CRUD (14 tests)
    postService.test.ts        # Service posts CRUD + social (22 tests)
  hooks/
    useAuth.test.tsx           # Hook useAuth (2 tests)
    AuthContext.test.tsx        # AuthProvider complet (12 tests)
    useRegister.test.tsx       # Hook inscription + 2FA (4 tests)
    usePasswordReset.test.tsx  # Hooks forgot/reset password (4 tests)
  components/
    LoginPage.test.tsx         # Page de connexion (8 tests)
    RegisterPage.test.tsx      # Page d'inscription (9 tests)
    MyGroupsSidebar.test.tsx   # Sidebar groupes (12 tests)
    SuggestionsSidebar.test.tsx # Sidebar suggestions (5 tests)
    TwoFactorPage.test.tsx     # Page 2FA (8 tests)
  middleware/
    middleware.test.ts         # Middleware Next.js routes (17 tests)
```

---

## Detail des tests

### authService.test.ts (18 tests)

**login**
- Retourne un token quand les credentials sont valides
- Retourne une reponse 2FA quand le serveur le demande
- Lance une erreur quand les credentials sont invalides
- Lance une erreur par defaut si pas de message du serveur

**isTwoFactorRequired**
- Retourne true pour une reponse 2FA
- Retourne false pour une reponse token classique

**verify2FA**
- Stocke le cookie et retourne le user apres verification
- Lance une erreur si le code est invalide
- Lance une erreur si /me echoue

**getMe**
- Retourne le user avec le token quand le cookie existe
- Lance une erreur si aucun token en cookie
- Lance une erreur si le token est invalide

**logout**
- Supprime le cookie token

**requestPasswordReset**
- Envoie la requete sans erreur
- Lance une erreur si la requete echoue

**resetPassword**
- Envoie token + password au serveur
- Lance une erreur avec le message du serveur
- Lance une erreur par defaut si le json echoue

---

### registerService.test.ts (3 tests)

**register**
- Retourne les donnees utilisateur apres inscription reussie
- Lance une erreur avec le message du serveur si l'inscription echoue
- Lance une erreur par defaut si pas de message du serveur

---

### fetchWithAuth.test.ts (5 tests)

- Ajoute le header Authorization quand un token existe
- N'ajoute pas Authorization sans token
- Ajoute Content-Type quand un body est present
- Supprime le cookie et redirige si 401 (session expiree)
- Retourne la reponse normalement si pas 401

---

### userService.test.ts (14 tests)

**getAllUsers**
- Retourne la liste des utilisateurs
- Lance une erreur si la requete echoue

**updateUser**
- Envoie un PUT avec les donnees sans l'id dans le body
- Lance une erreur si la mise a jour echoue

**deleteUser**
- Envoie un DELETE pour l'utilisateur
- Lance une erreur si la suppression echoue

**getUserGroups**
- Retourne les groupes de l'utilisateur
- Lance une erreur si la requete echoue

**getUserById**
- Retourne l'utilisateur par ID
- Lance une erreur si l'utilisateur n'existe pas

**changeUserPassword**
- Envoie le changement de mot de passe
- Lance une erreur avec le message du serveur

**updateUserProfile**
- Met a jour le profil utilisateur
- Lance une erreur si la mise a jour echoue

---

### groupService.test.ts (14 tests)

**getGroups**
- Retourne la liste des groupes
- Lance une erreur si la requete echoue

**getGroupById**
- Retourne un groupe par ID
- Lance une erreur si le groupe n'existe pas

**createGroup**
- Cree un groupe et retourne les donnees
- Lance une erreur si la creation echoue

**updateGroup**
- Met a jour un groupe
- Lance une erreur si la mise a jour echoue

**deleteGroup**
- Supprime un groupe
- Lance une erreur si la suppression echoue

**joinGroup**
- Rejoint un groupe
- Lance une erreur si impossible de rejoindre

**leaveGroup**
- Quitte un groupe
- Lance une erreur si impossible de quitter

---

### postService.test.ts (22 tests)

**createPost**
- Cree un post et retourne les donnees
- Lance une erreur si la creation echoue

**getAllPosts**
- Retourne un tableau de posts (format array)
- Retourne les posts depuis le champ items (format objet)
- Lance une erreur si la requete echoue

**getPostById**
- Retourne un post par ID
- Lance une erreur si le post n'existe pas

**getPostsByGroupId**
- Retourne les posts d'un groupe
- Lance une erreur si la requete echoue

**updatePost**
- Met a jour un post
- Lance une erreur si la mise a jour echoue

**deletePost**
- Supprime un post
- Lance une erreur si la suppression echoue

**likePost / unlikePost**
- Like un post
- Lance une erreur si le like echoue
- Unlike un post
- Lance une erreur si le unlike echoue

**getLikers**
- Retourne les likers normalises
- Lance une erreur si la requete echoue

**sharePost**
- Partage un post
- Lance une erreur si le partage echoue

**reportPost**
- Signale un post avec raison
- Signale un post sans raison
- Lance une erreur si le signalement echoue

---

### middleware.test.ts (17 tests)

**Landing page (/)**
- Redirige un utilisateur connecte vers /home
- Laisse passer un utilisateur non connecte

**Routes publiques** (/login, /register, /reset-password, /forgot-password, /2fa)
- Laisse passer un non-connecte sur chaque route publique (5 tests)

**Routes privees** (/home, /profile, /group/1, /settings)
- Redirige un non-connecte vers /login (4 tests)
- Laisse passer un connecte (4 tests)

**Redirection si deja connecte**
- Redirige /login vers /home si connecte
- Redirige /register vers /home si connecte

---

### AuthContext.test.tsx (12 tests)

**Initialisation**
- isLoading = true puis false sans token
- Charge le user si un token existe en cookie
- Logout si le token stocke est invalide

**login()**
- Redirige vers /2fa si 2FA est requis
- Affiche un toast erreur si les credentials sont mauvais

**loginSilent()**
- Redirige vers /2fa et throw si 2FA requis

**verify2FA()**
- Set le user et redirige vers /home par defaut
- Redirige vers /onboarding si 2fa_redirect est set
- Lance une erreur si pas de tempToken en session

**logout()**
- Remet le user a null et redirige vers /login

**setUserTheme() / setUserAvatar()**
- Met a jour le theme du user
- Met a jour l'avatar du user

---

### useRegister.test.tsx (4 tests)

- Appelle register puis loginSilent et redirige vers /onboarding
- Gere la redirection 2FA apres inscription
- Redirige vers /login si loginSilent echoue pour autre raison
- Affiche un toast erreur si l'inscription echoue

---

### usePasswordReset.test.tsx (4 tests)

**useForgotPassword**
- Affiche un toast succes quand la demande reussit
- Affiche un toast erreur si la demande echoue

**useResetPassword**
- Affiche un toast succes et redirige vers /login
- Affiche un toast erreur si le reset echoue

---

### LoginPage.test.tsx (8 tests)

- Affiche le titre Connexion
- Affiche les champs username et password
- Affiche le bouton Se connecter
- Affiche le lien vers inscription
- Affiche le lien mot de passe oublie
- Affiche les erreurs de validation si champs vides
- Appelle login avec les credentials saisis
- Toggle la visibilite du mot de passe

---

### RegisterPage.test.tsx (9 tests)

- Affiche le titre Creer un compte
- Affiche tous les champs du formulaire (nom, prenom, email, username, password)
- Affiche le composant AvatarPicker
- Affiche le composant PasswordRules
- Affiche le bouton Creer le compte
- Le bouton est desactive si le mot de passe ne respecte pas les regles
- Affiche le lien vers la connexion
- Affiche les erreurs de validation quand les champs sont vides
- Affiche les placeholders corrects

---

### MyGroupsSidebar.test.tsx (12 tests)

- Affiche le skeleton loader pendant le chargement
- Affiche un message si aucun groupe rejoint
- Affiche la liste des groupes
- Affiche le compteur de groupes
- Affiche maximum 8 groupes
- Affiche la recherche quand plus de 3 groupes
- Ne montre pas la recherche avec 3 groupes ou moins
- Filtre les groupes avec la recherche (startsWith)
- Affiche un message quand la recherche ne trouve rien
- Affiche le lien vers tous les groupes
- Affiche l'initiale du groupe en badge
- Cree des liens vers les pages de chaque groupe

---

### SuggestionsSidebar.test.tsx (5 tests)

- Affiche le titre Decouvrir
- Affiche le skeleton pendant le chargement
- Affiche le SwipeDeck avec les cartes
- Ne rend rien si pas de user
- Ne rend rien si pas de cartes et pas en chargement

---

### TwoFactorPage.test.tsx (8 tests)

- Redirige vers /login si pas de tempToken en session
- Affiche le formulaire quand un tempToken existe
- Affiche le maskedEmail
- Affiche 6 inputs pour le code
- N'accepte que les chiffres
- Appelle verify2FA quand le bouton est clique avec un code complet
- Affiche le bouton renvoyer et redirige vers /login au clic
- Affiche le loader quand isReady est false

---

### useAuth.test.tsx (2 tests)

- Retourne le contexte quand utilise dans un AuthProvider
- Lance une erreur si utilise en dehors d'un AuthProvider

---

## Total : 16 suites, 159 tests
