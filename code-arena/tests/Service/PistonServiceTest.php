<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\PistonService;
use PHPUnit\Framework\TestCase;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

final class PistonServiceTest extends TestCase
{
    public function testExecuteShapesRequestAndParsesResponse(): void
    {
        $response = $this->createStub(ResponseInterface::class);
        $response->method('toArray')->willReturn([
            'run' => ['stdout' => "5\n", 'stderr' => '', 'code' => 0],
        ]);

        $captured = [];
        $http = $this->createStub(HttpClientInterface::class);
        $http->method('request')->willReturnCallback(
            function (string $method, string $url, array $options) use (&$captured, $response): ResponseInterface {
                $captured = ['method' => $method, 'url' => $url, 'options' => $options];

                return $response;
            },
        );

        $service = new PistonService($http, 'http://piston:2000');
        $result = $service->execute('cpp', 'int main(){}', 'ENTREE');

        // Réponse parsée
        self::assertSame("5\n", $result['stdout']);
        self::assertSame(0, $result['exitCode']);
        self::assertFalse($result['timedOut']);

        // Requête bien formée
        self::assertSame('POST', $captured['method']);
        self::assertStringContainsString('/api/v2/execute', $captured['url']);

        $json = $captured['options']['json'];
        self::assertSame('c++', $json['language']);           // mapping cpp -> c++
        self::assertSame('main.cpp', $json['files'][0]['name']); // bon nom de fichier
        self::assertSame('int main(){}', $json['files'][0]['content']);
        self::assertSame('ENTREE', $json['stdin']);
    }

    public function testSigkillIsReportedAsTimedOut(): void
    {
        $response = $this->createStub(ResponseInterface::class);
        $response->method('toArray')->willReturn([
            'run' => ['stdout' => '', 'stderr' => '', 'code' => 137, 'signal' => 'SIGKILL'],
        ]);
        $http = $this->createStub(HttpClientInterface::class);
        $http->method('request')->willReturn($response);

        $result = (new PistonService($http, 'http://piston:2000'))->execute('python', 'while True: pass');

        self::assertTrue($result['timedOut']);
    }
}
