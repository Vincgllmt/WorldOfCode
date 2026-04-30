<?php

declare(strict_types=1);

namespace App\Tests\Service\Moderation;

use App\Service\Moderation\BlocklistService;
use PHPUnit\Framework\TestCase;

class BlocklistServiceTest extends TestCase
{
    private string $fixturePath;

    protected function setUp(): void
    {
        // Crée un fichier YAML temporaire pour les tests
        $this->fixturePath = sys_get_temp_dir() . '/blocklist_test_' . uniqid() . '.yaml';
        file_put_contents($this->fixturePath, <<<YAML
severe:
  - mauvais
  - tres mauvais
warning:
  - moyen
  - peu sympa
urls:
  - bit.ly
  - tinyurl.com
YAML);
    }

    protected function tearDown(): void
    {
        @unlink($this->fixturePath);
    }

    private function service(): BlocklistService
    {
        return new BlocklistService($this->fixturePath);
    }

    public function testTexteCleanRetourneAucunMatch(): void
    {
        $result = $this->service()->check('Bonjour tout le monde, voici un texte sain.');
        $this->assertSame([], $result['severe']);
        $this->assertSame([], $result['warning']);
        $this->assertSame([], $result['urls']);
    }

    public function testDetecteUnMotSevereSimple(): void
    {
        $result = $this->service()->check('Ceci est mauvais');
        $this->assertSame(['mauvais'], $result['severe']);
    }

    public function testDetecteAvecMajusculesEtAccents(): void
    {
        $result = $this->service()->check('Ceci est MAUVÄIS aujourd\'hui');
        $this->assertSame(['mauvais'], $result['severe']);
    }

    public function testDetecteAvecLeetSpeak(): void
    {
        $result = $this->service()->check('Ceci est m4uv4is');
        $this->assertSame(['mauvais'], $result['severe']);
    }

    public function testDetecteExpressionMultiMots(): void
    {
        $result = $this->service()->check('vraiment tres mauvais ce truc');
        $this->assertContains('tres mauvais', $result['severe']);
    }

    public function testDetecteWarning(): void
    {
        $result = $this->service()->check('C\'était moyen');
        $this->assertSame(['moyen'], $result['warning']);
        $this->assertSame([], $result['severe']);
    }

    public function testDetecteUrlSuspecte(): void
    {
        $result = $this->service()->check('Visitez https://bit.ly/abc123');
        $this->assertSame(['bit.ly'], $result['urls']);
    }

    public function testIsSevereTrueQuandSevere(): void
    {
        $this->assertTrue($this->service()->isSevere('un mot mauvais'));
    }

    public function testIsSevereFalseSurWarning(): void
    {
        $this->assertFalse($this->service()->isSevere('un mot moyen seulement'));
    }

    public function testNeMatchPasUnMotPartiel(): void
    {
        // "mauvaise" ne doit pas matcher "mauvais"
        $result = $this->service()->check('La tournure mauvaise a été choisie');
        $this->assertSame([], $result['severe']);
    }

    public function testFichierIntrouvableLeveException(): void
    {
        $this->expectException(\RuntimeException::class);
        new BlocklistService('/chemin/qui/nexiste/pas.yaml');
    }
}
