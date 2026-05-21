<?php

declare(strict_types=1);

namespace App\Service\Moderation;

/**
 * Détecte les informations personnelles (PII) dans un texte.
 *
 * Utilisé pour avertir l'utilisateur qu'il partage des données sensibles
 * (warning) — pas pour bloquer la publication.
 */
class PIIDetectorService
{
    /**
     * Analyse un texte et retourne les types de PII détectés.
     *
     * @return array{
     *     email: string[],
     *     phone: string[],
     *     iban: string[],
     *     credit_card: string[],
     *     ssn_fr: string[]
     * }
     */
    public function detect(string $text): array
    {
        return [
            'email' => $this->extractEmails($text),
            'phone' => $this->extractPhonesFR($text),
            'iban' => $this->extractIbans($text),
            'credit_card' => $this->extractCreditCards($text),
            'ssn_fr' => $this->extractFrenchSSN($text),
        ];
    }

    /**
     * True si au moins une PII est détectée.
     */
    public function hasPII(string $text): bool
    {
        $result = $this->detect($text);
        foreach ($result as $matches) {
            if ($matches !== []) {
                return true;
            }
        }
        return false;
    }

    /**
     * Renvoie la liste des types de PII détectés (clés non vides).
     *
     * @return string[]
     */
    public function getDetectedTypes(string $text): array
    {
        $types = [];
        foreach ($this->detect($text) as $type => $matches) {
            if ($matches !== []) {
                $types[] = $type;
            }
        }
        return $types;
    }

    /**
     * Emails standards : "nom.prenom@domaine.com"
     *
     * @return string[]
     */
    private function extractEmails(string $text): array
    {
        $pattern = '/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/u';
        preg_match_all($pattern, $text, $matches);
        return array_values(array_unique($matches[0] ?? []));
    }

    /**
     * Numéros de téléphone français :
     *   - Format national : 06 12 34 56 78, 0612345678, 06.12.34.56.78
     *   - Format international : +33 6 12 34 56 78, +33612345678
     *
     * @return string[]
     */
    private function extractPhonesFR(string $text): array
    {
        // (+33|0)[1-9] suivi de 8 chiffres avec séparateurs optionnels
        $pattern = '/(?:(?:\+|00)33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}/u';
        preg_match_all($pattern, $text, $matches);
        return array_values(array_unique($matches[0] ?? []));
    }

    /**
     * IBAN (formats internationaux). Validation basique sur la structure
     * (pas de validation MOD-97 ici pour rester rapide).
     *
     * @return string[]
     */
    private function extractIbans(string $text): array
    {
        // 2 lettres pays + 2 chiffres + 11 à 30 caractères alphanumériques
        $pattern = '/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]){11,30}\b/u';
        preg_match_all($pattern, strtoupper($text), $matches);

        // Validation basique : longueur sans espaces entre 15 et 34.
        // On dédoublonne sur la version sans espaces (canonique) pour gérer
        // les variantes "FR76 1234..." et "FR761234..." qui désignent le même
        // compte, ainsi que les matches greedy qui peuvent capturer des
        // caractères différents en queue selon le contexte.
        $valid = [];
        foreach ($matches[0] ?? [] as $candidate) {
            $clean = preg_replace('/\s+/', '', $candidate) ?? '';
            $len = strlen($clean);
            // @codeCoverageIgnoreStart
            // Défensif : la regex contraint déjà 15-34 caractères alphanumériques,
            // donc cette branche est inatteignable. Conservée par sécurité au cas
            // où le motif évoluerait.
            if ($len < 15 || $len > 34) {
                continue;
            }
            // @codeCoverageIgnoreEnd
            // Garder la première occurrence trimée comme représentation
            $trimmed = trim($candidate);
            if (!isset($valid[$clean])) {
                $valid[$clean] = $trimmed;
            }
        }
        return array_values($valid);
    }

    /**
     * Numéros de carte bancaire (Visa, Mastercard, Amex, etc.).
     * Détecte les séquences 13–19 chiffres avec espaces/tirets puis validation Luhn.
     *
     * @return string[]
     */
    private function extractCreditCards(string $text): array
    {
        // Séquence de 13 à 19 chiffres avec espaces ou tirets optionnels
        $pattern = '/\b(?:\d[ -]?){12,18}\d\b/u';
        preg_match_all($pattern, $text, $matches);

        $valid = [];
        foreach ($matches[0] ?? [] as $candidate) {
            $digits = preg_replace('/\D/', '', $candidate) ?? '';
            if ($this->isValidLuhn($digits)) {
                $valid[] = $candidate;
            }
        }
        return array_values(array_unique($valid));
    }

    /**
     * Numéro de sécurité sociale français (15 chiffres).
     *
     * @return string[]
     */
    private function extractFrenchSSN(string $text): array
    {
        // 1 ou 2 (sexe) + 2 chiffres (année) + 2 chiffres (mois) + 5 chiffres (commune)
        // + 3 chiffres (ordre) + 2 chiffres (clé) = 15 chiffres
        $pattern = '/\b[12][\s]?\d{2}[\s]?(?:0[1-9]|1[0-2]|[2-9]\d|\d{2})[\s]?\d{2}[\s]?\d{3}[\s]?\d{3}[\s]?\d{2}\b/u';
        preg_match_all($pattern, $text, $matches);
        return array_values(array_unique($matches[0] ?? []));
    }

    /**
     * Validation Luhn (algorithme de carte bancaire).
     * La longueur (13-19 chiffres) est déjà garantie par la regex de l'appelant.
     */
    private function isValidLuhn(string $digits): bool
    {
        $sum = 0;
        $alt = false;
        for ($i = strlen($digits) - 1; $i >= 0; $i--) {
            $n = (int) $digits[$i];
            if ($alt) {
                $n *= 2;
                if ($n > 9) {
                    $n -= 9;
                }
            }
            $sum += $n;
            $alt = !$alt;
        }
        return $sum % 10 === 0;
    }
}
