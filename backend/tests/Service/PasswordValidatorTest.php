<?php

namespace App\Tests\Service;

use App\Service\PasswordValidator;
use PHPUnit\Framework\TestCase;

/**
 * 🎮 Dark Souls - Tests unitaires du PasswordValidator
 *
 * UndyingUndead = testeur principal
 * SolaireLordran = le soleil brille sur les mots de passe valides
 */
class PasswordValidatorTest extends TestCase
{
    // ======================================================================
    //  Cas valides
    // ======================================================================

    public function testValidPasswordReturnsNull(): void
    {
        $result = PasswordValidator::validate('Str0ng!P4ssword');
        $this->assertNull($result);
    }

    public function testValidPasswordExactlyTwelveCharsReturnsNull(): void
    {
        $result = PasswordValidator::validate('Undying1Sol!');
        $this->assertNull($result);
    }

    public function testValidPasswordWithSpecialCharsReturnsNull(): void
    {
        $result = PasswordValidator::validate('S0laireLordran@2024');
        $this->assertNull($result);
    }

    // ======================================================================
    //  Longueur insuffisante
    // ======================================================================

    public function testPasswordTooShortReturnsError(): void
    {
        $result = PasswordValidator::validate('Sh0rt!');
        $this->assertIsArray($result);
        $this->assertStringContainsString('12 caractères', $result[0]);
    }

    public function testPasswordElevenCharsReturnsError(): void
    {
        $result = PasswordValidator::validate('Undying1Sol');
        $this->assertIsArray($result);
        $this->assertStringContainsString('12 caractères', $result[0]);
    }

    // ======================================================================
    //  Absence de majuscule
    // ======================================================================

    public function testPasswordWithoutUppercaseReturnsError(): void
    {
        $result = PasswordValidator::validate('undying1sol!fire');
        $this->assertIsArray($result);
        $errors = implode(' ', $result);
        $this->assertStringContainsString('majuscule', $errors);
    }

    // ======================================================================
    //  Absence de minuscule
    // ======================================================================

    public function testPasswordWithoutLowercaseReturnsError(): void
    {
        $result = PasswordValidator::validate('UNDYING1SOL!FIRE');
        $this->assertIsArray($result);
        $errors = implode(' ', $result);
        $this->assertStringContainsString('minuscule', $errors);
    }

    // ======================================================================
    //  Absence de chiffre
    // ======================================================================

    public function testPasswordWithoutDigitReturnsError(): void
    {
        $result = PasswordValidator::validate('UndyingSolaire!');
        $this->assertIsArray($result);
        $errors = implode(' ', $result);
        $this->assertStringContainsString('chiffre', $errors);
    }

    // ======================================================================
    //  Absence de caractère spécial
    // ======================================================================

    public function testPasswordWithoutSpecialCharReturnsError(): void
    {
        $result = PasswordValidator::validate('Undying1Solaire');
        $this->assertIsArray($result);
        $errors = implode(' ', $result);
        $this->assertStringContainsString('spécial', $errors);
    }

    // ======================================================================
    //  Présence d'espaces
    // ======================================================================

    public function testPasswordWithSpaceReturnsError(): void
    {
        $result = PasswordValidator::validate('Undying 1Sol!fire');
        $this->assertIsArray($result);
        $errors = implode(' ', $result);
        $this->assertStringContainsString('espace', $errors);
    }

    // ======================================================================
    //  Mots de passe communs
    // ======================================================================

    public function testPasswordContainingCommonWordPasswordReturnsError(): void
    {
        $result = PasswordValidator::validate('MyPassword123!abc');
        $this->assertIsArray($result);
        $errors = implode(' ', $result);
        $this->assertStringContainsString('commun', $errors);
    }

    public function testPasswordContaining123456ReturnsError(): void
    {
        $result = PasswordValidator::validate('Undying123456!Sol');
        $this->assertIsArray($result);
        $errors = implode(' ', $result);
        $this->assertStringContainsString('commun', $errors);
    }

    public function testPasswordContainingAzertyReturnsError(): void
    {
        $result = PasswordValidator::validate('Undying1Azerty!');
        $this->assertIsArray($result);
        $errors = implode(' ', $result);
        $this->assertStringContainsString('commun', $errors);
    }

    public function testPasswordContainingQwertyReturnsError(): void
    {
        $result = PasswordValidator::validate('Undying1Qwerty!');
        $this->assertIsArray($result);
        $errors = implode(' ', $result);
        $this->assertStringContainsString('commun', $errors);
    }

    public function testPasswordContainingAdminReturnsError(): void
    {
        $result = PasswordValidator::validate('Undying1Admin!sol');
        $this->assertIsArray($result);
        $errors = implode(' ', $result);
        $this->assertStringContainsString('commun', $errors);
    }

    public function testPasswordContainingCommonWordCaseInsensitiveReturnsError(): void
    {
        $result = PasswordValidator::validate('MYPASSWORD123!abc');
        $this->assertIsArray($result);
        $errors = implode(' ', $result);
        $this->assertStringContainsString('commun', $errors);
    }

    // ======================================================================
    //  Erreurs multiples
    // ======================================================================

    public function testPasswordWithMultipleIssuesReturnsMultipleErrors(): void
    {
        // Trop court, pas de majuscule, pas de chiffre, pas de spécial
        $result = PasswordValidator::validate('abc');
        $this->assertIsArray($result);
        $this->assertGreaterThan(1, count($result));
    }

    public function testEmptyPasswordReturnsMultipleErrors(): void
    {
        $result = PasswordValidator::validate('');
        $this->assertIsArray($result);
        $this->assertGreaterThan(3, count($result));
    }
}
