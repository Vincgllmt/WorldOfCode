# CV Interactif — Bugs à corriger

> Audit du 2026-06-17/18. Reprendre ici pour la session suivante.

---

## Contexte

Convention projet : `NEXT_PUBLIC_API_URL` inclut déjà `/api`
(ex: `https://api-woc-prod.duckdns.org/api`).
→ Les paths passés à `fetchWithAuth` ou à `fetch(${NEXT_PUBLIC_API_URL}/...)` ne doivent PAS commencer par `/api/`.

Preuve : `authService.ts` → `${API_URL}/authenticate` fonctionne en prod.

---

## BUG — Double `/api` dans tous les hooks CV

Tous les hooks écrits pour la feature CV utilisent le mauvais préfixe.
En production : `https://api-woc-prod.duckdns.org/api/api/...` → **404**.

### Fichiers à corriger

| Fichier | Ligne | Actuel (cassé) | Correct |
|---------|-------|----------------|---------|
| `frontend/src/app/cv/[token]/page.tsx` | 13 + 30 | `${NEXT_PUBLIC_API_URL}/api/cv/${token}` | `${NEXT_PUBLIC_API_URL}/cv/${token}` |
| `frontend/src/hooks/useProfileHighlights.ts` | 10 | `/api/user/${userId}/highlights` | `/user/${userId}/highlights` |
| `frontend/src/hooks/useProfileHighlights.ts` | 22 + 44 | `/api/posts/${postId}/pin-to-profile` | `/posts/${postId}/pin-to-profile` |
| `frontend/src/hooks/useReorderExperiences.ts` | 10 | `/api/user/${userId}/experiences/reorder` | `/user/${userId}/experiences/reorder` |
| `frontend/src/hooks/useUpdateFieldVisibility.ts` | 13 | `/api/user/${userId}/profile` | `/user/${userId}/profile` |
| `frontend/src/hooks/useUpdateExperienceVisibility.ts` | 11 | `/api/experiences/${expId}/visibility` | `/experiences/${expId}/visibility` |
| `frontend/src/hooks/useEngagementSummary.ts` | 9 | `/api/user/${userId}/engagement-summary` | `/user/${userId}/engagement-summary` |
| `frontend/src/hooks/useShareCvLink.ts` | 15 | `/api/user/${userId}/cv/share-link` | `/user/${userId}/cv/share-link` |
| `frontend/src/components/account/UserProfilePage.tsx` | 59 | `/api/users/${userId}/mentor-profile` | `/users/${userId}/mentor-profile` |

### Fichiers hors-epic (même bug, à corriger aussi)

| Fichier | Actuel | Correct |
|---------|--------|---------|
| `frontend/src/services/groupSuggestionService.ts` | `/api/group-suggestions` | `/group-suggestions` |
| `frontend/src/app/mentoring/following/page.tsx` | `/api/mentoring/feed/following` | `/mentoring/feed/following` |

---

## État des stories Epic 18 (au moment de la coupure)

| Story | Titre | État |
|-------|-------|------|
| 18.1 | Migration `cv_public_token` + UNIQUE INDEX | ✅ |
| 18.2 | `POST /api/user/{id}/cv/share-link` (backend) | ✅ |
| 18.3 | `GET /api/cv/{token}` (backend) — **fix TypeError email appliqué** | ✅ |
| 18.4 | Route `/cv/[token]` Server Component | ✅ sauf double-/api (voir tableau ci-dessus) |
| 18.5 | `ShareCvDialog` + `useShareCvLink` + bouton Partager | ✅ commité dans cette session |

---

## Dead code à nettoyer (non bloquant)

- `editExpOpen` / `setEditExpOpen` déclarés dans `UserProfilePage.tsx` mais aucun bouton ne les déclenche — `EditExperiencesDialog` inaccessible. L'édition passe maintenant par le DnD inline.
- Bouton "Exporter PDF" → `console.log` placeholder, non implémenté.
- `ProfileExperienceSection.tsx` existant mais non utilisé dans `UserProfilePage` (remplacé par `CvTimeline` + `ExperienceDndList`).
