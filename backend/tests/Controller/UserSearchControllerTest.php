<?php

namespace App\Tests\Controller;

use App\Controller\UserSearchController;
use App\Entity\MentorProfile;
use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\MentorProfileRepository;
use Doctrine\Common\Collections\ArrayCollection;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class UserSearchControllerTest extends TestCase
{
    private function buildUser(int $id, string $username = 'MentorBob'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@woc.dev')
            ->setFirstname($username)->setLastname('Dev')
            ->setPassword('Pass!1')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildMentorProfile(int $id, User $user, array $specialtyNames = []): MentorProfile
    {
        $profile = new MentorProfile();

        $idProp = new \ReflectionProperty(MentorProfile::class, 'id');
        $idProp->setValue($profile, $id);

        $userProp = new \ReflectionProperty(MentorProfile::class, 'user');
        $userProp->setValue($profile, $user);

        $profile->setIsAvailable(true);

        // Spécialités mock
        $specialties = array_map(function (string $name) {
            $skill = $this->createMock(\App\Entity\TechGroup::class);
            $skill->method('getName')->willReturn($name);
            return $skill;
        }, $specialtyNames);

        $specialtiesProp = new \ReflectionProperty(MentorProfile::class, 'specialties');
        $specialtiesProp->setValue($profile, new ArrayCollection($specialties));

        return $profile;
    }

    private function makeContainer(User $currentUser, bool $isGranted = true): ContainerInterface
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($currentUser);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $authChecker = $this->createMock(AuthorizationCheckerInterface::class);
        $authChecker->method('isGranted')->willReturn($isGranted);

        $container = $this->createMock(ContainerInterface::class);
        $container->method('has')->willReturnCallback(
            fn(string $id) => in_array($id, ['security.token_storage', 'security.authorization_checker'], true)
        );
        $container->method('get')->willReturnCallback(
            fn(string $id) => match ($id) {
                'security.token_storage'         => $tokenStorage,
                'security.authorization_checker' => $authChecker,
                default => throw new \RuntimeException("Service inattendu : $id"),
            }
        );

        return $container;
    }

    private function makeController(
        User $currentUser,
        ?MentorProfileRepository $repo = null,
    ): UserSearchController {
        $controller = new UserSearchController(
            $repo ?? $this->createMock(MentorProfileRepository::class),
        );
        $controller->setContainer($this->makeContainer($currentUser));
        return $controller;
    }

    public function testSearchMentorsReturnsMappedProfiles(): void
    {
        $alice = $this->buildUser(1, 'AliceJunior');
        $bob   = $this->buildUser(2, 'BobMentor');
        $profile = $this->buildMentorProfile(10, $bob, ['PHP', 'Symfony']);

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('searchMentors')->with('Bob', 10)->willReturn([$profile]);

        $request = new Request(['isMentor' => 'true', 'q' => 'Bob']);
        $response = $this->makeController($alice, $repo)->search($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload);
        $this->assertSame(2, $payload[0]['id']);
        $this->assertSame('BobMentor', $payload[0]['username']);
        $this->assertSame(10, $payload[0]['mentorId']);
        $this->assertSame(['PHP', 'Symfony'], $payload[0]['specialties']);
        $this->assertTrue($payload[0]['isAvailable']);
    }

    public function testSearchWithoutIsMentorReturnsEmpty(): void
    {
        $alice = $this->buildUser(1);

        $request = new Request(['q' => 'bob']);
        $response = $this->makeController($alice)->search($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }

    public function testSearchMentorsEmptyQueryReturnsAll(): void
    {
        $alice = $this->buildUser(1, 'AliceJunior');

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('searchMentors')->with('', 10)->willReturn([]);

        $request = new Request(['isMentor' => 'true']);
        $response = $this->makeController($alice, $repo)->search($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }

    public function testSearchExcludesCurrentUser(): void
    {
        $alice = $this->buildUser(1, 'AliceJunior');
        $bob   = $this->buildUser(2, 'BobMentor');

        $aliceProfile = $this->buildMentorProfile(10, $alice, ['PHP']);
        $bobProfile   = $this->buildMentorProfile(11, $bob, ['JavaScript']);

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('searchMentors')->willReturn([$aliceProfile, $bobProfile]);

        $request  = new Request(['isMentor' => 'true', 'q' => '']);
        $response = $this->makeController($alice, $repo)->search($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload);
        $this->assertSame(2, $payload[0]['id']);
        $this->assertSame('BobMentor', $payload[0]['username']);
    }
}
