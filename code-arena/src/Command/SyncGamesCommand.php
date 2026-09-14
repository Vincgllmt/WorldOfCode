<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Badge;
use App\Entity\Challenge;
use App\Entity\ChallengeSolution;
use App\Entity\ChallengeTest;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Synchronise les jeux définis dans games/<slug>/ vers la base (idempotent).
 *
 * Chaque dossier = un défi (slug = nom du dossier) :
 *   game.json (méta) · statement.md · referee.* · tests/*.txt · solution.<ext>.txt
 */
#[AsCommand(name: 'app:arena:sync', description: 'Synchronise les jeux de games/<slug>/ vers la base.')]
final class SyncGamesCommand extends Command
{
    /** Extension d'un fichier solution.<ext>.txt → langage interne (cf. PistonService). */
    private const SOLUTION_EXTENSIONS = [
        'js'   => 'javascript',
        'ts'   => 'typescript',
        'py'   => 'python',
        'php'  => 'php',
        'java' => 'java',
        'cpp'  => 'cpp',
    ];

    public function __construct(
        private readonly EntityManagerInterface $em,
        #[Autowire('%kernel.project_dir%')]
        private readonly string $projectDir,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $base = $this->projectDir . '/games';

        if (!is_dir($base)) {
            $io->warning('Aucun dossier games/.');

            return Command::SUCCESS;
        }

        $dirs = glob($base . '/*', \GLOB_ONLYDIR) ?: [];
        $count = 0;

        foreach ($dirs as $dir) {
            $slug = basename($dir);
            $metaPath = $dir . '/game.json';
            if (!is_file($metaPath)) {
                continue;
            }

            $meta = json_decode((string) file_get_contents($metaPath), true);
            if (!is_array($meta) || !isset($meta['title'], $meta['difficulty'], $meta['languages'])) {
                $io->error(sprintf('%s : game.json invalide (title/difficulty/languages requis).', $slug));

                continue;
            }

            $statement = is_file($dir . '/statement.md') ? (string) file_get_contents($dir . '/statement.md') : '';

            $refereeFiles = glob($dir . '/referee.*') ?: [];
            sort($refereeFiles);
            $refereeCode = $refereeFiles ? (string) file_get_contents($refereeFiles[0]) : null;

            // Jeu de tests : un fichier par cas dans tests/*.txt (triés par nom),
            // sinon repli sur l'unique input.txt (rétro-compatibilité).
            $testFiles = glob($dir . '/tests/*.txt') ?: [];
            sort($testFiles);
            if (!$testFiles && is_file($dir . '/input.txt')) {
                $testFiles = [$dir . '/input.txt'];
            }

            $repo = $this->em->getRepository(Challenge::class);
            $challenge = $repo->findOneBy(['slug' => $slug]) ?? (new Challenge())->setSlug($slug);

            $challenge
                ->setTitle((string) $meta['title'])
                ->setStatement($statement)
                ->setDifficulty((string) $meta['difficulty'])
                ->setLanguages(array_values((array) $meta['languages']))
                ->setMaxScore((int) ($meta['maxScore'] ?? 100))
                ->setImage($meta['image'] ?? null)
                ->setRefereeCode($refereeCode)
                ->setRefereeLanguage($meta['refereeLanguage'] ?? null)
                ->setUpdatedAt(new \DateTime());

            $this->em->persist($challenge);
            $this->em->flush();

            // Jeu de tests : on remplace les cas existants par les inputs du jeu.
            // Chaque cas est public (le joueur voit la grille) ; l'ordre = position.
            foreach ($challenge->getTests() as $existing) {
                $this->em->remove($existing);
            }
            $this->em->flush();

            foreach ($testFiles as $i => $file) {
                $test = (new ChallengeTest())
                    ->setChallenge($challenge)
                    ->setStdin((string) file_get_contents($file))
                    ->setExpectedOutput('')
                    ->setIsPublic(true)
                    ->setWeight(1)
                    ->setPosition($i);
                $this->em->persist($test);
            }

            // Solutions de référence : on remplace par les fichiers solution.<ext>.txt.
            foreach ($challenge->getSolutions() as $existing) {
                $this->em->remove($existing);
            }
            $this->em->flush();

            foreach ($this->solutionFiles($dir) as $language => $file) {
                $solution = (new ChallengeSolution())
                    ->setChallenge($challenge)
                    ->setLanguage($language)
                    ->setCode((string) file_get_contents($file));
                $this->em->persist($solution);
            }

            // Badges : upsert par (challenge, code).
            $badgeRepo = $this->em->getRepository(Badge::class);
            foreach ((array) ($meta['badges'] ?? []) as $b) {
                if (!isset($b['code'], $b['name'])) {
                    continue;
                }
                $badge = $badgeRepo->findOneBy(['challenge' => $challenge, 'code' => $b['code']])
                    ?? (new Badge())->setChallenge($challenge)->setCode((string) $b['code']);
                $badge
                    ->setName((string) $b['name'])
                    ->setDescription($b['description'] ?? null)
                    ->setIcon($b['icon'] ?? null);
                $this->em->persist($badge);
            }

            $this->em->flush();
            $io->writeln(sprintf('  <info>✓</info> %s', $slug));
            ++$count;
        }

        $io->success(sprintf('%d jeu(x) synchronisé(s).', $count));

        return Command::SUCCESS;
    }

    /**
     * Fichiers solution.<ext>.txt du jeu, indexés par langage (extension inconnue ignorée).
     *
     * @return array<string, string> langage => chemin du fichier
     */
    private function solutionFiles(string $dir): array
    {
        $files = glob($dir . '/solution.*.txt') ?: [];
        sort($files);

        $solutions = [];
        foreach ($files as $file) {
            if (!preg_match('/^solution\.([a-z]+)\.txt$/', basename($file), $m)) {
                continue;
            }
            $language = self::SOLUTION_EXTENSIONS[$m[1]] ?? null;
            if (null !== $language) {
                $solutions[$language] = $file;
            }
        }

        return $solutions;
    }
}
