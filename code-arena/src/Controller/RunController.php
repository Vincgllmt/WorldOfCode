<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\PistonService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Exécution rapide de code sans persistance (mode bac à sable / REPL).
 */
final class RunController extends AbstractController
{
    private const SUPPORTED_LANGUAGES = ['javascript', 'php', 'python', 'java', 'cpp', 'typescript'];

    public function __construct(private readonly PistonService $piston) {}

    #[Route('/api/arena/run', name: 'arena_run', methods: ['POST'])]
    public function run(Request $request): JsonResponse
    {
        $payload  = json_decode($request->getContent(), true);
        $language = is_array($payload) ? ($payload['language'] ?? null) : null;
        $code     = is_array($payload) ? ($payload['code']     ?? null) : null;
        $stdin    = is_array($payload) ? ($payload['stdin']    ?? null) : null;

        if (!is_string($language) || '' === $language || !is_string($code) || '' === $code) {
            return new JsonResponse(
                ['error' => 'Champs "language" et "code" requis.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        if (!in_array($language, self::SUPPORTED_LANGUAGES, true)) {
            return new JsonResponse(
                ['error' => sprintf('Langage "%s" non supporté. Langages disponibles : %s.', $language, implode(', ', self::SUPPORTED_LANGUAGES))],
                Response::HTTP_BAD_REQUEST,
            );
        }

        $result = $this->piston->execute($language, $code, is_string($stdin) ? $stdin : null);

        return new JsonResponse([
            'stdout'   => $result['stdout'],
            'stderr'   => $result['stderr'],
            'exitCode' => $result['exitCode'],
            'timedOut' => $result['timedOut'],
        ]);
    }
}
