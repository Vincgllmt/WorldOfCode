<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class CorsPreflightController
{
    #[Route(path: '/{any}', name: 'cors_preflight', methods: ['OPTIONS'], requirements: ['any' => '.*'])]
    public function preflight(): Response
    {
        return new Response('', 204);
    }
}
