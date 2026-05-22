<?php

namespace App\Command;

use App\Service\Elasticsearch\ElasticClient;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:elastic:health',
    description: 'Vérifie la santé du cluster Elasticsearch',
)]
class ElasticHealthCommand extends Command
{
    public function __construct(
        private readonly ElasticClient $elasticClient,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        try {
            $health = $this->elasticClient->health();
        } catch (\Throwable $e) {
            $io->error('Impossible de contacter Elasticsearch : ' . $e->getMessage());
            return Command::FAILURE;
        }

        $status = $health['status'] ?? 'unknown';
        $rows = [
            ['Status', $status],
            ['Cluster', $health['cluster_name'] ?? '-'],
            ['Nodes', (string) ($health['number_of_nodes'] ?? 0)],
            ['Active shards', (string) ($health['active_shards'] ?? 0)],
        ];
        $io->table(['Field', 'Value'], $rows);

        return match ($status) {
            'green'  => self::reportSuccess($io, 'Cluster en parfaite santé.'),
            'yellow' => self::reportSuccess($io, 'Cluster fonctionnel (réplicas non assignés, normal en single-node).'),
            default  => self::reportFailure($io, 'Cluster en état critique : ' . $status),
        };
    }

    private static function reportSuccess(SymfonyStyle $io, string $message): int
    {
        $io->success($message);
        return Command::SUCCESS;
    }

    private static function reportFailure(SymfonyStyle $io, string $message): int
    {
        $io->error($message);
        return Command::FAILURE;
    }
}
