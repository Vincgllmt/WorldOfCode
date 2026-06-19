<?php

declare(strict_types=1);

namespace App\Service;

/**
 * Contrat d'exécution de code dans le runner isolé (Piston).
 * Permet de découpler le GameRunner du transport HTTP (et de le tester).
 */
interface PistonClientInterface
{
    /**
     * @return array{stdout: string, stderr: string, exitCode: int, timedOut: bool}
     */
    public function execute(string $language, string $code, ?string $stdin = null): array;
}
