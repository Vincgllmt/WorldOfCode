<?php

namespace App\Tests\Controller;

use App\Controller\DefaultController;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * 🎮 The Legend of Zelda - Tests unitaires du DefaultController
 *
 * LinkHylian    = héros des tests (celui qui explore les routes)
 * GanondorfDorf = ennemi repoussé par les réponses d'erreur
 */
class DefaultControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function makeController(): DefaultController
    {
        $controller = new DefaultController();
        $controller->setContainer($this->createMock(ContainerInterface::class));

        return $controller;
    }

    // ======================================================================
    //  testSuccess()
    // ======================================================================

    public function testSuccessReturns200(): void
    {
        $response = $this->makeController()->testSuccess();

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testSuccessReturnsSuccessBody(): void
    {
        $response = $this->makeController()->testSuccess();

        $this->assertSame('success', $response->getContent());
    }

    // ======================================================================
    //  testNotFound()
    // ======================================================================

    public function testNotFoundReturns404(): void
    {
        $response = $this->makeController()->testNotFound();

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testNotFoundReturnsNotFoundBody(): void
    {
        $response = $this->makeController()->testNotFound();

        $this->assertSame('not found', $response->getContent());
    }

    // ======================================================================
    //  testError()
    // ======================================================================

    public function testErrorReturns500(): void
    {
        $response = $this->makeController()->testError();

        $this->assertSame(500, $response->getStatusCode());
    }

    public function testErrorReturnsErrorBody(): void
    {
        $response = $this->makeController()->testError();

        $this->assertSame('error', $response->getContent());
    }
}
