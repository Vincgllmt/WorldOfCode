<?php

declare(strict_types=1);

namespace App\Tests\Entity;

use App\Entity\Badge;
use App\Entity\UserBadge;
use PHPUnit\Framework\TestCase;

final class UserBadgeTest extends TestCase
{
    public function testConstructorSetsAwardedAt(): void
    {
        $userBadge = new UserBadge();

        self::assertInstanceOf(\DateTime::class, $userBadge->getAwardedAt());
    }

    public function testIdIsNullBeforePersistence(): void
    {
        $userBadge = new UserBadge();

        self::assertNull($userBadge->getId());
    }

    public function testUserIdGetterAndSetter(): void
    {
        $userBadge = (new UserBadge())->setUserId(42);

        self::assertSame(42, $userBadge->getUserId());
    }

    public function testBadgeGetterAndSetter(): void
    {
        $badge = (new Badge())->setCode('first_solve');
        $userBadge = (new UserBadge())->setBadge($badge);

        self::assertSame($badge, $userBadge->getBadge());
    }

    public function testSettersAreFluent(): void
    {
        $userBadge = new UserBadge();

        self::assertSame($userBadge, $userBadge->setUserId(1));
        self::assertSame($userBadge, $userBadge->setBadge(new Badge()));
    }
}
