<?php

namespace App\Tests\Service\Mentoring;

use App\Service\Mentoring\MentoringRequestService;
use PHPUnit\Framework\TestCase;

class MentoringRequestServiceTest extends TestCase
{
    private MentoringRequestService $service;

    protected function setUp(): void
    {
        $this->service = new MentoringRequestService();
    }

    public function testCreateDoesNotThrow(): void
    {
        $this->service->create();
        $this->assertTrue(true);
    }

    public function testMakePublicDoesNotThrow(): void
    {
        $this->service->makePublic();
        $this->assertTrue(true);
    }

    public function testCancelDoesNotThrow(): void
    {
        $this->service->cancel();
        $this->assertTrue(true);
    }
}
