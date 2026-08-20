<?php

declare(strict_types=1);

namespace App\Tests\Entity;

use App\Entity\Challenge;
use App\Entity\ChallengeTest;
use PHPUnit\Framework\TestCase;

/**
 * Teste l'entité App\Entity\ChallengeTest (un cas de test d'un challenge).
 * Nommée différemment de "ChallengeTest" pour éviter la collision avec
 * App\Tests\Entity\ChallengeTest, qui teste l'entité App\Entity\Challenge.
 */
final class ChallengeTestEntityTest extends TestCase
{
    public function testIdIsNullBeforePersistence(): void
    {
        $test = new ChallengeTest();

        self::assertNull($test->getId());
    }

    public function testChallengeGetterAndSetter(): void
    {
        $challenge = (new Challenge())->setSlug('sample');
        $test = (new ChallengeTest())->setChallenge($challenge);

        self::assertSame($challenge, $test->getChallenge());
    }

    public function testStdinGetterAndSetter(): void
    {
        $test = (new ChallengeTest())->setStdin('LE_INPUT');

        self::assertSame('LE_INPUT', $test->getStdin());
    }

    public function testStdinDefaultsToNull(): void
    {
        $test = new ChallengeTest();

        self::assertNull($test->getStdin());
    }

    public function testExpectedOutputGetterAndSetter(): void
    {
        $test = (new ChallengeTest())->setExpectedOutput('42');

        self::assertSame('42', $test->getExpectedOutput());
    }

    public function testIsPublicDefaultsToFalse(): void
    {
        $test = new ChallengeTest();

        self::assertFalse($test->isPublic());
    }

    public function testIsPublicGetterAndSetter(): void
    {
        $test = (new ChallengeTest())->setIsPublic(true);

        self::assertTrue($test->isPublic());
    }

    public function testWeightDefaultsToOne(): void
    {
        $test = new ChallengeTest();

        self::assertSame(1, $test->getWeight());
    }

    public function testWeightGetterAndSetter(): void
    {
        $test = (new ChallengeTest())->setWeight(3);

        self::assertSame(3, $test->getWeight());
    }

    public function testPositionDefaultsToZero(): void
    {
        $test = new ChallengeTest();

        self::assertSame(0, $test->getPosition());
    }

    public function testPositionGetterAndSetter(): void
    {
        $test = (new ChallengeTest())->setPosition(2);

        self::assertSame(2, $test->getPosition());
    }

    public function testSettersAreFluent(): void
    {
        $challenge = new Challenge();
        $test = new ChallengeTest();

        self::assertSame($test, $test->setChallenge($challenge));
        self::assertSame($test, $test->setStdin(null));
        self::assertSame($test, $test->setExpectedOutput(''));
        self::assertSame($test, $test->setIsPublic(true));
        self::assertSame($test, $test->setWeight(1));
        self::assertSame($test, $test->setPosition(0));
    }
}
