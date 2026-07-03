<?php

declare(strict_types=1);

namespace App\Service;

/**
 * Orchestrateur générique d'un "tour de jeu" — indépendant du jeu.
 *
 * 1. exécute le code joueur dans Piston avec l'input du jeu (stdin) ;
 * 2. exécute le referee du jeu dans Piston, en lui passant {input, output} (JSON stdin) ;
 * 3. le referee renvoie {verdict, score, replay:{init, frames}} (JSON stdout).
 *
 * Le backend ne connaît AUCUN jeu : toute la logique vit dans le referee (par défi).
 */
final class GameRunner
{
    public function __construct(private readonly PistonClientInterface $piston)
    {
    }

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
    ): array {
        // 1. Code joueur
        $player = $this->piston->execute($playerLanguage, $playerCode, $input);

        // 2. Referee : reçoit {input, output} en JSON sur stdin
        $refereeInput = json_encode([
            'input' => $input,
            'output' => $player['stdout'],
        ], \JSON_UNESCAPED_UNICODE | \JSON_UNESCAPED_SLASHES);

        $referee = $this->piston->execute($refereeLanguage, $refereeCode, (string) $refereeInput);

        // 3. Parse de la sortie du referee
        $decoded = json_decode(trim($referee['stdout']), true);

        if (!is_array($decoded) || !isset($decoded['verdict'])) {
            return [
                'verdict' => 'error',
                'score' => 0,
                'replay' => null,
                'playerStdout' => $player['stdout'],
                'playerStderr' => $player['stderr'],
                'error' => 'Referee invalide. stderr: ' . trim($referee['stderr']),
            ];
        }

        return [
            'verdict' => (string) $decoded['verdict'],
            'score' => (int) ($decoded['score'] ?? 0),
            'replay' => isset($decoded['replay']) && is_array($decoded['replay']) ? $decoded['replay'] : null,
            'playerStdout' => $player['stdout'],
            'playerStderr' => $player['stderr'],
            'error' => null,
        ];
    }
}
