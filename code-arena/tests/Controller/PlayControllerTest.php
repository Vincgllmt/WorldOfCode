<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Controller\PlayController;
use App\Entity\Challenge;
use App\Entity\ChallengeTest as ChallengeTestEntity;
use App\Security\ArenaUser;
use App\Service\BadgeAwarderInterface;
use App\Service\GameRunnerInterface;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

/**
 * 🤖 NieR: Automata — PlayController
 *
 * TwoBWraith    = androïde qui joue les défis arbitrés par un referee (mode jeu).
 * NineSSentinel = androïde observateur (mode run-tests non noté).
 */
final class PlayControllerTest extends TestCase
{
    // 🤖 NieR: Automata credentials
    private const TWOB_ID        = 2;
    private const TWOB_USERNAME  = 'TwoBWraith';
    private const NINES_ID       = 9;
    private const NINES_USERNAME = 'NineSSentinel';

    private function makeController(ArenaUser $user): PlayController
    {
        $token = $this->createStub(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $storage = $this->createStub(TokenStorageInterface::class);
        $storage->method('getToken')->willReturn($token);

        $container = $this->createStub(ContainerInterface::class);
        $container->method('has')->willReturn(true);
        $container->method('get')->willReturnMap([['security.token_storage', $storage]]);

        $controller = new PlayController();
        $controller->setContainer($container);

        return $controller;
    }

    private function makeChallenge(int $testCount = 2, ?string $refereeCode = 'REFEREE', ?string $refereeLanguage = 'python'): Challenge
    {
        $tests = [];
        for ($i = 0; $i < $testCount; ++$i) {
            $test = $this->createStub(ChallengeTestEntity::class);
            $test->method('getStdin')->willReturn('GAME_INPUT_' . $i);
            $tests[] = $test;
        }

        $challenge = $this->createStub(Challenge::class);
        $challenge->method('getSlug')->willReturn('nier-arena');
        $challenge->method('getLanguages')->willReturn(['python']);
        $challenge->method('getMaxScore')->willReturn(100);
        $challenge->method('getTests')->willReturn(new ArrayCollection($tests));
        $challenge->method('getBadges')->willReturn(new ArrayCollection());
        $challenge->method('getRefereeCode')->willReturn($refereeCode);
        $challenge->method('getRefereeLanguage')->willReturn($refereeLanguage);

        return $challenge;
    }

    private function makeEm(?Challenge $challenge): EntityManagerInterface
    {
        $repo = $this->createStub(EntityRepository::class);
        $repo->method('findOneBy')->willReturn($challenge);

        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('getRepository')->willReturn($repo);

        return $em;
    }

    private function makePassedResult(): array
    {
        return [
            'verdict'      => 'passed',
            'score'        => 100,
            'replay'       => ['init' => [], 'frames' => []],
            'playerStdout' => 'RRDDR',
            'playerStderr' => '',
            'error'        => null,
        ];
    }

    private function playRequest(string $slug, array $payload): Request
    {
        return Request::create('/api/arena/challenges/' . $slug . '/play', 'POST', [], [], [], [], json_encode($payload));
    }

    private function runTestsRequest(string $slug, array $payload): Request
    {
        return Request::create('/api/arena/challenges/' . $slug . '/run-tests', 'POST', [], [], [], [], json_encode($payload));
    }

    // ========== OK — PLAY ==========

    /**
     * Tous les cas passés → verdict "passed", score maximal, badges attribués.
     */
    public function testPlayAllCasesPassedReturnsPassed(): void
    {
        $runner = $this->createStub(GameRunnerInterface::class);
        $runner->method('play')->willReturn($this->makePassedResult());

        $awarder = $this->createStub(BadgeAwarderInterface::class);
        $awarder->method('award')->willReturn(['first_solve', 'perfect']);

        $response = $this->makeController(new ArenaUser(self::TWOB_ID, self::TWOB_USERNAME))->play(
            'nier-arena',
            $this->playRequest('nier-arena', ['language' => 'python', 'code' => 'print("RRDDR")']),
            $this->makeEm($this->makeChallenge(2)),
            $runner,
            $awarder,
        );

        $this->assertSame(201, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertSame('passed', $data['verdict']);
        $this->assertSame(100, $data['score']);
        $this->assertSame(2, $data['testsPassed']);
        $this->assertSame(2, $data['testsTotal']);
        $this->assertCount(2, $data['results']);
        $this->assertContains('first_solve', $data['badgesAwarded']);
    }

    /**
     * Un cas échoué → verdict "failed", score proportionnel, aucun badge.
     */
    public function testPlayOneFailedCaseReturnsFailed(): void
    {
        $callCount = 0;
        $runner = $this->createStub(GameRunnerInterface::class);
        $runner->method('play')->willReturnCallback(function () use (&$callCount): array {
            return [
                'verdict'      => ++$callCount === 1 ? 'passed' : 'failed',
                'score'        => $callCount === 1 ? 100 : 0,
                'replay'       => null,
                'playerStdout' => '',
                'playerStderr' => '',
                'error'        => null,
            ];
        });

        $awarder = $this->createStub(BadgeAwarderInterface::class);
        $awarder->method('award')->willReturn([]);

        $response = $this->makeController(new ArenaUser(self::TWOB_ID, self::TWOB_USERNAME))->play(
            'nier-arena',
            $this->playRequest('nier-arena', ['language' => 'python', 'code' => 'print(...)']),
            $this->makeEm($this->makeChallenge(2)),
            $runner,
            $awarder,
        );

        $this->assertSame(201, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertSame('failed', $data['verdict']);
        $this->assertSame(1, $data['testsPassed']);
        $this->assertSame(50, $data['score']);
        $this->assertEmpty($data['badgesAwarded']);
    }

    /**
     * Les badges ne sont pas attribués si le statut est "failed".
     */
    public function testPlayFailedStatusNeverCallsBadgeAwarder(): void
    {
        $runner = $this->createStub(GameRunnerInterface::class);
        $runner->method('play')->willReturn([
            'verdict' => 'failed', 'score' => 0, 'replay' => null,
            'playerStdout' => '', 'playerStderr' => '', 'error' => null,
        ]);

        $awarder = $this->createMock(BadgeAwarderInterface::class);
        $awarder->expects($this->never())->method('award');

        $response = $this->makeController(new ArenaUser(self::TWOB_ID, self::TWOB_USERNAME))->play(
            'nier-arena',
            $this->playRequest('nier-arena', ['language' => 'python', 'code' => 'pass']),
            $this->makeEm($this->makeChallenge(1)),
            $runner,
            $awarder,
        );

        $data = json_decode($response->getContent(), true);
        $this->assertSame('failed', $data['verdict']);
        $this->assertEmpty($data['badgesAwarded']);
    }

    // ========== OK — RUN-TESTS ==========

    /**
     * run-tests retourne les résultats sans persister de soumission.
     */
    public function testRunTestsReturnsResultsWithoutPersisting(): void
    {
        $runner = $this->createStub(GameRunnerInterface::class);
        $runner->method('play')->willReturn($this->makePassedResult());

        $repo = $this->createStub(EntityRepository::class);
        $repo->method('findOneBy')->willReturn($this->makeChallenge(3));

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->never())->method('persist');
        $em->expects($this->never())->method('flush');
        $em->method('getRepository')->willReturn($repo);

        $response = $this->makeController(new ArenaUser(self::NINES_ID, self::NINES_USERNAME))->runTests(
            'nier-arena',
            $this->runTestsRequest('nier-arena', ['language' => 'python', 'code' => 'print("RRDDR")']),
            $em,
            $runner,
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertArrayHasKey('results', json_decode($response->getContent(), true));
    }

    /**
     * run-tests avec testIndex exécute uniquement le cas demandé.
     */
    public function testRunTestsSingleIndexRunsOnlyThatCase(): void
    {
        $runner = $this->createStub(GameRunnerInterface::class);
        $runner->method('play')->willReturn($this->makePassedResult());

        $response = $this->makeController(new ArenaUser(self::NINES_ID, self::NINES_USERNAME))->runTests(
            'nier-arena',
            $this->runTestsRequest('nier-arena', ['language' => 'python', 'code' => 'print("RRDDR")', 'testIndex' => 1]),
            $this->makeEm($this->makeChallenge(3)),
            $runner,
        );

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertCount(1, $data['results']);
        $this->assertSame(1, $data['results'][0]['index']);
    }

    // ========== NOK ==========

    /**
     * Un défi sans referee retourne 422 Unprocessable Entity.
     */
    public function testPlayWithoutRefereeReturns422(): void
    {
        $runner = $this->createStub(GameRunnerInterface::class);
        $awarder = $this->createStub(BadgeAwarderInterface::class);

        $response = $this->makeController(new ArenaUser(self::TWOB_ID, self::TWOB_USERNAME))->play(
            'nier-arena',
            $this->playRequest('nier-arena', ['language' => 'python', 'code' => 'pass']),
            $this->makeEm($this->makeChallenge(1, null, null)),
            $runner,
            $awarder,
        );

        $this->assertSame(422, $response->getStatusCode());
        $this->assertStringContainsString('referee', json_decode($response->getContent(), true)['error']);
    }

    /**
     * Un payload sans "language" retourne 400.
     */
    public function testPlayMissingLanguageReturnsBadRequest(): void
    {
        $runner = $this->createStub(GameRunnerInterface::class);
        $awarder = $this->createStub(BadgeAwarderInterface::class);

        $response = $this->makeController(new ArenaUser(self::TWOB_ID, self::TWOB_USERNAME))->play(
            'nier-arena',
            $this->playRequest('nier-arena', ['code' => 'print("ok")']),
            $this->makeEm($this->makeChallenge()),
            $runner,
            $awarder,
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    /**
     * Un langage non supporté par le défi retourne 400.
     */
    public function testPlayUnsupportedLanguageReturnsBadRequest(): void
    {
        $runner = $this->createStub(GameRunnerInterface::class);
        $awarder = $this->createStub(BadgeAwarderInterface::class);

        $response = $this->makeController(new ArenaUser(self::TWOB_ID, self::TWOB_USERNAME))->play(
            'nier-arena',
            $this->playRequest('nier-arena', ['language' => 'cobol', 'code' => 'DISPLAY "GLORY TO MANKIND"']),
            $this->makeEm($this->makeChallenge()),
            $runner,
            $awarder,
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    /**
     * Jouer sur un défi inexistant lève une NotFoundHttpException (→ 404).
     */
    public function testPlayUnknownChallengeThrowsNotFound(): void
    {
        $this->expectException(NotFoundHttpException::class);

        $runner = $this->createStub(GameRunnerInterface::class);
        $awarder = $this->createStub(BadgeAwarderInterface::class);

        $this->makeController(new ArenaUser(self::TWOB_ID, self::TWOB_USERNAME))->play(
            'machine-uprising',
            $this->playRequest('machine-uprising', ['language' => 'python', 'code' => 'pass']),
            $this->makeEm(null),
            $runner,
            $awarder,
        );
    }
}
