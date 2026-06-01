<?php

declare(strict_types=1);

namespace App\Tests\Service\Moderation;

use App\Service\Moderation\PIIDetectorService;
use PHPUnit\Framework\TestCase;

class PIIDetectorServiceTest extends TestCase
{
    private function service(): PIIDetectorService
    {
        return new PIIDetectorService();
    }

    public function testDetecteEmailSimple(): void
    {
        $result = $this->service()->detect('Contactez-moi à test@example.com');
        $this->assertSame(['test@example.com'], $result['email']);
    }

    public function testDetecteMultipleEmails(): void
    {
        $result = $this->service()->detect('a@b.fr et c@d.com');
        $this->assertCount(2, $result['email']);
    }

    public function testDetectePhoneFormatNational(): void
    {
        $result = $this->service()->detect('Mon numéro : 06 12 34 56 78');
        $this->assertNotEmpty($result['phone']);
    }

    public function testDetectePhoneFormatColle(): void
    {
        $result = $this->service()->detect('Tel: 0612345678');
        $this->assertNotEmpty($result['phone']);
    }

    public function testDetectePhoneInternational(): void
    {
        $result = $this->service()->detect('Appelez +33612345678');
        $this->assertNotEmpty($result['phone']);
    }

    public function testNeDetectePasSerieDeChiffresNonTel(): void
    {
        $result = $this->service()->detect('Code postal 75019');
        $this->assertSame([], $result['phone']);
    }

    public function testDetecteIban(): void
    {
        // IBAN factice valide en structure
        $result = $this->service()->detect('Mon IBAN: FR76 1234 5678 9012 3456 7890 123');
        $this->assertNotEmpty($result['iban']);
    }

    public function testDetecteCarteBancaireValideLuhn(): void
    {
        // Numéro de test Visa de Stripe (passe Luhn)
        $result = $this->service()->detect('CB: 4242 4242 4242 4242');
        $this->assertNotEmpty($result['credit_card']);
    }

    public function testNeDetectePasNumeroRandomNonLuhn(): void
    {
        // 16 chiffres random qui ne passent pas Luhn
        $result = $this->service()->detect('Référence: 1234 5678 9012 3450');
        $this->assertSame([], $result['credit_card']);
    }

    public function testGetDetectedTypesRetourneListe(): void
    {
        $types = $this->service()->getDetectedTypes('test@example.com et 06 12 34 56 78');
        $this->assertContains('email', $types);
        $this->assertContains('phone', $types);
    }

    public function testHasPIITrueQuandDetection(): void
    {
        $this->assertTrue($this->service()->hasPII('mon email: a@b.fr'));
    }

    public function testHasPIIFalseSurTexteClean(): void
    {
        $this->assertFalse($this->service()->hasPII('Bonjour, j\'aime React.'));
    }

    public function testDetecteNumeroSecuriteSocialeFR(): void
    {
        // Format : sexe (1=H, 2=F) + année + mois + commune + ordre + clé = 15 chiffres
        $result = $this->service()->detect('Mon numéro de sécu : 1 85 02 75 116 124 06');
        $this->assertNotEmpty($result['ssn_fr']);
    }

    public function testDetecteSSNDansLesTypes(): void
    {
        $types = $this->service()->getDetectedTypes('1 85 02 75 116 124 06');
        $this->assertContains('ssn_fr', $types);
    }

    public function testNeDetectePasUnNumeroSecuInvalide(): void
    {
        // 14 chiffres au lieu de 15 → invalide
        $result = $this->service()->detect('Code 1 85 02 75 116 124 0');
        $this->assertSame([], $result['ssn_fr']);
    }

    public function testNeDetectePasIbanTropCourt(): void
    {
        // FR76 + 5 chiffres seulement → trop court
        $result = $this->service()->detect('Code FR76 12345');
        $this->assertSame([], $result['iban']);
    }

    public function testDedoublonnageIbanIdentiques(): void
    {
        // Deux IBANs strictement identiques sans contexte autour
        // → un seul résultat après déduplication
        $result = $this->service()->detect('FR7612345678901234567890123 FR7612345678901234567890123');
        $this->assertCount(1, $result['iban']);
    }
}
