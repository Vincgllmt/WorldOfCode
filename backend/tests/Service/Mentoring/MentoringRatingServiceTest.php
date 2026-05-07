<?php

namespace App\Tests\Service\Mentoring;

use App\Entity\MentorProfile;
use App\Entity\MentoringRating;
use App\Entity\MentoringSession;
use App\Entity\User;
use App\Enum\MentoringSessionStatus;
use App\Enum\SessionFormat;
use App\Enum\UserRole;
use App\Repository\MentoringRatingRepository;
use App\Service\Mentoring\MentoringRatingService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

class MentoringRatingServiceTest extends TestCase
{
    private function buildUser(int $id, string $username = 'User'): User
    {
        $user = new User();
        $user->setUsername($username)->setEmail($username . '@woc.dev')
            ->setFirstname($username)->setLastname('Dev')
            ->setPassword('Pass!1')->setRole(UserRole::ROLE_USER);
        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();
        return $user;
    }

    private function buildMentorProfile(int $id, User $user): MentorProfile
    {
        $profile = new MentorProfile();
        $idProp  = new \ReflectionProperty(MentorProfile::class, 'id');
        $idProp->setValue($profile, $id);
        $userProp = new \ReflectionProperty(MentorProfile::class, 'user');
        $userProp->setValue($profile, $user);
        $profile->onCreate();
        return $profile;
    }

    private function buildSession(int $id, MentorProfile $mentor, User $junior): MentoringSession
    {
        $session = new MentoringSession();
        $session->setMentor($mentor)->setJunior($junior)
            ->setFormat(SessionFormat::TEXT)
            ->setStatus(MentoringSessionStatus::COMPLETED)
            ->setCompletedAt(new \DateTime());
        $idProp = new \ReflectionProperty(MentoringSession::class, 'id');
        $idProp->setValue($session, $id);
        $session->onCreate();
        return $session;
    }

    private function buildRating(int $id, MentoringSession $session, User $rater, User $ratee): MentoringRating
    {
        $rating = new MentoringRating();
        $rating->setSession($session)->setRater($rater)->setRatee($ratee)->setScore(null);
        $idProp = new \ReflectionProperty(MentoringRating::class, 'id');
        $idProp->setValue($rating, $id);
        $rating->onCreate();
        return $rating;
    }

    private function makeService(
        ?MentoringRatingRepository $ratingRepo = null,
        ?EntityManagerInterface $em = null,
    ): MentoringRatingService {
        return new MentoringRatingService(
            $ratingRepo ?? $this->createMock(MentoringRatingRepository::class),
            $em        ?? $this->createMock(EntityManagerInterface::class),
        );
    }

    // ── Validation guards ─────────────────────────────────────────────────

    public function testSubmitThrowsForInvalidScore(): void
    {
        $mentorUser = $this->buildUser(1, 'Bob');
        $junior     = $this->buildUser(2, 'Alice');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $this->expectException(\InvalidArgumentException::class);
        $this->makeService()->submit($session, $junior, 0, null);
    }

    public function testSubmitThrowsWhenSessionNotCompleted(): void
    {
        $mentorUser = $this->buildUser(1, 'Bob');
        $junior     = $this->buildUser(2, 'Alice');
        $profile    = $this->buildMentorProfile(10, $mentorUser);

        $session = new MentoringSession();
        $session->setMentor($profile)->setJunior($junior)
            ->setFormat(SessionFormat::TEXT)
            ->setStatus(MentoringSessionStatus::IN_PROGRESS);
        // completedAt intentionally NOT set → null
        $session->onCreate();

        $this->expectException(\LogicException::class);
        $this->expectExceptionMessage('SESSION_NOT_COMPLETED');
        $this->makeService()->submit($session, $junior, 3, null);
    }

    public function testSubmitThrowsWhenDeadlineExpired(): void
    {
        $mentorUser = $this->buildUser(1, 'Bob');
        $junior     = $this->buildUser(2, 'Alice');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        // Backdate completedAt by 3 days (past 48h window)
        $session->setCompletedAt(new \DateTime('-3 days'));

        $this->expectException(\LogicException::class);
        $this->expectExceptionMessage('DEADLINE_EXPIRED');
        $this->makeService()->submit($session, $junior, 3, null);
    }

