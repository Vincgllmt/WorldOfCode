<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Controller\SubmissionController;
use App\Entity\Challenge;
use App\Entity\ChallengeTest as ChallengeTestEntity;
use App\Entity\Submission;
use App\Security\ArenaUser;
use App\Service\BadgeAwarderInterface;
use App\Service\PistonClientInterface;
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
 * 🌸 Celeste — SubmissionController
 *
 * MadelineVardas = grimpeuse qui soumet son code pour escalader les défis.
 */
final class SubmissionControllerTest extends TestCase
{
    // 🌸 Celeste credentials
    private const USER_ID  = 33;
    private const USERNAME = 'MadelineVardas';

    private function makeController(ArenaUser $user): SubmissionController
    {
        $token = $this->createStub(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $storage = $this->createStub(TokenStorageInterface::class);
        $storage->method('getToken')->willReturn($token);

        $container = $this->createStub(ContainerInterface::class);
        $container->method('has')->willReturn(true);
        $container->method('get')->willReturnMap([['security.token_storage', $storage]]);

        $piston  = $this->createStub(PistonClientInterface::class);
        $awarder = $this->createStub(BadgeAwarderInterface::class);

        $controller = new SubmissionController($piston, $awarder);
        $controller->setContainer($container);

        return $controller;
    }

    private function makeControllerWith(ArenaUser $user, PistonClientInterface $piston, BadgeAwarderInterface $awarder): SubmissionController
    {
        $token = $this->createStub(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $storage = $this->createStub(TokenStorageInterface::class);
        $storage->method('getToken')->willReturn($token);

        $container = $this->createStub(ContainerInterface::class);
        $container->method('has')->willReturn(true);
        $container->method('get')->willReturnMap([['security.token_storage', $storage]]);

        $controller = new SubmissionController($piston, $awarder);
        $controller->setContainer($container);

        return $controller;
    }

    /**
     * @param string[] $expectedOutputs
     */
    private function makeChallenge(array $expectedOutputs = ['YES'], string $slug = 'celeste-mountain'): Challenge
    {
        $tests = array_map(function (string $expected): ChallengeTestEntity {
            $test = $this->createStub(ChallengeTestEntity::class);
            $test->method('getStdin')->willReturn('3 3');
            $test->method('getExpectedOutput')->willReturn($expected);
            $test->method('getWeight')->willReturn(1);
            return $test;
        }, $expectedOutputs);

        $challenge = $this->createStub(Challenge::class);
        $challenge->method('getSlug')->willReturn($slug);
        $challenge->method('getLanguages')->willReturn(['python', 'javascript']);
        $challenge->method('getMaxScore')->willReturn(100);
        $challenge->method('getTests')->willReturn(new ArrayCollection($tests));
        $challenge->method('getBadges')->willReturn(new ArrayCollection());

        return $challenge;
    }

    private function makeEm(?Challenge $challenge, ?Submission $submission = null): EntityManagerInterface
    {
        $challengeRepo = $this->createStub(EntityRepository::class);
        $challengeRepo->method('findOneBy')->willReturn($challenge);

        $submissionRepo = $this->createStub(EntityRepository::class);
        $submissionRepo->method('find')->willReturn($submission);

        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('getRepository')->willReturnMap([
            [Challenge::class, $challengeRepo],
            [Submission::class, $submissionRepo],
        ]);

        return $em;
    }

    private function submitRequest(string $slug, array $payload): Request
    {
        return Request::create('/api/arena/challenges/' . $slug . '/submit', 'POST', [], [], [], [], json_encode($payload));
    }

    // ========== OK — SUBMIT ==========

    /**
     * MadelineVardas soumet un code correct : tous les tests passent → "passed", score max.
     */
    public function testSubmitAllTestsPassedReturnsPassed(): void
    {
        $user = new ArenaUser(self::USER_ID, self::USERNAME);

        $piston = $this->createStub(PistonClientInterface::class);
        $piston->method('execute')->willReturn(['stdout' => 'YES', 'stderr' => '', 'exitCode' => 0, 'timedOut' => false]);

        $awarder = $this->createStub(BadgeAwarderInterface::class);
        $awarder->method('award')->willReturn(['perfect']);

        $response = $this->makeControllerWith($user, $piston, $awarder)->submit(
            'celeste-mountain',
            $this->submitRequest('celeste-mountain', ['language' => 'python', 'code' => 'print("YES")']),
            $this->makeEm($this->makeChallenge(['YES', 'YES'])),
        );

        $this->assertSame(201, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertSame('passed', $data['status']);
        $this->assertSame(100, $data['score']);
        $this->assertSame(2, $data['testsPassed']);
        $this->assertContains('perfect', $data['badgesAwarded']);
    }

    /**
     * Une soumission partielle retourne "failed" avec score proportionnel, sans badge.
     */
    public function testSubmitPartialPassReturnsFailedWithPartialScore(): void
    {
        $user = new ArenaUser(self::USER_ID, self::USERNAME);

        $callCount = 0;
        $piston = $this->createStub(PistonClientInterface::class);
        $piston->method('execute')->willReturnCallback(function () use (&$callCount): array {
            return ['stdout' => ++$callCount === 1 ? 'YES' : 'WRONG', 'stderr' => '', 'exitCode' => 0, 'timedOut' => false];
        });

        $awarder = $this->createStub(BadgeAwarderInterface::class);
        $awarder->method('award')->willReturn([]);

        $response = $this->makeControllerWith($user, $piston, $awarder)->submit(
            'celeste-mountain',
            $this->submitRequest('celeste-mountain', ['language' => 'python', 'code' => 'print(...)']),
            $this->makeEm($this->makeChallenge(['YES', 'NO'])),
        );

        $this->assertSame(201, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertSame('failed', $data['status']);
        $this->assertSame(1, $data['testsPassed']);
        $this->assertSame(50, $data['score']);
        $this->assertEmpty($data['badgesAwarded']);
    }

    /**
     * Les badges ne sont pas attribués quand le statut est "failed".
     */
    public function testSubmitFailedStatusNeverCallsBadgeAwarder(): void
    {
        $user = new ArenaUser(self::USER_ID, self::USERNAME);

        $piston = $this->createStub(PistonClientInterface::class);
        $piston->method('execute')->willReturn(['stdout' => 'WRONG', 'stderr' => '', 'exitCode' => 0, 'timedOut' => false]);

        $awarder = $this->createMock(BadgeAwarderInterface::class);
        $awarder->expects($this->never())->method('award');

        $response = $this->makeControllerWith($user, $piston, $awarder)->submit(
            'celeste-mountain',
            $this->submitRequest('celeste-mountain', ['language' => 'python', 'code' => 'print("WRONG")']),
            $this->makeEm($this->makeChallenge(['42'])),
        );

        $this->assertSame('failed', json_decode($response->getContent(), true)['status']);
    }

    /**
     * Un défi sans aucun cas de test (poids total nul) retourne "failed" avec un score de 0.
     */
    public function testSubmitWithNoTestsReturnsFailedWithZeroScore(): void
    {
        $user = new ArenaUser(self::USER_ID, self::USERNAME);

        $piston = $this->createStub(PistonClientInterface::class);
        $awarder = $this->createStub(BadgeAwarderInterface::class);

        $response = $this->makeControllerWith($user, $piston, $awarder)->submit(
            'celeste-mountain',
            $this->submitRequest('celeste-mountain', ['language' => 'python', 'code' => 'pass']),
            $this->makeEm($this->makeChallenge([])),
        );

        $this->assertSame(201, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertSame('failed', $data['status']);
        $this->assertSame(0, $data['score']);
    }

    // ========== OK — GET SUBMISSION ==========

    /**
     * MadelineVardas récupère sa propre soumission.
     */
    public function testGetOwnSubmissionReturnsData(): void
    {
        $challenge = $this->makeChallenge();
        $challenge->method('getSlug')->willReturn('celeste-mountain');

        $submission = $this->createStub(Submission::class);
        $submission->method('getId')->willReturn(99);
        $submission->method('getUserId')->willReturn(self::USER_ID);
        $submission->method('getChallenge')->willReturn($challenge);
        $submission->method('getLanguage')->willReturn('python');
        $submission->method('getStatus')->willReturn('passed');
        $submission->method('getScore')->willReturn(100);
        $submission->method('getTestsPassed')->willReturn(1);
        $submission->method('getTestsTotal')->willReturn(1);
        $submission->method('getCreatedAt')->willReturn(new \DateTime('2025-03-01'));

        $response = $this->makeController(new ArenaUser(self::USER_ID, self::USERNAME))
            ->get(99, $this->makeEm($challenge, $submission));

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertSame(99, $data['id']);
        $this->assertSame('celeste-mountain', $data['challengeSlug']);
        $this->assertSame('passed', $data['status']);
    }

    // ========== NOK — SUBMIT ==========

    /**
     * Un payload sans "language" retourne 400.
     */
    public function testSubmitMissingLanguageReturnsBadRequest(): void
    {
        $response = $this->makeController(new ArenaUser(self::USER_ID, self::USERNAME))->submit(
            'celeste-mountain',
            $this->submitRequest('celeste-mountain', ['code' => 'print("ok")']),
            $this->makeEm($this->makeChallenge()),
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    /**
     * Un langage non autorisé par le défi retourne 400 avec message d'erreur.
     */
    public function testSubmitForbiddenLanguageReturnsBadRequest(): void
    {
        $response = $this->makeController(new ArenaUser(self::USER_ID, self::USERNAME))->submit(
            'celeste-mountain',
            $this->submitRequest('celeste-mountain', ['language' => 'java', 'code' => 'pass']),
            $this->makeEm($this->makeChallenge()),
        );

        $this->assertSame(400, $response->getStatusCode());
        $this->assertStringContainsString('java', json_decode($response->getContent(), true)['error']);
    }

    /**
     * Soumettre sur un défi inexistant lève une NotFoundHttpException (→ 404).
     */
    public function testSubmitUnknownChallengeThrowsNotFound(): void
    {
        $this->expectException(NotFoundHttpException::class);

        $this->makeController(new ArenaUser(self::USER_ID, self::USERNAME))->submit(
            'mountain-of-dawn',
            $this->submitRequest('mountain-of-dawn', ['language' => 'python', 'code' => 'pass']),
            $this->makeEm(null),
        );
    }

    // ========== NOK — GET SUBMISSION ==========

    /**
     * Consulter la soumission d'un autre utilisateur retourne 403.
     */
    public function testGetSubmissionOfOtherUserReturnsForbidden(): void
    {
        $submission = $this->createStub(Submission::class);
        $submission->method('getUserId')->willReturn(self::USER_ID + 100);

        $response = $this->makeController(new ArenaUser(self::USER_ID, self::USERNAME))
            ->get(5, $this->makeEm($this->makeChallenge(), $submission));

        $this->assertSame(403, $response->getStatusCode());
    }

    /**
     * Consulter une soumission inexistante lève une NotFoundHttpException (→ 404).
     */
    public function testGetSubmissionNotFoundThrowsNotFound(): void
    {
        $this->expectException(NotFoundHttpException::class);

        $this->makeController(new ArenaUser(self::USER_ID, self::USERNAME))
            ->get(9999, $this->makeEm($this->makeChallenge(), null));
    }
}
