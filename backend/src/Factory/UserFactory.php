<?php

namespace App\Factory;

use App\Entity\User;
use App\Enum\UserRole;
use App\Enum\Availability;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;

/**
 * @extends PersistentProxyObjectFactory<User>
 */
final class UserFactory extends PersistentProxyObjectFactory
{
    public function __construct()
    {
    }

    #[\Override]
    public static function class(): string
    {
        return User::class;
    }

    #[\Override]
    protected function defaults(): array|callable
    {
        $availabilities = Availability::cases();
        $locations = [
            'Paris, France', 'Lyon, France', 'Marseille, France',
            'Bordeaux, France', 'Toulouse, France', 'Nantes, France',
            'Lille, France', 'Remote, France', null,
        ];

        return [
            'email' => self::faker()->unique()->safeEmail(),
            'firstname' => self::faker()->firstName(),
            'lastname' => self::faker()->lastName(),
            'password' => '$2y$13$defaultHashedPassword',
            'role' => UserRole::ROLE_USER,
            'username' => self::faker()->unique()->userName(),
            'bio' => self::faker()->boolean(60) ? self::faker()->sentence(8) : null,
            'location' => self::faker()->randomElement($locations),
            'availability' => self::faker()->boolean(70) ? self::faker()->randomElement($availabilities) : null,
        ];
    }

    #[\Override]
    protected function initialize(): static
    {
        return $this;
    }
}
