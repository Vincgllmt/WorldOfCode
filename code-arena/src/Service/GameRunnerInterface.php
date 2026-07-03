<?php

declare(strict_types=1);

namespace App\Service;

/**
 * Contrat de l'orchestrateur d'un "tour de jeu". Permet de découpler PlayController
 * de l'implémentation concrète et de la remplacer par un double dans les tests.
 */
interface GameRunnerInterface
{
    /**
     * @return array{
     *     verdict: string,
     *     score: int,
     *     replay: array{init: mixed, frames: array<int, mixed>}|null,
     *     playerStdout: string,
     *     playerStderr: string,
     *     error: string|null
     * }
     */
    public function play(
        string $playerLanguage,
        string $playerCode,
        string $input,
        string $refereeLanguage,
        string $refereeCode,
    ): array;
}
