<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Passerelle vers le runner Piston (https://github.com/engineer-man/piston).
 * Piston exécute le code dans un sandbox isolé et renvoie stdout/stderr/exitCode.
 */
final class PistonService
{
    /** Délai max en secondes pour attendre la réponse de Piston (compilation + exécution). */
    private const HTTP_TIMEOUT = 15.0;

    /** Délai d'exécution max accordé au code utilisateur (ms). */
    private const RUN_TIMEOUT_MS = 3000;

    /** Nom de fichier transmis à Piston pour chaque langage. */
    private const FILE_NAMES = [
        'javascript' => 'main.js',
        'php'        => 'main.php',
    ];

    /** Correspondance langage interne → identifiant runtime Piston. */
    private const LANGUAGE_MAP = [
        'javascript' => 'javascript',
        'php'        => 'php',
    ];

    public function __construct(
        private readonly HttpClientInterface $http,
        #[Autowire(env: 'PISTON_URL')]
        private readonly string $pistonUrl,
    ) {}

    /**
     * Exécute du code et retourne le résultat brut.
     *
     * @return array{stdout: string, stderr: string, exitCode: int, timedOut: bool}
     */
    public function execute(string $language, string $code, ?string $stdin = null): array
    {
        $runtime  = self::LANGUAGE_MAP[$language]  ?? $language;
        $filename = self::FILE_NAMES[$language]    ?? 'main.txt';

        try {
            $response = $this->http->request('POST', $this->pistonUrl . '/api/v2/execute', [
                'json'    => [
                    'language'    => $runtime,
                    'version'     => '*',
                    'files'       => [['name' => $filename, 'content' => $code]],
                    'stdin'       => $stdin ?? '',
                    'run_timeout' => self::RUN_TIMEOUT_MS,
                ],
                'timeout' => self::HTTP_TIMEOUT,
            ]);

            $data = $response->toArray();
            $run  = $data['run'] ?? [];

            return [
                'stdout'   => $run['stdout']  ?? '',
                'stderr'   => $run['stderr']  ?? '',
                'exitCode' => $run['code']    ?? -1,
                'timedOut' => isset($run['signal']) && $run['signal'] === 'SIGKILL',
            ];
        } catch (TransportExceptionInterface $e) {
            return [
                'stdout'   => '',
                'stderr'   => 'Erreur de connexion au runner : ' . $e->getMessage(),
                'exitCode' => -1,
                'timedOut' => false,
            ];
        }
    }
}
