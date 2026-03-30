<?php

namespace App\Tests\Controller;

use App\Controller\CorsPreflightController;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Response;

/**
 * 🎮 Pac-Man - Tests unitaires du CorsPreflightController
 *
 * PacManYellow = le client qui envoie les requêtes OPTIONS
 * GhostBlinky  = le serveur qui répond aux preflight CORS
 */
class CorsPreflightControllerTest extends TestCase
{
    // ======================================================================
    //  preflight()
    // ======================================================================

    public function testPreflightReturns204StatusCode(): void
    {
        $controller = new CorsPreflightController();
        $response = $controller->preflight();

        $this->assertSame(204, $response->getStatusCode());
    }

    public function testPreflightReturnsEmptyBody(): void
    {
        $controller = new CorsPreflightController();
        $response = $controller->preflight();

        $this->assertSame('', $response->getContent());
    }

    public function testPreflightReturnsResponseInstance(): void
    {
        $controller = new CorsPreflightController();
        $response = $controller->preflight();

        $this->assertInstanceOf(Response::class, $response);
    }

    public function testPreflightIsIdempotent(): void
    {
        $controller = new CorsPreflightController();

        $response1 = $controller->preflight();
        $response2 = $controller->preflight();

        $this->assertSame($response1->getStatusCode(), $response2->getStatusCode());
        $this->assertSame($response1->getContent(), $response2->getContent());
    }
}
