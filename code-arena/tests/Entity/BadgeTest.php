<?php

declare(strict_types=1);

namespace App\Tests\Entity;

use App\Entity\Badge;
use App\Entity\Challenge;
use PHPUnit\Framework\TestCase;

final class BadgeTest extends TestCase
{
    public function testConstructorSetsCreatedAt(): void
    {
        $badge = new Badge();

        self::assertInstanceOf(\DateTime::class, $badge->getCreatedAt());
    }

    public function testIdIsNullBeforePersistence(): void
    {
        $badge = new Badge();

        self::assertNull($badge->getId());
    }

    public function testChallengeGetterAndSetter(): void
    {
        $challenge = (new Challenge())->setSlug('sample');
        $badge = (new Badge())->setChallenge($challenge);

        self::assertSame($challenge, $badge->getChallenge());
    }

    public function testCodeGetterAndSetter(): void
    {
        $badge = (new Badge())->setCode('first_solve');

        self::assertSame('first_solve', $badge->getCode());
    }

    public function testNameGetterAndSetter(): void
    {
        $badge = (new Badge())->setName('Premier');

        self::assertSame('Premier', $badge->getName());
    }

    public function testDescriptionDefaultsToNull(): void
    {
        $badge = new Badge();

        self::assertNull($badge->getDescription());
    }

    public function testDescriptionGetterAndSetter(): void
    {
        $badge = (new Badge())->setDescription('Résolu du premier coup');

        self::assertSame('Résolu du premier coup', $badge->getDescription());
    }

    public function testIconDefaultsToNull(): void
    {
        $badge = new Badge();

        self::assertNull($badge->getIcon());
    }

    public function testIconGetterAndSetter(): void
    {
        $badge = (new Badge())->setIcon('trophy.svg');

        self::assertSame('trophy.svg', $badge->getIcon());
    }

    public function testSettersAreFluent(): void
    {
        $challenge = new Challenge();
        $badge = new Badge();

        self::assertSame($badge, $badge->setChallenge($challenge));
        self::assertSame($badge, $badge->setCode('perfect'));
        self::assertSame($badge, $badge->setName('Parfait'));
        self::assertSame($badge, $badge->setDescription(null));
        self::assertSame($badge, $badge->setIcon(null));
    }
}
