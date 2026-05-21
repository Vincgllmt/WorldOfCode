<?php

namespace App\Tests\Controller;

use App\Controller\MentorProfileController;
use App\Entity\MentorProfile;
use App\Entity\Skill;
use App\Entity\User;
use App\Enum\SkillCategory;
use App\Enum\TeachingStyle;
use App\Enum\UserRole;
use App\Repository\MentorProfileRepository;
use App\Repository\SkillRepository;
use Doctrine\DBAL\Driver\Exception as DriverException;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class MentorProfileControllerTest extends TestCase
{
    private function buildUser(int $id, string $username = 'BobMentor'): User
    {
        $user = new User();
        $user->setUsername($username)->setEmail($username . '@woc.dev')
            ->setFirstname($username)->setLastname('Dev')
            ->setPassword('Pass!1')->setRole(UserRole::ROLE_USER);
        (new \ReflectionProperty(User::class, 'id'))->setValue($user, $id);
        $user->onCreate();
        return $user;
    }

    private function buildSkill(int $id, string $name): Skill
    {
        $skill = new Skill();
        $skill->setName($name)->setCategory(SkillCategory::OTHER);
        (new \ReflectionProperty(Skill::class, 'id'))->setValue($skill, $id);
        return $skill;
    }

    private function buildMentorProfile(int $id, User $user, array $specialties = []): MentorProfile
    {
        $profile = new MentorProfile();
        (new \ReflectionProperty(MentorProfile::class, 'id'))->setValue($profile, $id);
        (new \ReflectionProperty(MentorProfile::class, 'user'))->setValue($profile, $user);
        $profile->setMaxActiveMentees(3);
        $profile->setIsAvailable(true);
        $profile->onCreate();
        foreach ($specialties as $s) {
            $profile->addSpecialty($s);
        }
        return $profile;
    }

    private function makeContainer(User $currentUser): ContainerInterface
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($currentUser);
        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);
        $authChecker = $this->createMock(AuthorizationCheckerInterface::class);
        $authChecker->method('isGranted')->willReturn(true);
        $container = $this->createMock(ContainerInterface::class);
        $container->method('has')->willReturnCallback(
            fn(string $id) => in_array($id, ['security.token_storage', 'security.authorization_checker'], true)
        );
        $container->method('get')->willReturnCallback(fn(string $id) => match ($id) {
            'security.token_storage'         => $tokenStorage,
            'security.authorization_checker' => $authChecker,
            default => throw new \RuntimeException("Service inattendu : $id"),
        });
        return $container;
    }

    private function makeController(
        User $currentUser,
        ?MentorProfileRepository $mentorRepo = null,
        ?SkillRepository $skillRepo = null,
    ): MentorProfileController {
        $controller = new MentorProfileController(
            $mentorRepo ?? $this->createMock(MentorProfileRepository::class),
            $skillRepo  ?? $this->createMock(SkillRepository::class),
        );
        $controller->setContainer($this->makeContainer($currentUser));
        return $controller;
    }

    // ── create() ────────────────────────────────────────────

    public function testCreateSuccessMinimal(): void
    {
        $bob = $this->buildUser(1);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn(null);
        $mentorRepo->expects($this->once())->method('save')->willReturnCallback(
            function (MentorProfile $p): void {
                $p->onCreate(); // simule PrePersist → initialise createdAt
                (new \ReflectionProperty(MentorProfile::class, 'id'))->setValue($p, 42);
            }
        );

        $request = new Request(content: json_encode(['empty' => 'object'], JSON_THROW_ON_ERROR));
        $response = $this->makeController($bob, $mentorRepo)->create($request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(42, $payload['id']);
        $this->assertSame(3, $payload['maxActiveMentees']);
    }

    public function testCreateSuccessFullPayload(): void
    {
        $bob = $this->buildUser(1);
        $php = $this->buildSkill(100, 'PHP');
        $js  = $this->buildSkill(101, 'JavaScript');

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn(null);
        $mentorRepo->method('save')->willReturnCallback(
            function (MentorProfile $p): void {
                $p->onCreate();
                (new \ReflectionProperty(MentorProfile::class, 'id'))->setValue($p, 42);
            }
        );

        $skillRepo = $this->createMock(SkillRepository::class);
        $skillRepo->method('find')->willReturnCallback(
            fn(int $id) => match ($id) {
                100 => $php,
                101 => $js,
                default => null,
            }
        );

        $request = new Request(content: json_encode([
            'specialties'      => [100, 101],
            'teachingStyle'    => 'socratic',
            'maxActiveMentees' => 5,
            'mentorBio'        => 'Senior PHP dev',
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($bob, $mentorRepo, $skillRepo)->create($request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('socratic', $payload['teachingStyle']);
        $this->assertSame(5, $payload['maxActiveMentees']);
        $this->assertSame('Senior PHP dev', $payload['mentorBio']);
        $this->assertCount(2, $payload['specialties']);
    }

    public function testCreateReturns409WhenProfileAlreadyExists(): void
    {
        $bob = $this->buildUser(1);
        $existing = $this->buildMentorProfile(99, $bob);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($existing);

        $request = new Request(content: json_encode([], JSON_THROW_ON_ERROR));
        $response = $this->makeController($bob, $mentorRepo)->create($request);

        $this->assertSame(409, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('MENTOR_PROFILE_ALREADY_EXISTS', $payload['code']);
    }

    public function testCreateReturns400OnInvalidJson(): void
    {
        $bob = $this->buildUser(1);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn(null);

        $request = new Request(content: '{not valid json');
        $response = $this->makeController($bob, $mentorRepo)->create($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateReturns422WhenMaxMenteesOutOfRange(): void
    {
        $bob = $this->buildUser(1);
        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn(null);

        // < 1
        $r1 = new Request(content: json_encode(['maxActiveMentees' => 0]));
        $resp1 = $this->makeController($bob, $mentorRepo)->create($r1);
        $this->assertSame(422, $resp1->getStatusCode());

        // > 10
        $r2 = new Request(content: json_encode(['maxActiveMentees' => 11]));
        $resp2 = $this->makeController($bob, $mentorRepo)->create($r2);
        $this->assertSame(422, $resp2->getStatusCode());
    }

    public function testCreateReturns422WhenTeachingStyleInvalid(): void
    {
        $bob = $this->buildUser(1);
        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn(null);

        $request = new Request(content: json_encode(['teachingStyle' => 'wrong-style']));
        $response = $this->makeController($bob, $mentorRepo)->create($request);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testCreateReturns422WhenSkillNotFound(): void
    {
        $bob = $this->buildUser(1);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn(null);

        $skillRepo = $this->createMock(SkillRepository::class);
        $skillRepo->method('find')->willReturn(null);

        $request = new Request(content: json_encode(['specialties' => [999]]));
        $response = $this->makeController($bob, $mentorRepo, $skillRepo)->create($request);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('999 introuvable', $payload['error']);
    }

    public function testCreateReturns409OnUniqueConstraintViolation(): void
    {
        $bob = $this->buildUser(1);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn(null);
        $driverException = $this->createMock(DriverException::class);
        $mentorRepo->method('save')->willThrowException(
            new UniqueConstraintViolationException($driverException, null)
        );

        $request = new Request(content: json_encode([]));
        $response = $this->makeController($bob, $mentorRepo)->create($request);

        $this->assertSame(409, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('MENTOR_PROFILE_ALREADY_EXISTS', $payload['code']);
    }

    // ── getMyProfile() ───────────────────────────────────────

    public function testGetMyProfileReturns200(): void
    {
        $bob = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $bob);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $response = $this->makeController($bob, $mentorRepo)->getMyProfile();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(10, $payload['id']);
    }

    public function testGetMyProfileReturns404WhenNoProfile(): void
    {
        $bob = $this->buildUser(1);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn(null);

        $response = $this->makeController($bob, $mentorRepo)->getMyProfile();

        $this->assertSame(404, $response->getStatusCode());
    }

    // ── update() ─────────────────────────────────────────────

    public function testUpdateSuccessFullPayload(): void
    {
        $bob = $this->buildUser(1);
        $oldSkill = $this->buildSkill(50, 'OldSkill');
        $newSkill = $this->buildSkill(100, 'PHP');
        $profile = $this->buildMentorProfile(10, $bob, [$oldSkill]);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);
        $mentorRepo->expects($this->once())->method('save');

        $skillRepo = $this->createMock(SkillRepository::class);
        $skillRepo->method('find')->with(100)->willReturn($newSkill);

        $request = new Request(content: json_encode([
            'maxActiveMentees' => 7,
            'mentorBio'        => 'Updated bio',
            'teachingStyle'    => 'direct',
            'specialties'      => [100],
        ]));
        $response = $this->makeController($bob, $mentorRepo, $skillRepo)->update($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(7, $profile->getMaxActiveMentees());
        $this->assertSame('Updated bio', $profile->getMentorBio());
        $this->assertSame(TeachingStyle::DIRECT, $profile->getTeachingStyle());
        $this->assertCount(1, $profile->getSpecialties());
        $this->assertSame('PHP', $profile->getSpecialties()->first()->getName());
    }

    public function testUpdateAllowsSettingTeachingStyleToNull(): void
    {
        $bob = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $bob);
        $profile->setTeachingStyle(TeachingStyle::DIRECT);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);
        $mentorRepo->method('save');

        $request = new Request(content: json_encode(['teachingStyle' => null]));
        $response = $this->makeController($bob, $mentorRepo)->update($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertNull($profile->getTeachingStyle());
    }

    public function testUpdateReturns404WhenProfileNotFound(): void
    {
        $bob = $this->buildUser(1);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn(null);

        $request = new Request(content: json_encode([]));
        $response = $this->makeController($bob, $mentorRepo)->update($request);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testUpdateReturns400OnInvalidJson(): void
    {
        $bob = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $bob);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $request = new Request(content: '{invalid');
        $response = $this->makeController($bob, $mentorRepo)->update($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testUpdateReturns422WhenMaxMenteesOutOfRange(): void
    {
        $bob = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $bob);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $request = new Request(content: json_encode(['maxActiveMentees' => 99]));
        $response = $this->makeController($bob, $mentorRepo)->update($request);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testUpdateReturns422WhenTeachingStyleInvalid(): void
    {
        $bob = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $bob);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $request = new Request(content: json_encode(['teachingStyle' => 'invalid-style']));
        $response = $this->makeController($bob, $mentorRepo)->update($request);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testUpdateReturns422WhenSkillNotFound(): void
    {
        $bob = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $bob);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $skillRepo = $this->createMock(SkillRepository::class);
        $skillRepo->method('find')->willReturn(null);

        $request = new Request(content: json_encode(['specialties' => [999]]));
        $response = $this->makeController($bob, $mentorRepo, $skillRepo)->update($request);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('999 introuvable', $payload['error']);
    }

    public function testUpdateMentorBioAcceptsNull(): void
    {
        $bob = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $bob);
        $profile->setMentorBio('Old bio');

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);
        $mentorRepo->method('save');

        $request = new Request(content: json_encode(['mentorBio' => null]));
        $response = $this->makeController($bob, $mentorRepo)->update($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertNull($profile->getMentorBio());
    }

    // ── toggleAvailability() ─────────────────────────────────

    public function testToggleAvailabilityWithExplicitTrue(): void
    {
        $bob = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $bob);
        $profile->setIsAvailable(false);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);
        $mentorRepo->method('save');

        $request = new Request(content: json_encode(['isAvailable' => true]));
        $response = $this->makeController($bob, $mentorRepo)->toggleAvailability($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['isAvailable']);
        $this->assertSame('disponible', $payload['mode']);
    }

    public function testToggleAvailabilityWithoutBodyFlips(): void
    {
        $bob = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $bob);
        $profile->setIsAvailable(true);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);
        $mentorRepo->method('save');

        // Body JSON valide mais sans clé isAvailable → flip de true → false
        $request = new Request(content: json_encode(new \stdClass()));
        $response = $this->makeController($bob, $mentorRepo)->toggleAvailability($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertFalse($payload['isAvailable']);
        $this->assertSame('lecture', $payload['mode']);
    }

    public function testToggleAvailabilityReturns404WhenNoProfile(): void
    {
        $bob = $this->buildUser(1);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn(null);

        $request = new Request(content: '');
        $response = $this->makeController($bob, $mentorRepo)->toggleAvailability($request);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testToggleAvailabilityReturns400OnInvalidJson(): void
    {
        $bob = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $bob);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $request = new Request(content: '{invalid');
        $response = $this->makeController($bob, $mentorRepo)->toggleAvailability($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testToggleAvailabilityReturns422OnNonBooleanValue(): void
    {
        $bob = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $bob);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $request = new Request(content: json_encode(['isAvailable' => 'not-a-boolean']));
        $response = $this->makeController($bob, $mentorRepo)->toggleAvailability($request);

        $this->assertSame(422, $response->getStatusCode());
    }
}
