/**
 * Modération minimale pour les messages privés.
 *
 * Politique : on tolère plus de choses qu'en post public (insultes
 * légères, emails, téléphones — un message à un proche peut légitimement
 * en contenir), MAIS on rejette toujours :
 *   - les slurs sévères (racistes, suprémacistes, pédophilie, etc.)
 *   - les données bancaires (IBAN, carte bancaire, n° sécu) — protection
 *     contre l'exposition de données financières par erreur ou phishing
 *
 * Si tu veux étendre la liste, modifie SEVERE_WORDS ci-dessous.
 */

const SEVERE_WORDS = [
    // Slurs racistes
    "negre", "negresse", "bougnoule", "youpin", "negro",
    "nigger", "nigga", "kike", "gook", "chink", "spic", "dago",
    "wetback", "towelhead", "raghead", "spook", "jiggaboo",
    "pickaninny", "sambo", "beaner", "golliwog", "wigger",
    // Slurs homophobes / transphobes
    "pede", "pedale", "tapette", "gouine", "faggot", "tranny",
    // Suprémacisme
    "nazi", "neonazi", "heil hitler", "sieg heil", "kkk",
    "ku klux klan", "white power", "swastika", "stormfront",
    // Pédopornographie
    "cp porn", "child porn", "childporn", "pedophile", "paedophile",
    "pedobear", "jailbait", "jail bait", "lolita", "pthc", "nambla",
    // Bestialité
    "bestiality", "zoophilia", "necrophilia",
    // Incitation à la violence
    "how to kill", "how to murder", "how to rape",
    "nique ta mere", "nique ta race",
];

/**
 * Normalise une chaîne (minuscules, sans accents, leet speak inverse)
 * pour résister aux contournements.
 */
function normalize(text) {
    let result = String(text || "").toLowerCase();

    // Suppression manuelle des accents courants
    const diacritics = {
        "à": "a", "á": "a", "â": "a", "ä": "a", "ã": "a", "å": "a",
        "ç": "c", "ć": "c",
        "è": "e", "é": "e", "ê": "e", "ë": "e",
        "ì": "i", "í": "i", "î": "i", "ï": "i",
        "ñ": "n",
        "ò": "o", "ó": "o", "ô": "o", "ö": "o", "õ": "o",
        "ù": "u", "ú": "u", "û": "u", "ü": "u",
        "ý": "y", "ÿ": "y",
        "ß": "ss",
    };
    result = result.replace(/[À-ſ]/g, (c) => diacritics[c] || c);

    // Filet de sécurité avec normalize Unicode
    result = result.normalize("NFD").replace(/[̀-ͯ]/g, "");

    // Leet speak inverse
    const leet = { "4": "a", "@": "a", "3": "e", "1": "i", "!": "i", "0": "o", "5": "s", "$": "s", "7": "t" };
    result = result.replace(/[4@31!05$7]/g, (c) => leet[c] || c);

    return result.replace(/\s+/g, " ").trim();
}

/**
 * Vrai si le texte contient au moins un mot sévère (rejet immédiat).
 */
function containsSevereWord(text) {
    const normalized = normalize(text);
    for (const word of SEVERE_WORDS) {
        if (word.includes(" ")) {
            // expression multi-mots
            if (normalized.includes(word)) return word;
        } else {
            // mot entier (frontière)
            const regex = new RegExp("\\b" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
            if (regex.test(normalized)) return word;
        }
    }
    return null;
}

/**
 * Détecte la présence de données bancaires (IBAN / CB Luhn / n° sécu FR).
 * Retourne un type ('iban' | 'credit_card' | 'ssn_fr') ou null.
 */
function detectFinancialPII(text) {
    // IBAN : 2 lettres pays + 2 chiffres + 11-30 alphanum
    const ibanMatch = String(text).toUpperCase().match(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]){11,30}\b/);
    if (ibanMatch) {
        const clean = ibanMatch[0].replace(/\s+/g, "");
        if (clean.length >= 15 && clean.length <= 34) return "iban";
    }

    // Carte bancaire : 13-19 chiffres avec validation Luhn
    const cbMatches = String(text).match(/\b(?:\d[ -]?){12,18}\d\b/g) || [];
    for (const candidate of cbMatches) {
        const digits = candidate.replace(/\D/g, "");
        if (isValidLuhn(digits)) return "credit_card";
    }

    // Numéro de sécu française : 15 chiffres
    if (/\b[12][\s]?\d{2}[\s]?(?:0[1-9]|1[0-2]|[2-9]\d|\d{2})[\s]?\d{2}[\s]?\d{3}[\s]?\d{3}[\s]?\d{2}\b/.test(text)) {
        return "ssn_fr";
    }

    return null;
}

function isValidLuhn(digits) {
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let n = parseInt(digits[i], 10);
        if (alt) {
            n *= 2;
            if (n > 9) n -= 9;
        }
        sum += n;
        alt = !alt;
    }
    return sum % 10 === 0;
}

/**
 * Vérifie un message. Retourne :
 *   { ok: true } → message autorisé
 *   { ok: false, reason: '...', code: '...' } → message refusé
 */
function checkMessage(text) {
    if (!text || typeof text !== "string" || !text.trim()) {
        return { ok: true };
    }

    // Strip HTML pour analyser le contenu réel
    const plain = text.replace(/<[^>]*>/g, "");

    // 1. Slurs sévères
    const severe = containsSevereWord(plain);
    if (severe) {
        return {
            ok: false,
            reason: "Votre message contient des termes interdits.",
            code: "severe_word",
        };
    }

    // 2. Données bancaires
    const financial = detectFinancialPII(plain);
    if (financial) {
        return {
            ok: false,
            reason: "Le partage d'informations bancaires (IBAN, carte bancaire, numéro de sécurité sociale) est strictement interdit.",
            code: "financial_pii",
        };
    }

    return { ok: true };
}

export { checkMessage, normalize, containsSevereWord, detectFinancialPII };
