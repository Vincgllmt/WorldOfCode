<?php

namespace App\Tests\Service;

use App\Entity\TechGroup;
use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\TechGroupRepository;
use App\Service\TechGroupMembershipService;
use Doctrine\ORM\EntityNotFoundException;
use PHPUnit\Framework\TestCase;

/**
 * 🎮 World of Warcraft - Tests unitaires du TechGroupMembershipService
 *
 * ThrallGoEl      = utilisateur qui rejoint / quitte le groupe
 * JainaProudmoore = un autre membre déjà présent dans le groupe
 */
class TechGroupMembershipServiceTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'ThrallGoEl'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@orgrimmar.horde')
            ->setFirstname($username)
            ->setLastname('Warchief')
            ->setPassword('hashed')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildGroup(int $id, string $name = 'La Horde'): TechGroup
    {
        $group = new TechGroup();
        $group->setName($name);

        $idProp = new \ReflectionProperty(TechGroup::class, 'id');
        $idProp->setValue($group, $id);

        return $group;
    }

    private function makeService(TechGroupRepository $repo): TechGroupMembershipService
    {
        return new TechGroupMembershipService($repo);
    }

    // ======================================================================
    //  join()
    // ======================================================================

    public function testJoinGroupSuccessfully(): void
    {
        $thrall = $this->buildUser(1);
        $group  = $this->buildGroup(10);

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('find')->with(10)->willReturn($group);
        $repo->expects($this->once())->method('save')->with($group, true);

        $result = $this->makeService($repo)->join(10, $thrall);

        $this->assertTrue($result);
        $this->assertTrue($group->getUsers()->contains($thrall));
    }

    public function testJoinGroupThrowsWhenGroupNotFound(): void
    {
        $thrall = $this->buildUser(1);

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('find')->with(99)->willReturn(null);

        $this->expectException(EntityNotFoundException::class);
        $this->makeService($repo)->join(99, $thrall);
    }

    public function testJoinGroupReturnsFalseWhenAlreadyMember(): void
    {
        $thrall = $this->buildUser(1);
        $group  = $this->buildGroup(10);
        $group->addUser($thrall);

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('find')->with(10)->willReturn($group);
        $repo->expects($this->never())->method('save');

        $result = $this->makeService($repo)->join(10, $thrall);

        $this->assertFalse($result);
    }

    // ======================================================================
    //  leave()
    // ======================================================================

    public function testLeaveGroupSuccessfully(): void
    {
        $thrall = $this->buildUser(1);
        $group  = $this->buildGroup(10);
        $group->addUser($thrall);

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('find')->with(10)->willReturn($group);
        $repo->expects($this->once())->method('save')->with($group, true);

        $result = $this->makeService($repo)->leave(10, $thrall);

        $this->assertTrue($result);
        $this->assertFalse($group->getUsers()->contains($thrall));
    }

    public function testLeaveGroupThrowsWhenGroupNotFound(): void
    {
        $thrall = $this->buildUser(1);

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('find')->with(99)->willReturn(null);

        $this->expectException(EntityNotFoundException::class);
        $this->makeService($repo)->leave(99, $thrall);
    }

    public function testLeaveGroupReturnsFalseWhenNotMember(): void
    {
        $thrall = $this->buildUser(1);
        $group  = $this->buildGroup(10);

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('find')->with(10)->willReturn($group);
        $repo->expects($this->never())->method('save');

        $result = $this->makeService($repo)->leave(10, $thrall);

        $this->assertFalse($result);
    }
}
