<?php

declare(strict_types=1);

namespace App\Tests\Command;

use App\Command\SyncGamesCommand;
use App\Entity\Badge;
use App\Entity\Challenge;
use App\Entity\ChallengeTest;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Tester\CommandTester;

final class SyncGamesCommandTest extends TestCase
{
    private string $projectDir;

    protected function setUp(): void
    {
        $this->projectDir = sys_get_temp_dir() . '/arena-sync-' . uniqid('', true);
        $game = $this->projectDir . '/games/sample';
        mkdir($game, 0o777, true);

        file_put_contents($game . '/game.json', json_encode([
            'title' => 'Sample',
            'difficulty' => 'easy',
            'languages' => ['python', 'javascript'],
            'maxScore' => 50,
            'refereeLanguage' => 'python',
            'badges' => [['code' => 'first_solve', 'name' => 'Premier']],
        ]));
        file_put_contents($game . '/statement.md', 'Énoncé du jeu');
        file_put_contents($game . '/referee.py', 'print("ok")');
        file_put_contents($game . '/input.txt', 'LE_INPUT');
    }

    protected function tearDown(): void
    {
        $this->rrmdir($this->projectDir);
    }

    public function testSyncUpsertsChallengeInputAndBadges(): void
    {
        /** @var list<object> $persisted */
        $persisted = [];

        $repo = $this->createStub(EntityRepository::class);
        $repo->method('findOneBy')->willReturn(null); // tout est nouveau

        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('getRepository')->willReturn($repo);
        $em->method('persist')->willReturnCallback(function (object $entity) use (&$persisted): void {
            $persisted[] = $entity;
        });

        $tester = new CommandTester(new SyncGamesCommand($em, $this->projectDir));
        $tester->execute([]);
        $tester->assertCommandIsSuccessful();

        $challenges = array_values(array_filter($persisted, static fn ($e) => $e instanceof Challenge));
        self::assertCount(1, $challenges);

        $challenge = $challenges[0];
        self::assertSame('sample', $challenge->getSlug());
        self::assertSame('Sample', $challenge->getTitle());
        self::assertSame('Énoncé du jeu', $challenge->getStatement());
        self::assertSame('easy', $challenge->getDifficulty());
        self::assertSame(['python', 'javascript'], $challenge->getLanguages());
        self::assertSame(50, $challenge->getMaxScore());
        self::assertSame('python', $challenge->getRefereeLanguage());
        self::assertStringContainsString('print("ok")', (string) $challenge->getRefereeCode());

        $inputTest = array_values(array_filter($persisted, static fn ($e) => $e instanceof ChallengeTest));
        self::assertCount(1, $inputTest);
        self::assertSame('LE_INPUT', $inputTest[0]->getStdin());

        $badges = array_values(array_filter($persisted, static fn ($e) => $e instanceof Badge));
        self::assertCount(1, $badges);
        self::assertSame('first_solve', $badges[0]->getCode());
    }

    private function rrmdir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        foreach (scandir($dir) ?: [] as $item) {
            if ('.' === $item || '..' === $item) {
                continue;
            }
            $path = $dir . '/' . $item;
            is_dir($path) ? $this->rrmdir($path) : unlink($path);
        }
        rmdir($dir);
    }
}
