<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Entity\Badge;
use App\Entity\Challenge;
use App\Entity\UserBadge;
use App\Service\BadgeAwarder;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Query;
use Doctrine\ORM\EntityRepository;
use PHPUnit\Framework\TestCase;

final class BadgeAwarderTest extends TestCase
{
    /**
     * Crée un stub Badge avec le code et l'id fournis.
     */
    private function makeBadge(string $code, int $id = 1): Badge
    {
        $badge = $this->createStub(Badge::class);
        $badge->method('getCode')->willReturn($code);
        $badge->method('getId')->willReturn($id);

        return $badge;
    }

    /**
     * Crée un stub Challenge portant une liste de badges.
     *
     * @param Badge[] $badges
     */
    private function makeChallenge(array $badges): Challenge
    {
        $challenge = $this->createStub(Challenge::class);
        $challenge->method('getBadges')->willReturn(new ArrayCollection($badges));

        return $challenge;
    }

    /**
     * Crée un EntityManager stubé.
     *
     * @param bool $userAlreadyHasBadge Indique si UserBadge existe déjà pour cet utilisateur.
     * @param int  $passedCount         Nombre de soumissions "passed" existantes (pour first_solve).
     */
    private function makeEm(bool $userAlreadyHasBadge, int $passedCount): EntityManagerInterface
    {
        $query = $this->createStub(Query::class);
        $query->method('setParameter')->willReturnSelf();
        $query->method('getSingleScalarResult')->willReturn($passedCount);

        $userBadgeRepo = $this->createStub(EntityRepository::class);
        $userBadgeRepo->method('findOneBy')->willReturn($userAlreadyHasBadge ? new UserBadge() : null);

        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('getRepository')->willReturn($userBadgeRepo);
        $em->method('createQuery')->willReturn($query);

        return $em;
    }

    public function testAwardsPerfectBadgeWhenAllTestsPassed(): void
    {
        $challenge = $this->makeChallenge([$this->makeBadge('perfect')]);
        $em = $this->makeEm(false, 0);

        $awarded = (new BadgeAwarder())->award($em, $challenge, 42, 5, 5);

        self::assertContains('perfect', $awarded);
    }

    public function testDoesNotAwardPerfectWhenSomeTestsFailed(): void
    {
        $challenge = $this->makeChallenge([$this->makeBadge('perfect')]);
        $em = $this->makeEm(false, 0);

        $awarded = (new BadgeAwarder())->award($em, $challenge, 42, 4, 5);

        self::assertEmpty($awarded);
    }

    public function testAwardsFirstSolveBadgeWhenNoPreviousPassedSubmission(): void
    {
        $challenge = $this->makeChallenge([$this->makeBadge('first_solve')]);
        $em = $this->makeEm(false, 0); // 0 soumissions "passed" = premier à réussir

        $awarded = (new BadgeAwarder())->award($em, $challenge, 42, 3, 3);

        self::assertContains('first_solve', $awarded);
    }

    public function testDoesNotAwardFirstSolveWhenChallengeAlreadySolvedByAnyone(): void
    {
        $challenge = $this->makeChallenge([$this->makeBadge('first_solve')]);
        $em = $this->makeEm(false, 1); // 1 soumission "passed" existe déjà

        $awarded = (new BadgeAwarder())->award($em, $challenge, 42, 3, 3);

        self::assertEmpty($awarded);
    }

    public function testDoesNotAwardFirstSolveWhenNotAllTestsPassed(): void
    {
        $challenge = $this->makeChallenge([$this->makeBadge('first_solve')]);
        $em = $this->makeEm(false, 0);

        $awarded = (new BadgeAwarder())->award($em, $challenge, 42, 2, 3);

        self::assertEmpty($awarded);
    }

    public function testDoesNotAwardBadgeAlreadyOwnedByUser(): void
    {
        $challenge = $this->makeChallenge([$this->makeBadge('perfect')]);
        $em = $this->makeEm(true, 0); // l'utilisateur possède déjà ce badge

        $awarded = (new BadgeAwarder())->award($em, $challenge, 42, 5, 5);

        self::assertEmpty($awarded);
    }

    public function testUnknownBadgeCodeIsNotGranted(): void
    {
        $challenge = $this->makeChallenge([$this->makeBadge('unknown_rule')]);
        $em = $this->makeEm(false, 0);

        $awarded = (new BadgeAwarder())->award($em, $challenge, 42, 5, 5);

        self::assertEmpty($awarded);
    }

    public function testPersistsUserBadgeOnAward(): void
    {
        $challenge = $this->makeChallenge([$this->makeBadge('perfect')]);

        $persisted = [];

        $query = $this->createStub(Query::class);
        $query->method('setParameter')->willReturnSelf();
        $query->method('getSingleScalarResult')->willReturn(0);

        $userBadgeRepo = $this->createStub(EntityRepository::class);
        $userBadgeRepo->method('findOneBy')->willReturn(null);

        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('getRepository')->willReturn($userBadgeRepo);
        $em->method('createQuery')->willReturn($query);
        $em->method('persist')->willReturnCallback(function (object $entity) use (&$persisted): void {
            $persisted[] = $entity;
        });

        (new BadgeAwarder())->award($em, $challenge, 42, 5, 5);

        $userBadges = array_values(array_filter($persisted, static fn ($e) => $e instanceof UserBadge));
        self::assertCount(1, $userBadges);
        self::assertSame(42, $userBadges[0]->getUserId());
    }

    public function testReturnsBothBadgeCodesWhenBothGranted(): void
    {
        $perfect    = $this->makeBadge('perfect', 1);
        $firstSolve = $this->makeBadge('first_solve', 2);
        $challenge  = $this->makeChallenge([$perfect, $firstSolve]);
        $em         = $this->makeEm(false, 0);

        $awarded = (new BadgeAwarder())->award($em, $challenge, 42, 5, 5);

        self::assertContains('perfect', $awarded);
        self::assertContains('first_solve', $awarded);
        self::assertCount(2, $awarded);
    }
}
