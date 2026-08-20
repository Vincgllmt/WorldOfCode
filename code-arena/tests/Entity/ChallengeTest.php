<?php

declare(strict_types=1);

namespace App\Tests\Entity;

use App\Entity\Challenge;
use Doctrine\Common\Collections\Collection;
use PHPUnit\Framework\TestCase;

final class ChallengeTest extends TestCase
{
    public function testConstructorInitializesCollectionsAndTimestamps(): void
    {
        $challenge = new Challenge();

        self::assertInstanceOf(Collection::class, $challenge->getTests());
        self::assertCount(0, $challenge->getTests());
        self::assertInstanceOf(Collection::class, $challenge->getBadges());
        self::assertCount(0, $challenge->getBadges());
        self::assertInstanceOf(\DateTime::class, $challenge->getCreatedAt());
        self::assertInstanceOf(\DateTime::class, $challenge->getUpdatedAt());
    }

    public function testIdIsNullBeforePersistence(): void
    {
        $challenge = new Challenge();

        self::assertNull($challenge->getId());
    }

    public function testSlugGetterAndSetter(): void
    {
        $challenge = (new Challenge())->setSlug('sample');

        self::assertSame('sample', $challenge->getSlug());
    }

    public function testTitleGetterAndSetter(): void
    {
        $challenge = (new Challenge())->setTitle('Sample');

        self::assertSame('Sample', $challenge->getTitle());
    }

    public function testStatementGetterAndSetter(): void
    {
        $challenge = (new Challenge())->setStatement('Énoncé');

        self::assertSame('Énoncé', $challenge->getStatement());
    }

    public function testDifficultyGetterAndSetter(): void
    {
        $challenge = (new Challenge())->setDifficulty('easy');

        self::assertSame('easy', $challenge->getDifficulty());
    }

    public function testLanguagesGetterAndSetter(): void
    {
        $challenge = (new Challenge())->setLanguages(['python', 'javascript']);

        self::assertSame(['python', 'javascript'], $challenge->getLanguages());
    }

    public function testMaxScoreDefaultsTo100(): void
    {
        $challenge = new Challenge();

        self::assertSame(100, $challenge->getMaxScore());
    }

    public function testMaxScoreGetterAndSetter(): void
    {
        $challenge = (new Challenge())->setMaxScore(50);

        self::assertSame(50, $challenge->getMaxScore());
    }

    public function testImageDefaultsToNull(): void
    {
        $challenge = new Challenge();

        self::assertNull($challenge->getImage());
    }

    public function testImageGetterAndSetter(): void
    {
        $challenge = (new Challenge())->setImage('cover.png');

        self::assertSame('cover.png', $challenge->getImage());
    }

    public function testRefereeCodeGetterAndSetter(): void
    {
        $challenge = (new Challenge())->setRefereeCode('print("ok")');

        self::assertSame('print("ok")', $challenge->getRefereeCode());
    }

    public function testRefereeLanguageGetterAndSetter(): void
    {
        $challenge = (new Challenge())->setRefereeLanguage('python');

        self::assertSame('python', $challenge->getRefereeLanguage());
    }

    public function testUpdatedAtGetterAndSetter(): void
    {
        $updatedAt = new \DateTime('2026-01-01 00:00:00');
        $challenge = (new Challenge())->setUpdatedAt($updatedAt);

        self::assertSame($updatedAt, $challenge->getUpdatedAt());
    }

    public function testSettersAreFluent(): void
    {
        $challenge = new Challenge();

        self::assertSame($challenge, $challenge->setSlug('sample'));
        self::assertSame($challenge, $challenge->setTitle('Sample'));
        self::assertSame($challenge, $challenge->setStatement(''));
        self::assertSame($challenge, $challenge->setDifficulty('easy'));
        self::assertSame($challenge, $challenge->setLanguages([]));
        self::assertSame($challenge, $challenge->setMaxScore(100));
        self::assertSame($challenge, $challenge->setImage(null));
        self::assertSame($challenge, $challenge->setRefereeCode(null));
        self::assertSame($challenge, $challenge->setRefereeLanguage(null));
        self::assertSame($challenge, $challenge->setUpdatedAt(new \DateTime()));
    }
}
