<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Controller\RunController;
use App\Service\PistonClientInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * 🏃 Mirror's Edge — RunController
 *
 * FaithConnors = développeuse qui exécute du code en sandbox (mode REPL).
 */
final class RunControllerTest extends TestCase
{
    // 🏃 Mirror's Edge credentials
    private const USERNAME = 'FaithConnors';

    private function makeRequest(array $body): Request
    {
        return Request::create('/', 'POST', [], [], [], [], json_encode($body));
    }

    private function controllerWith(array $pistonResult): RunController
    {
        $piston = $this->createStub(PistonClientInterface::class);
        $piston->method('execute')->willReturn($pistonResult);

        return new RunController($piston);
    }

    // ========== OK ==========

    /**
     * FaithConnors exécute du Python valide et reçoit stdout/stderr/exitCode/timedOut.
     */
    public function testRunValidPythonCodeReturnsOutput(): void
    {
        $controller = $this->controllerWith(
            ['stdout' => "Hello, Faith!\n", 'stderr' => '', 'exitCode' => 0, 'timedOut' => false],
        );

        $response = $controller->run($this->makeRequest([
            'language' => 'python',
            'code'     => 'print("Hello, ' . self::USERNAME . '!")',
        ]));

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertSame("Hello, Faith!\n", $data['stdout']);
        $this->assertSame(0, $data['exitCode']);
        $this->assertFalse($data['timedOut']);
    }

    /**
     * Un stdin optionnel est transmis au service Piston.
     */
    public function testRunWithStdinPassesItToPiston(): void
    {
        $captured = [];
        $piston = $this->createStub(PistonClientInterface::class);
        $piston->method('execute')->willReturnCallback(
            function (string $lang, string $code, ?string $stdin) use (&$captured): array {
                $captured['stdin'] = $stdin;
                return ['stdout' => $stdin ?? '', 'stderr' => '', 'exitCode' => 0, 'timedOut' => false];
            },
        );

        $response = (new RunController($piston))->run(
            $this->makeRequest(['language' => 'python', 'code' => 'print(input())', 'stdin' => 'Runner']),
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('Runner', $captured['stdin']);
    }

    /**
     * Un code qui timeout est signalé timedOut=true dans la réponse.
     */
    public function testRunTimedOutCodeIsReportedInResponse(): void
    {
        $controller = $this->controllerWith(
            ['stdout' => '', 'stderr' => '', 'exitCode' => 137, 'timedOut' => true],
        );

        $data = json_decode(
            $controller->run($this->makeRequest(['language' => 'python', 'code' => 'while True: pass']))->getContent(),
            true,
        );

        $this->assertTrue($data['timedOut']);
    }

    // ========== NOK ==========

    /**
     * Un payload sans "language" retourne 400.
     */
    public function testRunMissingLanguageReturnsBadRequest(): void
    {
        $response = $this->controllerWith([])->run($this->makeRequest(['code' => 'print(1)']));

        $this->assertSame(400, $response->getStatusCode());
    }

    /**
     * Un payload sans "code" retourne 400.
     */
    public function testRunMissingCodeReturnsBadRequest(): void
    {
        $response = $this->controllerWith([])->run($this->makeRequest(['language' => 'python']));

        $this->assertSame(400, $response->getStatusCode());
    }

    /**
     * Un langage non supporté retourne 400 avec message d'erreur.
     */
    public function testRunUnsupportedLanguageReturnsBadRequest(): void
    {
        $response = $this->controllerWith([])->run(
            $this->makeRequest(['language' => 'cobol', 'code' => 'DISPLAY "RUNNER"']),
        );

        $this->assertSame(400, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertStringContainsString('cobol', $data['error']);
    }

    /**
     * Un corps JSON vide retourne 400.
     */
    public function testRunEmptyBodyReturnsBadRequest(): void
    {
        $response = $this->controllerWith([])->run(Request::create('/', 'POST', [], [], [], [], '{}'));

        $this->assertSame(400, $response->getStatusCode());
    }
}
