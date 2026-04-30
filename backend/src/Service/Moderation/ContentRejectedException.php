<?php

declare(strict_types=1);

namespace App\Service\Moderation;

/**
 * Levée par TextModerationService::checkOrThrow quand un contenu doit
 * être bloqué (mot severe, trop d'URLs suspectes, etc.).
 *
 * Le controller catche cette exception et renvoie 422.
 */
class ContentRejectedException extends \RuntimeException
{
    /**
     * @param array<string, mixed> $details Détails de la modération (blocklist, pii, ...)
     */
    public function __construct(
        string $message,
        private readonly array $details = []
    ) {
        parent::__construct($message);
    }

    /**
     * @return array<string, mixed>
     */
    public function getDetails(): array
    {
        return $this->details;
    }
}
