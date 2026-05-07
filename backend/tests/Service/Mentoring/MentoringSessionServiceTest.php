<?php

namespace App\Tests\Service\Mentoring;

use App\Entity\MentorProfile;
use App\Entity\MentoringSession;
use App\Entity\User;
use App\Enum\MentoringSessionStatus;
use App\Enum\SessionFormat;
use App\Enum\UserRole;
use App\Repository\MentorProfileRepository;
use App\Repository\MentoringRatingRepository;
use App\Service\Mentoring\MentoringSessionService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

class MentoringSessionServiceTest extends TestCase
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

    private function buildSession(int $id, MentorProfile $mentor, User $junior, ?string $conversationId = null): MentoringSession
    {
        $session = new MentoringSession();
        $session->setMentor($mentor)->setJunior($junior)
            ->setFormat(SessionFormat::TEXT)
            ->setStatus(MentoringSessionStatus::IN_PROGRESS);
        if ($conversationId !== null) {
            $session->setConversationId($conversationId);
        }
        $idProp = new \ReflectionProperty(MentoringSession::class, 'id');
        $idProp->setValue($session, $id);
        $session->onCreate();
        return $session;
    }

    private function makeNullQuery(): \Doctrine\ORM\Query
    {
        $query = $this->createMock(\Doctrine\ORM\Query::class);
        $query->method('setParameter')->willReturnSelf();
        $query->method('setParameters')->willReturnSelf();
        $query->method('getSingleScalarResult')->willReturn(null);
        return $query;
    }

    private function makeZeroCountQuery(): \Doctrine\ORM\Query
    {
        $query = $this->createMock(\Doctrine\ORM\Query::class);
        $query->method('setParameter')->willReturnSelf();
        $query->method('setParameters')->willReturnSelf();
        $query->method('getSingleScalarResult')->willReturn(0);
        return $query;
    }

    private function makeEmMock(bool $withConnection = false, ?\Doctrine\DBAL\Connection $conn = null): EntityManagerInterface
    {
        $builder = $this->getMockBuilder(EntityManagerInterface::class)
            ->addMethods(['createQuery', 'getConnection']);
        $em = $builder->getMock();

        // createQuery is called 3 times: avg, completed count, cancelled count
        $em->method('createQuery')->willReturnOnConsecutiveCalls(
            $this->makeNullQuery(),  // avg → null (no setAverageRating)
            $this->makeZeroCountQuery(), // completed count
            $this->makeZeroCountQuery(), // cancelled count
        );

        if ($withConnection && $conn !== null) {
            $em->method('getConnection')->willReturn($conn);
        }

        return $em;
    }

    // ── complete() without conversationId ────────────────────────────────

    public function testCompleteChangesStatusAndCreatesRatingPlaceholders(): void
    {
        $mentorUser = $this->buildUser(1, 'Bob');
        $junior     = $this->buildUser(2, 'Alice');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $junior);

        $em = $this->makeEmMock();
        $em->expects($this->exactly(4))->method('persist'); // 2 ratings + 2 notifications
        $em->expects($this->atLeastOnce())->method('flush');

        $service = new MentoringSessionService(
            $em,
            $this->createMock(MentorProfileRepository::class),
            $this->createMock(MentoringRatingRepository::class),
        );

        $service->complete($session);

        $this->assertSame(MentoringSessionStatus::COMPLETED, $session->getStatus());
        $this->assertNotNull($session->getCompletedAt());
    }

    // ── complete() with conversationId executes raw SQL ──────────────────

    public function testCompleteWithConversationIdExecutesSqlInserts(): void
    {
        $mentorUser = $this->buildUser(1, 'Bob');
        $junior     = $this->buildUser(2, 'Alice');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $junior, 'conv-abc');

        $conn = $this->createMock(\Doctrine\DBAL\Connection::class);
        $conn->expects($this->exactly(2))->method('executeStatement');

        $em = $this->makeEmMock(true, $conn);
        $em->method('persist');
        $em->method('flush');

        $service = new MentoringSessionService(
            $em,
            $this->createMock(MentorProfileRepository::class),
            $this->createMock(MentoringRatingRepository::class),
        );

        $service->complete($session);

        $this->assertSame(MentoringSessionStatus::COMPLETED, $session->getStatus());
    }
}
