<?php

namespace App\Tests\Controller;

use App\Controller\MentorProfileController;
use App\Entity\MentorProfile;
use App\Entity\Skill;
use App\Entity\User;
use App\Enum\TeachingStyle;
use App\Enum\UserRole;
use App\Repository\MentorProfileRepository;
use App\Repository\SkillRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class MentorProfileControllerTest extends TestCase
{
    private function buildUser(int $id, string $username = 'Bob'): User
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
        ?MentorProfileRepository $mentorProfileRepo = null,
        ?SkillRepository $skillRepo = null,
    ): MentorProfileController {
        $controller = new MentorProfileController(
            $mentorProfileRepo ?? $this->createMock(MentorProfileRepository::class),
            $skillRepo         ?? $this->createMock(SkillRepository::class),
        );
        $controller->setContainer($this->makeContainer($currentUser));
        return $controller;
    }

    private function makeJsonRequest(array $data): Request
    {
        return new Request([], [], [], [], [], [], json_encode($data));
    }

    // ======================================================================
    //  create()
    // ======================================================================

    public function testCreateReturns201WhenProfileCreated(): void
    {
        $user = $this->buildUser(1);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn(null);
        $mentorProfileRepo->expects($this->once())->method('save')
            ->willReturnCallback(fn(MentorProfile $p) => $p->onCreate());

        $request  = $this->makeJsonRequest(['maxActiveMentees' => 3, 'teachingStyle' => 'guided', 'mentorBio' => 'Hello']);
        $response = $this->makeController($user, $mentorProfileRepo)->create($request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(3, $payload['maxActiveMentees']);
        $this->assertSame('guided', $payload['teachingStyle']);
        $this->assertSame('Hello', $payload['mentorBio']);
    }

    public function testCreateReturns409WhenProfileAlreadyExists(): void
    {
        $user    = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $user);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $request  = $this->makeJsonRequest(['maxActiveMentees' => 3]);
        $response = $this->makeController($user, $mentorProfileRepo)->create($request);

        $this->assertSame(409, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('MENTOR_PROFILE_ALREADY_EXISTS', $payload['code']);
    }

    public function testCreateReturns422WhenMaxActiveMenteesTooHigh(): void
    {
        $user = $this->buildUser(1);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn(null);

        $request  = $this->makeJsonRequest(['maxActiveMentees' => 11]);
        $response = $this->makeController($user, $mentorProfileRepo)->create($request);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testCreateReturns422WhenMaxActiveMenteesZero(): void
    {
        $user = $this->buildUser(1);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn(null);

        $request  = $this->makeJsonRequest(['maxActiveMentees' => 0]);
        $response = $this->makeController($user, $mentorProfileRepo)->create($request);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testCreateReturns422WhenTeachingStyleInvalid(): void
    {
        $user = $this->buildUser(1);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn(null);

        $request  = $this->makeJsonRequest(['teachingStyle' => 'invalid_style']);
        $response = $this->makeController($user, $mentorProfileRepo)->create($request);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testCreateReturns422WhenSkillNotFound(): void
    {
        $user = $this->buildUser(1);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn(null);

        $skillRepo = $this->createMock(SkillRepository::class);
        $skillRepo->method('find')->willReturn(null);

        $request  = $this->makeJsonRequest(['specialties' => [999]]);
        $response = $this->makeController($user, $mentorProfileRepo, $skillRepo)->create($request);

        $this->assertSame(422, $response->getStatusCode());
    }

    // ======================================================================
    //  getMyProfile()
    // ======================================================================

    public function testGetMyProfileReturns200(): void
    {
        $user    = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $user);
        $profile->setMaxActiveMentees(5);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->with(['user' => $user])->willReturn($profile);

        $response = $this->makeController($user, $mentorProfileRepo)->getMyProfile();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(10, $payload['id']);
        $this->assertSame(5, $payload['maxActiveMentees']);
        $this->assertArrayHasKey('isAvailable', $payload);
        $this->assertArrayHasKey('specialties', $payload);
    }

    public function testGetMyProfileReturns404WhenNotFound(): void
    {
        $user = $this->buildUser(1);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn(null);

        $response = $this->makeController($user, $mentorProfileRepo)->getMyProfile();

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  update()
    // ======================================================================

    public function testUpdateReturns200AndUpdatesFields(): void
    {
        $user    = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $user);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);
        $mentorProfileRepo->expects($this->once())->method('save');

        $request  = $this->makeJsonRequest(['maxActiveMentees' => 4, 'mentorBio' => 'Updated bio', 'teachingStyle' => 'direct']);
        $response = $this->makeController($user, $mentorProfileRepo)->update($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(4, $profile->getMaxActiveMentees());
        $this->assertSame('Updated bio', $profile->getMentorBio());
        $this->assertSame(TeachingStyle::DIRECT, $profile->getTeachingStyle());
    }

    public function testUpdateReturns422WhenMaxMenteesOutOfRange(): void
    {
        $user    = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $user);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $request  = $this->makeJsonRequest(['maxActiveMentees' => 15]);
        $response = $this->makeController($user, $mentorProfileRepo)->update($request);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testUpdateReturns422WhenTeachingStyleInvalid(): void
    {
        $user    = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $user);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $request  = $this->makeJsonRequest(['teachingStyle' => 'not_a_style']);
        $response = $this->makeController($user, $mentorProfileRepo)->update($request);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testUpdateClearsTeachingStyleWhenNull(): void
    {
        $user    = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $user);
        $profile->setTeachingStyle(TeachingStyle::GUIDED);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);
        $mentorProfileRepo->method('save');

        $request  = $this->makeJsonRequest(['teachingStyle' => null]);
        $response = $this->makeController($user, $mentorProfileRepo)->update($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertNull($profile->getTeachingStyle());
    }

    // ======================================================================
    //  toggleAvailability()
    // ======================================================================

    public function testToggleAvailabilityFlipsCurrentValue(): void
    {
        $user    = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $user);
        $profile->setIsAvailable(false);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);
        $mentorProfileRepo->expects($this->once())->method('save');

        $request  = new Request([], [], [], [], [], [], '{}');
        $response = $this->makeController($user, $mentorProfileRepo)->toggleAvailability($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['isAvailable']);
        $this->assertSame('disponible', $payload['mode']);
    }

    public function testToggleAvailabilitySetsExplicitTrue(): void
    {
        $user    = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $user);
        $profile->setIsAvailable(false);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);
        $mentorProfileRepo->method('save');

        $request  = $this->makeJsonRequest(['isAvailable' => true]);
        $response = $this->makeController($user, $mentorProfileRepo)->toggleAvailability($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['isAvailable']);
    }

    public function testToggleAvailabilitySetsExplicitFalse(): void
    {
        $user    = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $user);
        $profile->setIsAvailable(true);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);
        $mentorProfileRepo->method('save');

        $request  = $this->makeJsonRequest(['isAvailable' => false]);
        $response = $this->makeController($user, $mentorProfileRepo)->toggleAvailability($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertFalse($payload['isAvailable']);
        $this->assertSame('lecture', $payload['mode']);
    }
}