    public function testSubmitThrowsWhenRatingNotFound(): void
    {
        $mentorUser = $this->buildUser(1, 'Bob');
        $junior     = $this->buildUser(2, 'Alice');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $ratingRepo = $this->createMock(MentoringRatingRepository::class);
        $ratingRepo->method('findOneBy')->willReturn(null);

        $this->expectException(\LogicException::class);
        $this->expectExceptionMessage('RATING_NOT_FOUND');
        $this->makeService($ratingRepo)->submit($session, $junior, 3, null);
    }

    public function testSubmitThrowsWhenAlreadySubmitted(): void
    {
        $mentorUser = $this->buildUser(1, 'Bob');
        $junior     = $this->buildUser(2, 'Alice');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $rating = $this->buildRating(1, $session, $junior, $mentorUser);
        $rating->setSubmittedAt(new \DateTime()); // already submitted

        $ratingRepo = $this->createMock(MentoringRatingRepository::class);
        $ratingRepo->method('findOneBy')->willReturn($rating);

        $this->expectException(\LogicException::class);
        $this->expectExceptionMessage('ALREADY_SUBMITTED');
        $this->makeService($ratingRepo)->submit($session, $junior, 3, null);
    }

    // ── Happy path — only one rating submitted ────────────────────────────

    public function testSubmitSetsRatingDataAndFlushes(): void
    {
        $mentorUser = $this->buildUser(1, 'Bob');
        $junior     = $this->buildUser(2, 'Alice');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $juniorRating = $this->buildRating(1, $session, $junior, $mentorUser);
        // Only junior rating exists — checkBothSubmitted will find count < 2
        $ratingRepo = $this->createMock(MentoringRatingRepository::class);
        $ratingRepo->method('findOneBy')
            ->with(['session' => $session, 'rater' => $junior])
            ->willReturn($juniorRating);
        $ratingRepo->method('findBy')
            ->with(['session' => $session])
            ->willReturn([$juniorRating]);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $this->makeService($ratingRepo, $em)->submit($session, $junior, 4, 'Super session');

        $this->assertSame(4, $juniorRating->getScore());
        $this->assertSame('Super session', $juniorRating->getComment());
        $this->assertNotNull($juniorRating->getSubmittedAt());
    }

    // ── Both submitted → isVisible + avg recalculation ───────────────────

    public function testSubmitWithBothSubmittedSetsVisibleAndRecalculates(): void
    {
        $mentorUser = $this->buildUser(1, 'Bob');
        $junior     = $this->buildUser(2, 'Alice');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $juniorRating = $this->buildRating(1, $session, $junior, $mentorUser);
        $mentorRating = $this->buildRating(2, $session, $mentorUser, $junior);
        $mentorRating->setSubmittedAt(new \DateTime()); // mentor already rated

        $ratingRepo = $this->createMock(MentoringRatingRepository::class);
        $ratingRepo->method('findOneBy')->willReturn($juniorRating);
        // After junior submits, findBy returns both ratings (both now have submittedAt)
        $ratingRepo->method('findBy')->willReturnCallback(function () use ($juniorRating, $mentorRating) {
            $juniorRating->setSubmittedAt(new \DateTime()); // simulate flush setting it
            return [$juniorRating, $mentorRating];
        });

        $query = $this->createMock(\Doctrine\ORM\Query::class);
        $query->method('setParameter')->willReturnSelf();
        $query->method('getSingleScalarResult')->willReturn(4.0);

        $em = $this->getMockBuilder(EntityManagerInterface::class)
            ->addMethods(['createQuery'])
            ->getMock();
        $em->expects($this->atLeastOnce())->method('flush');
        $em->method('createQuery')->willReturn($query);

        $this->makeService($ratingRepo, $em)->submit($session, $junior, 4, null);

        $this->assertTrue($juniorRating->isVisible());
        $this->assertTrue($mentorRating->isVisible());
        $this->assertEquals(4.0, $profile->getAverageRating());
    }
}
