<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Controller\AdminChallengeController;
use App\Entity\Badge;
use App\Entity\Challenge;
use App\Entity\ChallengeSolution;
use App\Entity\ChallengeTest as ChallengeTestEntity;
use App\Service\GameRunnerInterface;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * AdminChallengeController — vue backoffice des jeux et vérification des solutions.
 */
final class AdminChallengeControllerTest extends TestCase
{
    private function makeSolution(string $language, string $code): ChallengeSolution
    {
        return (new ChallengeSolution())->setLanguage($language)->setCode($code);
    }

    /**
     * @param ChallengeSolution[] $solutions
     */
    private function makeChallenge(int $testCount = 2, array $solutions = [], ?string $refereeCode = 'REFEREE', ?string $refereeLanguage = 'python'): Challenge
    {
        $tests = [];
        for ($i = 0; $i < $testCount; ++$i) {
            $test = $this->createStub(ChallengeTestEntity::class);
            $test->method('getStdin')->willReturn('GAME_INPUT_' . $i);
            $test->method('getPosition')->willReturn($i);
            $tests[] = $test;
        }

        $badge = $this->createStub(Badge::class);
        $badge->method('getCode')->willReturn('first_solve');
        $badge->method('getName')->willReturn('Premier');
        $badge->method('getDescription')->willReturn(null);
        $badge->method('getIcon')->willReturn(null);

        $challenge = $this->createStub(Challenge::class);
        $challenge->method('getId')->willReturn(7);
        $challenge->method('getSlug')->willReturn('nier-arena');
        $challenge->method('getTitle')->willReturn('NieR Arena');
        $challenge->method('getStatement')->willReturn('Énoncé');
        $challenge->method('getDifficulty')->willReturn('medium');
        $challenge->method('getLanguages')->willReturn(['python', 'javascript']);
        $challenge->method('getMaxScore')->willReturn(100);
        $challenge->method('getImage')->willReturn(null);
        $challenge->method('getTests')->willReturn(new ArrayCollection($tests));
        $challenge->method('getBadges')->willReturn(new ArrayCollection([$badge]));
        $challenge->method('getSolutions')->willReturn(new ArrayCollection($solutions));
        $challenge->method('getRefereeCode')->willReturn($refereeCode);
        $challenge->method('getRefereeLanguage')->willReturn($refereeLanguage);
        $challenge->method('getCreatedAt')->willReturn(new \DateTime('2026-09-01T10:00:00+00:00'));
        $challenge->method('getUpdatedAt')->willReturn(new \DateTime('2026-09-14T10:00:00+00:00'));

        return $challenge;
    }

    private function makeEm(?Challenge $challenge): EntityManagerInterface
    {
        $repo = $this->createStub(EntityRepository::class);
        $repo->method('findOneBy')->willReturn($challenge);
        $repo->method('findBy')->willReturn(null === $challenge ? [] : [$challenge]);

        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('getRepository')->willReturn($repo);

        return $em;
    }

    private function makeConnection(array $submissionCounts = [], array $solvedCounts = []): Connection
    {
        $connection = $this->createStub(Connection::class);
        $connection->method('fetchAllKeyValue')->willReturnOnConsecutiveCalls($submissionCounts, $solvedCounts);

        return $connection;
    }

    private function makeResult(string $verdict, int $score = 100): array
    {
        return [
            'verdict'      => $verdict,
            'score'        => $score,
            'replay'       => ['init' => [], 'frames' => []],
            'playerStdout' => '',
            'playerStderr' => '',
            'error'        => null,
        ];
    }

    // ========== LIST ==========

