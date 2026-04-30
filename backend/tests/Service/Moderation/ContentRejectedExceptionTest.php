<?php

declare(strict_types=1);

namespace App\Tests\Service\Moderation;

use App\Service\Moderation\ContentRejectedException;
use PHPUnit\Framework\TestCase;

class ContentRejectedExceptionTest extends TestCase
{
    public function testMessageEstAccessible(): void
    {
        $exception = new ContentRejectedException('Contenu refusé.');
        $this->assertSame('Contenu refusé.', $exception->getMessage());
    }

    public function testGetDetailsRetourneTableauVideParDefaut(): void
    {
        $exception = new ContentRejectedException('Refusé.');
        $this->assertSame([], $exception->getDetails());
    }

    public function testGetDetailsRetourneTableauPasse(): void
    {
        $details = [
            'blocklist' => ['severe' => ['nazi'], 'warning' => [], 'urls' => []],
            'pii' => ['email'],
        ];
        $exception = new ContentRejectedException('Refusé.', $details);
        $this->assertSame($details, $exception->getDetails());
    }

    public function testEstUneRuntimeException(): void
    {
        $exception = new ContentRejectedException('Refusé.');
        $this->assertInstanceOf(\RuntimeException::class, $exception);
    }
}
