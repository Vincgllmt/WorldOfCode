<?php

namespace App\Command;

use App\Service\Elasticsearch\GroupIndexer;
use App\Service\Elasticsearch\PostIndexer;
use App\Service\Elasticsearch\UserIndexer;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:elastic:create-indices',
    description: 'Crée les indices Elasticsearch manquants (idempotent)',
)]
class ElasticCreateIndicesCommand extends Command
{
    public function __construct(
        private readonly PostIndexer $postIndexer,
        private readonly UserIndexer $userIndexer,
        private readonly GroupIndexer $groupIndexer,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $tasks = [
            'posts'  => fn() => $this->postIndexer->createIndexIfNotExists(),
            'users'  => fn() => $this->userIndexer->createIndexIfNotExists(),
            'groups' => fn() => $this->groupIndexer->createIndexIfNotExists(),
        ];

        $report = [];
        try {
            foreach ($tasks as $name => $task) {
                $report[$name] = $task() ? 'créé' : 'déjà présent';
            }
        } catch (\Throwable $e) {
            $io->error('Erreur lors de la création des indices : ' . $e->getMessage());
            return Command::FAILURE;
        }

        foreach ($report as $name => $status) {
            $io->writeln(sprintf('  - <info>%s</info> : %s', $name, $status));
        }
        $io->success('Indices Elasticsearch synchronisés.');
        return Command::SUCCESS;
    }
}
