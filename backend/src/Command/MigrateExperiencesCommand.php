<?php

namespace App\Command;

use App\Entity\Experience;
use App\Enum\Visibility;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(name: 'app:migrate-experiences', description: 'Migre les experiences JSON vers entite Experience')]
class MigrateExperiencesCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserRepository $userRepository
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $users = $this->userRepository->findAll();

        $created = 0;
        $batch = 0;

        foreach ($users as $user) {
            $jsonExperiences = $user->getExperiences();
            if (empty($jsonExperiences)) {
                continue;
            }

            foreach ($jsonExperiences as $index => $data) {
                $exp = new Experience();
                $exp->setUser($user);
                $exp->setTitle($data['title'] ?? '');
                $exp->setCompany($data['company'] ?? '');
                $exp->setStartDate($data['startDate'] ?? '');
                $exp->setEndDate($data['endDate'] ?? null);
                $exp->setDescription($data['description'] ?? null);
                $exp->setLocation(null);
                $exp->setPosition($index);
                $exp->setVisibility(Visibility::PUBLIC);

                $this->em->persist($exp);
                $created++;
                $batch++;

                if ($batch >= 50) {
                    $this->em->flush();
                    $batch = 0;
                }
            }
        }

        if ($batch > 0) {
            $this->em->flush();
        }

        $io->success(sprintf('Migration terminee : %d experience(s) creee(s).', $created));
        return Command::SUCCESS;
    }
}
