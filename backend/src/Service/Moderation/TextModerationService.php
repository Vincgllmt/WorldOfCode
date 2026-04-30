<?php

declare(strict_types=1);

namespace App\Service\Moderation;

/**
 * Orchestrateur de modération de texte.
 *
 * Étapes :
 *   1. Blocklist → mots interdits (severe = rejet, warning = flag)
 *   2. PII       → données personnelles (rejet ou flag selon contexte)
 *   3. Perspective API (à venir) → score de toxicité
 *
 * Retourne un résultat agrégé que le caller utilise pour décider de la suite.
 */
class TextModerationService
{
    /**
     * Contexte "post / commentaire" : aucune PII tolérée. Toute donnée perso
     * (email, téléphone, banque…) provoque un REJET pour éviter qu'un user
     * partage publiquement ses propres infos ou celles d'un tiers.
     */
    public const CONTEXT_POST = 'post';

    /**
     * Contexte "message privé" : email et téléphone TOLÉRÉS (un message à un
     * proche peut légitimement les contenir), MAIS les infos bancaires
     * (IBAN, carte bancaire, n° sécu) restent toujours rejetées.
     */
    public const CONTEXT_MESSAGE = 'message';

    /** PII rejetées par défaut sur posts/commentaires (toutes). */
    private const PII_TYPES_STRICT = ['email', 'phone', 'iban', 'credit_card', 'ssn_fr'];

    /** PII rejetées en messagerie : uniquement les données financières/sensibles. */
    private const PII_TYPES_FINANCIAL = ['iban', 'credit_card', 'ssn_fr'];

    public function __construct(
        private BlocklistService $blocklist,
        private PIIDetectorService $piiDetector,
    ) {}

    /**
     * Vérifie un texte et retourne un verdict + détails.
     *
     * @param string $text    Le texte à analyser.
     * @param string $context Contexte d'utilisation (CONTEXT_POST par défaut).
     *                        Détermine la sévérité des règles PII.
     * @return array{
     *     status: 'ok' | 'flagged' | 'rejected',
     *     reason: ?string,
     *     details: array{
     *         blocklist: array{severe: string[], warning: string[], urls: string[]},
     *         pii: string[]
     *     }
     * }
     */
    public function check(string $text, string $context = self::CONTEXT_POST): array
    {
        $trimmed = trim($text);
        if ($trimmed === '') {
            return $this->result('ok', null, []);
        }

        // Strip HTML tags pour analyser le contenu réel (les posts contiennent du HTML).
        $plain = strip_tags($trimmed);

        $blocklist = $this->blocklist->check($plain);
        $piiTypes = $this->piiDetector->getDetectedTypes($plain);

        $details = [
            'blocklist' => $blocklist,
            'pii' => $piiTypes,
        ];

        // 1. Rejet si mots severe ou plus de 2 URL suspectes
        if ($blocklist['severe'] !== []) {
            return $this->result(
                'rejected',
                'Votre texte contient des termes interdits.',
                $details
            );
        }

        if (count($blocklist['urls']) >= 2) {
            return $this->result(
                'rejected',
                'Trop de liens raccourcisseurs ou suspects détectés.',
                $details
            );
        }

        // 2. Rejet PII selon le contexte
        $rejectedPiiTypes = $this->getRejectedPiiTypes($piiTypes, $context);
        if ($rejectedPiiTypes !== []) {
            return $this->result(
                'rejected',
                $this->buildPiiRejectionReason($rejectedPiiTypes),
                $details
            );
        }

        // 3. Flag pour modération si insultes courantes ou 1 URL suspecte ou PII tolérée
        if ($blocklist['warning'] !== [] || $blocklist['urls'] !== [] || $piiTypes !== []) {
            return $this->result(
                'flagged',
                $this->buildFlagReason($blocklist, $piiTypes),
                $details
            );
        }

        return $this->result('ok', null, $details);
    }

    /**
     * Vérifie et lève une exception si le contenu doit être rejeté.
     * À utiliser dans les controllers pour bloquer la création.
     *
     * @throws ContentRejectedException
     */
    public function checkOrThrow(string $text, string $context = self::CONTEXT_POST): array
    {
        $result = $this->check($text, $context);
        if ($result['status'] === 'rejected') {
            throw new ContentRejectedException(
                $result['reason'] ?? 'Contenu refusé par la modération.',
                $result['details']
            );
        }
        return $result;
    }

    /**
     * Renvoie les types de PII qui doivent être rejetés selon le contexte.
     *
     * @param string[] $detectedTypes
     * @return string[]
     */
    private function getRejectedPiiTypes(array $detectedTypes, string $context): array
    {
        $allowedRejected = $context === self::CONTEXT_MESSAGE
            ? self::PII_TYPES_FINANCIAL
            : self::PII_TYPES_STRICT;

        return array_values(array_intersect($detectedTypes, $allowedRejected));
    }

    /**
     * @param string[] $rejectedPiiTypes
     */
    private function buildPiiRejectionReason(array $rejectedPiiTypes): string
    {
        // En CONTEXT_MESSAGE seules les PII financières sont rejetées, donc si
        // une PII est rejetée et qu'elle n'est pas financière, on est forcément
        // en CONTEXT_POST (email / téléphone partagés publiquement).
        $hasFinancial = (bool) array_intersect($rejectedPiiTypes, self::PII_TYPES_FINANCIAL);

        if ($hasFinancial) {
            return 'Le partage d\'informations bancaires (IBAN, carte bancaire, numéro de sécurité sociale) est strictement interdit.';
        }

        return 'Ne partagez pas vos données personnelles (email, téléphone) dans une publication publique. Utilisez la messagerie privée.';
    }

    /**
     * @param array{severe: string[], warning: string[], urls: string[]} $blocklist
     * @param string[]                                                    $piiTypes
     */
    private function buildFlagReason(array $blocklist, array $piiTypes): string
    {
        $reasons = [];
        if ($blocklist['warning'] !== []) {
            $reasons[] = 'Insultes potentielles';
        }
        if ($blocklist['urls'] !== []) {
            $reasons[] = 'Lien raccourcisseur';
        }
        if ($piiTypes !== []) {
            $reasons[] = 'Données personnelles : ' . implode(', ', $piiTypes);
        }
        return 'Signalé pour vérification : ' . implode(' / ', $reasons);
    }

    /**
     * @param 'ok'|'flagged'|'rejected' $status
     * @param array<string, mixed>      $details
     */
    private function result(string $status, ?string $reason, array $details): array
    {
        return [
            'status' => $status,
            'reason' => $reason,
            'details' => $details,
        ];
    }
}
