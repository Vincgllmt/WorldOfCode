<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\GameRunner;
use App\Service\PistonClientInterface;
use PHPUnit\Framework\TestCase;

final class GameRunnerTest extends TestCase
{
    /** @var list<array{lang: string, code: string, stdin: ?string}> */
    private array $calls = [];

    private function pistonReturning(string $playerStdout, array $refereeResult): PistonClientInterface
    {
        $this->calls = [];
        $piston = $this->createStub(PistonClientInterface::class);
        $piston->method('execute')->willReturnCallback(
            function (string $lang, string $code, ?string $stdin) use ($playerStdout, $refereeResult): array {
                $this->calls[] = ['lang' => $lang, 'code' => $code, 'stdin' => $stdin];

                // 1er appel = code joueur, 2e = referee
                if (1 === count($this->calls)) {
                    return ['stdout' => $playerStdout, 'stderr' => '', 'exitCode' => 0, 'timedOut' => false];
                }

                return $refereeResult;
            },
        );

        return $piston;
    }

    public function testReturnsRefereeVerdictScoreAndReplay(): void
    {
        $referee = [
            'stdout' => json_encode([
                'verdict' => 'passed',
                'score' => 100,
                'replay' => ['init' => ['cols' => 4], 'frames' => [['pos' => [0, 0]], ['pos' => [1, 0]]]],
            ]),
            'stderr' => '',
            'exitCode' => 0,
            'timedOut' => false,
        ];

        $runner = new GameRunner($this->pistonReturning('RRDDR', $referee));
        $result = $runner->play('python', 'print(1)', 'GAME_INPUT', 'python', 'REFEREE_CODE');

        self::assertSame('passed', $result['verdict']);
        self::assertSame(100, $result['score']);
        self::assertSame(['cols' => 4], $result['replay']['init']);
        self::assertCount(2, $result['replay']['frames']);
        self::assertNull($result['error']);
    }

    public function testPlayerReceivesInputAndRefereeReceivesInputOutputJson(): void
    {
        $referee = [
            'stdout' => json_encode(['verdict' => 'failed', 'score' => 0, 'replay' => ['init' => [], 'frames' => []]]),
            'stderr' => '',
            'exitCode' => 0,
            'timedOut' => false,
        ];

        $runner = new GameRunner($this->pistonReturning('RRDDR', $referee));
        $runner->play('python', 'print(1)', 'GAME_INPUT', 'python', 'REFEREE_CODE');

        // Le code joueur reçoit l'input du jeu sur stdin.
        self::assertSame('GAME_INPUT', $this->calls[0]['stdin']);

        // Le referee reçoit {input, output} en JSON.
        $refereeStdin = json_decode((string) $this->calls[1]['stdin'], true);
        self::assertSame('GAME_INPUT', $refereeStdin['input']);
        self::assertSame('RRDDR', $refereeStdin['output']);
    }

    public function testInvalidRefereeOutputYieldsErrorVerdict(): void
    {
        $referee = ['stdout' => 'pas du json', 'stderr' => 'boom', 'exitCode' => 1, 'timedOut' => false];

        $runner = new GameRunner($this->pistonReturning('RRDDR', $referee));
        $result = $runner->play('python', 'print(1)', 'GAME_INPUT', 'python', 'REFEREE_CODE');

        self::assertSame('error', $result['verdict']);
        self::assertSame(0, $result['score']);
        self::assertNull($result['replay']);
        self::assertNotNull($result['error']);
    }

    public function testPlayerStdoutAndStderrAreForwardedInResult(): void
    {
        $referee = [
            'stdout' => json_encode(['verdict' => 'failed', 'score' => 0, 'replay' => ['init' => [], 'frames' => []]]),
            'stderr' => '',
            'exitCode' => 0,
            'timedOut' => false,
        ];

        $runner = new GameRunner($this->pistonReturning('PLAYER_OUT', $referee));
        $result = $runner->play('python', 'print(1)', 'GAME_INPUT', 'python', 'REFEREE_CODE');

        self::assertSame('PLAYER_OUT', $result['playerStdout']);
        self::assertSame('', $result['playerStderr']);
    }

    public function testRefereeErrorMessageContainsRefereeStderr(): void
    {
        $referee = ['stdout' => '', 'stderr' => 'SyntaxError: unexpected token', 'exitCode' => 1, 'timedOut' => false];

        $runner = new GameRunner($this->pistonReturning('', $referee));
        $result = $runner->play('python', 'print(1)', 'GAME_INPUT', 'python', 'REFEREE_CODE');

        self::assertSame('error', $result['verdict']);
        self::assertStringContainsString('SyntaxError: unexpected token', (string) $result['error']);
    }
}
