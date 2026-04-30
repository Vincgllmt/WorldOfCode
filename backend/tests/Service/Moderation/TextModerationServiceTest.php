<?php

declare(strict_types=1);

namespace App\Tests\Service\Moderation;

use App\Service\Moderation\BlocklistService;
use App\Service\Moderation\ContentRejectedException;
use App\Service\Moderation\PIIDetectorService;
use App\Service\Moderation\TextModerationService;
use PHPUnit\Framework\TestCase;

class TextModerationServiceTest extends TestCase
{
    private string $blocklistPath;

    protected function setUp(): void
    {
        $this->blocklistPath = sys_get_temp_dir() . '/blocklist_textmod_' . uniqid() . '.yaml';
        file_put_contents($this->blocklistPath, <<<YAML
severe:
  - mauvais
warning:
  - moyen
urls:
  - bit.ly
  - tinyurl.com
YAML);
    }

    protected function tearDown(): void
    {
        @unlink($this->blocklistPath);
    }

    private function service(): TextModerationService
    {
        return new TextModerationService(
            new BlocklistService($this->blocklistPath),
            new PIIDetectorService()
        );
    }

    public function testTexteCleanRetourneOk(): void
    {
        $result = $this->service()->check('Bonjour tout le monde !');
        $this->assertSame('ok', $result['status']);
        $this->assertNull($result['reason']);
    }

    public function testMotSevereRetourneRejected(): void
    {
        $result = $this->service()->check('Ceci est mauvais');
        $this->assertSame('rejected', $result['status']);
        $this->assertNotNull($result['reason']);
    }

    public function testMotWarningRetourneFlagged(): void
    {
        $result = $this->service()->check('C\'est moyen');
        $this->assertSame('flagged', $result['status']);
    }

    public function testEmailDansUnPostRetourneRejected(): void
    {
        // En contexte 'post', toute PII (même email) provoque un rejet
        $result = $this->service()->check('Mon email : test@example.com');
        $this->assertSame('rejected', $result['status']);
        $this->assertContains('email', $result['details']['pii']);
    }

    public function testEmailDansUnMessageRetourneFlagged(): void
    {
        // En contexte 'message', l'email est toléré mais flag pour modération
        $result = $this->service()->check(
            'Mon email : test@example.com',
            \App\Service\Moderation\TextModerationService::CONTEXT_MESSAGE
        );
        $this->assertSame('flagged', $result['status']);
    }

    public function testIbanDansUnMessageRetourneRejected(): void
    {
        // Données bancaires : rejet même en messagerie
        $result = $this->service()->check(
            'Mon IBAN: FR76 1234 5678 9012 3456 7890 123',
            \App\Service\Moderation\TextModerationService::CONTEXT_MESSAGE
        );
        $this->assertSame('rejected', $result['status']);
    }

    public function testCarteBancaireDansUnMessageRetourneRejected(): void
    {
        $result = $this->service()->check(
            'Ma CB : 4242 4242 4242 4242',
            \App\Service\Moderation\TextModerationService::CONTEXT_MESSAGE
        );
        $this->assertSame('rejected', $result['status']);
    }

    public function testDeuxUrlsSuspectesRetourneRejected(): void
    {
        $result = $this->service()->check('Cliquez https://bit.ly/abc et https://tinyurl.com/xyz');
        $this->assertSame('rejected', $result['status']);
    }

    public function testUneSeuleUrlSuspectesRetourneFlagged(): void
    {
        $result = $this->service()->check('Ressource intéressante : https://bit.ly/abc');
        $this->assertSame('flagged', $result['status']);
    }

    public function testCheckOrThrowLeveExceptionSurRejected(): void
    {
        $this->expectException(ContentRejectedException::class);
        $this->service()->checkOrThrow('Ceci est mauvais');
    }

    public function testCheckOrThrowNeLevePasSurFlagged(): void
    {
        $result = $this->service()->checkOrThrow('Du contenu moyen');
        $this->assertSame('flagged', $result['status']);
    }

    public function testCheckOrThrowNeLevePasSurOk(): void
    {
        $result = $this->service()->checkOrThrow('Tout va bien');
        $this->assertSame('ok', $result['status']);
    }

    public function testTexteVideRetourneOk(): void
    {
        $result = $this->service()->check('   ');
        $this->assertSame('ok', $result['status']);
    }

    public function testHtmlEstNettoyeAvantAnalyse(): void
    {
        // Le mot "mauvais" est dans une balise HTML
        $result = $this->service()->check('<p>Ceci est <strong>mauvais</strong></p>');
        $this->assertSame('rejected', $result['status']);
    }
}
