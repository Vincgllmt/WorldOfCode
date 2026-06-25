<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

class CvLayoutRequest
{
    public const LAYOUTS = ['sidebar-left', 'sidebar-right', 'single-column'];

    #[Assert\Choice(choices: self::LAYOUTS, message: 'Valeur cvLayout invalide. Valeurs acceptées : sidebar-left, sidebar-right, single-column.')]
    public ?string $cvLayout = null;

    #[Assert\When(
        expression: 'this.cvAccentColor !== null',
        constraints: [
            new Assert\Regex(
                pattern: '/^#[0-9a-fA-F]{6}$/',
                message: "La couleur d'accent doit être au format hexadécimal (ex: #2563eb)."
            )
        ]
    )]
    public ?string $cvAccentColor = null;
}
