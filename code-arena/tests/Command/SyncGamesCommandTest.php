<?php

declare(strict_types=1);

namespace App\Tests\Command;

use App\Command\SyncGamesCommand;
use App\Entity\Badge;
use App\Entity\Challenge;
use App\Entity\ChallengeTest;
use Doctrine\Common\Collections\ArrayCollection;
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

    public function testSyncLoadsMultipleTestFilesFromTestsDirectory(): void
    {
        // Crée un second jeu avec un dossier tests/ contenant plusieurs cas.
        $game = $this->projectDir . '/games/multi';
        mkdir($game . '/tests', 0o777, true);

        file_put_contents($game . '/game.json', json_encode([
            'title'           => 'Multi',
            'difficulty'      => 'hard',
            'languages'       => ['python'],
            'maxScore'        => 100,
            'refereeLanguage' => 'python',
            'badges'          => [],
        ]));
        file_put_contents($game . '/statement.md', '');
        file_put_contents($game . '/referee.py', 'pass');
        file_put_contents($game . '/tests/01.txt', 'INPUT_1');
        file_put_contents($game . '/tests/02.txt', 'INPUT_2');
        file_put_contents($game . '/tests/03.txt', 'INPUT_3');

        /** @var list<object> $persisted */
        $persisted = [];

        $repo = $this->createStub(EntityRepository::class);
        $repo->method('findOneBy')->willReturn(null);

        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('getRepository')->willReturn($repo);
        $em->method('persist')->willReturnCallback(function (object $entity) use (&$persisted): void {
            $persisted[] = $entity;
        });

        $tester = new CommandTester(new SyncGamesCommand($em, $this->projectDir));
        $tester->execute([]);
        $tester->assertCommandIsSuccessful();

        // Filtre uniquement les ChallengeTest du jeu "multi" (ceux avec stdin non null)
        $testCases = array_values(array_filter(
            $persisted,
            static fn ($e) => $e instanceof ChallengeTest && in_array($e->getStdin(), ['INPUT_1', 'INPUT_2', 'INPUT_3'], true),
        ));

        self::assertCount(3, $testCases);

        $stdins = array_map(static fn ($t) => $t->getStdin(), $testCases);
        sort($stdins);
        self::assertSame(['INPUT_1', 'INPUT_2', 'INPUT_3'], $stdins);
    }

    public function testSyncSkipsDirectoryWithoutGameJson(): void
    {
        // Crée un dossier sans game.json
        $empty = $this->projectDir . '/games/no-meta';
        mkdir($empty, 0o777, true);

        /** @var list<object> $persisted */
        $persisted = [];

        $repo = $this->createStub(EntityRepository::class);
        $repo->method('findOneBy')->willReturn(null);

        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('getRepository')->willReturn($repo);
        $em->method('persist')->willReturnCallback(function (object $entity) use (&$persisted): void {
            $persisted[] = $entity;
        });

        $tester = new CommandTester(new SyncGamesCommand($em, $this->projectDir));
        $tester->execute([]);
        $tester->assertCommandIsSuccessful();

        // Seul le jeu "sample" (de setUp) doit avoir été persisté, pas "no-meta".
        $challenges = array_values(array_filter($persisted, static fn ($e) => $e instanceof Challenge));
        self::assertCount(1, $challenges);
        self::assertSame('sample', $challenges[0]->getSlug());
    }

    public function testSyncWarnsAndSucceedsWhenGamesDirectoryMissing(): void
    {
        $emptyDir = sys_get_temp_dir() . '/arena-sync-empty-' . uniqid('', true);
        mkdir($emptyDir, 0o777, true);

        $em = $this->createStub(EntityManagerInterface::class);

        $tester = new CommandTester(new SyncGamesCommand($em, $emptyDir));
        $tester->execute([]);
        $tester->assertCommandIsSuccessful();

        self::assertStringContainsString('Aucun dossier games/.', $tester->getDisplay());

        $this->rrmdir($emptyDir);
    }

    public function testSyncSkipsDirectoryWithInvalidGameJson(): void
    {
        $game = $this->projectDir . '/games/invalid';
        mkdir($game, 0o777, true);
        file_put_contents($game . '/game.json', json_encode([
            'title' => 'Invalide', // difficulty et languages manquants
        ]));

        /** @var list<object> $persisted */
        $persisted = [];

        $repo = $this->createStub(EntityRepository::class);
        $repo->method('findOneBy')->willReturn(null);

        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('getRepository')->willReturn($repo);
        $em->method('persist')->willReturnCallback(function (object $entity) use (&$persisted): void {
            $persisted[] = $entity;
        });

        $tester = new CommandTester(new SyncGamesCommand($em, $this->projectDir));
        $tester->execute([]);
        $tester->assertCommandIsSuccessful();

        self::assertStringContainsString('invalid : game.json invalide', $tester->getDisplay());

        // Seul le jeu "sample" (valide, créé dans setUp) doit avoir été persisté.
        $challenges = array_values(array_filter($persisted, static fn ($e) => $e instanceof Challenge));
        self::assertCount(1, $challenges);
        self::assertSame('sample', $challenges[0]->getSlug());
    }

    public function testSyncRemovesExistingChallengeTestsBeforeReinserting(): void
    {
        $existingChallenge = (new Challenge())->setSlug('sample');
        $existingTest = (new ChallengeTest())
            ->setChallenge($existingChallenge)
            ->setStdin('OLD_INPUT')
            ->setExpectedOutput('')
            ->setIsPublic(true)
            ->setWeight(1)
            ->setPosition(0);

        $testsProperty = new \ReflectionProperty(Challenge::class, 'tests');
        $testsProperty->setAccessible(true);
        $testsProperty->setValue($existingChallenge, new ArrayCollection([$existingTest]));

        /** @var list<object> $removed */
        $removed = [];
        /** @var list<object> $persisted */
        $persisted = [];

        $challengeRepo = $this->createStub(EntityRepository::class);
        $challengeRepo->method('findOneBy')->willReturn($existingChallenge);

        $badgeRepo = $this->createStub(EntityRepository::class);
        $badgeRepo->method('findOneBy')->willReturn(null);

        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('getRepository')->willReturnMap([
            [Challenge::class, $challengeRepo],
            [Badge::class, $badgeRepo],
        ]);
        $em->method('remove')->willReturnCallback(function (object $entity) use (&$removed): void {
            $removed[] = $entity;
        });
        $em->method('persist')->willReturnCallback(function (object $entity) use (&$persisted): void {
            $persisted[] = $entity;
        });

        $tester = new CommandTester(new SyncGamesCommand($em, $this->projectDir));
        $tester->execute([]);
        $tester->assertCommandIsSuccessful();

        self::assertSame([$existingTest], $removed);

        $newTests = array_values(array_filter($persisted, static fn ($e) => $e instanceof ChallengeTest));
        self::assertCount(1, $newTests);
        self::assertSame('LE_INPUT', $newTests[0]->getStdin());
    }

    public function testSyncSkipsBadgeMissingCodeOrName(): void
    {
        $game = $this->projectDir . '/games/badgeless';
        mkdir($game, 0o777, true);
        file_put_contents($game . '/game.json', json_encode([
            'title' => 'Badgeless',
            'difficulty' => 'easy',
            'languages' => ['python'],
            'badges' => [
                ['name' => 'Sans code'], // code manquant
                ['code' => 'no_name'],   // name manquant
            ],
        ]));

        /** @var list<object> $persisted */
        $persisted = [];

        $repo = $this->createStub(EntityRepository::class);
        $repo->method('findOneBy')->willReturn(null);

        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('getRepository')->willReturn($repo);
        $em->method('persist')->willReturnCallback(function (object $entity) use (&$persisted): void {
            $persisted[] = $entity;
        });

        $tester = new CommandTester(new SyncGamesCommand($em, $this->projectDir));
        $tester->execute([]);
        $tester->assertCommandIsSuccessful();

        // Seul le badge valide "first_solve" du jeu "sample" (setUp) doit avoir été persisté ;
        // les deux badges incomplets de "badgeless" doivent être ignorés.
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
