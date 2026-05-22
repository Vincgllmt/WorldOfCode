<?php

namespace App\Command;

use App\Repository\PostRepository;
use App\Repository\TechGroupRepository;
use App\Repository\UserRepository;
use App\Service\Elasticsearch\GroupIndexer;
use App\Service\Elasticsearch\PostIndexer;
use App\Service\Elasticsearch\UserIndexer;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:elastic:reindex',
    description: 'Réindexe les entités sélectionnées dans Elasticsearch',
)]
class ElasticReindexCommand extends Command
{
    private const BATCH_SIZE = 500;
    private const SUPPORTED  = ['posts', 'users', 'groups', 'all'];

    public function __construct(
        private readonly PostRepository $postRepository,
        private readonly UserRepository $userRepository,
        private readonly TechGroupRepository $groupRepository,
        private readonly PostIndexer $postIndexer,
        private readonly UserIndexer $userIndexer,
        private readonly GroupIndexer $groupIndexer,
        private readonly EntityManagerInterface $em,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('entity', null, InputOption::VALUE_REQUIRED, 'Entité à réindexer (posts, users, groups, all)', 'all');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $entity = $input->getOption('entity');

        if (!in_array($entity, self::SUPPORTED, true)) {
            $io->error(sprintf('Entité inconnue : "%s". Valeurs supportées : %s.', $entity, implode(', ', self::SUPPORTED)));
            return Command::INVALID;
        }

        $targets = $entity === 'all' ? ['posts', 'users', 'groups'] : [$entity];
        foreach ($targets as $target) {
            $result = match ($target) {
                'posts'  => $this->reindex($io, 'posts',  $this->postRepository,  fn($b) => $this->postIndexer->bulkIndex($b),  fn() => $this->postIndexer->createIndexIfNotExists()),
                'users'  => $this->reindex($io, 'users',  $this->userRepository,  fn($b) => $this->userIndexer->bulkIndex($b),  fn() => $this->userIndexer->createIndexIfNotExists()),
                'groups' => $this->reindex($io, 'groups', $this->groupRepository, fn($b) => $this->groupIndexer->bulkIndex($b), fn() => $this->groupIndexer->createIndexIfNotExists()),
            };
            if ($result !== Command::SUCCESS) {
                return $result;
            }
        }

        return Command::SUCCESS;
    }

    /**
     * @param callable(iterable<object>): int $bulkIndexer
     * @param callable(): bool $ensureIndex
     */
    private function reindex(SymfonyStyle $io, string $label, EntityRepository $repository, callable $bulkIndexer, callable $ensureIndex): int
    {
        $ensureIndex();

        $total = (int) $repository->createQueryBuilder('e')
            ->select('COUNT(e.id)')
            ->getQuery()
            ->getSingleScalarResult();
        if ($total === 0) {
            $io->warning(sprintf('Aucun "%s" à indexer.', $label));
            return Command::SUCCESS;
        }

        $io->info(sprintf('Réindexation de %d %s par lots de %d.', $total, $label, self::BATCH_SIZE));
        $io->progressStart($total);

        $offset = 0;
        $indexed = 0;
        do {
            $batch = $repository->createQueryBuilder('e')
                ->orderBy('e.id', 'ASC')
                ->setFirstResult($offset)
                ->setMaxResults(self::BATCH_SIZE)
                ->getQuery()
                ->getResult();

            if (empty($batch)) {
                break;
            }

            try {
                $indexed += $bulkIndexer($batch);
            } catch (\Throwable $e) {
                $io->newLine();
                $io->error(sprintf('Erreur durant le bulk indexing %s : %s', $label, $e->getMessage()));
                return Command::FAILURE;
            }

            $io->progressAdvance(count($batch));
            $this->em->clear();
            $offset += self::BATCH_SIZE;
        } while (count($batch) === self::BATCH_SIZE);

        $io->progressFinish();
        $io->success(sprintf('%d %s indexés.', $indexed, $label));
        return Command::SUCCESS;
    }
}
