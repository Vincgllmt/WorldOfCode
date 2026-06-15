<?php

namespace App\Tests\EventListener;

use App\EventListener\SecurityHeadersSubscriber;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;

/**
 * SEC-19 : vérifie que les en-têtes de sécurité sont bien posés sur les réponses.
 */
class SecurityHeadersSubscriberTest extends TestCase
{
    private function dispatch(Request $request, int $requestType = HttpKernelInterface::MAIN_REQUEST): Response
    {
        $kernel   = $this->createMock(HttpKernelInterface::class);
        $response = new Response();
        $event    = new ResponseEvent($kernel, $request, $requestType, $response);

        (new SecurityHeadersSubscriber())($event);

        return $event->getResponse();
    }

    public function testSetsCoreSecurityHeaders(): void
    {
        $response = $this->dispatch(Request::create('http://woc.test/api/me'));

        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        $this->assertSame('DENY', $response->headers->get('X-Frame-Options'));
        $this->assertSame('strict-origin-when-cross-origin', $response->headers->get('Referrer-Policy'));
        $this->assertSame("frame-ancestors 'none'", $response->headers->get('Content-Security-Policy'));
        $this->assertNotNull($response->headers->get('Permissions-Policy'));
    }

    public function testHstsOnlyOnHttps(): void
    {
        $http = $this->dispatch(Request::create('http://woc.test/api/me'));
        $this->assertFalse($http->headers->has('Strict-Transport-Security'));

        $https = $this->dispatch(Request::create('https://woc.test/api/me'));
        $this->assertStringContainsString('max-age=', (string) $https->headers->get('Strict-Transport-Security'));
    }

    public function testDoesNothingOnSubRequest(): void
    {
        $response = $this->dispatch(Request::create('http://woc.test/api/me'), HttpKernelInterface::SUB_REQUEST);

        $this->assertFalse($response->headers->has('X-Frame-Options'));
    }
}
