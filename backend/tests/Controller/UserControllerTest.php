<?php

namespace App\Tests\Controller;

use App\Controller\UserController;
use App\Entity\TechGroup;
use App\Entity\User;
use App\Entity\UserLink;
use App\Enum\LinkType;
use App\Enum\UserRole;
use App\Mapper\SkillMapper;
use App\Mapper\TechGroupMapper;
use App\Mapper\UserLinkMapper;
use App\Mapper\UserMapper;
use App\Repository\SkillRepository;
use App\Repository\UserLinkRepository;
use App\Repository\UserRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Validator\ConstraintViolation;
use Symfony\Component\Validator\ConstraintViolationList;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * 🎮 Mass Effect - Tests unitaires du UserController
 *
 * Shepard  = utilisateur authentifié courant
 * Garrus   = autre utilisateur (contrôle d'accès)
 */
class UserControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'Shepard', bool $isAdmin = false): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@normandy.sr2')
            ->setFirstname($username)
            ->setLastname('N7')
            ->setPassword('hashed')
            ->setRole($isAdmin ? UserRole::ROLE_ADMIN : UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildGroup(int $id, string $name = 'Normandy Crew'): TechGroup
    {
        $group = new TechGroup();
        $group->setName($name);
        $group->setDescription('SR-2');

        $idProp = new \ReflectionProperty(TechGroup::class, 'id');
        $idProp->setValue($group, $id);

        return $group;
    }

    private function makeContainer(User $currentUser, bool $isAdmin = false): ContainerInterface
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($currentUser);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $authChecker = $this->createMock(AuthorizationCheckerInterface::class);
        $authChecker->method('isGranted')->willReturnCallback(
            fn(string $attr) => match ($attr) {
                'ROLE_ADMIN' => $isAdmin,
                default      => true, // IS_AUTHENTICATED_FULLY et tout le reste
            }
        );

        $container = $this->createMock(ContainerInterface::class);
        $container->method('has')->willReturnCallback(
            fn(string $id) => in_array($id, ['security.token_storage', 'security.authorization_checker'], true)
        );
        $container->method('get')->willReturnCallback(
            fn(string $id) => match ($id) {
                'security.token_storage'          => $tokenStorage,
                'security.authorization_checker'  => $authChecker,
                default => throw new \RuntimeException("Service inattendu : $id"),
            }
        );

        return $container;
    }

    private function makeController(
        User $currentUser,
        UserRepository $repo,
        bool $isAdmin = false,
        ?ValidatorInterface $validator = null,
        ?UserLinkRepository $linkRepo = null,
        ?SkillRepository $skillRepo = null
    ): UserController {
        $skillMapper = new SkillMapper();
        $linkMapper  = new UserLinkMapper();
        $userMapper  = new UserMapper($skillMapper, $linkMapper);
        $groupMapper = new TechGroupMapper();

        $controller = new UserController(
            $repo,
            $userMapper,
            $groupMapper,
            $validator  ?? $this->makeValidator(),
            $skillRepo  ?? $this->createMock(SkillRepository::class),
            $linkRepo   ?? $this->createMock(UserLinkRepository::class),
            $skillMapper,
            $linkMapper
        );

        $controller->setContainer($this->makeContainer($currentUser, $isAdmin));

        return $controller;
    }

    private function makeValidator(bool $valid = true): ValidatorInterface
    {
        $validator = $this->createMock(ValidatorInterface::class);

        if ($valid) {
            $validator->method('validate')->willReturn(new ConstraintViolationList());
        } else {
            $list = new ConstraintViolationList();
            $list->add(new ConstraintViolation('Champ invalide', '', [], null, 'username', ''));
            $validator->method('validate')->willReturn($list);
        }

        return $validator;
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListReturnsAllUsers(): void
    {
        $shepard = $this->buildUser(1);
        $garrus  = $this->buildUser(2, 'Garrus');

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findAll')->willReturn([$shepard, $garrus]);

        $response = $this->makeController($shepard, $repo)->list();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload);
    }

    public function testListReturnsEmptyArray(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findAll')->willReturn([]);

        $response = $this->makeController($shepard, $repo)->list();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }

    // ======================================================================
    //  get()
    // ======================================================================

    public function testGetReturnsUser(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->with(1)->willReturn($shepard);

        $response = $this->makeController($shepard, $repo)->get(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Shepard', $payload['username']);
        $this->assertSame('ROLE_USER', $payload['role']);
    }

    public function testGetFailsWhenUserNotFound(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->makeController($shepard, $repo)->get(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  update()
    // ======================================================================

    public function testUpdateSuccessAsOwner(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);
        $repo->method('existsOtherWithUsername')->willReturn(false);
        $repo->method('existsOtherWithEmail')->willReturn(false);
        $repo->expects($this->once())->method('save');

        $request = new Request(content: json_encode([
            'username'  => 'Shepard',
            'firstname' => 'John',
            'lastname'  => 'Shepard',
            'email'     => 'shepard@normandy.sr2',
            'role'      => 'ROLE_USER', // rôle identique → pas de vérification admin
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->update(1, $request);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testUpdateSuccessAsAdmin(): void
    {
        $shepard = $this->buildUser(1, 'Shepard', true);
        $garrus  = $this->buildUser(2, 'Garrus');

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($garrus);
        $repo->method('existsOtherWithUsername')->willReturn(false);
        $repo->method('existsOtherWithEmail')->willReturn(false);
        $repo->expects($this->once())->method('save');

        $request = new Request(content: json_encode([
            'username'  => 'Garrus',
            'firstname' => 'Garrus',
            'lastname'  => 'Vakarian',
            'email'     => 'garrus@normandy.sr2',
            'role'      => 'ROLE_USER',
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo, isAdmin: true)->update(2, $request);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testUpdateFailsWhenUserNotFound(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn(null);

        $request = new Request(content: json_encode([
            'username' => 'X', 'firstname' => 'X', 'lastname' => 'X',
            'email' => 'x@x.com', 'role' => 'ROLE_USER',
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->update(99, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testUpdateFailsWhenNotOwnerAndNotAdmin(): void
    {
        $shepard = $this->buildUser(1);
        $garrus  = $this->buildUser(2, 'Garrus');

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($garrus); // autre user

        $request = new Request(content: json_encode([
            'username' => 'Garrus', 'firstname' => 'G', 'lastname' => 'V',
            'email' => 'garrus@sr2.com', 'role' => 'ROLE_USER',
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo, isAdmin: false)->update(2, $request);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testUpdateFailsWhenValidationFails(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);

        $request = new Request(content: json_encode([
            'username' => '', // vide → validation échoue
            'firstname' => 'J', 'lastname' => 'S',
            'email' => 'shepard@normandy.sr2', 'role' => 'ROLE_USER',
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo, validator: $this->makeValidator(false))->update(1, $request);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('details', $payload);
    }

    public function testUpdateFailsWhenUsernameAlreadyTaken(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);
        $repo->method('existsOtherWithUsername')->willReturn(true); // pris

        $request = new Request(content: json_encode([
            'username' => 'Garrus', 'firstname' => 'J', 'lastname' => 'S',
            'email' => 'shepard@normandy.sr2', 'role' => 'ROLE_USER',
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->update(1, $request);

        $this->assertSame(409, $response->getStatusCode());
    }

    public function testUpdateFailsWhenEmailAlreadyTaken(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);
        $repo->method('existsOtherWithUsername')->willReturn(false);
        $repo->method('existsOtherWithEmail')->willReturn(true); // pris

        $request = new Request(content: json_encode([
            'username' => 'Shepard', 'firstname' => 'J', 'lastname' => 'S',
            'email' => 'garrus@normandy.sr2', 'role' => 'ROLE_USER',
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->update(1, $request);

        $this->assertSame(409, $response->getStatusCode());
    }

    public function testUpdateFailsWhenNonAdminTriesToChangeRole(): void
    {
        $shepard = $this->buildUser(1); // ROLE_USER

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);
        $repo->method('existsOtherWithUsername')->willReturn(false);
        $repo->method('existsOtherWithEmail')->willReturn(false);

        $request = new Request(content: json_encode([
            'username' => 'Shepard', 'firstname' => 'J', 'lastname' => 'S',
            'email' => 'shepard@normandy.sr2', 'role' => 'ROLE_ADMIN', // escalade de rôle
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo, isAdmin: false)->update(1, $request);

        $this->assertSame(403, $response->getStatusCode());
    }

    // ======================================================================
    //  delete()
    // ======================================================================

    public function testDeleteSuccessAsOwner(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);
        $repo->expects($this->once())->method('remove');

        $response = $this->makeController($shepard, $repo)->delete(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['success']);
    }

    public function testDeleteSuccessAsAdmin(): void
    {
        $shepard = $this->buildUser(1, 'Shepard', true);
        $garrus  = $this->buildUser(2, 'Garrus');

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($garrus);
        $repo->expects($this->once())->method('remove');

        $response = $this->makeController($shepard, $repo, isAdmin: true)->delete(2);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testDeleteFailsWhenUserNotFound(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->makeController($shepard, $repo)->delete(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testDeleteFailsWhenNotOwnerAndNotAdmin(): void
    {
        $shepard = $this->buildUser(1);
        $garrus  = $this->buildUser(2, 'Garrus');

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($garrus);

        $response = $this->makeController($shepard, $repo, isAdmin: false)->delete(2);

        $this->assertSame(403, $response->getStatusCode());
    }

    // ======================================================================
    //  changePassword()
    // ======================================================================

    public function testChangePasswordSuccess(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);
        $repo->expects($this->once())->method('save');

        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->method('isPasswordValid')->willReturn(true);
        $hasher->method('hashPassword')->willReturn('new-hashed');

        $request = new Request(content: json_encode([
            'currentPassword' => 'N7Comm4nd3r!',
            'newPassword'     => 'Ap3rtur3Sc!ence',
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->changePassword(1, $request, $hasher);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('message', $payload);
    }

    public function testChangePasswordFailsWhenUserNotFound(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn(null);

        $hasher  = $this->createMock(UserPasswordHasherInterface::class);
        $request = new Request(content: json_encode([
            'currentPassword' => 'N7Comm4nd3r!', 'newPassword' => 'New!',
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->changePassword(99, $request, $hasher);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testChangePasswordFailsWhenNotOwnerAndNotAdmin(): void
    {
        $shepard = $this->buildUser(1);
        $garrus  = $this->buildUser(2, 'Garrus');

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($garrus);

        $hasher  = $this->createMock(UserPasswordHasherInterface::class);
        $request = new Request(content: json_encode([
            'currentPassword' => 'N7Comm4nd3r!', 'newPassword' => 'New!Pass1!',
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo, isAdmin: false)->changePassword(2, $request, $hasher);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testChangePasswordFailsWhenFieldsMissing(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);

        $hasher  = $this->createMock(UserPasswordHasherInterface::class);
        $request = new Request(content: json_encode(['currentPassword' => 'N7Comm4nd3r!'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->changePassword(1, $request, $hasher);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testChangePasswordFailsWhenCurrentPasswordIsWrong(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);

        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->method('isPasswordValid')->willReturn(false);

        $request = new Request(content: json_encode([
            'currentPassword' => 'WrongP4ss!ord',
            'newPassword'     => 'Ap3rtur3Sc!ence',
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->changePassword(1, $request, $hasher);

        $this->assertSame(403, $response->getStatusCode());
    }

    // ======================================================================
    //  getGroupsByUserId()
    // ======================================================================

    public function testGetGroupsByUserIdReturnsGroups(): void
    {
        $shepard = $this->buildUser(1);
        $group   = $this->buildGroup(1, 'Normandy Crew');
        $shepard->addJoinedGroup($group);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);

        $response = $this->makeController($shepard, $repo)->getGroupsByUserId(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload);
        $this->assertSame('Normandy Crew', $payload[0]['name']);
    }

    public function testGetGroupsByUserIdFailsWhenUserNotFound(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->makeController($shepard, $repo)->getGroupsByUserId(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  updateTheme()
    // ======================================================================

    public function testUpdateThemeSuccess(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);
        $repo->expects($this->once())->method('save');

        $request = new Request(content: json_encode(['theme' => 'dark'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->updateTheme(1, $request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('dark', $payload['theme']);
    }

    public function testUpdateThemeWithNullResetsToDefault(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);

        $request = new Request(content: json_encode(['theme' => null], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->updateTheme(1, $request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertNull($payload['theme']);
    }

    public function testUpdateThemeFailsWhenUserNotFound(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn(null);

        $request = new Request(content: json_encode(['theme' => 'dark'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->updateTheme(99, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testUpdateThemeFailsWhenNotOwnerAndNotAdmin(): void
    {
        $shepard = $this->buildUser(1);
        $garrus  = $this->buildUser(2, 'Garrus');

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($garrus);

        $request = new Request(content: json_encode(['theme' => 'dark'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo, isAdmin: false)->updateTheme(2, $request);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testUpdateThemeFailsWhenThemeIsInvalid(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);

        $request = new Request(content: json_encode(['theme' => 'rainbow'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->updateTheme(1, $request);

        $this->assertSame(400, $response->getStatusCode());
    }

    // ======================================================================
    //  updateProfile()
    // ======================================================================

    public function testUpdateProfileSuccess(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);
        $repo->expects($this->once())->method('save');

        $request = new Request(content: json_encode([
            'bio'          => 'Commander Shepard, N7.',
            'location'     => 'SSV Normandy',
            'availability' => 'employed',
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->updateProfile(1, $request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Commander Shepard, N7.', $payload['bio']);
        $this->assertSame('SSV Normandy', $payload['location']);
    }

    public function testUpdateProfileFailsWhenUserNotFound(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn(null);

        $request = new Request(content: json_encode(['bio' => 'test'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->updateProfile(99, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testUpdateProfileFailsWhenNotOwnerAndNotAdmin(): void
    {
        $shepard = $this->buildUser(1);
        $garrus  = $this->buildUser(2, 'Garrus');

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($garrus);

        $request = new Request(content: json_encode(['bio' => 'test'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo, isAdmin: false)->updateProfile(2, $request);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testUpdateProfileFailsWithInvalidJson(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);

        $request = new Request(content: 'not-a-json-string');

        $response = $this->makeController($shepard, $repo)->updateProfile(1, $request);

        $this->assertSame(400, $response->getStatusCode());
    }

    // ======================================================================
    //  getLinks()
    // ======================================================================

    public function testGetLinksReturnsLinks(): void
    {
        $shepard = $this->buildUser(1);

        $link = (new UserLink())
            ->setUser($shepard)
            ->setType(LinkType::GITHUB)
            ->setUrl('https://github.com/shepard-n7');

        $idProp = new \ReflectionProperty(UserLink::class, 'id');
        $idProp->setValue($link, 1);
        $shepard->addLink($link);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);

        $response = $this->makeController($shepard, $repo)->getLinks(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload);
        $this->assertSame('github', $payload[0]['type']);
        $this->assertSame('https://github.com/shepard-n7', $payload[0]['url']);
    }

    public function testGetLinksFailsWhenUserNotFound(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->makeController($shepard, $repo)->getLinks(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  createLink()
    // ======================================================================

    public function testCreateLinkSuccess(): void
    {
        $shepard  = $this->buildUser(1);
        $linkRepo = $this->createMock(UserLinkRepository::class);
        $linkRepo->expects($this->once())->method('save')->willReturnCallback(function (UserLink $link): void {
            $idProp = new \ReflectionProperty(UserLink::class, 'id');
            $idProp->setValue($link, 1);
        });

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);

        $request = new Request(content: json_encode([
            'type' => 'github',
            'url'  => 'https://github.com/shepard-n7',
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo, linkRepo: $linkRepo)->createLink(1, $request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('github', $payload['type']);
    }

    public function testCreateLinkFailsWhenUserNotFound(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn(null);

        $request = new Request(content: json_encode(['type' => 'github', 'url' => 'https://g.io'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->createLink(99, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testCreateLinkFailsWhenNotOwnerAndNotAdmin(): void
    {
        $shepard = $this->buildUser(1);
        $garrus  = $this->buildUser(2, 'Garrus');

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($garrus);

        $request = new Request(content: json_encode(['type' => 'github', 'url' => 'https://g.io'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo, isAdmin: false)->createLink(2, $request);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testCreateLinkFailsWhenValidationFails(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);

        $request = new Request(content: json_encode(['type' => 'invalid', 'url' => 'not-a-url'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo, validator: $this->makeValidator(false))->createLink(1, $request);

        $this->assertSame(422, $response->getStatusCode());
    }

    // ======================================================================
    //  updateLink()
    // ======================================================================

    public function testUpdateLinkSuccess(): void
    {
        $shepard = $this->buildUser(1);

        $link = (new UserLink())
            ->setUser($shepard)
            ->setType(LinkType::GITHUB)
            ->setUrl('https://github.com/old');

        $idProp = new \ReflectionProperty(UserLink::class, 'id');
        $idProp->setValue($link, 10);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);

        $linkRepo = $this->createMock(UserLinkRepository::class);
        $linkRepo->method('find')->willReturn($link);
        $linkRepo->expects($this->once())->method('save');

        $request = new Request(content: json_encode([
            'type' => 'linkedin',
            'url'  => 'https://linkedin.com/in/shepard',
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo, linkRepo: $linkRepo)->updateLink(1, 10, $request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('linkedin', $payload['type']);
    }

    public function testUpdateLinkFailsWhenUserNotFound(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn(null);

        $request = new Request(content: json_encode(['type' => 'github', 'url' => 'https://g.io'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->updateLink(99, 1, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testUpdateLinkFailsWhenLinkNotFound(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);

        $linkRepo = $this->createMock(UserLinkRepository::class);
        $linkRepo->method('find')->willReturn(null);

        $request = new Request(content: json_encode(['type' => 'github', 'url' => 'https://g.io'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo, linkRepo: $linkRepo)->updateLink(1, 99, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  deleteLink()
    // ======================================================================

    public function testDeleteLinkSuccess(): void
    {
        $shepard = $this->buildUser(1);

        $link = (new UserLink())
            ->setUser($shepard)
            ->setType(LinkType::GITHUB)
            ->setUrl('https://github.com/x');

        $idProp = new \ReflectionProperty(UserLink::class, 'id');
        $idProp->setValue($link, 5);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);

        $linkRepo = $this->createMock(UserLinkRepository::class);
        $linkRepo->method('find')->willReturn($link);
        $linkRepo->expects($this->once())->method('remove');

        $response = $this->makeController($shepard, $repo, linkRepo: $linkRepo)->deleteLink(1, 5);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['success']);
    }

    public function testDeleteLinkFailsWhenUserNotFound(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->makeController($shepard, $repo)->deleteLink(99, 1);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testDeleteLinkFailsWhenNotOwnerAndNotAdmin(): void
    {
        $shepard = $this->buildUser(1);
        $garrus  = $this->buildUser(2, 'Garrus');

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($garrus);

        $response = $this->makeController($shepard, $repo, isAdmin: false)->deleteLink(2, 5);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testDeleteLinkFailsWhenLinkNotFound(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);

        $linkRepo = $this->createMock(UserLinkRepository::class);
        $linkRepo->method('find')->willReturn(null);

        $response = $this->makeController($shepard, $repo, linkRepo: $linkRepo)->deleteLink(1, 99);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  getUserSkills()
    // ======================================================================

    public function testGetUserSkillsReturnsEmptyList(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);

        $response = $this->makeController($shepard, $repo)->getUserSkills(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }

    public function testGetUserSkillsFailsWhenUserNotFound(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->makeController($shepard, $repo)->getUserSkills(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  updateUserSkills()
    // ======================================================================

    public function testUpdateUserSkillsSuccess(): void
    {
        $shepard   = $this->buildUser(1);
        $skillRepo = $this->createMock(SkillRepository::class);
        $skillRepo->method('findByIds')->willReturn([]);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);
        $repo->expects($this->once())->method('save');

        $request = new Request(content: json_encode(['skillIds' => [1, 2, 3]], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo, skillRepo: $skillRepo)->updateUserSkills(1, $request);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testUpdateUserSkillsFailsWhenUserNotFound(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn(null);

        $request = new Request(content: json_encode(['skillIds' => [1]], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->updateUserSkills(99, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testUpdateUserSkillsFailsWhenNotOwnerAndNotAdmin(): void
    {
        $shepard = $this->buildUser(1);
        $garrus  = $this->buildUser(2, 'Garrus');

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($garrus);

        $request = new Request(content: json_encode(['skillIds' => [1]], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo, isAdmin: false)->updateUserSkills(2, $request);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testUpdateUserSkillsFailsWhenSkillIdsIsNotAnArray(): void
    {
        $shepard = $this->buildUser(1);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('find')->willReturn($shepard);

        $request = new Request(content: json_encode(['skillIds' => 'not-an-array'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($shepard, $repo)->updateUserSkills(1, $request);

        $this->assertSame(400, $response->getStatusCode());
    }
}