    public function testListExposesCountsAndSolutionLanguages(): void
    {
        $challenge = $this->makeChallenge(3, [
            $this->makeSolution('python', 'print(1)'),
            $this->makeSolution('javascript', 'console.log(1)'),
        ]);

        $response = (new AdminChallengeController())->list(
            $this->makeEm($challenge),
            $this->makeConnection([7 => 12], [7 => 4]),
        );

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertCount(1, $data);
        $this->assertSame('nier-arena', $data[0]['slug']);
        $this->assertSame(3, $data[0]['testsCount']);
        $this->assertSame(1, $data[0]['badgesCount']);
        $this->assertSame(['python', 'javascript'], $data[0]['solutionLanguages']);
        $this->assertSame(12, $data[0]['submissionsCount']);
        $this->assertSame(4, $data[0]['solvedByCount']);
    }

    // ========== DETAIL ==========

    public function testDetailExposesRefereeTestsBadgesAndSolutions(): void
    {
        $challenge = $this->makeChallenge(2, [$this->makeSolution('python', 'print(1)')]);

        $response = (new AdminChallengeController())->detail('nier-arena', $this->makeEm($challenge));

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertSame('REFEREE', $data['refereeCode']);
        $this->assertSame('python', $data['refereeLanguage']);
        $this->assertSame([['position' => 0, 'stdin' => 'GAME_INPUT_0'], ['position' => 1, 'stdin' => 'GAME_INPUT_1']], $data['tests']);
        $this->assertSame('first_solve', $data['badges'][0]['code']);
        $this->assertSame([['language' => 'python', 'code' => 'print(1)']], $data['solutions']);
    }

    public function testDetailUnknownSlugThrowsNotFound(): void
    {
        $this->expectException(NotFoundHttpException::class);

        (new AdminChallengeController())->detail('unknown', $this->makeEm(null));
    }

    // ========== VERIFY ==========

    public function testVerifyRunsSolutionOnEveryTestCase(): void
    {
        $challenge = $this->makeChallenge(3, [$this->makeSolution('python', 'SOLUTION')]);

        $runner = $this->createMock(GameRunnerInterface::class);
        $runner->expects($this->exactly(3))
            ->method('play')
            ->with('python', 'SOLUTION', $this->stringStartsWith('GAME_INPUT_'), 'python', 'REFEREE')
            ->willReturn($this->makeResult('passed'));

        $response = (new AdminChallengeController())->verifySolution('nier-arena', 'python', $this->makeEm($challenge), $runner);

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertSame('passed', $data['verdict']);
        $this->assertSame(3, $data['testsPassed']);
        $this->assertSame(3, $data['testsTotal']);
        $this->assertCount(3, $data['results']);
        $this->assertArrayNotHasKey('replay', $data['results'][0]);
    }

    public function testVerifyOneFailingCaseReturnsFailed(): void
    {
        $challenge = $this->makeChallenge(2, [$this->makeSolution('python', 'SOLUTION')]);

        $runner = $this->createStub(GameRunnerInterface::class);
        $runner->method('play')->willReturnOnConsecutiveCalls($this->makeResult('passed'), $this->makeResult('failed', 0));

        $response = (new AdminChallengeController())->verifySolution('nier-arena', 'python', $this->makeEm($challenge), $runner);

        $data = json_decode($response->getContent(), true);
        $this->assertSame('failed', $data['verdict']);
        $this->assertSame(1, $data['testsPassed']);
        $this->assertSame(['passed', 'failed'], array_column($data['results'], 'verdict'));
    }

    public function testVerifyUnknownLanguageReturns404(): void
    {
        $challenge = $this->makeChallenge(2, [$this->makeSolution('python', 'SOLUTION')]);

        $runner = $this->createMock(GameRunnerInterface::class);
        $runner->expects($this->never())->method('play');

        $response = (new AdminChallengeController())->verifySolution('nier-arena', 'java', $this->makeEm($challenge), $runner);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testVerifyWithoutRefereeReturns422(): void
    {
        $challenge = $this->makeChallenge(2, [$this->makeSolution('python', 'SOLUTION')], null, null);

        $runner = $this->createMock(GameRunnerInterface::class);
        $runner->expects($this->never())->method('play');

        $response = (new AdminChallengeController())->verifySolution('nier-arena', 'python', $this->makeEm($challenge), $runner);

        $this->assertSame(422, $response->getStatusCode());
    }
}
