/**
 * Mapping des erreurs d'authentification renvoyées par le backend (en anglais)
 * vers des messages utilisateur en français.
 */

const BACKEND_MESSAGE_MAP: Record<string, string> = {
  // /api/authenticate
  'Missing username or password': 'Veuillez renseigner votre nom d’utilisateur et votre mot de passe.',
  'Invalid credentials': 'Identifiants invalides. Vérifiez votre nom d’utilisateur et mot de passe.',
  'Too many login attempts. Please try again later.':
    'Trop de tentatives de connexion. Veuillez patienter quelques minutes avant de réessayer.',
  'Unable to send verification email.':
    'Impossible d’envoyer l’email de vérification. Réessayez plus tard ou contactez le support.',

  // /api/2fa/verify
  'Missing tempToken or code': 'Code de vérification manquant.',
  'Invalid or expired token': 'Votre session a expiré. Veuillez vous reconnecter.',
  'Invalid token type': 'Session invalide. Veuillez vous reconnecter.',
  'Invalid token': 'Session invalide. Veuillez vous reconnecter.',
  'User not found': 'Utilisateur introuvable. Veuillez vous reconnecter.',
  'Invalid or expired code': 'Code incorrect ou expiré. Veuillez réessayer.',
  'Too many attempts. Please try again later.':
    'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.',

  // /api/me
  'Unauthenticated': 'Vous n’êtes pas connecté.',
  'Unexpected user type': 'Erreur d’authentification. Veuillez vous reconnecter.',
  'Invalid request or unauthenticated': 'Session expirée. Veuillez vous reconnecter.',

  // /api/auth/refresh
  'Refresh failed': 'La session n’a pas pu être renouvelée. Veuillez vous reconnecter.',

  // /api/reset-password
  'Invalid or missing email': 'Adresse email invalide ou manquante.',
  'Unable to send email.': 'Impossible d’envoyer l’email. Réessayez plus tard.',
  'Missing token or password': 'Lien de réinitialisation invalide.',
}

const STATUS_FALLBACK_MAP: Record<number, string> = {
  400: 'Requête invalide. Vérifiez les informations saisies.',
  401: 'Identifiants invalides ou session expirée.',
  403: 'Accès refusé.',
  404: 'Ressource introuvable.',
  408: 'Délai d’attente dépassé. Réessayez.',
  429: 'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.',
  500: 'Service temporairement indisponible. Réessayez plus tard.',
  502: 'Service temporairement indisponible. Réessayez plus tard.',
  503: 'Service temporairement indisponible. Réessayez plus tard.',
  504: 'Service temporairement indisponible. Réessayez plus tard.',
}

/**
 * Récupère le message d'erreur depuis une réponse fetch et le traduit en français.
 */
export async function parseAuthErrorResponse(res: Response, fallback = 'Une erreur est survenue.'): Promise<string> {
  let backendMessage: string | undefined
  try {
    const data = await res.json()
    backendMessage = data?.error || data?.message
  } catch {
    // pas de JSON dans la réponse
  }

  if (backendMessage && BACKEND_MESSAGE_MAP[backendMessage]) {
    return BACKEND_MESSAGE_MAP[backendMessage]
  }

  if (STATUS_FALLBACK_MAP[res.status]) {
    return STATUS_FALLBACK_MAP[res.status]
  }

  return backendMessage || fallback
}

/**
 * Détecte si une erreur de fetch est due à un problème réseau (offline, serveur down, CORS, etc.)
 * et retourne un message clair, sinon retourne le message original.
 */
export function parseNetworkError(err: unknown, fallback = 'Une erreur est survenue.'): string {
  if (err instanceof TypeError) {
    // fetch lance un TypeError quand le réseau est inaccessible
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'Vous semblez hors ligne. Vérifiez votre connexion internet et réessayez.'
    }
    return 'Connexion au serveur impossible. Vérifiez votre connexion ou réessayez plus tard.'
  }
  if (err instanceof Error) {
    return err.message || fallback
  }
  return fallback
}
