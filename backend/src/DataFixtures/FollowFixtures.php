<?php

namespace App\DataFixtures;

use App\Entity\Follow;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;

class FollowFixtures extends Fixture implements DependentFixtureInterface
{
    public function load(ObjectManager $manager): void
    {
        // Récupération des utilisateurs
        $users = [];
        for ($i = 0; $i < 50; $i++) {
            $users[] = $this->getReference('user_' . $i, User::class);
        }

        $followCount = 0;
        $createdFollows = []; // Pour éviter les doublons

        // Chaque utilisateur suit entre 3 et 15 autres utilisateurs
        foreach ($users as $followerIndex => $follower) {
            $followingCount = rand(3, 15);

            // Créer une liste d'index disponibles (tous sauf soi-même)
            $availableIndexes = array_filter(
                range(0, count($users) - 1),
                fn($idx) => $idx !== $followerIndex
            );

            // Sélectionner aléatoirement des utilisateurs à suivre
            shuffle($availableIndexes);
            $selectedIndexes = array_slice($availableIndexes, 0, min($followingCount, count($availableIndexes)));

            foreach ($selectedIndexes as $followedIndex) {
                $followed = $users[$followedIndex];

                // Clé unique pour éviter les doublons
                $followKey = $followerIndex . '_' . $followedIndex;

                if (!isset($createdFollows[$followKey])) {
                    $follow = new Follow();
                    $follow->setFollower($follower);
                    $follow->setFollowed($followed);
                    $manager->persist($follow);
                    $createdFollows[$followKey] = true;
                    $followCount++;
                }
            }
        }

        $manager->flush();

        echo "✅ {$followCount} relations de follow créées\n";
    }

    public function getDependencies(): array
    {
        return [
            AppFixtures::class,
        ];
    }
}

