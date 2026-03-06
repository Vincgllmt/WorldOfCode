<?php

namespace App\Command;

use App\Repository\TechWatchSourceRepository;
use App\Service\RssFetcherService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:fetch-tech-news',
    description: 'Fetch RSS feeds for all TechWatch sources',
)]
class FetchTechNewsCommand extends Command
{
    public function __construct(
        private TechWatchSourceRepository $sourceRepo,
        private RssFetcherService $fetcher,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $sources = $this->sourceRepo->findAll();

        $io->info(sprintf('Found %d sources to fetch.', count($sources)));

        $totalNew = 0;
        foreach ($sources as $source) {
            if ($source->getLastFetchedAt() &&
                $source->getLastFetchedAt() > new \DateTime('-30 minutes')) {
                $io->comment(sprintf('Skipping "%s" (fetched recently)', $source->getName()));
                continue;
            }

            $newItems = $this->fetcher->fetchSource($source);
            $totalNew += $newItems;
            $io->writeln(sprintf('  [%s] %d new items', $source->getName(), $newItems));
        }

        $io->success(sprintf('Done. %d new items fetched.', $totalNew));
        return Command::SUCCESS;
    }
}
