<?php

declare(strict_types=1);

namespace App\Tests\Entity;

use App\Entity\Challenge;
use App\Entity\Submission;
use PHPUnit\Framework\TestCase;

final class SubmissionTest extends TestCase
{
    public function testConstructorSetsCreatedAt(): void
    {
        $submission = new Submission();

        self::assertInstanceOf(\DateTime::class, $submission->getCreatedAt());
    }

    public function testIdIsNullBeforePersistence(): void
    {
        $submission = new Submission();

        self::assertNull($submission->getId());
    }

    public function testChallengeGetterAndSetter(): void
    {
        $challenge = (new Challenge())->setSlug('sample');
        $submission = (new Submission())->setChallenge($challenge);

        self::assertSame($challenge, $submission->getChallenge());
    }

    public function testUserIdGetterAndSetter(): void
    {
        $submission = (new Submission())->setUserId(42);

        self::assertSame(42, $submission->getUserId());
    }

    public function testLanguageGetterAndSetter(): void
    {
        $submission = (new Submission())->setLanguage('python');

        self::assertSame('python', $submission->getLanguage());
    }

    public function testCodeGetterAndSetter(): void
    {
        $submission = (new Submission())->setCode('print("ok")');

        self::assertSame('print("ok")', $submission->getCode());
    }

    public function testStatusDefaultsToPending(): void
    {
        $submission = new Submission();

        self::assertSame('pending', $submission->getStatus());
    }

    public function testStatusGetterAndSetter(): void
    {
        $submission = (new Submission())->setStatus('done');

        self::assertSame('done', $submission->getStatus());
    }

    public function testScoreDefaultsToZero(): void
    {
        $submission = new Submission();

        self::assertSame(0, $submission->getScore());
    }

    public function testScoreGetterAndSetter(): void
    {
        $submission = (new Submission())->setScore(80);

        self::assertSame(80, $submission->getScore());
    }

    public function testTestsPassedDefaultsToZero(): void
    {
        $submission = new Submission();

        self::assertSame(0, $submission->getTestsPassed());
    }

    public function testTestsPassedGetterAndSetter(): void
    {
        $submission = (new Submission())->setTestsPassed(3);

        self::assertSame(3, $submission->getTestsPassed());
    }

    public function testTestsTotalDefaultsToZero(): void
    {
        $submission = new Submission();

        self::assertSame(0, $submission->getTestsTotal());
    }

    public function testTestsTotalGetterAndSetter(): void
    {
        $submission = (new Submission())->setTestsTotal(5);

        self::assertSame(5, $submission->getTestsTotal());
    }

    public function testSettersAreFluent(): void
    {
        $challenge = new Challenge();
        $submission = new Submission();

        self::assertSame($submission, $submission->setChallenge($challenge));
        self::assertSame($submission, $submission->setUserId(1));
        self::assertSame($submission, $submission->setLanguage('python'));
        self::assertSame($submission, $submission->setCode(''));
        self::assertSame($submission, $submission->setStatus('pending'));
        self::assertSame($submission, $submission->setScore(0));
        self::assertSame($submission, $submission->setTestsPassed(0));
        self::assertSame($submission, $submission->setTestsTotal(0));
    }
}
