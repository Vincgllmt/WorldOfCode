<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Controller\HealthController;
use PHPUnit\Framework\TestCase;

/**
 * 🏗️ Terraria — HealthController
 *
 * Pas d'utilisateur requis : l'endpoint /health est en accès public.
 */
final class HealthControllerTest extends TestCase
{
    // ========== OK ==========

    /**
     * L'endpoint health retourne le statut du service code-arena.
     */
    public function testHealthReturnsOkWithServiceName(): void
    {
        $response = (new HealthController())->health();

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertSame('ok', $data['status']);
        $this->assertSame('code-arena', $data['service']);
    }
}
