<?php

namespace App\Tests\Controller;

use App\Controller\PublicMentorProfileController;
use App\Entity\MentorProfile;
use App\Entity\Skill;
use App\Entity\User;
use App\Enum\SkillCategory;
use App\Enum\TeachingStyle;
use App\Enum\UserRole;
use App\Repository\MentorProfileRepository;
use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class PublicMentorProfileControllerTest extends TestCase
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

    private function buildMentorProfile(int $id, User $user, array $specialties = []): MentorProfile
    {
        $profile = new MentorProfile();
        (new \ReflectionProperty(MentorProfile::class, 'id'))->setValue($profile, $id);
        (new \ReflectionProperty(MentorProfile::class, 'user'))->setValue($profile, $user);
        $profile->setIsAvailable(true);
        $profile->setTeachingStyle(TeachingStyle::SOCRATIC);
        $profile->setMaxActiveMentees(3);
        $profile->setAverageRating(4.5);
        $profile->setReliabilityRate(0.9);
        $profile->setTotalSessions(10);
        $profile->onCreate();

        foreach ($specialties as $skill) {
            $profile->addSpecialty($skill);
        }

        return $profile;
    }

    private function buildSkill(int $id, string $name): Skill
    {
        $skill = new Skill();
        $skill->setName($name)->setCategory(SkillCategory::OTHER);
        (new \ReflectionProperty(Skill::class, 'id'))->setValue($skill, $id);
        return $skill;
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
        ?UserRepository $userRepo = null,
        ?MentorProfileRepository $mentorProfileRepo = null,
    ): PublicMentorProfileController {
        $controller = new PublicMentorProfileController(
            $userRepo          ?? $this->createMock(UserRepository::class),
            $mentorProfileRepo ?? $this->createMock(MentorProfileRepository::class),
        );
        $controller->setContainer($this->makeContainer($currentUser));
        return $controller;
    }

    public function testGetPublicProfileReturnsCompleteProfile(): void
    {
        $alice = $this->buildUser(1, 'Alice');
        $bob   = $this->buildUser(2, 'BobMentor');

        $phpSkill = $this->buildSkill(100, 'PHP');
        $jsSkill  = $this->buildSkill(101, 'JavaScript');
        $profile = $this->buildMentorProfile(10, $bob, [$phpSkill, $jsSkill]);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(2)->willReturn($bob);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->with(['user' => $bob])->willReturn($profile);

        $response = $this->makeController($alice, $userRepo, $mentorRepo)->getPublicProfile(2);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(10, $payload['id']);
        $this->assertTrue($payload['isAvailable']);
        $this->assertSame('socratic', $payload['teachingStyle']);
        $this->assertSame(3, $payload['maxActiveMentees']);
        $this->assertSame(4.5, $payload['averageRating']);
        $this->assertSame(0.9, $payload['reliabilityRate']);
        $this->assertSame(10, $payload['totalSessions']);
        $this->assertCount(2, $payload['specialties']);
        $this->assertSame('PHP', $payload['specialties'][0]['name']);
    }

    public function testGetPublicProfileReturns404WhenUserNotFound(): void
    {
        $alice = $this->buildUser(1, 'Alice');

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn(null);

        $response = $this->makeController($alice, $userRepo)->getPublicProfile(999);

        $this->assertSame(404, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Utilisateur non trouvé.', $payload['error']);
    }

    public function testGetPublicProfileReturns404WhenUserIsNotMentor(): void
    {
        $alice  = $this->buildUser(1, 'Alice');
        $carol  = $this->buildUser(2, 'Carol'); // Carol n'est pas mentor

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($carol);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn(null);

        $response = $this->makeController($alice, $userRepo, $mentorRepo)->getPublicProfile(2);

        $this->assertSame(404, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('pas mentor', $payload['error']);
    }
}
