<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260429000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Seed admin users (system admin + team admins)';
    }

    public function up(Schema $schema): void
    {
        $hash = '$2y$13$p9Rbc2zz01sY66eJq4880OH4.eFGKKFWd9R.wQ58DoDJcImybpJV.';
        $bio  = 'Administrateur de la plateforme World of Code';
        $now  = (new \DateTimeImmutable())->format('Y-m-d H:i:s');

        $admins = [
            ['admin',   'Admin',   'System',  'admin@woc.dev',   'Paris, France'],
            ['amine',   'Amine',   'Admin',   'amine@woc.dev',   'Paris, France'],
            ['eugenie', 'Eugénie', 'Admin',   'eugenie@woc.dev', 'Lyon, France'],
            ['vincent', 'Vincent', 'Admin',   'vincent@woc.dev', 'Bordeaux, France'],
            ['hichem',  'Hichem',  'Admin',   'hichem@woc.dev',  'Marseille, France'],
            ['theo',    'Théo',    'Admin',   'theo@woc.dev',    'Nantes, France'],
        ];

        foreach ($admins as [$username, $firstname, $lastname, $email, $location]) {
            $this->addSql(
                'INSERT IGNORE INTO `user`
                    (username, password, firstname, lastname, email, role, creation_date, updated_date, bio, location, availability)
                 VALUES
                    (:username, :password, :firstname, :lastname, :email, :role, :now, :now, :bio, :location, :availability)',
                [
                    'username'     => $username,
                    'password'     => $hash,
                    'firstname'    => $firstname,
                    'lastname'     => $lastname,
                    'email'        => $email,
                    'role'         => 'ROLE_ADMIN',
                    'now'          => $now,
                    'bio'          => $bio,
                    'location'     => $location,
                    'availability' => 'employed',
                ]
            );
        }
    }

    public function down(Schema $schema): void
    {
        $this->addSql(
            "DELETE FROM `user` WHERE username IN ('admin','amine','eugenie','vincent','hichem','theo')"
        );
    }
}
