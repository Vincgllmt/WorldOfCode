<?php

namespace App\Tests\Config;

use App\Config\UploadConfig;
use PHPUnit\Framework\TestCase;

class UploadConfigTest extends TestCase
{
    public function testAllowedMimeTypesContainsExpectedFormats(): void
    {
        $this->assertContains('image/jpeg', UploadConfig::ALLOWED_MIME_TYPES);
        $this->assertContains('image/png', UploadConfig::ALLOWED_MIME_TYPES);
        $this->assertContains('image/gif', UploadConfig::ALLOWED_MIME_TYPES);
        $this->assertContains('image/webp', UploadConfig::ALLOWED_MIME_TYPES);
    }

    public function testMaxSizeBytesEquivalentToMaxSizeMb(): void
    {
        $this->assertSame(
            UploadConfig::MAX_SIZE_MB * 1024 * 1024,
            UploadConfig::MAX_SIZE_BYTES,
        );
    }

    public function testAllowedFormatsLabelReturnsHumanReadableString(): void
    {
        $label = UploadConfig::allowedFormatsLabel();

        $this->assertStringContainsString('JPG', $label);
        $this->assertStringContainsString('PNG', $label);
        $this->assertStringContainsString('GIF', $label);
        $this->assertStringContainsString('WebP', $label);
    }

    public function testAllowedFormatsLabelIsCommaSeparated(): void
    {
        $label = UploadConfig::allowedFormatsLabel();

        $this->assertStringContainsString(', ', $label);
    }
}
