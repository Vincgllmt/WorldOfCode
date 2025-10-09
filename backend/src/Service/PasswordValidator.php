<?php

namespace App\Service;

class PasswordValidator
{
    /**
     * Validate password complexity and return a list of missing requirements.
     *
     * @param string $password
     * @return array|null Returns null if valid, or an array of errors.
     */
    public static function validate(string $password): ?array
    {
        $errors = [];

        if (strlen($password) < 12) {
            $errors[] = 'Le mot de passe doit contenir au moins 12 caractères.';
        }

        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Le mot de passe doit contenir au moins une lettre majuscule.';
        }

        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = 'Le mot de passe doit contenir au moins une lettre minuscule.';
        }

        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'Le mot de passe doit contenir au moins un chiffre.';
        }

        if (!preg_match('/[^A-Za-z0-9]/', $password)) {
            $errors[] = 'Le mot de passe doit contenir au moins un caractère spécial.';
        }


        if (preg_match('/\s/', $password)) {
            $errors[] = 'Le mot de passe ne doit pas contenir d’espaces.';
        }


        $commonPasswords = ['password', '123456', 'azerty', 'qwerty', 'admin'];
        foreach ($commonPasswords as $weak) {
            if (stripos($password, $weak) !== false) {
                $errors[] = 'Le mot de passe contient un mot trop commun ("' . $weak . '").';
                break;
            }
        }

        return empty($errors) ? null : $errors;
    }
}
