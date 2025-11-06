<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\TechGroupRepository;
use Doctrine\ORM\EntityNotFoundException;

class TechGroupMembershipService
{
    public function __construct(private readonly TechGroupRepository $techGroupRepository)
    {
    }

    /**
     * @throws EntityNotFoundException
     */
    public function join(int $groupId, User $user): bool
    {
        $group = $this->techGroupRepository->find($groupId);
        if (!$group) {
            throw new EntityNotFoundException('Group not found');
        }

        if ($group->getUsers()->contains($user)) {
            return false;
        }

        $group->addUser($user);
        $this->techGroupRepository->save($group, true);

        return true;
    }

    /**
     * @throws EntityNotFoundException
     */
    public function leave(int $groupId, User $user): bool
    {
        $group = $this->techGroupRepository->find($groupId);
        if (!$group) {
            throw new EntityNotFoundException('Group not found');
        }

        if (!$group->getUsers()->contains($user)) {
            return false;
        }

        $group->removeUser($user);
        $this->techGroupRepository->save($group, true);

        return true;
    }
}
